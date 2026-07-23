import { createFileRoute } from "@tanstack/react-router";
import { FileText, FileSpreadsheet, Download, Wallet, CalendarCheck, BadgeCheck, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — GymmerzHub" }] }),
  component: ReportsPage,
});

const reports = [
  { name: "Revenue Report", icon: Wallet, desc: "Monthly earnings, payment methods, refunds.", color: "primary" },
  { name: "Attendance Report", icon: CalendarCheck, desc: "Daily check-ins, peak hours, regularity.", color: "lime" },
  { name: "Membership Report", icon: BadgeCheck, desc: "Plan distribution, retention, churn.", color: "success" },
  { name: "Expiry Report", icon: AlertCircle, desc: "Upcoming renewals and expired members.", color: "warning" },
];

function ReportsPage() {
  return (
    <div>
      <PageHeader badge="Reports" title="Generate Reports" description="Export data for accounting, audits, and reviews." />
      <div className="grid gap-4 p-6 md:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.name} className="group relative overflow-hidden border-border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                <r.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold">{r.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" className="bg-gradient-primary text-primary-foreground shadow-glow">
                    <FileText className="mr-1 h-4 w-4" /> Export PDF
                  </Button>
                  <Button size="sm" variant="outline">
                    <FileSpreadsheet className="mr-1 h-4 w-4" /> Export Excel
                  </Button>
                  <Button size="sm" variant="ghost"><Download className="mr-1 h-4 w-4" /> CSV</Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
