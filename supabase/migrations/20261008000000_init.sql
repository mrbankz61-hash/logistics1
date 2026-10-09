-- Courier dispatch & tracking schema.
--
-- The Next.js server talks to the database with the secret (service_role) key
-- and checks staff sessions itself; every write goes through commit_shipment()
-- or a single insert. Row Level Security is still enabled everywhere as a second
-- line of defence in case the publishable key is used directly.


-- ---------------------------------------------------------------------------
-- Staff (source of truth for roles; checked on every request)
-- ---------------------------------------------------------------------------
create table public.staff (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null,
  role text not null check (role in ('admin', 'dispatcher')),
  disabled boolean not null default false,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
create unique index staff_email_key on public.staff (lower(email));

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff where id = auth.uid() and not disabled);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff where id = auth.uid() and role = 'admin' and not disabled);
$$;

-- ---------------------------------------------------------------------------
-- Shipments
-- ---------------------------------------------------------------------------
create table public.shipments (
  id uuid primary key,
  tracking_number text not null unique check (tracking_number ~ '^[A-Z0-9]{2,6}-[A-Z0-9]{8}$'),
  version integer not null check (version >= 1),
  status text not null check (status in ('pending', 'in_transit', 'paused', 'out_for_delivery', 'delivered')),
  status_before_pause text check (status_before_pause in ('pending', 'in_transit', 'paused', 'out_for_delivery', 'delivered')),
  sender jsonb not null,
  receiver jsonb not null,
  package jsonb not null,
  origin jsonb not null,
  destination jsonb not null,
  waypoints jsonb not null default '[]',
  driver jsonb not null,
  estimated_duration_hours double precision not null check (estimated_duration_hours > 0),
  route jsonb not null,
  -- Movement model: position is computed from this anchor, never ticked.
  movement_state text not null check (movement_state in ('not_started', 'moving', 'paused', 'arrived')),
  anchor_fraction double precision not null check (anchor_fraction between 0 and 1),
  anchor_time timestamptz not null,
  remaining_ms bigint not null check (remaining_ms >= 0),
  last_event jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  created_by jsonb not null
);
create index shipments_created_at_idx on public.shipments (created_at desc);

create table public.shipment_events (
  id uuid primary key,
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  at timestamptz not null,
  type text not null check (type in ('created', 'started', 'paused', 'resumed', 'position_set', 'eta_adjusted', 'status_changed', 'rerouted', 'note')),
  title text not null,
  status text not null,
  source text not null check (source in ('driver_call', 'dispatch', 'customer_call', 'office')),
  location_label text not null,
  public_note text not null default '',
  internal_note text not null default '',
  show_to_customer boolean not null default true,
  by_uid text not null,
  by_name text not null
);
create index shipment_events_shipment_idx on public.shipment_events (shipment_id, at);

-- Sanitised projection for the public tracking page (no phones, emails,
-- addresses or internal notes). Never readable directly: see get_public_tracking().
create table public.public_tracking (
  tracking_number text primary key,
  shipment_id uuid not null unique references public.shipments (id) on delete cascade,
  version integer not null,
  data jsonb not null,
  updated_at timestamptz not null
);

-- ---------------------------------------------------------------------------
-- Activity log: append-only, even for the service role.
-- ---------------------------------------------------------------------------
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor jsonb not null,
  action text not null,
  summary text not null,
  shipment_id uuid,          -- no foreign key: entries outlive shipments
  tracking_number text,
  target_uid text,
  before jsonb,
  after jsonb,
  details jsonb
);
create index activity_log_at_idx on public.activity_log (at desc);
create index activity_log_tracking_idx on public.activity_log (tracking_number, at desc);

create or replace function public.reject_activity_log_change() returns trigger
language plpgsql as $$
begin
  raise exception 'activity_log is append-only';
end;
$$;

create trigger activity_log_no_update_delete
  before update or delete on public.activity_log
  for each row execute function public.reject_activity_log_change();
