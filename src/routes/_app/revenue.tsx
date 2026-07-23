import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
  ReferenceLine,
} from "recharts";
import {
  Wallet, TrendingUp, RefreshCcw, ArrowUpRight, ArrowDownRight,
  Users, IndianRupee, CreditCard, Target, Download,
} from "lucide-react";
import { PageHeader } from "@/components/topbar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { revenueData, membershipGrowth, revenueByPlan, payments } from "@/lib/data";
import {
  chartTooltipStyle as TT,
  chartGrid,
  chartCursor,
  chartAxis,
  chartColors,
  pieColors as PIE_COLORS,
} from "@/lib/chart-theme";

export const Route = createFileRoute("/_app/revenue")({
  head: () => ({ meta: [{ title: "Revenue Analytics — GymmerzHub" }] }),
  component: RevenuePage,
});

// ── Derived / enriched data ────────────────────────────────────────────────

const enriched = revenueData.map((d, i) => ({
  ...d,
  monthly: d.revenue - (i > 0 ? revenueData[i - 1].revenue : d.revenue - 10),
  yearly: Math.round(d.revenue * 0.62),
  target: d.revenue + 20 + i * 2,
  expenses: Math.round(d.revenue * 0.38 + 30),
  profit: Math.round(d.revenue * 0.62 - 30),
}));

const combined = enriched.map((d, i) => ({
  m: d.m,
  revenue: d.revenue,
  members: membershipGrowth[i]?.members ?? 0,
  target: d.target,
}));

const totalRev    = revenueData.reduce((s, d) => s + d.revenue, 0) * 1000;
const prevRev     = Math.round(totalRev * 0.82);
const growthPct   = Math.round(((totalRev - prevRev) / prevRev) * 100);
const avgPerMonth = Math.round(totalRev / 12);
const outstanding = 38200;
const totalMembers = 1250;

// Expense / profit breakdown per month
const profitData = enriched.map((d) => ({
  m: d.m,
  Revenue: d.revenue,
  Expenses: d.expenses,
  Profit: d.profit,
}));

// ── Custom tooltip ─────────────────────────────────────────────────────────

function RevTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-xl text-xs space-y-1">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">₹{(p.value * 1000).toLocaleString("en-IN")}</span>
        </div>
      ))}
    </div>
  );
}

function GrowthTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-xl text-xs space-y-1">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">{p.name === "Revenue" ? `₹${(p.value * 1000).toLocaleString("en-IN")}` : p.value.toLocaleString("en-IN")}</span>
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

type Period = "3m" | "6m" | "12m";

