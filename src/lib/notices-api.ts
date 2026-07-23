import { apiRequest } from "@/lib/api";
import { getAccessToken } from "@/lib/tenant";

export type NoticeTag = "Holiday" | "Update" | "Challenge" | "Offer";
export type NoticeStatus = "draft" | "published";

export type GymNotice = {
  id: string;
  gymId: string;
  title: string;
  body: string;
  tag: NoticeTag;
  status: NoticeStatus;
  pinned: boolean;
  editable: boolean;
  publishedAt: string | null;
  createdByUserId: string;
  postedBy: string | null;
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

export async function fetchNotices(status?: NoticeStatus) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await apiRequest<ApiSuccess<{ notices: GymNotice[] }>>(
    `/api/owner/notices${qs}`,
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data.notices;
}

export async function fetchNotice(noticeId: string) {
  const res = await apiRequest<ApiSuccess<{ notice: GymNotice }>>(
    `/api/owner/notices/${noticeId}`,
    { method: "GET", token: tokenOrThrow() },
  );
  return res.data.notice;
}

export async function createNotice(body: {
  title: string;
  body: string;
  tag?: NoticeTag;
  status?: NoticeStatus;
  pinned?: boolean;
}) {
  const res = await apiRequest<ApiSuccess<{ notice: GymNotice }>>("/api/owner/notices", {
    method: "POST",
    token: tokenOrThrow(),
    body,
  });
  return res.data.notice;
}

export async function updateNotice(
  noticeId: string,
  body: {
    title?: string;
    body?: string;
    tag?: NoticeTag;
    status?: NoticeStatus;
    pinned?: boolean;
  },
) {
  const res = await apiRequest<ApiSuccess<{ notice: GymNotice }>>(
    `/api/owner/notices/${noticeId}`,
    {
      method: "PATCH",
      token: tokenOrThrow(),
      body,
    },
  );
  return res.data.notice;
}

export async function publishNotice(noticeId: string) {
  const res = await apiRequest<ApiSuccess<{ notice: GymNotice }>>(
    `/api/owner/notices/${noticeId}/publish`,
    { method: "POST", token: tokenOrThrow() },
  );
  return res.data.notice;
}

export async function deleteNotice(noticeId: string) {
  const res = await apiRequest<ApiSuccess<{ deleted: boolean }>>(
    `/api/owner/notices/${noticeId}`,
    { method: "DELETE", token: tokenOrThrow() },
  );
  return res.data;
}
