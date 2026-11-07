/** Only allow same-site relative redirects (prevents open-redirect via ?next=). */
export function safeNext(next?: string | string[] | null, fallback = "/"): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
