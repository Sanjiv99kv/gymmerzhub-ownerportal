/** Multi-tenant gym workspace session helpers (localStorage). */

export interface GymTenant {
  id: string;
  name: string;
  slug: string;
  city: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  gymId: string;
  gymName: string;
  gymSlug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string | null;
  ownerAvatarUrl?: string | null;
  emailVerified: boolean;
  hubRole?: string;
  hubRoleName?: string | null;
  permissionKeys?: string[];
  mfaSetupRequired?: boolean;
  state: string;
  stateCode: string;
  city: string;
  address: string;
  createdAt: string;
}

const SESSION_KEY = "gymmerzhub.session";
const TENANTS_KEY = "gymmerzhub.tenants";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export const demoTenants: GymTenant[] = [
  {
    id: "gym_andheri",
    name: "GymmerzHub Andheri",
    slug: "andheri",
    city: "Mumbai",
    ownerName: "Rajesh Sharma",
    ownerEmail: "rajesh@gymmerzhub.in",
    phone: "+91 98765 43210",
    createdAt: addDaysISO(todayISO(), -12),
  },
  {
    id: "gym_koramangala",
    name: "Iron Temple Koramangala",
    slug: "koramangala",
    city: "Bengaluru",
    ownerName: "Ananya Iyer",
    ownerEmail: "ananya@irontemple.in",
    phone: "+91 98111 22334",
    createdAt: addDaysISO(todayISO(), -45),
  },
];

export function slugifyGymName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 32);
}

export function workspaceUrl(slug: string) {
  return `${slug}.gymmerzhub.com`;
}

function readStoredTenants(): GymTenant[] {
  if (typeof window === "undefined") return [...demoTenants];
  try {
    const raw = localStorage.getItem(TENANTS_KEY);
    if (!raw) return [...demoTenants];
    const parsed = JSON.parse(raw) as GymTenant[];
    return [...demoTenants, ...parsed.filter((t) => !demoTenants.some((d) => d.slug === t.slug))];
  } catch {
    return [...demoTenants];
  }
}

function writeStoredTenant(tenant: GymTenant) {
  if (typeof window === "undefined") return;
  const existing = readStoredTenants().filter((t) => !demoTenants.some((d) => d.id === t.id));
  const next = [...existing.filter((t) => t.slug !== tenant.slug), tenant];
  localStorage.setItem(TENANTS_KEY, JSON.stringify(next));
}

export function findTenantBySlug(slug: string) {
  const normalized = slug.trim().toLowerCase();
  return readStoredTenants().find((t) => t.slug === normalized);
}

export function findTenantByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return readStoredTenants().find((t) => t.ownerEmail.toLowerCase() === normalized);
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      cachedSessionRaw = null;
      cachedSessionValue = null;
      return null;
    }
    if (raw === cachedSessionRaw) return cachedSessionValue;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.token || !parsed?.gymId) {
      cachedSessionRaw = raw;
      cachedSessionValue = null;
      return null;
    }
    cachedSessionRaw = raw;
    cachedSessionValue = {
      ...parsed,
      emailVerified: parsed.emailVerified ?? true,
    };
    return cachedSessionValue;
  } catch {
    cachedSessionRaw = null;
    cachedSessionValue = null;
    return null;
  }
}

let cachedSessionRaw: string | null = null;
let cachedSessionValue: AuthSession | null = null;

export function getAccessToken() {
  return getSession()?.token ?? null;
}

const SESSION_CHANGE_EVENT = "gymmerzhub:session";

export function setSession(session: AuthSession) {
  const raw = JSON.stringify(session);
  localStorage.setItem(SESSION_KEY, raw);
  cachedSessionRaw = raw;
  cachedSessionValue = {
    ...session,
    emailVerified: session.emailVerified ?? true,
  };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  cachedSessionRaw = null;
  cachedSessionValue = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
  }
}

