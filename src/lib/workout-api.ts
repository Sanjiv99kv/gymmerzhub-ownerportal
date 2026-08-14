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

export type WorkoutExercise = {
  name: string;
  targetMuscle: string;
  sets: number;
  reps: string;
  note: string;
  imageUrl: string;
  videoUrl: string;
};

export type WorkoutDay = {
  name: string;
  focus: string;
  exercises: WorkoutExercise[];
};

export type WorkoutPlan = {
  id: string;
  gymId: string;
  name: string;
  level: string;
  focus: string;
  goal: string;
  duration: string;
  daysPerWeek: number;
  description: string;
  notes: string;
  days: WorkoutDay[];
  status: "active" | "inactive";
  assigned: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MemberWorkoutAssignment = {
  id: string;
  memberId: string;
  workoutPlanId: string;
  status: string;
  notes: string | null;
  assignedAt: string | null;
  endedAt: string | null;
  plan: WorkoutPlan | null;
  createdBy: string | null;
  createdAt: string | null;
};

export type WorkoutPlanAssignmentMember = {
  id: string;
  name: string;
  memberCode: string;
  phone: string | null;
  photo: string | null;
};

export type WorkoutPlanAssignment = {
  id: string;
  memberId: string;
  workoutPlanId: string;
  status: string;
  notes: string | null;
  assignedAt: string | null;
  member: WorkoutPlanAssignmentMember | null;
};

export type WorkoutPlanInput = {
  name: string;
  level?: string | null;
  focus?: string | null;
  goal?: string | null;
  duration?: string | null;
  daysPerWeek?: number;
  description?: string | null;
  notes?: string | null;
  days: WorkoutDay[];
  status?: "active" | "inactive";
};

export async function fetchWorkoutPlans(status?: "active" | "inactive") {
  const qs = withListPaging({ status });
  const res = await apiRequest<ApiSuccess<{ plans: WorkoutPlan[] }>>(
    `/api/owner/workout-plans${qs}`,
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data.plans;
}

export async function createWorkoutPlan(body: WorkoutPlanInput) {
  const res = await apiRequest<ApiSuccess<{ plan: WorkoutPlan }>>("/api/owner/workout-plans", {
    method: "POST",
    token: tokenOrThrow(),
    body,
  });
  return res.data.plan;
}

export async function updateWorkoutPlan(planId: string, body: Partial<WorkoutPlanInput>) {
  const res = await apiRequest<ApiSuccess<{ plan: WorkoutPlan }>>(
    `/api/owner/workout-plans/${planId}`,
    { method: "PATCH", token: tokenOrThrow(), body },
  );
  return res.data.plan;
}

export async function deleteWorkoutPlan(planId: string) {
  const res = await apiRequest<ApiSuccess<{ deleted: boolean }>>(
    `/api/owner/workout-plans/${planId}`,
    { method: "DELETE", token: tokenOrThrow() },
  );
  return res.data;
}

export async function fetchWorkoutPlanAssignments(planId: string) {
  const res = await apiRequest<ApiSuccess<{ assignments: WorkoutPlanAssignment[] }>>(
    `/api/owner/workout-plans/${planId}/assignments${withListPaging()}`,
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data.assignments;
}

export async function assignWorkoutPlan(
  planId: string,
  body: { memberId: string; notes?: string | null; assignedAt?: string },
) {
  const res = await apiRequest<ApiSuccess<{ assignment: MemberWorkoutAssignment }>>(
    `/api/owner/workout-plans/${planId}/assign`,
    { method: "POST", token: tokenOrThrow(), body },
  );
  return res.data.assignment;
}

export async function fetchMemberWorkout(memberId: string) {
  const res = await apiRequest<ApiSuccess<{ assignment: MemberWorkoutAssignment | null }>>(
    `/api/owner/members/${memberId}/workout`,
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data.assignment;
}

export async function unassignMemberWorkout(memberId: string) {
  const res = await apiRequest<ApiSuccess<{ unassigned: boolean }>>(
    `/api/owner/members/${memberId}/workout`,
    { method: "DELETE", token: tokenOrThrow() },
  );
  return res.data;
}
