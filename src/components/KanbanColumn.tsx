import { useDroppable } from "@dnd-kit/core";
import type { Status, Subtask } from "../types";
import { STATUS_LABELS } from "../types";
import { SubtaskCard } from "./SubtaskCard";

interface KanbanColumnProps {
  status: Status;
  subtasks: Subtask[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onUpdate: (id: string, changes: Partial<Subtask>) => void;
  onDelete: (id: string) => void;
}

export function KanbanColumn({ status, subtasks, expandedId, onToggle, onUpdate, onDelete }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: `kanban-column-${status}`, data: { type: "kanban-column", status } });
  return (
    <section ref={setNodeRef} className={`kanban-column column-${status} ${isOver ? "drop-target" : ""}`}>
      <header><div><span className="status-dot" /><h2>{STATUS_LABELS[status]}</h2></div><span className="column-count mono">{subtasks.length}</span></header>
      <div className="column-body">
        {subtasks.length === 0 ? <span className="column-empty">—</span> : subtasks.map((subtask) => (
          <SubtaskCard
            key={subtask.id}
            subtask={subtask}
            expanded={expandedId === subtask.id}
            onToggle={() => onToggle(subtask.id)}
            onUpdate={(changes) => onUpdate(subtask.id, changes)}
            onDelete={() => onDelete(subtask.id)}
          />
        ))}
      </div>
    </section>
  );
}
