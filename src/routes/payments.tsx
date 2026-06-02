import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Wallet, Clock, RefreshCcw, Download, Search,
  MoreHorizontal, Receipt, Eye, FileText,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from "lucide-react";
import { PageHeader } from "@/components/topbar";
import { KpiCard } from "@/components/kpi-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { payments } from "@/lib/data";

export const Route = createFileRoute("/payments")({
  head: () => ({ meta: [{ title: "Payments — FitSaathi" }] }),
  component: PaymentsPage,
});

// ── Config ─────────────────────────────────────────────────────────────────

const methodCfg: Record<string, { cls: string; dot: string }> = {
  UPI:            { cls: "border-lime/40 bg-lime/10 text-lime",         dot: "bg-lime"    },
  Card:           { cls: "border-primary/40 bg-primary/10 text-primary", dot: "bg-primary" },
  Cash:           { cls: "border-warning/40 bg-warning/10 text-warning", dot: "bg-warning" },
  "Bank Transfer":{ cls: "border-success/40 bg-success/10 text-success", dot: "bg-success" },
};

const statusCfg: Record<string, { cls: string; dot: string }> = {
  paid:    { cls: "bg-success/10 text-success border-success/30",         dot: "bg-success"    },
  pending: { cls: "bg-warning/10 text-warning border-warning/30",         dot: "bg-warning"    },
  failed:  { cls: "bg-destructive/10 text-destructive border-destructive/30", dot: "bg-destructive" },
};

type SortKey = "member" | "amount" | "date";
type SortDir = "asc" | "desc";

function fmtShort(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  });
}

// ── Sort header ─────────────────────────────────────────────────────────────

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

// ── Page ───────────────────────────────────────────────────────────────────

const PER_PAGE = 10;

function PaymentsPage() {
  const [q, setQ]           = useState("");
  const [method, setMethod] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort]     = useState<{ key: SortKey; dir: SortDir }>({ key: "date", dir: "desc" });
  const [page, setPage]     = useState(1);

  const onSort = (key: SortKey) =>
    setSort((p) => p.key === key ? { key, dir: p.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });

  const filtered = payments
    .filter((p) =>
      (q ? p.member.toLowerCase().includes(q.toLowerCase()) || p.id.toLowerCase().includes(q.toLowerCase()) : true) &&
      (method === "all" || p.method === method) &&
      (status === "all" || p.status === status),
    )
    .sort((a, b) => {
      const d = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "member") return a.member.localeCompare(b.member) * d;
      if (sort.key === "amount") return (a.amount - b.amount) * d;
      if (sort.key === "date")   return a.date.localeCompare(b.date) * d;
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const list = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalRev  = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const pending   = payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  const reset = () => { setQ(""); setMethod("all"); setStatus("all"); setPage(1); };

  return (
    <div>
      <PageHeader
        badge="Finance"
        title="Payments"
        description="Track revenue, pending dues and renewals across all members."
        action={
          <>
            <Button variant="outline"><Download className="mr-1 h-4 w-4" /> Export</Button>
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow">Record Payment</Button>
          </>
        }
      />

      <div className="space-y-5 p-6">
        {/* KPI strip */}
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard label="Total Revenue"    value={`₹${(totalRev / 100000).toFixed(1)}L`} delta={18} icon={Wallet}      accent="primary" />
          <KpiCard label="Pending Amount"   value={`₹${Math.round(pending / 1000)}K`}      delta={-6} icon={Clock}       accent="warning" />
          <KpiCard label="Renewals Due"     value="32"                                       delta={4}  icon={RefreshCcw} accent="lime"    />
        </div>

        {/* Filter bar */}
        <Card className="border-border bg-card p-4 shadow-card">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Search member or transaction ID…"
                className="border-border bg-background pl-9"
              />
            </div>

            <Select value={method} onValueChange={(v) => { setMethod(v); setPage(1); }}>
              <SelectTrigger className="w-36 bg-background"><SelectValue placeholder="Method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-36 bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-2">
              <span className="whitespace-nowrap text-sm text-muted-foreground">
                {filtered.length} of {payments.length} records
              </span>
              {(q || method !== "all" || status !== "all") && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={reset}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-background/60">
                  <SortHead label="Member"  col="member" sort={sort} onSort={onSort} className="w-[240px] text-left" />
                  <SortHead label="Amount"  col="amount" sort={sort} onSort={onSort} className="w-[130px] text-left" />
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[130px]">Method</th>
                  <SortHead label="Date"    col="date"   sort={sort} onSort={onSort} className="w-[140px] text-left" />
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[110px]">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[60px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((p) => {
                  const mc = methodCfg[p.method] ?? { cls: "border-border bg-muted/30 text-muted-foreground", dot: "bg-muted-foreground" };
                  const sc = statusCfg[p.status] ?? statusCfg.pending;
                  return (
                    <tr key={p.id} className="group transition-colors hover:bg-accent/20">
                      {/* Member */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 shrink-0 ring-2 ring-border">
                            <AvatarImage src={p.photo} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">{p.member[0]}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold truncate leading-tight">{p.member}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3">
                        <span className="font-display text-base font-bold tabular-nums">
                          ₹{p.amount.toLocaleString("en-IN")}
                        </span>
                      </td>

                      {/* Method */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${mc.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${mc.dot}`} />
                          {p.method}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {fmtShort(p.date)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${sc.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                          {p.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem className="gap-2 cursor-pointer">
                              <Receipt className="h-4 w-4" /> Download Receipt
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 cursor-pointer">
                              <FileText className="h-4 w-4" /> View Invoice
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link to="/members/$id" params={{ id: p.memberId ?? "" }} className="flex items-center gap-2 cursor-pointer">
                                <Eye className="h-4 w-4" /> View Member
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}

                {list.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-border bg-background">
                          <Search className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold">No transactions found</p>
                          <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={reset}>Clear filters</Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > PER_PAGE && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" className="h-8" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button key={p} size="sm" variant={p === page ? "default" : "outline"}
                    className={`h-8 w-8 ${p === page ? "bg-gradient-primary text-primary-foreground shadow-glow" : ""}`}
                    onClick={() => setPage(p)}>{p}</Button>
                ))}
                <Button size="sm" variant="outline" className="h-8" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
