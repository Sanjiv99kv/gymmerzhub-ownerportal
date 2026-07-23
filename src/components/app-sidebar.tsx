import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, BadgeCheck, CalendarCheck, Wallet, BarChart3,
  Dumbbell, Megaphone, Salad, Activity, FileText, Settings, LogOut, User,
  Receipt,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { clearSession, getSession, workspaceUrl } from "@/lib/tenant";

const main = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Members", url: "/members", icon: Users },
  { title: "Membership Plans", url: "/plans", icon: BadgeCheck },
  { title: "Attendance", url: "/attendance", icon: CalendarCheck },
  { title: "Payments", url: "/payments", icon: Wallet },
  { title: "Revenue Analytics", url: "/revenue", icon: BarChart3 },
];

const programs = [
  { title: "Trainers", url: "/trainers", icon: Dumbbell },
  { title: "Notices", url: "/notices", icon: Megaphone },
  { title: "Diet Plans", url: "/diet", icon: Salad },
  { title: "Workout Plans", url: "/workouts", icon: Activity },
];

const system = [
  { title: "Billing & Invoices", url: "/billing", icon: Receipt },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const session = getSession();
  const isActive = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));

  const logout = () => {
    clearSession();
    navigate({ to: "/login" });
  };

  const renderItems = (items: typeof main) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={isActive(item.url)}
          tooltip={item.title}
          className="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:font-semibold hover:bg-sidebar-accent transition-colors"
        >
          <Link to={item.url}>
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar shadow-sm">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className={collapsed ? "flex items-center justify-center px-1 py-3" : "flex items-center gap-2.5 px-2 py-3"}>
          <div className="grid h-9 w-9 min-h-9 min-w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="h-4 w-4" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <div className="truncate font-display text-sm font-extrabold tracking-tight text-foreground">
                {session?.gymName ?? "GymmerzHub"}
              </div>
              <div className="truncate text-[10px] font-medium text-muted-foreground">
                {session ? workspaceUrl(session.gymSlug) : "Gym Management"}
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1.5">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(main)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            Programs
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(programs)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(system)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Profile" asChild>
              <Link to="/profile">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Logout"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
