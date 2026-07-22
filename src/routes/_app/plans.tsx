import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Check, Sparkles, Plus, Tag, TrendingUp,
  Wallet, BadgeCheck, AlertTriangle, RefreshCw, Bell, Pencil, Trash2,
  IndianRupee, Receipt, History,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { toast } from "sonner";

import { PageHeader } from "@/components/topbar";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import {
  membershipPlans, discounts, expiringMemberships, members,
  revenueByPlan, discountUsage, renewalConversion, membershipHistorySample,
  type MembershipPlan, type Discount, type DurationUnit,
} from "@/lib/data";
import {
  chartTooltipStyle as tooltipStyle,
  chartGrid,
  chartCursor,
  chartAxis,
  chartColors,
  pieColors as PIE_COLORS,
} from "@/lib/chart-theme";

export const Route = createFileRoute("/_app/plans")({
  head: () => ({ meta: [{ title: "Membership Management — FitSaathi" }] }),
  component: PlansPage,
});

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function durationLabel(v: number, u: DurationUnit) {
  const unit = v === 1 ? u.slice(0, -1) : u;
  return `${v} ${unit}`;
}

function computePricing(basePrice: number, regFee: number, gst: number, discount: { type: "percentage" | "fixed"; value: number } | null) {
  const sub = basePrice + regFee;
  const discountAmt = !discount ? 0 : discount.type === "percentage"
    ? Math.round((sub * discount.value) / 100)
    : Math.min(discount.value, sub);
  const taxable = sub - discountAmt;
  const gstAmt = Math.round((taxable * gst) / 100);
  const final = taxable + gstAmt;
  return { sub, discountAmt, gstAmt, final };
}

