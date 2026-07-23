import { apiFormRequest, apiRequest } from "@/lib/api";
import type { GymPlan, BillingStatus } from "@/lib/tenant";

export type OwnerUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl?: string | null;
  emailVerifiedAt: string | null;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  status: string;
  lastLoginAt: string | null;
};

export type OwnerGym = {
  id: string;
  name: string;
  slug: string;
  state: string | null;
  stateCode: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  status: string;
  platformPlan: GymPlan;
  billingStatus: BillingStatus;
  trialEndsAt: string | null;
  workspaceUrl: string;
  createdAt: string | null;
};

export type OwnerAuthData = {
  token: string;
  user: OwnerUser;
  gym: OwnerGym;
  membership?: {
    role: string;
    gymRoleId: string | null;
    gymRoleName: string | null;
    permissionKeys?: string[];
    mfaRequired: boolean;
    mfaSetupRequired: boolean;
  };
  mfaSetupRequired?: boolean;
};

export type OwnerMfaChallengeData = {
  mfaRequired: true;
  mfaToken: string;
  email: string;
  gymName: string;
};

export type OwnerLoginData = OwnerAuthData | OwnerMfaChallengeData;

export function isOwnerMfaChallenge(data: OwnerLoginData): data is OwnerMfaChallengeData {
  return "mfaRequired" in data && data.mfaRequired === true;
}

type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

export type OwnerOtpSentData = {
  email: string;
  expiresInMinutes: number;
  workspaceUrl: string;
  emailSent: boolean;
  devOtp?: string;
};

export type OwnerSlugCheckData = {
  slug: string;
  available: boolean;
  workspaceUrl: string;
};

export type OwnerRegisterInput = {
  gymName: string;
  slug: string;
  state: string;
  stateCode: string;
  city: string;
  address: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  plan: GymPlan;
};

export function checkOwnerSlug(slug: string) {
  const query = new URLSearchParams({ slug }).toString();
  return apiRequest<ApiSuccess<OwnerSlugCheckData>>(`/api/owner/auth/check-slug?${query}`);
}

export function registerOwner(input: OwnerRegisterInput) {
  return apiRequest<ApiSuccess<OwnerOtpSentData>>("/api/owner/auth/register", {
    method: "POST",
    body: input,
  });
}

export function verifyOwnerOtp(input: { email: string; otp: string }) {
  return apiRequest<ApiSuccess<OwnerAuthData>>("/api/owner/auth/verify-otp", {
    method: "POST",
    body: input,
  });
}

export function resendOwnerOtp(input: { email: string }) {
  return apiRequest<ApiSuccess<OwnerOtpSentData>>("/api/owner/auth/resend-otp", {
    method: "POST",
    body: input,
  });
}

export function loginOwner(input: { slug: string; email: string; password: string }) {
  return apiRequest<ApiSuccess<OwnerLoginData>>("/api/owner/auth/login", {
    method: "POST",
    body: input,
  });
}

export function verifyOwnerMfa(input: { mfaToken: string; code: string }) {
  return apiRequest<ApiSuccess<OwnerAuthData>>("/api/owner/auth/verify-mfa", {
    method: "POST",
    body: input,
  });
}

export function logoutOwner(token: string) {
  return apiRequest<ApiSuccess<undefined>>("/api/owner/auth/logout", {
    method: "POST",
    token,
  });
}

export function fetchOwnerMe(token: string) {
  return apiRequest<
    ApiSuccess<{
      user: OwnerUser;
      gym: OwnerGym;
      membership?: {
        role: string;
        gymRoleId: string | null;
        gymRoleName: string | null;
        permissionKeys?: string[];
        mfaRequired: boolean;
        mfaSetupRequired: boolean;
      };
    }>
  >("/api/owner/auth/me", {
    method: "GET",
    token,
  });
}

export function updateOwnerProfile(
  token: string,
  body: { fullName: string; phone?: string | null },
) {
  return apiRequest<
    ApiSuccess<{
      user: OwnerUser;
      gym: OwnerGym;
      membership?: {
        role: string;
        gymRoleId: string | null;
        gymRoleName: string | null;
        mfaRequired: boolean;
        mfaSetupRequired: boolean;
      };
    }>
  >("/api/owner/auth/profile", {
    method: "PATCH",
    token,
    body,
  });
}

export function uploadOwnerAvatar(token: string, file: File) {
  const formData = new FormData();
  formData.append("avatar", file);
  return apiFormRequest<ApiSuccess<{ user: OwnerUser }>>("/api/owner/auth/avatar", {
    formData,
    token,
  });
}

export function removeOwnerAvatar(token: string) {
  return apiRequest<ApiSuccess<{ user: OwnerUser }>>("/api/owner/auth/avatar", {
    method: "DELETE",
    token,
  });
}

export type OwnerMfaStatus = {
  enabled: boolean;
  enabledAt: string | null;
  setupPending: boolean;
};

export type OwnerMfaSetupData = {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
};

export function fetchOwnerMfaStatus(token: string) {
  return apiRequest<ApiSuccess<OwnerMfaStatus>>("/api/owner/auth/mfa", {
    method: "GET",
    token,
  });
}

export function setupOwnerMfa(token: string) {
  return apiRequest<ApiSuccess<OwnerMfaSetupData>>("/api/owner/auth/mfa/setup", {
    method: "POST",
    token,
  });
}

export function enableOwnerMfa(token: string, code: string) {
  return apiRequest<ApiSuccess<{ enabled: boolean; user: OwnerUser }>>("/api/owner/auth/mfa/enable", {
    method: "POST",
    token,
    body: { code },
  });
}

export function disableOwnerMfa(token: string, input: { password: string; code: string }) {
  return apiRequest<ApiSuccess<{ enabled: boolean; user: OwnerUser }>>("/api/owner/auth/mfa/disable", {
    method: "POST",
    token,
    body: input,
  });
}

export type OwnerSession = {
  id: string;
  ipAddress: string | null;
  deviceLabel: string;
  userAgent: string | null;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};

export function fetchOwnerSessions(token: string) {
  return apiRequest<ApiSuccess<{ sessions: OwnerSession[] }>>("/api/owner/auth/sessions", {
    method: "GET",
    token,
  });
}

export function revokeOwnerSession(token: string, sessionId: string) {
  return apiRequest<ApiSuccess<{ revoked: boolean; current: boolean }>>(
    `/api/owner/auth/sessions/${sessionId}`,
    {
      method: "DELETE",
      token,
    },
  );
}
