/** Multi-tenant gym workspace + SaaS billing helpers (demo / localStorage). */

export type GymPlan =
  | "starter"
  | "growth"
  | "pro"
  | "scale"
  | "max"
  | "enterprise";
export type BillingStatus = "trialing" | "active" | "past_due" | "suspended" | "canceled";
export type InvoiceStatus = "paid" | "due" | "overdue" | "void" | "upcoming";

export interface PlatformPlan {
  id: GymPlan;
  name: string;
  tagline: string;
  /** null = unlimited (enterprise) */
  memberLimit: number | null;
  graceMembers: number;
  monthlyFee: number;
  features: string[];
}

/** GymmerzHub SaaS capacity plans (matches backend platform_plans). */
export const PLATFORM_PLANS: PlatformPlan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Up to 100 active members",
    memberLimit: 100,
    graceMembers: 10,
    monthlyFee: 1999,
    features: ["All features", "1 gym workspace", "Email support"],
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "Up to 300 active members",
    memberLimit: 300,
    graceMembers: 30,
    monthlyFee: 3999,
    features: ["All features", "Priority support"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Up to 500 active members",
    memberLimit: 500,
    graceMembers: 50,
    monthlyFee: 5499,
    features: ["All features", "Priority support"],
  },
  {
    id: "scale",
    name: "Scale",
    tagline: "Up to 700 active members",
    memberLimit: 700,
    graceMembers: 70,
    monthlyFee: 6999,
    features: ["All features", "Dedicated success"],
  },
  {
    id: "max",
    name: "Max",
    tagline: "Up to 1,000 active members",
    memberLimit: 1000,
    graceMembers: 100,
    monthlyFee: 9799,
    features: ["All features", "Highest self-serve capacity"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Unlimited / custom — contact sales",
    memberLimit: null,
    graceMembers: 0,
    monthlyFee: 0,
    features: ["Custom capacity", "Custom onboarding", "Volume pricing"],
  },
];

export const TRIAL_DAYS = 7;
export const TRIAL_MEMBER_LIMIT = 30;

export interface GymTenant {
  id: string;
  name: string;
  slug: string;
  city: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  plan: GymPlan | null;
  createdAt: string;
  trialEndsAt: string;
  billingStatus: BillingStatus;
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
  /** Assigned gym-role permission keys. Owners get all keys from the API. */
  permissionKeys?: string[];
  mfaSetupRequired?: boolean;
  state: string;
  stateCode: string;
  city: string;
  address: string;
  plan: GymPlan | null;
  trialEndsAt: string;
  billingStatus: BillingStatus;
  createdAt: string;
}

export interface PlatformInvoice {
  id: string;
  gymId: string;
  gymName: string;
  number: string;
  periodLabel: string;
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
  status: InvoiceStatus;
  plan: GymPlan | null;
  activeMembers: number;
  baseFee: number;
  tax: number;
  total: number;
  description: string;
}

const SESSION_KEY = "gymmerzhub.session";
const TENANTS_KEY = "gymmerzhub.tenants";

function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
}

export function getPlan(plan: GymPlan | string | null | undefined) {
  if (!plan) return null;
  const aliases: Record<string, GymPlan> = { max_flat: "max" };
  const id = (aliases[plan] || plan) as GymPlan;
  return PLATFORM_PLANS.find((p) => p.id === id) ?? null;
}

/** Platform bill = flat plan monthly fee. */
export function estimatePlatformBill(plan: GymPlan | null | undefined, activeMembers: number) {
  const p = getPlan(plan);
  if (!p) {
    return { billable: Math.max(activeMembers, 0), baseFee: 0, subtotal: 0, tax: 0, total: 0, memberLimit: TRIAL_MEMBER_LIMIT };
  }
  const billable = Math.max(activeMembers, 0);
  const baseFee = p.monthlyFee;
  const subtotal = baseFee;
  const tax = 0;
  const total = subtotal;
  return { billable, baseFee, subtotal, tax, total, memberLimit: p.memberLimit };
}

