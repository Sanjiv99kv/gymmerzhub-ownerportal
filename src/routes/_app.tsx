import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/topbar";
import { ApiError } from "@/lib/api";
import { fetchOwnerMe } from "@/lib/owner-auth-api";
import { canAccessPath, firstAllowedPath } from "@/lib/permissions";
import { clearSession, getSession, setSession } from "@/lib/tenant";

const SESSION_CHECK_TTL_MS = 30_000;
let lastCheckedToken = "";
let lastCheckedAt = 0;

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    const session = getSession();
    if (!session?.token) {
      clearSession();
      throw redirect({ to: "/login" });
    }

    const now = Date.now();
    const shouldRefresh =
      session.token !== lastCheckedToken
      || now - lastCheckedAt >= SESSION_CHECK_TTL_MS
      || session.permissionKeys === undefined
      || !session.hubRole;

    if (shouldRefresh) {
      try {
        const me = await fetchOwnerMe(session.token);
        const membership = me.data.membership;
        const next = {
          ...session,
          ownerName: me.data.user.fullName || session.ownerName,
          ownerEmail: me.data.user.email || session.ownerEmail,
          ownerPhone: me.data.user.phone ?? session.ownerPhone ?? null,
          ownerAvatarUrl: me.data.user.avatarUrl ?? session.ownerAvatarUrl ?? null,
          emailVerified: Boolean(me.data.user.emailVerified ?? me.data.user.emailVerifiedAt),
          hubRole: membership?.role || session.hubRole || "owner",
          hubRoleName: membership?.gymRoleName ?? session.hubRoleName ?? null,
          permissionKeys: Array.isArray(membership?.permissionKeys)
            ? membership.permissionKeys
            : membership?.role === "owner"
              ? session.permissionKeys
              : [],
        };
        setSession(next);
        lastCheckedToken = session.token;
        lastCheckedAt = Date.now();

        if (!canAccessPath(next, location.pathname)) {
          throw redirect({ to: firstAllowedPath(next) });
        }
        return;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          lastCheckedToken = "";
          lastCheckedAt = 0;
          clearSession();
          throw redirect({ to: "/login" });
        }
        if (error && typeof error === "object" && "to" in (error as object)) {
          throw error;
        }
        // Allow the shell to load on transient network errors.
      }
    }

    const current = getSession();
    if (current && !canAccessPath(current, location.pathname)) {
      throw redirect({ to: firstAllowedPath(current) });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
