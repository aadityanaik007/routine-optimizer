import { CalendarDays, Dumbbell, History, Percent, Trophy } from "lucide-react";
import type { Goal, GymWorkoutOption, ScheduledGymWorkout } from "../types";
import { getPeriodRange, isInRange } from "../lib/dates";

export function GymReports({ goals }: { goals: Goal[] }) {
  const gymGoals = goals.filter((goal) => goal.roadmapKind === "gym" || goal.gymWorkoutOptions?.length || goal.scheduledGymWorkouts?.length);
  const options = gymGoals.flatMap((goal) => goal.gymWorkoutOptions ?? []);
  const schedules = gymGoals.flatMap((goal) => goal.scheduledGymWorkouts ?? []);
  if (!options.length && !schedules.length) return null;
  const optionMap = new Map(options.map((option) => [option.id, option]));
  const completed = schedules.filter((schedule) => schedule.status === "completed" && schedule.completedAt).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
  const thisWeek = completed.filter((schedule) => isInRange(schedule.completedAt, getPeriodRange("week"))).length;
  const thisMonth = completed.filter((schedule) => isInRange(schedule.completedAt, getPeriodRange("month"))).length;
  const completionRate = schedules.length ? Math.round((completed.length / schedules.length) * 100) : 0;
  const allTimeTypeCounts = getWorkoutTypeCounts(completed, optionMap);
  const typeCounts = getWorkoutTypeCounts(completed.filter((schedule) => isInRange(schedule.completedAt, getPeriodRange("month"))), optionMap);
  const mostFrequent = allTimeTypeCounts[0];
  const last = completed[0];

  return (
    <section className="report-panel gym-reports-panel">
      <div className="panel-heading"><div><span className="eyebrow">From scheduled workout instances</span><h2>Gym activity</h2></div><Dumbbell size={21} className="gym-report-icon" /></div>
      <div className="gym-report-stats">
        <GymMetric icon={<Trophy size={16} />} label="Total workouts completed" value={completed.length} />
        <GymMetric icon={<CalendarDays size={16} />} label="Completed this week" value={thisWeek} />
        <GymMetric icon={<CalendarDays size={16} />} label="Completed this month" value={thisMonth} />
        <GymMetric icon={<Percent size={16} />} label="Schedule completion" value={completionRate} suffix="%" />
        <article className="gym-metric text-metric"><span><Dumbbell size={16} />Most frequent overall</span><strong>{mostFrequent?.label ?? "—"}</strong><small className="mono">{mostFrequent ? `${mostFrequent.count} completed` : "No history yet"}</small></article>
      </div>
      <div className="gym-report-grid">
        <div className="gym-history">
          <h3><History size={15} /> Workout history</h3>
          {completed.length === 0 ? <p className="panel-empty">Complete a scheduled workout to begin your history.</p> : completed.slice(0, 10).map((schedule) => <div key={schedule.id}><span><strong>{optionMap.get(schedule.workoutId)?.name ?? "Workout"}</strong>{schedule.comment && <small>{schedule.comment}</small>}</span><time className="mono">{formatDate(schedule.completedAt!)}</time></div>)}
          {last && <p className="last-workout"><span>Last workout completed</span><strong>{optionMap.get(last.workoutId)?.name ?? "Workout"}</strong><time className="mono">{formatDate(last.completedAt!)}</time></p>}
        </div>
        <div className="gym-type-breakdown">
          <h3>Completed by workout type · {new Date().toLocaleDateString(undefined, { month: "long" })}</h3>
          {typeCounts.length === 0 ? <p className="panel-empty">No completed workout types yet.</p> : typeCounts.map((row) => <div key={row.key}><span>{row.label}</span><strong className="mono">{row.count}</strong></div>)}
        </div>
      </div>
    </section>
  );
}

function GymMetric({ icon, label, value, suffix = "" }: { icon: React.ReactNode; label: string; value: number; suffix?: string }) {
  return <article className="gym-metric"><span>{icon}{label}</span><strong className="mono">{value}{suffix}</strong></article>;
}

function getWorkoutTypeCounts(schedules: ScheduledGymWorkout[], options: Map<string, GymWorkoutOption>) {
  const counts = new Map<string, { key: string; label: string; count: number }>();
  schedules.forEach((schedule) => {
    const label = options.get(schedule.workoutId)?.name ?? "Deleted workout";
    const key = label.trim().toLocaleLowerCase();
    const current = counts.get(key) ?? { key, label, count: 0 };
    current.count += 1;
    counts.set(key, current);
  });
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
