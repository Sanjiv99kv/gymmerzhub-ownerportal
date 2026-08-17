import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, Phone, Mail, Calendar, User2, Activity, Pencil, RefreshCcw,
  Wallet, PauseCircle, AlertOctagon, Trash2, Download, FileText, CheckCircle2,
  Clock3, Dumbbell, UtensilsCrossed, Target, TrendingUp, Flame, Star, Loader2,
  Smartphone, Send, Ban,
} from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, ResponsiveContainer, Tooltip, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatApiError } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";
import {
  createMemberNote,
  createMemberPayment,
  deleteMemberNote,
  fetchMemberDetailBundle,
  inviteMemberToApp,
  revokeMemberAppInvite,
  updateMember,
  type MemberGender,
} from "@/lib/membership-api";
import { unassignMemberDiet } from "@/lib/diet-api";
import { unassignMemberWorkout } from "@/lib/workout-api";
import {
  chartTooltipStyle as tooltipStyle,
  chartGrid,
  chartAxis,
  chartColors,
} from "@/lib/chart-theme";

export const Route = createFileRoute("/_app/members/$id")({
  loader: async ({ params }) => {
    try {
      return await fetchMemberDetailBundle(params.id);
    } catch {
      throw notFound();
    }
  },
  component: MemberDetail,
});

const weightTrend = [
  { m: "Jan", kg: 85 }, { m: "Feb", kg: 83 }, { m: "Mar", kg: 81 },
  { m: "Apr", kg: 79 }, { m: "May", kg: 78 }, { m: "Jun", kg: 77 },
];

const attendanceHistory = [
  { date: "2026-05-28", in: "06:45 AM", out: "08:20 AM", duration: "1h 35m" },
  { date: "2026-05-27", in: "07:10 AM", out: "08:05 AM", duration: "55m" },
  { date: "2026-05-25", in: "06:50 AM", out: "08:02 AM", duration: "1h 12m" },
  { date: "2026-05-24", in: "07:05 AM", out: "08:21 AM", duration: "1h 16m" },
];

const historyTypeColors: Record<string, string> = {
  join:     "bg-success text-success-foreground",
  purchase: "bg-lime text-lime-foreground",
  renew:    "bg-lime text-lime-foreground",
  discount: "bg-lime text-lime-foreground",
  upgrade:  "bg-warning text-warning-foreground",
  freeze:   "bg-muted-foreground text-background",
  resume:   "bg-success text-success-foreground",
};

