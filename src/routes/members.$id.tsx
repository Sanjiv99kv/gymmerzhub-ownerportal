import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft, Phone, Mail, Calendar, User2, Activity, Pencil, RefreshCcw,
  Wallet, PauseCircle, AlertOctagon, Trash2, Download, FileText, CheckCircle2,
  MessageCircle, MessageSquare, Send, ShieldAlert, Clock3, Dumbbell,
  UtensilsCrossed, Target, TrendingUp, Flame, Star,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { members } from "@/lib/data";

export const Route = createFileRoute("/members/$id")({
  loader: ({ params }) => {
    const m = members.find((x) => x.id === params.id);
    if (!m) throw notFound();
    return { member: m };
  },
  component: MemberDetail,
});

const tooltipStyle = {
  backgroundColor: "oklch(0.17 0 0)",
  border: "1px solid oklch(1 0 0 / 10%)",
  borderRadius: 10,
  color: "white",
  fontSize: 12,
};

const weightTrend = [
  { m: "Jan", kg: 85 }, { m: "Feb", kg: 83 }, { m: "Mar", kg: 81 },
  { m: "Apr", kg: 79 }, { m: "May", kg: 78 }, { m: "Jun", kg: 77 },
];

const membershipHistory = [
  { date: "2025-01-05", action: "Joined Gym",              plan: "Monthly",   amount: "₹1,500",  type: "join" },
  { date: "2025-02-05", action: "Monthly Plan Purchased",  plan: "Monthly",   amount: "₹1,500",  type: "purchase" },
  { date: "2025-03-05", action: "Renewed to 3 Month Plan", plan: "Quarterly", amount: "₹4,000",  type: "renew" },
  { date: "2025-06-05", action: "Discount Applied",        plan: "Quarterly", amount: "-₹600",   type: "discount" },
  { date: "2025-09-05", action: "Upgraded to Annual Plan", plan: "Yearly",    amount: "₹13,000", type: "upgrade" },
  { date: "2025-11-10", action: "Membership Frozen",       plan: "Yearly",    amount: "—",       type: "freeze" },
  { date: "2025-11-25", action: "Membership Resumed",      plan: "Yearly",    amount: "—",       type: "resume" },
];

const paymentRows = [
  { date: "12 Jan 2026", amount: "₹3,000", method: "UPI",           status: "Paid" },
  { date: "12 Apr 2026", amount: "₹3,000", method: "Cash",          status: "Paid" },
  { date: "12 Jul 2026", amount: "₹3,000", method: "Card",          status: "Paid" },
  { date: "12 Oct 2026", amount: "₹3,000", method: "Bank Transfer", status: "Pending" },
];

const attendanceHistory = [
  { date: "2026-05-28", in: "06:45 AM", out: "08:20 AM", duration: "1h 35m" },
  { date: "2026-05-27", in: "07:10 AM", out: "08:05 AM", duration: "55m" },
  { date: "2026-05-25", in: "06:50 AM", out: "08:02 AM", duration: "1h 12m" },
  { date: "2026-05-24", in: "07:05 AM", out: "08:21 AM", duration: "1h 16m" },
];

const activities = [
  { when: "Today",       msg: "Checked In",                icon: "check" },
  { when: "2 Days Ago",  msg: "Diet Plan Updated",         icon: "update" },
  { when: "5 Days Ago",  msg: "Payment Received ₹3,000",   icon: "payment" },
  { when: "20 Days Ago", msg: "Membership Renewed",        icon: "renew" },
  { when: "45 Days Ago", msg: "Joined Gym",                icon: "join" },
];

const historyTypeColors: Record<string, string> = {
  join:     "bg-success text-success-foreground",
  purchase: "bg-primary text-primary-foreground",
  renew:    "bg-primary text-primary-foreground",
  discount: "bg-lime text-lime-foreground",
  upgrade:  "bg-warning text-warning-foreground",
  freeze:   "bg-muted-foreground text-background",
  resume:   "bg-success text-success-foreground",
};

