import { Plus, Sprout } from "lucide-react";
import type { Category, Goal } from "../types";
import { GoalCard } from "./GoalCard";

interface BoardProps {
  goals: Goal[];
  categories: Category[];
  filter: string;
  onFilter: (value: string) => void;
  onNewGoal: () => void;
  onOpenGoal: (id: string) => void;
}

export function Board({ goals, categories, filter, onFilter, onNewGoal, onOpenGoal }: BoardProps) {
  const filtered = goals.filter((goal) => filter === "all" || (filter === "uncategorized" ? !goal.categoryId : goal.categoryId === filter));

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <span className="eyebrow">Your growth space</span>
          <div className="title-row"><h1>Board</h1><span className="count-badge mono">{goals.length} {goals.length === 1 ? "goal" : "goals"}</span></div>
        </div>
        <div className="board-header-actions">
          <button type="button" className="primary-button desktop-action" onClick={onNewGoal}><Plus size={17} /> New goal</button>
        </div>
      </header>

      {goals.length > 0 && (
        <div className="filter-scroll" aria-label="Filter goals by category">
          <button className={`filter-chip ${filter === "all" ? "active" : ""}`} onClick={() => onFilter("all")}>All</button>
          {categories.map((category) => (
            <button key={category.id} className={`filter-chip ${filter === category.id ? "active" : ""}`} onClick={() => onFilter(category.id)}>
              <span className="color-dot" style={{ backgroundColor: category.color }} />{category.label}
            </button>
          ))}
          <button className={`filter-chip ${filter === "uncategorized" ? "active" : ""}`} onClick={() => onFilter("uncategorized")}>
            <span className="color-dot neutral" />Uncategorized
          </button>
        </div>
      )}

      {goals.length === 0 ? (
        <section className="empty-state large">
          <span className="empty-icon"><Sprout size={28} /></span>
          <h2>Plant your first intention</h2>
          <p>Turn something you want to grow into a goal, then break it into small steps.</p>
          <button type="button" className="primary-button" onClick={onNewGoal}><Plus size={17} /> Create your first goal</button>
        </section>
      ) : filtered.length === 0 ? (
        <section className="empty-state"><h2>Nothing here yet</h2><p>No goals match this category.</p><button className="text-button" onClick={() => onFilter("all")}>Clear filter</button></section>
      ) : (
        <section className="goal-grid">
          {filtered.map((goal) => <GoalCard key={goal.id} goal={goal} category={categories.find((item) => item.id === goal.categoryId)} onOpen={() => onOpenGoal(goal.id)} />)}
        </section>
      )}
    </main>
  );
}
