import { apiRequest, withListPaging } from "@/lib/api";
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

export type DietSlotTargets = {
  protein: number;
  carbs: number;
  fat: number;
  cal: number;
};

export type DietSlotItem = {
  id: string;
  foodItemId: string;
  quantity: number;
  notes: string | null;
  name: string;
  dietType: string | null;
  servingUnit: string;
  servingQty: number;
  imageUrl: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type DietPlanSlot = {
  id: string;
  name: string;
  timeHint: string;
  sortOrder: number;
  targets: DietSlotTargets;
  options: DietPlanSlotOption[];
};

export type DietPlanSlotOption = {
  id: string;
  isDefault: boolean;
  sortOrder: number;
  items: DietSlotItem[];
};

export type DietPlanDay = {
  dayIndex: number;
  /** Weekday label: mon–sun */
  day?: string;
  slots: DietPlanSlot[];
};

export type DietPlan = {
  id: string;
  name: string;
  tag: string;
  goal: string;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
  /** Present on detail only — omitted from list endpoints. */
  days?: DietPlanDay[];
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

export async function fetchDietPlans(params?: { status?: "active" | "inactive"; q?: string }) {
  const qs = withListPaging({
    status: params?.status,
    q: params?.q,
  });
  const res = await apiRequest<ApiSuccess<{ plans: DietPlan[] }>>(
    `/api/owner/diet-plans${qs}`,
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data.plans;
}

export async function fetchDietPlan(planId: string, day: string = "mon") {
  const qs = new URLSearchParams({ day });
  const res = await apiRequest<ApiSuccess<{ plan: DietPlan }>>(
    `/api/owner/diet-plans/${planId}?${qs}`,
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data.plan;
}

export async function fetchDietPlanAssignments(planId: string) {
  const res = await apiRequest<ApiSuccess<{ assignments: DietPlanAssignment[] }>>(
    `/api/owner/diet-plans/${planId}/assignments${withListPaging()}`,
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
