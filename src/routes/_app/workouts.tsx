import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Dumbbell, Plus, Pencil, Trash2, Users, X, Check, Loader2, Search, UserMinus,
  Play, ImageIcon, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatApiError } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";
import {
  assignWorkoutPlan,
  createWorkoutPlan,
  deleteWorkoutPlan,
  fetchWorkoutPlanAssignments,
  fetchWorkoutPlans,
  unassignMemberWorkout,
  updateWorkoutPlan,
  type WorkoutDay,
  type WorkoutExercise,
  type WorkoutPlan,
  type WorkoutPlanAssignment,
} from "@/lib/workout-api";
import { searchMembers, type MemberSearchHit } from "@/lib/membership-api";

export const Route = createFileRoute("/_app/workouts")({
  head: () => ({ meta: [{ title: "Workout Plans — GymmerzHub" }] }),
  component: WorkoutsPage,
});

type WorkoutForm = {
  name: string;
  level: string;
  focus: string;
  goal: string;
  duration: string;
  daysPerWeek: number;
  description: string;
  notes: string;
  days: WorkoutDay[];
};

const levelColor: Record<string, string> = {
  Beginner: "border-success/40 bg-success/10 text-success",
  Intermediate: "border-primary/40 bg-primary/10 text-primary",
  Advanced: "border-warning/40 bg-warning/10 text-warning",
};

function emptyExercise(): WorkoutExercise {
  return { name: "", targetMuscle: "", sets: 3, reps: "10", note: "", imageUrl: "", videoUrl: "" };
}

function emptyDay(index: number): WorkoutDay {
  return {
    name: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][index] || `Day ${index + 1}`,
    focus: "",
    exercises: [emptyExercise()],
  };
}

function emptyForm(): WorkoutForm {
  return {
    name: "",
    level: "Beginner",
    focus: "Full Body",
    goal: "Build Strength",
    duration: "45–60 min",
    daysPerWeek: 3,
    description: "",
    notes: "",
    days: [emptyDay(0), emptyDay(1), emptyDay(2)],
  };
}

function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function isDirectVideo(url: string) {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url);
}

