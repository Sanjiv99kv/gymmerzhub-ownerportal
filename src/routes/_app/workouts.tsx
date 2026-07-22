import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Dumbbell, Timer, Activity, Plus, ChevronDown, ChevronUp,
  Users, Star, Zap, Flame,
} from "lucide-react";
import { PageHeader } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/workouts")({
  head: () => ({ meta: [{ title: "Workout Plans — FitSaathi" }] }),
  component: WorkoutsPage,
});

// ── Plan definitions ────────────────────────────────────────────────────────

type Day = { label: string; tag: string; exercises: string[] };

interface Plan {
  id: string;
  name: string;
  subtitle: string;
  level: string;
  levelColor: string;
  days: number;
  duration: string;
  focus: string;
  goal: string;
  assigned: number;
  icon: string;
  accent: string;
  description: string;
  schedule: Day[];
}

const plans: Plan[] = [
  {
    id: "beginner",
    name: "Beginner Full Body",
    subtitle: "1-Week Mixed Training",
    level: "Beginner",
    levelColor: "border-success/40 bg-success/10 text-success",
    days: 5,
    duration: "45–60 min",
    focus: "Full Body",
    goal: "Build Habit & Strength",
    assigned: 84,
    icon: "🌱",
    accent: "from-success/20 to-success/0",
    description:
      "Perfect for gym newcomers. Each session targets all major muscle groups with compound movements, keeping volume low and technique the priority. Great for building a solid foundation before moving to splits.",
    schedule: [
      {
        label: "Monday",
        tag: "Full Body A",
        exercises: [
          "Barbell Squat — 3×10",
          "Bench Press — 3×10",
          "Lat Pulldown — 3×12",
          "Overhead Dumbbell Press — 3×10",
          "Plank — 3×30s",
          "Treadmill Warm-up — 10 min",
        ],
      },
      {
        label: "Tuesday",
        tag: "Cardio + Core",
        exercises: [
          "Brisk Walk / Elliptical — 20 min",
          "Crunches — 3×20",
          "Leg Raises — 3×15",
          "Russian Twists — 3×20",
          "Mountain Climbers — 3×30s",
        ],
      },
      {
        label: "Wednesday",
        tag: "Full Body B",
        exercises: [
          "Deadlift — 3×8",
          "Incline Dumbbell Press — 3×10",
          "Seated Cable Row — 3×12",
          "Dumbbell Lunges — 3×12 each leg",
          "Dumbbell Bicep Curl — 3×12",
          "Tricep Pushdown — 3×12",
        ],
      },
      {
        label: "Thursday",
        tag: "Rest / Stretch",
        exercises: [
          "Light stretching — 15 min",
          "Foam rolling — 10 min",
          "Optional: 15 min light walk",
        ],
      },
      {
        label: "Friday",
        tag: "Full Body C",
        exercises: [
          "Goblet Squat — 3×12",
          "Push-ups — 3×15",
          "Dumbbell Row — 3×12",
          "Shoulder Press Machine — 3×12",
          "Leg Press — 3×12",
          "Cable Crunch — 3×15",
        ],
      },
    ],
  },

  {
    id: "ppl",
    name: "Push Pull Legs",
    subtitle: "6-Day Hypertrophy Split",
    level: "Intermediate",
    levelColor: "border-primary/40 bg-primary/10 text-primary",
    days: 6,
    duration: "75–90 min",
    focus: "Hypertrophy",
    goal: "Muscle Mass & Definition",
    assigned: 142,
    icon: "💪",
    accent: "from-primary/20 to-primary/0",
    description:
      "The most popular intermediate split. Push days train chest, shoulders & triceps. Pull days hit back & biceps. Leg days cover quads, hamstrings & calves. Each muscle group gets hit twice per week for maximum hypertrophy.",
    schedule: [
      {
        label: "Monday",
        tag: "Push — Chest · Shoulders · Triceps",
        exercises: [
          "Barbell Bench Press — 4×8",
          "Incline Dumbbell Press — 3×10",
          "Cable Lateral Raise — 4×15",
          "Seated Dumbbell Shoulder Press — 3×10",
          "Tricep Pushdown (rope) — 4×12",
          "Overhead Tricep Extension — 3×12",
        ],
      },
      {
        label: "Tuesday",
        tag: "Pull — Back · Biceps",
        exercises: [
          "Deadlift — 4×6",
          "Pull-ups / Lat Pulldown — 4×8",
          "Seated Cable Row — 4×10",
          "Face Pulls — 3×15",
          "Barbell Bicep Curl — 4×10",
          "Hammer Curl — 3×12",
        ],
      },
      {
        label: "Wednesday",
        tag: "Legs — Quads · Hamstrings · Calves",
        exercises: [
          "Barbell Squat — 4×8",
          "Romanian Deadlift — 3×10",
          "Leg Press — 3×12",
          "Leg Curl — 3×12",
          "Walking Lunges — 3×12 each",
          "Standing Calf Raise — 4×15",
        ],
      },
      {
        label: "Thursday",
        tag: "Push (Repeat)",
        exercises: [
          "Incline Barbell Press — 4×8",
          "Pec Deck / Cable Fly — 3×12",
          "Arnold Press — 3×10",
          "Upright Row — 3×12",
          "Skull Crushers — 4×10",
          "Dip Machine — 3×12",
        ],
      },
      {
        label: "Friday",
        tag: "Pull (Repeat)",
        exercises: [
          "Barbell Row — 4×8",
          "Single Arm Dumbbell Row — 3×10",
          "Chest-supported Row — 3×12",
          "Cable Pullover — 3×12",
          "Incline Dumbbell Curl — 3×12",
          "Concentration Curl — 3×10",
        ],
      },
      {
        label: "Saturday",
        tag: "Legs (Repeat)",
        exercises: [
          "Front Squat — 4×8",
          "Hack Squat — 3×10",
          "Leg Extension — 3×15",
          "Seated Leg Curl — 3×12",
          "Hip Thrust — 3×12",
          "Seated Calf Raise — 4×20",
        ],
      },
    ],
  },

  {
    id: "bro-split",
    name: "2-Muscle Group Split",
    subtitle: "Classic Bro Split — 5 Days",
    level: "Intermediate",
    levelColor: "border-warning/40 bg-warning/10 text-warning",
    days: 5,
    duration: "60–75 min",
    focus: "Isolation + Compound",
    goal: "Strength & Aesthetic Shape",
    assigned: 97,
    icon: "🔥",
    accent: "from-warning/20 to-warning/0",
    description:
      "The classic gym split where each session pairs two complementary muscle groups. High volume per muscle group, great for intermediate lifters who want to focus on aesthetics and balanced development.",
    schedule: [
      {
        label: "Monday",
        tag: "Chest + Triceps",
        exercises: [
          "Flat Bench Press — 4×8",
          "Incline Dumbbell Press — 3×10",
          "Cable Crossover / Pec Deck — 3×12",
          "Close-Grip Bench Press — 3×10",
          "Tricep Pushdown — 4×12",
          "Overhead Extension — 3×12",
        ],
      },
      {
        label: "Tuesday",
        tag: "Back + Biceps",
        exercises: [
          "Deadlift — 4×6",
          "Wide-Grip Pull-ups — 3×8",
          "Barbell Row — 4×8",
          "Lat Pulldown — 3×12",
          "Barbell Curl — 4×10",
          "Hammer Curl — 3×12",
        ],
      },
      {
        label: "Wednesday",
        tag: "Legs + Abs",
        exercises: [
          "Barbell Squat — 4×8",
          "Leg Press — 3×12",
          "Romanian Deadlift — 3×10",
          "Leg Extension — 3×15",
          "Leg Curl — 3×12",
          "Hanging Leg Raises — 3×15",
          "Cable Crunch — 3×15",
        ],
      },
      {
        label: "Thursday",
        tag: "Shoulders + Traps",
        exercises: [
          "Military Press — 4×8",
          "Dumbbell Lateral Raise — 4×15",
          "Front Raise — 3×12",
          "Rear Delt Fly — 3×15",
          "Barbell Shrug — 4×12",
          "Face Pulls — 3×15",
        ],
      },
      {
        label: "Friday",
        tag: "Arms — Biceps + Triceps",
        exercises: [
          "Barbell Curl — 4×10",
          "Incline Dumbbell Curl — 3×12",
          "Spider Curl — 3×12",
          "Skull Crushers — 4×10",
          "Dips — 3×12",
          "Cable Curl + Pushdown Superset — 3×12",
        ],
      },
    ],
  },
];

