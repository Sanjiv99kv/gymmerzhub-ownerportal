import type { AuthSession } from "@/lib/tenant";

/** Map hub routes → required permission key (read access to see the page). */
const ROUTE_PERMISSIONS: Array<{ prefix: string; permission: string | null }> = [
  { prefix: "/profile", permission: null },
  { prefix: "/members", permission: "members.read" },
  { prefix: "/plans", permission: "plans.read" },
  { prefix: "/attendance", permission: "attendance.read" },
  { prefix: "/payments", permission: "payments.read" },
  { prefix: "/revenue", permission: "revenue.read" },
  { prefix: "/trainers", permission: "trainers.read" },
  { prefix: "/notices", permission: "notices.read" },
  { prefix: "/diet", permission: "diet.read" },
  { prefix: "/workouts", permission: "workouts.read" },
  { prefix: "/team", permission: "team.read" },
  { prefix: "/roles", permission: "team.write" },
  { prefix: "/billing", permission: "billing.read" },
  { prefix: "/reports", permission: "reports.read" },
  { prefix: "/settings", permission: "settings.read" },
  // Dashboard: always available to authenticated hub users
  { prefix: "/", permission: null },
];

export function isOwnerSession(session: AuthSession | null | undefined) {
  // Only the gym owner bypasses permission checks — never treat a missing role as owner.
  return session?.hubRole === "owner";
}

export function hasPermission(session: AuthSession | null | undefined, key: string) {
  if (!session) return false;
  if (isOwnerSession(session)) return true;
  return Boolean(session.permissionKeys?.includes(key));
}

export function permissionForPath(pathname: string): string | null | undefined {
  const path = pathname.split("?")[0] || "/";
  for (const row of ROUTE_PERMISSIONS) {
    if (row.prefix === "/") {
      if (path === "/" || path === "") return row.permission;
      continue;
    }
    if (path === row.prefix || path.startsWith(`${row.prefix}/`)) {
      return row.permission;
    }
  }
  return undefined;
}

/** Whether the session may open this path in the hub. */
export function canAccessPath(session: AuthSession | null | undefined, pathname: string) {
  if (!session) return false;
  if (isOwnerSession(session)) return true;

  const path = pathname.split("?")[0] || "/";
  if (path === "/" || path === "") return true;
  if (path === "/profile" || path.startsWith("/profile/")) return true;

  const required = permissionForPath(path);
  if (required === undefined) return false;
  if (required === null) return true;

  return hasPermission(session, required);
}

export function firstAllowedPath(session: AuthSession | null | undefined) {
  if (!session) return "/login";
  return "/";
}
