import { expireSessionToLogin } from "@/lib/tenant";

export type ApiErrorBody = {
  success?: false;
  message?: string;
  error?: string;
  errors?: Array<{ field?: string; message?: string }>;
};

export class ApiError extends Error {
  status: number;
  errors: Array<{ field?: string; message?: string }>;

  constructor(status: number, message: string, errors: ApiErrorBody["errors"] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors ?? [];
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "")
  || "http://localhost:8800";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string | null;
};

let expiringSession = false;

/** Collapse concurrent identical GETs into one network call. */
const inflightGets = new Map<string, Promise<unknown>>();

function handleUnauthorizedSession() {
  if (expiringSession) return;
  expiringSession = true;
  expireSessionToLogin();
}

async function parseJsonResponse<T>(response: Response, token?: string | null): Promise<T> {
  let payload: (T & ApiErrorBody) | ApiErrorBody | null = null;
  try {
    payload = (await response.json()) as T & ApiErrorBody;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      handleUnauthorizedSession();
    }

    const message =
      (payload && "message" in payload && payload.message)
      || `Request failed (${response.status})`;
    const errors = payload && "errors" in payload ? payload.errors : [];
    throw new ApiError(response.status, message, errors);
  }

  return payload as T;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, token, headers, ...rest } = options;
  const method = String(rest.method || "GET").toUpperCase();
  const canDedupe = method === "GET" && body === undefined;

  if (canDedupe) {
    const key = `${token || ""}:${method}:${path}`;
    const existing = inflightGets.get(key);
    if (existing) return existing as Promise<T>;
  }

  const request = (async () => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    return parseJsonResponse<T>(response, token);
  })();

  if (canDedupe) {
    const key = `${token || ""}:${method}:${path}`;
    inflightGets.set(key, request);
    void request.finally(() => {
      if (inflightGets.get(key) === request) inflightGets.delete(key);
    });
  }

  return request;
}

/** Multipart upload (do not set Content-Type — browser sets boundary). */
export async function apiFormRequest<T>(
  path: string,
  options: {
    formData: FormData;
    token?: string | null;
    method?: string;
  },
): Promise<T> {
  const { formData, token, method = "POST" } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  return parseJsonResponse<T>(response, token);
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function formatApiError(error: unknown, fallback = "Something went wrong") {
  if (error instanceof ApiError) {
    if (error.errors?.length) {
      return error.errors.map((e) => e.message).filter(Boolean).join(". ") || error.message;
    }
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}
