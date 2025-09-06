import { cn } from "@/lib/utils";

export type TimePeriod = "today" | "week" | "month" | "quarter" | "year" | "custom";

interface TimePeriodSelectorProps {
  selected: TimePeriod;
  onSelect: (period: TimePeriod) => void;
  className?: string;
}

export function TimePeriodSelector({ selected, onSelect, className }: TimePeriodSelectorProps) {
  const periods: { value: TimePeriod; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "quarter", label: "Quarter" },
    { value: "year", label: "Year" },
    { value: "custom", label: "Custom" },
  ];

  return (
    <div className={cn("flex items-center gap-1 bg-muted/50 rounded-lg p-1", className)}>
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onSelect(period.value)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 hover:scale-105",
            selected === period.value
              ? "bg-primary text-primary-foreground shadow-soft"
              : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
