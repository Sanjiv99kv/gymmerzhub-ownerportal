import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Megaphone, Plus, Pin, Pencil, Trash2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatApiError } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";
import {
  createNotice,
  deleteNotice,
  fetchNotices,
  publishNotice,
  updateNotice,
  type GymNotice,
  type NoticeStatus,
  type NoticeTag,
} from "@/lib/notices-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/notices")({
  head: () => ({ meta: [{ title: "Notices — GymmerzHub" }] }),
  component: NoticesPage,
});

const TAGS: NoticeTag[] = ["Holiday", "Update", "Challenge", "Offer"];

const tagColor: Record<NoticeTag, string> = {
  Holiday: "border-warning/40 bg-warning/10 text-warning",
  Update: "border-lime/40 bg-lime/10 text-lime",
  Challenge: "border-primary/40 bg-primary/10 text-primary",
  Offer: "border-success/40 bg-success/10 text-success",
};

type NoticeForm = {
  title: string;
  body: string;
  tag: NoticeTag;
  pinned: boolean;
};

function emptyForm(): NoticeForm {
  return { title: "", body: "", tag: "Update", pinned: false };
}

function formFromNotice(n: GymNotice): NoticeForm {
  return {
    title: n.title,
    body: n.body,
    tag: n.tag,
    pinned: n.pinned,
  };
}

function formatPosted(n: GymNotice) {
  const raw = n.publishedAt || n.updatedAt || n.createdAt;
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return raw.slice(0, 10);
  }
}

function NoticesPage() {
  const session = getSession();
  const canWrite = hasPermission(session, "notices.write");

  const [notices, setNotices] = useState<GymNotice[]>([]);
  const [filter, setFilter] = useState<"all" | NoticeStatus>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GymNotice | null>(null);
  const [form, setForm] = useState<NoticeForm>(emptyForm());

  async function load() {
    setLoading(true);
    try {
      const list = await fetchNotices(filter === "all" ? undefined : filter);
      setNotices(list);
    } catch (error) {
      toast.error(formatApiError(error, "Could not load notices"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [filter]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(notice: GymNotice) {
    if (!notice.editable) {
      toast.error("Published notices cannot be edited");
      return;
    }
    setEditing(notice);
    setForm(formFromNotice(notice));
    setDialogOpen(true);
  }

  async function save(status: NoticeStatus) {
    const title = form.title.trim();
    const body = form.body.trim();
    if (title.length < 2) {
      toast.error("Title must be at least 2 characters");
      return;
    }
    if (!body) {
      toast.error("Body is required");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateNotice(editing.id, {
          title,
          body,
          tag: form.tag,
          pinned: form.pinned,
          status,
        });
        toast.success(status === "published" ? "Notice published" : "Draft saved");
      } else {
        await createNotice({
          title,
          body,
          tag: form.tag,
          pinned: form.pinned,
          status,
        });
        toast.success(status === "published" ? "Notice published" : "Draft saved");
      }
      setDialogOpen(false);
      await load();
    } catch (error) {
      toast.error(formatApiError(error, "Could not save notice"));
    } finally {
      setSaving(false);
    }
  }

  async function onPublish(notice: GymNotice) {
    if (!notice.editable) return;
    setSaving(true);
    try {
      await publishNotice(notice.id);
      toast.success("Notice published");
      await load();
    } catch (error) {
      toast.error(formatApiError(error, "Could not publish notice"));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(notice: GymNotice) {
    if (!window.confirm(`Delete “${notice.title}”?`)) return;
    setSaving(true);
    try {
      await deleteNotice(notice.id);
      toast.success("Notice deleted");
      await load();
    } catch (error) {
      toast.error(formatApiError(error, "Could not delete notice"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        badge="Announcements"
        title="Notices"
        description="Broadcast announcements to all members."
        action={
          canWrite ? (
            <Button
              className="bg-lime text-lime-foreground hover:bg-lime/90"
              onClick={openCreate}
            >
              <Plus className="mr-1 h-4 w-4" /> Create notice
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2 px-6 pt-2">
        {(["all", "draft", "published"] as const).map((key) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? "default" : "outline"}
            className={cn(filter === key && "bg-lime text-lime-foreground")}
            onClick={() => setFilter(key)}
          >
            {key === "all" ? "All" : key === "draft" ? "Drafts" : "Published"}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading notices…
        </div>
      ) : notices.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">
          No notices yet{canWrite ? " — create one to get started." : "."}
        </div>
      ) : (
        <div className="grid gap-4 p-6 md:grid-cols-2">
          {notices.map((n) => (
            <Card
              key={n.id}
              className="group relative overflow-hidden border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-lime-foreground">
                    <Megaphone className="h-5 w-5" />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className={tagColor[n.tag]}>
                      {n.tag}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        n.status === "published"
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-border bg-muted/50 text-muted-foreground"
                      }
                    >
                      {n.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </div>
                {n.pinned && <Pin className="h-4 w-4 shrink-0 text-primary" />}
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold">{n.title}</h3>
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{n.body}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {n.status === "published" ? "Posted" : "Updated"} {formatPosted(n)}
                  {n.postedBy ? ` · by ${n.postedBy}` : ""}
                </span>
                {canWrite && (
                  <div className="flex items-center gap-1">
                    {n.editable && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto px-2 py-1 text-primary hover:text-primary"
                          onClick={() => openEdit(n)}
                          disabled={saving}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto px-2 py-1 text-primary hover:text-primary"
                          onClick={() => void onPublish(n)}
                          disabled={saving}
                        >
                          <Send className="mr-1 h-3.5 w-3.5" /> Publish
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1 text-destructive hover:text-destructive"
                      onClick={() => void onDelete(n)}
                      disabled={saving}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? "Edit draft" : "Create notice"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update this draft, or publish it. Published notices cannot be edited later."
                : "Save as draft to keep editing, or publish immediately."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="notice-title">Title</Label>
              <Input
                id="notice-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Gym closed on Republic Day"
                maxLength={160}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notice-body">Body</Label>
              <Textarea
                id="notice-body"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Details for members…"
                rows={5}
                maxLength={5000}
              />
            </div>
            <div className="grid gap-2">
              <Label>Tag</Label>
              <Select
                value={form.tag}
                onValueChange={(v) => setForm((f) => ({ ...f, tag: v as NoticeTag }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAGS.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.pinned}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, pinned: checked === true }))
                }
              />
              Pin to top
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void save("draft")}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Save draft
            </Button>
            <Button
              type="button"
              className="bg-lime text-lime-foreground hover:bg-lime/90"
              onClick={() => void save("published")}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
