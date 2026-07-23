import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatApiError } from "@/lib/api";
import { fetchGymRoles, type GymRole } from "@/lib/gym-roles-api";
import {
  createStaffInvite,
  fetchStaffInvites,
  fetchTeamMembers,
  revokeStaffInvite,
  updateTeamMember,
  type StaffInvite,
  type TeamMember,
} from "@/lib/staff-api";

export const Route = createFileRoute("/_app/team")({
  head: () => ({ meta: [{ title: "Team — GymmerzHub" }] }),
  component: TeamPage,
});

function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<StaffInvite[]>([]);
  const [roles, setRoles] = useState<GymRole[]>([]);
  const [expiresHours, setExpiresHours] = useState(72);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [gymRoleId, setGymRoleId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [team, inviteData, roleData] = await Promise.all([
        fetchTeamMembers(),
        fetchStaffInvites(),
        fetchGymRoles(),
      ]);
      setMembers(team.members);
      setInvites(inviteData.invites);
      setExpiresHours(inviteData.expiresHours);
      setRoles(roleData.roles);
      if (!gymRoleId && roleData.roles[0]) {
        setGymRoleId(roleData.roles[0].id);
      }
    } catch (error) {
      toast.error(formatApiError(error, "Could not load team"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openInvite() {
    setFullName("");
    setEmail("");
    setGymRoleId(roles.find((r) => r.slug === "operator")?.id || roles[0]?.id || "");
    setDialogOpen(true);
  }

  async function patchMember(
    membershipId: string,
    body: { gymRoleId?: string; status?: "active" | "suspended" },
    successMessage: string,
  ) {
    setUpdatingId(membershipId);
    try {
      const updated = await updateTeamMember(membershipId, body);
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      toast.success(successMessage);
    } catch (error) {
      toast.error(formatApiError(error, "Could not update team member"));
      await load();
    } finally {
      setUpdatingId(null);
    }
  }

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !gymRoleId) {
      toast.error("Name, email, and role are required");
      return;
    }
    setSaving(true);
    try {
      const result = await createStaffInvite({
        fullName: fullName.trim(),
        email: email.trim(),
        gymRoleId,
      });
      setInvites((prev) => [result.data.invite, ...prev]);
      setDialogOpen(false);
      if (result.data.emailSent) {
        toast.success("Invitation emailed");
      } else if (result.data.invite.inviteUrl) {
        toast.message("Invite created (email off) — link copied when possible");
        try {
          await navigator.clipboard.writeText(result.data.invite.inviteUrl);
          toast.success("Invite link copied");
        } catch {
          /* ignore */
        }
      } else {
        toast.message(result.message);
      }
    } catch (error) {
      toast.error(formatApiError(error, "Could not send invite"));
    } finally {
      setSaving(false);
    }
  }

  async function onRevoke(invite: StaffInvite) {
    if (!window.confirm(`Revoke invite for ${invite.email}?`)) return;
    try {
      await revokeStaffInvite(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      toast.success("Invite revoked");
    } catch (error) {
      toast.error(formatApiError(error, "Could not revoke invite"));
    }
  }

  return (
    <div>
      <PageHeader
        badge="Team"
        title="Staff & Invites"
        description="Invite staff, change roles, and enable or disable access."
      />

      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Invites expire after {expiresHours} hours. Disabling a person signs them out immediately.
          </p>
          <Button onClick={openInvite} className="bg-primary text-primary-foreground">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite staff
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading team…
          </div>
        ) : (
          <>
            <Card className="border-border bg-card shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-base">Team members</CardTitle>
                <CardDescription>Change roles or turn access on/off for staff.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="min-w-[160px]">Role</TableHead>
                      <TableHead>Last active</TableHead>
                      <TableHead className="w-[120px]">Enabled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m) => {
                      const isOwner = m.role === "owner";
                      const busy = updatingId === m.id;
                      return (
                        <TableRow key={m.id} className={m.status === "suspended" ? "opacity-70" : undefined}>
                          <TableCell className="font-medium">{m.user?.fullName ?? "—"}</TableCell>
                          <TableCell>{m.user?.email ?? "—"}</TableCell>
                          <TableCell>
                            {isOwner ? (
                              <Badge variant="secondary" className="rounded-full">Owner</Badge>
                            ) : (
                              <Select
                                value={m.gymRole?.id || ""}
                                disabled={busy || roles.length === 0}
                                onValueChange={(value) => {
                                  void patchMember(m.id, { gymRoleId: value }, "Role updated");
                                }}
                              >
                                <SelectTrigger
                                  className="h-6 w-auto min-w-0 gap-1 rounded-full border-transparent bg-secondary px-2.5 py-0 text-xs font-semibold text-secondary-foreground shadow-none hover:bg-secondary/80 focus:ring-0 focus:ring-offset-0 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-70"
                                >
                                  <SelectValue placeholder="Role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles.map((role) => (
                                    <SelectItem key={role.id} value={role.id}>
                                      {role.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {m.lastActiveAt
                              ? new Date(m.lastActiveAt).toLocaleString()
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {isOwner ? (
                              <Badge variant="secondary">Always</Badge>
                            ) : (
                              <Switch
                                checked={m.status === "active"}
                                disabled={busy}
                                onCheckedChange={(checked) => {
                                  void patchMember(
                                    m.id,
                                    { status: checked ? "active" : "suspended" },
                                    checked ? "Access enabled" : "Access disabled",
                                  );
                                }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-base">Pending invites</CardTitle>
                <CardDescription>Waiting for the person to accept and set a password.</CardDescription>
              </CardHeader>
              <CardContent>
                {invites.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No pending invites.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="w-[100px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invites.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell className="font-medium">{invite.fullName}</TableCell>
                          <TableCell>
                            <div>{invite.email}</div>
                            {invite.inviteUrl && (
                              <button
                                type="button"
                                className="text-xs text-primary hover:underline"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(invite.inviteUrl!);
                                    toast.success("Invite link copied");
                                  } catch {
                                    toast.error("Could not copy link");
                                  }
                                }}
                              >
                                Copy invite link
                              </button>
                            )}
                          </TableCell>
                          <TableCell>
                            {invite.role?.name ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {invite.expiresAt
                              ? new Date(invite.expiresAt).toLocaleString()
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => void onRevoke(invite)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Invite staff</DialogTitle>
            <DialogDescription>
              We’ll email them a link to create a password and join your gym.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onInvite} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Full name</Label>
              <Input
                id="invite-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Priya Sharma"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="priya@gym.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={gymRoleId} onValueChange={setGymRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                      {role.isSystem ? " (default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Send invite
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

