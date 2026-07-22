import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CreditCard, Download, FileText, IndianRupee, Info, Sparkles, Users, Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { kpis } from "@/lib/data";
import {
  PLATFORM_PLANS,
  TRIAL_DAYS,
  estimatePlatformBill,
  formatINR,
  getPlan,
  getPlatformInvoices,
  getSession,
  getTrialInfo,
  type InvoiceStatus,
  type PlatformInvoice,
} from "@/lib/tenant";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/billing")({
  head: () => ({ meta: [{ title: "Billing & Invoices — FitSaathi" }] }),
  component: BillingPage,
});

const statusStyles: Record<InvoiceStatus, string> = {
  paid: "border-success/30 bg-success/10 text-success",
  due: "border-warning/30 bg-warning/10 text-warning",
  overdue: "border-destructive/30 bg-destructive/10 text-destructive",
  void: "border-border bg-muted text-muted-foreground",
  upcoming: "border-primary/30 bg-primary/10 text-primary",
};

function BillingPage() {
  const session = getSession();
  if (!session) return null;

  const activeMembers = kpis.activeMemberships;
  const plan = getPlan(session.plan);
  const trial = getTrialInfo(session);
  const estimate = estimatePlatformBill(session.plan, activeMembers);
  const invoices = getPlatformInvoices(session, activeMembers);
  const memberUsagePct = Math.min(100, Math.round((activeMembers / plan.memberLimit) * 100));

  return (
    <div>
      <PageHeader
        badge="Billing"
        title="Bills & Invoices"
        description="FitSaathi platform fees for your gym workspace. Member memberships are collected separately by your gym."
      />

      <div className="space-y-6 p-6">
        {/* Money flow explainer */}
        <Card className="border-border bg-card shadow-card">
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">Members → Gym</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Members pay you for gym memberships (monthly/yearly plans). That revenue stays with your gym.
                  Track it under{" "}
                  <Link to="/payments" className="font-medium text-primary hover:underline">Payments</Link>.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-lime/10 text-lime">
                <IndianRupee className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">Gym → FitSaathi</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  After a {TRIAL_DAYS}-day free trial, you pay FitSaathi a platform fee based on your plan + active member count.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trial / subscription status */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-border bg-card shadow-card lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="font-display">Subscription status</CardTitle>
                  <CardDescription>
                    {session.gymName} · {plan.name} plan
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    trial.isTrialing && "border-primary/30 bg-primary/10 text-primary",
                    session.billingStatus === "active" && "border-success/30 bg-success/10 text-success",
                    session.billingStatus === "past_due" && "border-destructive/30 bg-destructive/10 text-destructive",
                  )}
                >
                  {trial.isTrialing ? `Free trial · ${trial.daysLeft} days left` : session.billingStatus.replace("_", " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {trial.isTrialing ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="font-semibold text-foreground">1-month free trial is active</div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Ends on <span className="font-medium text-foreground">{trial.trialEndsAt}</span>.
                          No platform charges until then. Member membership collections still work normally.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Trial progress</span>
                          <span>{trial.elapsed} / {trial.totalDays} days</span>
                        </div>
                        <Progress value={(trial.elapsed / trial.totalDays) * 100} className="h-2" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  Your trial has ended. Platform invoices are generated monthly based on active members.
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Active members" value={activeMembers.toLocaleString("en-IN")} hint={`of ${plan.memberLimit} plan limit`} />
                <Stat label="Base plan fee" value={formatINR(estimate.baseFee)} hint="/ month" />
                <Stat label="Est. next bill" value={formatINR(estimate.total)} hint="incl. 18% GST" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Member usage</span>
                  <span>{memberUsagePct}%</span>
                </div>
                <Progress value={memberUsagePct} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Bill formula: {formatINR(plan.monthlyFee)} base + {formatINR(plan.perMemberFee)} × active members + 18% GST
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-card">
            <CardHeader>
              <CardTitle className="font-display">Payment method</CardTitle>
              <CardDescription>Used for FitSaathi platform invoices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">No card on file</div>
                  <p className="text-xs text-muted-foreground">Add UPI / card before trial ends</p>
                </div>
              </div>
              <Button className="w-full">Add payment method</Button>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/payments">
                  <Wallet className="mr-1.5 h-4 w-4" />
                  Member payments
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="invoices" className="space-y-4">
          <TabsList className="border border-border bg-card p-1">
            <TabsTrigger value="invoices">Platform invoices</TabsTrigger>
            <TabsTrigger value="plans">Plans & pricing</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-4">
            <Card className="border-border bg-card shadow-card">
              <CardHeader>
                <CardTitle className="font-display">Invoice history</CardTitle>
                <CardDescription>
                  These are FitSaathi SaaS bills for your gym — not member membership receipts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Invoice</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => (
                        <InvoiceRow key={inv.id} invoice={inv} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                Member membership invoices (what members pay you) live in{" "}
                <Link to="/payments" className="font-medium text-primary hover:underline">Payments</Link>.
                This page only shows what <span className="font-medium text-foreground">your gym pays FitSaathi</span>.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="plans">
            <div className="grid gap-4 md:grid-cols-3">
              {PLATFORM_PLANS.map((p) => {
                const current = p.id === session.plan;
                const sample = estimatePlatformBill(p.id, Math.min(activeMembers, p.memberLimit));
                return (
                  <Card
                    key={p.id}
                    className={cn(
                      "border-border bg-card shadow-card",
                      current && "border-primary ring-1 ring-primary/30",
                    )}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="font-display">{p.name}</CardTitle>
                        {current && (
                          <Badge className="bg-primary text-primary-foreground">Current</Badge>
                        )}
                      </div>
                      <CardDescription>{p.tagline}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="font-display text-3xl font-bold">{formatINR(p.monthlyFee)}</div>
                        <div className="text-xs text-muted-foreground">
                          / mo base + {formatINR(p.perMemberFee)} / member · up to {p.memberLimit}
                        </div>
                      </div>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {p.features.map((f) => (
                          <li key={f} className="flex gap-2">
                            <span className="text-primary">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                      <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                        Your estimate with {Math.min(activeMembers, p.memberLimit)} members:{" "}
                        <span className="font-semibold text-foreground">{formatINR(sample.total)}</span>/mo incl. GST
                      </div>
                      <Button variant={current ? "outline" : "default"} className="w-full" disabled={current}>
                        {current ? "Current plan" : "Switch plan"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: PlatformInvoice }) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{invoice.number}</div>
            <div className="text-xs text-muted-foreground">{invoice.description}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>{invoice.periodLabel}</TableCell>
      <TableCell>{invoice.activeMembers}</TableCell>
      <TableCell className="font-semibold">{formatINR(invoice.total)}</TableCell>
      <TableCell>
        <Badge variant="outline" className={cn("capitalize", statusStyles[invoice.status])}>
          {invoice.status}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">{invoice.dueAt}</TableCell>
      <TableCell className="text-right">
        <Button size="sm" variant="ghost">
          <Download className="mr-1 h-3.5 w-3.5" />
          PDF
        </Button>
      </TableCell>
    </TableRow>
  );
}
