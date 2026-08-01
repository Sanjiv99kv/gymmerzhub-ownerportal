import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { formatApiError } from "@/lib/api";
import {
  createGymRole,
  deleteGymRole,
  fetchGymPermissions,
  fetchGymRoles,
  updateGymRole,
  type GymPermission,
  type GymRole,
} from "@/lib/gym-roles-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/roles")({
  head: () => ({ meta: [{ title: "Roles & Permissions — GymmerzHub" }] }),
  component: RolesPage,
});

type RoleFormState = {
  name: string;
  description: string;
  permissionKeys: Set<string>;
};

function emptyForm(): RoleFormState {
  return { name: "", description: "", permissionKeys: new Set() };
}

function formFromRole(role: GymRole): RoleFormState {
  return {
    name: role.name,
    description: role.description ?? "",
    permissionKeys: new Set(role.permissionKeys),
  };
}

function RolesPage() {
  const [roles, setRoles] = useState<GymRole[]>([]);
  const [permissions, setPermissions] = useState<GymPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GymRole | null>(null);
  const [form, setForm] = useState<RoleFormState>(emptyForm());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const byCategory = useMemo(() => {
    const map = new Map<string, GymPermission[]>();
    for (const p of permissions) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return [...map.entries()];
  }, [permissions]);

  const selected = roles.find((r) => r.id === selectedId) ?? roles[0] ?? null;

  async function load() {
    setLoading(true);
    try {
      const [permData, roleData] = await Promise.all([fetchGymPermissions(), fetchGymRoles()]);
      setPermissions(permData.permissions);
      setRoles(roleData.roles);
      setSelectedId((prev) => {
        if (prev && roleData.roles.some((r) => r.id === prev)) return prev;
        return roleData.roles[0]?.id ?? null;
      });
    } catch (error) {
      toast.error(formatApiError(error, "Could not load roles"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(role: GymRole) {
    setEditing(role);
    setForm(formFromRole(role));
    setDialogOpen(true);
  }

  function togglePermission(key: string, checked: boolean) {
    setForm((prev) => {
      const next = new Set(prev.permissionKeys);
      if (checked) next.add(key);
      else next.delete(key);
      return { ...prev, permissionKeys: next };
    });
  }

  function toggleCategory(keys: string[], checked: boolean) {
    setForm((prev) => {
      const next = new Set(prev.permissionKeys);
      for (const key of keys) {
        if (checked) next.add(key);
        else next.delete(key);
      }
      return { ...prev, permissionKeys: next };
    });
  }

  async function saveRole() {
    const name = form.name.trim();
    if (name.length < 2) {
      toast.error("Role name must be at least 2 characters");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        description: form.description.trim() || null,
        permissionKeys: [...form.permissionKeys],
      };

      if (editing) {
        const updated = await updateGymRole(editing.id, payload);
        setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        setSelectedId(updated.id);
        toast.success("Role updated");
      } else {
        const created = await createGymRole(payload);
        setRoles((prev) => [...prev, created].sort((a, b) => Number(b.isSystem) - Number(a.isSystem) || a.name.localeCompare(b.name)));
        setSelectedId(created.id);
        toast.success("Role created");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(formatApiError(error, "Could not save role"));
    } finally {
      setSaving(false);
    }
  }

  async function removeRole(role: GymRole) {
    if (role.isSystem) return;
    if (!window.confirm(`Delete role “${role.name}”? Staff using it will lose this assignment.`)) {
      return;
    }
    try {
      await deleteGymRole(role.id);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      if (selectedId === role.id) {
        setSelectedId(null);
      }
      toast.success("Role deleted");
    } catch (error) {
      toast.error(formatApiError(error, "Could not delete role"));
    }
  }

  return (
    <div>
      <PageHeader
        badge="Team"
        title="Roles & Permissions"
        description="Default Operator and Trainer roles are ready. Create more roles and choose what each can do."
      />

      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground max-w-xl">
            Owners always have full access. Assign these roles when you invite staff.
          </p>
          <Button onClick={openCreate} className="bg-lime text-lime-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Create role
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-16 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading roles…
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <Card className="border-border bg-card shadow-card h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base">Roles</CardTitle>
                <CardDescription>{roles.length} in this gym</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedId(role.id)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                      selected?.id === role.id
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:bg-muted/60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{role.name}</span>
                      {role.isSystem && (
                        <Badge variant="secondary" className="text-[10px]">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {role.permissionKeys.length} permissions
                    </p>
                  </button>
                ))}
              </CardContent>
            </Card>

            {selected ? (
              <Card className="border-border bg-card shadow-card">
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <CardTitle className="font-display">{selected.name}</CardTitle>
                      {selected.isSystem && <Badge variant="secondary">Default</Badge>}
                    </div>
                    <CardDescription>
                      {selected.description || "No description"}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(selected)}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit permissions
                    </Button>
                    {!selected.isSystem && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => void removeRole(selected)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {byCategory.map(([category, perms]) => {
                    const keys = perms.map((p) => p.key);
                    const enabled = keys.filter((k) => selected.permissionKeys.includes(k));
                    return (
                      <div key={category}>
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {category}
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {enabled.length}/{keys.length}
                          </span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {perms.map((p) => {
                            const on = selected.permissionKeys.includes(p.key);
                            return (
                              <div
                                key={p.key}
                                className={cn(
                                  "rounded-lg border px-3 py-2.5",
                                  on ? "border-primary/30 bg-primary/5" : "border-border opacity-60",
                                )}
                              >
                                <div className="text-sm font-medium">{p.name}</div>
                                <div className="text-xs text-muted-foreground">{p.description}</div>
                              </div>
                            );
                          })}
                        </div>
                        <Separator className="mt-4" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border bg-card shadow-card">
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                  No roles yet. Create one to get started.
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? `Edit ${editing.name}` : "Create role"}
            </DialogTitle>
            <DialogDescription>
              Choose a name and the permissions this role should have in the gym hub.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Role name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Manager"
                disabled={Boolean(editing?.isSystem)}
              />
              {editing?.isSystem && (
                <p className="text-xs text-muted-foreground">
                  Default role names stay Operator / Trainer. You can still change permissions.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What this role is for"
                rows={2}
              />
            </div>

            <div className="space-y-4">
              <Label>Permissions</Label>
              {byCategory.map(([category, perms]) => {
                const keys = perms.map((p) => p.key);
                const allOn = keys.every((k) => form.permissionKeys.has(k));
                const someOn = keys.some((k) => form.permissionKeys.has(k));
                return (
                  <div key={category} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{category}</span>
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => toggleCategory(keys, !allOn)}
                      >
                        {allOn ? "Clear" : someOn ? "Select all" : "Select all"}
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {perms.map((p) => {
                        const checked = form.permissionKeys.has(p.key);
                        return (
                          <label
                            key={p.key}
                            className="flex cursor-pointer items-start gap-2 rounded-md border border-transparent px-1 py-1.5 hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => togglePermission(p.key, v === true)}
                              className="mt-0.5"
                            />
                            <span>
                              <span className="block text-sm font-medium leading-tight">{p.name}</span>
                              <span className="block text-xs text-muted-foreground">{p.description}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void saveRole()} disabled={saving} className="bg-lime text-lime-foreground">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : editing ? (
                "Save changes"
              ) : (
                "Create role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
