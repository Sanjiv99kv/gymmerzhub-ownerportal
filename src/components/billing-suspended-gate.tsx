import { useSyncExternalStore, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSession, subscribeSession } from "@/lib/tenant";

/** Routes still usable while platform billing is suspended. */
export const SUSPENDED_ALLOWED_PATHS = ["/billing", "/profile", "/settings"] as const;

export function isSuspendedPathAllowed(pathname: string) {
  return SUSPENDED_ALLOWED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function useAuthSession() {
  return useSyncExternalStore(subscribeSession, getSession, () => null);
}

export function isBillingSuspended(session = getSession()) {
  return session?.billingStatus === "suspended";
}

/** Sticky top banner on every hub page when suspended. */
export function BillingSuspendedBanner() {
  const session = useAuthSession();
  if (!isBillingSuspended(session)) return null;

  return (
    <div className="sticky top-0 z-40 border-b border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Services suspended — pay outstanding GymmerzHub invoices to restore access.</span>
        </div>
        <Button asChild size="sm" variant="destructive" className="h-8">
          <Link to="/billing">Go to Billing</Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * Blocks operational pages (members, plans, etc.) while suspended.
 * Billing / profile / settings remain available.
 */
export function BillingSuspendedPageLock({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const session = useAuthSession();

  if (!isBillingSuspended(session) || isSuspendedPathAllowed(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <Lock className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-xl font-semibold tracking-tight">
            Workspace suspended
          </h1>
          <p className="text-sm text-muted-foreground">
            Member management and other gym tools are locked until you pay your GymmerzHub invoices.
          </p>
        </div>
        <Button asChild>
          <Link to="/billing">Pay invoices on Billing</Link>
        </Button>
      </div>
    </div>
  );
}
