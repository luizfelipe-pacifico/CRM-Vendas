import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: ReactNode;
  gradient?: string;
}

const MetricCard = ({ title, value, change, changeType = "neutral", icon, gradient }: MetricCardProps) => (
  <div className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow duration-300 animate-slide-in">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-display font-bold text-card-foreground">{value}</p>
        {change && (
          <p
            className={cn(
              "text-xs font-medium",
              changeType === "positive" && "text-success",
              changeType === "negative" && "text-destructive",
              changeType === "neutral" && "text-muted-foreground"
            )}
          >
            {change}
          </p>
        )}
      </div>
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          gradient || "gradient-primary"
        )}
      >
        {icon}
      </div>
    </div>
  </div>
);

export default MetricCard;
