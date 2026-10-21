const DEFAULT_ADMIN_PATH = "/admin";

/**
 * Where to send an administrator after signing in. Only same-site paths inside
 * /admin are allowed, which prevents open redirects such as
 * `?next=https://evil.example` or `?next=//evil.example`.
 */
export function safeAdminRedirect(target: unknown): string {
  if (typeof target !== "string" || target.length > 512) return DEFAULT_ADMIN_PATH;
  if (!/^\/admin(?:[/?#]|$)/.test(target)) return DEFAULT_ADMIN_PATH;
  if (target.includes("\\") || target.includes("//")) return DEFAULT_ADMIN_PATH;
  if (/^\/admin\/login(?:[/?#]|$)/.test(target)) return DEFAULT_ADMIN_PATH;
  return target;
}
