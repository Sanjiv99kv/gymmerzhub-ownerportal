import { Bell, Plus, Search, UserPlus, BadgePlus, Receipt, Megaphone, ChevronDown } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { hasPermission, isOwnerSession } from "@/lib/permissions";
import { getSession, getTrialInfo } from "@/lib/tenant";
import { logoutOwnerSession } from "@/lib/auth-session";

function ownerInitials(name?: string) {
  if (!name) return "GO";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function TopBar() {
  const navigate = useNavigate();
  const session = getSession();
  const firstName = session?.ownerName?.split(" ")[0] ?? "Owner";
  const trial = session ? getTrialInfo(session) : null;
  const showQuickActions =
    isOwnerSession(session)
    || hasPermission(session, "members.write")
    || hasPermission(session, "plans.write")
    || hasPermission(session, "payments.write")
    || hasPermission(session, "notices.write");
  const canBilling = hasPermission(session, "billing.read");
  const canSettings = hasPermission(session, "settings.read");

  const logout = async () => {
    await logoutOwnerSession();
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/90 px-4 shadow-sm backdrop-blur-md">
      <SidebarTrigger className="h-8 w-8 text-muted-foreground" />

      {showQuickActions && (
        <div className="relative hidden flex-1 max-w-md md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members, payments, plans…"
            className="h-9 border-border bg-muted/50 pl-9 focus-visible:bg-card focus-visible:ring-primary"
          />
        </div>
      )}

      {session && (
        <div className="hidden items-center gap-2 lg:flex">
          <Badge variant="outline" className="border-border bg-muted/40 font-medium text-muted-foreground">
            {session.gymName}
          </Badge>
          {trial?.isTrialing && canBilling && (
            <button
              type="button"
              onClick={() => navigate({ to: "/billing" })}
              className="rounded-full"
            >
              <Badge variant="outline" className="cursor-pointer border-primary/30 bg-primary/10 font-medium text-primary hover:bg-primary/15">
                Trial · {trial.daysLeft}d left
              </Badge>
            </button>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {showQuickActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="hidden bg-primary text-primary-foreground hover:bg-primary/90 md:inline-flex">
                <Plus className="mr-1 h-4 w-4" /> Quick Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Create</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hasPermission(session, "members.write") && (
                <DropdownMenuItem><UserPlus className="mr-2 h-4 w-4" /> Add Member</DropdownMenuItem>
              )}
              {hasPermission(session, "plans.write") && (
                <DropdownMenuItem><BadgePlus className="mr-2 h-4 w-4" /> Create Membership</DropdownMenuItem>
              )}
              {hasPermission(session, "payments.write") && (
                <DropdownMenuItem><Receipt className="mr-2 h-4 w-4" /> Record Payment</DropdownMenuItem>
              )}
              {hasPermission(session, "notices.write") && (
                <DropdownMenuItem><Megaphone className="mr-2 h-4 w-4" /> Create Notice</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full border border-border bg-card px-1.5 py-1 shadow-sm transition-colors hover:bg-muted">
              <Avatar className="h-7 w-7">
                {session?.ownerAvatarUrl ? (
                  <AvatarImage src={session.ownerAvatarUrl} alt={session.ownerName} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                  {ownerInitials(session?.ownerName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight md:block">
                <div className="text-xs font-semibold">{firstName}</div>
                <div className="text-[10px] capitalize text-muted-foreground">{session?.plan ?? "owner"}</div>
              </div>
              <ChevronDown className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>Profile</DropdownMenuItem>
            {canBilling && (
              <DropdownMenuItem onClick={() => navigate({ to: "/billing" })}>Billing</DropdownMenuItem>
            )}
            {canSettings && (
              <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>Settings</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={logout}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function PageHeader({
  title, description, action, badge,
}: { title: string; description?: string; action?: React.ReactNode; badge?: string }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-card/50 px-6 py-5 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1.5 animate-fade-up">
        {badge && (
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            {badge}
          </Badge>
        )}
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}
