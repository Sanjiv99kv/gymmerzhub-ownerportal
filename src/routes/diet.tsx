import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Salad, Flame, Beef, Wheat, Droplets, Plus, Pencil, Trash2,
  Users, X, Check, Clock, ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/diet")({
  head: () => ({ meta: [{ title: "Diet Plans — FitSaathi" }] }),
  component: DietPage,
});

// ── Types ──────────────────────────────────────────────────────────────────

interface Meal { name: string; items: string[]; time: string }

interface DietPlan {
  id: string; name: string; tag: string; goal: string;
  cal: number; protein: number; carbs: number; fat: number; water: number;
  assigned: number; meals: Meal[]; notes: string;
}

// ── Seed data ──────────────────────────────────────────────────────────────

const seed: DietPlan[] = [
  {
    id: "lean-cut", name: "Lean Cut", tag: "Fat Loss",
    goal: "Lose body fat while preserving muscle mass with a moderate calorie deficit and high protein.",
    cal: 1800, protein: 160, carbs: 150, fat: 55, water: 3.5, assigned: 38,
    meals: [
      { name: "Breakfast",          time: "7:00 AM",  items: ["Oats with milk (1 cup)", "3 boiled eggs", "Black coffee / green tea"] },
      { name: "Mid-morning Snack",  time: "10:30 AM", items: ["Apple or banana", "10 almonds"] },
      { name: "Lunch",              time: "1:00 PM",  items: ["Brown rice (½ cup)", "Grilled chicken (150g)", "Salad with cucumber, tomato, onion", "Curd (100g)"] },
      { name: "Pre-workout",        time: "4:30 PM",  items: ["Banana (1)", "Whey protein shake (optional)"] },
      { name: "Dinner",             time: "8:00 PM",  items: ["2 Whole wheat rotis", "Dal or sabzi", "Boiled veggies", "Egg whites (3)"] },
    ],
    notes: "Avoid sugar, refined flour and deep-fried foods. Eat every 3–4 hours.",
  },
  {
    id: "muscle-mass", name: "Muscle Mass", tag: "Bulk",
    goal: "Build maximum muscle mass with a calorie surplus, high protein and adequate carbs for energy.",
    cal: 3200, protein: 220, carbs: 380, fat: 90, water: 4, assigned: 52,
    meals: [
      { name: "Breakfast",     time: "7:00 AM",  items: ["6 whole eggs + 2 egg whites", "4 bread slices (whole wheat)", "Banana (1)", "Full-fat milk (250ml)"] },
      { name: "Snack",         time: "10:00 AM", items: ["Peanut butter sandwich (2 slices)", "Protein shake (30g whey)"] },
      { name: "Lunch",         time: "1:00 PM",  items: ["White rice (1.5 cups)", "Chicken curry (200g)", "Dal", "Paneer side (50g)"] },
      { name: "Pre-workout",   time: "4:30 PM",  items: ["Banana (2)", "Oats with milk", "Creatine (5g)"] },
      { name: "Post-workout",  time: "7:00 PM",  items: ["Whey protein shake (30g)", "Banana (1)", "Rice cakes"] },
      { name: "Dinner",        time: "9:00 PM",  items: ["4 rotis", "Chicken or paneer curry", "Sabzi", "Curd (200g)"] },
    ],
    notes: "Focus on compound lifts. Sleep 8 hours. Protein timing matters — eat within 30 min post workout.",
  },
  {
    id: "maintenance", name: "Maintenance", tag: "Sustain",
    goal: "Maintain current weight and fitness level with a balanced, sustainable eating pattern.",
    cal: 2400, protein: 180, carbs: 260, fat: 75, water: 3, assigned: 44,
    meals: [
      { name: "Breakfast", time: "8:00 AM",  items: ["Poha or upma (1.5 cups)", "3 boiled eggs", "Tea / coffee (no sugar)"] },
      { name: "Snack",     time: "11:00 AM", items: ["Greek yogurt (150g)", "Mixed nuts (20g)"] },
      { name: "Lunch",     time: "1:30 PM",  items: ["Rice (1 cup)", "Dal (1 cup)", "Sabzi", "Chicken / paneer (100g)"] },
      { name: "Pre-workout", time: "5:00 PM", items: ["Banana", "Light snack"] },
      { name: "Dinner",    time: "8:30 PM",  items: ["2–3 rotis", "Dal or egg curry", "Salad"] },
    ],
    notes: "Focus on consistency. Cheat meal once a week is fine. Avoid skipping meals.",
  },
  {
    id: "vegan", name: "Vegan Athlete", tag: "Plant-based",
    goal: "High-performance plant-based plan for athletes. Rich in legumes, seeds and complex carbs.",
    cal: 2600, protein: 150, carbs: 320, fat: 80, water: 4, assigned: 21,
    meals: [
      { name: "Breakfast",  time: "7:30 AM",  items: ["Overnight oats with almond milk", "Chia seeds (2 tbsp)", "Berries", "Peanut butter (1 tbsp)"] },
      { name: "Snack",      time: "10:30 AM", items: ["Soy protein shake (25g)", "Banana"] },
      { name: "Lunch",      time: "1:00 PM",  items: ["Brown rice (1 cup)", "Rajma or chole (1 cup)", "Tofu stir-fry (150g)", "Salad"] },
      { name: "Pre-workout", time: "5:00 PM", items: ["Dates (4)", "Almonds (10)", "Coconut water"] },
      { name: "Dinner",     time: "8:30 PM",  items: ["Quinoa (½ cup)", "Lentil soup", "Roasted vegetables", "Flaxseeds (1 tbsp)"] },
    ],
    notes: "Supplement with B12, Vitamin D and Omega-3 (algae-based). Include iron-rich foods like spinach and lentils.",
  },
];

