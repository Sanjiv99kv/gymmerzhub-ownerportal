import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search, Filter, Plus, Eye, Ban, Trash2,
  Wallet, CalendarCheck, UserCheck, AlertTriangle,
  MoreHorizontal, ChevronUp, ChevronDown, ChevronsUpDown,
  Clock, Loader2, Send, Smartphone,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/topbar";
import { KpiCard } from "@/components/kpi-card";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatApiError } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";
import {
  createMember,
  deleteMember,
  fetchMemberStats,
  fetchMembers,
  fetchPlans,
  inviteMemberToApp,
  revokeMemberAppInvite,
  updateMember,
  type GymMemberListItem,
  type MemberGender,
  type MembershipPlan,
} from "@/lib/membership-api";

export const Route = createFileRoute("/_app/members/")({
  head: () => ({ meta: [{ title: "Members — GymmerzHub" }] }),
  component: MembersPage,
});

function daysBetween(a: Date, b: Date) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.ceil(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
      Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / ms,
  );
}

function fmtShort(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  });
}

type SortKey = "name" | "joinDate" | "expiryDate" | "visits";
type SortDir = "asc" | "desc";

const statusCfg: Record<string, { cls: string; dot: string }> = {
  active: { cls: "bg-success/10 text-success border-success/30", dot: "bg-success" },
  expired: { cls: "bg-destructive/10 text-destructive border-destructive/30", dot: "bg-destructive" },
  suspended: { cls: "bg-warning/10 text-warning border-warning/30", dot: "bg-warning" },
  frozen: { cls: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
};

function RelativeDateCell({
  iso,
  empty = "—",
  variant = "expiry",
}: {
  iso: string | null | undefined;
  empty?: string;
  /** joined = always "Xd ago"; expiry = urgency colors + left/ago */
  variant?: "joined" | "expiry";
}) {
  if (!iso) return <span className="text-sm text-muted-foreground">{empty}</span>;

  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const days = daysBetween(todayUtc, date);

  if (variant === "joined") {
    const abs = Math.abs(days);
    const label =
      days === 0 ? "Today" :
      days === 1 ? "Tomorrow" :
      days > 0 ? `In ${days}d` :
      `${abs}d ago`;
    const pill =
      days < 0 ? "bg-destructive/10 text-destructive" :
      days <= 7 ? "bg-primary/10 text-primary" :
      "bg-muted text-muted-foreground";
    return (
      <div className="flex flex-col gap-0.5">
        <span className="whitespace-nowrap text-sm text-foreground">{fmtShort(iso)}</span>
        <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${pill}`}>
          <Clock className="h-2.5 w-2.5" /> {label}
        </span>
      </div>
    );
  }

  let pill = "bg-muted text-muted-foreground";
  if (days < 0) pill = "bg-destructive/10 text-destructive";
  else if (days <= 7) pill = "bg-warning/10 text-warning";
  else if (days <= 30) pill = "bg-primary/10 text-primary";

  const label =
    days < 0 ? `${Math.abs(days)}d ago` :
    days === 0 ? "Today" :
    days === 1 ? "Tomorrow" :
    `${days}d left`;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="whitespace-nowrap text-sm text-foreground">{fmtShort(iso)}</span>
      <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${pill}`}>
        <Clock className="h-2.5 w-2.5" /> {label}
      </span>
    </div>
  );
}

function SortHead({ label, col, sort, onSort, className = "" }: {
  label: string; col: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = sort.key === col;
  return (
    <th
      className={`cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground ${className}`}
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active
          ? sort.dir === "asc"
            ? <ChevronUp className="h-3 w-3 text-primary" />
            : <ChevronDown className="h-3 w-3 text-primary" />
          : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
      </span>
    </th>
  );
}

function MembersPage() {
  const session = getSession();
  const canWrite = hasPermission(session, "members.write");
  const canDelete = hasPermission(session, "members.delete") || canWrite;

  const [members, setMembers] = useState<GymMemberListItem[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [stats, setStats] = useState({ totalMembers: 0, activeMembers: 0, expiringThisWeek: 0, activeMemberships: 0 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    age: "",
    gender: "" as "" | MemberGender,
    joinDate: new Date().toISOString().slice(0, 10),
  });
  const PER_PAGE = 10;

  function openCreateDialog() {
    setForm({
      fullName: "",
      phone: "",
      email: "",
      age: "",
      gender: "",
      joinDate: new Date().toISOString().slice(0, 10),
    });
    setDialogOpen(true);
  }

  async function load() {
    setLoading(true);
    try {
      const [list, s, planList] = await Promise.all([
        fetchMembers({ status: status === "all" ? undefined : status, q: q.trim() || undefined }),
        fetchMemberStats(),
        fetchPlans(),
      ]);
      setMembers(list);
      setStats(s);
      setPlans(planList);
    } catch (error) {
      toast.error(formatApiError(error, "Could not load members"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, q.trim() ? 300 : 0);
    return () => clearTimeout(t);
    // load reads latest status/q from closure on each run
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional filter-driven reload
  }, [status, q]);

  const onSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );

  const resetFilters = () => {
    setQ("");
    setPlan("all");
    setStatus("all");
    setPage(1);
  };

  const filtered = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...members]
      .filter((m) => {
        if (plan === "all") return true;
        if (plan === "none") return !m.planId;
        return m.planId === plan;
      })
      .sort((a, b) => {
        if (sort.key === "name") return a.name.localeCompare(b.name) * dir;
        if (sort.key === "joinDate") return (a.joinDate || "").localeCompare(b.joinDate || "") * dir;
        if (sort.key === "expiryDate") return (a.expiryDate || "").localeCompare(b.expiryDate || "") * dir;
        if (sort.key === "visits") return ((a.attendance || 0) - (b.attendance || 0)) * dir;
        return 0;
      });
  }, [members, sort, plan]);

  const maxVisits = useMemo(
    () => Math.max(1, ...members.map((m) => m.attendance || 0)),
    [members],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const list = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function submitCreate() {
    if (form.fullName.trim().length < 2) {
      toast.error("Name is required");
      return;
    }
    if (!/^\d{10}$/.test(form.phone.trim())) {
      toast.error("Phone must be exactly 10 digits");
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Enter a valid email");
      return;
    }
    setSaving(true);
    try {
      await createMember({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        joinDate: form.joinDate || new Date().toISOString().slice(0, 10),
      });
      toast.success("Member created");
      setDialogOpen(false);
      setForm({
        fullName: "",
        phone: "",
        email: "",
        age: "",
        gender: "",
        joinDate: new Date().toISOString().slice(0, 10),
      });
      await load();
    } catch (error) {
      toast.error(formatApiError(error, "Could not create member"));
    } finally {
      setSaving(false);
    }
  }

  async function onSuspend(m: GymMemberListItem) {
    try {
      await updateMember(m.id, { status: m.status === "suspended" ? "active" : "suspended" });
      toast.success(m.status === "suspended" ? "Member reactivated" : "Member suspended");
      await load();
    } catch (error) {
      toast.error(formatApiError(error, "Could not update member"));
    }
  }

  async function onDelete(m: GymMemberListItem) {
    if (!window.confirm(`Delete ${m.name}?`)) return;
    try {
      await deleteMember(m.id);
      toast.success("Member deleted");
      await load();
    } catch (error) {
      toast.error(formatApiError(error, "Could not delete member"));
    }
  }

  async function onInviteToApp(m: GymMemberListItem) {
    if (!m.email) {
      toast.error("Add an email on this member before inviting to the app");
      return;
    }
    try {
      const data = await inviteMemberToApp(m.id);
      if (data.emailSent) {
        toast.success(`Invite sent to ${m.email}`);
      } else if (data.invite.inviteUrl) {
        toast.message("Invite created (email skipped)", {
          description: data.invite.inviteUrl,
          duration: 12000,
        });
      } else {
        toast.success("Invite created");
      }
      await load();
    } catch (error) {
      toast.error(formatApiError(error, "Could not send invite"));
    }
  }

  async function onRevokeInvite(m: GymMemberListItem) {
    const inviteId = m.appAccess?.pendingInviteId;
    if (!inviteId) return;
    try {
      await revokeMemberAppInvite(inviteId);
      toast.success("Invite revoked");
      await load();
    } catch (error) {
      toast.error(formatApiError(error, "Could not revoke invite"));
    }
  }

  return (
    <div>
      <PageHeader
        badge="Members"
        title="All Members"
        description="Member operations — filter, sort and manage from one place."
        action={
          canWrite ? (
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={openCreateDialog}
            >
              <Plus className="mr-1 h-4 w-4" /> Add Member
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-4 p-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total Members" value={stats.totalMembers.toLocaleString("en-IN")} delta={0} icon={UserCheck} accent="primary" />
          <KpiCard label="Active Members" value={stats.activeMembers.toLocaleString("en-IN")} delta={0} icon={CalendarCheck} accent="success" />
          <KpiCard label="Expiring in 7 Days" value={String(stats.expiringThisWeek)} delta={0} icon={AlertTriangle} accent="warning" />
          <KpiCard label="Active Memberships" value={String(stats.activeMemberships)} delta={0} icon={Wallet} accent="lime" />
        </section>

        <Card className="border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Search name, code or phone…"
                className="border-border bg-background pl-9"
              />
            </div>
            <Select value={plan} onValueChange={(v) => { setPlan(v); setPage(1); }}>
              <SelectTrigger className="w-44 bg-background">
                <Filter className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="none">No plan</SelectItem>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-40 bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="frozen">Frozen</SelectItem>
              </SelectContent>
            </Select>
            {(q || plan !== "all" || status !== "all") && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
                Clear
              </Button>
            )}
            <span className="ml-auto text-sm text-muted-foreground whitespace-nowrap">
              {filtered.length} members
            </span>
          </div>
        </Card>

        <Card className="overflow-hidden border-border bg-card shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading members…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/60">
                    <SortHead label="Member" col="name" sort={sort} onSort={onSort} className="w-[280px] text-left" />
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plan</th>
                    <SortHead label="Joined" col="joinDate" sort={sort} onSort={onSort} className="text-left" />
                    <SortHead label="Expires" col="expiryDate" sort={sort} onSort={onSort} className="text-left" />
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <SortHead label="Visits" col="visits" sort={sort} onSort={onSort} className="text-left" />
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((m) => {
                    const sc = statusCfg[m.status] || statusCfg.active;
                    return (
                      <tr key={m.id} className="group transition-colors hover:bg-accent/20">
                        <td className="px-4 py-3">
                          <Link to="/members/$id" params={{ id: m.id }} className="flex min-w-0 items-center gap-3">
                            <Avatar className="h-9 w-9 shrink-0 ring-2 ring-border">
                              {m.photo ? <AvatarImage src={m.photo} /> : null}
                              <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                                {m.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-semibold leading-tight transition-colors group-hover:text-primary">
                                {m.name}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {m.memberCode} · {m.phone}
                              </p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {m.plan ? (
                            <Badge variant="outline" className="border-primary/40 bg-primary/10 font-medium text-primary">
                              {m.plan}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">No plan</span>
                          )}
                          {m.appAccess?.linked ? (
                            <div className="mt-1 text-[10px] font-medium text-success">App access</div>
                          ) : m.appAccess?.inviteStatus === "pending" ? (
                            <div className="mt-1 text-[10px] font-medium text-warning">Invite pending</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3"><RelativeDateCell iso={m.joinDate} variant="joined" /></td>
                        <td className="px-4 py-3"><RelativeDateCell iso={m.expiryDate} empty="No plan" variant="expiry" /></td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${sc.cls}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                            {m.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex min-w-[7.5rem] items-center gap-2.5">
                            <span className="w-8 shrink-0 tabular-nums text-sm font-medium text-foreground">
                              {m.attendance || 0}
                            </span>
                            <Progress
                              value={Math.round(((m.attendance || 0) / maxVisits) * 100)}
                              className="h-1.5 w-20 bg-muted"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem asChild>
                                <Link to="/members/$id" params={{ id: m.id }} className="flex cursor-pointer items-center gap-2">
                                  <Eye className="h-4 w-4" /> View Profile
                                </Link>
                              </DropdownMenuItem>
                              {canWrite && (
                                <>
                                  <DropdownMenuSeparator />
                                  {m.appAccess?.linked ? (
                                    <DropdownMenuItem disabled className="gap-2">
                                      <Smartphone className="h-4 w-4" /> App access active
                                    </DropdownMenuItem>
                                  ) : m.appAccess?.inviteStatus === "pending" ? (
                                    <DropdownMenuItem
                                      className="cursor-pointer gap-2"
                                      onClick={() => void onRevokeInvite(m)}
                                    >
                                      <Ban className="h-4 w-4" /> Revoke app invite
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      className="cursor-pointer gap-2"
                                      onClick={() => void onInviteToApp(m)}
                                    >
                                      <Send className="h-4 w-4" /> Invite to app
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => void onSuspend(m)}>
                                    <Ban className="h-4 w-4" />
                                    {m.status === "suspended" ? "Reactivate" : "Suspend"}
                                  </DropdownMenuItem>
                                </>
                              )}
                              {canDelete && (
                                <DropdownMenuItem
                                  className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                  onClick={() => void onDelete(m)}
                                >
                                  <Trash2 className="h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                  {list.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                          <p className="font-semibold">No members yet</p>
                          <p className="text-sm text-muted-foreground">
                            {canWrite ? "Add your first member to get started." : "Nothing to show."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > PER_PAGE && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Add member</DialogTitle>
            <DialogDescription>Create a gym member profile. Assign a plan from Membership Management.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Full name</Label>
              <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input
                inputMode="numeric"
                maxLength={10}
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))
                }
                placeholder="10-digit mobile"
              />
            </div>
            <div className="grid gap-2">
              <Label>Email (optional)</Label>
              <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Age</Label>
                <Input type="number" value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Gender</Label>
                <Select
                  value={form.gender || "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, gender: v === "none" ? "" : v as MemberGender }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Joined at</Label>
              <Input
                type="date"
                value={form.joinDate}
                onChange={(e) => setForm((f) => ({ ...f, joinDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground" onClick={() => void submitCreate()} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Create member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
