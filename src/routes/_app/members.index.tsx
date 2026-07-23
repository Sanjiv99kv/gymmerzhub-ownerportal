import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search, Filter, Plus, Eye, Pencil, Ban, Trash2, Download,
  Wallet, CalendarCheck, UserCheck, AlertTriangle,
  MoreHorizontal, ChevronUp, ChevronDown, ChevronsUpDown,
  Clock, TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/topbar";
import { KpiCard } from "@/components/kpi-card";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { members } from "@/lib/data";

export const Route = createFileRoute("/_app/members/")({
  head: () => ({ meta: [{ title: "Members — GymmerzHub" }] }),
  component: MembersPage,
});

// ── Helpers ───────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.ceil(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
      Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / ms,
  );
}

function fmtShort(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  });
}

type SortKey = "name" | "joinDate" | "expiryDate" | "attendance";
type SortDir = "asc" | "desc";

const maxVisits = Math.max(...members.map((m) => m.attendance));

// ── Status styles ─────────────────────────────────────────────────────────

const statusCfg: Record<string, { cls: string; dot: string }> = {
  active:    { cls: "bg-success/10 text-success border-success/30",       dot: "bg-success"    },
  expired:   { cls: "bg-destructive/10 text-destructive border-destructive/30", dot: "bg-destructive" },
  suspended: { cls: "bg-warning/10 text-warning border-warning/30",       dot: "bg-warning"    },
};

const planCfg: Record<string, string> = {
  Monthly: "border-primary/40 bg-primary/10 text-primary",
  Yearly:  "border-lime/40 bg-lime/10 text-lime",
};

// ── Expiry cell ───────────────────────────────────────────────────────────

