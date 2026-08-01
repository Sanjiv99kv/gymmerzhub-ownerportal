import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/topbar";
import { KpiCard } from "@/components/kpi-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { membershipPlans } from "@/lib/data";
import { hasPermission } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/approvals")({
  head: () => ({ meta: [{ title: "Member Approvals — GymmerzHub" }] }),
  component: ApprovalsPage,
});

type ApprovalStatus = "pending" | "approved" | "rejected";
type JoinSource = "app_signup" | "owner_invite";

type JoinRequest = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  goal: string;
  age: number;
  gender: string;
  source: JoinSource;
  requestedAt: string;
  status: ApprovalStatus;
  assignedPlanId?: string | null;
  assignedPlanName?: string | null;
  verifiedAt?: string | null;
  rejectReason?: string | null;
};

const MOCK_REQUESTS: JoinRequest[] = [
  {
    id: "jr-1",
    fullName: "Aarav Mehta",
    email: "aarav.mehta@gmail.com",
    phone: "+91 98765 41021",
    goal: "Lose fat",
    age: 24,
    gender: "Male",
    source: "app_signup",
    requestedAt: "2026-07-27T08:12:00+05:30",
    status: "pending",
  },
  {
    id: "jr-2",
    fullName: "Priya Nair",
    email: "priya.nair@outlook.com",
    phone: "+91 98111 22887",
    goal: "Gain muscle",
    age: 27,
    gender: "Female",
    source: "app_signup",
    requestedAt: "2026-07-27T07:40:00+05:30",
    status: "pending",
  },
  {
    id: "jr-3",
    fullName: "Rohan Kapoor",
    email: "rohan.k@gmail.com",
    phone: "+91 99001 33445",
    goal: "Stay fit",
    age: 31,
    gender: "Male",
    source: "owner_invite",
    requestedAt: "2026-07-26T19:05:00+05:30",
    status: "pending",
  },
  {
    id: "jr-4",
    fullName: "Sneha Iyer",
    email: "sneha.iyer@yahoo.com",
    phone: "+91 98220 11990",
    goal: "Lose fat",
    age: 22,
    gender: "Female",
    source: "app_signup",
    requestedAt: "2026-07-25T11:20:00+05:30",
    status: "approved",
    assignedPlanId: "pl-half",
    assignedPlanName: "6 Month Plan",
    verifiedAt: "2026-07-25T14:10:00+05:30",
  },
  {
    id: "jr-5",
    fullName: "Vikram Shah",
    email: "vikram.shah@gmail.com",
    phone: "+91 97654 33221",
    goal: "Rehab",
    age: 36,
    gender: "Male",
    source: "app_signup",
    requestedAt: "2026-07-24T16:45:00+05:30",
    status: "rejected",
    rejectReason: "Not a current gym member — asked to visit front desk first.",
  },
];