create trigger activity_log_no_truncate
  before truncate on public.activity_log
  for each statement execute function public.reject_activity_log_change();

-- ---------------------------------------------------------------------------
-- Contact form
-- ---------------------------------------------------------------------------
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text not null default '',
  tracking_number text not null default '',
  message text not null
);
create index contact_messages_at_idx on public.contact_messages (at desc);

-- ---------------------------------------------------------------------------
-- Atomic shipment write: shipment row + new timeline events + public
-- projection + activity log entry, in one transaction, with an optimistic
-- version check. p_expected_version null = create.
-- ---------------------------------------------------------------------------
create or replace function public.commit_shipment(
  p_shipment jsonb,
  p_expected_version integer,
  p_events jsonb,
  p_public jsonb,
  p_log jsonb
) returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  r public.shipments;
  v_rows integer;
begin
  r := jsonb_populate_record(null::public.shipments, p_shipment);

  if p_expected_version is null then
    insert into public.shipments select r.*;
  else
    update public.shipments s set
      version = r.version,
      status = r.status,
      status_before_pause = r.status_before_pause,
      sender = r.sender,
      receiver = r.receiver,
      package = r.package,
      origin = r.origin,
      destination = r.destination,
      waypoints = r.waypoints,
      driver = r.driver,
      estimated_duration_hours = r.estimated_duration_hours,
      route = r.route,
      movement_state = r.movement_state,
      anchor_fraction = r.anchor_fraction,
      anchor_time = r.anchor_time,
      remaining_ms = r.remaining_ms,
      last_event = r.last_event,
      updated_at = r.updated_at
    where s.id = r.id and s.version = p_expected_version;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      raise exception 'version_conflict';
    end if;
  end if;

  if p_events is not null and jsonb_array_length(p_events) > 0 then
    insert into public.shipment_events
      select * from jsonb_populate_recordset(null::public.shipment_events, p_events);
  end if;

  insert into public.public_tracking (tracking_number, shipment_id, version, data, updated_at)
  values (r.tracking_number, r.id, r.version, p_public, r.updated_at)
  on conflict (tracking_number) do update
    set version = excluded.version, data = excluded.data, updated_at = excluded.updated_at;

  if p_log is not null then
    insert into public.activity_log (at, actor, action, summary, shipment_id, tracking_number, target_uid, before, after, details)
    select l.at, l.actor, l.action, l.summary, l.shipment_id, l.tracking_number, l.target_uid, l.before, l.after, l.details
    from jsonb_populate_record(null::public.activity_log, p_log) l;
  end if;

  return r.version;
end;
$$;

-- Public read: exactly one projection by tracking number. Cannot list.
create or replace function public.get_public_tracking(p_tracking_number text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select data from public.public_tracking where tracking_number = upper(trim(p_tracking_number));
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security (defence in depth; the server uses the secret key)
-- ---------------------------------------------------------------------------
alter table public.staff enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;
alter table public.public_tracking enable row level security;
alter table public.activity_log enable row level security;
alter table public.contact_messages enable row level security;

create policy "staff read staff" on public.staff for select to authenticated using (public.is_staff());
create policy "staff read shipments" on public.shipments for select to authenticated using (public.is_staff());
create policy "staff read events" on public.shipment_events for select to authenticated using (public.is_staff());
create policy "admins read activity" on public.activity_log for select to authenticated using (public.is_admin());
create policy "staff read messages" on public.contact_messages for select to authenticated using (public.is_staff());
-- public_tracking: no policies at all. Only get_public_tracking() can read it.
-- No insert/update/delete policies anywhere: browsers never write.

revoke update, delete, truncate on public.activity_log from anon, authenticated, service_role;

revoke all on function public.commit_shipment(jsonb, integer, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.commit_shipment(jsonb, integer, jsonb, jsonb, jsonb) to service_role;

revoke all on function public.get_public_tracking(text) from public;
grant execute on function public.get_public_tracking(text) to anon, authenticated, service_role;

revoke all on function public.is_staff() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_staff() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
