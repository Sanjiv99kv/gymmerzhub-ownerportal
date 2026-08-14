import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Salad,
  Users,
  X,
  Clock,
  ChevronRight,
  Loader2,
  Search,
  UserMinus,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatApiError } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";
import {
  assignDietPlan,
  fetchDietPlanAssignments,
  fetchDietPlans,
  unassignMemberDiet,
  type DietPlan,
  type DietPlanAssignment,
} from "@/lib/diet-api";
import { searchMembers, type MemberSearchHit } from "@/lib/membership-api";

export const Route = createFileRoute("/_app/diet")({
  head: () => ({ meta: [{ title: "Diet Plans — GymmerzHub" }] }),
  component: DietPage,
});

const tagColor: Record<string, string> = {
  "Fat Loss": "border-primary/40 bg-primary/10 text-primary",
  Bulk: "border-lime/40 bg-lime/10 text-lime",
  Sustain: "border-success/40 bg-success/10 text-success",
  "Plant-based": "border-warning/40 bg-warning/10 text-warning",
  Cut: "border-primary/40 bg-primary/10 text-primary",
  Cutting: "border-primary/40 bg-primary/10 text-primary",
};

/** Macro energy share from grams (P/C 4 kcal, F 9 kcal). */
function macroShare(protein: number, carbs: number, fat: number) {
  const p = Math.max(0, Number(protein) || 0) * 4;
  const c = Math.max(0, Number(carbs) || 0) * 4;
  const f = Math.max(0, Number(fat) || 0) * 9;
  const total = p + c + f;
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: Math.round((p / total) * 100),
    carbs: Math.round((c / total) * 100),
    fat: Math.round((f / total) * 100),
  };
}

