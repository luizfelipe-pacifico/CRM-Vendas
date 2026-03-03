import { useState } from "react";
import { Phone, Video, Mail, Clock, CheckCircle2, Circle, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: number;
  type: "call" | "meeting" | "email" | "followup";
  title: string;
  client: string;
  date: string;
  time: string;
  done: boolean;
  responsible: string;
}

const mockActivities: Activity[] = [];

const typeIcons = {
  call: Phone,
  meeting: Video,
  email: Mail,
  followup: Clock,
};

const typeColors = {
  call: "bg-info/10 text-info",
  meeting: "bg-primary/10 text-primary",
  email: "bg-accent/10 text-accent",
  followup: "bg-warning/10 text-warning",
};

const Activities = () => {
  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  const toggleDone = (id: number) => {
    setActivities((prev) => prev.map((activity) => (activity.id === id ? { ...activity, done: !activity.done } : activity)));
  };

  const filteredActivities = activities.filter((activity) => {
    if (filter === "pending") return !activity.done;
    if (filter === "done") return activity.done;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Atividades</h1>
          <p className="mt-1 text-sm text-muted-foreground">{activities.filter((activity) => !activity.done).length} pendentes</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(["all", "pending", "done"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filter === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {item === "all" ? "Todas" : item === "pending" ? "Pendentes" : "Concluidas"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredActivities.map((activity) => {
          const Icon = typeIcons[activity.type];
          return (
            <div
              key={activity.id}
              className={cn(
                "flex items-center gap-4 rounded-xl bg-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover",
                activity.done && "opacity-60"
              )}
            >
              <button onClick={() => toggleDone(activity.id)} className="flex-shrink-0">
                {activity.done ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Circle className="h-5 w-5 text-border transition-colors hover:text-primary" />
                )}
              </button>

              <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg", typeColors[activity.type])}>
                <Icon className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium text-card-foreground", activity.done && "line-through")}>{activity.title}</p>
                <p className="text-xs text-muted-foreground">{activity.client}</p>
              </div>

              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-medium text-card-foreground">{activity.date}</p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>

              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary"
                title={activity.responsible}
              >
                <span className="text-[10px] font-bold text-secondary-foreground">
                  {activity.responsible
                    .split(" ")
                    .map((name) => name[0])
                    .join("")
                    .slice(0, 2)}
                </span>
              </div>
            </div>
          );
        })}
        {filteredActivities.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Nenhuma atividade cadastrada ainda.
          </div>
        )}
      </div>
    </div>
  );
};

export default Activities;