function MemberDetail() {
  const { member } = Route.useLoaderData();
  const today = new Date();
  const joinDate = parseISO(member.joinDate);
  const expiryDate = parseISO(member.expiryDate);
  const totalDays = Math.max(1, daysBetween(joinDate, expiryDate));
  const usedDays = clamp(daysBetween(joinDate, today), 0, totalDays);
  const daysRemaining = Math.max(0, daysBetween(today, expiryDate));
  const progressPct = Math.round((usedDays / totalDays) * 100);
  const outstanding = daysRemaining > 0 ? 0 : member.plan === "Yearly" ? 13000 : 1500;
  const statusTone = getStatusTone(member.status);
  const attendanceThisMonth = Math.max(0, Math.round(member.attendance * 0.2));
  const totalPaid = paymentRows
    .filter((p) => p.status === "Paid")
    .reduce((sum, p) => sum + Number(p.amount.replace(/[^\d]/g, "")), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav Bar */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
        <Button asChild variant="ghost" size="sm">
          <Link to="/members">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Members
          </Link>
        </Button>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm text-muted-foreground">{member.name}</span>
        <span className="text-xs text-muted-foreground">· {member.id}</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline"><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
          <Button size="sm" className="bg-gradient-primary text-primary-foreground shadow-glow">
            <RefreshCcw className="mr-1 h-3.5 w-3.5" /> Renew
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Hero Header Card */}
        <Card className="overflow-hidden border-border bg-card shadow-card">
          <div className="relative">
            <div className="h-28 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
            <div className="absolute inset-0 bg-hero opacity-40" />
          </div>
          <CardContent className="-mt-12 px-6 pb-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end">
              {/* Avatar */}
              <Avatar className="h-24 w-24 shrink-0 ring-4 ring-card shadow-glow">
                <AvatarImage src={member.photo} />
                <AvatarFallback className="text-2xl font-bold">{member.name[0]}</AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 space-y-3 pt-2">
                <div>
                  <h1 className="font-display text-3xl font-bold leading-tight">{member.name}</h1>
                  <p className="text-sm text-muted-foreground">Membership ID: {member.id}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={statusTone}>{member.status}</Badge>
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">{member.plan}</Badge>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {member.phone}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> {member.email}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> Joined {member.joinDate}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <User2 className="h-3.5 w-3.5" /> {member.age} · {member.gender}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 lg:shrink-0">
                <Button variant="outline" size="sm">
                  <Wallet className="mr-1 h-3.5 w-3.5" /> Record Payment
                </Button>
                <Button variant="outline" size="sm">
                  <PauseCircle className="mr-1 h-3.5 w-3.5" /> Freeze
                </Button>
                <Button variant="outline" size="sm" className="text-warning border-warning/30 hover:bg-warning/10">
                  <AlertOctagon className="mr-1 h-3.5 w-3.5" /> Suspend
                </Button>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Grid: Left content + Right sidebar */}
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* LEFT */}
          <div className="space-y-6 min-w-0">

            {/* Membership Progress Card */}
            <Card className="border-border bg-card shadow-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-display">Current Membership</CardTitle>
                    <CardDescription>Plan lifecycle and status</CardDescription>
                  </div>
                  {daysRemaining === 0 && (
                    <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">Expired</Badge>
                  )}
                  {daysRemaining > 0 && daysRemaining <= 7 && (
                    <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">Expiring in {daysRemaining} days</Badge>
                  )}
                  {daysRemaining > 7 && (
                    <Badge variant="outline" className="border-success/40 bg-success/10 text-success">Active</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Plan", value: member.plan, icon: Star },
                    { label: "Amount Paid", value: `₹${(member.plan === "Yearly" ? 13000 : 1500).toLocaleString("en-IN")}`, icon: Wallet },
                    { label: "Days Remaining", value: `${daysRemaining}`, icon: Clock3 },
                    { label: "Discount", value: "₹500 (Loyalty)", icon: CheckCircle2 },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-xl border border-border bg-background/50 p-3">
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" /> {label}
                      </div>
                      <div className="font-display text-base font-bold">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Started · {member.joinDate}</span>
                    <span className="text-primary font-medium">{progressPct}% used</span>
                    <span>Expires · {member.expiryDate}</span>
                  </div>
                  <Progress value={progressPct} className="h-3" />
                  <p className="text-xs text-muted-foreground">{usedDays} days used of {totalDays} total days</p>
                </div>

                {/* Plan + dates row */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <InfoPill label="Start Date" value={member.joinDate} />
                  <InfoPill label="Expiry Date" value={member.expiryDate} />
                  <InfoPill label="Payment Status" value={daysRemaining > 0 ? "Paid" : "Overdue"} />
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="history">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-card border border-border p-1.5">
                {["history", "payments", "attendance", "fitness", "plans", "communication", "admin"].map((v) => (
                  <TabsTrigger
                    key={v}
                    value={v}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium capitalize data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {v === "plans" ? "Workout & Diet" : v === "admin" ? "Admin Notes" : v.charAt(0).toUpperCase() + v.slice(1)}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Membership History */}
              <TabsContent value="history" className="mt-4">
                <Card className="border-border bg-card shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">Membership History</CardTitle>
                    <CardDescription>Timeline of all plan changes and activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative space-y-0">
                      {membershipHistory.map((item, i) => (
                        <div key={`${item.date}-${i}`} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${historyTypeColors[item.type]}`} />
                            {i < membershipHistory.length - 1 && <div className="my-1 w-px flex-1 bg-border" />}
                          </div>
                          <div className="flex flex-1 items-start justify-between gap-3 pb-5">
                            <div>
                              <p className="text-sm font-medium">{item.action}</p>
                              <p className="text-xs text-muted-foreground">{item.date} · {item.plan}</p>
                            </div>
                            <span className="shrink-0 text-sm font-semibold">{item.amount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payments */}
              <TabsContent value="payments" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard title="Total Revenue" value={`₹${totalPaid.toLocaleString("en-IN")}`} icon={TrendingUp} />
                  <StatCard title="Transactions" value={paymentRows.length.toString()} icon={FileText} />
                  <StatCard title="Last Payment" value="12 Jul 2026" icon={Calendar} />
                  <StatCard title="Outstanding" value={`₹${outstanding.toLocaleString("en-IN")}`} icon={Wallet} />
                </div>
                <Card className="border-border bg-card shadow-card">
                  <CardHeader className="flex-row items-center justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="font-display">Transactions</CardTitle>
                      <CardDescription>Payment trail and collection status</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm"><Download className="mr-1 h-4 w-4" /> Receipt</Button>
                      <Button variant="outline" size="sm"><FileText className="mr-1 h-4 w-4" /> Invoice</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border bg-background/60">
                            {["Date", "Amount", "Method", "Status"].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {paymentRows.map((p) => {
                            const isPaid = p.status === "Paid";
                            return (
                              <tr key={`${p.date}-${p.method}`} className="transition-colors hover:bg-accent/20">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{p.date}</td>
                                <td className="px-4 py-3 font-display font-bold tabular-nums">{p.amount}</td>
                                <td className="px-4 py-3">
                                  <span className="rounded border border-border bg-background/60 px-2 py-0.5 text-xs font-medium">{p.method}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${isPaid ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning"}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${isPaid ? "bg-success" : "bg-warning"}`} />
                                    {p.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Attendance */}
              <TabsContent value="attendance" className="mt-4 space-y-4">
                {/* KPI row */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { title: "Total Visits",   value: member.attendance.toString(), icon: Activity, sub: "All time" },
                    { title: "Current Streak", value: "6 Days",                     icon: Flame,    sub: "🔥 Keep it up!" },
                    { title: "This Month",     value: attendanceThisMonth.toString(), icon: Calendar, sub: "days present" },
                    { title: "Last Check-In",  value: "Today",                      icon: Clock3,   sub: "6:45 AM" },
                  ].map(({ title, value, icon: Icon, sub }) => (
                    <div key={title} className="rounded-xl border border-border bg-card p-4 shadow-card">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{title}</span>
                        <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                      </div>
                      <p className="font-display text-2xl font-bold">{value}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Calendar */}
                <Card className="border-border bg-card shadow-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="font-display">Attendance Calendar</CardTitle>
                        <CardDescription>May 2026</CardDescription>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-sm bg-foreground/80" /> Present
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-sm bg-muted" /> Absent
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Day headers */}
                    <div className="mb-2 grid grid-cols-7 text-center">
                      {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                        <div key={d} className="py-1 text-[11px] font-semibold text-muted-foreground">{d}</div>
                      ))}
                    </div>
                    {/* Calendar cells */}
                    <div className="grid grid-cols-7 gap-1">
                      {/* 2 empty offset cells for May 2026 starting on Friday → offset 5 */}
                      {Array.from({ length: 5 }).map((_, i) => <div key={`e${i}`} />)}
                      {Array.from({ length: 31 }, (_, i) => {
                        const day = i + 1;
                        // pattern: absent on multiples of 5
                        const present = day % 5 !== 0;
                        return (
                          <div
                            key={day}
                            title={`May ${day}`}
                            className={`group relative flex h-9 w-full items-center justify-center rounded-lg text-xs font-medium transition-all
                              ${present
                                ? "bg-foreground/10 text-foreground hover:bg-foreground/20 border border-foreground/15"
                                : "bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-border"
                              }`}
                          >
                            {day}
                            {present && (
                              <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-foreground/60" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Summary bar */}
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-background/40 px-4 py-3">
                      <div className="text-center">
                        <p className="font-display text-lg font-bold text-foreground">25</p>
                        <p className="text-[11px] text-muted-foreground">Present</p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <p className="font-display text-lg font-bold text-muted-foreground">6</p>
                        <p className="text-[11px] text-muted-foreground">Absent</p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <p className="font-display text-lg font-bold text-primary">81%</p>
                        <p className="text-[11px] text-muted-foreground">Attendance Rate</p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <p className="font-display text-lg font-bold">6</p>
                        <p className="text-[11px] text-muted-foreground">Streak</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Attendance History Table */}
                <Card className="border-border bg-card shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">Recent Check-Ins</CardTitle>
                    <CardDescription>Detailed visit log</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border bg-background/60">
                            {["Date", "Check-In", "Check-Out", "Duration"].map((h, i) => (
                              <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${i === 3 ? "text-right" : "text-left"}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {attendanceHistory.map((row) => (
                            <tr key={row.date} className="transition-colors hover:bg-accent/20">
                              <td className="px-4 py-3 font-medium whitespace-nowrap">{row.date}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center rounded-md border border-border bg-background/60 px-2 py-0.5 font-mono text-xs font-medium">{row.in}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center rounded-md border border-border bg-muted/30 px-2 py-0.5 font-mono text-xs">{row.out}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary tabular-nums">{row.duration}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Fitness */}
              <TabsContent value="fitness" className="mt-4 space-y-4">
                <Card className="border-border bg-card shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">Body Measurements</CardTitle>
                    <CardDescription>Current stats and 6-month weight trend</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 lg:grid-cols-2">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { l: "Weight",  v: "77 kg" },
                        { l: "Height",  v: "175 cm" },
                        { l: "BMI",     v: "25.1" },
                        { l: "Chest",   v: "40 in" },
                        { l: "Waist",   v: "34 in" },
                        { l: "Arms",    v: "14 in" },
                        { l: "Thighs",  v: "22 in" },
                      ].map(({ l, v }) => (
                        <div key={l} className="rounded-xl border border-border bg-background/50 p-3">
                          <p className="text-xs text-muted-foreground">{l}</p>
                          <p className="mt-0.5 font-display text-lg font-bold">{v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium text-muted-foreground">Weight Trend (kg)</p>
                      <div className="flex-1 rounded-xl border border-border bg-background/30 p-3">
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={weightTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
                            <XAxis dataKey="m" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Line type="monotone" dataKey="kg" stroke="oklch(0.92 0.24 130)" strokeWidth={2.5} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">Fitness Goals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { l: "Goal",          v: "Weight Loss" },
                        { l: "Target Weight", v: "72 kg" },
                        { l: "Target Date",   v: "Sep 2026" },
                        { l: "Progress",      v: "62%" },
                      ].map(({ l, v }) => (
                        <div key={l} className="rounded-xl border border-border bg-background/50 p-3">
                          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Target className="h-3.5 w-3.5" /> {l}
                          </div>
                          <p className="font-display text-base font-bold">{v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress towards target</span>
                        <span className="font-medium text-foreground">62%</span>
                      </div>
                      <Progress value={62} className="h-2.5" />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Workout & Diet */}
              <TabsContent value="plans" className="mt-4 space-y-4">
                <Card className="border-border bg-card shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">Workout Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-border bg-background/50 p-3">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Dumbbell className="h-3.5 w-3.5" />Trainer</p>
                        <p className="mt-0.5 font-medium">Vikrant Malhotra</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background/50 p-3">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Assigned</p>
                        <p className="mt-0.5 font-medium">2026-05-01</p>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      {[
                        { day: "Monday",    split: "Chest + Triceps" },
                        { day: "Tuesday",   split: "Back + Biceps" },
                        { day: "Wednesday", split: "Legs + Core" },
                        { day: "Thursday",  split: "Shoulders + Mobility" },
                        { day: "Friday",    split: "Full Body Conditioning" },
                      ].map(({ day, split }) => (
                        <div key={day} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2">
                          <span className="text-xs font-semibold text-muted-foreground w-24">{day}</span>
                          <span className="text-sm">{split}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Completion</span><span className="font-medium text-foreground">68%</span>
                      </div>
                      <Progress value={68} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">Diet Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { l: "Trainer",       v: "Sara D'Souza" },
                        { l: "Plan",          v: "Fat Loss High Protein" },
                        { l: "Daily Kcal",    v: "2,100" },
                        { l: "Protein",       v: "140 g/day" },
                      ].map(({ l, v }) => (
                        <div key={l} className="rounded-xl border border-border bg-background/50 p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><UtensilsCrossed className="h-3.5 w-3.5" />{l}</p>
                          <p className="mt-0.5 font-medium text-sm">{v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-2">
                      {[
                        { meal: "Breakfast", items: "Oats + Eggs + Fruit" },
                        { meal: "Lunch",     items: "Rice + Chicken + Salad" },
                        { meal: "Dinner",    items: "Paneer + Roti + Veggies" },
                        { meal: "Snacks",    items: "Greek yogurt + Nuts" },
                      ].map(({ meal, items }) => (
                        <div key={meal} className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2">
                          <span className="text-xs font-semibold text-muted-foreground w-20">{meal}</span>
                          <span className="text-sm">{items}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Communication */}
              <TabsContent value="communication" className="mt-4 space-y-4">
                <Card className="border-border bg-card shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">Communication History</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { msg: "Renewal Reminder Sent", date: "2026-05-25" },
                      { msg: "Membership Expiry Notification Sent", date: "2026-05-10" },
                      { msg: "Diet Plan Updated", date: "2026-04-30" },
                      { msg: "New Workout Plan Assigned", date: "2026-04-20" },
                    ].map((item) => (
                      <div key={item.msg} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2.5">
                        <span className="text-sm">{item.msg}</span>
                        <span className="text-xs text-muted-foreground">{item.date}</span>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2 border-t border-border pt-4">
                    <Button variant="outline" size="sm"><MessageCircle className="mr-1 h-4 w-4" /> WhatsApp</Button>
                    <Button variant="outline" size="sm"><MessageSquare className="mr-1 h-4 w-4" /> SMS</Button>
                    <Button variant="outline" size="sm"><Send className="mr-1 h-4 w-4" /> Email</Button>
                  </CardFooter>
                </Card>

                <Card className="border-border bg-card shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">Emergency Contact</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { l: "Name",         v: "Anita Sharma", icon: User2 },
                        { l: "Relationship", v: "Spouse",       icon: ShieldAlert },
                        { l: "Phone",        v: "+91 98xxxxxx12", icon: Phone },
                      ].map(({ l, v, icon: Icon }) => (
                        <div key={l} className="rounded-xl border border-border bg-background/50 p-3">
                          <p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{l}</p>
                          <p className="font-medium text-sm">{v}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Admin Notes */}
              <TabsContent value="admin" className="mt-4 space-y-4">
                <Card className="border-border bg-card shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">Staff Notes</CardTitle>
                    <CardDescription>Private — visible only to gym staff</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      className="min-h-36 border-border bg-background/60 resize-none"
                      defaultValue={"Prefers evening batches.\nHas knee injury — avoid heavy squats.\nInterested in personal training."}
                    />
                    <Button className="bg-gradient-primary text-primary-foreground shadow-glow">Save Notes</Button>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">Freeze Membership</CardTitle>
                    <CardDescription>Pause membership for vacation or medical break — duration is added to expiry</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="mb-1.5 text-xs text-muted-foreground">Start Date</p>
                        <Input type="date" className="border-border bg-background" />
                      </div>
                      <div>
                        <p className="mb-1.5 text-xs text-muted-foreground">End Date</p>
                        <Input type="date" className="border-border bg-background" />
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs text-muted-foreground">Reason</p>
                      <Input placeholder="e.g., Vacation, Surgery" className="border-border bg-background" />
                    </div>
                    <p className="rounded-lg border border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                      Example: 15 June to 30 June — 15 days will be added to your expiry date automatically.
                    </p>
                    <Button variant="outline">
                      <PauseCircle className="mr-2 h-4 w-4" /> Apply Freeze
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="sticky top-20 self-start space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto pb-4 scrollbar-none">
            {/* Quick Stats */}
            <Card className="border-border bg-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Status",         value: member.status,                             icon: Activity, tone: member.status === "active" ? "text-success" : "text-destructive" },
                    { label: "Days Left",      value: `${daysRemaining}d`,                        icon: Clock3,   tone: daysRemaining <= 7 ? "text-warning" : "" },
                    { label: "Plan",           value: member.plan,                               icon: Star,     tone: "text-primary" },
                    { label: "Last Visit",     value: "Today",                                   icon: Calendar, tone: "" },
                    { label: "Total Visits",   value: member.attendance.toString(),              icon: Activity, tone: "" },
                    { label: "Trainer",        value: "Vikrant",                                 icon: User2,    tone: "" },
                    { label: "Total Paid",     value: `₹${(totalPaid / 1000).toFixed(0)}K`,      icon: Wallet,   tone: "text-success" },
                    { label: "Outstanding",    value: `₹${outstanding.toLocaleString("en-IN")}`, icon: Wallet,   tone: outstanding > 0 ? "text-destructive" : "" },
                  ].map(({ label, value, icon: Icon, tone }) => (
                    <div key={label} className="rounded-xl border border-border bg-background/50 p-3">
                      <div className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Icon className="h-3 w-3" /> {label}
                      </div>
                      <p className={`font-display text-sm font-bold leading-tight ${tone}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card className="border-border bg-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base">Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {activities.map((a, i) => (
                    <li key={a.msg} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary mt-1" />
                        {i < activities.length - 1 && <div className="mt-1 flex-1 w-px bg-border" />}
                      </div>
                      <div className="pb-4 min-w-0">
                        <p className="text-xs text-muted-foreground">{a.when}</p>
                        <p className="text-sm font-medium">{a.msg}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/50 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium text-sm">{value}</p>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-border bg-card shadow-card">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{title}</p>
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <p className="font-display text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function daysBetween(a: Date, b: Date) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.ceil(
    (Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) -
      Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())) / ms,
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function getStatusTone(status: "active" | "expired" | "suspended") {
  if (status === "active")   return "border-success/40 bg-success/10 text-success";
  if (status === "expired")  return "border-destructive/40 bg-destructive/10 text-destructive";
  return "border-warning/40 bg-warning/10 text-warning";
}
