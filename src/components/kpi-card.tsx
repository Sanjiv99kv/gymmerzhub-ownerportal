import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  delta: number;
  icon: LucideIcon;
  accent?: "primary" | "lime" | "warning" | "success";
}

const accentMap = {
  primary: { icon: "text-primary bg-primary/10 border-primary/15" },
  lime: { icon: "text-lime bg-lime/10 border-lime/15" },
  warning: { icon: "text-warning bg-warning/10 border-warning/15" },
  success: { icon: "text-success bg-success/10 border-success/15" },
};

export function KpiCard({ label, value, delta, icon: Icon, accent = "primary" }: Props) {
  const up = delta >= 0;
  const a = accentMap[accent];
  return (
    <Card className="group relative overflow-hidden border-border bg-card p-5 shadow-card transition-colors hover:border-primary/25">
      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">{value}</div>
        </div>
        <div className={cn("grid h-9 w-9 place-items-center rounded-lg border", a.icon)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="relative mt-4 flex items-center gap-1.5 text-xs">
        <span className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium",
          up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        )}>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {up ? "+" : ""}{delta}%
        </span>
        <span className="text-muted-foreground">vs last month</span>
      </div>
    </Card>
  );
}
