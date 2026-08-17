import type { Goal, ScheduledGymWorkout, Status } from "../types";
import type { DateRange } from "./dates";
import { isInRange } from "./dates";

export function goalProgress(goal: Goal): { done: number; total: number; cancelled: number; percent: number } {
  if (goal.roadmapKind === "gym" || goal.scheduledGymWorkouts) {
    const schedules = goal.scheduledGymWorkouts ?? [];
    const done = schedules.filter((item) => item.status === "completed").length;
    return { done, total: schedules.length, cancelled: 0, percent: schedules.length ? Math.round((done / schedules.length) * 100) : 0 };
  }
  const active = goal.subtasks.filter((item) => item.status !== "cancelled");
  const done = active.filter((item) => item.status === "completed").length;
  const cancelled = goal.subtasks.length - active.length;
  const percent = active.length === 0 ? (goal.status === "completed" ? 100 : 0) : Math.round((done / active.length) * 100);
  return { done, total: active.length, cancelled, percent };
}

export function completionStreak(goals: Goal[], now = new Date()): number {
  const completedDays = new Set<string>();
  for (const goal of goals) {
    if (goal.completedAt) completedDays.add(new Date(goal.completedAt).toDateString());
    goal.subtasks.forEach((item) => {
      if (item.completedAt) completedDays.add(new Date(item.completedAt).toDateString());
    });
    goal.scheduledGymWorkouts?.forEach((item) => {
      if (item.completedAt) completedDays.add(new Date(item.completedAt).toDateString());
    });
  }
  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  while (completedDays.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function itemsInScope(goals: Goal[]): Array<Goal | Goal["subtasks"][number] | ScheduledGymWorkout> {
  return goals.flatMap((goal) => [goal, ...goal.subtasks, ...(goal.scheduledGymWorkouts ?? [])]);
}

export function completedInRange(goals: Goal[], range: DateRange): number {
  return itemsInScope(goals).filter((item) => item.status === "completed" && isInRange(item.completedAt, range)).length;
}

export function createdInRange(goals: Goal[], range: DateRange): number {
  return itemsInScope(goals).filter((item) => isInRange(item.createdAt, range)).length;
}

export function statusCounts(goals: Goal[]): Record<Status, number> {
  const result: Record<Status, number> = { todo: 0, in_progress: 0, completed: 0, cancelled: 0 };
  itemsInScope(goals).forEach((item) => { result[item.status] += 1; });
  return result;
}
