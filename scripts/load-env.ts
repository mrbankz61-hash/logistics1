import { config } from "dotenv";

// Same precedence as Next.js: .env.local overrides .env.
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export function argValue(name: string): string | undefined {
  const args = process.argv.slice(2);
  const i = args.indexOf(`--${name}`);
  if (i !== -1) return args[i + 1];
  const inline = args.find((a) => a.startsWith(`--${name}=`));
  return inline?.slice(name.length + 3);
}
