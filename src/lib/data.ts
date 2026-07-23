// Sample data for GymmerzHub
export type MemberStatus = "active" | "expired" | "suspended";

export interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  age: number;
  gender: "Male" | "Female";
  plan: "Monthly" | "Yearly";
  joinDate: string;
  expiryDate: string;
  status: MemberStatus;
  attendance: number;
  photo: string;
}

const photos = [
  "https://i.pravatar.cc/120?img=12",
  "https://i.pravatar.cc/120?img=32",
  "https://i.pravatar.cc/120?img=47",
  "https://i.pravatar.cc/120?img=15",
  "https://i.pravatar.cc/120?img=68",
  "https://i.pravatar.cc/120?img=22",
  "https://i.pravatar.cc/120?img=8",
  "https://i.pravatar.cc/120?img=51",
  "https://i.pravatar.cc/120?img=33",
  "https://i.pravatar.cc/120?img=5",
  "https://i.pravatar.cc/120?img=44",
  "https://i.pravatar.cc/120?img=58",
];

const names = [
  "Aarav Sharma", "Priya Patel", "Rohan Mehta", "Isha Verma", "Karan Singh",
  "Ananya Iyer", "Vikram Rao", "Neha Kapoor", "Rahul Joshi", "Sneha Reddy",
  "Aditya Nair", "Meera Pillai", "Saurabh Khanna", "Diya Malhotra", "Arjun Bansal",
  "Riya Chawla", "Manav Gupta", "Tanya Bhatia", "Yash Agarwal", "Pooja Shetty",
];

