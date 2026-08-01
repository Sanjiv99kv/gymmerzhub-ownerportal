import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle2,
  IndianRupee,
  Loader2,
  Lock,
  Percent,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/topbar";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatINR } from "@/lib/tenant";
import { hasPermission, isOwnerSession } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/revenue-share")({
  head: () => ({ meta: [{ title: "Revenue Share — GymmerzHub" }] }),
  component: RevenueSharePage,
});

type AccountType = "savings" | "current";

type BankDetails = {
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifsc: string;
  bankName: string;
  branchName: string;
  accountType: AccountType;
};

type PayoutRow = {
  id: string;
  reference: string;
  period: string;
  members: number;
  gross: number;
  share: number;
  status: "paid" | "pending" | "processing" | "failed";
  paidAt?: string;
  utr?: string;
  note?: string;
};

const SHARE_PERCENT = 20;

const emptyBank = (): BankDetails => ({
  accountHolderName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifsc: "",
  bankName: "",
  branchName: "",
  accountType: "savings",
});

const MOCK_PAYOUTS: PayoutRow[] = [
  {
    id: "po-1",
    reference: "RS-2026-0712",
    period: "Jul 2026",
    members: 47,
    gross: 141,
    share: 28.2,
    status: "pending",
    note: "Payout scheduled after bank verification",
  },
  {
    id: "po-2",
    reference: "RS-2026-0705",
    period: "Jun 2026",
    members: 42,
    gross: 126,
    share: 25.2,
    status: "processing",
    note: "NEFT in progress",
  },
  {
    id: "po-3",
    reference: "RS-2026-0604",
    period: "May 2026",
    members: 38,
    gross: 114,
    share: 22.8,
    status: "paid",
    paidAt: "2026-06-04",
    utr: "HDFC261560012345",
  },
  {
    id: "po-4",
    reference: "RS-2026-0503",
    period: "Apr 2026",
    members: 35,
    gross: 105,
    share: 21.0,
    status: "paid",
    paidAt: "2026-05-03",
    utr: "SBIN261230098761",
  },
  {
    id: "po-5",
    reference: "RS-2026-0402",
    period: "Mar 2026",
    members: 31,
    gross: 93,
    share: 18.6,
    status: "paid",
    paidAt: "2026-04-02",
    utr: "ICIC261010554433",
  },
  {
    id: "po-6",
    reference: "RS-2026-0305",
    period: "Feb 2026",
    members: 28,
    gross: 84,
    share: 16.8,
    status: "paid",
    paidAt: "2026-03-05",
    utr: "AXIS260890112244",
  },
  {
    id: "po-7",
    reference: "RS-2026-0204",
    period: "Jan 2026",
    members: 24,
    gross: 72,
    share: 14.4,
    status: "paid",
    paidAt: "2026-02-04",
    utr: "HDFC260340778899",
  },
  {
    id: "po-8",
    reference: "RS-2025-1208",
    period: "Dec 2025",
    members: 22,
    gross: 66,
    share: 13.2,
    status: "failed",
    note: "Incorrect IFSC — retry after updating bank details",
  },
  {
    id: "po-9",
    reference: "RS-2025-1209",
    period: "Dec 2025 (retry)",
    members: 22,
    gross: 66,
    share: 13.2,
    status: "paid",
    paidAt: "2025-12-12",
    utr: "YESB253460001122",
  },
  {
    id: "po-10",
    reference: "RS-2025-1103",
    period: "Nov 2025",
    members: 19,
    gross: 57,
    share: 11.4,
    status: "paid",
    paidAt: "2025-11-03",
    utr: "PUNB253080445566",
  },
];

function validateIfsc(value: string) {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(value.trim());
}

