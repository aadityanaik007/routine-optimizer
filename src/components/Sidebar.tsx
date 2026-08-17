import { BarChart3, Flame, LayoutGrid, Moon, Plus, Sun } from "lucide-react";
import type { View } from "../types";
import { Ring } from "./Ring";

interface SidebarProps {
  view: View;
  theme: "light" | "dark";
  streak: number;
  onNavigate: (view: "board" | "reports") => void;
  onNewGoal: () => void;
  onToggleTheme: () => void;
}

export function Sidebar({ view, theme, streak, onNavigate, onNewGoal, onToggleTheme }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <button className="brand" onClick={() => onNavigate("board")} aria-label="Rings home">
          <Ring percent={72} size={31} strokeWidth={4} color="var(--moss)" trackColor="var(--line)" />
          <span><strong>Rings</strong><small>a growth log</small></span>
        </button>
        <nav aria-label="Main navigation">
          <button className={view === "board" || view === "goal" ? "active" : ""} onClick={() => onNavigate("board")}><LayoutGrid size={18} /><span>Board</span></button>
          <button className={view === "reports" ? "active" : ""} onClick={() => onNavigate("reports")}><BarChart3 size={18} /><span>Reports</span></button>
        </nav>
        <button className="primary-button sidebar-new" onClick={onNewGoal}><Plus size={17} /> New goal</button>
      </div>
      <div className="sidebar-footer">
        <div className={`streak-card ${streak ? "active" : ""}`}>
          <Flame size={19} />
          <div>{streak > 0 ? <><strong className="mono">{streak} day{streak === 1 ? "" : "s"}</strong><span>current streak</span></> : <span>No streak yet — finish a sub-task today</span>}</div>
        </div>
        <div className="theme-row">
          <span>{theme === "dark" ? <Moon size={17} /> : <Sun size={17} />} {theme === "dark" ? "Dark" : "Light"} mode</span>
          <button type="button" role="switch" aria-checked={theme === "dark"} className="theme-switch" onClick={onToggleTheme} aria-label="Toggle dark mode"><span /></button>
        </div>
      </div>
    </aside>
  );
}