function PlansPage() {
  const [planList, setPlanList] = useState<MembershipPlan[]>(membershipPlans);
  const [discList, setDiscList] = useState<Discount[]>(discounts);

  const totals = useMemo(() => {
    const active = planList.filter((p) => p.status === "active").length;
    const totalRevenue = planList.reduce((a, p) => a + p.basePrice * p.sold, 0);
    const expiringWeek = expiringMemberships.filter((e) => e.daysRemaining <= 7).length;
    const expiringToday = expiringMemberships.filter((e) => e.daysRemaining === 0).length;
    return { active, totalRevenue, expiringWeek, expiringToday };
  }, [planList]);

  return (
    <div>
      <PageHeader
        badge="Membership Suite"
        title="Membership Management"
        description="Create flexible plans, run discounts, track renewals, and monitor subscription revenue."
        action={<CreatePlanDialog onCreate={(p) => setPlanList((s) => [...s, p])} />}
      />

      <div className="space-y-6 p-6">
        {/* KPI ROW */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total Plans" value={planList.length.toString()} delta={6} icon={BadgeCheck} accent="primary" />
          <KpiCard label="Active Memberships" value="978" delta={8} icon={Sparkles} accent="lime" />
          <KpiCard label="Expiring this week" value={totals.expiringWeek.toString()} delta={-3} icon={AlertTriangle} accent="warning" />
          <KpiCard label="Membership Revenue" value={`₹${(totals.totalRevenue / 100000).toFixed(1)}L`} delta={14} icon={Wallet} accent="success" />
        </section>

        <Tabs defaultValue="plans" className="space-y-5">
          <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="discounts">Discounts</TabsTrigger>
            <TabsTrigger value="assign">Assign</TabsTrigger>
            <TabsTrigger value="renewals">Renewals</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* PLANS TAB */}
          <TabsContent value="plans" className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {planList.sort((a, b) => a.displayOrder - b.displayOrder).map((p) => (
                <PlanCard key={p.id} plan={p}
                  onToggle={(id) => setPlanList((s) => s.map((x) => x.id === id ? { ...x, status: x.status === "active" ? "inactive" : "active" } : x))}
                  onDelete={(id) => { setPlanList((s) => s.filter((x) => x.id !== id)); toast.success("Plan removed"); }}
                />
              ))}
              <CreatePlanCard onCreate={(p) => setPlanList((s) => [...s, p])} />
            </div>
          </TabsContent>

          {/* DISCOUNTS TAB */}
          <TabsContent value="discounts" className="space-y-5">
            <DiscountsSection
              discounts={discList}
              plans={planList}
              onCreate={(d) => setDiscList((s) => [d, ...s])}
              onToggle={(id) => setDiscList((s) => s.map((x) => x.id === id ? { ...x, active: !x.active } : x))}
              onDelete={(id) => { setDiscList((s) => s.filter((x) => x.id !== id)); toast.success("Discount removed"); }}
            />
          </TabsContent>

          {/* ASSIGN TAB */}
          <TabsContent value="assign">
            <AssignMembershipSection plans={planList} discounts={discList} />
          </TabsContent>

          {/* RENEWALS TAB */}
          <TabsContent value="renewals" className="space-y-5">
            <RenewalsSection plans={planList} discounts={discList} />
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history">
            <HistorySection />
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="space-y-5">
            <AnalyticsSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ============= PLAN CARD ============= */
function PlanCard({ plan, onToggle, onDelete }: {
  plan: MembershipPlan;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const pricing = computePricing(plan.basePrice, plan.registrationFee, plan.gstPercent, null);
  return (
    <Card className={cn(
      "relative overflow-hidden border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1",
      plan.highlight && "border-primary/50 shadow-glow",
      plan.status === "inactive" && "opacity-60"
    )}>
      {plan.highlight && (
        <>
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-primary opacity-30 blur-3xl" />
          <Badge className="absolute right-5 top-5 bg-gradient-primary text-primary-foreground">
            <Sparkles className="mr-1 h-3 w-3" /> {plan.badge ?? "Most popular"}
          </Badge>
        </>
      )}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          {plan.name}
          {plan.status === "inactive" && <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground">Inactive</Badge>}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-display text-4xl font-bold">{inr(plan.basePrice)}</span>
          <span className="text-sm text-muted-foreground">/ {durationLabel(plan.durationValue, plan.durationUnit)}</span>
        </div>
        <p className="text-sm text-muted-foreground">{plan.tagline}</p>
      </div>

      <div className="my-5 space-y-1.5 rounded-lg border border-border bg-background/40 p-3 text-xs">
        <Row label="Base price" value={inr(plan.basePrice)} />
        {plan.registrationFee > 0 && <Row label="Registration fee" value={inr(plan.registrationFee)} />}
        <Row label={`GST (${plan.gstPercent}%)`} value={inr(pricing.gstAmt)} />
        <div className="my-1 h-px bg-border" />
        <Row label="Final price" value={inr(pricing.final)} highlight />
      </div>

      <ul className="space-y-2.5 text-sm">
        {plan.benefits.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
              plan.highlight ? "bg-gradient-primary text-primary-foreground" : "bg-lime/20 text-lime")}>
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            {f}
          </li>
        ))}
      </ul>

      <Separator className="my-5" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={plan.status === "active"} onCheckedChange={() => onToggle(plan.id)} />
          <span>{plan.status === "active" ? "Active" : "Inactive"}</span>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(plan.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between", highlight && "text-sm font-semibold")}>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(highlight && "text-gradient-primary font-display text-base")}>{value}</span>
    </div>
  );
}

function CreatePlanCard({ onCreate }: { onCreate: (p: MembershipPlan) => void }) {
  return (
    <CreatePlanDialog onCreate={onCreate}>
      <button className="group flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card/40 p-6 transition-all hover:border-primary/60 hover:bg-card">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-primary opacity-80 shadow-glow transition-transform group-hover:scale-110">
          <Plus className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="text-center">
          <div className="font-display text-lg font-semibold">Create new plan</div>
          <p className="mt-1 text-sm text-muted-foreground">Build any duration, price or perk combo</p>
        </div>
      </button>
    </CreatePlanDialog>
  );
}

/* ============= CREATE PLAN DIALOG ============= */
function CreatePlanDialog({ onCreate, children }: { onCreate: (p: MembershipPlan) => void; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [durationValue, setDurationValue] = useState(1);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("months");
  const [basePrice, setBasePrice] = useState(2000);
  const [regFee, setRegFee] = useState(0);
  const [gst, setGst] = useState(18);
  const [tagline, setTagline] = useState("");
  const [benefits, setBenefits] = useState("Full gym access\nLocker room\nGroup classes");
  const [status, setStatus] = useState(true);
  const [order, setOrder] = useState(10);

  const pricing = computePricing(basePrice, regFee, gst, null);

  function submit() {
    if (!name.trim()) { toast.error("Plan name is required"); return; }
    const newPlan: MembershipPlan = {
      id: `pl-${Date.now()}`,
      name, durationValue, durationUnit, basePrice,
      registrationFee: regFee, gstPercent: gst,
      tagline: tagline || "Custom plan",
      benefits: benefits.split("\n").map((b) => b.trim()).filter(Boolean),
      status: status ? "active" : "inactive",
      displayOrder: order, sold: 0,
    };
    onCreate(newPlan);
    toast.success(`Plan "${name}" created`);
    setOpen(false);
    setName(""); setTagline("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
            <Plus className="mr-1 h-4 w-4" /> Create new plan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Create Membership Plan</DialogTitle>
          <DialogDescription>Configure duration, pricing, and perks. Live preview updates as you type.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plan name</Label>
              <Input placeholder="e.g. Festival Offer Plan" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Duration value</Label>
                <Input type="number" min={1} value={durationValue} onChange={(e) => setDurationValue(+e.target.value || 1)} />
              </div>
              <div className="space-y-2">
                <Label>Duration unit</Label>
                <Select value={durationUnit} onValueChange={(v) => setDurationUnit(v as DurationUnit)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="years">Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Base price (₹)</Label>
                <Input type="number" min={0} value={basePrice} onChange={(e) => setBasePrice(+e.target.value || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Registration fee</Label>
                <Input type="number" min={0} value={regFee} onChange={(e) => setRegFee(+e.target.value || 0)} />
              </div>
              <div className="space-y-2">
                <Label>GST %</Label>
                <Input type="number" min={0} max={100} value={gst} onChange={(e) => setGst(+e.target.value || 0)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input placeholder="Short sales pitch" value={tagline} onChange={(e) => setTagline(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Plan benefits <span className="text-xs text-muted-foreground">(one per line)</span></Label>
              <Textarea rows={5} value={benefits} onChange={(e) => setBenefits(e.target.value)} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm">Plan status</Label>
                <p className="text-xs text-muted-foreground">Inactive plans are hidden from new sign-ups</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={status} onCheckedChange={setStatus} />
                <span className="text-sm">{status ? "Active" : "Inactive"}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Display order</Label>
              <Input type="number" value={order} onChange={(e) => setOrder(+e.target.value || 0)} />
            </div>
          </div>

          {/* LIVE PREVIEW */}
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Pricing preview</div>
            <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-5 shadow-glow">
              <div className="font-display text-base font-semibold">{name || "New plan"}</div>
              <div className="text-xs text-muted-foreground">{durationLabel(durationValue, durationUnit)}</div>
              <div className="my-4 space-y-2 text-sm">
                <Row label="Plan price" value={inr(basePrice)} />
                {regFee > 0 && <Row label="Registration" value={inr(regFee)} />}
                <Row label={`GST (${gst}%)`} value={inr(pricing.gstAmt)} />
                <div className="h-px bg-border" />
                <Row label="Final price" value={inr(pricing.final)} highlight />
              </div>
              <p className="text-[11px] text-muted-foreground">Final price recalculates instantly with discounts at checkout.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} className="bg-gradient-primary text-primary-foreground shadow-glow">
            Create plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============= DISCOUNTS SECTION ============= */
function DiscountsSection({ discounts, plans, onCreate, onToggle, onDelete }: {
  discounts: Discount[]; plans: MembershipPlan[];
  onCreate: (d: Discount) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Active discounts & offers</h3>
          <p className="text-sm text-muted-foreground">Time-bound offers automatically apply on eligible plans.</p>
        </div>
        <CreateDiscountDialog plans={plans} onCreate={onCreate} />
      </div>

      <Card className="overflow-hidden border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-background/60">
                {["Offer", "Code", "Discount", "Validity", "Plans", "Used", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground last:w-10">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {discounts.map((d) => (
                <tr key={d.id} className="group transition-colors hover:bg-accent/20">
                  <td className="px-4 py-3 font-semibold">{d.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded border border-border bg-background/60 px-2 py-0.5 font-mono text-xs">{d.code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-display font-bold text-primary tabular-nums">
                      {d.type === "percentage" ? `${d.value}%` : `₹${d.value}`}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">off</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                    {d.startDate} → {d.endDate}
                  </td>
                  <td className="px-4 py-3">
                    {d.applicablePlanIds.length === 0
                      ? <span className="inline-flex items-center gap-1 rounded-full border border-lime/40 bg-lime/10 px-2.5 py-0.5 text-xs font-semibold text-lime">All plans</span>
                      : <span className="text-sm text-muted-foreground">{d.applicablePlanIds.length} plan{d.applicablePlanIds.length > 1 ? "s" : ""}</span>}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-sm">{d.used}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={d.active} onCheckedChange={() => onToggle(d.id)} />
                      <span className={`text-xs font-medium ${d.active ? "text-success" : "text-muted-foreground"}`}>
                        {d.active ? "Active" : "Off"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => onDelete(d.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {discounts.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">No discounts yet. Create one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function CreateDiscountDialog({ plans, onCreate }: { plans: MembershipPlan[]; onCreate: (d: Discount) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState(10);
  const [start, setStart] = useState("2025-12-01");
  const [end, setEnd] = useState("2026-01-31");
  const [selected, setSelected] = useState<string[]>([]);
  const [active, setActive] = useState(true);

  function submit() {
    if (!name.trim() || !code.trim()) { toast.error("Name and code are required"); return; }
    onCreate({
      id: `ds-${Date.now()}`, name, code: code.toUpperCase(),
      type, value, startDate: start, endDate: end,
      applicablePlanIds: selected, active, used: 0,
    });
    toast.success(`Discount "${name}" created`);
    setOpen(false);
    setName(""); setCode("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
          <Tag className="mr-1 h-4 w-4" /> New discount
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Create discount</DialogTitle>
          <DialogDescription>Build seasonal offers, member-segment discounts, or referral codes.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Discount name</Label>
              <Input placeholder="e.g. Summer Offer" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input placeholder="SUMMER15" value={code} onChange={(e) => setCode(e.target.value)} className="font-mono uppercase" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "percentage" | "fixed")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value {type === "percentage" ? "(%)" : "(₹)"}</Label>
              <Input type="number" min={0} value={value} onChange={(e) => setValue(+e.target.value || 0)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Applicable plans <span className="text-xs text-muted-foreground">(leave empty for all)</span></Label>
            <div className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-border p-3">
              {plans.map((p) => {
                const checked = selected.includes(p.id);
                return (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded p-2 text-sm hover:bg-accent">
                    <Checkbox checked={checked} onCheckedChange={(c) => {
                      setSelected((s) => c ? [...s, p.id] : s.filter((x) => x !== p.id));
                    }} />
                    <span className="truncate">{p.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label className="text-sm">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive discounts cannot be applied at checkout.</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} className="bg-gradient-primary text-primary-foreground shadow-glow">Create discount</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============= ASSIGN MEMBERSHIP SECTION ============= */
function AssignMembershipSection({ plans, discounts }: { plans: MembershipPlan[]; discounts: Discount[] }) {
  const [memberId, setMemberId] = useState(members[0].id);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [discountId, setDiscountId] = useState<string>("none");
  const [useCustom, setUseCustom] = useState(false);
  const [customPrice, setCustomPrice] = useState(0);
  const [customReason, setCustomReason] = useState("");
  const [startDate, setStartDate] = useState("2025-12-01");
  const [method, setMethod] = useState("UPI");
  const [notes, setNotes] = useState("");

  const plan = plans.find((p) => p.id === planId) ?? plans[0];
  const discount = discountId === "none" ? null : discounts.find((d) => d.id === discountId) ?? null;
  const pricing = computePricing(plan?.basePrice ?? 0, plan?.registrationFee ?? 0, plan?.gstPercent ?? 0,
    discount ? { type: discount.type, value: discount.value } : null);
  const finalAmount = useCustom ? customPrice : pricing.final;

  const endDate = useMemo(() => {
    if (!plan) return startDate;
    const [y, m, d] = startDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (plan.durationUnit === "days") dt.setUTCDate(dt.getUTCDate() + plan.durationValue);
    if (plan.durationUnit === "weeks") dt.setUTCDate(dt.getUTCDate() + plan.durationValue * 7);
    if (plan.durationUnit === "months") dt.setUTCMonth(dt.getUTCMonth() + plan.durationValue);
    if (plan.durationUnit === "years") dt.setUTCFullYear(dt.getUTCFullYear() + plan.durationValue);
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  }, [startDate, plan]);

  const member = members.find((m) => m.id === memberId)!;

  function submit() {
    toast.success(`Membership assigned to ${member.name}`, {
      description: `${plan.name} · ${inr(finalAmount)} · Expires ${endDate}`,
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
      <Card className="border-border bg-card p-6 shadow-card">
        <h3 className="font-display text-lg font-semibold">Assign membership</h3>
        <p className="text-sm text-muted-foreground">Select a member, choose a plan, apply discounts or negotiate a custom price.</p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Member</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name} · {m.phone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {plans.filter((p) => p.status === "active").map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {inr(p.basePrice)} / {durationLabel(p.durationValue, p.durationUnit)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Discount</Label>
            <Select value={discountId} onValueChange={setDiscountId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No discount</SelectItem>
                {discounts.filter((d) => d.active).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.type === "percentage" ? `${d.value}%` : `₹${d.value}`})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Payment method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Online Gateway">Online Gateway</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Start date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>End date <span className="text-xs text-muted-foreground">(auto)</span></Label>
            <Input value={endDate} readOnly className="bg-muted/30" />
          </div>
        </div>

        <Separator className="my-5" />
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label className="text-sm">Custom price (negotiated)</Label>
              <p className="text-xs text-muted-foreground">Override final price — useful for walk-in deals or corporate quotes.</p>
            </div>
            <Switch checked={useCustom} onCheckedChange={(v) => { setUseCustom(v); if (v && !customPrice) setCustomPrice(pricing.final); }} />
          </div>
          {useCustom && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Custom price (₹)</Label>
                <Input type="number" value={customPrice} onChange={(e) => setCustomPrice(+e.target.value || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input placeholder="e.g. Corporate referral" value={customReason} onChange={(e) => setCustomReason(e.target.value)} />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea rows={2} placeholder="Internal notes about this assignment" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </Card>

      {/* PREVIEW PANEL */}
      <Card className="h-fit border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-6 shadow-glow">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={member.photo} />
            <AvatarFallback>{member.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold">{member.name}</div>
            <div className="text-xs text-muted-foreground">{member.phone}</div>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="space-y-2 text-sm">
          <Row label="Plan" value={plan?.name ?? "—"} />
          <Row label="Duration" value={plan ? durationLabel(plan.durationValue, plan.durationUnit) : "—"} />
          <Row label="Base price" value={inr(plan?.basePrice ?? 0)} />
          {(plan?.registrationFee ?? 0) > 0 && <Row label="Registration" value={inr(plan!.registrationFee)} />}
          {discount && <Row label={`Discount (${discount.type === "percentage" ? `${discount.value}%` : `₹${discount.value}`})`} value={`− ${inr(pricing.discountAmt)}`} />}
          <Row label={`GST (${plan?.gstPercent ?? 0}%)`} value={inr(pricing.gstAmt)} />
          <div className="h-px bg-border" />
          {useCustom ? (
            <>
              <Row label="Calculated total" value={inr(pricing.final)} />
              <Row label="Custom price" value={inr(customPrice)} highlight />
              {customReason && <p className="text-xs italic text-muted-foreground">"{customReason}"</p>}
            </>
          ) : (
            <Row label="Final price" value={inr(pricing.final)} highlight />
          )}
        </div>
        <Separator className="my-4" />
        <div className="text-xs text-muted-foreground">
          Valid from <span className="text-foreground">{startDate}</span> to <span className="text-foreground">{endDate}</span>
        </div>
        <Button onClick={submit} className="mt-4 w-full bg-gradient-primary text-primary-foreground shadow-glow">
          <Receipt className="mr-1 h-4 w-4" /> Confirm & record payment
        </Button>
      </Card>
    </div>
  );
}

/* ============= RENEWALS SECTION ============= */
function RenewalsSection({ plans, discounts }: { plans: MembershipPlan[]; discounts: Discount[] }) {
  const [filter, setFilter] = useState<"today" | "3" | "7" | "30">("7");
  const [renewTarget, setRenewTarget] = useState<typeof expiringMemberships[number] | null>(null);

  const filtered = expiringMemberships.filter((e) => {
    if (filter === "today") return e.daysRemaining === 0;
    if (filter === "3") return e.daysRemaining <= 3;
    if (filter === "7") return e.daysRemaining <= 7;
    return e.daysRemaining <= 30;
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Expiring memberships</h3>
          <p className="text-sm text-muted-foreground">Reach out before churn — one-click renew or send reminder.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { v: "today", l: "Today" },
            { v: "3", l: "Next 3 days" },
            { v: "7", l: "Next 7 days" },
            { v: "30", l: "Next 30 days" },
          ].map((f) => (
            <Button key={f.v} size="sm" variant={filter === f.v ? "default" : "outline"}
              className={cn(filter === f.v && "bg-gradient-primary text-primary-foreground shadow-glow")}
              onClick={() => setFilter(f.v as typeof filter)}>{f.l}</Button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-background/60">
                {["Member", "Phone", "Plan", "Expiry Date", "Days Left", "Actions"].map((h, i) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${i === 5 ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No expiring memberships in this window.</td></tr>
              )}
              {filtered.map((e) => {
                const urgency =
                  e.daysRemaining === 0 ? "border-destructive/40 bg-destructive/10 text-destructive" :
                  e.daysRemaining <= 3  ? "border-warning/40 bg-warning/10 text-warning" :
                  e.daysRemaining <= 7  ? "border-primary/40 bg-primary/10 text-primary" :
                                          "border-muted-foreground/30 text-muted-foreground";
                const urgencyDot =
                  e.daysRemaining === 0 ? "bg-destructive" :
                  e.daysRemaining <= 3  ? "bg-warning" :
                  e.daysRemaining <= 7  ? "bg-primary" : "bg-muted-foreground";
                return (
                  <tr key={e.memberId + e.expiryDate} className="group transition-colors hover:bg-accent/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0 ring-2 ring-border">
                          <AvatarImage src={e.photo} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">{e.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold">{e.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{e.phone}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{e.planName}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{e.expiryDate}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${urgency}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${urgencyDot}`} />
                        {e.daysRemaining === 0 ? "Today" : `${e.daysRemaining}d left`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => toast.success(`Reminder sent to ${e.name}`)}>
                          <Bell className="mr-1 h-3.5 w-3.5" /> Remind
                        </Button>
                        <Button size="sm" className="bg-gradient-primary text-primary-foreground shadow-glow" onClick={() => setRenewTarget(e)}>
                          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Renew
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {renewTarget && (
        <RenewDialog target={renewTarget} plans={plans} discounts={discounts} onClose={() => setRenewTarget(null)} />
      )}
    </>
  );
}

function RenewDialog({ target, plans, discounts, onClose }: {
  target: typeof expiringMemberships[number];
  plans: MembershipPlan[]; discounts: Discount[]; onClose: () => void;
}) {
  const [newPlanId, setNewPlanId] = useState(target.planId);
  const [discountId, setDiscountId] = useState("none");
  const [method, setMethod] = useState("UPI");
  const plan = plans.find((p) => p.id === newPlanId)!;
  const discount = discountId === "none" ? null : discounts.find((d) => d.id === discountId) ?? null;
  const pricing = computePricing(plan.basePrice, plan.registrationFee, plan.gstPercent,
    discount ? { type: discount.type, value: discount.value } : null);

  const newExpiry = useMemo(() => {
    const [y, m, d] = target.expiryDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (plan.durationUnit === "days") dt.setUTCDate(dt.getUTCDate() + plan.durationValue);
    if (plan.durationUnit === "weeks") dt.setUTCDate(dt.getUTCDate() + plan.durationValue * 7);
    if (plan.durationUnit === "months") dt.setUTCMonth(dt.getUTCMonth() + plan.durationValue);
    if (plan.durationUnit === "years") dt.setUTCFullYear(dt.getUTCFullYear() + plan.durationValue);
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  }, [target, plan]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Renew membership</DialogTitle>
          <DialogDescription>{target.name} · {target.phone}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border border-border bg-background/40 p-4 text-sm">
          <Row label="Current plan" value={target.planName} />
          <Row label="Current expiry" value={target.expiryDate} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>New plan</Label>
            <Select value={newPlanId} onValueChange={setNewPlanId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {plans.filter((p) => p.status === "active").map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} · {inr(p.basePrice)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Discount</Label>
            <Select value={discountId} onValueChange={setDiscountId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No discount</SelectItem>
                {discounts.filter((d) => d.active).map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Payment method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Cash", "UPI", "Card", "Bank Transfer", "Online Gateway"].map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>New expiry <span className="text-xs text-muted-foreground">(auto)</span></Label>
            <Input value={newExpiry} readOnly className="bg-muted/30" />
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-4 text-sm shadow-glow">
          <Row label="Plan price" value={inr(plan.basePrice)} />
          {discount && <Row label="Discount" value={`− ${inr(pricing.discountAmt)}`} />}
          <Row label={`GST (${plan.gstPercent}%)`} value={inr(pricing.gstAmt)} />
          <div className="h-px bg-border" />
          <Row label="Final amount" value={inr(pricing.final)} highlight />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-gradient-primary text-primary-foreground shadow-glow"
            onClick={() => { toast.success(`Renewed ${target.name} until ${newExpiry}`); onClose(); }}>
            <RefreshCw className="mr-1 h-4 w-4" /> Confirm renewal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============= HISTORY SECTION ============= */
function HistorySection() {
  const [memberId, setMemberId] = useState(members[0].id);
  const member = members.find((m) => m.id === memberId)!;
  const iconFor = (t: string) => ({
    join: BadgeCheck, activate: Sparkles, renew: RefreshCw,
    upgrade: TrendingUp, discount: Tag, expire: AlertTriangle,
  } as const)[t as "join"] ?? History;
  const colorFor = (t: string) => ({
    join: "bg-primary text-primary-foreground",
    activate: "bg-lime/20 text-lime",
    renew: "bg-success/20 text-success",
    upgrade: "bg-gradient-primary text-primary-foreground",
    discount: "bg-warning/20 text-warning",
    expire: "bg-destructive/20 text-destructive",
  } as const)[t as "join"] ?? "bg-muted";

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit border-border bg-card p-5 shadow-card">
        <Label className="text-xs uppercase tracking-widest text-muted-foreground">View history for</Label>
        <Select value={memberId} onValueChange={setMemberId}>
          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Separator className="my-4" />
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12"><AvatarImage src={member.photo} /><AvatarFallback>{member.name[0]}</AvatarFallback></Avatar>
          <div>
            <div className="font-semibold">{member.name}</div>
            <div className="text-xs text-muted-foreground">{member.id} · joined {member.joinDate}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="font-display text-xl font-bold text-gradient-primary">7</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Renewals</div>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="font-display text-xl font-bold text-lime">₹28K</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Lifetime value</div>
          </div>
        </div>
      </Card>

      <Card className="border-border bg-card p-6 shadow-card">
        <h3 className="font-display text-lg font-semibold">Membership timeline</h3>
        <p className="text-sm text-muted-foreground">Every plan change, renewal, upgrade and discount applied.</p>
        <div className="relative mt-6">
          <div className="absolute left-[19px] top-0 h-full w-px bg-border" />
          <ul className="space-y-5">
            {membershipHistorySample.map((e, i) => {
              const Icon = iconFor(e.type);
              return (
                <li key={i} className="relative flex gap-4">
                  <div className={cn("z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full ring-4 ring-card", colorFor(e.type))}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 rounded-lg border border-border bg-background/40 p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{e.title}</div>
                      <span className="text-xs text-muted-foreground">{e.date}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{e.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </Card>
    </div>
  );
}

/* ============= ANALYTICS SECTION ============= */
function AnalyticsSection() {
  const topPlan = [...revenueByPlan].sort((a, b) => b.revenue - a.revenue)[0];
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Top selling plan" value={topPlan.name} delta={12} icon={Sparkles} accent="primary" />
        <KpiCard label="Renewal rate" value="76%" delta={4} icon={RefreshCw} accent="success" />
        <KpiCard label="Discount redemptions" value={discountUsage.reduce((a, d) => a + d.used, 0).toString()} delta={9} icon={Tag} accent="lime" />
        <KpiCard label="Avg. plan value" value="₹4,250" delta={6} icon={IndianRupee} accent="warning" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="border-border bg-card shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display">Revenue by plan</CardTitle>
            <CardDescription>₹ thousands · year to date</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByPlan}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="name" stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: chartCursor }} />
                <Bar dataKey="revenue" fill={chartColors.primary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-card">
          <CardHeader>
            <CardTitle className="font-display">Plan mix</CardTitle>
            <CardDescription>Share of revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={revenueByPlan} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {revenueByPlan.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-border bg-card shadow-card">
          <CardHeader>
            <CardTitle className="font-display">Renewal conversion</CardTitle>
            <CardDescription>% of expiring memberships renewed within 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={renewalConversion}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="m" stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} domain={[50, 90]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="rate" stroke={chartColors.secondary} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-card">
          <CardHeader>
            <CardTitle className="font-display">Discount usage</CardTitle>
            <CardDescription>Redemptions per offer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {discountUsage.map((d, i) => {
              const max = Math.max(...discountUsage.map((x) => x.used));
              return (
                <div key={d.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{d.name}</span>
                    <span className="text-muted-foreground">{d.used}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${(d.used / max) * 100}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
