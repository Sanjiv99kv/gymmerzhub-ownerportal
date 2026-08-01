import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Check, Sparkles, Plus, Tag, TrendingUp,
  Wallet, BadgeCheck, AlertTriangle, RefreshCw, Bell, Pencil, Trash2,
  IndianRupee, Receipt, History, Loader2, Search, X,
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

import { formatApiError } from "@/lib/api";
import {
  revenueByPlan, discountUsage, renewalConversion, membershipHistorySample,
} from "@/lib/data";
import {
  assignMembership,
  createDiscount,
  createPlan,
  deleteDiscount,
  deletePlan,
  fetchDiscounts,
  fetchExpiringMemberships,
  fetchMemberStats,
  fetchPlans,
  searchMembers,
  updateDiscount,
  updatePlan,
  type DurationUnit,
  type ExpiringMembership,
  type MemberSearchHit,
  type MembershipDiscount,
  type MembershipPlan,
} from "@/lib/membership-api";
import {
  chartTooltipStyle as tooltipStyle,
  chartGrid,
  chartCursor,
  chartAxis,
  chartColors,
  pieColors as PIE_COLORS,
} from "@/lib/chart-theme";

export const Route = createFileRoute("/_app/plans")({
  head: () => ({ meta: [{ title: "Membership Management — GymmerzHub" }] }),
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
  const [planList, setPlanList] = useState<MembershipPlan[]>([]);
  const [expiring, setExpiring] = useState<ExpiringMembership[]>([]);
  const [stats, setStats] = useState({ activeMemberships: 0, expiringThisWeek: 0 });
  const [discList, setDiscList] = useState<MembershipDiscount[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [plans, exp, s, discs] = await Promise.all([
        fetchPlans(),
        fetchExpiringMemberships(7),
        fetchMemberStats(),
        fetchDiscounts(),
      ]);
      setPlanList(plans);
      setExpiring(exp);
      setStats({
        activeMemberships: s.activeMemberships,
        expiringThisWeek: s.expiringThisWeek,
      });
      setDiscList(discs);
    } catch (error) {
      toast.error(formatApiError(error, "Could not load membership data"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const totals = useMemo(() => {
    const active = planList.filter((p) => p.status === "active").length;
    const totalRevenue = planList.reduce((a, p) => a + p.basePrice * p.sold, 0);
    const expiringWeek = expiring.filter((e) => e.daysRemaining <= 7).length;
    const expiringToday = expiring.filter((e) => e.daysRemaining === 0).length;
    return { active, totalRevenue, expiringWeek, expiringToday };
  }, [planList, expiring]);

  async function handleCreatePlan(input: Parameters<typeof createPlan>[0]) {
    const plan = await createPlan(input);
    setPlanList((s) => [...s, plan]);
    return plan;
  }

  async function handleTogglePlan(id: string) {
    const current = planList.find((p) => p.id === id);
    if (!current) return;
    try {
      const next = await updatePlan(id, {
        status: current.status === "active" ? "inactive" : "active",
      });
      setPlanList((s) => s.map((x) => (x.id === id ? next : x)));
    } catch (error) {
      toast.error(formatApiError(error, "Could not update plan"));
    }
  }

  async function handleDeletePlan(id: string) {
    try {
      await deletePlan(id);
      setPlanList((s) => s.filter((x) => x.id !== id));
      toast.success("Plan removed");
    } catch (error) {
      toast.error(formatApiError(error, "Could not delete plan"));
    }
  }

  async function handleCreateDiscount(input: Parameters<typeof createDiscount>[0]) {
    const discount = await createDiscount(input);
    setDiscList((s) => [discount, ...s]);
    return discount;
  }

  async function handleToggleDiscount(id: string) {
    const current = discList.find((d) => d.id === id);
    if (!current) return;
    try {
      const next = await updateDiscount(id, { active: !current.active });
      setDiscList((s) => s.map((x) => (x.id === id ? next : x)));
    } catch (error) {
      toast.error(formatApiError(error, "Could not update discount"));
    }
  }

  async function handleDeleteDiscount(id: string) {
    try {
      await deleteDiscount(id);
      setDiscList((s) => s.filter((x) => x.id !== id));
      toast.success("Discount removed");
    } catch (error) {
      toast.error(formatApiError(error, "Could not delete discount"));
    }
  }

  return (
    <div>
      <PageHeader
        badge="Membership Suite"
        title="Membership Management"
        description="Create flexible plans, run discounts, track renewals, and monitor subscription revenue."
        action={<CreatePlanDialog onCreate={handleCreatePlan} />}
      />

      <div className="space-y-6 p-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : null}

        {/* KPI ROW */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total Plans" value={planList.length.toString()} delta={0} icon={BadgeCheck} accent="primary" />
          <KpiCard label="Active Memberships" value={String(stats.activeMemberships)} delta={0} icon={Sparkles} accent="lime" />
          <KpiCard label="Expiring this week" value={String(totals.expiringWeek || stats.expiringThisWeek)} delta={0} icon={AlertTriangle} accent="warning" />
          <KpiCard label="Membership Revenue" value={`₹${(totals.totalRevenue / 100000).toFixed(1)}L`} delta={0} icon={Wallet} accent="success" />
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
              {[...planList].sort((a, b) => a.displayOrder - b.displayOrder).map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  onToggle={handleTogglePlan}
                  onDelete={handleDeletePlan}
                />
              ))}
              <CreatePlanCard onCreate={handleCreatePlan} />
            </div>
          </TabsContent>

          {/* DISCOUNTS TAB */}
          <TabsContent value="discounts" className="space-y-5">
            <DiscountsSection
              discounts={discList}
              plans={planList}
              onCreate={handleCreateDiscount}
              onToggle={handleToggleDiscount}
              onDelete={handleDeleteDiscount}
            />
          </TabsContent>

          {/* ASSIGN TAB */}
          <TabsContent value="assign">
            <AssignMembershipSection
              plans={planList}
              discounts={discList}
              onAssigned={() => void load()}
            />
          </TabsContent>

          {/* RENEWALS TAB */}
          <TabsContent value="renewals" className="space-y-5">
            <RenewalsSection plans={planList} discounts={discList} expiring={expiring} />
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

function CreatePlanCard({ onCreate }: { onCreate: (p: Parameters<typeof createPlan>[0]) => Promise<MembershipPlan> }) {
  return (
    <CreatePlanDialog onCreate={onCreate}>
      <button className="group flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card/40 p-6 transition-all hover:border-primary/60 hover:bg-card">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-primary opacity-80 transition-transform group-hover:scale-110">
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
function CreatePlanDialog({
  onCreate,
  children,
}: {
  onCreate: (p: Parameters<typeof createPlan>[0]) => Promise<MembershipPlan>;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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

  async function submit() {
    if (!name.trim()) { toast.error("Plan name is required"); return; }
    setSaving(true);
    try {
      await onCreate({
        name: name.trim(),
        durationValue,
        durationUnit,
        basePrice,
        registrationFee: regFee,
        gstPercent: gst,
        tagline: tagline || "Custom plan",
        benefits: benefits.split("\n").map((b) => b.trim()).filter(Boolean),
        status: status ? "active" : "inactive",
        displayOrder: order,
      });
      toast.success(`Plan "${name}" created`);
      setOpen(false);
      setName(""); setTagline("");
    } catch (error) {
      toast.error(formatApiError(error, "Could not create plan"));
    } finally {
      setSaving(false);
    }
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
          <Button onClick={() => void submit()} disabled={saving} className="bg-lime text-lime-foreground hover:bg-lime/90">
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Create plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============= DISCOUNTS SECTION ============= */
function DiscountsSection({ discounts, plans, onCreate, onToggle, onDelete }: {
  discounts: MembershipDiscount[]; plans: MembershipPlan[];
  onCreate: (d: Parameters<typeof createDiscount>[0]) => Promise<MembershipDiscount>;
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

function CreateDiscountDialog({
  plans,
  onCreate,
}: {
  plans: MembershipPlan[];
  onCreate: (d: Parameters<typeof createDiscount>[0]) => Promise<MembershipDiscount>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState(10);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(() => {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [active, setActive] = useState(true);

  async function submit() {
    if (!name.trim() || !code.trim()) { toast.error("Name and code are required"); return; }
    setSaving(true);
    try {
      await onCreate({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        value,
        startDate: start,
        endDate: end,
        applicablePlanIds: selected,
        active,
      });
      toast.success(`Discount "${name}" created`);
      setOpen(false);
      setName(""); setCode(""); setSelected([]);
    } catch (error) {
      toast.error(formatApiError(error, "Could not create discount"));
    } finally {
      setSaving(false);
    }
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
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button
            onClick={() => void submit()}
            disabled={saving}
            className="bg-lime text-lime-foreground hover:bg-lime/90"
          >
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Create discount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============= ASSIGN MEMBERSHIP SECTION ============= */
function AssignMembershipSection({
  plans,
  discounts,
  onAssigned,
}: {
  plans: MembershipPlan[];
  discounts: MembershipDiscount[];
  onAssigned?: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [memberQuery, setMemberQuery] = useState("");
  const [searchHits, setSearchHits] = useState<MemberSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [member, setMember] = useState<MemberSearchHit | null>(null);
  const [planId, setPlanId] = useState(plans.find((p) => p.status === "active")?.id ?? plans[0]?.id ?? "");
  const [discountId, setDiscountId] = useState<string>("none");
  const [useCustom, setUseCustom] = useState(false);
  const [customPrice, setCustomPrice] = useState(0);
  const [customReason, setCustomReason] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [method, setMethod] = useState("UPI");
  const [notes, setNotes] = useState("");
  const [replaceActive, setReplaceActive] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!planId) {
      const first = plans.find((p) => p.status === "active") ?? plans[0];
      if (first) setPlanId(first.id);
    }
  }, [plans, planId]);

  useEffect(() => {
    const q = memberQuery.trim();
    if (member || q.length < 2) {
      setSearchHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      void (async () => {
        try {
          const hits = await searchMembers(q, 15);
          setSearchHits(hits);
          setSearchOpen(true);
        } catch (error) {
          toast.error(formatApiError(error, "Could not search members"));
          setSearchHits([]);
        } finally {
          setSearching(false);
        }
      })();
    }, 250);
    return () => clearTimeout(t);
  }, [memberQuery, member]);

  const plan = plans.find((p) => p.id === planId) ?? plans[0];
  const discount = discountId === "none" ? null : discounts.find((d) => d.id === discountId) ?? null;
  const pricing = computePricing(plan?.basePrice ?? 0, plan?.registrationFee ?? 0, plan?.gstPercent ?? 0,
    discount ? { type: discount.type, value: discount.value } : null);
  const finalAmount = useCustom ? customPrice : pricing.final;

  const activeMembership = member?.currentMembership?.status === "active"
    ? member.currentMembership
    : null;

  const minStartDate = useMemo(() => {
    const join = member?.joinDate || today;
    if (activeMembership?.endDate && !replaceActive) {
      const renewFrom = addDaysISO(activeMembership.endDate, 1);
      return renewFrom > join ? renewFrom : join;
    }
    return join;
  }, [member?.joinDate, activeMembership?.endDate, replaceActive, today]);

  useEffect(() => {
    setReplaceActive(false);
  }, [member?.id]);

  useEffect(() => {
    if (!member) return;
    if (replaceActive) {
      const join = member.joinDate || today;
      setStartDate(join > today ? join : today);
    } else {
      setStartDate(minStartDate);
    }
  }, [member?.id, replaceActive, minStartDate, member, today]);

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

  const startBeforeJoin = Boolean(member?.joinDate && startDate < member.joinDate);
  const overlapsActive = Boolean(
    activeMembership?.endDate
    && startDate <= activeMembership.endDate
    && endDate >= (activeMembership.startDate || startDate),
  );

  function selectMember(m: MemberSearchHit) {
    setMember(m);
    setMemberQuery(`${m.memberCode} · ${m.name}`);
    setSearchHits([]);
    setSearchOpen(false);
  }

  function clearMember() {
    setMember(null);
    setMemberQuery("");
    setSearchHits([]);
    setSearchOpen(false);
    setReplaceActive(false);
    setStartDate(today);
  }

  async function submit() {
    if (!member || !plan) {
      toast.error("Search and select a member first");
      return;
    }
    if (member.joinDate && startDate < member.joinDate) {
      toast.error(`Start date cannot be before join date (${member.joinDate})`);
      return;
    }
    if (overlapsActive && !replaceActive) {
      toast.error(
        `Active membership runs until ${activeMembership?.endDate}. Renew after that date, or enable replace.`,
      );
      return;
    }
    setSaving(true);
    try {
      await assignMembership(member.id, {
        planId: plan.id,
        startDate,
        endDate,
        priceCharged: finalAmount,
        paymentMethod: method,
        replaceActive: overlapsActive ? replaceActive : false,
        discountId: discount && pricing.discountAmt > 0 ? discount.id : null,
        discountAmount: pricing.discountAmt > 0 ? pricing.discountAmt : null,
        notes: [notes, useCustom && customReason ? `Custom price reason: ${customReason}` : ""]
          .filter(Boolean)
          .join("\n") || null,
      });
      toast.success(`Membership assigned to ${member.name}`, {
        description: `${plan.name} · ${inr(finalAmount)} · Expires ${endDate}`,
      });
      clearMember();
      onAssigned?.();
    } catch (error) {
      toast.error(formatApiError(error, "Could not assign membership"));
    } finally {
      setSaving(false);
    }
  }

  if (plans.filter((p) => p.status === "active").length === 0) {
    return (
      <Card className="border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
        Create an active plan before assigning memberships.
      </Card>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
      <Card className="border-border bg-card p-6 shadow-sm">
        <h3 className="font-display text-lg font-semibold">Assign membership</h3>
        <p className="text-sm text-muted-foreground">
          Search by member ID (e.g. M-1001), name, or phone — then choose a plan.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="relative space-y-2 md:col-span-2">
            <Label>Find member</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={memberQuery}
                onChange={(e) => {
                  setMemberQuery(e.target.value);
                  if (member) setMember(null);
                  setSearchOpen(true);
                }}
                onFocus={() => {
                  if (!member && searchHits.length > 0) setSearchOpen(true);
                }}
                placeholder="Type M-1001, name, or phone…"
                className="pl-9 pr-9"
                autoComplete="off"
              />
              {(member || memberQuery) && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={clearMember}
                  aria-label="Clear member"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {searching && (
                <Loader2 className="absolute right-9 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            {searchOpen && !member && memberQuery.trim().length >= 2 && (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg">
                {searchHits.length === 0 && !searching ? (
                  <p className="px-3 py-3 text-sm text-muted-foreground">No members match “{memberQuery.trim()}”</p>
                ) : (
                  searchHits.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/40"
                      onClick={() => selectMember(m)}
                    >
                      <Avatar className="h-8 w-8">
                        {m.photo ? <AvatarImage src={m.photo} /> : null}
                        <AvatarFallback className="text-xs">{m.name?.[0] ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {m.memberCode} · {m.phone}
                          {m.plan ? ` · ${m.plan}` : " · No plan"}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {member ? (
              <div className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                Selected <span className="font-semibold text-foreground">{member.memberCode}</span>
                {member.joinDate ? ` · Joined ${member.joinDate}` : ""}
                {activeMembership?.endDate
                  ? ` · Active until ${activeMembership.endDate}${activeMembership.planName ? ` (${activeMembership.planName})` : ""}`
                  : ""}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Start typing at least 2 characters — exact codes like M-1001 rank first.</p>
            )}
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
            <Input
              type="date"
              min={member ? minStartDate : undefined}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={!member}
            />
            {startBeforeJoin ? (
              <p className="text-xs text-destructive">Cannot start before join date ({member?.joinDate}).</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>End date <span className="text-xs text-muted-foreground">(auto)</span></Label>
            <Input value={endDate} readOnly className="bg-muted/30" />
          </div>
        </div>

        {activeMembership?.endDate ? (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label className="text-sm">Replace active membership</Label>
              <p className="text-xs text-muted-foreground">
                Cut the current plan short and start the new one on the selected date. Leave off to renew after {activeMembership.endDate}.
              </p>
            </div>
            <Switch checked={replaceActive} onCheckedChange={setReplaceActive} />
          </div>
        ) : null}

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

      <Card className="h-fit border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            {member?.photo ? <AvatarImage src={member.photo} /> : null}
            <AvatarFallback>{member?.name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-semibold">{member?.name ?? "Search a member"}</div>
            <div className="truncate text-xs text-muted-foreground">
              {member ? `${member.memberCode} · ${member.phone}` : "e.g. M-1001"}
            </div>
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
        <Button
          onClick={() => void submit()}
          disabled={!member || saving || startBeforeJoin || (overlapsActive && !replaceActive)}
          className="mt-4 w-full bg-lime text-lime-foreground hover:bg-lime/90"
        >
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Receipt className="mr-1 h-4 w-4" />}
          Confirm & assign
        </Button>
      </Card>
    </div>
  );
}

function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/* ============= RENEWALS SECTION ============= */
function RenewalsSection({
  plans,
  discounts,
  expiring,
}: {
  plans: MembershipPlan[];
  discounts: MembershipDiscount[];
  expiring: ExpiringMembership[];
}) {
  const [filter, setFilter] = useState<"today" | "3" | "7" | "30">("7");
  const [renewTarget, setRenewTarget] = useState<ExpiringMembership | null>(null);

  const filtered = expiring.filter((e) => {
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
                          {e.photo ? <AvatarImage src={e.photo} /> : null}
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
  target: ExpiringMembership;
  plans: MembershipPlan[]; discounts: MembershipDiscount[]; onClose: () => void;
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
          <Row label="Current plan" value={target.planName || "—"} />
          <Row label="Current expiry" value={target.expiryDate || "—"} />
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
  const iconFor = (t: string) => ({
    join: BadgeCheck, activate: Sparkles, renew: RefreshCw,
    upgrade: TrendingUp, discount: Tag, expire: AlertTriangle,
  } as const)[t as "join"] ?? History;
  const colorFor = (t: string) => ({
    join: "bg-lime text-lime-foreground",
    activate: "bg-lime/20 text-lime",
    renew: "bg-success/20 text-success",
    upgrade: "bg-gradient-primary text-primary-foreground",
    discount: "bg-warning/20 text-warning",
    expire: "bg-destructive/20 text-destructive",
  } as const)[t as "join"] ?? "bg-muted";

  return (
    <Card className="border-border bg-card p-6 shadow-sm">
      <h3 className="font-display text-lg font-semibold">Membership history</h3>
      <p className="mb-5 text-sm text-muted-foreground">
        Sample timeline — live member history will appear here after more assignments.
      </p>
      <div className="relative space-y-0">
        <div className="absolute bottom-2 left-[19px] top-2 w-px bg-border" />
        {membershipHistorySample.map((h, i) => {
          const Icon = iconFor(h.type);
          return (
            <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
              <div className={cn("relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full", colorFor(h.type))}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 pt-1.5">
                <div className="font-medium">{h.title}</div>
                <div className="text-xs text-muted-foreground">{h.date} · {h.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
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
