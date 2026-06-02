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
  primary: "from-primary/30 to-primary/0 text-primary",
  lime: "from-lime/30 to-lime/0 text-lime",
  warning: "from-warning/30 to-warning/0 text-warning",
  success: "from-success/30 to-success/0 text-success",
};

export function KpiCard({ label, value, delta, icon: Icon, accent = "primary" }: Props) {
  const up = delta >= 0;
  return (
    <Card className="group relative overflow-hidden border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-glow">
      <div className={cn("absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-60 blur-2xl transition-opacity group-hover:opacity-90", accentMap[accent])} />
      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="font-display text-3xl font-bold tracking-tight">{value}</div>
        </div>
        <div className={cn("grid h-10 w-10 place-items-center rounded-xl border border-border bg-background", accentMap[accent].split(" ")[2])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="relative mt-4 flex items-center gap-1.5 text-xs">
        <span className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
          up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
        )}>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {up ? "+" : ""}{delta}%
        </span>
        <span className="text-muted-foreground">vs last month</span>
      </div>
    </Card>
  );
}
