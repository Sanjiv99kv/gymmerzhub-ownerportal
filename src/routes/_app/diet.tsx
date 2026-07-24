import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Salad, Plus, Pencil, Trash2,
  Users, X, Check, Clock, ChevronRight, Loader2, Search, Split, UserMinus,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatApiError } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";
import {
  assignDietPlan,
  createDietPlan,
  deleteDietPlan,
  fetchDietPlanAssignments,
  fetchDietPlans,
  unassignMemberDiet,
  updateDietPlan,
  type DietMealOption,
  type DietMealSlot,
  type DietPlan,
  type DietPlanAssignment,
} from "@/lib/diet-api";
import { searchMembers, type MemberSearchHit } from "@/lib/membership-api";

export const Route = createFileRoute("/_app/diet")({
  head: () => ({ meta: [{ title: "Diet Plans — GymmerzHub" }] }),
  component: DietPage,
});

type DietForm = {
  name: string;
  tag: string;
  goal: string;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
  meals: DietMealSlot[];
  notes: string;
};

const tagColor: Record<string, string> = {
  "Fat Loss": "border-primary/40 bg-primary/10 text-primary",
  Bulk: "border-lime/40 bg-lime/10 text-lime",
  Sustain: "border-success/40 bg-success/10 text-success",
  "Plant-based": "border-warning/40 bg-warning/10 text-warning",
  Cut: "border-primary/40 bg-primary/10 text-primary",
};

function emptyOption(protein = 0): DietMealOption {
  return { label: "", items: [""], protein, carbs: 0, fat: 0, cal: 0 };
}

function emptySlot(index: number, proteinTarget = 0): DietMealSlot {
  return {
    name: `Meal ${index + 1}`,
    time: "",
    targets: { protein: proteinTarget, carbs: 0, fat: 0, cal: 0 },
    options: [emptyOption(proteinTarget)],
  };
}

function emptyForm(): DietForm {
  const protein = 120;
  const slots = 4;
  const per = Math.round(protein / slots);
  return {
    name: "",
    tag: "Cut",
    goal: "",
    cal: 2000,
    protein,
    carbs: 180,
    fat: 60,
    water: 3,
    meals: Array.from({ length: slots }, (_, i) => emptySlot(i, per)),
    notes: "",
  };
}

