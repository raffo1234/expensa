const DEFAULT_PATH = "/admin/dashboard";

/**
 * Where to send the user after signing in. Only internal admin paths are
 * allowed, so a crafted link like `?callbackUrl=https://evil.com` or
 * `//evil.com` can't turn the login into an open redirect.
 */
export function safeCallbackPath(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_PATH;
  // Must be a path on this site: one leading slash, no protocol-relative "//"
  // and no backslashes (some browsers treat "/\\evil.com" as another host).
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return DEFAULT_PATH;
  }
  const path = value.split(/[?#]/)[0];
  if (path !== "/admin" && !path.startsWith("/admin/")) return DEFAULT_PATH;
  return value;
}
