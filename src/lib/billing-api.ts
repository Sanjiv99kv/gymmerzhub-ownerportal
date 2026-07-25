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

export type PlatformBillingStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "suspended"
  | "canceled";

export type PlatformInvoiceStatus = "draft" | "due" | "paid" | "overdue" | "void";

export type PlatformPlanRow = {
  id: string;
  code: string;
  name: string;
  includedMembers: number | null;
  graceMembers?: number;
  hardLimit?: number | null;
  monthlyFee: number;
  pricingModel: string;
  sortOrder: number;
  tagline: string | null;
};

export type PlatformInvoiceRow = {
  id: string;
  gymId: string;
  number: string;
  periodStart: string;
  periodEnd: string;
  activeMembersSnapshot: number;
  membersManaging: number;
  peakMembersSnapshot: number | null;
  billableMembers: number;
  planCode: string | null;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: PlatformInvoiceStatus;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  paymentMethod: string | null;
  razorpayOrderId: string | null;
};

export type FeeEstimate = {
  amount: number;
  planCode?: string | null;
  planName?: string | null;
  /** @deprecated use planCode */
  bandId: string | null;
  /** @deprecated use planName */
  bandName: string | null;
  activeMembers: number;
  includedMembers: number;
  graceMembers?: number;
  hardLimit?: number | null;
  monthlyFee?: number;
  baseFee: number;
};

export type CapacityStatus = {
  mode: string;
  planCode: string;
  planName: string;
  activeMembers: number;
  includedMembers: number;
  graceMembers: number;
  hardLimit: number | null;
  remaining: number | null;
  graceRemaining: number | null;
  inGrace: boolean;
  atHardLimit: boolean;
  percentOfIncluded: number;
  canAddMember: boolean;
  suggestedUpgrade: string | null;
  message: string | null;
};

export type BillingSummary = {
  gym: {
    id: string;
    name: string;
    billingStatus: PlatformBillingStatus;
    platformPlan: string | null;
    nextPlanCode?: string | null;
    billingPeriodPeakMembers?: number;
    trialEndsAt: string | null;
    nextInvoiceAt: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    graceEndsAt: string | null;
  };
  config: {
    trialDays: number;
    trialMemberLimit?: number;
    trialStaffLimit?: number;
    graceDays: number;
    currency: string;
    invoiceDueDays: number;
  };
  activeMembers: number;
  peakMembers: number;
  billableMembers: number;
  capacity?: CapacityStatus;
  estimate: FeeEstimate;
  /** True when trial ended / no paid plan — owner must buy a plan. */
  needsPlanPurchase?: boolean;
  openInvoice: PlatformInvoiceRow | null;
  unpaidCount: number;
  unpaidTotal: number;
  trial: {
    isTrialing: boolean;
    trialExpired?: boolean;
    daysLeft: number;
    trialEndsAt: string | null;
    totalDays: number;
    memberLimit?: number;
    staffLimit?: number;
  };
  razorpayEnabled: boolean;
  razorpayKeyId: string | null;
  invoices: PlatformInvoiceRow[];
  plans: PlatformPlanRow[];
};

export type PaymentOrder = {
  invoiceId?: string;
  invoiceIds?: string[];
  mode?: "pay_all" | string;
  orderId: string | null;
  amount: number;
  currency: string;
  keyId: string | null;
  invoiceNumber: string;
  gymName: string;
  razorpayEnabled?: boolean;
};

export async function switchPlatformPlan(planCode: string) {
  const res = await apiRequest<
    ApiSuccess<{
      gym: { id: string; platformPlan: string; previousPlan?: string };
      estimate: FeeEstimate;
      changed: boolean;
      message?: string;
      deferred?: boolean;
      requiresPayment?: boolean;
      invoice?: PlatformInvoiceRow | null;
      paymentOrder?: PaymentOrder | null;
      prorationInvoice?: PlatformInvoiceRow | null;
    }>
  >("/api/owner/billing/plan", {
    method: "POST",
    token: tokenOrThrow(),
    body: { planCode },
  });
  return res.data;
}