function splitProtein(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const rem = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < rem ? 1 : 0));
}

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
  const [saving, setSaving] = useState(false);
  const [drawer, setDrawer] = useState<DietPlan | null>(null);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<DietPlan | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const slotProteinSum = useMemo(
    () => form.meals.reduce((s, m) => s + (Number(m.targets.protein) || 0), 0),
    [form.meals],
  );

  async function load() {
    setLoading(true);
    try {
      setPlans(await fetchDietPlans());
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
    if (!modal && !deleteId && !assignPlan && !drawer && !membersPlan) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modal, deleteId, assignPlan, drawer, membersPlan]);

  const openAdd = () => {
    setForm(emptyForm());
    setEditTarget(null);
    setModal("add");
  };

  const openEdit = (p: DietPlan) => {
    setEditTarget(p);
    setForm({
      name: p.name,
      tag: p.tag,
      goal: p.goal,
      cal: p.cal,
      protein: p.protein,
      carbs: p.carbs,
      fat: p.fat,
      water: p.water,
      meals: p.meals.map((m) => ({
        ...m,
        targets: { ...m.targets },
        options: m.options.map((o) => ({ ...o, items: [...o.items] })),
      })),
      notes: p.notes,
    });
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setEditTarget(null);
  };

  function applyProteinSplit() {
    const total = Number(form.protein) || 0;
    const count = form.meals.length || 1;
    const parts = splitProtein(total, count);
    setForm((f) => ({
      ...f,
      meals: f.meals.map((m, i) => ({
        ...m,
        targets: { ...m.targets, protein: parts[i] ?? 0 },
        options: m.options.map((o) => ({
          ...o,
          protein: o.protein || parts[i] || 0,
        })),
      })),
    }));
    toast.success(`Split ${total}g protein across ${count} meals`);
  }

  function setMealCount(count: number) {
    const n = Math.min(10, Math.max(1, count));
    const parts = splitProtein(Number(form.protein) || 0, n);
    setForm((f) => {
      const next = Array.from({ length: n }, (_, i) => {
        const existing = f.meals[i];
        if (existing) {
          return {
            ...existing,
            targets: { ...existing.targets, protein: parts[i] ?? 0 },
          };
        }
        return emptySlot(i, parts[i] ?? 0);
      });
      return { ...f, meals: next };
    });
  }

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Plan name is required");
      return;
    }

    const meals = form.meals
      .map((m) => ({
        name: m.name.trim(),
        time: m.time.trim(),
        targets: {
          protein: Number(m.targets.protein) || 0,
          carbs: Number(m.targets.carbs) || 0,
          fat: Number(m.targets.fat) || 0,
          cal: Number(m.targets.cal) || 0,
        },
        options: m.options
          .map((o) => ({
            label: o.label.trim(),
            items: o.items.map((it) => it.trim()).filter(Boolean),
            protein: Number(o.protein) || 0,
            carbs: Number(o.carbs) || 0,
            fat: Number(o.fat) || 0,
            cal: Number(o.cal) || 0,
          }))
          .filter((o) => o.label && o.items.length > 0),
      }))
      .filter((m) => m.name && m.options.length > 0);

    if (meals.length === 0) {
      toast.error("Add at least one meal with options");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        tag: form.tag.trim() || null,
        goal: form.goal.trim() || null,
        cal: Number(form.cal) || 0,
        protein: Number(form.protein) || 0,
        carbs: Number(form.carbs) || 0,
        fat: Number(form.fat) || 0,
        water: Number(form.water) || 0,
        meals,
        notes: form.notes.trim() || null,
      };
      if (modal === "add") {
        const plan = await createDietPlan(payload);
        setPlans((prev) => [...prev, plan]);
        toast.success("Diet plan created");
      } else if (modal === "edit" && editTarget) {
        const plan = await updateDietPlan(editTarget.id, payload);
        setPlans((prev) => prev.map((p) => (p.id === plan.id ? plan : p)));
        if (drawer?.id === plan.id) setDrawer(plan);
        toast.success("Diet plan updated");
      }
      closeModal();
    } catch (error) {
      toast.error(formatApiError(error, "Could not save diet plan"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setSaving(true);
    try {
      await deleteDietPlan(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
      setDeleteId(null);
      if (drawer?.id === id) setDrawer(null);
      toast.success("Diet plan deleted");
    } catch (error) {
      toast.error(formatApiError(error, "Could not delete diet plan"));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!assignPlan) return;
    const q = memberQuery.trim();
    if (q.length < 1) {
      setMemberHits([]);
      return;
    }
    const t = setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          setMemberHits(await searchMembers(q, 12));
        } catch {
          setMemberHits([]);
        } finally {
          setSearching(false);
        }
      })();
    }, 250);
    return () => clearTimeout(t);
  }, [memberQuery, assignPlan]);

  function openAssign(p: DietPlan) {
    setAssignPlan(p);
    setMemberQuery("");
    setMemberHits([]);
    setSelectedMember(null);
  }

  function closeAssign() {
    setAssignPlan(null);
    setSelectedMember(null);
    setMemberQuery("");
    setMemberHits([]);
  }

  async function confirmAssign() {
    if (!assignPlan || !selectedMember) {
      toast.error("Select a member first");
      return;
    }
    setAssigning(true);
    try {
      await assignDietPlan(assignPlan.id, { memberId: selectedMember.id });
      toast.success(`Assigned “${assignPlan.name}” to ${selectedMember.name}`);
      closeAssign();
      await load();
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
      setMembersPlan((prev) =>
        prev && prev.id === plan.id ? { ...prev, assigned: rows.length } : prev,
      );
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, assigned: rows.length } : p)),
      );
    } catch (error) {
      toast.error(formatApiError(error, "Could not load assigned members"));
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  }

  function openMembers(p: DietPlan) {
    setMembersPlan(p);
    setAssignments([]);
    void loadAssignments(p);
  }

  function closeMembers() {
    setMembersPlan(null);
    setAssignments([]);
    setUnassigningId(null);
  }

  async function confirmUnassign(row: DietPlanAssignment) {
    const name = row.member?.name || "this member";
    if (!window.confirm(`Remove diet plan from ${name}?`)) return;
    setUnassigningId(row.id);
    try {
      await unassignMemberDiet(row.memberId);
      toast.success(`Unassigned ${name}`);
      setAssignments((prev) => prev.filter((a) => a.id !== row.id));
      setPlans((prev) =>
        prev.map((p) =>
          p.id === row.dietPlanId
            ? { ...p, assigned: Math.max(0, p.assigned - 1) }
            : p,
        ),
      );
      setMembersPlan((prev) =>
        prev && prev.id === row.dietPlanId
          ? { ...prev, assigned: Math.max(0, prev.assigned - 1) }
          : prev,
      );
      if (drawer?.id === row.dietPlanId) {
        setDrawer((prev) =>
          prev ? { ...prev, assigned: Math.max(0, prev.assigned - 1) } : prev,
        );
      }
    } catch (error) {
      toast.error(formatApiError(error, "Could not unassign diet plan"));
    } finally {
      setUnassigningId(null);
    }
  }

  function updateSlot(si: number, patch: Partial<DietMealSlot>) {
    setForm((f) => ({
      ...f,
      meals: f.meals.map((m, i) => (i === si ? { ...m, ...patch } : m)),
    }));
  }

  function updateOption(si: number, oi: number, patch: Partial<DietMealOption>) {
    setForm((f) => ({
      ...f,
      meals: f.meals.map((m, i) => {
        if (i !== si) return m;
        return {
          ...m,
          options: m.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)),
        };
      }),
    }));
  }

  return (
    <div>
      <PageHeader
        badge="Nutrition"
        title="Diet Plans"
        description="Daily macro targets split across meals — each meal has swap options that hit the same protein goal."
        action={
          canWrite ? (
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow" onClick={openAdd}>
              <Plus className="mr-1 h-4 w-4" /> Build Plan
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 p-6 pb-0 md:grid-cols-4">
        {[
          { label: "Total Plans", value: plans.length.toString() },
          { label: "Members Enrolled", value: plans.reduce((s, p) => s + p.assigned, 0).toString() },
          { label: "Avg Daily Protein", value: `${Math.round(plans.reduce((s, p) => s + p.protein, 0) / (plans.length || 1))}g` },
          { label: "Avg Daily Calories", value: `${Math.round(plans.reduce((s, p) => s + p.cal, 0) / (plans.length || 1))} kcal` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card px-4 py-3 shadow-card">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-0.5 font-display text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading diet plans…
        </div>
      ) : plans.length === 0 ? (
        <div className="m-6 rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Salad className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-display text-lg font-semibold">No diet plans yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Set a daily protein target, split into meals, and add food options for each slot.
          </p>
          {canWrite ? (
            <Button className="mt-4 bg-gradient-primary text-primary-foreground" onClick={openAdd}>
              <Plus className="mr-1 h-4 w-4" /> Build Plan
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-5 p-6 md:grid-cols-2">
          {plans.map((p) => {
            const tc = tagColor[p.tag] ?? "border-border bg-muted/30 text-muted-foreground";
            const share = macroShare(p.protein, p.carbs, p.fat);
            return (
              <Card key={p.id} className="flex flex-col overflow-hidden border-border bg-card shadow-card hover:border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                        <Salad className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="font-display text-lg leading-tight">{p.name}</CardTitle>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {p.tag ? <Badge variant="outline" className={`text-xs ${tc}`}>{p.tag}</Badge> : null}
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
                    {canWrite ? (
                      <div className="flex shrink-0 gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{p.goal || "—"}</p>
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
                        <p className={`font-display text-base font-bold leading-tight sm:text-lg ${highlight ? "text-primary" : ""}`}>
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
                    {p.meals.map((m, i) => (
                      <span
                        key={`${m.name}-${i}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        <Clock className="h-3 w-3 shrink-0 text-primary" />
                        <span className="font-medium text-foreground">{m.name}</span>
                        {m.time ? <span>· {m.time}</span> : null}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto flex gap-2 pt-1">
                    <Button variant="outline" className="min-w-0 flex-1 gap-1.5 text-sm" onClick={() => setDrawer(p)}>
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
                      <Button variant="outline" className="min-w-0 flex-1 gap-1.5 text-sm" onClick={() => openMembers(p)}>
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
                  <Badge variant="outline" className={`mt-1 text-xs ${tagColor[drawer.tag] ?? ""}`}>{drawer.tag}</Badge>
                ) : null}
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{drawer.goal || "—"}</p>
                <p className="mt-2 text-xs font-medium text-primary">
                  Daily target · {drawer.protein}g protein across {drawer.meals.length} meals
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setDrawer(null)}><X className="h-4 w-4" /></Button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {drawer.meals.map((meal, mi) => (
                <div key={mi} className="overflow-hidden rounded-xl border border-border bg-background/40">
                  <div className="flex items-center justify-between border-b border-border bg-background/60 px-4 py-2.5">
                    <div>
                      <span className="text-sm font-semibold">{meal.name}</span>
                      {meal.time ? (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {meal.time}
                        </span>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      Pick any · ~{meal.targets.protein}g protein
                    </Badge>
                  </div>
                  <div className="space-y-3 px-4 py-3">
                    {meal.options.map((opt, oi) => (
                      <div key={oi} className="rounded-lg border border-border/80 bg-card/50 px-3 py-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">Option {oi + 1}: {opt.label}</p>
                          <span className="text-[11px] text-muted-foreground">
                            P {opt.protein}g · C {opt.carbs}g · F {opt.fat}g · {opt.cal} kcal
                          </span>
                        </div>
                        <ul className="mt-1.5 space-y-1">
                          {opt.items.map((item, ii) => (
                            <li key={ii} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {drawer.notes ? (
                <div className="rounded-xl border border-border bg-background/40 px-4 py-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
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
                <>
                  <Button variant="outline" className="flex-1" onClick={() => { openEdit(drawer); setDrawer(null); }}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-primary text-primary-foreground"
                    onClick={() => { openAssign(drawer); setDrawer(null); }}
                  >
                    Assign
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="flex-1" onClick={() => setDrawer(null)}>Close</Button>
              )}
            </div>
          </aside>
        </>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/60 p-4 backdrop-blur-sm" onClick={closeModal}>
          <div
            className="relative flex max-h-[min(90vh,880px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-xl font-bold">
                {modal === "add" ? "Build Diet Plan" : "Edit Diet Plan"}
              </h2>
              <Button size="icon" variant="ghost" onClick={closeModal}><X className="h-4 w-4" /></Button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Plan Name *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cut · 120g protein" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tag</label>
                  <Input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="Cut, Bulk, Sustain…" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Goal</label>
                <Textarea
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                  placeholder="Hit daily protein with flexible meal options…"
                  className="min-h-16 resize-none"
                />
              </div>

              <div className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daily targets</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {([
                    { key: "cal", label: "Calories", unit: "kcal" },
                    { key: "protein", label: "Protein", unit: "g" },
                    { key: "carbs", label: "Carbs", unit: "g" },
                    { key: "fat", label: "Fat", unit: "g" },
                    { key: "water", label: "Water", unit: "L" },
                  ] as const).map(({ key, label, unit }) => (
                    <div key={key}>
                      <label className="mb-1 block text-[10px] text-muted-foreground">{label} ({unit})</label>
                      <Input
                        type="number"
                        value={form[key] || ""}
                        onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <label className="text-xs text-muted-foreground">Meals</label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    className="h-8 w-20"
                    value={form.meals.length}
                    onChange={(e) => setMealCount(Number(e.target.value) || 1)}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={applyProteinSplit}>
                    <Split className="mr-1 h-3.5 w-3.5" />
                    Split {form.protein || 0}g protein evenly
                  </Button>
                  <span className={`text-xs ${slotProteinSum === form.protein ? "text-success" : "text-warning"}`}>
                    Slots total {slotProteinSum}g / daily {form.protein}g
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Meal slots & options
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const per = Math.round((Number(form.protein) || 0) / (form.meals.length + 1));
                      setForm((f) => ({ ...f, meals: [...f.meals, emptySlot(f.meals.length, per)] }));
                    }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add meal
                  </Button>
                </div>

                {form.meals.map((meal, si) => (
                  <div key={si} className="space-y-3 rounded-xl border border-border bg-background/40 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid flex-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[10px] text-muted-foreground">Meal name</label>
                          <Input
                            className="h-8 text-sm"
                            value={meal.name}
                            onChange={(e) => updateSlot(si, { name: e.target.value })}
                            placeholder="Meal 1 / Breakfast"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] text-muted-foreground">Time hint</label>
                          <Input
                            className="h-8 text-sm"
                            value={meal.time}
                            onChange={(e) => updateSlot(si, { time: e.target.value })}
                            placeholder="7–9 AM"
                          />
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="mt-5 h-8 w-8 shrink-0 text-destructive"
                        onClick={() => setForm((f) => ({ ...f, meals: f.meals.filter((_, i) => i !== si) }))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div>
                      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Meal targets
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {([
                          { key: "protein", label: "Protein (g)" },
                          { key: "carbs", label: "Carbs (g)" },
                          { key: "fat", label: "Fat (g)" },
                          { key: "cal", label: "Calories" },
                        ] as const).map(({ key, label }) => (
                          <div key={key}>
                            <label className="mb-1 block text-[10px] text-muted-foreground">{label}</label>
                            <Input
                              type="number"
                              className="h-8 text-sm"
                              value={meal.targets[key] || ""}
                              onChange={(e) => updateSlot(si, {
                                targets: { ...meal.targets, [key]: Number(e.target.value) || 0 },
                              })}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Member picks <span className="font-medium text-foreground">any one</span> option
                      {meal.targets.protein ? ` · ~${meal.targets.protein}g protein` : ""}
                    </p>

                    <div className="space-y-3">
                      {meal.options.map((opt, oi) => (
                        <div key={oi} className="space-y-3 rounded-lg border border-dashed border-border p-3">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1 space-y-2">
                              <div>
                                <label className="mb-1 block text-[10px] text-muted-foreground">
                                  Option {oi + 1} label
                                </label>
                                <Input
                                  className="h-8 text-sm"
                                  value={opt.label}
                                  onChange={(e) => updateOption(si, oi, { label: e.target.value })}
                                  placeholder="Oats + eggs"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {([
                                  { key: "protein", label: "Protein (g)" },
                                  { key: "carbs", label: "Carbs (g)" },
                                  { key: "fat", label: "Fat (g)" },
                                  { key: "cal", label: "Calories" },
                                ] as const).map(({ key, label }) => (
                                  <div key={key}>
                                    <label className="mb-1 block text-[10px] text-muted-foreground">{label}</label>
                                    <Input
                                      type="number"
                                      className="h-8 text-sm"
                                      value={opt[key] || ""}
                                      onChange={(e) => updateOption(si, oi, {
                                        [key]: Number(e.target.value) || 0,
                                      })}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="mt-5 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => updateSlot(si, {
                                options: meal.options.filter((_, j) => j !== oi),
                              })}
                              disabled={meal.options.length <= 1}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          <div className="space-y-1.5 border-t border-border/60 pt-2">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              Food items
                            </p>
                            {opt.items.map((item, ii) => (
                              <div key={ii} className="flex gap-2">
                                <Input
                                  className="h-8 text-sm"
                                  value={item}
                                  onChange={(e) => {
                                    const items = opt.items.map((it, j) => (j === ii ? e.target.value : it));
                                    updateOption(si, oi, { items });
                                  }}
                                  placeholder="e.g. Oats 40g"
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 shrink-0"
                                  onClick={() => updateOption(si, oi, {
                                    items: opt.items.filter((_, j) => j !== ii),
                                  })}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-muted-foreground"
                              onClick={() => updateOption(si, oi, { items: [...opt.items, ""] })}
                            >
                              <Plus className="mr-1 h-3 w-3" /> Add food item
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => updateSlot(si, {
                          options: [...meal.options, emptyOption(meal.targets.protein)],
                        })}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> Add swap option
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Timing tips, supplements, restrictions…"
                  className="min-h-16 resize-none"
                />
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
              <Button variant="outline" onClick={closeModal} disabled={saving}>Cancel</Button>
              <Button className="bg-gradient-primary text-primary-foreground" onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                {modal === "add" ? "Create Plan" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold">Delete Diet Plan?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Removes the plan and ends active member assignments.</p>
            <div className="mt-5 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button className="flex-1 bg-destructive text-destructive-foreground" onClick={() => void remove(deleteId)} disabled={saving}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {assignPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={closeAssign}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
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
              <Button variant="outline" className="flex-1" onClick={closeAssign}>Cancel</Button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={closeMembers}>
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
              <Button variant="outline" className="flex-1" onClick={closeMembers}>Close</Button>
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
