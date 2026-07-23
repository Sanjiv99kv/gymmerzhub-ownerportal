import { apiRequest } from "@/lib/api";
import { getAccessToken } from "@/lib/tenant";

export type DurationUnit = "days" | "weeks" | "months" | "years";
export type PlanStatus = "active" | "inactive";

export type MembershipPlan = {
  id: string;
  gymId: string;
  name: string;
  durationValue: number;
  durationUnit: DurationUnit;
  basePrice: number;
  registrationFee: number;
  gstPercent: number;
  tagline: string;
  benefits: string[];
  status: PlanStatus;
  displayOrder: number;
  highlight: boolean;
  badge: string | null;
  sold: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MemberStatus = "active" | "expired" | "suspended" | "frozen";
export type MemberGender = "Male" | "Female" | "Other";

export type MemberMembership = {
  id: string;
  planId: string;
  planName: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  priceCharged: number | null;
  paymentMethod: string | null;
  notes: string | null;
  discount: {
    id: string | null;
    name: string;
    amount: number;
  } | null;
  createdAt: string | null;
};

export type GymMember = {
  id: string;
  gymId: string;
  memberCode: string;
  fullName: string;
  name: string;
  phone: string;
  email: string | null;
  age: number | null;
  gender: MemberGender | null;
  photoUrl: string | null;
  photo: string | null;
  status: MemberStatus;
  joinDate: string | null;
  notes: string | null;
  plan: string | null;
  planId: string | null;
  expiryDate: string | null;
  currentMembership: MemberMembership | null;
  attendance: number;
  appAccess?: {
    linked: boolean;
    userId: string | null;
    canInvite: boolean;
    inviteStatus: string | null;
    pendingInviteId: string | null;
    inviteExpiresAt: string | null;
  };
};

export type ExpiringMembership = {
  membershipId: string;
  memberId: string;
  name: string;
  phone: string;
  photo: string | null;
  planId: string;
  planName: string | null;
  expiryDate: string;
  daysRemaining: number;
};

export type DiscountType = "percentage" | "fixed";

export type MembershipDiscount = {
  id: string;
  gymId: string;
  name: string;
  code: string;
  type: DiscountType;
  value: number;
  startDate: string | null;
  endDate: string | null;
  applicablePlanIds: string[];
  active: boolean;
  used: number;
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

export async function fetchPlans(status?: PlanStatus) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await apiRequest<ApiSuccess<{ plans: MembershipPlan[] }>>(
    `/api/owner/plans${qs}`,
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data.plans;
}

export async function createPlan(body: {
  name: string;
  durationValue: number;
  durationUnit: DurationUnit;
  basePrice: number;
  registrationFee?: number;
  gstPercent?: number;
  tagline?: string | null;
  benefits?: string[];
  status?: PlanStatus;
  displayOrder?: number;
  highlight?: boolean;
  badge?: string | null;
}) {
  const res = await apiRequest<ApiSuccess<{ plan: MembershipPlan }>>("/api/owner/plans", {
    method: "POST",
    token: tokenOrThrow(),
    body,
  });
  return res.data.plan;
}

export async function updatePlan(
  planId: string,
  body: Partial<{
    name: string;
    durationValue: number;
    durationUnit: DurationUnit;
    basePrice: number;
    registrationFee: number;
    gstPercent: number;
    tagline: string | null;
    benefits: string[];
    status: PlanStatus;
    displayOrder: number;
    highlight: boolean;
    badge: string | null;
  }>,
) {
  const res = await apiRequest<ApiSuccess<{ plan: MembershipPlan }>>(
    `/api/owner/plans/${planId}`,
    { method: "PATCH", token: tokenOrThrow(), body },
  );
  return res.data.plan;
}

export async function deletePlan(planId: string) {
  const res = await apiRequest<ApiSuccess<{ deleted: boolean }>>(
    `/api/owner/plans/${planId}`,
    { method: "DELETE", token: tokenOrThrow() },
  );
  return res.data;
}

export async function fetchMembers(params?: { status?: string; q?: string }) {
  const sp = new URLSearchParams();
  if (params?.status && params.status !== "all") sp.set("status", params.status);
  if (params?.q) sp.set("q", params.q);
  const qs = sp.toString() ? `?${sp}` : "";
  const res = await apiRequest<ApiSuccess<{ members: GymMember[] }>>(
    `/api/owner/members${qs}`,
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data.members;
}

/** Lean hit from GET /api/owner/members/search */
export type MemberSearchHit = {
  id: string;
  memberCode: string;
  name: string;
  phone: string;
  photo: string | null;
  joinDate: string | null;
  plan: string | null;
  currentMembership: {
    status: string;
    startDate: string | null;
    endDate: string | null;
    planName: string | null;
  } | null;
};

/** Typeahead search for assign flows (member code / name / phone). */
export async function searchMembers(q: string, limit = 15) {
  const term = q.trim();
  if (!term) return [];
  const sp = new URLSearchParams({ q: term, limit: String(limit) });
  const res = await apiRequest<ApiSuccess<{ members: MemberSearchHit[]; query: string }>>(
    `/api/owner/members/search?${sp}`,
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data.members;
}

export async function fetchMember(memberId: string) {
  const res = await apiRequest<ApiSuccess<{ member: GymMember; memberships: MemberMembership[] }>>(
    `/api/owner/members/${memberId}`,
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data;
}

export async function createMember(body: {
  fullName: string;
  phone: string;
  email?: string | null;
  age?: number | null;
  gender?: MemberGender | null;
  joinDate?: string;
  notes?: string | null;
}) {
  const res = await apiRequest<ApiSuccess<{ member: GymMember }>>("/api/owner/members", {
    method: "POST",
    token: tokenOrThrow(),
    body,
  });
  return res.data.member;
}

export async function updateMember(
  memberId: string,
  body: Partial<{
    fullName: string;
    phone: string;
    email: string | null;
    age: number | null;
    gender: MemberGender | null;
    status: MemberStatus;
    joinDate: string;
    notes: string | null;
  }>,
) {
  const res = await apiRequest<ApiSuccess<{ member: GymMember }>>(
    `/api/owner/members/${memberId}`,
    { method: "PATCH", token: tokenOrThrow(), body },
  );
  return res.data.member;
}

export async function deleteMember(memberId: string) {
  const res = await apiRequest<ApiSuccess<{ deleted: boolean }>>(
    `/api/owner/members/${memberId}`,
    { method: "DELETE", token: tokenOrThrow() },
  );
  return res.data;
}

export async function assignMembership(
  memberId: string,
  body: {
    planId: string;
    startDate?: string;
    endDate?: string;
    priceCharged?: number | null;
    paymentMethod?: string | null;
    notes?: string | null;
    replaceActive?: boolean;
    discountId?: string | null;
    discountAmount?: number | null;
  },
) {
  const res = await apiRequest<
    ApiSuccess<{ membership: MemberMembership; member: GymMember }>
  >(`/api/owner/members/${memberId}/memberships`, {
    method: "POST",
    token: tokenOrThrow(),
    body,
  });
  return res.data;
}

export async function fetchExpiringMemberships(days = 7) {
  const res = await apiRequest<ApiSuccess<{ items: ExpiringMembership[] }>>(
    `/api/owner/members/expiring?days=${days}`,
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data.items;
}

export async function fetchMemberStats() {
  const res = await apiRequest<
    ApiSuccess<{
      totalMembers: number;
      activeMembers: number;
      activeMemberships: number;
      expiringThisWeek: number;
    }>
  >("/api/owner/members/stats", { method: "GET", token: tokenOrThrow() });
  return res.data;
}

export async function fetchDiscounts() {
  const res = await apiRequest<ApiSuccess<{ discounts: MembershipDiscount[] }>>(
    "/api/owner/discounts",
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data.discounts;
}

export async function createDiscount(body: {
  name: string;
  code: string;
  type: DiscountType;
  value: number;
  startDate: string;
  endDate: string;
  applicablePlanIds?: string[];
  active?: boolean;
}) {
  const res = await apiRequest<ApiSuccess<{ discount: MembershipDiscount }>>(
    "/api/owner/discounts",
    { method: "POST", token: tokenOrThrow(), body },
  );
  return res.data.discount;
}

export async function updateDiscount(
  discountId: string,
  body: Partial<{
    name: string;
    code: string;
    type: DiscountType;
    value: number;
    startDate: string;
    endDate: string;
    applicablePlanIds: string[];
    active: boolean;
  }>,
) {
  const res = await apiRequest<ApiSuccess<{ discount: MembershipDiscount }>>(
    `/api/owner/discounts/${discountId}`,
    { method: "PATCH", token: tokenOrThrow(), body },
  );
  return res.data.discount;
}

export async function deleteDiscount(discountId: string) {
  const res = await apiRequest<ApiSuccess<{ deleted: boolean }>>(
    `/api/owner/discounts/${discountId}`,
    { method: "DELETE", token: tokenOrThrow() },
  );
  return res.data;
}

export type MemberAppInvite = {
  id: string;
  gymMemberId: string;
  email: string;
  memberName: string | null;
  memberCode: string | null;
  expiresAt: string | null;
  status: string;
  inviteUrl?: string;
};

export async function inviteMemberToApp(memberId: string, email?: string | null) {
  const res = await apiRequest<
    ApiSuccess<{ invite: MemberAppInvite; emailSent: boolean; emailSkipped?: boolean }>
  >(`/api/owner/members/${memberId}/invite`, {
    method: "POST",
    token: tokenOrThrow(),
    body: email ? { email } : {},
  });
  return res.data;
}

export async function revokeMemberAppInvite(inviteId: string) {
  const res = await apiRequest<ApiSuccess<{ revoked: boolean }>>(
    `/api/owner/members/invites/${inviteId}`,
    { method: "DELETE", token: tokenOrThrow() },
  );
  return res.data;
}

export type MemberInvitePreview = {
  email: string;
  fullName: string;
  gymName: string;
  gymSlug: string;
  expiresAt: string;
  accountExists: boolean;
  status: string;
};

export async function previewMemberInvite(token: string) {
  const res = await apiRequest<ApiSuccess<MemberInvitePreview>>(
    `/api/owner/members/invites/accept/${token}`,
    { method: "GET" },
  );
  return res.data;
}

export async function acceptMemberInvite(token: string, password: string) {
  return apiRequest<
    ApiSuccess<{
      gym: { id: string; name: string; slug: string };
      member: { id: string; fullName: string; memberCode: string; email: string };
      user: { id: string; email: string; fullName: string };
      message: string;
    }>
  >(`/api/owner/members/invites/accept/${token}`, {
    method: "POST",
    body: { password },
  });
}

export type MembershipHistoryItem = {
  id: string;
  date: string | null;
  action: string;
  plan: string;
  amount: number | null;
  amountLabel: string;
  discount: { name: string; amount: number; label: string } | null;
  type: string;
  status: string;
  paymentMethod: string | null;
  endDate: string | null;
  createdAt: string | null;
};

export type MemberPayment = {
  id: string;
  gymId: string;
  memberId: string;
  membershipId: string | null;
  amount: number;
  method: string;
  status: "paid" | "pending" | "failed" | "refunded";
  paidAt: string | null;
  notes: string | null;
  planName: string | null;
  discount: { name: string; amount: number } | null;
  createdAt: string | null;
};

export type MemberPaymentSummary = {
  totalPaid: number;
  transactionCount: number;
  lastPaymentDate: string | null;
  outstanding: number;
};

export type MemberActivity = {
  id: string;
  type: string;
  message: string;
  metadata: Record<string, unknown>;
  when: string;
  createdAt: string | null;
};

export type MemberNote = {
  id: string;
  gymId: string;
  memberId: string;
  body: string;
  createdByUserId: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function fetchMemberHistory(memberId: string) {
  const res = await apiRequest<ApiSuccess<{ items: MembershipHistoryItem[] }>>(
    `/api/owner/members/${memberId}/history`,
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data.items;
}

export async function fetchMemberPayments(memberId: string) {
  const res = await apiRequest<
    ApiSuccess<{ payments: MemberPayment[]; summary: MemberPaymentSummary }>
  >(`/api/owner/members/${memberId}/payments`, {
    method: "GET",
    token: tokenOrThrow(),
  });
  return res.data;
}

export async function createMemberPayment(
  memberId: string,
  body: {
    amount: number;
    method: string;
    status?: string;
    paidAt?: string;
    membershipId?: string | null;
    notes?: string | null;
  },
) {
  const res = await apiRequest<ApiSuccess<{ payment: MemberPayment }>>(
    `/api/owner/members/${memberId}/payments`,
    { method: "POST", token: tokenOrThrow(), body },
  );
  return res.data.payment;
}

export async function fetchMemberActivity(memberId: string, limit = 50) {
  const res = await apiRequest<ApiSuccess<{ activities: MemberActivity[] }>>(
    `/api/owner/members/${memberId}/activity?limit=${limit}`,
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data.activities;
}

export async function fetchMemberNotes(memberId: string) {
  const res = await apiRequest<ApiSuccess<{ notes: MemberNote[] }>>(
    `/api/owner/members/${memberId}/notes`,
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data.notes;
}

export async function createMemberNote(memberId: string, body: string) {
  const res = await apiRequest<ApiSuccess<{ note: MemberNote }>>(
    `/api/owner/members/${memberId}/notes`,
    { method: "POST", token: tokenOrThrow(), body: { body } },
  );
  return res.data.note;
}

export async function deleteMemberNote(memberId: string, noteId: string) {
  await apiRequest<ApiSuccess<{ deleted: boolean }>>(
    `/api/owner/members/${memberId}/notes/${noteId}`,
    { method: "DELETE", token: tokenOrThrow() },
  );
}

export async function fetchMemberDetailBundle(memberId: string) {
  const [core, history, payments, activities, notes] = await Promise.all([
    fetchMember(memberId),
    fetchMemberHistory(memberId),
    fetchMemberPayments(memberId),
    fetchMemberActivity(memberId),
    fetchMemberNotes(memberId),
  ]);
  return {
    member: core.member,
    memberships: core.memberships,
    history,
    payments: payments.payments,
    paymentSummary: payments.summary,
    activities,
    notes,
  };
}
