import { useEffect, useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { ChevronDown, GripVertical, Trash2 } from "lucide-react";
import type { Status, Subtask } from "../types";
import { STATUS_LABELS, STATUS_ORDER } from "../types";

interface SubtaskCardProps {
  subtask: Subtask;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (changes: Partial<Subtask>) => void;
  onDelete: () => void;
}

export function SubtaskCard({ subtask, expanded, onToggle, onUpdate, onDelete }: SubtaskCardProps) {
  const [description, setDescription] = useState(subtask.description);
  const [confirming, setConfirming] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: subtask.id,
    data: { type: "kanban-card", status: subtask.status },
  });

  useEffect(() => setDescription(subtask.description), [subtask.description]);
  useEffect(() => () => { if (timeoutRef.current) window.clearTimeout(timeoutRef.current); }, []);

  const deleteClick = () => {
    if (confirming) { onDelete(); return; }
    setConfirming(true);
    timeoutRef.current = window.setTimeout(() => setConfirming(false), 3000);
  };

  return (
    <article
      ref={setNodeRef}
      className={`subtask-card ${expanded ? "expanded" : ""} ${isDragging ? "dragging" : ""}`}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
    >
      <div className="subtask-summary-row">
      <button type="button" className="drag-handle" {...listeners} {...attributes} aria-label={`Drag ${subtask.title}`}><GripVertical size={15} /></button>
      <button type="button" className="subtask-summary" onClick={onToggle} aria-expanded={expanded}>
        <span>{subtask.title}</span><ChevronDown size={16} />
      </button>
      </div>
      {expanded && (
        <div className="subtask-details">
          <label className="field-label" htmlFor={`notes-${subtask.id}`}>Notes</label>
          <textarea
            id={`notes-${subtask.id}`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            onBlur={() => { if (description !== subtask.description) onUpdate({ description }); }}
            placeholder="Add a progress note…"
            rows={3}
          />
          <div className="subtask-actions">
            <select
              aria-label={`Status for ${subtask.title}`}
              value={subtask.status}
              onChange={(event) => onUpdate({ status: event.target.value as Status })}
              className={`status-select status-${subtask.status}`}
            >
              {STATUS_ORDER.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
            </select>
            <button type="button" className={`delete-button ${confirming ? "confirming" : ""}`} onClick={deleteClick}>
              <Trash2 size={14} />{confirming ? "Confirm delete?" : "Delete"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