export function getTrialInfo(session: Pick<AuthSession, "trialEndsAt" | "billingStatus" | "createdAt">) {
  const today = todayISO();
  const trialEndsAt = session.trialEndsAt || addDaysISO(session.createdAt || today, TRIAL_DAYS);
  const daysLeft = Math.max(0, daysBetween(today, trialEndsAt));
  const status = session.billingStatus || "trialing";
  const isTrialing = status === "trialing" && daysLeft > 0;
  const trialExpired = status === "trialing" && daysLeft <= 0;
  const totalDays = TRIAL_DAYS;
  const elapsed = Math.min(totalDays, Math.max(0, totalDays - daysLeft));
  return { daysLeft, isTrialing, trialExpired, totalDays, elapsed, trialEndsAt };
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
    plan: "growth",
    createdAt: addDaysISO(todayISO(), -12),
    trialEndsAt: addDaysISO(todayISO(), 18),
    billingStatus: "trialing",
  },
  {
    id: "gym_koramangala",
    name: "Iron Temple Koramangala",
    slug: "koramangala",
    city: "Bengaluru",
    ownerName: "Ananya Iyer",
    ownerEmail: "ananya@irontemple.in",
    phone: "+91 98111 22334",
    plan: "starter",
    createdAt: addDaysISO(todayISO(), -45),
    trialEndsAt: addDaysISO(todayISO(), -15),
    billingStatus: "active",
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
    // Stable snapshot for useSyncExternalStore — parse only when storage changes.
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

/** React subscription to local auth session (re-renders on setSession/clearSession). */
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

/** Clear local auth and send the owner to login (used when session is missing/revoked). */
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
    platformPlan: GymPlan | null;
    billingStatus: BillingStatus;
    trialEndsAt: string | null;
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
  const trialEndsAt = (data.gym.trialEndsAt || addDaysISO(createdAt, TRIAL_DAYS)).slice(0, 10);
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
    plan: data.gym.platformPlan ?? null,
    trialEndsAt,
    billingStatus: data.gym.billingStatus,
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
    plan: tenant.plan,
    trialEndsAt: tenant.trialEndsAt,
    billingStatus: tenant.billingStatus,
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
  plan: GymPlan;
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
    plan: input.plan,
    createdAt,
    trialEndsAt: addDaysISO(createdAt, TRIAL_DAYS),
    billingStatus: "trialing",
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

/** Demo platform invoices for the signed-in gym (GymmerzHub → gym owner). */
export function getPlatformInvoices(session: AuthSession, activeMembers: number): PlatformInvoice[] {
  const plan = getPlan(session.plan);
  const est = estimatePlatformBill(session.plan, activeMembers);
  const trial = getTrialInfo(session);

  const upcoming: PlatformInvoice = {
    id: `inv_upcoming_${session.gymId}`,
    gymId: session.gymId,
    gymName: session.gymName,
    number: "FS-DRAFT",
    periodLabel: "Next billing cycle",
    issuedAt: session.trialEndsAt,
    dueAt: addDaysISO(session.trialEndsAt, 7),
    status: "upcoming",
    plan: session.plan,
    activeMembers: est.billable,
    baseFee: est.baseFee,
    tax: est.tax,
    total: est.total,
    description: trial.isTrialing
      ? `First invoice after ${TRIAL_DAYS}-day free trial — choose a plan on Billing`
      : plan
        ? `${plan.name} plan · ${est.billable} active members`
        : `Platform fee · ${est.billable} active members`,
  };

  if (session.billingStatus === "trialing") {
    return [upcoming];
  }

  const paid1 = estimatePlatformBill(session.plan, Math.max(activeMembers - 20, 40));
  const paid2 = estimatePlatformBill(session.plan, Math.max(activeMembers - 8, 55));
  const due = estimatePlatformBill(session.plan, activeMembers);

  return [
    upcoming,
    {
      id: `inv_due_${session.gymId}`,
      gymId: session.gymId,
      gymName: session.gymName,
      number: "FS-2026-0312",
      periodLabel: "Jun 2026",
      issuedAt: addDaysISO(todayISO(), -5),
      dueAt: addDaysISO(todayISO(), 2),
      status: "due",
      plan: session.plan,
      activeMembers: due.billable,
      baseFee: due.baseFee,
      tax: due.tax,
      total: due.total,
      description: plan
        ? `${plan.name} plan · platform fee for Jun 2026`
        : "Platform fee for Jun 2026",
    },
    {
      id: `inv_paid_2_${session.gymId}`,
      gymId: session.gymId,
      gymName: session.gymName,
      number: "FS-2026-0288",
      periodLabel: "May 2026",
      issuedAt: addDaysISO(todayISO(), -35),
      dueAt: addDaysISO(todayISO(), -28),
      paidAt: addDaysISO(todayISO(), -30),
      status: "paid",
      plan: session.plan,
      activeMembers: paid2.billable,
      baseFee: paid2.baseFee,
      tax: paid2.tax,
      total: paid2.total,
      description: plan
        ? `${plan.name} plan · platform fee for May 2026`
        : "Platform fee for May 2026",
    },
    {
      id: `inv_paid_1_${session.gymId}`,
      gymId: session.gymId,
      gymName: session.gymName,
      number: "FS-2026-0241",
      periodLabel: "Apr 2026",
      issuedAt: addDaysISO(todayISO(), -65),
      dueAt: addDaysISO(todayISO(), -58),
      paidAt: addDaysISO(todayISO(), -60),
      status: "paid",
      plan: session.plan,
      activeMembers: paid1.billable,
      baseFee: paid1.baseFee,
      tax: paid1.tax,
      total: paid1.total,
      description: plan
        ? `${plan.name} plan · platform fee for Apr 2026`
        : "Platform fee for Apr 2026",
    },
  ];
}
