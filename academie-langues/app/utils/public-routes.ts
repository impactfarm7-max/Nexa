/** Routes accessibles sans session (marketing, auth, démos). */
export const PUBLIC_ROUTE_PREFIXES = [
  "/login",
  "/ouvrir-centre",
  "/centre",
  "/support",
  "/onboarding",
  "/pin",
  "/reset-password",
  "/cgu",
  "/politique-confidentialite",
  "/choix",
  "/paywall",
  "/revoque",
  "/termine",
  "/pause",
  "/admin",
  "/superadmin",
  "/view-as",
  "/presentation",
  "/programmes",
  "/valeurs",
  "/demo",
];

export function isPublicAppRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  if (pathname === "/") return true;
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