function DietPage() {
  const session = getSession();
  const canWrite = hasPermission(session, "diet.write");

  const [plans, setPlans] = useState<DietPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [drawer, setDrawer] = useState<DietPlan | null>(null);

  const [assignPlan, setAssignPlan] = useState<DietPlan | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberHits, setMemberHits] = useState<MemberSearchHit[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberSearchHit | null>(null);
  const [searching, setSearching] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [membersPlan, setMembersPlan] = useState<DietPlan | null>(null);
  const [assignments, setAssignments] = useState<DietPlanAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);

  async function load(search?: string) {
    setLoading(true);
    try {
      setPlans(await fetchDietPlans({ q: search?.trim() || undefined }));
    } catch (error) {
      toast.error(formatApiError(error, "Could not load diet plans"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load(q);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [q]);

  useEffect(() => {
    if (!assignPlan && !drawer && !membersPlan) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [assignPlan, drawer, membersPlan]);

  useEffect(() => {
    if (!assignPlan) return;
    const term = memberQuery.trim();
    if (term.length < 1 || selectedMember) {
      setMemberHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      setSearching(true);
      void searchMembers(term)
        .then((rows) => setMemberHits(rows))
        .catch(() => setMemberHits([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [assignPlan, memberQuery, selectedMember]);

  function openAssign(p: DietPlan) {
    setAssignPlan(p);
    setMemberQuery("");
    setMemberHits([]);
    setSelectedMember(null);
  }

  function closeAssign() {
    setAssignPlan(null);
    setMemberQuery("");
    setMemberHits([]);
    setSelectedMember(null);
  }

  async function confirmAssign() {
    if (!assignPlan || !selectedMember) return;
    setAssigning(true);
    try {
      await assignDietPlan(assignPlan.id, { memberId: selectedMember.id });
      toast.success(`Assigned “${assignPlan.name}” to ${selectedMember.name}`);
      closeAssign();
      await load(q);
    } catch (error) {
      toast.error(formatApiError(error, "Could not assign diet plan"));
    } finally {
      setAssigning(false);
    }
  }

  async function loadAssignments(plan: DietPlan) {
    setLoadingAssignments(true);
    try {
      const rows = await fetchDietPlanAssignments(plan.id);
      setAssignments(rows);
    } catch (error) {
      toast.error(formatApiError(error, "Could not load assignments"));
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  }

  function openMembers(p: DietPlan) {
    setMembersPlan(p);
    void loadAssignments(p);
  }

  function closeMembers() {
    setMembersPlan(null);
    setAssignments([]);
  }

  async function confirmUnassign(row: DietPlanAssignment) {
    setUnassigningId(row.id);
    try {
      await unassignMemberDiet(row.memberId);
      toast.success("Diet plan removed from member");
      if (membersPlan) {
        await loadAssignments(membersPlan);
      }
      await load(q);
    } catch (error) {
      toast.error(formatApiError(error, "Could not unassign diet plan"));
    } finally {
      setUnassigningId(null);
    }
  }

  return (
    <div>
      <PageHeader
        badge="Nutrition"
        title="Diet Plans"
        description="Browse platform diet templates and assign them to gym members. Plans are authored by GymmerzHub admin."
      />

      <div className="grid gap-4 p-6 pb-0 md:grid-cols-4">
        {[
          { label: "Catalog Plans", value: plans.length.toString() },
          { label: "Members Enrolled", value: plans.reduce((s, p) => s + p.assigned, 0).toString() },
          {
            label: "Avg Daily Protein",
            value: `${Math.round(plans.reduce((s, p) => s + p.protein, 0) / (plans.length || 1))}g`,
          },
          {
            label: "Avg Daily Calories",
            value: `${Math.round(plans.reduce((s, p) => s + p.cal, 0) / (plans.length || 1))} kcal`,
          },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card px-4 py-3 shadow-card">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-0.5 font-display text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="px-6 pt-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search plans by name, tag, or goal…"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading diet plans…
        </div>
      ) : plans.length === 0 ? (
        <div className="m-6 rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Salad className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-display text-lg font-semibold">No published diet plans</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform admin publishes default plans here for your gym to assign.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 p-6 md:grid-cols-2">
          {plans.map((p) => {
            const tc = tagColor[p.tag] ?? "border-border bg-muted/30 text-muted-foreground";
            const share = macroShare(p.protein, p.carbs, p.fat);
            return (
              <Card
                key={p.id}
                className="flex flex-col overflow-hidden border-border bg-card shadow-card hover:border-primary/30"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                      <Salad className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="font-display text-lg leading-tight">{p.name}</CardTitle>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {p.tag ? (
                          <Badge variant="outline" className={`text-xs ${tc}`}>
                            {p.tag}
                          </Badge>
                        ) : null}
                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          onClick={() => openMembers(p)}
                        >
                          <Users className="h-3 w-3" /> {p.assigned} assigned
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {p.goal || "—"}
                  </p>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-3.5 pt-0">
                  <div className="grid grid-cols-5 divide-x divide-border rounded-xl border border-border bg-background/50 text-center">
                    {[
                      { label: "Cal", value: p.cal, unit: "kcal", highlight: true },
                      { label: "Protein", value: p.protein, unit: "g" },
                      { label: "Carbs", value: p.carbs, unit: "g" },
                      { label: "Fat", value: p.fat, unit: "g" },
                      { label: "Water", value: p.water, unit: "L" },
                    ].map(({ label, value, unit, highlight }) => (
                      <div key={label} className="px-1.5 py-2.5 sm:px-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                        <p
                          className={`font-display text-base font-bold leading-tight sm:text-lg ${highlight ? "text-primary" : ""}`}
                        >
                          {value}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{unit}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                      <div className="bg-primary transition-all" style={{ width: `${share.protein}%` }} />
                      <div className="bg-lime transition-all" style={{ width: `${share.carbs}%` }} />
                      <div className="bg-warning transition-all" style={{ width: `${share.fat}%` }} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-primary" /> Protein {share.protein}%
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-lime" /> Carbs {share.carbs}%
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-warning" /> Fat {share.fat}%
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {p.slots.map((slot) => (
                      <span
                        key={slot.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        <Clock className="h-3 w-3 shrink-0 text-primary" />
                        <span className="font-medium text-foreground">{slot.name}</span>
                        {slot.timeHint ? <span>· {slot.timeHint}</span> : null}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="min-w-0 flex-1 gap-1.5 text-sm"
                      onClick={() => setDrawer(p)}
                    >
                      View Full Plan <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    {canWrite ? (
                      <Button
                        className="min-w-0 flex-1 bg-gradient-primary text-sm text-primary-foreground shadow-glow"
                        onClick={() => openAssign(p)}
                      >
                        Assign to Member
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="min-w-0 flex-1 gap-1.5 text-sm"
                        onClick={() => openMembers(p)}
                      >
                        <Users className="h-3.5 w-3.5" /> Members
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {drawer && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setDrawer(null)} />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l border-border bg-card shadow-2xl">
            <div className="flex items-start justify-between border-b border-border px-6 py-5">
              <div>
                <h2 className="font-display text-lg font-bold leading-tight">{drawer.name}</h2>
                {drawer.tag ? (
                  <Badge variant="outline" className={`mt-1 text-xs ${tagColor[drawer.tag] ?? ""}`}>
                    {drawer.tag}
                  </Badge>
                ) : null}
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{drawer.goal || "—"}</p>
                <p className="mt-2 text-xs font-medium text-primary">
                  Daily target · {drawer.protein}g protein across {drawer.slots.length} meals
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setDrawer(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {drawer.slots.map((slot) => (
                <div key={slot.id} className="overflow-hidden rounded-xl border border-border bg-background/40">
                  <div className="flex items-center justify-between border-b border-border bg-background/60 px-4 py-2.5">
                    <div>
                      <span className="text-sm font-semibold">{slot.name}</span>
                      {slot.timeHint ? (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {slot.timeHint}
                        </span>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      ~{slot.targets.protein}g protein · {slot.targets.cal} kcal
                    </Badge>
                  </div>
                  <ul className="space-y-2 px-4 py-3">
                    {slot.items.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-lg border border-border/80 bg-card/50 px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-start gap-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-10 w-10 shrink-0 rounded-lg object-cover border border-border"
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium">
                                {item.name}
                                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                  {item.quantity}
                                  {item.servingUnit}
                                </span>
                              </p>
                              <span className="text-[11px] text-muted-foreground">
                                P {item.protein}g · C {item.carbs}g · F {item.fat}g · {item.calories} kcal
                              </span>
                            </div>
                            {item.notes ? (
                              <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {drawer.notes ? (
                <div className="rounded-xl border border-border bg-background/40 px-4 py-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Notes
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{drawer.notes}</p>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3 border-t border-border px-6 py-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  openMembers(drawer);
                  setDrawer(null);
                }}
              >
                <Users className="mr-1.5 h-3.5 w-3.5" />
                {drawer.assigned} Members
              </Button>
              {canWrite ? (
                <Button
                  className="flex-1 bg-gradient-primary text-primary-foreground"
                  onClick={() => {
                    openAssign(drawer);
                    setDrawer(null);
                  }}
                >
                  Assign
                </Button>
              ) : (
                <Button variant="outline" className="flex-1" onClick={() => setDrawer(null)}>
                  Close
                </Button>
              )}
            </div>
          </aside>
        </>
      )}

      {assignPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeAssign}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold">Assign “{assignPlan.name}”</h3>
            <p className="mt-1 text-sm text-muted-foreground">Search by name, phone, or member code.</p>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={memberQuery}
                onChange={(e) => {
                  setMemberQuery(e.target.value);
                  setSelectedMember(null);
                }}
                placeholder="Type to search members…"
              />
            </div>
            {selectedMember ? (
              <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                Selected: <span className="font-medium">{selectedMember.name}</span>
                <span className="text-muted-foreground"> · {selectedMember.memberCode}</span>
              </div>
            ) : (
              <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-border">
                {searching ? (
                  <p className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
                  </p>
                ) : memberHits.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                    {memberQuery.trim() ? "No members found" : "Start typing to search"}
                  </p>
                ) : (
                  memberHits.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="flex w-full items-center justify-between border-b border-border px-3 py-2.5 text-left text-sm last:border-0 hover:bg-accent"
                      onClick={() => {
                        setSelectedMember(m);
                        setMemberQuery(`${m.memberCode} · ${m.name}`);
                        setMemberHits([]);
                      }}
                    >
                      <span className="font-medium">{m.name}</span>
                      <span className="text-xs text-muted-foreground">{m.memberCode}</span>
                    </button>
                  ))
                )}
              </div>
            )}
            <div className="mt-5 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={closeAssign}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-gradient-primary text-primary-foreground"
                disabled={assigning || !selectedMember}
                onClick={() => void confirmAssign()}
              >
                {assigning ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Assign
              </Button>
            </div>
          </div>
        </div>
      )}

      {membersPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeMembers}
        >
          <div
            className="flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border px-6 py-5">
              <div>
                <h3 className="font-display text-lg font-bold">Assigned members</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {membersPlan.name}
                  <span className="text-muted-foreground/80"> · {membersPlan.assigned} active</span>
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={closeMembers}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingAssignments ? (
                <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </p>
              ) : assignments.length === 0 ? (
                <div className="py-10 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">No members on this plan yet.</p>
                  {canWrite ? (
                    <Button
                      className="mt-4 bg-gradient-primary text-primary-foreground"
                      onClick={() => {
                        const plan = membersPlan;
                        closeMembers();
                        openAssign(plan);
                      }}
                    >
                      Assign someone
                    </Button>
                  ) : null}
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {assignments.map((row) => {
                    const m = row.member;
                    return (
                      <li key={row.id} className="flex items-center gap-3 px-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{m?.name || "Unknown member"}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m?.memberCode || "—"}
                            {row.assignedAt ? ` · since ${row.assignedAt}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {m?.id ? (
                            <Button size="sm" variant="ghost" asChild>
                              <Link to="/members/$id" params={{ id: m.id }} onClick={closeMembers}>
                                View
                              </Link>
                            </Button>
                          ) : null}
                          {canWrite ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/30 text-destructive"
                              disabled={unassigningId === row.id}
                              onClick={() => void confirmUnassign(row)}
                            >
                              {unassigningId === row.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <UserMinus className="h-3.5 w-3.5" />
                              )}
                              <span className="ml-1">Remove</span>
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex gap-3 border-t border-border px-6 py-4">
              <Button variant="outline" className="flex-1" onClick={closeMembers}>
                Close
              </Button>
              {canWrite ? (
                <Button
                  className="flex-1 bg-gradient-primary text-primary-foreground"
                  onClick={() => {
                    const plan = membersPlan;
                    closeMembers();
                    openAssign(plan);
                  }}
                >
                  Assign another
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