function RevenuePage() {
  const [period, setPeriod] = useState<Period>("12m");
  const sliceMap: Record<Period, number> = { "3m": 3, "6m": 6, "12m": 12 };
  const slice = sliceMap[period];

  const slicedEnriched = enriched.slice(-slice);
  const slicedCombined = combined.slice(-slice);
  const slicedProfit   = profitData.slice(-slice);

  const sliceRevTotal = slicedEnriched.reduce((s, d) => s + d.revenue, 0) * 1000;
  const maxRev = Math.max(...enriched.map((d) => d.revenue));

  return (
    <div>
      <PageHeader
        badge="Analytics"
        title="Revenue Analytics"
        description="Earnings breakdown, growth trends, plan performance and profit insights."
        action={
          <Button variant="outline"><Download className="mr-1 h-4 w-4" /> Export Report</Button>
        }
      />

      <div className="space-y-6 p-6">

        {/* ── KPI strip ───────────────────────────────────────────────── */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Annual Revenue"       value={`₹${(totalRev / 100000).toFixed(1)}L`}        delta={growthPct}  icon={Wallet}        accent="primary" />
          <KpiCard label="Avg. Monthly Revenue" value={`₹${Math.round(avgPerMonth / 1000)}K`}         delta={8}          icon={TrendingUp}    accent="lime"    />
          <KpiCard label="Revenue / Member"     value={`₹${Math.round(totalRev / totalMembers).toLocaleString("en-IN")}`} delta={5} icon={Users} accent="success" />
          <KpiCard label="Outstanding"          value={`₹${Math.round(outstanding / 1000)}K`}         delta={-6}         icon={CreditCard}    accent="warning" />
        </section>

        {/* ── Summary stat row ────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Retention Rate",     value: "86%",   trend: +3,  color: "text-success" },
            { label: "Renewal Rate",       value: "76%",   trend: +4,  color: "text-lime"    },
            { label: "Avg Plan Value",     value: "₹4,250", trend: +6, color: "text-primary" },
            { label: "Discount Redemptions", value: "142", trend: +9,  color: "text-warning" },
          ].map(({ label, value, trend, color }) => (
            <div key={label} className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 shadow-card">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`font-display text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
              </div>
              <div className={`flex items-center gap-0.5 text-xs font-semibold ${trend > 0 ? "text-success" : "text-destructive"}`}>
                {trend > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {Math.abs(trend)}%
              </div>
            </div>
          ))}
        </div>

        {/* ── Period toggle ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Revenue Trends</h2>
          <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
            {(["3m", "6m", "12m"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${period === p ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}
              >
                {p === "3m" ? "3 Months" : p === "6m" ? "6 Months" : "Full Year"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Charts row 1: Earnings area + Revenue vs Target ─────────── */}
        <div className="grid gap-5 xl:grid-cols-3">
          {/* Monthly Earnings – Area */}
          <Card className="border-border bg-card shadow-card xl:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="font-display">Monthly Earnings</CardTitle>
                  <CardDescription>₹ thousands · {period === "12m" ? "Full year 2025" : `Last ${slice} months`}</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Period Total</p>
                  <p className="font-display text-xl font-bold text-primary">₹{(sliceRevTotal / 100000).toFixed(1)}L</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={slicedEnriched}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={chartColors.primary} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="m" stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<RevTooltip />} />
                  <ReferenceLine y={maxRev} stroke={chartGrid} strokeDasharray="4 3" label={{ value: "Peak", fill: "#888", fontSize: 10 }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke={chartColors.primary} strokeWidth={2.5} fill="url(#revGrad)" dot={{ r: 3, fill: chartColors.primary }} activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="target"  name="Target"  stroke={chartColors.muted}  strokeWidth={1.5} fill="none" strokeDasharray="5 3" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-primary" /> Revenue</span>
                <span className="flex items-center gap-1.5"><span className="h-px w-4 bg-foreground/30" /> Target</span>
              </div>
            </CardContent>
          </Card>

          {/* Revenue vs Expenses donut */}
          <Card className="border-border bg-card shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-display">Plan Mix</CardTitle>
              <CardDescription>Revenue share by plan</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={revenueByPlan} dataKey="revenue" nameKey="name" cx="50%" cy="50%"
                    innerRadius={52} outerRadius={82} paddingAngle={3}>
                    {revenueByPlan.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TT} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-2">
                {revenueByPlan.map((p, i) => {
                  const total = revenueByPlan.reduce((s, x) => s + x.revenue, 0);
                  const pct = Math.round((p.revenue / total) * 100);
                  return (
                    <div key={p.name} className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="flex-1 text-xs text-muted-foreground truncate">{p.name}</span>
                      <span className="text-xs font-semibold tabular-nums">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Charts row 2: Profit breakdown + Growth ──────────────────── */}
        <div className="grid gap-5 xl:grid-cols-2">
          {/* Revenue vs Expenses vs Profit stacked */}
          <Card className="border-border bg-card shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-display">Revenue vs Expenses</CardTitle>
              <CardDescription>₹ thousands · profit highlighted</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={slicedProfit} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="m" stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TT} cursor={{ fill: chartCursor }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                  <Bar dataKey="Revenue"  fill={chartColors.primary} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill={chartColors.muted}   radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Profit"   fill={chartColors.secondary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Member growth vs Revenue dual line */}
          <Card className="border-border bg-card shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-display">Members vs Revenue</CardTitle>
              <CardDescription>Correlation between growth and earnings</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={slicedCombined}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="m" stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left"  stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<GrowthTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                  <Line yAxisId="left"  type="monotone" dataKey="revenue" name="Revenue" stroke={chartColors.primary} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line yAxisId="right" type="monotone" dataKey="members" name="Members" stroke={chartColors.secondary} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* ── Plan performance table + Recent payments ─────────────────── */}
        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          {/* Plan performance */}
          <Card className="overflow-hidden border-border bg-card shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-display">Plan Performance</CardTitle>
              <CardDescription>Revenue contribution and sales per plan</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/60">
                    {["Plan", "Revenue", "Share", "Units Sold", "Avg Value", "Trend"].map((h, i) => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${i >= 1 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {revenueByPlan.map((p, i) => {
                    const totalPlanRev = revenueByPlan.reduce((s, x) => s + x.revenue, 0);
                    const pct = Math.round((p.revenue / totalPlanRev) * 100);
                    const sold = Math.round(p.revenue / ((i + 1) * 0.8 + 0.5));
                    const avg  = Math.round((p.revenue * 1000) / Math.max(sold, 1));
                    const trends = [+12, +8, -2, +5, +15, +3];
                    const trend = trends[i] ?? 0;
                    return (
                      <tr key={p.name} className="transition-colors hover:bg-accent/20">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="font-semibold">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-display font-bold tabular-nums">₹{(p.revenue * 1000).toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            </div>
                            <span className="tabular-nums text-muted-foreground text-xs w-8 text-right">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{sold}</td>
                        <td className="px-4 py-3 text-right tabular-nums">₹{avg.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${trend > 0 ? "text-success" : "text-destructive"}`}>
                            {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {Math.abs(trend)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Recent payments */}
          <Card className="overflow-hidden border-border bg-card shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="font-display">Recent Payments</CardTitle>
                  <CardDescription>Last 8 transactions</CardDescription>
                </div>
                <Badge variant="outline" className="border-success/30 bg-success/10 text-success text-xs">Live</Badge>
              </div>
            </CardHeader>
            <div className="divide-y divide-border">
              {payments.slice(0, 8).map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/20">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-border">
                    <img src={p.photo} alt={p.member} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{p.member}</p>
                    <p className="text-xs text-muted-foreground">{p.method} · {p.date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold tabular-nums">₹{p.amount.toLocaleString("en-IN")}</p>
                    <span className={`text-[10px] font-semibold ${p.status === "paid" ? "text-success" : "text-warning"}`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Forecast strip ───────────────────────────────────────────── */}
        <Card className="border-border bg-card shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="font-display">Revenue Forecast</CardTitle>
                <CardDescription>Projected next 3 months based on current growth trajectory</CardDescription>
              </div>
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { month: "Jan 2026", projected: 470, confidence: 92, vs: +4.4 },
                { month: "Feb 2026", projected: 490, confidence: 85, vs: +4.3 },
                { month: "Mar 2026", projected: 512, confidence: 78, vs: +4.5 },
              ].map(({ month, projected, confidence, vs }) => (
                <div key={month} className="rounded-xl border border-border bg-background/40 p-4">
                  <p className="text-xs text-muted-foreground">{month}</p>
                  <p className="font-display text-2xl font-bold text-primary mt-0.5">
                    ₹{(projected * 1000).toLocaleString("en-IN")}
                  </p>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="font-semibold">{confidence}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-border">
                      <div className="h-full rounded-full bg-primary/60" style={{ width: `${confidence}%` }} />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-success font-semibold">
                      <ArrowUpRight className="h-3 w-3" /> +{vs}% vs prior month
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
