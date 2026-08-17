import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Category, Goal, Status } from "../types";
import { STATUS_LABELS, STATUS_ORDER } from "../types";
import type { Period } from "../lib/dates";
import { getActivityBuckets, getPeriodRange, periodNoun, previousRange } from "../lib/dates";
import { completedInRange, createdInRange, itemsInScope, statusCounts } from "../lib/stats";
import { Ring } from "./Ring";
import { GymReports } from "./GymReports";

interface ReportsProps {
  goals: Goal[];
  categories: Category[];
  scopeId: string;
  period: Period;
  onScopeChange: (id: string) => void;
  onPeriodChange: (period: Period) => void;
}

export function Reports({ goals, categories, scopeId, period, onScopeChange, onPeriodChange }: ReportsProps) {
  const scopedGoals = scopeId === "all" ? goals : goals.filter((goal) => goal.id === scopeId);
  const range = getPeriodRange(period);
  const priorRange = previousRange(period, range);
  const completed = completedInRange(scopedGoals, range);
  const previousCompleted = completedInRange(scopedGoals, priorRange);
  const delta = completed - previousCompleted;
  const created = createdInRange(scopedGoals, range);
  const items = itemsInScope(scopedGoals);
  const completedOverall = items.filter((item) => item.status === "completed").length;
  const completionRate = items.length ? Math.round((completedOverall / items.length) * 100) : 0;
  const activeGoals = scopedGoals.filter((goal) => goal.status === "in_progress").length;
  const counts = statusCounts(scopedGoals);
  const statusTotal = Object.values(counts).reduce((sum, value) => sum + value, 0);

  const buckets = getActivityBuckets(period).map((bucket) => ({ ...bucket, count: completedInRange(scopedGoals, bucket) }));
  const maxBucket = Math.max(1, ...buckets.map((bucket) => bucket.count));

  const categoryRows = categories.map((category) => ({
    category,
    count: goals.filter((goal) => goal.categoryId === category.id).reduce((sum, goal) => {
      const goalCount = goal.status === "completed" && goal.completedAt && new Date(goal.completedAt) >= range.start && new Date(goal.completedAt) < range.end ? 1 : 0;
      return sum + goalCount + goal.subtasks.filter((item) => item.status === "completed" && item.completedAt && new Date(item.completedAt) >= range.start && new Date(item.completedAt) < range.end).length;
    }, 0),
  })).filter((row) => row.count > 0).sort((a, b) => b.count - a.count);

  const uncategorizedCount = goals.filter((goal) => !goal.categoryId).reduce((sum, goal) => sum + completedInRange([goal], range), 0);

  return (
    <main className="page-shell reports-page">
      <header className="page-header reports-header">
        <div><span className="eyebrow">See your momentum</span><h1>Reports</h1></div>
        <div className="report-controls">
          <select value={scopeId} onChange={(event) => onScopeChange(event.target.value)} aria-label="Report scope">
            <option value="all">All goals</option>
            {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
          </select>
          <div className="segmented-control" aria-label="Report period">
            {(["day", "week", "month"] as Period[]).map((item) => <button key={item} className={period === item ? "active" : ""} onClick={() => onPeriodChange(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}
          </div>
        </div>
      </header>

      <section className="stats-grid">
        <StatCard label={`Completed ${periodNoun(period)}`} value={completed}>
          <div className={`delta ${delta > 0 ? "positive" : delta < 0 ? "negative" : "flat"}`}>
            {delta > 0 ? <ArrowUpRight size={14} /> : delta < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
            {delta === 0 ? `same as ${periodNoun(period, true)} (${previousCompleted})` : `${delta > 0 ? "+" : ""}${delta} vs ${periodNoun(period, true)}`}
          </div>
        </StatCard>
        <StatCard label={`Created ${periodNoun(period)}`} value={created}><span className="stat-note">goals + sub-tasks</span></StatCard>
        <article className="stat-card rate-card"><div><span className="stat-label">Overall completion rate</span><strong className="mono">{completionRate}%</strong><span className="stat-note">{completedOverall} of {items.length} items</span></div><Ring percent={completionRate} size={52} strokeWidth={5} color="var(--moss)" trackColor="var(--line)" /></article>
        <StatCard label="Active now" value={activeGoals}><span className="stat-note">goals in progress</span></StatCard>
      </section>

      <section className="report-panel activity-panel">
        <div className="panel-heading"><div><span className="eyebrow">Completion rhythm</span><h2>Activity</h2></div><span className="panel-meta">{period === "day" ? "Last 30 days" : period === "week" ? "Last 12 weeks" : "Last 12 months"}</span></div>
        <div className={`activity-strip activity-${period}`}>
          {buckets.map((bucket, index) => {
            const level = bucket.count === 0 ? 0 : Math.max(1, Math.ceil((bucket.count / maxBucket) * 4));
            return <div className="activity-item" key={bucket.start.toISOString()} title={`${bucket.label}: ${bucket.count} completion${bucket.count === 1 ? "" : "s"}`} tabIndex={0} aria-label={`${bucket.label}: ${bucket.count} completions`}>
              <span className={`activity-ring level-${level}`}><Ring percent={level * 25} size={period === "day" ? 18 : 23} strokeWidth={3} color="var(--moss)" trackColor="var(--line)" /></span>
              {(period !== "day" || index % 5 === 0 || index === buckets.length - 1) && <small>{bucket.shortLabel}</small>}
              <span className="activity-tooltip">{bucket.label}<strong className="mono">{bucket.count}</strong></span>
            </div>;
          })}
        </div>
      </section>

      <div className="report-lower-grid">
        <section className="report-panel">
          <div className="panel-heading"><div><span className="eyebrow">Across all goals</span><h2>By category</h2></div><span className="panel-meta">{periodNoun(period)}</span></div>
          <div className="breakdown-list">
            {categoryRows.length === 0 && uncategorizedCount === 0 ? <p className="panel-empty">No completions to group yet.</p> : <>
              {categoryRows.map(({ category, count }) => <div className="breakdown-row" key={category.id}><span className="swatch" style={{ backgroundColor: category.color }} /><span>{category.label}</span><strong className="mono">{count}</strong></div>)}
              {uncategorizedCount > 0 && <div className="breakdown-row"><span className="swatch neutral" /><span>Uncategorized</span><strong className="mono">{uncategorizedCount}</strong></div>}
            </>}
          </div>
        </section>

        <section className="report-panel">
          <div className="panel-heading"><div><span className="eyebrow">Selected scope</span><h2>Status mix</h2></div><span className="panel-meta mono">{statusTotal} items</span></div>
          {statusTotal === 0 ? <p className="panel-empty">No items in this scope yet.</p> : <>
            <div className="status-bar" aria-label="Status proportions">
              {STATUS_ORDER.map((status) => counts[status] > 0 && <span key={status} className={`bar-${status}`} style={{ width: `${(counts[status] / statusTotal) * 100}%` }} title={`${STATUS_LABELS[status]}: ${counts[status]}`} />)}
            </div>
            <div className="status-legend">
              {STATUS_ORDER.map((status) => <div key={status}><span className={`legend-dot bar-${status}`} /><span>{STATUS_LABELS[status]}</span><strong className="mono">{counts[status]}</strong></div>)}
            </div>
          </>}
        </section>
      </div>
      <GymReports goals={goals} />
    </main>
  );
}

function StatCard({ label, value, children }: { label: string; value: number; children: React.ReactNode }) {
  return <article className="stat-card"><span className="stat-label">{label}</span><strong className="mono stat-value">{value}</strong>{children}</article>;
}
