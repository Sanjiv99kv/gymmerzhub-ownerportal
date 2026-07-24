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

export type TrainerAvailability = "available" | "limited" | "unavailable";

export type TrainerSchedule = {
  days: string[];
  startTime: string;
  endTime: string;
  label: string;
};

export type Trainer = {
  id: string;
  membershipId: string;
  status: string;
  role: string;
  gymRole: { id: string; name: string; slug: string } | null;
  user: {
    id: string;
    email: string;
    fullName: string;
    photo: string | null;
  } | null;
  specialty: string;
  bio: string;
  availability: TrainerAvailability;
  schedule: TrainerSchedule;
  rating: number | null;
  ratingCount: number;
  membersAssigned: number;
  createdAt: string | null;
};

export type TrainerProfileInput = {
  specialty?: string | null;
  bio?: string | null;
  availability?: TrainerAvailability;
  schedule?: {
    days: string[];
    startTime: string;
    endTime: string;
  };
};

export async function fetchTrainers() {
  const res = await apiRequest<ApiSuccess<{ trainers: Trainer[] }>>("/api/owner/trainers", {
    method: "GET",
    token: tokenOrThrow(),
  });
  return res.data.trainers;
}

export async function updateTrainerProfile(membershipId: string, body: TrainerProfileInput) {
  const res = await apiRequest<ApiSuccess<{ trainer: Trainer }>>(
    `/api/owner/trainers/${membershipId}`,
    { method: "PATCH", token: tokenOrThrow(), body },
  );
  return res.data.trainer;
}