export function subscribeSession(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener(SESSION_CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(SESSION_CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function expireSessionToLogin() {
  clearSession();
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path === "/login" || path.startsWith("/login") || path === "/register" || path.startsWith("/register") || path.startsWith("/invite")) {
    return;
  }
  window.location.assign("/login");
}

export function sessionFromAuthData(data: {
  token: string;
  user: {
    fullName: string;
    email: string;
    phone?: string | null;
    emailVerifiedAt?: string | null;
    emailVerified?: boolean;
    avatarUrl?: string | null;
  };
  gym: {
    id: string;
    name: string;
    slug: string;
    state: string | null;
    stateCode: string | null;
    city: string | null;
    address: string | null;
    createdAt: string | null;
  };
  membership?: {
    role?: string;
    gymRoleName?: string | null;
    permissionKeys?: string[];
    mfaSetupRequired?: boolean;
  };
  mfaSetupRequired?: boolean;
}): AuthSession {
  const createdAt = (data.gym.createdAt || new Date().toISOString()).slice(0, 10);
  const hubRole = data.membership?.role || "owner";

  return {
    token: data.token,
    gymId: data.gym.id,
    gymName: data.gym.name,
    gymSlug: data.gym.slug,
    ownerName: data.user.fullName,
    ownerEmail: data.user.email,
    ownerPhone: data.user.phone ?? null,
    ownerAvatarUrl: data.user.avatarUrl ?? null,
    emailVerified: Boolean(data.user.emailVerified ?? data.user.emailVerifiedAt),
    hubRole,
    hubRoleName: data.membership?.gymRoleName ?? (hubRole === "owner" ? "Owner" : null),
    permissionKeys: Array.isArray(data.membership?.permissionKeys)
      ? data.membership.permissionKeys
      : hubRole === "owner"
        ? undefined
        : [],
    mfaSetupRequired: Boolean(data.mfaSetupRequired ?? data.membership?.mfaSetupRequired),
    state: data.gym.state || "",
    stateCode: data.gym.stateCode || "",
    city: data.gym.city || "",
    address: data.gym.address || "",
    createdAt,
  };
}

export function sessionFromTenant(tenant: GymTenant): AuthSession {
  return {
    token: "",
    gymId: tenant.id,
    gymName: tenant.name,
    gymSlug: tenant.slug,
    ownerName: tenant.ownerName,
    ownerEmail: tenant.ownerEmail,
    ownerAvatarUrl: null,
    emailVerified: true,
    state: "",
    stateCode: "",
    city: tenant.city,
    address: "",
    createdAt: tenant.createdAt,
  };
}

export function registerGym(input: {
  name: string;
  slug: string;
  city: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
}): { ok: true; tenant: GymTenant } | { ok: false; error: string } {
  const slug = slugifyGymName(input.slug || input.name);
  if (!slug) return { ok: false, error: "Enter a valid workspace URL." };
  if (findTenantBySlug(slug)) {
    return { ok: false, error: "That workspace URL is already taken. Try another." };
  }
  if (findTenantByEmail(input.ownerEmail)) {
    return { ok: false, error: "An account with this email already exists. Sign in instead." };
  }

  const createdAt = todayISO();
  const tenant: GymTenant = {
    id: `gym_${slug}_${Date.now().toString(36)}`,
    name: input.name.trim(),
    slug,
    city: input.city.trim(),
    ownerName: input.ownerName.trim(),
    ownerEmail: input.ownerEmail.trim().toLowerCase(),
    phone: input.phone.trim(),
    createdAt,
  };

  writeStoredTenant(tenant);
  setSession(sessionFromTenant(tenant));
  return { ok: true, tenant };
}

export function loginGym(input: {
  slug: string;
  email: string;
  password: string;
}): { ok: true; session: AuthSession } | { ok: false; error: string } {
  if (!input.password || input.password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  const bySlug = input.slug ? findTenantBySlug(input.slug) : null;
  const byEmail = findTenantByEmail(input.email);

  if (input.slug && !bySlug) {
    return { ok: false, error: "No gym found for that workspace URL." };
  }

  const tenant = bySlug ?? byEmail;
  if (!tenant) {
    return { ok: false, error: "No gym account found for this email." };
  }

  if (tenant.ownerEmail.toLowerCase() !== input.email.trim().toLowerCase()) {
    return { ok: false, error: "Email does not match this gym workspace." };
  }

  const session = sessionFromTenant(tenant);
  setSession(session);
  return { ok: true, session };
}

export function formatINR(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