// Deterministic YYYY-MM-DD formatter — avoids SSR/CSR timezone hydration mismatch.
export function fmtDate(y: number, m: number, d: number) {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return fmtDate(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
}

export const members: Member[] = names.map((name, i) => {
  const planList = ["Monthly", "Yearly"] as const;
  const status: MemberStatus[] = ["active", "active", "active", "expired", "suspended"];
  const joinY = 2024;
  const joinM = (i * 3) % 12;
  const joinD = ((i * 7) % 27) + 1;
  const joinDate = fmtDate(joinY, joinM, joinD);
  const selectedPlan = planList[i % planList.length];
  const expiryDate = addDaysISO(joinDate, selectedPlan === "Yearly" ? 365 : 30);
  return {
    id: `FS-${1000 + i}`,
    name,
    phone: `+91 9${String(800000000 + i * 12345).slice(0, 9)}`,
    email: name.toLowerCase().replace(" ", ".") + "@gymmerzhub.in",
    age: 22 + (i % 20),
    gender: i % 2 === 0 ? "Male" : "Female",
    plan: selectedPlan,
    joinDate,
    expiryDate,
    status: status[i % status.length],
    attendance: 40 + ((i * 13) % 180),
    photo: photos[i % photos.length],
  };
});

export const kpis = {
  totalMembers: 1250,
  activeMemberships: 978,
  todayCheckIns: 210,
  monthlyRevenue: 450000,
};

export const membershipGrowth = [
  { m: "Jan", members: 720 }, { m: "Feb", members: 760 }, { m: "Mar", members: 805 },
  { m: "Apr", members: 845 }, { m: "May", members: 890 }, { m: "Jun", members: 930 },
  { m: "Jul", members: 980 }, { m: "Aug", members: 1020 }, { m: "Sep", members: 1080 },
  { m: "Oct", members: 1140 }, { m: "Nov", members: 1200 }, { m: "Dec", members: 1250 },
];

export const revenueData = [
  { m: "Jan", revenue: 280 }, { m: "Feb", revenue: 310 }, { m: "Mar", revenue: 340 },
  { m: "Apr", revenue: 360 }, { m: "May", revenue: 390 }, { m: "Jun", revenue: 380 },
  { m: "Jul", revenue: 410 }, { m: "Aug", revenue: 425 }, { m: "Sep", revenue: 430 },
  { m: "Oct", revenue: 440 }, { m: "Nov", revenue: 445 }, { m: "Dec", revenue: 450 },
];

export const attendanceTrends = Array.from({ length: 30 }, (_, i) => ({
  d: `${i + 1}`,
  count: 120 + Math.round(60 * Math.sin(i / 3) + (i % 5) * 8),
}));

// ============= MEMBERSHIP PLANS =============
export type DurationUnit = "days" | "weeks" | "months" | "years";

export interface MembershipPlan {
  id: string;
  name: string;
  durationValue: number;
  durationUnit: DurationUnit;
  basePrice: number;
  registrationFee: number;
  gstPercent: number;
  tagline: string;
  benefits: string[];
  status: "active" | "inactive";
  displayOrder: number;
  highlight?: boolean;
  badge?: string;
  sold: number; // for analytics
}

export const membershipPlans: MembershipPlan[] = [
  {
    id: "pl-monthly",
    name: "Monthly Pass",
    durationValue: 1, durationUnit: "months",
    basePrice: 1500, registrationFee: 500, gstPercent: 18,
    tagline: "Flexible month-to-month access",
    benefits: ["Full gym access", "Locker room", "Open hours 6 AM – 10 PM"],
    status: "active", displayOrder: 1, sold: 184,
  },
  {
    id: "pl-quarter",
    name: "3 Month Plan",
    durationValue: 3, durationUnit: "months",
    basePrice: 4000, registrationFee: 500, gstPercent: 18,
    tagline: "Save 11% over monthly",
    benefits: ["Full gym access", "1 group class / week", "Body composition analysis"],
    status: "active", displayOrder: 2, sold: 142,
  },
  {
    id: "pl-half",
    name: "6 Month Plan",
    durationValue: 6, durationUnit: "months",
    basePrice: 7500, registrationFee: 0, gstPercent: 18,
    tagline: "Most popular — best value",
    benefits: ["Full gym access", "All group classes", "Trainer support", "Free registration"],
    status: "active", displayOrder: 3, highlight: true, badge: "Most popular", sold: 268,
  },
  {
    id: "pl-annual",
    name: "Annual Plan",
    durationValue: 12, durationUnit: "months",
    basePrice: 13000, registrationFee: 0, gstPercent: 18,
    tagline: "Save 28% — best long-term value",
    benefits: ["Full gym access", "Personal trainer (4 sessions/mo)", "Custom diet plan", "Sauna & steam", "Guest passes"],
    status: "active", displayOrder: 4, sold: 96,
  },
  {
    id: "pl-pt",
    name: "Personal Training",
    durationValue: 1, durationUnit: "months",
    basePrice: 6000, registrationFee: 0, gstPercent: 18,
    tagline: "12 one-on-one sessions",
    benefits: ["12 PT sessions / month", "Custom programming", "Nutrition guidance"],
    status: "active", displayOrder: 5, sold: 54,
  },
  {
    id: "pl-couple",
    name: "Couple Plan",
    durationValue: 3, durationUnit: "months",
    basePrice: 7000, registrationFee: 0, gstPercent: 18,
    tagline: "Train together, save together",
    benefits: ["2 memberships", "Group classes", "Shared trainer consult"],
    status: "active", displayOrder: 6, sold: 38,
  },
  {
    id: "pl-student",
    name: "Student Plan",
    durationValue: 3, durationUnit: "months",
    basePrice: 2800, registrationFee: 0, gstPercent: 18,
    tagline: "Valid student ID required",
    benefits: ["Full gym access", "Off-peak hours", "Group classes"],
    status: "active", displayOrder: 7, sold: 71,
  },
  {
    id: "pl-festival",
    name: "Festival Offer",
    durationValue: 90, durationUnit: "days",
    basePrice: 3500, registrationFee: 0, gstPercent: 18,
    tagline: "Limited-time Diwali special",
    benefits: ["90 days access", "Goodie bag", "Free t-shirt"],
    status: "inactive", displayOrder: 8, sold: 23,
  },
];

// Back-compat for old code (Basic/Pro/Elite)
export const plans = [
  { name: "Basic", price: 1000, tagline: "Get started with the essentials",
    features: ["Gym Access", "Locker Room", "Open Hours: 6 AM – 10 PM"], highlight: false },
  { name: "Pro", price: 1800, tagline: "For consistent gym-goers",
    features: ["Gym Access", "Group Classes", "Trainer Support", "Body Composition Analysis"], highlight: true },
  { name: "Elite", price: 3000, tagline: "All-inclusive premium experience",
    features: ["Gym Access", "Personal Trainer", "Custom Diet Plan", "Sauna & Steam", "24/7 Access"], highlight: false },
];

// ============= DISCOUNTS =============
export type DiscountType = "percentage" | "fixed";

export interface Discount {
  id: string;
  name: string;
  code: string;
  type: DiscountType;
  value: number;
  startDate: string;
  endDate: string;
  applicablePlanIds: string[]; // empty = all
  active: boolean;
  used: number;
}

export const discounts: Discount[] = [
  {
    id: "ds-summer", name: "Summer Offer", code: "SUMMER15", type: "percentage", value: 15,
    startDate: "2025-04-01", endDate: "2025-06-30",
    applicablePlanIds: ["pl-quarter", "pl-half"], active: true, used: 64,
  },
  {
    id: "ds-student", name: "Student Special", code: "STUDENT500", type: "fixed", value: 500,
    startDate: "2025-01-01", endDate: "2025-12-31",
    applicablePlanIds: ["pl-monthly", "pl-student"], active: true, used: 112,
  },
  {
    id: "ds-newyear", name: "New Year Kickstart", code: "NY25", type: "percentage", value: 25,
    startDate: "2025-12-15", endDate: "2026-01-31",
    applicablePlanIds: ["pl-annual"], active: true, used: 18,
  },
  {
    id: "ds-couple", name: "Couple Combo", code: "DUO1000", type: "fixed", value: 1000,
    startDate: "2025-09-01", endDate: "2025-12-31",
    applicablePlanIds: ["pl-couple"], active: true, used: 22,
  },
  {
    id: "ds-festival", name: "Festival Flat 20%", code: "FEST20", type: "percentage", value: 20,
    startDate: "2025-10-15", endDate: "2025-11-15",
    applicablePlanIds: [], active: false, used: 47,
  },
];

// ============= EXPIRING MEMBERSHIPS =============
const today = new Date("2025-12-01");
function todayPlusDays(d: number) {
  const dt = new Date(today);
  dt.setUTCDate(dt.getUTCDate() + d);
  return fmtDate(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
}

export interface ExpiringMembership {
  memberId: string;
  name: string;
  phone: string;
  photo: string;
  planId: string;
  planName: string;
  expiryDate: string;
  daysRemaining: number;
}

const expiringSpread = [0, 1, 2, 3, 4, 5, 6, 9, 12, 18, 22, 28];
export const expiringMemberships: ExpiringMembership[] = expiringSpread.map((d, i) => {
  const m = members[i % members.length];
  const plan = membershipPlans[i % 5];
  return {
    memberId: m.id, name: m.name, phone: m.phone, photo: m.photo,
    planId: plan.id, planName: plan.name,
    expiryDate: todayPlusDays(d), daysRemaining: d,
  };
});

// ============= MEMBERSHIP HISTORY (timeline events) =============
export interface MembershipEvent {
  date: string;
  title: string;
  detail: string;
  type: "join" | "activate" | "renew" | "upgrade" | "discount" | "expire";
}

export const membershipHistorySample: MembershipEvent[] = [
  { date: "2024-01-15", title: "Joined GymmerzHub", detail: "Onboarding complete · Registration ₹500", type: "join" },
  { date: "2024-01-15", title: "Monthly Pass activated", detail: "₹1,500 + 18% GST · Paid via UPI", type: "activate" },
  { date: "2024-02-15", title: "Renewed Monthly Pass", detail: "₹1,500 · Paid via Card", type: "renew" },
  { date: "2024-03-20", title: "Upgraded to 3 Month Plan", detail: "Saved ₹500 vs monthly", type: "upgrade" },
  { date: "2024-06-20", title: "Renewed — Summer Offer applied", detail: "15% off · ₹3,400 net", type: "discount" },
  { date: "2024-12-20", title: "Membership expired", detail: "Reminder sent", type: "expire" },
  { date: "2025-01-05", title: "Renewed to Annual Plan", detail: "New Year Kickstart 25% off · ₹9,750 net", type: "renew" },
];

// ============= REVENUE / ANALYTICS =============
export const revenueByPlan = membershipPlans.slice(0, 6).map((p) => ({
  name: p.name,
  revenue: Math.round((p.basePrice * p.sold) / 1000),
}));

export const discountUsage = discounts.map((d) => ({
  name: d.name,
  used: d.used,
}));

export const renewalConversion = [
  { m: "Jul", rate: 62 }, { m: "Aug", rate: 65 }, { m: "Sep", rate: 68 },
  { m: "Oct", rate: 71 }, { m: "Nov", rate: 74 }, { m: "Dec", rate: 76 },
];

// ============= EXISTING DATA =============
export const payments = members.slice(0, 12).map((m, i) => ({
  id: `PAY-${2000 + i}`,
  member: m.name,
  photo: m.photo,
  amount: [1000, 1800, 3000][i % 3],
  method: ["UPI", "Card", "Cash", "Bank Transfer"][i % 4],
  date: `2025-11-${String((i % 28) + 1).padStart(2, "0")}`,
  status: i % 5 === 0 ? "pending" : "paid",
}));

export const trainers = [
  { name: "Vikrant Malhotra", spec: "Strength & Powerlifting", members: 32, rating: 4.9, photo: "https://i.pravatar.cc/200?img=11" },
  { name: "Sara D'Souza", spec: "HIIT & Conditioning", members: 24, rating: 4.8, photo: "https://i.pravatar.cc/200?img=49" },
  { name: "Rajiv Kumar", spec: "Bodybuilding", members: 28, rating: 4.7, photo: "https://i.pravatar.cc/200?img=14" },
  { name: "Anjali Mehra", spec: "Yoga & Mobility", members: 19, rating: 4.9, photo: "https://i.pravatar.cc/200?img=45" },
  { name: "Daniel Thomas", spec: "CrossFit Coach", members: 21, rating: 4.6, photo: "https://i.pravatar.cc/200?img=60" },
  { name: "Pooja Rao", spec: "Weight Loss", members: 35, rating: 4.8, photo: "https://i.pravatar.cc/200?img=36" },
];

export const notices = [
  { title: "Gym Closed on Republic Day", body: "We will be closed on 26th Jan. Resume operations on 27th.", date: "2025-11-20", tag: "Holiday" },
  { title: "New Hammer Strength Equipment", body: "Three new plate-loaded machines added in the strength zone.", date: "2025-11-18", tag: "Update" },
  { title: "GymmerzHub 30-Day Shred Challenge", body: "Sign up at reception. Top 3 win 6 months free Elite.", date: "2025-11-15", tag: "Challenge" },
  { title: "Diwali Membership Offer", body: "Flat 20% off on annual Elite plans till 5th Nov.", date: "2025-10-28", tag: "Offer" },
];

export const attendanceToday = members.slice(0, 10).map((m, i) => ({
  member: m.name,
  photo: m.photo,
  checkIn: `0${6 + (i % 8)}:${String((i * 7) % 60).padStart(2, "0")}`,
  checkOut: `0${7 + (i % 8) + 1}:${String((i * 11) % 60).padStart(2, "0")}`,
  duration: `${1 + (i % 2)}h ${(i * 9) % 60}m`,
}));

// 7x12 heatmap
export const heatmap = Array.from({ length: 7 }, (_, r) =>
  Array.from({ length: 12 }, (_, c) => Math.round(40 + 60 * Math.abs(Math.sin((r + 1) * (c + 1) / 4))))
);
