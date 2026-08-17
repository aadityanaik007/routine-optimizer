import { ArrowUpRight } from "lucide-react";
import type { Category, Goal } from "../types";
import { STATUS_LABELS } from "../types";
import { goalProgress } from "../lib/stats";
import { Ring } from "./Ring";

interface GoalCardProps {
  goal: Goal;
  category?: Category;
  onOpen: () => void;
}

export function GoalCard({ goal, category, onOpen }: GoalCardProps) {
  const progress = goalProgress(goal);
  return (
    <button type="button" className="goal-card group" onClick={onOpen} aria-label={`Open ${goal.title}`}>
      <div className="flex items-start justify-between gap-4">
        <Ring percent={progress.percent} size={54} strokeWidth={5} color="var(--moss)" trackColor="var(--line)" showLabel />
        <ArrowUpRight size={18} className="card-arrow" aria-hidden="true" />
      </div>
      <div className="goal-card-copy">
        <h3>{goal.title}</h3>
        <p className={`goal-description ${goal.description ? "" : "empty-copy"}`}>{goal.description || "No description yet"}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="category-pill" style={category ? { backgroundColor: category.color } : undefined}>
          {category?.label ?? "Uncategorized"}
        </span>
        <span className={`status-pill status-${goal.status}`}>{STATUS_LABELS[goal.status]}</span>
      </div>
      <div className="goal-count mono">
        <span>{progress.done}/{progress.total} sub-tasks</span>
        {progress.cancelled > 0 && <span> · {progress.cancelled} cancelled</span>}
      </div>
    </button>
  );
}
