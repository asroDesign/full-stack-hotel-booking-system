/**
 * Runtime mode flags.
 *
 * DEMO_MODE controls whether demo content is seeded into an EMPTY database and
 * whether demo helpers are available. It never deletes or overwrites existing
 * records — production deployments can safely keep it off.
 */
export function isDemoMode(): boolean {
  const raw = (process.env.DEMO_MODE ?? "false").trim().toLowerCase();
  return !["false", "0", "off", "no", "production", "live"].includes(raw);
}

export function demoCredentialsVisible(): boolean {
  return isDemoMode() && (process.env.NEXT_PUBLIC_DEMO_CREDENTIALS ?? "").trim().toLowerCase() === "true";
}

export function demoAdminCredentials(): { email: string; password: string; name: string } {
  return {
    email: (process.env.DEMO_ADMIN_EMAIL ?? "admin@atalar.ir").trim().toLowerCase(),
    password: process.env.DEMO_ADMIN_PASSWORD ?? "Atalar@1400",
    name: process.env.DEMO_ADMIN_NAME ?? "مدیر پذیرش کاج",
  };
}

export function productionAdminCredentials(): { email: string; password: string; name: string } | null {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || password.length < 8 || password.length > 1024) return null;
  return { email, password, name: process.env.ADMIN_NAME ?? "مدیر هتل" };
}
