import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Star, Users, Plus, Pencil, Loader2, Clock, X, Check,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatApiError } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";
import {
  fetchTrainers,
  updateTrainerProfile,
  type Trainer,
  type TrainerAvailability,
} from "@/lib/trainers-api";

export const Route = createFileRoute("/_app/trainers")({
  head: () => ({ meta: [{ title: "Trainers — GymmerzHub" }] }),
  component: TrainersPage,
});

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const availabilityStyle: Record<TrainerAvailability, string> = {
  available: "border-lime/40 bg-lime/10 text-lime",
  limited: "border-warning/40 bg-warning/10 text-warning",
  unavailable: "border-border bg-muted/40 text-muted-foreground",
};

const availabilityLabel: Record<TrainerAvailability, string> = {
  available: "Available",
  limited: "Limited",
  unavailable: "Unavailable",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "?";
}

function TrainersPage() {
  const session = getSession();
  const canWrite = hasPermission(session, "trainers.write");
  const canInvite = hasPermission(session, "team.write");

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Trainer | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    specialty: "",
    bio: "",
    availability: "available" as TrainerAvailability,
    days: [] as string[],
    startTime: "06:00",
    endTime: "14:00",
  });

  async function load() {
    setLoading(true);
    try {
      setTrainers(await fetchTrainers());
    } catch (error) {
      toast.error(formatApiError(error, "Could not load trainers"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!edit) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [edit]);

  function openEdit(t: Trainer) {
    setEdit(t);
    setForm({
      specialty: t.specialty || "",
      bio: t.bio || "",
      availability: t.availability || "available",
      days: t.schedule?.days?.length ? [...t.schedule.days] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      startTime: t.schedule?.startTime || "06:00",
      endTime: t.schedule?.endTime || "14:00",
    });
  }

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  }

  async function save() {
    if (!edit) return;
    setSaving(true);
    try {
      const updated = await updateTrainerProfile(edit.membershipId, {
        specialty: form.specialty.trim() || null,
        bio: form.bio.trim() || null,
        availability: form.availability,
        schedule: {
          days: form.days,
          startTime: form.startTime,
          endTime: form.endTime,
        },
      });
      setTrainers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEdit(null);
      toast.success("Trainer profile updated");
    } catch (error) {
      toast.error(formatApiError(error, "Could not update trainer"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        badge="Team"
        title="Trainers"
        description="Coaches from your Team with the Trainer role. Set specialty, availability, and hours here."
        action={
          canInvite ? (
            <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow">
              <Link to="/team" search={{ invite: "trainer" }}>
                <Plus className="mr-1 h-4 w-4" /> Add trainer
              </Link>
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading trainers…
        </div>
      ) : trainers.length === 0 ? (
        <div className="m-6 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-display text-lg font-semibold">No trainers yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite someone from Team with the <span className="font-medium text-foreground">Trainer</span> role — they’ll show up here automatically.
          </p>
          {canInvite ? (
            <Button asChild className="mt-4 bg-gradient-primary text-primary-foreground">
              <Link to="/team" search={{ invite: "trainer" }}>
                <Plus className="mr-1 h-4 w-4" /> Invite trainer
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-3">
          {trainers.map((t) => {
            const name = t.user?.fullName || "Trainer";
            return (
              <Card
                key={t.id}
                className="group relative overflow-hidden border-border bg-card p-5 shadow-card transition-all hover:border-primary/40"
              >
                <div className="relative flex items-start gap-4">
                  <Avatar className="h-14 w-14 ring-2 ring-border">
                    <AvatarImage src={t.user?.photo ?? undefined} />
                    <AvatarFallback>{initials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display text-lg font-semibold">{name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {t.specialty || t.gymRole?.name || "Trainer"}
                        </p>
                      </div>
                      {canWrite ? (
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => openEdit(t)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{t.user?.email}</p>
                  </div>
                </div>

                <div className="relative mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-background/40 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> Members
                    </div>
                    <div className="font-display text-xl font-bold">{t.membersAssigned}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-background/40 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Star className="h-3.5 w-3.5 text-warning" /> Rating
                    </div>
                    <div className="font-display text-xl font-bold">
                      {t.rating != null ? t.rating.toFixed(1) : "—"}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {t.ratingCount > 0 ? `${t.ratingCount} reviews` : "Member feedback later"}
                    </p>
                  </div>
                </div>

                <div className="relative mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className={availabilityStyle[t.availability]}>
                    {availabilityLabel[t.availability]}
                  </Badge>
                  <Badge variant="outline" className="border-border gap-1">
                    <Clock className="h-3 w-3" />
                    {t.schedule?.label || "Schedule not set"}
                  </Badge>
                </div>

                {t.bio ? (
                  <p className="relative mt-3 line-clamp-2 text-xs text-muted-foreground">{t.bio}</p>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setEdit(null)}>
          <div
            className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border px-6 py-5">
              <div>
                <h3 className="font-display text-lg font-bold">Edit trainer</h3>
                <p className="mt-1 text-sm text-muted-foreground">{edit.user?.fullName}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setEdit(null)}><X className="h-4 w-4" /></Button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Specialty</label>
                <Input
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  placeholder="Strength · HIIT · Yoga"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Availability</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.availability}
                  onChange={(e) => setForm({ ...form, availability: e.target.value as TrainerAvailability })}
                >
                  <option value="available">Available</option>
                  <option value="limited">Limited</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Working days</label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEK_DAYS.map((day) => {
                    const on = form.days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          on
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Start time</label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">End time</label>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Bio</label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Short coaching note…"
                  className="min-h-20 resize-none"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Member ratings & feedback will plug in later — fields are ready on the profile.
              </p>
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
              <Button variant="outline" onClick={() => setEdit(null)} disabled={saving}>Cancel</Button>
              <Button className="bg-gradient-primary text-primary-foreground" onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