// ── Day type → accent colour ────────────────────────────────────────────────

function dayAccent(tag: string): { dot: string; bg: string; text: string } {
  const t = tag.toLowerCase();
  if (t.includes("push") || t.includes("chest"))   return { dot: "bg-primary",  bg: "bg-primary/10",  text: "text-primary"  };
  if (t.includes("pull") || t.includes("back"))    return { dot: "bg-lime",     bg: "bg-lime/10",     text: "text-lime"     };
  if (t.includes("leg"))                            return { dot: "bg-warning",  bg: "bg-warning/10",  text: "text-warning"  };
  if (t.includes("arm"))                            return { dot: "bg-success",  bg: "bg-success/10",  text: "text-success"  };
  if (t.includes("cardio") || t.includes("core"))  return { dot: "bg-sky-400",  bg: "bg-sky-400/10",  text: "text-sky-400"  };
  if (t.includes("rest") || t.includes("stretch")) return { dot: "bg-muted-foreground", bg: "bg-muted/30", text: "text-muted-foreground" };
  return { dot: "bg-primary", bg: "bg-primary/10", text: "text-primary" };
}

// ── Page ───────────────────────────────────────────────────────────────────

function WorkoutsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<Record<string, number | null>>({});

  const toggle = (id: string) => setExpanded((prev) => (prev === id ? null : id));
  const toggleDay = (planId: string, di: number) =>
    setOpenDay((prev) => ({ ...prev, [planId]: prev[planId] === di ? null : di }));

  const totalEnrolled = plans.reduce((s, p) => s + p.assigned, 0);

  return (
    <div>
      <PageHeader
        badge="Programs"
        title="Workout Plans"
        description="Pre-built gym programs ready to assign to members."
        action={
          <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
            <Plus className="mr-1 h-4 w-4" /> New Program
          </Button>
        }
      />

      <div className="space-y-6 p-6">
        {/* KPI strip */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Total Programs",    value: plans.length.toString(), icon: Dumbbell, sub: "Ready to assign",     color: "text-primary" },
            { label: "Members Enrolled",  value: totalEnrolled.toString(), icon: Users,   sub: "Across all programs", color: "text-lime"    },
            { label: "Avg. Completion",   value: "68%",                    icon: Zap,     sub: "This month",          color: "text-warning" },
          ].map(({ label, value, icon: Icon, sub, color }) => (
            <div key={label} className="relative overflow-hidden rounded-2xl border border-border bg-card px-5 py-4 shadow-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className={`font-display text-3xl font-bold mt-1 ${color}`}>{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
                </div>
                <div className={`grid h-11 w-11 place-items-center rounded-xl border border-border bg-background ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Plan cards */}
        {plans.map((plan) => {
          const isOpen = expanded === plan.id;
          return (
            <Card key={plan.id} className="overflow-hidden border-border bg-card shadow-card">
              {/* ── Header ── */}
              <div className="p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  {/* Left: icon + info */}
                  <div className="flex items-start gap-4">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-2xl shadow-glow">
                      {plan.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-xl font-bold leading-tight">{plan.name}</h2>
                        <Badge variant="outline" className={plan.levelColor}>{plan.level}</Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{plan.subtitle}</p>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">{plan.description}</p>
                    </div>
                  </div>

                  {/* Right: buttons */}
                  <div className="flex shrink-0 gap-2 sm:flex-col sm:items-end">
                    <Button size="sm" className="bg-gradient-primary text-primary-foreground shadow-glow">
                      Assign to Member
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggle(plan.id)} className="gap-1.5">
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {isOpen ? "Hide Schedule" : "View Schedule"}
                    </Button>
                  </div>
                </div>

                {/* Meta chips */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { icon: Activity, label: `${plan.days} days / week`,  color: "text-lime"    },
                    { icon: Timer,    label: plan.duration,               color: "text-warning" },
                    { icon: Flame,    label: plan.focus,                  color: "text-primary" },
                    { icon: Star,     label: plan.goal,                   color: "text-lime"    },
                    { icon: Users,    label: `${plan.assigned} enrolled`, color: "text-muted-foreground" },
                  ].map(({ icon: Icon, label, color }) => (
                    <span key={label} className={`flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium ${color}`}>
                      <Icon className="h-3.5 w-3.5" />{label}
                    </span>
                  ))}
                </div>
              </div>

              {/* ── Expanded schedule ── */}
              {isOpen && (
                <div className="border-t border-border bg-background/30 px-6 py-5">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Weekly Schedule — {plan.schedule.length} Sessions
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {plan.schedule.map((day, di) => {
                      const dayOpen = openDay[plan.id] === di;
                      const ac = dayAccent(day.tag);
                      return (
                        <div key={day.label} className="overflow-hidden rounded-xl border border-border bg-card">
                          <button
                            onClick={() => toggleDay(plan.id, di)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/30"
                          >
                            {/* Colour dot */}
                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${ac.dot}`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm leading-tight">{day.label}</p>
                              <p className={`text-[11px] mt-0.5 font-medium ${ac.text}`}>{day.tag}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ac.bg} ${ac.text}`}>
                                {day.exercises.length} ex
                              </span>
                              {dayOpen
                                ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                          </button>

                          {dayOpen && (
                            <div className="border-t border-border bg-background/50 px-4 py-3 space-y-2.5">
                              {day.exercises.map((ex, ei) => {
                                const [name, ...rest] = ex.split("—");
                                return (
                                  <div key={ei} className="flex items-start gap-3">
                                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${ac.bg} ${ac.text}`}>
                                      {ei + 1}
                                    </span>
                                    <div className="text-sm leading-snug">
                                      <span className="font-medium">{name.trim()}</span>
                                      {rest.length > 0 && (
                                        <span className="text-muted-foreground"> — {rest.join("—").trim()}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