function ExpiryCell({ iso }: { iso: string }) {
  const days = daysBetween(new Date(), new Date(iso));
  let pill = "";
  if (days < 0)       pill = "bg-destructive/10 text-destructive";
  else if (days <= 7) pill = "bg-warning/10 text-warning";
  else if (days <= 30) pill = "bg-primary/10 text-primary";

  const label =
    days < 0   ? `${Math.abs(days)}d ago` :
    days === 0 ? "Today" :
    days === 1 ? "Tomorrow" :
                 `${days}d left`;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="whitespace-nowrap text-sm text-foreground">{fmtShort(iso)}</span>
      {pill && (
        <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${pill}`}>
          <Clock className="h-2.5 w-2.5" /> {label}
        </span>
      )}
    </div>
  );
}

// ── Visits bar ────────────────────────────────────────────────────────────

function VisitsBar({ value }: { value: number }) {
  const pct = Math.round((value / maxVisits) * 100);
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-7 text-right text-sm font-medium tabular-nums">{value}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Sort header ───────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────

function MembersPage() {
  const [q, setQ]         = useState("");
  const [plan, setPlan]   = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort]   = useState<{ key: SortKey; dir: SortDir }>({ key: "name", dir: "asc" });
  const [page, setPage]   = useState(1);
  const PER_PAGE = 10;

  const onSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );

  const filtered = members
    .filter(
      (m) =>
        (q ? m.name.toLowerCase().includes(q.toLowerCase()) || m.id.toLowerCase().includes(q.toLowerCase()) || m.phone.includes(q) : true) &&
        (plan === "all" || m.plan === plan) &&
        (status === "all" || m.status === status),
    )
    .sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "name")       return a.name.localeCompare(b.name) * dir;
      if (sort.key === "joinDate")   return a.joinDate.localeCompare(b.joinDate) * dir;
      if (sort.key === "expiryDate") return a.expiryDate.localeCompare(b.expiryDate) * dir;
      if (sort.key === "attendance") return (a.attendance - b.attendance) * dir;
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const list = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const activeCount  = members.filter((m) => m.status === "active").length;
  const expiringSoon = members.filter((m) => { const d = daysBetween(new Date(), new Date(m.expiryDate)); return d >= 0 && d <= 7; }).length;
  const monthlyRev   = members.reduce((s, m) => s + (m.plan === "Yearly" ? 13000 / 12 : 1500), 0);

  const resetFilters = () => { setQ(""); setPlan("all"); setStatus("all"); setPage(1); };

  return (
    <div>
      <PageHeader
        badge="Members"
        title="All Members"
        description="Member operations — filter, sort and manage from one place."
        action={
          <>
            <Button variant="outline"><Download className="mr-1 h-4 w-4" /> Export</Button>
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
              <Plus className="mr-1 h-4 w-4" /> Add Member
            </Button>
          </>
        }
      />

      <div className="space-y-4 p-6">
        {/* KPI strip */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total Members"       value={members.length.toLocaleString("en-IN")}                                   delta={12} icon={UserCheck}    accent="primary" />
          <KpiCard label="Active Members"      value={activeCount.toLocaleString("en-IN")}                                      delta={8}  icon={CalendarCheck} accent="success" />
          <KpiCard label="Expiring in 7 Days"  value={expiringSoon.toString()}                                                   delta={-3} icon={AlertTriangle} accent="warning" />
          <KpiCard label="Est. Monthly Revenue" value={`₹${Math.round(monthlyRev / 1000).toLocaleString("en-IN")}K`}            delta={5}  icon={Wallet}       accent="lime"    />
        </section>

        {/* Filter bar */}
        <Card className="border-border bg-card p-4 shadow-card">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Search name, ID or phone…"
                className="border-border bg-background pl-9"
              />
            </div>

            <Select value={plan} onValueChange={(v) => { setPlan(v); setPage(1); }}>
              <SelectTrigger className="w-36 bg-background">
                <Filter className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
                <SelectItem value="Yearly">Yearly</SelectItem>
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
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {filtered.length} of {members.length} members
              </span>
              {(q || plan !== "all" || status !== "all") && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-background/60">
                  <SortHead label="Member"  col="name"       sort={sort} onSort={onSort} className="w-[260px] text-left" />
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[100px]">Plan</th>
                  <SortHead label="Joined"  col="joinDate"   sort={sort} onSort={onSort} className="w-[120px] text-left" />
                  <SortHead label="Expires" col="expiryDate" sort={sort} onSort={onSort} className="w-[140px] text-left" />
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[110px]">Status</th>
                  <SortHead label="Visits"  col="attendance" sort={sort} onSort={onSort} className="w-[140px] text-left" />
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[60px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((m) => {
                  const sc = statusCfg[m.status];
                  return (
                    <tr key={m.id} className="group transition-colors hover:bg-accent/20">
                      {/* Member */}
                      <td className="px-4 py-3">
                        <Link to="/members/$id" params={{ id: m.id }} className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 shrink-0 ring-2 ring-border">
                            <AvatarImage src={m.photo} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">{m.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold truncate leading-tight group-hover:text-primary transition-colors">{m.name}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{m.id} · {m.phone}</p>
                          </div>
                        </Link>
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`whitespace-nowrap font-medium ${planCfg[m.plan]}`}>
                          {m.plan}
                        </Badge>
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {fmtShort(m.joinDate)}
                      </td>

                      {/* Expires */}
                      <td className="px-4 py-3">
                        <ExpiryCell iso={m.expiryDate} />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${sc.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                          {m.status}
                        </span>
                      </td>

                      {/* Visits */}
                      <td className="px-4 py-3">
                        <VisitsBar value={m.attendance} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem asChild>
                              <Link to="/members/$id" params={{ id: m.id }} className="flex items-center gap-2 cursor-pointer">
                                <Eye className="h-4 w-4" /> View Profile
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 cursor-pointer">
                              <Pencil className="h-4 w-4" /> Edit Member
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 cursor-pointer">
                              <TrendingUp className="h-4 w-4" /> Renew Plan
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 cursor-pointer text-warning focus:text-warning">
                              <Ban className="h-4 w-4" /> Suspend
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}

                {list.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-border bg-background">
                          <Search className="h-7 w-7 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold">No members found</p>
                          <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={resetFilters}>Clear filters</Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {filtered.length > PER_PAGE && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  size="sm" variant="outline" className="h-8"
                  disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "…")[]>((acc, p, i, arr) => {
                    if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "…"
                      ? <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">…</span>
                      : <Button
                          key={p}
                          size="sm"
                          variant={p === page ? "default" : "outline"}
                          className={`h-8 w-8 ${p === page ? "bg-gradient-primary text-primary-foreground shadow-glow" : ""}`}
                          onClick={() => setPage(p as number)}
                        >
                          {p}
                        </Button>
                  )}
                <Button
                  size="sm" variant="outline" className="h-8"
                  disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
