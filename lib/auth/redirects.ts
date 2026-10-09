/** Only allow redirects to paths inside this site's dashboard/account area. */
export function safeNext(value: string | null | undefined, fallback = "/admin"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value.startsWith("/admin") || value.startsWith("/account") ? value : fallback;
}
