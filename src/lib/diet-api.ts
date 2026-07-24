import { apiRequest } from "@/lib/api";
import { getAccessToken } from "@/lib/tenant";

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

export type MealTargets = {
  protein: number;
  carbs: number;
  fat: number;
  cal: number;
};

export type DietMealOption = {
  label: string;
  items: string[];
  protein: number;
  carbs: number;
  fat: number;
  cal: number;
};

/** Meal slot: hit the target by picking any one option. */
export type DietMealSlot = {
  name: string;
  time: string;
  targets: MealTargets;
  options: DietMealOption[];
};

export type DietPlan = {
  id: string;
  gymId: string;
  name: string;
  tag: string;
  goal: string;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
  meals: DietMealSlot[];
  notes: string;
  status: "active" | "inactive";
  assigned: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MemberDietAssignment = {
  id: string;
  memberId: string;
  dietPlanId: string;
  status: string;
  notes: string | null;
  assignedAt: string | null;
  endedAt: string | null;
  plan: DietPlan | null;
  createdBy: string | null;
  createdAt: string | null;
};

export type DietPlanAssignmentMember = {
  id: string;
  name: string;
  memberCode: string;
  phone: string | null;
  photo: string | null;
};

export type DietPlanAssignment = {
  id: string;
  memberId: string;
  dietPlanId: string;
  status: string;
  notes: string | null;
  assignedAt: string | null;
  member: DietPlanAssignmentMember | null;
};

export type DietPlanInput = {
  name: string;
  tag?: string | null;
  goal?: string | null;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
  meals: DietMealSlot[];
  notes?: string | null;
  status?: "active" | "inactive";
};

export async function fetchDietPlans(status?: "active" | "inactive") {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await apiRequest<ApiSuccess<{ plans: DietPlan[] }>>(
    `/api/owner/diet-plans${qs}`,
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data.plans;
}

export async function createDietPlan(body: DietPlanInput) {
  const res = await apiRequest<ApiSuccess<{ plan: DietPlan }>>("/api/owner/diet-plans", {
    method: "POST",
    token: tokenOrThrow(),
    body,
  });
  return res.data.plan;
}

export async function updateDietPlan(planId: string, body: Partial<DietPlanInput>) {
  const res = await apiRequest<ApiSuccess<{ plan: DietPlan }>>(
    `/api/owner/diet-plans/${planId}`,
    { method: "PATCH", token: tokenOrThrow(), body },
  );
  return res.data.plan;
}

export async function deleteDietPlan(planId: string) {
  const res = await apiRequest<ApiSuccess<{ deleted: boolean }>>(
    `/api/owner/diet-plans/${planId}`,
    { method: "DELETE", token: tokenOrThrow() },
  );
  return res.data;
}

export async function fetchDietPlanAssignments(planId: string) {
  const res = await apiRequest<ApiSuccess<{ assignments: DietPlanAssignment[] }>>(
    `/api/owner/diet-plans/${planId}/assignments`,
    {
      method: "GET",
      token: tokenOrThrow(),
    },
  );
  return res.data.assignments;
}

export async function assignDietPlan(
  planId: string,
  body: { memberId: string; notes?: string | null; assignedAt?: string },
) {
  const res = await apiRequest<ApiSuccess<{ assignment: MemberDietAssignment }>>(
    `/api/owner/diet-plans/${planId}/assign`,
    { method: "POST", token: tokenOrThrow(), body },
  );
  return res.data.assignment;
}

export async function fetchMemberDiet(memberId: string) {
  const res = await apiRequest<ApiSuccess<{ assignment: MemberDietAssignment | null }>>(
    `/api/owner/members/${memberId}/diet`,
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data.assignment;
}

export async function unassignMemberDiet(memberId: string) {
  const res = await apiRequest<ApiSuccess<{ unassigned: boolean }>>(
    `/api/owner/members/${memberId}/diet`,
    { method: "DELETE", token: tokenOrThrow() },
  );
  return res.data;
}
