import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  CalendarCheck, UserX, Activity, Clock, Search, Download,
  TrendingUp, Users, Zap, CheckCircle2, XCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { PageHeader } from "@/components/topbar";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { attendanceToday, heatmap, members } from "@/lib/data";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance — FitSaathi" }] }),
  component: AttendancePage,
});

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const tooltipStyle = {
  backgroundColor: "oklch(0.17 0 0)",
  border: "1px solid oklch(1 0 0 / 10%)",
  borderRadius: 10,
  color: "white",
  fontSize: 12,
};

const peakHours = [
  { hour: "6 AM", count: 42 },
  { hour: "7 AM", count: 87 },
  { hour: "8 AM", count: 115 },
  { hour: "9 AM", count: 76 },
  { hour: "10 AM", count: 54 },
  { hour: "11 AM", count: 38 },
  { hour: "12 PM", count: 29 },
  { hour: "5 PM", count: 65 },
  { hour: "6 PM", count: 143 },
  { hour: "7 PM", count: 210 },
  { hour: "8 PM", count: 189 },
  { hour: "9 PM", count: 98 },
];

const weeklyTrend = [
  { day: "Mon", present: 198, absent: 780 },
  { day: "Tue", present: 214, absent: 764 },
  { day: "Wed", present: 207, absent: 771 },
  { day: "Thu", present: 221, absent: 757 },
  { day: "Fri", present: 189, absent: 789 },
  { day: "Sat", present: 156, absent: 822 },
  { day: "Sun", present: 98,  absent: 880 },
];

// ── GitHub-style heatmap data (52 weeks × 7 days) ──────────────────────────
const WEEKS = 52;

// Level 0–4 per cell
const ghData: number[][] = Array.from({ length: WEEKS }, (_, w) =>
  Array.from({ length: 7 }, (_, d) => {
    const v = Math.round(40 + 60 * Math.abs(Math.sin((w + 1) * (d + 1) / 4)));
    if (v < 25) return 0;
    if (v < 45) return 1;
    if (v < 65) return 2;
    if (v < 82) return 3;
    return 4;
  }),
);

const cellColors = [
  "oklch(0.2 0 0)",                                                        // 0 – empty
  "color-mix(in oklab, oklch(0.72 0.21 45) 22%, oklch(0.15 0 0))",        // 1
  "color-mix(in oklab, oklch(0.72 0.21 45) 44%, oklch(0.15 0 0))",        // 2
  "color-mix(in oklab, oklch(0.72 0.21 45) 68%, oklch(0.15 0 0))",        // 3
  "oklch(0.72 0.21 45)",                                                   // 4 – full
];

// Which week column each month label sits above
const monthLabels = [
  { label: "Jun", week: 0 },  { label: "Jul", week: 4 },
  { label: "Aug", week: 9 },  { label: "Sep", week: 13 },
  { label: "Oct", week: 18 }, { label: "Nov", week: 22 },
  { label: "Dec", week: 26 }, { label: "Jan", week: 31 },
  { label: "Feb", week: 35 }, { label: "Mar", week: 39 },
  { label: "Apr", week: 44 }, { label: "May", week: 48 },
];

const CELL = 13;   // px
const GAP  = 3;    // px
const UNIT = CELL + GAP;

