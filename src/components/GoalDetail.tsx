import { useEffect, useRef, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCorners, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { ArrowLeft, FileQuestion, FileUp, Plus, Trash2 } from "lucide-react";
import type { Category, Goal, Status, Subtask } from "../types";
import { STATUS_LABELS, STATUS_ORDER } from "../types";
import { goalProgress } from "../lib/stats";
import { CategoryField } from "./CategoryField";
import { KanbanColumn } from "./KanbanColumn";
import { Ring } from "./Ring";
import { RoadmapPhaseBoard } from "./RoadmapPhaseBoard";
import { GymBoard } from "./GymBoard";
import type { ImportCategory } from "./RoadmapImportModal";

interface GoalDetailProps {
  goal: Goal;
  categories: Category[];
  onBack: () => void;
  onCreateCategory: (label: string) => Category;
  onUpdateGoal: (changes: Partial<Goal>) => void;
  onDeleteGoal: () => void;
  onAddSubtask: (title: string) => void;
  onUpdateSubtask: (id: string, changes: Partial<Subtask>) => void;
  onUpdatePhaseStatus: (phaseTitle: string, status: Status) => void;
  onDeleteSubtask: (id: string) => void;
  onSelectCsv: (file: File, category: ImportCategory) => void;
  onShowCsvGuide: (category: ImportCategory) => void;
}

export function GoalDetail({ goal, categories, onBack, onCreateCategory, onUpdateGoal, onDeleteGoal, onAddSubtask, onUpdateSubtask, onUpdatePhaseStatus, onDeleteSubtask, onSelectCsv, onShowCsvGuide }: GoalDetailProps) {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description);
  const [newSubtask, setNewSubtask] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const progress = goalProgress(goal);
  const categoryLabel = categories.find((category) => category.id === goal.categoryId)?.label.toLocaleLowerCase();
  const importCategory: ImportCategory | null = categoryLabel === "gym" ? "gym" : categoryLabel === "studies" ? "studies" : null;
  const dragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => { setTitle(goal.title); setDescription(goal.description); setExpandedId(null); }, [goal.id, goal.title, goal.description]);
  useEffect(() => () => { if (timeoutRef.current) window.clearTimeout(timeoutRef.current); }, []);

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = newSubtask.trim();
    if (!clean) return;
    onAddSubtask(clean);
    setNewSubtask("");
  };

  const deleteGoal = () => {
    if (confirmingDelete) { onDeleteGoal(); return; }
    setConfirmingDelete(true);
    timeoutRef.current = window.setTimeout(() => setConfirmingDelete(false), 3000);
  };

  const handleKanbanDragEnd = (event: DragEndEvent) => {
    const nextStatus = event.over?.data.current?.status as Status | undefined;
    if (!nextStatus || event.active.data.current?.status === nextStatus) return;
    onUpdateSubtask(String(event.active.id), { status: nextStatus });
  };

  return (
    <main className="page-shell detail-page">
      <button type="button" className="back-button" onClick={onBack}><ArrowLeft size={16} /> Back to board</button>
      <div className="detail-header">
        <div className="detail-title-wrap">
          <input
            className="editable-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => { const clean = title.trim(); if (clean && clean !== goal.title) onUpdateGoal({ title: clean }); else setTitle(goal.title); }}
            aria-label="Goal title"
          />
          <div className="detail-controls">
            <CategoryField compact categories={categories} value={goal.categoryId} onChange={(categoryId) => onUpdateGoal({ categoryId })} onCreate={onCreateCategory} />
            <div className="detail-csv-actions">
              <button type="button" className="icon-button" disabled={!importCategory} onClick={() => importCategory && onShowCsvGuide(importCategory)} aria-label="View CSV format"><FileQuestion size={15} /></button>
              <button type="button" className="secondary-button detail-import-button" disabled={!importCategory} onClick={() => csvInputRef.current?.click()}><FileUp size={15} /> Import CSV</button>
              <input ref={csvInputRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file && importCategory) onSelectCsv(file, importCategory); event.target.value = ""; }} />
            </div>
            <select className={`status-select status-${goal.status}`} value={goal.status} onChange={(event) => onUpdateGoal({ status: event.target.value as Status })} aria-label="Goal status">
              {STATUS_ORDER.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
            </select>
            <button type="button" className={`delete-button ${confirmingDelete ? "confirming" : ""}`} onClick={deleteGoal}><Trash2 size={15} />{confirmingDelete ? "Confirm delete?" : "Delete goal"}</button>
          </div>
        </div>
        <textarea
          className="plain-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onBlur={() => { if (description !== goal.description) onUpdateGoal({ description }); }}
          placeholder="Add a description…"
          rows={2}
          aria-label="Goal description"
        />
      </div>

      <div className="progress-row">
        <Ring percent={progress.percent} size={28} strokeWidth={3.5} color="var(--moss)" trackColor="var(--line)" />
        <span><strong className="mono">{progress.done}/{progress.total}</strong> sub-tasks complete</span>
        {progress.cancelled > 0 && <span className="muted mono">· {progress.cancelled} cancelled</span>}
      </div>

      {importCategory === "gym" ? (
        <GymBoard goal={goal} onUpdateGoal={onUpdateGoal} />
      ) : goal.roadmapRoot || goal.roadmapKind === "studies" ? (
        <RoadmapPhaseBoard subtasks={goal.subtasks} onUpdate={onUpdateSubtask} onUpdatePhaseStatus={onUpdatePhaseStatus} />
      ) : (
        <>
          <form className="add-subtask" onSubmit={add}>
            <input value={newSubtask} onChange={(event) => setNewSubtask(event.target.value)} placeholder="Add a sub-task…" aria-label="New sub-task title" />
            <button className="primary-button" type="submit" disabled={!newSubtask.trim()}><Plus size={17} /> Add sub-task</button>
          </form>

          <DndContext sensors={dragSensors} collisionDetection={closestCorners} onDragEnd={handleKanbanDragEnd}>
          <div className="kanban-grid">
            {STATUS_ORDER.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                subtasks={goal.subtasks.filter((item) => item.status === status)}
                expandedId={expandedId}
                onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                onUpdate={onUpdateSubtask}
                onDelete={onDeleteSubtask}
              />
            ))}
          </div>
          </DndContext>
        </>
      )}
    </main>
  );
}
