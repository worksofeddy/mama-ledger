import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: LucideIcon;
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon,
  className 
}: MetricCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-success";
      case "down":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getTrendSymbol = () => {
    switch (trend) {
      case "up":
        return "↗";
      case "down":
        return "↘";
      default:
        return "→";
    }
  };

  return (
    <div className={cn(
      "bg-card border border-border rounded-lg p-6 shadow-elegant hover:shadow-lg transition-all duration-300 animate-fade-in",
      "hover:scale-105 hover:-translate-y-1 group cursor-pointer",
      className
    )}>
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          {title}
        </p>
        <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
          {value}
        </div>
        <p className={cn(
          "text-xs flex items-center gap-1 transition-all duration-200",
          getTrendColor(),
          "group-hover:font-medium"
        )}>
          <span className="inline-block transition-transform group-hover:scale-125">
            {getTrendSymbol()}
          </span>
          {change}
        </p>
      </div>
    </div>
  );
}