function ExerciseMedia({
  exercise,
  onOpen,
  size = "md",
}: {
  exercise: WorkoutExercise;
  onOpen?: () => void;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "lg" ? "h-16 w-24" : size === "sm" ? "h-12 w-16" : "h-14 w-20";
  const hasMedia = Boolean(exercise.imageUrl || exercise.videoUrl);

  return (
    <button
      type="button"
      disabled={!hasMedia || !onOpen}
      onClick={onOpen}
      className={`relative shrink-0 overflow-hidden rounded-md border border-border bg-muted/40 ${dims} ${hasMedia && onOpen ? "cursor-pointer hover:border-primary/50" : "cursor-default"}`}
    >
      {exercise.imageUrl ? (
        <img src={exercise.imageUrl} alt={exercise.name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="grid h-full w-full place-items-center text-muted-foreground/50">
          <ImageIcon className="h-4 w-4" />
        </div>
      )}
      {exercise.videoUrl ? (
        <span className="absolute inset-0 grid place-items-center bg-black/30">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-lime text-lime-foreground">
            <Play className="h-3 w-3 fill-current" />
          </span>
        </span>
      ) : null}
    </button>
  );
}

function MediaViewer({
  exercise,
  onClose,
}: {
  exercise: WorkoutExercise;
  onClose: () => void;
}) {
  const embed = exercise.videoUrl ? youtubeEmbed(exercise.videoUrl) : null;
  const direct = exercise.videoUrl && isDirectVideo(exercise.videoUrl) ? exercise.videoUrl : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <p className="font-display text-base font-bold">{exercise.name}</p>
            <p className="text-xs text-muted-foreground">
              {[
                exercise.targetMuscle || null,
                exercise.sets > 0 || exercise.reps
                  ? `${exercise.sets > 0 ? `${exercise.sets}×` : ""}${exercise.reps}`
                  : null,
              ].filter(Boolean).join(" · ") || "Demo"}
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="aspect-video bg-black">
          {embed ? (
            <iframe
              title={exercise.name}
              src={embed}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : direct ? (
            <video src={direct} controls autoPlay className="h-full w-full object-contain" />
          ) : exercise.imageUrl ? (
            <img src={exercise.imageUrl} alt={exercise.name} className="h-full w-full object-contain" />
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">No media</div>
          )}
        </div>
        {exercise.videoUrl && !embed && !direct ? (
          <div className="border-t border-border px-5 py-3">
            <a
              href={exercise.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Open video <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function WorkoutsPage() {
  const session = getSession();
  const canWrite = hasPermission(session, "workouts.write");

  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [mediaExercise, setMediaExercise] = useState<WorkoutExercise | null>(null);

  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<WorkoutPlan | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [assignPlan, setAssignPlan] = useState<WorkoutPlan | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberHits, setMemberHits] = useState<MemberSearchHit[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberSearchHit | null>(null);
  const [searching, setSearching] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [membersPlan, setMembersPlan] = useState<WorkoutPlan | null>(null);
  const [assignments, setAssignments] = useState<WorkoutPlanAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);

  const selected = useMemo(
    () => plans.find((p) => p.id === selectedId) ?? plans[0] ?? null,
    [plans, selectedId],
  );

  const day = selected?.days[activeDay] ?? null;

  async function load() {
    setLoading(true);
    try {
      const rows = await fetchWorkoutPlans();
      setPlans(rows);
      setSelectedId((prev) => {
        if (prev && rows.some((p) => p.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
    } catch (error) {
      toast.error(formatApiError(error, "Could not load workout plans"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setActiveDay(0);
  }, [selected?.id]);

  useEffect(() => {
    if (!modal && !deleteId && !assignPlan && !membersPlan && !mediaExercise) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modal, deleteId, assignPlan, membersPlan, mediaExercise]);

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

  const openAdd = () => {
    setForm(emptyForm());
    setEditTarget(null);
    setModal("add");
  };

  const openEdit = (p: WorkoutPlan) => {
    setEditTarget(p);
    setForm({
      name: p.name,
      level: p.level || "Beginner",
      focus: p.focus,
      goal: p.goal,
      duration: p.duration,
      daysPerWeek: p.daysPerWeek || p.days.length,
      description: p.description,
      notes: p.notes,
      days: p.days.map((d) => ({
        ...d,
        exercises: d.exercises.map((e) => ({
          ...e,
          targetMuscle: e.targetMuscle || "",
          imageUrl: e.imageUrl || "",
          videoUrl: e.videoUrl || "",
        })),
      })),
    });
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setEditTarget(null);
  };

  function setDayCount(count: number) {
    const n = Math.min(7, Math.max(1, count));
    setForm((f) => {
      const next = Array.from({ length: n }, (_, i) => f.days[i] || emptyDay(i));
      return { ...f, daysPerWeek: n, days: next };
    });
  }

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Plan name is required");
      return;
    }
    for (const d of form.days) {
      if (!d.name.trim()) {
        toast.error("Each day needs a name");
        return;
      }
      if (d.exercises.filter((e) => e.name.trim()).length === 0) {
        toast.error(`Add at least one exercise for ${d.name}`);
        return;
      }
    }

    const body = {
      name: form.name.trim(),
      level: form.level || null,
      focus: form.focus || null,
      goal: form.goal || null,
      duration: form.duration || null,
      daysPerWeek: form.daysPerWeek || form.days.length,
      description: form.description || null,
      notes: form.notes || null,
      days: form.days.map((d) => ({
        name: d.name.trim(),
        focus: d.focus.trim(),
        exercises: d.exercises
          .filter((e) => e.name.trim())
          .map((e) => ({
            name: e.name.trim(),
            targetMuscle: e.targetMuscle.trim(),
            sets: Number(e.sets) || 0,
            reps: e.reps.trim(),
            note: e.note.trim(),
            imageUrl: e.imageUrl.trim(),
            videoUrl: e.videoUrl.trim(),
          })),
      })),
      status: "active" as const,
    };

    setSaving(true);
    try {
      if (modal === "edit" && editTarget) {
        const updated = await updateWorkoutPlan(editTarget.id, body);
        setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setSelectedId(updated.id);
        toast.success("Workout plan updated");
      } else {
        const created = await createWorkoutPlan(body);
        setPlans((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedId(created.id);
        toast.success("Workout plan created");
      }
      closeModal();
    } catch (error) {
      toast.error(formatApiError(error, "Could not save workout plan"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setSaving(true);
    try {
      await deleteWorkoutPlan(id);
      setPlans((prev) => {
        const next = prev.filter((p) => p.id !== id);
        setSelectedId((cur) => (cur === id ? next[0]?.id ?? null : cur));
        return next;
      });
      setDeleteId(null);
      toast.success("Workout plan deleted");
    } catch (error) {
      toast.error(formatApiError(error, "Could not delete workout plan"));
    } finally {
      setSaving(false);
    }
  };

  function openAssign(p: WorkoutPlan) {
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
      await assignWorkoutPlan(assignPlan.id, { memberId: selectedMember.id });
      toast.success(`Assigned “${assignPlan.name}” to ${selectedMember.name}`);
      closeAssign();
      await load();
    } catch (error) {
      toast.error(formatApiError(error, "Could not assign workout plan"));
    } finally {
      setAssigning(false);
    }
  }

  async function loadAssignments(plan: WorkoutPlan) {
    setLoadingAssignments(true);
    try {
      const rows = await fetchWorkoutPlanAssignments(plan.id);
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

  function openMembers(p: WorkoutPlan) {
    setMembersPlan(p);
    setAssignments([]);
    void loadAssignments(p);
  }

  function closeMembers() {
    setMembersPlan(null);
    setAssignments([]);
    setUnassigningId(null);
  }

  async function confirmUnassign(row: WorkoutPlanAssignment) {
    const name = row.member?.name || "this member";
    if (!window.confirm(`Remove workout plan from ${name}?`)) return;
    setUnassigningId(row.id);
    try {
      await unassignMemberWorkout(row.memberId);
      toast.success(`Unassigned ${name}`);
      setAssignments((prev) => prev.filter((a) => a.id !== row.id));
      setPlans((prev) =>
        prev.map((p) =>
          p.id === row.workoutPlanId
            ? { ...p, assigned: Math.max(0, p.assigned - 1) }
            : p,
        ),
      );
      setMembersPlan((prev) =>
        prev && prev.id === row.workoutPlanId
          ? { ...prev, assigned: Math.max(0, prev.assigned - 1) }
          : prev,
      );
    } catch (error) {
      toast.error(formatApiError(error, "Could not unassign workout plan"));
    } finally {
      setUnassigningId(null);
    }
  }

  function patchExercise(di: number, ei: number, patch: Partial<WorkoutExercise>) {
    setForm((f) => ({
      ...f,
      days: f.days.map((d, i) =>
        i === di
          ? { ...d, exercises: d.exercises.map((x, j) => (j === ei ? { ...x, ...patch } : x)) }
          : d,
      ),
    }));
  }

  return (
    <div>
      <PageHeader
        badge="Programs"
        title="Workout Plans"
        description="Pick a program, walk the week day-by-day, and open form demos for each move."
        action={
          canWrite ? (
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow" onClick={openAdd}>
              <Plus className="mr-1 h-4 w-4" /> New Program
            </Button>
          ) : null
        }
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading workout plans…
        </div>
      ) : plans.length === 0 ? (
        <div className="m-6 rounded-2xl border border-dashed border-border bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-card to-card p-16 text-center">
          <Dumbbell className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3 font-display text-lg font-semibold">No programs yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Build a weekly split with image or video demos per exercise.</p>
          {canWrite ? (
            <Button className="mt-4 bg-gradient-primary text-primary-foreground" onClick={openAdd}>
              <Plus className="mr-1 h-4 w-4" /> New Program
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Plan rail */}
          <aside className="border-b border-border lg:min-h-[calc(100vh-8rem)] lg:border-b-0 lg:border-r">
            <div className="flex gap-2 overflow-x-auto p-3 lg:flex-col lg:overflow-visible">
              {plans.map((p) => {
                const active = selected?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`min-w-[180px] rounded-lg border px-2.5 py-2 text-left transition-colors lg:min-w-0 ${
                      active
                        ? "border-primary/40 bg-primary/10"
                        : "border-transparent bg-transparent hover:border-border hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      {p.level ? (
                        <Badge variant="outline" className={`shrink-0 text-[10px] ${levelColor[p.level] ?? ""}`}>
                          {p.level}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {p.daysPerWeek || p.days.length}d · {p.focus || p.goal || "Program"} · {p.assigned} assigned
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Program stage */}
          {selected ? (
            <section className="min-w-0">
              <div className="relative overflow-hidden border-b border-border bg-[linear-gradient(135deg,hsl(var(--primary)/0.14),transparent_55%),radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_40%)] px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-bold tracking-tight">{selected.name}</h2>
                      {selected.level ? (
                        <Badge variant="outline" className={levelColor[selected.level] ?? ""}>{selected.level}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 max-w-2xl text-sm leading-snug text-muted-foreground line-clamp-2">
                      {selected.description || selected.goal || "—"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{selected.daysPerWeek || selected.days.length}</span> days/week
                      {selected.duration ? <> · <span className="font-medium text-foreground">{selected.duration}</span></> : null}
                      {selected.focus ? <> · <span className="font-medium text-foreground">{selected.focus}</span></> : null}
                      {selected.goal ? <> · {selected.goal}</> : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openMembers(selected)}>
                      <Users className="mr-1 h-3.5 w-3.5" /> {selected.assigned} Members
                    </Button>
                    {canWrite ? (
                      <>
                        <Button size="sm" className="bg-gradient-primary text-primary-foreground" onClick={() => openAssign(selected)}>
                          Assign
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(selected)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(selected.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Day rail */}
                <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
                  {selected.days.map((d, i) => {
                    const active = activeDay === i;
                    return (
                      <button
                        key={`${d.name}-${i}`}
                        type="button"
                        onClick={() => setActiveDay(i)}
                        className={`shrink-0 rounded-lg border px-3 py-2 text-left transition-colors ${
                          active
                            ? "border-primary bg-background shadow-card"
                            : "border-border/60 bg-background/40 hover:border-border hover:bg-background/70"
                        }`}
                      >
                        <p className="text-sm font-semibold leading-none">{d.name}</p>
                        <p className="mt-1 max-w-[120px] truncate text-[11px] text-muted-foreground">
                          {d.focus || `${d.exercises.length} exercises`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {day ? (
                  <>
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <h3 className="font-display text-lg font-bold">
                        {day.name}
                        {day.focus ? <span className="font-medium text-muted-foreground"> — {day.focus}</span> : null}
                      </h3>
                      <p className="shrink-0 text-xs text-muted-foreground">{day.exercises.length} movements</p>
                    </div>

                    <div className="grid gap-2 xl:grid-cols-2">
                      {day.exercises.map((ex, ei) => {
                        const hasMedia = Boolean(ex.imageUrl || ex.videoUrl);
                        return (
                          <div
                            key={`${ex.name}-${ei}`}
                            className="flex items-center gap-3 rounded-xl border border-border bg-card px-2.5 py-2"
                          >
                            <ExerciseMedia
                              exercise={ex}
                              size="lg"
                              onOpen={hasMedia ? () => setMediaExercise(ex) : undefined}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold leading-tight">
                                <span className="mr-1.5 text-[11px] font-bold text-primary">{String(ei + 1).padStart(2, "0")}</span>
                                {ex.name}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {ex.targetMuscle ? (
                                  <span className="font-medium text-foreground/80">{ex.targetMuscle}</span>
                                ) : null}
                                {ex.targetMuscle && (ex.sets > 0 || ex.reps) ? " · " : null}
                                {ex.sets > 0 || ex.reps
                                  ? `${ex.sets > 0 ? `${ex.sets}×` : ""}${ex.reps || ""}`
                                  : !ex.targetMuscle
                                    ? "—"
                                    : null}
                                {ex.note ? ` · ${ex.note}` : ""}
                              </p>
                            </div>
                            {hasMedia ? (
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 shrink-0"
                                onClick={() => setMediaExercise(ex)}
                                title={ex.videoUrl ? "Watch demo" : "View image"}
                              >
                                {ex.videoUrl ? <Play className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                              </Button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {selected.notes ? (
                      <p className="mt-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        {selected.notes}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      )}

      {mediaExercise ? <MediaViewer exercise={mediaExercise} onClose={() => setMediaExercise(null)} /> : null}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/60 p-4 backdrop-blur-sm" onClick={closeModal}>
          <div
            className="relative flex max-h-[min(90vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border px-6 py-5">
              <div>
                <h3 className="font-display text-lg font-bold">{modal === "add" ? "New Workout Plan" : "Edit Workout Plan"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Add image or video URLs for each exercise demo.</p>
              </div>
              <Button size="icon" variant="ghost" onClick={closeModal}><X className="h-4 w-4" /></Button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Name</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Push Pull Legs" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Level</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value })}
                  >
                    {["Beginner", "Intermediate", "Advanced"].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Duration</label>
                  <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="60–75 min" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Focus</label>
                  <Input value={form.focus} onChange={(e) => setForm({ ...form, focus: e.target.value })} placeholder="Hypertrophy" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Goal</label>
                  <Input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="Muscle mass" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Description</label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Who this plan is for…"
                    className="min-h-16 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Training days ({form.days.length})</p>
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={form.days.length <= 1} onClick={() => setDayCount(form.days.length - 1)}>-</Button>
                  <Button type="button" size="sm" variant="outline" disabled={form.days.length >= 7} onClick={() => setDayCount(form.days.length + 1)}>+</Button>
                </div>
              </div>

              {form.days.map((d, di) => (
                <div key={di} className="rounded-xl border border-border bg-background/40 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Day name</label>
                      <Input
                        value={d.name}
                        onChange={(e) => setForm((f) => ({
                          ...f,
                          days: f.days.map((dayRow, i) => (i === di ? { ...dayRow, name: e.target.value } : dayRow)),
                        }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Focus / split</label>
                      <Input
                        value={d.focus}
                        onChange={(e) => setForm((f) => ({
                          ...f,
                          days: f.days.map((dayRow, i) => (i === di ? { ...dayRow, focus: e.target.value } : dayRow)),
                        }))}
                        placeholder="Push — Chest · Shoulders"
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    <p className="text-xs font-medium text-muted-foreground">Exercises</p>
                    {d.exercises.map((ex, ei) => (
                      <div key={ei} className="rounded-xl border border-border bg-card p-3">
                        <div className="flex gap-3">
                          <ExerciseMedia exercise={ex} size="sm" />
                            <div className="min-w-0 flex-1 space-y-2">
                            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                              <Input
                                placeholder="Exercise name"
                                value={ex.name}
                                onChange={(e) => patchExercise(di, ei, { name: e.target.value })}
                              />
                              <Input
                                placeholder="Target muscle (e.g. Mid Chest)"
                                value={ex.targetMuscle}
                                onChange={(e) => patchExercise(di, ei, { targetMuscle: e.target.value })}
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="text-destructive"
                                disabled={d.exercises.length <= 1}
                                onClick={() => setForm((f) => ({
                                  ...f,
                                  days: f.days.map((dayRow, i) =>
                                    i === di
                                      ? { ...dayRow, exercises: dayRow.exercises.filter((_, j) => j !== ei) }
                                      : dayRow,
                                  ),
                                }))}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <Input
                                type="number"
                                min={0}
                                placeholder="Sets"
                                value={ex.sets || ""}
                                onChange={(e) => patchExercise(di, ei, { sets: Number(e.target.value) || 0 })}
                              />
                              <Input
                                placeholder="Reps"
                                value={ex.reps}
                                onChange={(e) => patchExercise(di, ei, { reps: e.target.value })}
                              />
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                  Image URL
                                </label>
                                <Input
                                  placeholder="https://…/squat.jpg"
                                  value={ex.imageUrl}
                                  onChange={(e) => patchExercise(di, ei, { imageUrl: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                  Video URL
                                </label>
                                <Input
                                  placeholder="YouTube or .mp4 link"
                                  value={ex.videoUrl}
                                  onChange={(e) => patchExercise(di, ei, { videoUrl: e.target.value })}
                                />
                              </div>
                            </div>
                            <Input
                              placeholder="Cue / note (optional)"
                              value={ex.note}
                              onChange={(e) => patchExercise(di, ei, { note: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setForm((f) => ({
                        ...f,
                        days: f.days.map((dayRow, i) =>
                          i === di ? { ...dayRow, exercises: [...dayRow.exercises, emptyExercise()] } : dayRow,
                        ),
                      }))}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add exercise
                    </Button>
                  </div>
                </div>
              ))}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Warm-up, progression, rest days…"
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
            <h3 className="font-display text-lg font-bold">Delete Workout Plan?</h3>
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
              <Button size="icon" variant="ghost" onClick={closeMembers}><X className="h-4 w-4" /></Button>
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
                              <Link to="/members/$id" params={{ id: m.id }} onClick={closeMembers}>View</Link>
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
