/**
 * Runs the real Supabase migration in PGlite (Postgres compiled to WASM) with
 * minimal stand-ins for Supabase's auth schema and roles, then exercises the
 * write path, concurrency check, RLS and the append-only activity log.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { HOUR_MS } from "@/lib/movement";
import { makeShipment, T0 } from "@/lib/shipments/fixtures";
import { toPublicTracking } from "@/lib/shipments/projection";
import type { Shipment } from "@/lib/types";
import { activityToRow, eventToRow, rowToShipment, shipmentToRow, type EventRow, type ShipmentRow } from "./rows";

const MIGRATION = readFileSync(join(process.cwd(), "supabase/migrations/20261008000000_init.sql"), "utf8");

// What a fresh Supabase project already has.
const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth, public to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const DISPATCHER_ID = "22222222-2222-4222-8222-222222222222";
const OUTSIDER_ID = "33333333-3333-4333-8333-333333333333";
const SHIP_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const actor = { uid: ADMIN_ID, name: "Admin", email: "admin@example.com", role: "admin" as const };

let db: PGlite;

/** Run statements as a given database role / signed-in user, like PostgREST does. */
async function as<T>(role: "anon" | "authenticated" | "service_role", userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${userId ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}

function commitArgs(s: Shipment, expectedVersion: number | null, events = s.events) {
  return [
    JSON.stringify(shipmentToRow(s)),
    expectedVersion,
    JSON.stringify(events.map((e) => eventToRow(e, s.id))),
    JSON.stringify(toPublicTracking(s)),
    JSON.stringify(activityToRow({ actor, at: s.updatedAt, action: "test", summary: "test", shipment: s })),
  ];
}

const COMMIT = "select public.commit_shipment($1::jsonb, $2::int, $3::jsonb, $4::jsonb, $5::jsonb) as version";

async function loadShipment(id: string): Promise<Shipment> {
  const row = (await db.query<ShipmentRow>("select * from public.shipments where id = $1", [id])).rows[0];
  const events = (await db.query<EventRow>("select * from public.shipment_events where shipment_id = $1", [id])).rows;
  return rowToShipment(row, events);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  await db.exec(MIGRATION);
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ADMIN_ID}', 'admin@example.com'), ('${DISPATCHER_ID}', 'd@example.com'), ('${OUTSIDER_ID}', 'x@example.com');
    insert into public.staff (id, email, name, role) values
      ('${ADMIN_ID}', 'admin@example.com', 'Admin', 'admin'),
      ('${DISPATCHER_ID}', 'd@example.com', 'Dispatcher', 'dispatcher');
  `);
}, 60_000);

describe("commit_shipment", () => {
  const fixture = makeShipment();
  const base = makeShipment({ id: SHIP_ID, events: [{ ...fixture.events[0], id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" }] });

  it("creates the shipment, its events, the public projection and a log entry", async () => {
    const res = await as("service_role", null, () => db.query<{ version: number }>(COMMIT, commitArgs(base, null)));
    expect(res.rows[0].version).toBe(1);

    const roundTrip = await loadShipment(SHIP_ID);
    expect(roundTrip).toEqual(base);

    const pub = await db.query<{ data: unknown; version: number }>("select data, version from public.public_tracking");
    expect(pub.rows[0].version).toBe(1);
    expect(pub.rows[0].data).toEqual(JSON.parse(JSON.stringify(toPublicTracking(base))));
    expect((await db.query("select * from public.activity_log")).rows).toHaveLength(1);
  });

  it("updates with the expected version and appends only the new events", async () => {
    const next: Shipment = {
      ...base,
      version: 2,
      status: "in_transit",
      movement: { state: "moving", anchorFraction: 0, anchorTime: T0 + HOUR_MS, remainingMs: 10 * HOUR_MS },
      events: [
        ...base.events,
        { ...base.events[0], id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", type: "started", title: "Picked up", status: "in_transit", at: T0 + HOUR_MS },
      ],
      updatedAt: T0 + HOUR_MS,
    };
    const res = await as("service_role", null, () => db.query<{ version: number }>(COMMIT, commitArgs(next, 1, [next.events[1]])));
    expect(res.rows[0].version).toBe(2);
    const stored = await loadShipment(SHIP_ID);
    expect(stored.status).toBe("in_transit");
    expect(stored.movement).toEqual(next.movement);
    expect(stored.events.map((e) => e.type)).toEqual(["created", "started"]);
    const pub = await db.query<{ version: number }>("select version from public.public_tracking where tracking_number = $1", [base.trackingNumber]);
    expect(pub.rows[0].version).toBe(2);
  });

  it("rejects a stale version and rolls everything back", async () => {
    const logBefore = (await db.query("select count(*)::int as n from public.activity_log")).rows[0];
    const stale = { ...base, version: 2, status: "delivered" as const };
    await expect(as("service_role", null, () => db.query(COMMIT, commitArgs(stale, 1, [])))).rejects.toThrow(/version_conflict/);
    expect((await loadShipment(SHIP_ID)).status).toBe("in_transit");
    expect((await db.query("select count(*)::int as n from public.activity_log")).rows[0]).toEqual(logBefore);
  });

  it("enforces unique tracking numbers (the server retries with a new one)", async () => {
    const dup = makeShipment({ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", events: [] });
    await expect(as("service_role", null, () => db.query(COMMIT, commitArgs(dup, null)))).rejects.toMatchObject({ code: "23505" });
  });

  it("can't be called by browsers", async () => {
    await expect(as("anon", null, () => db.query(COMMIT, commitArgs(base, 2)))).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", ADMIN_ID, () => db.query(COMMIT, commitArgs(base, 2)))).rejects.toThrow(/permission denied/);
  });
});

describe("public access", () => {
  it("returns exactly one projection by tracking number, case-insensitively", async () => {
    const res = await as("anon", null, () =>
      db.query<{ data: { trackingNumber: string; version: number } }>("select public.get_public_tracking($1) as data", [" xxx-abcd2345 "]),
    );
    expect(res.rows[0].data).toMatchObject({ trackingNumber: "XXX-ABCD2345", version: 2 });
    const missing = await as("anon", null, () => db.query<{ data: unknown }>("select public.get_public_tracking('XXX-NOPE0000') as data"));
    expect(missing.rows[0].data).toBeNull();
  });

  it("can't list or read tables directly", async () => {
    for (const table of ["public_tracking", "shipments", "shipment_events", "activity_log", "staff", "contact_messages"]) {
      const rows = await as("anon", null, () => db.query(`select * from public.${table}`));
      expect(rows.rows, table).toHaveLength(0);
    }
  });

  it("can't write anything", async () => {
    await expect(
      as("anon", null, () => db.query("insert into public.contact_messages (name, email, message) values ('a','b','c')")),
    ).rejects.toThrow(/row-level security/);
    await expect(as("anon", null, () => db.query("update public.shipments set status = 'delivered'"))).resolves.toMatchObject({
      affectedRows: 0,
    });
  });
});

describe("staff access via RLS", () => {
  it("lets staff read shipments, and only admins read the activity log", async () => {
    const dispatcherShipments = await as("authenticated", DISPATCHER_ID, () => db.query("select id from public.shipments"));
    expect(dispatcherShipments.rows).toHaveLength(1);
    const dispatcherLog = await as("authenticated", DISPATCHER_ID, () => db.query("select id from public.activity_log"));
    expect(dispatcherLog.rows).toHaveLength(0);
    const adminLog = await as("authenticated", ADMIN_ID, () => db.query("select id from public.activity_log"));
    expect(adminLog.rows.length).toBeGreaterThan(0);
  });

  it("denies signed-in users who aren't staff, and disabled staff", async () => {
    const outsider = await as("authenticated", OUTSIDER_ID, () => db.query("select id from public.shipments"));
    expect(outsider.rows).toHaveLength(0);
    await db.exec(`update public.staff set disabled = true where id = '${DISPATCHER_ID}'`);
    const disabled = await as("authenticated", DISPATCHER_ID, () => db.query("select id from public.shipments"));
    expect(disabled.rows).toHaveLength(0);
    await db.exec(`update public.staff set disabled = false where id = '${DISPATCHER_ID}'`);
  });
});

describe("activity log", () => {
  it("is append-only, even for the service role and the table owner", async () => {
    await expect(as("service_role", null, () => db.query("update public.activity_log set summary = 'edited'"))).rejects.toThrow(
      /permission denied|append-only/,
    );
    await expect(as("service_role", null, () => db.query("delete from public.activity_log"))).rejects.toThrow(
      /permission denied|append-only/,
    );
    await expect(db.query("update public.activity_log set summary = 'edited'")).rejects.toThrow(/append-only/);
    await expect(db.query("delete from public.activity_log")).rejects.toThrow(/append-only/);
    await expect(db.query("truncate public.activity_log")).rejects.toThrow(/append-only/);
    await expect(
      as("service_role", null, () =>
        db.query("insert into public.activity_log (actor, action, summary) values ('{}'::jsonb, 'x', 'y')"),
      ),
    ).resolves.toBeDefined();
  });
});