// Map level → approximate check-in count range
const levelToCount = [0, 12, 28, 55, 90];
const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// Build a real date for each cell (week wi, day di) starting from Jun 2 2025
const START = new Date(Date.UTC(2025, 5, 2)); // Mon Jun 2 2025
function cellDate(wi: number, di: number) {
  const d = new Date(START);
  d.setUTCDate(d.getUTCDate() + wi * 7 + di);
  return d;
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

type TooltipInfo = {
  x: number; y: number;
  date: string; count: number;
} | null;

function AttendanceHeatmap() {
  const [tooltip, setTooltip] = useState<TooltipInfo>(null);
  const totalWidth = WEEKS * UNIT - GAP;

  return (
    <>
      {/* Portal-style fixed tooltip — never clipped by any container */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-[9999] -translate-x-1/2"
          style={{ left: tooltip.x, top: tooltip.y - 44 }}
        >
          <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-xl">
            <p className="whitespace-nowrap font-semibold text-xs text-foreground">
              {tooltip.count === 0 ? "No check-ins" : `${tooltip.count} check-ins`}
            </p>
            <p className="whitespace-nowrap text-[11px] text-muted-foreground mt-0.5">{tooltip.date}</p>
          </div>
          {/* Arrow */}
          <div
            className="mx-auto rotate-45 border-b border-r border-border bg-popover"
            style={{ width: 8, height: 8, marginLeft: "calc(50% - 4px)", marginTop: -5 }}
          />
        </div>
      )}

      <Card className="border-border bg-card shadow-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-display">Attendance Heatmap</CardTitle>
              <CardDescription>Jun 2025 – May 2026 · each cell = one day</CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
              <span>Less</span>
              {cellColors.map((bg, i) => (
                <div key={i} className="h-[13px] w-[13px] rounded-[3px]" style={{ background: bg }} />
              ))}
              <span>More</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto pb-4">
          <div style={{ minWidth: totalWidth + 28 }}>
            {/* Month labels */}
            <div className="relative mb-1 ml-7" style={{ height: 16 }}>
              {monthLabels.map(({ label, week }) => (
                <span
                  key={label}
                  className="absolute text-[11px] text-muted-foreground"
                  style={{ left: week * UNIT }}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Day labels + cell grid */}
            <div className="flex gap-[5px]">
              <div className="flex shrink-0 flex-col" style={{ gap: GAP, paddingTop: 1 }}>
                {["Mon","","Wed","","Fri","",""].map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center text-[10px] text-muted-foreground"
                    style={{ height: CELL }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="flex" style={{ gap: GAP }}>
                {ghData.map((weekCol, wi) => (
                  <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                    {weekCol.map((level, di) => {
                      const d = cellDate(wi, di);
                      const count = level === 0 ? 0 : levelToCount[level] + ((wi * 7 + di) % 8);
                      return (
                        <div
                          key={di}
                          className="rounded-[3px] cursor-pointer transition-all duration-100 hover:brightness-150 hover:scale-125"
                          style={{ width: CELL, height: CELL, background: cellColors[level] }}
                          onMouseEnter={(e) => {
                            const r = e.currentTarget.getBoundingClientRect();
                            setTooltip({
                              x: r.left + r.width / 2,
                              y: r.top,
                              date: fmtDate(d),
                              count,
                            });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Summary strip */}
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span><strong className="text-foreground">4,284</strong> total check-ins this year</span>
              </span>
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span><strong className="text-foreground">Thursday</strong> is the busiest day</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span>Avg <strong className="text-foreground">186</strong> members / day</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Enrich attendanceToday with status
const enriched = attendanceToday.map((r, i) => ({
  ...r,
  status: i % 4 === 2 ? "checked-out" : i % 7 === 6 ? "absent" : "present",
  plan: members[i % members.length]?.plan ?? "Monthly",
}));

function AttendancePage() {
  const [q, setQ] = useState("");

  const filtered = enriched.filter((r) =>
    q ? r.member.toLowerCase().includes(q.toLowerCase()) : true
  );

  const presentCount = enriched.filter((r) => r.status !== "absent").length;
  const absentCount  = enriched.filter((r) => r.status === "absent").length;
  const presentPct   = Math.round((presentCount / enriched.length) * 100);

  return (
    <div>
      <PageHeader
        badge="Attendance"
        title="Daily Check-ins"
        description="Monitor gym footfall, peak hours, and member attendance in real time."
        action={
          <Button variant="outline">
            <Download className="mr-1 h-4 w-4" /> Export Report
          </Button>
        }
      />

      <div className="space-y-6 p-6">

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Present Today"  value="210"    delta={15}  icon={CalendarCheck} accent="success" />
          <KpiCard label="Absent Today"   value="768"    delta={-4}  icon={UserX}         accent="warning" />
          <KpiCard label="Avg. Daily"     value="186"    delta={9}   icon={Activity}      accent="primary" />
          <KpiCard label="Peak Hour"      value="7–8 PM" delta={6}   icon={Clock}         accent="lime" />
        </div>

        {/* Live status + attendance rate */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border bg-card shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
                </span>
                Live in Gym
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end gap-2">
                <span className="font-display text-5xl font-bold text-primary">210</span>
                <span className="mb-1 text-sm text-muted-foreground">/ 978 active members</span>
              </div>
              <Progress value={Math.round((210 / 978) * 100)} className="h-2" />
              <p className="text-xs text-muted-foreground">{Math.round((210 / 978) * 100)}% of active members currently training</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-foreground" /> Attendance Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-4xl font-bold">{presentPct}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Today's check-in rate</p>
                </div>
                <div className="space-y-1 text-right text-sm">
                  <p className="flex items-center gap-1.5 justify-end">
                    <span className="h-2 w-2 rounded-full bg-foreground/80" />
                    <span className="font-medium">{presentCount}</span>
                    <span className="text-muted-foreground">Present</span>
                  </p>
                  <p className="flex items-center gap-1.5 justify-end">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                    <span className="font-medium">{absentCount}</span>
                    <span className="text-muted-foreground">Absent</span>
                  </p>
                </div>
              </div>
              <Progress value={presentPct} className="h-2" />
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> This Week
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Best Day",     value: "Thursday (221)" },
                { label: "Lowest Day",   value: "Sunday (98)"    },
                { label: "Weekly Total", value: "1,283 visits"   },
                { label: "Avg / Day",    value: "183 members"    },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-1.5">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs font-semibold">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Peak Hours Bar */}
          <Card className="border-border bg-card shadow-card">
            <CardHeader>
              <CardTitle className="font-display">Peak Hours Today</CardTitle>
              <CardDescription>Check-ins per hour · 7–8 PM is busiest</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={peakHours} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" vertical={false} />
                  <XAxis dataKey="hour" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "oklch(1 0 0 / 5%)" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}
                    fill="oklch(0.72 0.21 45)"
                    label={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Weekly Trend */}
          <Card className="border-border bg-card shadow-card">
            <CardHeader>
              <CardTitle className="font-display">Weekly Attendance Trend</CardTitle>
              <CardDescription>Present vs Absent this week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyTrend} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" vertical={false} />
                  <XAxis dataKey="day" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "oklch(1 0 0 / 5%)" }} />
                  <Bar dataKey="present" radius={[4, 4, 0, 0]} fill="oklch(0.72 0.21 45)" name="Present" />
                  <Bar dataKey="absent"  radius={[4, 4, 0, 0]} fill="oklch(0.3 0 0)"     name="Absent" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary" />Present</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/30" />Absent</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Heatmap */}
        <AttendanceHeatmap />

        {/* Today's Check-ins Table */}
        <Card className="border-border bg-card shadow-card overflow-hidden">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="font-display">Today's Check-ins</CardTitle>
                <CardDescription>Real-time member entry and exit log</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search member…"
                    className="h-9 w-48 border-border bg-background pl-9 text-sm"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-1 h-4 w-4" /> Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-background/60">
                  {["Member", "Plan", "Check-In", "Check-Out", "Duration", "Status"].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${i === 5 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r, i) => {
                  const statusCfg =
                    r.status === "present"     ? { cls: "border-success/30 bg-success/10 text-success",       dot: "bg-success",     label: "In Gym"      } :
                    r.status === "checked-out" ? { cls: "border-muted-foreground/30 bg-muted/30 text-muted-foreground", dot: "bg-muted-foreground", label: "Checked Out" } :
                                                 { cls: "border-destructive/30 bg-destructive/10 text-destructive", dot: "bg-destructive", label: "Absent"      };
                  return (
                    <tr key={i} className="group transition-colors hover:bg-accent/20">
                      <td className="px-4 py-3">
                        <Link to="/members/$id" params={{ id: `FS-${1000 + i}` }} className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 shrink-0 ring-2 ring-border">
                            <AvatarImage src={r.photo} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">{r.member[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold truncate group-hover:text-primary transition-colors">{r.member}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${r.plan === "Yearly" ? "border-lime/40 bg-lime/10 text-lime" : "border-primary/40 bg-primary/10 text-primary"}`}>
                          {r.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.status === "absent"
                          ? <span className="text-muted-foreground">—</span>
                          : <span className="inline-flex items-center rounded-md border border-border bg-background/60 px-2 py-0.5 font-mono text-xs font-medium">{r.checkIn}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.status === "absent"
                          ? <span className="text-muted-foreground">—</span>
                          : <span className="inline-flex items-center rounded-md border border-border bg-muted/30 px-2 py-0.5 font-mono text-xs">{r.checkOut}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.status === "absent"
                          ? <span className="text-muted-foreground">—</span>
                          : <span className="font-semibold tabular-nums">{r.duration}</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusCfg.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No records match your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </div>
  );
}