/** Trial → paid (or no plan): create invoice and pay via Razorpay. */
export async function purchasePlatformPlan(planCode: string) {
  const res = await apiRequest<
    ApiSuccess<{
      invoice: PlatformInvoiceRow;
      paymentOrder: PaymentOrder | null;
      razorpayEnabled: boolean;
      message?: string;
    }>
  >("/api/owner/billing/plan/purchase", {
    method: "POST",
    token: tokenOrThrow(),
    body: { planCode },
  });
  return res.data;
}

export async function voidCheckoutInvoice(invoiceId: string) {
  const res = await apiRequest<ApiSuccess<PlatformInvoiceRow>>(
    `/api/owner/billing/invoices/${invoiceId}/void-checkout`,
    { method: "POST", token: tokenOrThrow() },
  );
  return res.data;
}

export async function fetchBillingSummary() {
  const res = await apiRequest<ApiSuccess<BillingSummary>>("/api/owner/billing/summary", {
    token: tokenOrThrow(),
  });
  return res.data;
}

export async function createInvoicePaymentOrder(invoiceId: string) {
  const res = await apiRequest<ApiSuccess<PaymentOrder>>(
    `/api/owner/billing/invoices/${invoiceId}/pay`,
    { method: "POST", token: tokenOrThrow() },
  );
  return res.data;
}

export async function createPayAllOrder() {
  const res = await apiRequest<ApiSuccess<PaymentOrder>>("/api/owner/billing/pay-all", {
    method: "POST",
    token: tokenOrThrow(),
  });
  return res.data;
}

export async function confirmInvoicePayment(
  invoiceId: string,
  payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  },
) {
  const res = await apiRequest<ApiSuccess<PlatformInvoiceRow>>(
    `/api/owner/billing/invoices/${invoiceId}/confirm`,
    { method: "POST", token: tokenOrThrow(), body: payload },
  );
  return res.data;
}

export async function confirmPayAllPayment(payload: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const res = await apiRequest<ApiSuccess<{ paidCount: number; invoices: PlatformInvoiceRow[] }>>(
    "/api/owner/billing/pay-all/confirm",
    { method: "POST", token: tokenOrThrow(), body: payload },
  );
  return res.data;
}

export async function markInvoicePaidDev(invoiceId: string) {
  const res = await apiRequest<ApiSuccess<PlatformInvoiceRow>>(
    `/api/owner/billing/invoices/${invoiceId}/mark-paid-dev`,
    { method: "POST", token: tokenOrThrow() },
  );
  return res.data;
}

export async function markAllInvoicesPaidDev() {
  const res = await apiRequest<ApiSuccess<{ paidCount: number; invoices: PlatformInvoiceRow[] }>>(
    "/api/owner/billing/pay-all/mark-paid-dev",
    { method: "POST", token: tokenOrThrow() },
  );
  return res.data;
}

export async function downloadInvoicePdf(invoiceId: string) {
  const token = tokenOrThrow();
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "")
    || "http://localhost:8800";
  const response = await fetch(`${base}/api/owner/billing/invoices/${invoiceId}/pdf`, {
    headers: {
      Accept: "application/pdf",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    let message = `Download failed (${response.status})`;
    try {
      const payload = await response.json() as { message?: string };
      if (payload.message) message = payload.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  const filename = match?.[1] || `invoice-${invoiceId}.pdf`;
  return { blob, filename };
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector("script[data-razorpay]");
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpay = "1";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(order: PaymentOrder, session: {
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string | null;
}): Promise<{
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}> {
  if (!order.orderId || !order.keyId) {
    throw new Error("Razorpay is not configured for this order");
  }

  const ok = await loadRazorpayScript();
  if (!ok || !window.Razorpay) {
    throw new Error("Could not load Razorpay Checkout");
  }

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      amount: Math.round(order.amount * 100),
      currency: order.currency,
      name: "GymmerzHub",
      description: order.mode === "pay_all"
        ? `Pay ${order.invoiceNumber}`
        : `Invoice ${order.invoiceNumber}`,
      order_id: order.orderId,
      prefill: {
        name: session.ownerName || "",
        email: session.ownerEmail || "",
        contact: session.ownerPhone || "",
      },
      theme: { color: "#0f766e" },
      handler(response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) {
        resolve({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss() {
          reject(new Error("Payment cancelled"));
        },
      },
    });
    rzp.open();
  });
}