function RevenueSharePage() {
  const session = getSession();
  const canEdit = isOwnerSession(session) || hasPermission(session, "settings.write");

  // Simulates admin portal eligibility toggle (UI-only until backend exists)
  const [eligible, setEligible] = useState(true);
  const [bank, setBank] = useState<BankDetails>(() => ({
    ...emptyBank(),
    accountHolderName: session?.ownerName ?? "",
  }));
  const [savedBank, setSavedBank] = useState<BankDetails | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(true);

  const thisMonthShare = 28.2;
  const pendingShare = savedBank ? 28.2 : 0;
  const paidYtd = 48;

  const bankComplete = useMemo(() => Boolean(savedBank), [savedBank]);

  const update = <K extends keyof BankDetails>(key: K, value: BankDetails[K]) => {
    setBank((prev) => ({ ...prev, [key]: value }));
  };

  const saveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toast.error("Only gym owners can update payout bank details");
      return;
    }

    const holder = bank.accountHolderName.trim();
    const acct = bank.accountNumber.replace(/\s/g, "");
    const confirm = bank.confirmAccountNumber.replace(/\s/g, "");
    const ifsc = bank.ifsc.trim().toUpperCase();
    const bankName = bank.bankName.trim();

    if (holder.length < 2) {
      toast.error("Enter account holder name");
      return;
    }
    if (!/^\d{9,18}$/.test(acct)) {
      toast.error("Account number should be 9–18 digits");
      return;
    }
    if (acct !== confirm) {
      toast.error("Account numbers do not match");
      return;
    }
    if (!validateIfsc(ifsc)) {
      toast.error("Enter a valid IFSC (e.g. HDFC0001234)");
      return;
    }
    if (bankName.length < 2) {
      toast.error("Enter bank name");
      return;
    }

    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    const next = {
      ...bank,
      accountHolderName: holder,
      accountNumber: acct,
      confirmAccountNumber: confirm,
      ifsc,
      bankName,
      branchName: bank.branchName.trim(),
    };
    setSavedBank(next);
    setBank(next);
    setEditing(false);
    setSaving(false);
    toast.success("Payout bank details saved");
  };

  const maskAccount = (num: string) => {
    if (num.length <= 4) return num;
    return `•••• ${num.slice(-4)}`;
  };

  return (
    <div>
      <PageHeader
        badge="Finance"
        title="Revenue Share"
        description="Earn 20% of GymmerzHub platform subscription revenue from members linked to your gym. Eligibility is controlled by GymmerzHub admin."
      />

      <div className="space-y-6 p-6">
        {/* Demo admin toggle — remove when admin portal wires eligibility */}
        <Card className="border-dashed border-border bg-muted/30">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-foreground">Admin eligibility (preview)</div>
              <p className="text-xs text-muted-foreground">
                In production this is turned on/off from the GymmerzHub admin portal — not by the gym owner.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("text-sm font-medium", eligible ? "text-success" : "text-muted-foreground")}>
                {eligible ? "Eligible" : "Ineligible"}
              </span>
              <Switch checked={eligible} onCheckedChange={setEligible} aria-label="Toggle eligibility preview" />
            </div>
          </CardContent>
        </Card>

        {!eligible ? (
          <Card className="border-border bg-card shadow-card">
            <CardContent className="flex flex-col items-center gap-4 px-6 py-16 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl border border-warning/25 bg-warning/10 text-warning">
                <Lock className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">
                  Ineligible
                </Badge>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Revenue share is not enabled for your gym
                </h2>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  GymmerzHub admin has not marked your gym as eligible yet. Once enabled, you can add
                  bank account details here and receive your 20% share of member platform subscriptions.
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-left text-sm text-muted-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>
                  Contact GymmerzHub support if you believe this should be turned on for{" "}
                  <span className="font-medium text-foreground">{session?.gymName ?? "your gym"}</span>.
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="flex flex-col gap-3 rounded-xl border border-success/25 bg-success/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-success/15 text-success">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">Eligible for revenue share</span>
                    <Badge className="border-success/30 bg-success/15 text-success hover:bg-success/15">
                      Active
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You receive {SHARE_PERCENT}% of platform subscription revenue from members linked to your gym.
                    Add bank details below to receive payouts.
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <KpiCard
                label="Share rate"
                value={`${SHARE_PERCENT}%`}
                delta={0}
                icon={Percent}
                accent="lime"
              />
              <KpiCard
                label="This month (est.)"
                value={formatINR(thisMonthShare * 83)}
                delta={12}
                icon={IndianRupee}
                accent="success"
              />
              <KpiCard
                label="Pending payout"
                value={bankComplete ? formatINR(pendingShare * 83) : "—"}
                delta={0}
                icon={Wallet}
                accent="warning"
              />
            </section>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="border-border bg-card shadow-card">
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-display flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Payout bank account
                    </CardTitle>
                    <CardDescription>
                      Revenue share is transferred to this account. Ensure IFSC and account number are correct.
                    </CardDescription>
                  </div>
                  {savedBank && !editing && canEdit && (
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                      Edit
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {savedBank && !editing ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        Bank details saved — ready for payouts
                      </div>
                      <div className="divide-y divide-border rounded-lg border border-border">
                        {[
                          ["Account holder", savedBank.accountHolderName],
                          ["Account number", maskAccount(savedBank.accountNumber)],
                          ["IFSC", savedBank.ifsc],
                          ["Bank", savedBank.bankName],
                          ["Branch", savedBank.branchName || "—"],
                          ["Type", savedBank.accountType === "savings" ? "Savings" : "Current"],
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-medium text-foreground">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={saveBank} className="space-y-4">
                      {!canEdit && (
                        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                          Only the gym owner can set payout bank details.
                        </p>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="holder">Account holder name</Label>
                        <Input
                          id="holder"
                          value={bank.accountHolderName}
                          onChange={(e) => update("accountHolderName", e.target.value)}
                          placeholder="As per bank records"
                          disabled={!canEdit || saving}
                          required
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="acct">Account number</Label>
                          <Input
                            id="acct"
                            inputMode="numeric"
                            autoComplete="off"
                            value={bank.accountNumber}
                            onChange={(e) => update("accountNumber", e.target.value.replace(/[^\d]/g, ""))}
                            placeholder="9–18 digits"
                            disabled={!canEdit || saving}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="acct2">Confirm account number</Label>
                          <Input
                            id="acct2"
                            inputMode="numeric"
                            autoComplete="off"
                            value={bank.confirmAccountNumber}
                            onChange={(e) => update("confirmAccountNumber", e.target.value.replace(/[^\d]/g, ""))}
                            placeholder="Re-enter account number"
                            disabled={!canEdit || saving}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="ifsc">IFSC code</Label>
                          <Input
                            id="ifsc"
                            value={bank.ifsc}
                            onChange={(e) => update("ifsc", e.target.value.toUpperCase())}
                            placeholder="HDFC0001234"
                            maxLength={11}
                            disabled={!canEdit || saving}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Account type</Label>
                          <Select
                            value={bank.accountType}
                            onValueChange={(v) => update("accountType", v as AccountType)}
                            disabled={!canEdit || saving}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="savings">Savings</SelectItem>
                              <SelectItem value="current">Current</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="bankName">Bank name</Label>
                          <Input
                            id="bankName"
                            value={bank.bankName}
                            onChange={(e) => update("bankName", e.target.value)}
                            placeholder="e.g. HDFC Bank"
                            disabled={!canEdit || saving}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="branch">Branch (optional)</Label>
                          <Input
                            id="branch"
                            value={bank.branchName}
                            onChange={(e) => update("branchName", e.target.value)}
                            placeholder="e.g. Andheri West"
                            disabled={!canEdit || saving}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {savedBank && (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={saving}
                            onClick={() => {
                              setBank(savedBank);
                              setEditing(false);
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button type="submit" disabled={!canEdit || saving}>
                          {saving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            <>
                              <Banknote className="mr-2 h-4 w-4" />
                              Save bank details
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-card">
                <CardHeader>
                  <CardTitle className="font-display">How it works</CardTitle>
                  <CardDescription>Platform subscription share for your gym</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <ol className="list-decimal space-y-3 pl-4 text-foreground/90">
                    <li>
                      Members linked to your gym pay <span className="font-medium">$3/month</span> to GymmerzHub.
                    </li>
                    <li>
                      You earn <span className="font-medium">{SHARE_PERCENT}%</span> of that subscription revenue.
                    </li>
                    <li>GymmerzHub admin enables eligibility for your gym.</li>
                    <li>You add bank details here — payouts go straight to your account.</li>
                  </ol>
                  <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Example</div>
                    <p className="mt-1 text-foreground">
                      100 members × $3 = $300 → your share <span className="font-semibold">$60</span> ({SHARE_PERCENT}%)
                    </p>
                  </div>
                  <p className="text-xs">
                    Paid YTD (demo): {formatINR(paidYtd * 83)}. Amounts shown in INR for display only.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border bg-card shadow-card overflow-hidden">
              <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle className="font-display">Payout history</CardTitle>
                  <CardDescription>
                    Dummy revenue-share transfers for your gym (UI preview)
                  </CardDescription>
                </div>
                <div className="text-xs text-muted-foreground">
                  {MOCK_PAYOUTS.length} transactions · {SHARE_PERCENT}% share
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead>
                    <tr className="border-y border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">Reference</th>
                      <th className="px-4 py-3 font-semibold">Period</th>
                      <th className="px-4 py-3 font-semibold">Members</th>
                      <th className="px-4 py-3 font-semibold">Gross</th>
                      <th className="px-4 py-3 font-semibold">Your {SHARE_PERCENT}%</th>
                      <th className="px-4 py-3 font-semibold">UTR / note</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_PAYOUTS.map((row) => (
                      <tr key={row.id} className="border-b border-border/70 last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {row.reference}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{row.period}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.members}</td>
                        <td className="px-4 py-3">${row.gross.toFixed(0)}</td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          ${row.share.toFixed(1)}
                        </td>
                        <td className="px-4 py-3">
                          {row.utr ? (
                            <span className="font-mono text-xs text-foreground">{row.utr}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">{row.note ?? "—"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.status === "paid" && (
                            <Badge className="border-success/30 bg-success/10 text-success hover:bg-success/10">
                              Paid{row.paidAt ? ` · ${row.paidAt}` : ""}
                            </Badge>
                          )}
                          {row.status === "pending" && (
                            <Badge className="border-warning/30 bg-warning/10 text-warning hover:bg-warning/10">
                              Pending
                            </Badge>
                          )}
                          {row.status === "processing" && (
                            <Badge className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/10">
                              Processing
                            </Badge>
                          )}
                          {row.status === "failed" && (
                            <Badge className="border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/10">
                              Failed
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
