import { createFileRoute } from "@tanstack/react-router";
import { Users, BadgeCheck, CalendarCheck, Wallet, ArrowUpRight, Activity } from "lucide-react";
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
import heroImg from "@/assets/hero-gym.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — FitSaathi" },
      { name: "description", content: "Executive overview of members, attendance, payments, and revenue for your gym." },
    ],
  }),
  component: DashboardPage,
});

const tooltipStyle = {
  backgroundColor: "oklch(0.17 0 0)",
  border: "1px solid oklch(1 0 0 / 10%)",
  borderRadius: 10,
  color: "white",
  fontSize: 12,
};

function DashboardPage() {
  const monthlyCount = members.filter((m) => m.plan === "Monthly").length;
  const yearlyCount = members.filter((m) => m.plan === "Yearly").length;
  const totalPlanMembers = monthlyCount + yearlyCount;
  const planDistribution = [
    {
      name: "Monthly",
      value: monthlyCount,
      pct: totalPlanMembers ? Math.round((monthlyCount / totalPlanMembers) * 100) : 0,
      color: "bg-gradient-primary",
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
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border shadow-card animate-fade-up">
        <img src={heroImg} alt="Premium gym interior" className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
        <div className="absolute inset-0 bg-hero" />
        <div className="relative grid gap-6 p-8 md:grid-cols-[1.4fr_1fr] md:p-10">
          <div className="space-y-4">
            <Badge className="border-primary/40 bg-primary/15 text-primary hover:bg-primary/20">
              <Activity className="mr-1 h-3 w-3" /> Live · 210 members training today
            </Badge>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Welcome back, <span className="text-gradient-primary">Gym Owner</span>
            </h1>
            <p className="max-w-lg text-sm text-muted-foreground md:text-base">
              Here's what's happening at FitSaathi Andheri today. Memberships are up 12% this month and revenue is on track to hit ₹5L.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95">
                Add New Member <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
              <Button variant="outline" className="border-border bg-background/40 backdrop-blur">
                View Reports
              </Button>
            </div>
          </div>
          <div className="hidden grid-cols-2 gap-3 md:grid">
            {[
              { l: "Active today", v: "210", c: "text-lime" },
              { l: "Renewals due", v: "32", c: "text-warning" },
              { l: "New this week", v: "47", c: "text-primary" },
              { l: "Avg. rating", v: "4.8★", c: "text-success" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.l}</div>
                <div className={`font-display text-2xl font-bold ${s.c}`}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KPIs */}
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
            <Badge variant="outline" className="border-success/40 bg-success/10 text-success">+73% YoY</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={membershipGrowth}>
                <defs>
                  <linearGradient id="lineFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.21 45)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.72 0.21 45)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
                <XAxis dataKey="m" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="members" stroke="oklch(0.72 0.21 45)" strokeWidth={2.5}
                  dot={{ r: 3, fill: "oklch(0.72 0.21 45)" }} activeDot={{ r: 5 }} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
                <XAxis dataKey="m" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "oklch(1 0 0 / 5%)" }} />
                <Bar dataKey="revenue" fill="oklch(0.92 0.24 130)" radius={[6, 6, 0, 0]} />
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
                    <stop offset="0%" stopColor="oklch(0.72 0.21 45)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.72 0.21 45)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
                <XAxis dataKey="d" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="count" stroke="oklch(0.72 0.21 45)" strokeWidth={2} fill="url(#attFill)" />
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
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-transparent p-2 transition-colors hover:border-border hover:bg-accent/40">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={m.photo} />
                  <AvatarFallback>{m.name[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.plan} · {m.joinDate}</div>
                </div>
                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">{m.plan}</Badge>
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
              <div key={n.title} className="rounded-xl border border-border bg-background/40 p-4 transition-colors hover:border-primary/40">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-lime/40 bg-lime/10 text-lime">{n.tag}</Badge>
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
