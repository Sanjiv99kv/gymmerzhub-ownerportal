import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, BadgeCheck, CalendarCheck, Wallet, BarChart3,
  Dumbbell, Megaphone, Salad, Activity, FileText, Settings, LogOut, User,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

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
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));

  const renderItems = (items: typeof main) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={isActive(item.url)}
          tooltip={item.title}
          className="data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-glow hover:bg-sidebar-accent transition-all"
        >
          <Link to={item.url}>
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className={collapsed ? "flex items-center justify-center px-1 py-3" : "flex items-center gap-2.5 px-2 py-3"}>
          <div className="grid h-10 w-10 min-h-10 min-w-10 shrink-0 place-items-center rounded-full bg-gradient-primary shadow-glow">
            <Dumbbell className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-display text-base font-bold tracking-tight">
                Fit<span className="text-primary">Saathi</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Gym Management
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1">
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(main)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Programs</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(programs)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(system)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Profile">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Logout" className="text-destructive hover:text-destructive">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