function MemberDetail() {
  const router = useRouter();
  const session = getSession();
  const canWrite = hasPermission(session, "members.write");
  const canPay = hasPermission(session, "payments.write") || canWrite;
  const canDietWrite = hasPermission(session, "diet.write");
  const canWorkoutWrite = hasPermission(session, "workouts.write");

  const {
    member,
    history,
    payments,
    paymentSummary,
    activities,
    notes,
    diet,
    workout,
  } = Route.useLoaderData();

  const [payOpen, setPayOpen] = useState(false);
  const [paySaving, setPaySaving] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: "",
    method: "UPI",
    status: "paid",
    paidAt: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    age: "",
    gender: "" as "" | MemberGender,
    joinDate: "",
  });

  const appAccess = member.appAccess;
  const appLinked = Boolean(appAccess?.linked);
  const invitePending = appAccess?.inviteStatus === "pending";
  const inviteExpired = appAccess?.inviteStatus === "expired";

  const planName = member.currentMembership?.planName ?? null;
  const expiryDateRaw = member.currentMembership?.endDate ?? null;
  const membershipStart = member.currentMembership?.startDate ?? member.joinDate;

  const today = new Date();
  const joinDate = parseISO(member.joinDate || new Date().toISOString().slice(0, 10));
  const expiryDate = parseISO(expiryDateRaw || member.joinDate || new Date().toISOString().slice(0, 10));
  const totalDays = Math.max(1, daysBetween(joinDate, expiryDate));
  const usedDays = clamp(daysBetween(joinDate, today), 0, totalDays);
  const daysRemaining = expiryDateRaw ? Math.max(0, daysBetween(today, expiryDate)) : 0;
  const progressPct = expiryDateRaw ? Math.round((usedDays / totalDays) * 100) : 0;
  const outstanding = paymentSummary?.outstanding ?? 0;
  const totalPaid = paymentSummary?.totalPaid ?? 0;
  const statusTone = getStatusTone(member.status);
  const attendanceThisMonth = Math.max(0, Math.round((member.attendance || 0) * 0.2));

  async function refresh() {
    await router.invalidate();
  }

  async function onRecordPayment() {
    const amount = Number(payForm.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setPaySaving(true);
    try {
      await createMemberPayment(member.id, {
        amount,
        method: payForm.method,
        status: payForm.status,
        paidAt: payForm.paidAt,
        notes: payForm.notes.trim() || null,
      });
      toast.success("Payment recorded");
      setPayOpen(false);
      setPayForm({
        amount: "",
        method: "UPI",
        status: "paid",
        paidAt: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      await refresh();
    } catch (error) {
      toast.error(formatApiError(error, "Could not record payment"));
    } finally {
      setPaySaving(false);
    }
  }

  async function onSaveNote() {
    if (!noteDraft.trim()) {
      toast.error("Write a note first");
      return;
    }
    setNoteSaving(true);
    try {
      await createMemberNote(member.id, noteDraft.trim());
      toast.success("Note saved");
      setNoteDraft("");
      await refresh();
    } catch (error) {
      toast.error(formatApiError(error, "Could not save note"));
    } finally {
      setNoteSaving(false);
    }
  }

  async function onDeleteNote(noteId: string) {
    if (!window.confirm("Delete this note?")) return;
    try {
      await deleteMemberNote(member.id, noteId);
      toast.success("Note deleted");
      await refresh();
    } catch (error) {
      toast.error(formatApiError(error, "Could not delete note"));
    }
  }

  async function onInviteToApp() {
    if (!member.email) {
      toast.error("Add an email on this member before inviting to the app");
      return;
    }
    setInviteBusy(true);
    try {
      const data = await inviteMemberToApp(member.id);
      if (data.emailSent) {
        toast.success(`Invite sent to ${member.email}`);
      } else if (data.invite.inviteUrl) {
        toast.message("Invite created (email skipped)", {
          description: data.invite.inviteUrl,
          duration: 12000,
        });
      } else {
        toast.success("Invite created");
      }
      await refresh();
    } catch (error) {
      toast.error(formatApiError(error, "Could not send invite"));
    } finally {
      setInviteBusy(false);
    }
  }

  async function onRevokeInvite() {
    const inviteId = appAccess?.pendingInviteId;
    if (!inviteId) return;
    setInviteBusy(true);
    try {
      await revokeMemberAppInvite(inviteId);
      toast.success("Invite revoked");
      await refresh();
    } catch (error) {
      toast.error(formatApiError(error, "Could not revoke invite"));
    } finally {
      setInviteBusy(false);
    }
  }

  async function onUnassignDiet() {
    if (!window.confirm("Remove this member's diet plan?")) return;
    try {
      await unassignMemberDiet(member.id);
      toast.success("Diet plan removed");
      await refresh();
    } catch (error) {
      toast.error(formatApiError(error, "Could not remove diet plan"));
    }
  }

  async function onUnassignWorkout() {
    if (!window.confirm("Remove this member's workout plan?")) return;
    try {
      await unassignMemberWorkout(member.id);
      toast.success("Workout plan removed");
      await refresh();
    } catch (error) {
      toast.error(formatApiError(error, "Could not remove workout plan"));
    }
  }

  function openEdit() {
    setEditForm({
      fullName: member.fullName || "",
      phone: String(member.phone || "").replace(/\D/g, "").slice(0, 10),
      email: member.email || "",
      age: member.age != null ? String(member.age) : "",
      gender: (member.gender as MemberGender) || "",
      joinDate: member.joinDate || new Date().toISOString().slice(0, 10),
    });
    setEditOpen(true);
  }

  async function onSaveEdit() {
    if (editForm.fullName.trim().length < 2) {
      toast.error("Name is required");
      return;
    }
    if (!/^\d{10}$/.test(editForm.phone.trim())) {
      toast.error("Phone must be exactly 10 digits");
      return;
    }
    if (editForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
      toast.error("Enter a valid email");
      return;
    }
    if (!editForm.joinDate) {
      toast.error("Joined at is required");
      return;
    }
    setEditSaving(true);
    try {
      await updateMember(member.id, {
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim() || null,
        age: editForm.age ? Number(editForm.age) : null,
        gender: editForm.gender || null,
        joinDate: editForm.joinDate,
      });
      toast.success("Member updated");
      setEditOpen(false);
      await refresh();
    } catch (error) {
      toast.error(formatApiError(error, "Could not update member"));
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav Bar */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
        <Button asChild variant="ghost" size="sm">
          <Link to="/members">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Members
          </Link>
        </Button>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm text-muted-foreground">{member.fullName}</span>
        <span className="text-xs text-muted-foreground">· {member.memberCode}</span>
        <div className="ml-auto flex gap-2">
          {canWrite ? (
            <Button size="sm" variant="outline" onClick={openEdit}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
            </Button>
          ) : null}
          <Button size="sm" className="bg-gradient-primary text-primary-foreground shadow-glow">
            <RefreshCcw className="mr-1 h-3.5 w-3.5" /> Renew
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Hero Header Card */}
        <Card className="overflow-hidden border-border bg-card shadow-card">
          <div className="relative">
            <div className="h-28 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
            <div className="absolute inset-0 bg-hero opacity-40" />
          </div>
          <CardContent className="-mt-12 px-6 pb-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end">
              {/* Avatar */}
              <Avatar className="h-24 w-24 shrink-0 ring-4 ring-card shadow-glow">
                <AvatarImage src={member.photoUrl ?? undefined} />
                <AvatarFallback className="text-2xl font-bold">{member.fullName[0]}</AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 space-y-3 pt-2">
                <div>
                  <h1 className="font-display text-3xl font-bold leading-tight">{member.fullName}</h1>
                  <p className="text-sm text-muted-foreground">Membership ID: {member.memberCode}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={statusTone}>{member.status}</Badge>
                  {planName ? (
                    <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">{planName}</Badge>
                  ) : (
                    <Badge variant="outline">No plan</Badge>
                  )}
                  {appLinked ? (
                    <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
                      <Smartphone className="mr-1 h-3 w-3" /> App linked
                    </Badge>
                  ) : invitePending ? (
                    <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
                      <Smartphone className="mr-1 h-3 w-3" /> Invite pending
                    </Badge>
                  ) : inviteExpired ? (
                    <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                      <Smartphone className="mr-1 h-3 w-3" /> Invite expired
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <Smartphone className="mr-1 h-3 w-3" /> No app access
                    </Badge>
                  )}
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {member.phone}
                  </span>
                  {member.email ? (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" /> {member.email}
                    </span>
                  ) : null}
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> Joined {member.joinDate}
                  </span>
                  {(member.age || member.gender) ? (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <User2 className="h-3.5 w-3.5" /> {[member.age, member.gender].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 lg:shrink-0">
                {canPay ? (
                  <Button variant="outline" size="sm" onClick={() => setPayOpen(true)}>
                    <Wallet className="mr-1 h-3.5 w-3.5" /> Record Payment
                  </Button>
                ) : null}
                <Button variant="outline" size="sm">
                  <PauseCircle className="mr-1 h-3.5 w-3.5" /> Freeze
                </Button>
                <Button variant="outline" size="sm" className="text-warning border-warning/30 hover:bg-warning/10">
                  <AlertOctagon className="mr-1 h-3.5 w-3.5" /> Suspend
                </Button>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Grid: Left content + Right sidebar */}
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* LEFT */}
          <div className="space-y-6 min-w-0">

            {/* Membership Progress Card */}
            <Card className="border-border bg-card shadow-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-display">Current Membership</CardTitle>
                    <CardDescription>Plan lifecycle and status</CardDescription>
                  </div>
                  {daysRemaining === 0 && (
                    <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">Expired</Badge>
                  )}
                  {daysRemaining > 0 && daysRemaining <= 7 && (
                    <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">Expiring in {daysRemaining} days</Badge>
                  )}
                  {daysRemaining > 7 && (
                    <Badge variant="outline" className="border-success/40 bg-success/10 text-success">Active</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Plan", value: planName || "None", icon: Star },
                    {
                      label: "Amount Paid",
                      value: member.currentMembership?.priceCharged != null
                        ? `₹${Number(member.currentMembership.priceCharged).toLocaleString("en-IN")}`
                        : "—",
                      icon: Wallet,
                    },
                    { label: "Days Remaining", value: `${daysRemaining}`, icon: Clock3 },
                    {
                      label: "Discount",
                      value: member.currentMembership?.discount?.amount
                        ? `₹${Number(member.currentMembership.discount.amount).toLocaleString("en-IN")} (${member.currentMembership.discount.name})`
                        : "None",
                      icon: CheckCircle2,
                    },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-xl border border-border bg-background/50 p-3">
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" /> {label}
                      </div>
                      <div className="font-display text-base font-bold">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Started · {membershipStart}</span>
                    <span className="text-primary font-medium">{progressPct}% used</span>
                    <span>Expires · {expiryDateRaw || "—"}</span>
                  </div>
                  <Progress value={progressPct} className="h-3" />
                  <p className="text-xs text-muted-foreground">{usedDays} days used of {totalDays} total days</p>
                </div>

                {/* Plan + dates row */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <InfoPill label="Start Date" value={membershipStart} />
                  <InfoPill label="Expiry Date" value={expiryDateRaw} />
                  <InfoPill label="Payment Status" value={daysRemaining > 0 ? "Paid" : "Overdue"} />
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="history">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-card border border-border p-1.5">
                {["history", "payments", "attendance", "fitness", "plans", "admin"].map((v) => (
                  <TabsTrigger
                    key={v}
                    value={v}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium capitalize data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {v === "plans" ? "Workout & Diet" : v === "admin" ? "Admin Notes" : v.charAt(0).toUpperCase() + v.slice(1)}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Membership History */}
              <TabsContent value="history" className="mt-4">
                <Card className="border-border bg-card shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">Membership History</CardTitle>
                    <CardDescription>Timeline of all plan changes and activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {history.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">No membership history yet.</p>
                    ) : (
                      <div className="relative space-y-0">
                        {history.map((item, i) => (
                          <div key={item.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${historyTypeColors[item.type] || historyTypeColors.purchase}`} />
                              {i < history.length - 1 && <div className="my-1 w-px flex-1 bg-border" />}
                            </div>
                            <div className="flex flex-1 items-start justify-between gap-3 pb-5">
                              <div>
                                <p className="text-sm font-medium">{item.action}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.date} · {item.plan}
                                  {item.status !== "active" ? ` · ${item.status}` : ""}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold">{item.amountLabel}</p>
                                {item.discount ? (
                                  <p className="text-xs text-muted-foreground">
                                    Discount: {item.discount.label}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payments */}
              <TabsContent value="payments" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard title="Total Revenue" value={`₹${totalPaid.toLocaleString("en-IN")}`} icon={TrendingUp} />
                  <StatCard title="Transactions" value={String(paymentSummary?.transactionCount ?? payments.length)} icon={FileText} />
                  <StatCard title="Last Payment" value={paymentSummary?.lastPaymentDate || "—"} icon={Calendar} />
                  <StatCard title="Outstanding" value={`₹${outstanding.toLocaleString("en-IN")}`} icon={Wallet} />
                </div>
                <Card className="border-border bg-card shadow-card">
                  <CardHeader className="flex-row items-center justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="font-display">Transactions</CardTitle>
                      <CardDescription>Payment trail and collection status</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {canPay ? (
                        <Button size="sm" onClick={() => setPayOpen(true)}>
                          <Wallet className="mr-1 h-4 w-4" /> Record
                        </Button>
                      ) : null}
                      <Button variant="outline" size="sm"><Download className="mr-1 h-4 w-4" /> Receipt</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border bg-background/60">
                            {["Date", "Amount", "Discount", "Method", "Status"].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {payments.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                                No payments recorded yet.
                              </td>
                            </tr>
                          ) : payments.map((p) => {
                            const isPaid = p.status === "paid";
                            return (
                              <tr key={p.id} className="transition-colors hover:bg-accent/20">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{p.paidAt || "—"}</td>
                                <td className="px-4 py-3 font-display font-bold tabular-nums">
                                  ₹{p.amount.toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-3 text-sm text-muted-foreground">
                                  {p.discount
                                    ? `₹${p.discount.amount.toLocaleString("en-IN")} (${p.discount.name})`
                                    : "—"}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="rounded border border-border bg-background/60 px-2 py-0.5 text-xs font-medium">{p.method}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${isPaid ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning"}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${isPaid ? "bg-success" : "bg-warning"}`} />
                                    {p.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Attendance */}
              <TabsContent value="attendance" className="mt-4 space-y-4">
                {/* KPI row */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { title: "Total Visits",   value: member.attendance.toString(), icon: Activity, sub: "All time" },
                    { title: "Current Streak", value: "6 Days",                     icon: Flame,    sub: "🔥 Keep it up!" },
                    { title: "This Month",     value: attendanceThisMonth.toString(), icon: Calendar, sub: "days present" },
                    { title: "Last Check-In",  value: "Today",                      icon: Clock3,   sub: "6:45 AM" },
                  ].map(({ title, value, icon: Icon, sub }) => (
                    <div key={title} className="rounded-xl border border-border bg-card p-4 shadow-card">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{title}</span>
                        <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                      </div>
                      <p className="font-display text-2xl font-bold">{value}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Calendar */}
                <Card className="border-border bg-card shadow-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="font-display">Attendance Calendar</CardTitle>
                        <CardDescription>May 2026</CardDescription>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-sm bg-foreground/80" /> Present
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-sm bg-muted" /> Absent
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Day headers */}
                    <div className="mb-2 grid grid-cols-7 text-center">
                      {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                        <div key={d} className="py-1 text-[11px] font-semibold text-muted-foreground">{d}</div>
                      ))}
                    </div>
                    {/* Calendar cells */}
                    <div className="grid grid-cols-7 gap-1">
                      {/* 2 empty offset cells for May 2026 starting on Friday → offset 5 */}
                      {Array.from({ length: 5 }).map((_, i) => <div key={`e${i}`} />)}
                      {Array.from({ length: 31 }, (_, i) => {
                        const day = i + 1;
                        // pattern: absent on multiples of 5
                        const present = day % 5 !== 0;
                        return (
                          <div
                            key={day}
                            title={`May ${day}`}
                            className={`group relative flex h-9 w-full items-center justify-center rounded-lg text-xs font-medium transition-all
                              ${present
                                ? "bg-foreground/10 text-foreground hover:bg-foreground/20 border border-foreground/15"
                                : "bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-border"
                              }`}
                          >
                            {day}
                            {present && (
                              <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-foreground/60" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Summary bar */}
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-background/40 px-4 py-3">
                      <div className="text-center">
                        <p className="font-display text-lg font-bold text-foreground">25</p>
                        <p className="text-[11px] text-muted-foreground">Present</p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <p className="font-display text-lg font-bold text-muted-foreground">6</p>
                        <p className="text-[11px] text-muted-foreground">Absent</p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <p className="font-display text-lg font-bold text-primary">81%</p>
                        <p className="text-[11px] text-muted-foreground">Attendance Rate</p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <p className="font-display text-lg font-bold">6</p>
                        <p className="text-[11px] text-muted-foreground">Streak</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Attendance History Table */}
                <Card className="border-border bg-card shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">Recent Check-Ins</CardTitle>
                    <CardDescription>Detailed visit log</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border bg-background/60">
                            {["Date", "Check-In", "Check-Out", "Duration"].map((h, i) => (
                              <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${i === 3 ? "text-right" : "text-left"}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {attendanceHistory.map((row) => (
                            <tr key={row.date} className="transition-colors hover:bg-accent/20">
                              <td className="px-4 py-3 font-medium whitespace-nowrap">{row.date}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center rounded-md border border-border bg-background/60 px-2 py-0.5 font-mono text-xs font-medium">{row.in}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center rounded-md border border-border bg-muted/30 px-2 py-0.5 font-mono text-xs">{row.out}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary tabular-nums">{row.duration}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Fitness */}
              <TabsContent value="fitness" className="mt-4 space-y-4">
                <Card className="border-border bg-card shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">Body Measurements</CardTitle>
                    <CardDescription>Current stats and 6-month weight trend</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 lg:grid-cols-2">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { l: "Weight",  v: "77 kg" },
                        { l: "Height",  v: "175 cm" },
                        { l: "BMI",     v: "25.1" },
                        { l: "Chest",   v: "40 in" },
                        { l: "Waist",   v: "34 in" },
                        { l: "Arms",    v: "14 in" },
                        { l: "Thighs",  v: "22 in" },
                      ].map(({ l, v }) => (
                        <div key={l} className="rounded-xl border border-border bg-background/50 p-3">
                          <p className="text-xs text-muted-foreground">{l}</p>
                          <p className="mt-0.5 font-display text-lg font-bold">{v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium text-muted-foreground">Weight Trend (kg)</p>
                      <div className="flex-1 rounded-xl border border-border bg-background/30 p-3">
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={weightTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                            <XAxis dataKey="m" stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Line type="monotone" dataKey="kg" stroke={chartColors.secondary} strokeWidth={2.5} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">Fitness Goals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { l: "Goal",          v: "Weight Loss" },
                        { l: "Target Weight", v: "72 kg" },
                        { l: "Target Date",   v: "Sep 2026" },
                        { l: "Progress",      v: "62%" },
                      ].map(({ l, v }) => (
                        <div key={l} className="rounded-xl border border-border bg-background/50 p-3">
                          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Target className="h-3.5 w-3.5" /> {l}
                          </div>
                          <p className="font-display text-base font-bold">{v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress towards target</span>
                        <span className="font-medium text-foreground">62%</span>
                      </div>
                      <Progress value={62} className="h-2.5" />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Workout & Diet */}
              <TabsContent value="plans" className="mt-4 space-y-4">
                <Card className="border-border bg-card shadow-card">
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                    <div>
                      <CardTitle className="font-display">Workout Plan</CardTitle>
                      {workout?.assignedAt ? (
                        <p className="mt-1 text-xs text-muted-foreground">Assigned {workout.assignedAt}</p>
                      ) : null}
                    </div>
                    {canWorkoutWrite && workout ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/30"
                        onClick={() => void onUnassignWorkout()}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!workout?.plan ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        No workout plan assigned yet. Assign one from Workout Plans.
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {[
                            { l: "Plan", v: workout.plan.name },
                            { l: "Level", v: workout.plan.level || "—" },
                            { l: "Focus", v: workout.plan.focus || "—" },
                            { l: "Days", v: `${workout.plan.daysPerWeek || workout.plan.days.length}/week` },
                          ].map(({ l, v }) => (
                            <div key={l} className="rounded-xl border border-border bg-background/50 p-3">
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Dumbbell className="h-3.5 w-3.5" />{l}</p>
                              <p className="mt-0.5 font-medium text-sm">{v}</p>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-3">
                          {workout.plan.days.map((day, i) => (
                            <div key={`${day.name}-${i}`} className="rounded-xl border border-border bg-background/40 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold">{day.name}</span>
                                <span className="text-xs text-muted-foreground">{day.focus || `${day.exercises.length} exercises`}</span>
                              </div>
                              <div className="mt-3 space-y-2">
                                {day.exercises.map((ex, ei) => (
                                  <div key={`${ex.name}-${ei}`} className="flex items-center gap-3">
                                    <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted/40">
                                      {ex.imageUrl ? (
                                        <img src={ex.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                                      ) : (
                                        <div className="grid h-full place-items-center text-[10px] text-muted-foreground">—</div>
                                      )}
                                      {ex.videoUrl ? (
                                        <span className="absolute inset-0 grid place-items-center bg-black/30 text-[10px] font-bold text-white">▶</span>
                                      ) : null}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium">{ex.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {ex.targetMuscle ? `${ex.targetMuscle} · ` : ""}
                                        {ex.sets > 0 ? `${ex.sets}×` : ""}{ex.reps || "—"}
                                      </p>
                                    </div>
                                    {ex.videoUrl ? (
                                      <a
                                        href={ex.videoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="shrink-0 text-xs font-medium text-primary hover:underline"
                                      >
                                        Video
                                      </a>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        {workout.plan.notes ? (
                          <p className="text-xs leading-relaxed text-muted-foreground">{workout.plan.notes}</p>
                        ) : null}
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-card">
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                    <div>
                      <CardTitle className="font-display">Diet Plan</CardTitle>
                      {diet?.assignedAt ? (
                        <p className="mt-1 text-xs text-muted-foreground">Assigned {diet.assignedAt}</p>
                      ) : null}
                    </div>
                    {canDietWrite && diet ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/30"
                        onClick={() => void onUnassignDiet()}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!diet?.plan ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        No diet plan assigned yet. Assign one from Diet Plans.
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {[
                            { l: "Plan",       v: diet.plan.name },
                            { l: "Tag",        v: diet.plan.tag || "—" },
                            { l: "Daily Kcal", v: `${diet.plan.cal.toLocaleString("en-IN")}` },
                            { l: "Protein",    v: `${diet.plan.protein} g/day` },
                          ].map(({ l, v }) => (
                            <div key={l} className="rounded-xl border border-border bg-background/50 p-3">
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><UtensilsCrossed className="h-3.5 w-3.5" />{l}</p>
                              <p className="mt-0.5 font-medium text-sm">{v}</p>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-3">
                          {(diet.plan.days || []).flatMap((day) => day.slots.map((slot) => (
                            <div key={slot.id} className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-muted-foreground">
                                  Day {day.dayIndex} · {slot.name}
                                  {slot.timeHint ? (
                                    <span className="font-normal"> · {slot.timeHint}</span>
                                  ) : null}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  ~{slot.targets?.protein ?? 0}g protein · {slot.targets?.cal ?? 0} kcal
                                </span>
                              </div>
                              <div className="mt-2 space-y-2.5">
                                {(slot.options || []).map((option) => (
                                  <div key={option.id}>
                                    <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                                      {option.isDefault ? "Default option" : `Alternative ${option.sortOrder}`}
                                    </p>
                                    <ul className="space-y-1.5">
                                {option.items.map((item) => (
                                  <li key={item.id} className="flex items-start gap-2.5 text-sm">
                                    {item.imageUrl ? (
                                      <img
                                        src={item.imageUrl}
                                        alt={item.name}
                                        className="mt-0.5 h-8 w-8 shrink-0 rounded-md object-cover border border-border"
                                      />
                                    ) : null}
                                    <div className="min-w-0">
                                      <span className="font-medium">{item.name}</span>
                                      <span className="text-muted-foreground">
                                        {" "}
                                        · {item.quantity}
                                        {item.servingUnit} · P {item.protein}g · C {item.carbs}g · F{" "}
                                        {item.fat}g · {item.calories} kcal
                                      </span>
                                    </div>
                                  </li>
                                ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )))}
                        </div>
                        {diet.plan.notes ? (
                          <p className="text-xs text-muted-foreground leading-relaxed">{diet.plan.notes}</p>
                        ) : null}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Admin Notes */}
              <TabsContent value="admin" className="mt-4 space-y-4">
                <Card className="border-border bg-card shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">Staff Notes</CardTitle>
                    <CardDescription>Private — visible only to gym staff</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {canWrite ? (
                      <div className="space-y-3">
                        <Textarea
                          className="min-h-28 border-border bg-background/60 resize-none"
                          placeholder="Add a staff note…"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                        />
                        <Button
                          className="bg-gradient-primary text-primary-foreground shadow-glow"
                          onClick={() => void onSaveNote()}
                          disabled={noteSaving}
                        >
                          {noteSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Add Note
                        </Button>
                      </div>
                    ) : null}

                    {notes.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">No staff notes yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {notes.map((n) => (
                          <div key={n.id} className="rounded-xl border border-border bg-background/50 p-3">
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <p className="text-xs text-muted-foreground">
                                {n.createdBy || "Staff"}
                                {n.createdAt
                                  ? ` · ${new Date(n.createdAt).toLocaleString("en-IN")}`
                                  : ""}
                              </p>
                              {canWrite ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-destructive hover:text-destructive"
                                  onClick={() => void onDeleteNote(n.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              ) : null}
                            </div>
                            <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">Freeze Membership</CardTitle>
                    <CardDescription>Pause membership for vacation or medical break — duration is added to expiry</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="mb-1.5 text-xs text-muted-foreground">Start Date</p>
                        <Input type="date" className="border-border bg-background" />
                      </div>
                      <div>
                        <p className="mb-1.5 text-xs text-muted-foreground">End Date</p>
                        <Input type="date" className="border-border bg-background" />
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs text-muted-foreground">Reason</p>
                      <Input placeholder="e.g., Vacation, Surgery" className="border-border bg-background" />
                    </div>
                    <p className="rounded-lg border border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                      Example: 15 June to 30 June — 15 days will be added to your expiry date automatically.
                    </p>
                    <Button variant="outline" disabled>
                      <PauseCircle className="mr-2 h-4 w-4" /> Apply Freeze (coming soon)
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="sticky top-20 self-start space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto pb-4 scrollbar-none">
            {/* Quick Stats */}
            <Card className="border-border bg-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Status",         value: member.status,                             icon: Activity, tone: member.status === "active" ? "text-success" : "text-destructive" },
                    { label: "Days Left",      value: `${daysRemaining}d`,                        icon: Clock3,   tone: daysRemaining <= 7 ? "text-warning" : "" },
                    { label: "Plan",           value: planName || "None",                        icon: Star,     tone: "text-primary" },
                    { label: "Last Visit",     value: "Today",                                   icon: Calendar, tone: "" },
                    { label: "Total Visits",   value: member.attendance.toString(),              icon: Activity, tone: "" },
                    { label: "Trainer",        value: "Vikrant",                                 icon: User2,    tone: "" },
                    { label: "Total Paid",     value: `₹${totalPaid.toLocaleString("en-IN")}`,      icon: Wallet,   tone: "text-success" },
                    { label: "Outstanding",    value: `₹${outstanding.toLocaleString("en-IN")}`, icon: Wallet,   tone: outstanding > 0 ? "text-destructive" : "" },
                  ].map(({ label, value, icon: Icon, tone }) => (
                    <div key={label} className="rounded-xl border border-border bg-background/50 p-3">
                      <div className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Icon className="h-3 w-3" /> {label}
                      </div>
                      <p className={`font-display text-sm font-bold leading-tight ${tone}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* App Access */}
            <Card className="border-border bg-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" />
                  App Access
                </CardTitle>
                <CardDescription>Member mobile app account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-border bg-background/50 p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Status</p>
                  <p className={`font-display text-sm font-bold ${
                    appLinked ? "text-success"
                      : invitePending ? "text-warning"
                        : "text-muted-foreground"
                  }`}>
                    {appLinked ? "Linked"
                      : invitePending ? "Invite pending"
                        : inviteExpired ? "Invite expired"
                          : "Not invited"}
                  </p>
                  {invitePending && appAccess?.inviteExpiresAt ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Expires {new Date(appAccess.inviteExpiresAt).toLocaleString()}
                    </p>
                  ) : null}
                  {!member.email && !appLinked ? (
                    <p className="mt-1 text-xs text-warning">
                      Add an email to invite this member.
                    </p>
                  ) : null}
                </div>

                {canWrite ? (
                  <div className="space-y-2">
                    {appLinked ? (
                      <p className="text-xs text-muted-foreground">
                        This member can sign in to the GymmerzHub member app.
                      </p>
                    ) : invitePending ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                        disabled={inviteBusy}
                        onClick={() => void onRevokeInvite()}
                      >
                        {inviteBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Ban className="mr-1 h-3.5 w-3.5" />}
                        Revoke invite
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full bg-gradient-primary text-primary-foreground"
                        disabled={inviteBusy || !member.email}
                        onClick={() => void onInviteToApp()}
                      >
                        {inviteBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1 h-3.5 w-3.5" />}
                        {inviteExpired ? "Resend invite" : "Invite to app"}
                      </Button>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card className="border-border bg-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base">Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  <ol className="space-y-4">
                    {activities.map((a, i) => (
                      <li key={a.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary mt-1" />
                          {i < activities.length - 1 && <div className="mt-1 flex-1 w-px bg-border" />}
                        </div>
                        <div className="pb-4 min-w-0">
                          <p className="text-xs text-muted-foreground">{a.when}</p>
                          <p className="text-sm font-medium">{a.message}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Log a payment for {member.fullName}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Amount (₹)</p>
              <Input
                type="number"
                min={0}
                value={payForm.amount}
                onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Method</p>
                <Select value={payForm.method} onValueChange={(v) => setPayForm((f) => ({ ...f, method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Cash", "UPI", "Card", "Bank Transfer", "Online Gateway"].map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Status</p>
                <Select value={payForm.status} onValueChange={(v) => setPayForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["paid", "pending", "failed", "refunded"].map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Paid on</p>
              <Input
                type="date"
                value={payForm.paidAt}
                onChange={(e) => setPayForm((f) => ({ ...f, paidAt: e.target.value }))}
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Notes</p>
              <Textarea
                value={payForm.notes}
                onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))}
                className="min-h-20 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={() => void onRecordPayment()} disabled={paySaving}>
              {paySaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
            <DialogDescription>Update profile details for {member.fullName}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Full name</Label>
              <Input
                value={editForm.fullName}
                onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input
                inputMode="numeric"
                maxLength={10}
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  }))
                }
                placeholder="10-digit mobile"
              />
            </div>
            <div className="grid gap-2">
              <Label>Email (optional)</Label>
              <Input
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Age</Label>
                <Input
                  type="number"
                  value={editForm.age}
                  onChange={(e) => setEditForm((f) => ({ ...f, age: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Gender</Label>
                <Select
                  value={editForm.gender || "none"}
                  onValueChange={(v) =>
                    setEditForm((f) => ({ ...f, gender: v === "none" ? "" : (v as MemberGender) }))
                  }
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
                value={editForm.joinDate}
                onChange={(e) => setEditForm((f) => ({ ...f, joinDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>Cancel</Button>
            <Button onClick={() => void onSaveEdit()} disabled={editSaving}>
              {editSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/50 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium text-sm">{value}</p>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-border bg-card shadow-card">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{title}</p>
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <p className="font-display text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function daysBetween(a: Date, b: Date) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.ceil(
    (Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) -
      Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())) / ms,
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function getStatusTone(status: string) {
  if (status === "active")   return "border-success/40 bg-success/10 text-success";
  if (status === "expired")  return "border-destructive/40 bg-destructive/10 text-destructive";
  if (status === "frozen")   return "border-border bg-muted text-muted-foreground";
  return "border-warning/40 bg-warning/10 text-warning";
}