const activePlans = membershipPlans.filter((p) => p.status === "active");

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function ApprovalsPage() {
  const session = getSession();
  const canWrite = hasPermission(session, "members.write");

  const [requests, setRequests] = useState<JoinRequest[]>(MOCK_REQUESTS);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [query, setQuery] = useState("");

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [active, setActive] = useState<JoinRequest | null>(null);
  const [planId, setPlanId] = useState(activePlans[0]?.id ?? "");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);

  const counts = useMemo(() => {
    return {
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    };
  }, [requests]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (!q) return true;
      return (
        r.fullName.toLowerCase().includes(q)
        || r.email.toLowerCase().includes(q)
        || r.phone.toLowerCase().includes(q)
      );
    });
  }, [requests, tab, query]);

  const openApprove = (row: JoinRequest) => {
    setActive(row);
    setPlanId(activePlans[0]?.id ?? "");
    setStartDate(new Date().toISOString().slice(0, 10));
    setApproveOpen(true);
  };

  const openReject = (row: JoinRequest) => {
    setActive(row);
    setRejectReason("");
    setRejectOpen(true);
  };

  const confirmApprove = async () => {
    if (!active || !planId) {
      toast.error("Select a membership plan");
      return;
    }
    const plan = activePlans.find((p) => p.id === planId);
    setSaving(true);
    // UI-only mock delay — no backend call
    await new Promise((r) => setTimeout(r, 450));
    setRequests((prev) =>
      prev.map((r) =>
        r.id === active.id
          ? {
              ...r,
              status: "approved",
              assignedPlanId: planId,
              assignedPlanName: plan?.name ?? "Membership",
              verifiedAt: new Date().toISOString(),
            }
          : r,
      ),
    );
    setSaving(false);
    setApproveOpen(false);
    toast.success(`${active.fullName} approved · ${plan?.name} assigned`);
  };

  const confirmReject = async () => {
    if (!active) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 350));
    setRequests((prev) =>
      prev.map((r) =>
        r.id === active.id
          ? {
              ...r,
              status: "rejected",
              rejectReason: rejectReason.trim() || "Rejected by gym owner",
            }
          : r,
      ),
    );
    setSaving(false);
    setRejectOpen(false);
    toast.message(`${active.fullName} rejected`);
  };

  const tabs = [
    { id: "pending" as const, label: "Pending", count: counts.pending },
    { id: "approved" as const, label: "Approved", count: counts.approved },
    { id: "rejected" as const, label: "Rejected", count: counts.rejected },
    { id: "all" as const, label: "All", count: requests.length },
  ];

  return (
    <div>
      <PageHeader
        badge="Members"
        title="Member Approvals"
        description="When a member signs up in the app and selects your gym, review the request, assign a membership plan, and verify."
      />

      <div className="space-y-6 p-6">
        <section className="grid gap-4 md:grid-cols-3">
          <KpiCard
            label="Pending approvals"
            value={String(counts.pending)}
            delta={0}
            icon={Clock}
            accent="warning"
          />
          <KpiCard
            label="Approved"
            value={String(counts.approved)}
            delta={0}
            icon={UserCheck}
            accent="success"
          />
          <KpiCard
            label="Rejected"
            value={String(counts.rejected)}
            delta={0}
            icon={UserX}
            accent="primary"
          />
        </section>

        <Card className="border-border bg-card shadow-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1 rounded-lg bg-muted/50 p-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    tab === t.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                  <span className="ml-1.5 text-xs text-muted-foreground">{t.count}</span>
                </button>
              ))}
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, phone…"
                className="h-9 pl-9"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <ShieldCheck className="h-10 w-10 text-muted-foreground/50" />
              <div className="font-semibold text-foreground">No requests here</div>
              <p className="max-w-sm text-sm text-muted-foreground">
                New join requests from the member app will show up in Pending for you to verify and assign a plan.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">Member</th>
                    <th className="px-4 py-3 font-semibold">Goal</th>
                    <th className="px-4 py-3 font-semibold">Source</th>
                    <th className="px-4 py-3 font-semibold">Requested</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-b border-border/70 last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                              {initials(row.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{row.fullName}</div>
                            <div className="truncate text-xs text-muted-foreground">{row.email}</div>
                            <div className="text-xs text-muted-foreground">{row.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-foreground">{row.goal}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.age} · {row.gender}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-medium">
                          {row.source === "app_signup" ? "App signup" : "Owner invite"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-foreground">{formatWhen(row.requestedAt)}</div>
                        <div className="text-xs text-muted-foreground">{relativeTime(row.requestedAt)}</div>
                      </td>
                      <td className="px-4 py-3">
                        {row.status === "pending" && (
                          <Badge className="border-warning/30 bg-warning/10 text-warning hover:bg-warning/10">
                            Pending
                          </Badge>
                        )}
                        {row.status === "approved" && (
                          <div className="space-y-1">
                            <Badge className="border-success/30 bg-success/10 text-success hover:bg-success/10">
                              Verified
                            </Badge>
                            {row.assignedPlanName && (
                              <div className="text-xs text-muted-foreground">{row.assignedPlanName}</div>
                            )}
                          </div>
                        )}
                        {row.status === "rejected" && (
                          <div className="space-y-1">
                            <Badge className="border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/10">
                              Rejected
                            </Badge>
                            {row.rejectReason && (
                              <div className="max-w-[180px] text-xs text-muted-foreground line-clamp-2">
                                {row.rejectReason}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/30 text-destructive hover:bg-destructive/10"
                              disabled={!canWrite}
                              onClick={() => openReject(row)}
                            >
                              <XCircle className="mr-1 h-3.5 w-3.5" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              disabled={!canWrite}
                              onClick={() => openApprove(row)}
                            >
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                              Approve
                            </Button>
                          </div>
                        ) : (
                          <div className="text-right text-xs text-muted-foreground">
                            {row.verifiedAt ? `Verified ${formatWhen(row.verifiedAt)}` : "—"}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve & verify member</DialogTitle>
            <DialogDescription>
              Assign a membership plan and verify {active?.fullName}. They will become an active gym member in the app.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
              <div className="font-medium text-foreground">{active?.fullName}</div>
              <div className="text-muted-foreground">{active?.email}</div>
              <div className="text-xs text-muted-foreground">
                {active?.goal} · {active?.age} · {active?.gender}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Membership plan</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {activePlans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · ₹{p.basePrice.toLocaleString("en-IN")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Membership start date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={confirmApprove} disabled={saving || !planId}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Assign & verify
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject join request</DialogTitle>
            <DialogDescription>
              {active?.fullName} will stay out of your active member list. You can optionally leave a reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-1">
            <Label htmlFor="rejectReason">Reason (optional)</Label>
            <Textarea
              id="rejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Not a current gym member — visit front desk"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReject} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting…
                </>
              ) : (
                "Reject request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
