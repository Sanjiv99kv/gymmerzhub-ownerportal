import { apiRequest } from "@/lib/api";
import { getAccessToken } from "@/lib/tenant";
import type { OwnerAuthData } from "@/lib/owner-auth-api";

type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

function tokenOrThrow() {
  const token = getAccessToken();
  if (!token) throw new Error("Not signed in");
  return token;
}

export type StaffInvite = {
  id: string;
  email: string;
  fullName: string;
  role: { id: string; name: string; slug: string } | null;
  expiresAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string | null;
  status: "pending" | "accepted" | "revoked" | "expired";
  inviteUrl?: string;
};

export type TeamMember = {
  id: string;
  role: string;
  status: string;
  gymRole: { id: string; name: string; slug: string } | null;
  user: {
    id: string;
    email: string;
    fullName: string;
    mfaEnabled: boolean;
    lastLoginAt: string | null;
  } | null;
  lastActiveAt: string | null;
  createdAt: string | null;
};

export type StaffInvitePreview = {
  fullName: string;
  email: string;
  gymName: string;
  gymSlug: string | null;
  roleName: string;
  expiresAt: string;
  accountExists: boolean;
};

export async function fetchTeamMembers() {
  const res = await apiRequest<ApiSuccess<{ members: TeamMember[] }>>("/api/owner/staff/members", {
    method: "GET",
    token: tokenOrThrow(),
  });
  return res.data;
}

export async function fetchStaffInvites() {
  const res = await apiRequest<ApiSuccess<{ invites: StaffInvite[]; expiresHours: number }>>(
    "/api/owner/staff/invites",
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data;
}

export async function createStaffInvite(body: {
  fullName: string;
  email: string;
  gymRoleId: string;
}) {
  const res = await apiRequest<
    ApiSuccess<{ invite: StaffInvite; emailSent: boolean; emailSkipped: boolean }>
  >("/api/owner/staff/invites", {
    method: "POST",
    token: tokenOrThrow(),
    body,
  });
  return res;
}

export async function revokeStaffInvite(inviteId: string) {
  const res = await apiRequest<ApiSuccess<{ revoked: boolean }>>(
    `/api/owner/staff/invites/${inviteId}`,
    { method: "DELETE", token: tokenOrThrow() },
  );
  return res.data;
}

export async function updateTeamMember(
  membershipId: string,
  body: {
    gymRoleId?: string;
    status?: "active" | "suspended";
  },
) {
  const res = await apiRequest<ApiSuccess<{ member: TeamMember }>>(
    `/api/owner/staff/members/${membershipId}`,
    { method: "PATCH", token: tokenOrThrow(), body },
  );
  return res.data.member;
}

export async function previewStaffInvite(token: string) {
  const res = await apiRequest<ApiSuccess<StaffInvitePreview>>(
    `/api/owner/staff/invites/accept/${encodeURIComponent(token)}`,
    { method: "GET" },
  );
  return res.data;
}

export async function acceptStaffInvite(token: string, password: string) {
  const res = await apiRequest<ApiSuccess<OwnerAuthData>>(
    `/api/owner/staff/invites/accept/${encodeURIComponent(token)}`,
    { method: "POST", body: { password } },
  );
  return res;
}
