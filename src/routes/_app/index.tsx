import { createFileRoute } from "@tanstack/react-router";
import { Users, BadgeCheck, CalendarCheck, Wallet, ArrowUpRight } from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { KpiCard } from "@/components/kpi-card";
import { kpis, membershipGrowth, revenueData, attendanceTrends, members, notices } from "@/lib/data";
import {
  chartTooltipStyle, chartGrid, chartCursor, chartAxis, chartColors,
} from "@/lib/chart-theme";
import { getSession } from "@/lib/tenant";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — GymmerzHub" },
      { name: "description", content: "Executive overview of members, attendance, payments, and revenue for your gym." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const session = getSession();
  const ownerFirst = session?.ownerName?.split(" ")[0] ?? "there";
  const gymLabel = session?.gymName ?? "your gym";

  const monthlyCount = members.filter((m) => m.plan === "Monthly").length;
  const yearlyCount = members.filter((m) => m.plan === "Yearly").length;
  const totalPlanMembers = monthlyCount + yearlyCount;
  const planDistribution = [
    {
      name: "Monthly",
      value: monthlyCount,
      pct: totalPlanMembers ? Math.round((monthlyCount / totalPlanMembers) * 100) : 0,
      color: "bg-primary",
    },
    {
      name: "Yearly",
      value: yearlyCount,
      pct: totalPlanMembers ? Math.round((yearlyCount / totalPlanMembers) * 100) : 0,
      color: "bg-lime",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Dashboard
            </h1>
            <Badge variant="outline" className="border-success/25 bg-success/10 font-medium text-success">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-success" />
              Live · 210 training
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {gymLabel} · Welcome back, {ownerFirst}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button>
            Add New Member <ArrowUpRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Members" value={kpis.totalMembers.toLocaleString("en-IN")} delta={12} icon={Users} accent="primary" />
        <KpiCard label="Active Memberships" value={kpis.activeMemberships.toLocaleString("en-IN")} delta={8} icon={BadgeCheck} accent="lime" />
        <KpiCard label="Today's Attendance" value={kpis.todayCheckIns.toString()} delta={15} icon={CalendarCheck} accent="success" />
        <KpiCard label="Monthly Revenue" value={`₹${(kpis.monthlyRevenue / 1000).toFixed(0)}K`} delta={18} icon={Wallet} accent="warning" />
      </section>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border bg-card shadow-card lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="font-display">Membership Growth</CardTitle>
              <CardDescription>Monthly active members across 2025</CardDescription>
            </div>
            <Badge variant="outline" className="border-success/30 bg-success/10 text-success">+73% YoY</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={membershipGrowth}>
                <defs>
                  <linearGradient id="lineFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="m" stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="members" stroke={chartColors.primary} strokeWidth={2.5}
                  dot={{ r: 3, fill: chartColors.primary }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-card">
          <CardHeader>
            <CardTitle className="font-display">Revenue Analytics</CardTitle>
            <CardDescription>Monthly earnings in ₹ thousands</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="m" stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: chartCursor }} />
                <Bar dataKey="revenue" fill={chartColors.secondary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border bg-card shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display">Attendance Trends</CardTitle>
            <CardDescription>Daily check-ins this month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={attendanceTrends}>
                <defs>
                  <linearGradient id="attFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="d" stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="count" stroke={chartColors.primary} strokeWidth={2} fill="url(#attFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-card">
          <CardHeader>
            <CardTitle className="font-display">Recent Joiners</CardTitle>
            <CardDescription>Latest member sign-ups</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.slice(0, 5).map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-transparent p-2 transition-colors hover:border-border hover:bg-muted/60">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={m.photo} />
                  <AvatarFallback>{m.name[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.plan} · {m.joinDate}</div>
                </div>
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">{m.plan}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display">Latest Notices</CardTitle>
              <CardDescription>Announcements visible to members</CardDescription>
            </div>
            <Button variant="ghost" size="sm">View all</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {notices.slice(0, 3).map((n) => (
              <div key={n.title} className="rounded-xl border border-border bg-muted/40 p-4 transition-colors hover:border-primary/30">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-lime/30 bg-lime/10 text-lime">{n.tag}</Badge>
                  <span className="text-xs text-muted-foreground">{n.date}</span>
                </div>
                <div className="mt-2 font-semibold">{n.title}</div>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-card">
          <CardHeader>
            <CardTitle className="font-display">Plan Distribution</CardTitle>
            <CardDescription>How members split across plans</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            {planDistribution.map((p) => (
              <div key={p.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground">{p.value} members · {p.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full ${p.color}`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
