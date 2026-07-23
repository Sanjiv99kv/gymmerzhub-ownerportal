import { apiRequest } from "@/lib/api";
import { getAccessToken } from "@/lib/tenant";

export type GymPermission = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
};

export type GymRole = {
  id: string;
  gymId: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  permissionKeys: string[];
  permissions: GymPermission[];
  createdAt: string | null;
  updatedAt: string | null;
};

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

export async function fetchGymPermissions() {
  const res = await apiRequest<ApiSuccess<{ permissions: GymPermission[]; categories: string[] }>>(
    "/api/owner/roles/permissions",
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data;
}

export async function fetchGymRoles() {
  const res = await apiRequest<ApiSuccess<{ roles: GymRole[] }>>("/api/owner/roles", {
    method: "GET",
    token: tokenOrThrow(),
  });
  return res.data;
}

export async function createGymRole(body: {
  name: string;
  description?: string | null;
  permissionKeys: string[];
}) {
  const res = await apiRequest<ApiSuccess<{ role: GymRole }>>("/api/owner/roles", {
    method: "POST",
    token: tokenOrThrow(),
    body,
  });
  return res.data.role;
}

export async function updateGymRole(
  roleId: string,
  body: {
    name?: string;
    description?: string | null;
    permissionKeys?: string[];
  },
) {
  const res = await apiRequest<ApiSuccess<{ role: GymRole }>>(`/api/owner/roles/${roleId}`, {
    method: "PATCH",
    token: tokenOrThrow(),
    body,
  });
  return res.data.role;
}

export async function deleteGymRole(roleId: string) {
  const res = await apiRequest<ApiSuccess<{ deleted: boolean }>>(`/api/owner/roles/${roleId}`, {
    method: "DELETE",
    token: tokenOrThrow(),
  });
  return res.data;
}