// ── Tag colours ────────────────────────────────────────────────────────────

const tagColor: Record<string, string> = {
  "Fat Loss":    "border-primary/40 bg-primary/10 text-primary",
  "Bulk":        "border-lime/40 bg-lime/10 text-lime",
  "Sustain":     "border-success/40 bg-success/10 text-success",
  "Plant-based": "border-warning/40 bg-warning/10 text-warning",
};

// ── Empty form ─────────────────────────────────────────────────────────────

const emptyForm = (): Omit<DietPlan, "id" | "assigned"> => ({
  name: "", tag: "", goal: "", cal: 0, protein: 0, carbs: 0, fat: 0, water: 2.5,
  meals: [
    { name: "Breakfast", time: "7:00 AM",  items: [""] },
    { name: "Lunch",     time: "1:00 PM",  items: [""] },
    { name: "Dinner",    time: "8:00 PM",  items: [""] },
  ],
  notes: "",
});

// ── Page ───────────────────────────────────────────────────────────────────

function DietPage() {
  const [plans, setPlans]       = useState<DietPlan[]>(seed);
  const [drawer, setDrawer]     = useState<DietPlan | null>(null);
  const [modal, setModal]       = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<DietPlan | null>(null);
  const [form, setForm]         = useState(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openAdd = () => { setForm(emptyForm()); setEditTarget(null); setModal("add"); };
  const openEdit = (p: DietPlan) => {
    setEditTarget(p);
    setForm({ name: p.name, tag: p.tag, goal: p.goal, cal: p.cal, protein: p.protein, carbs: p.carbs, fat: p.fat, water: p.water, meals: p.meals.map((m) => ({ ...m, items: [...m.items] })), notes: p.notes });
    setModal("edit");
  };
  const closeModal = () => { setModal(null); setEditTarget(null); };

  const save = () => {
    if (!form.name.trim()) return;
    if (modal === "add") {
      setPlans((prev) => [...prev, { ...form, id: Date.now().toString(), assigned: 0 }]);
    } else if (modal === "edit" && editTarget) {
      setPlans((prev) => prev.map((p) => p.id === editTarget.id ? { ...editTarget, ...form } : p));
      if (drawer?.id === editTarget.id) setDrawer({ ...editTarget, ...form });
    }
    closeModal();
  };

  const remove = (id: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== id));
    setDeleteId(null);
    if (drawer?.id === id) setDrawer(null);
  };

  const updateMealItem = (mi: number, ii: number, val: string) =>
    setForm({ ...form, meals: form.meals.map((m, i) => i !== mi ? m : { ...m, items: m.items.map((it, j) => j !== ii ? it : val) }) });
  const addMealItem  = (mi: number) => setForm({ ...form, meals: form.meals.map((m, i) => i !== mi ? m : { ...m, items: [...m.items, ""] }) });
  const removeMealItem = (mi: number, ii: number) => setForm({ ...form, meals: form.meals.map((m, i) => i !== mi ? m : { ...m, items: m.items.filter((_, j) => j !== ii) }) });
  const addMeal    = () => setForm({ ...form, meals: [...form.meals, { name: "", time: "", items: [""] }] });
  const removeMeal = (mi: number) => setForm({ ...form, meals: form.meals.filter((_, i) => i !== mi) });

  return (
    <div>
      <PageHeader
        badge="Nutrition"
        title="Diet Plans"
        description="Curated meal plans — assign to members, track macros and nutrition goals."
        action={
          <Button className="bg-gradient-primary text-primary-foreground shadow-glow" onClick={openAdd}>
            <Plus className="mr-1 h-4 w-4" /> Build Plan
          </Button>
        }
      />

      {/* Summary strip */}
      <div className="grid gap-4 p-6 pb-0 md:grid-cols-4">
        {[
          { label: "Total Plans",        value: plans.length.toString() },
          { label: "Members Enrolled",   value: plans.reduce((s, p) => s + p.assigned, 0).toString() },
          { label: "Avg Daily Calories", value: `${Math.round(plans.reduce((s, p) => s + p.cal, 0) / (plans.length || 1))} kcal` },
          { label: "Avg Protein",        value: `${Math.round(plans.reduce((s, p) => s + p.protein, 0) / (plans.length || 1))}g` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card px-4 py-3 shadow-card">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-display text-2xl font-bold mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Plan card grid — always uniform height */}
      <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-2">
        {plans.map((p) => {
          const total = p.protein * 4 + p.carbs * 4 + p.fat * 9;
          const pPct  = Math.round((p.protein * 4 / total) * 100);
          const cPct  = Math.round((p.carbs   * 4 / total) * 100);
          const fPct  = 100 - pPct - cPct;
          const tc    = tagColor[p.tag] ?? "border-border bg-muted/30 text-muted-foreground";

          return (
            <Card key={p.id} className="flex flex-col overflow-hidden border-border bg-card shadow-card transition-all hover:border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                      <Salad className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="font-display text-lg leading-tight">{p.name}</CardTitle>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className={`text-xs ${tc}`}>{p.tag}</Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" /> {p.assigned} assigned
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">{p.goal}</p>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-4 pt-0">
                {/* Macro numbers */}
                <div className="grid grid-cols-5 divide-x divide-border rounded-xl border border-border bg-background/50 text-center">
                  {[
                    { label: "Cal",     value: p.cal,     unit: "kcal", highlight: true },
                    { label: "Protein", value: p.protein, unit: "g"    },
                    { label: "Carbs",   value: p.carbs,   unit: "g"    },
                    { label: "Fat",     value: p.fat,     unit: "g"    },
                    { label: "Water",   value: p.water,   unit: "L"    },
                  ].map(({ label, value, unit, highlight }) => (
                    <div key={label} className="px-2 py-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                      <p className={`font-display text-lg font-bold leading-tight ${highlight ? "text-primary" : ""}`}>{value}</p>
                      <p className="text-[10px] text-muted-foreground">{unit}</p>
                    </div>
                  ))}
                </div>

                {/* Macro split bar */}
                <div className="space-y-1.5">
                  <div className="flex h-2.5 overflow-hidden rounded-full">
                    <div className="bg-primary" style={{ width: `${pPct}%` }} />
                    <div className="bg-lime"    style={{ width: `${cPct}%` }} />
                    <div className="bg-warning" style={{ width: `${fPct}%` }} />
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" />Protein {pPct}%</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-lime" />Carbs {cPct}%</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" />Fat {fPct}%</span>
                  </div>
                </div>

                {/* Meal count pills */}
                <div className="flex flex-wrap gap-2">
                  {p.meals.map((m) => (
                    <span key={m.name} className="flex items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {m.name} · {m.time}
                    </span>
                  ))}
                </div>

                {/* Actions — pushed to bottom */}
                <div className="mt-auto flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5 text-sm"
                    onClick={() => setDrawer(p)}
                  >
                    View Full Plan <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button className="flex-1 bg-gradient-primary text-primary-foreground shadow-glow text-sm">
                    Assign to Member
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Meal Plan Drawer ─────────────────────────────────────────────── */}
      {drawer && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setDrawer(null)} />
          {/* Panel */}
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l border-border bg-card shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-start justify-between border-b border-border px-6 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
                    <Salad className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold leading-tight">{drawer.name}</h2>
                    <Badge variant="outline" className={`mt-0.5 text-xs ${tagColor[drawer.tag] ?? ""}`}>{drawer.tag}</Badge>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{drawer.goal}</p>
              </div>
              <Button size="icon" variant="ghost" className="shrink-0" onClick={() => setDrawer(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Macro strip */}
            <div className="grid grid-cols-5 divide-x divide-border border-b border-border text-center">
              {[
                { label: "Cal",     value: drawer.cal,     unit: "kcal", highlight: true },
                { label: "Protein", value: drawer.protein, unit: "g"    },
                { label: "Carbs",   value: drawer.carbs,   unit: "g"    },
                { label: "Fat",     value: drawer.fat,     unit: "g"    },
                { label: "Water",   value: drawer.water,   unit: "L"    },
              ].map(({ label, value, unit, highlight }) => (
                <div key={label} className="px-2 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className={`font-display text-base font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
                  <p className="text-[10px] text-muted-foreground">{unit}</p>
                </div>
              ))}
            </div>

            {/* Scrollable meals */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {drawer.meals.map((meal, mi) => (
                <div key={mi} className="overflow-hidden rounded-xl border border-border bg-background/40">
                  <div className="flex items-center justify-between border-b border-border bg-background/60 px-4 py-2.5">
                    <span className="font-semibold text-sm">{meal.name}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {meal.time}
                    </span>
                  </div>
                  <ul className="space-y-2 px-4 py-3">
                    {meal.items.map((item, ii) => (
                      <li key={ii} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {drawer.notes && (
                <div className="rounded-xl border border-border bg-background/40 px-4 py-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{drawer.notes}</p>
                </div>
              )}
            </div>

            {/* Drawer footer */}
            <div className="flex gap-3 border-t border-border px-6 py-4">
              <Button variant="outline" className="flex-1" onClick={() => { openEdit(drawer); setDrawer(null); }}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Plan
              </Button>
              <Button className="flex-1 bg-gradient-primary text-primary-foreground shadow-glow">
                Assign to Member
              </Button>
            </div>
          </aside>
        </>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onClick={closeModal}>
          <div className="relative my-8 w-full max-w-2xl rounded-2xl border border-border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-xl font-bold">{modal === "add" ? "Build New Diet Plan" : "Edit Diet Plan"}</h2>
              <Button size="icon" variant="ghost" onClick={closeModal}><X className="h-4 w-4" /></Button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Plan Name *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. High Protein Cut" className="border-border bg-background" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tag / Category</label>
                  <Input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="e.g. Fat Loss, Bulk, Vegan" className="border-border bg-background" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Goal / Description</label>
                <Textarea value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="Describe the goal of this diet plan…" className="border-border bg-background min-h-20 resize-none" />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daily Targets</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {([
                    { key: "cal",     label: "Calories", unit: "kcal" },
                    { key: "protein", label: "Protein",  unit: "g"    },
                    { key: "carbs",   label: "Carbs",    unit: "g"    },
                    { key: "fat",     label: "Fat",      unit: "g"    },
                    { key: "water",   label: "Water",    unit: "L"    },
                  ] as const).map(({ key, label, unit }) => (
                    <div key={key}>
                      <label className="mb-1 block text-[10px] text-muted-foreground">{label} ({unit})</label>
                      <Input type="number" value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} className="border-border bg-background" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meals</p>
                  <Button size="sm" variant="outline" onClick={addMeal}><Plus className="mr-1 h-3.5 w-3.5" /> Add Meal</Button>
                </div>
                <div className="space-y-3">
                  {form.meals.map((meal, mi) => (
                    <div key={mi} className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-[10px] text-muted-foreground">Meal Name</label>
                            <Input value={meal.name} onChange={(e) => setForm({ ...form, meals: form.meals.map((m, i) => i !== mi ? m : { ...m, name: e.target.value }) })} placeholder="e.g. Breakfast" className="border-border bg-background h-8 text-sm" />
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] text-muted-foreground">Time</label>
                            <Input value={meal.time} onChange={(e) => setForm({ ...form, meals: form.meals.map((m, i) => i !== mi ? m : { ...m, time: e.target.value }) })} placeholder="e.g. 7:00 AM" className="border-border bg-background h-8 text-sm" />
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="mt-5 h-8 w-8 text-destructive shrink-0" onClick={() => removeMeal(mi)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {meal.items.map((item, ii) => (
                          <div key={ii} className="flex gap-2">
                            <Input value={item} onChange={(e) => updateMealItem(mi, ii, e.target.value)} placeholder="Food item with quantity" className="border-border bg-background h-8 text-sm" />
                            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeMealItem(mi, ii)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => addMealItem(mi)}>
                          <Plus className="mr-1 h-3 w-3" /> Add item
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes (optional)</label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Supplements, timing tips, restrictions…" className="border-border bg-background min-h-16 resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button className="bg-gradient-primary text-primary-foreground shadow-glow" onClick={save}>
                <Check className="mr-1 h-4 w-4" /> {modal === "add" ? "Create Plan" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ───────────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="grid h-12 w-12 place-items-center rounded-xl border border-destructive/40 bg-destructive/10 mb-4">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <h3 className="font-display text-lg font-bold">Delete Diet Plan?</h3>
            <p className="mt-1 text-sm text-muted-foreground">This will permanently remove the plan and unassign it from all members.</p>
            <div className="mt-5 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => remove(deleteId)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
