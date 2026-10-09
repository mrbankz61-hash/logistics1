/**
 * Create (or promote) a staff account from the command line.
 *
 *   npm run create-admin -- --email you@agency.com --password "a-strong-password" --name "Your Name"
 *   npm run create-admin -- --email dispatcher@agency.com --password "..." --name "Sam" --role dispatcher
 */
import { argValue } from "./load-env";
import type { User } from "@supabase/supabase-js";
import { writeActivity } from "@/lib/server/shipments";
import { adminDb, check } from "@/lib/supabase/admin";
import { isRole } from "@/lib/types";

async function findUserByEmail(email: string): Promise<User | null> {
  const auth = adminDb().auth.admin;
  for (let page = 1; page < 100; page++) {
    const { data, error } = await auth.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function main() {
  const email = argValue("email")?.trim().toLowerCase();
  const password = argValue("password");
  const name = argValue("name")?.trim() || email?.split("@")[0] || "Admin";
  const role = argValue("role") ?? "admin";

  if (!email || !isRole(role)) {
    console.error('Usage: npm run create-admin -- --email <email> --password "<password>" --name "<name>" [--role admin|dispatcher]');
    process.exit(1);
  }
  if (password !== undefined && password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const db = adminDb();
  let user = await findUserByEmail(email);
  if (user) {
    check(
      await db.auth.admin.updateUserById(user.id, {
        ban_duration: "none",
        email_confirm: true,
        user_metadata: { ...user.user_metadata, name },
        ...(password ? { password } : {}),
      }),
    );
    console.log(`Updated existing user ${email}`);
  } else {
    if (!password) {
      console.error("New users need --password.");
      process.exit(1);
    }
    user = check(await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } })).user;
    console.log(`Created user ${email}`);
  }

  check(await db.from("staff").upsert({ id: user.id, email, name, role, disabled: false }));
  await writeActivity({
    actor: { uid: "cli", name: "Command line", email: "", role: "admin" },
    at: Date.now(),
    action: "staff.bootstrap",
    summary: `Granted ${role} role to ${email} from the command line`,
    targetUid: user.id,
    after: { email, name, role },
  });

  console.log(`✔ ${email} now has the "${role}" role. Sign in at /login.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
