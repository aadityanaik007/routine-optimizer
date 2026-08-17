import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { ChevronDown, GripVertical } from "lucide-react";
import type { Status, Subtask } from "../types";
import { STATUS_LABELS, STATUS_ORDER } from "../types";
import { ItemCommentEditor } from "./ItemCommentEditor";

interface RoadmapPhaseBoardProps {
  subtasks: Subtask[];
  onUpdate: (id: string, changes: Partial<Subtask>) => void;
  onUpdatePhaseStatus: (phaseTitle: string, status: Status) => void;
}

interface PhaseGroup {
  title: string;
  order: number;
  topics: Subtask[];
}

export function RoadmapPhaseBoard({ subtasks, onUpdate, onUpdatePhaseStatus }: RoadmapPhaseBoardProps) {
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(() => new Set());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const phaseMap = new Map<string, PhaseGroup>();
  for (const topic of subtasks) {
    const title = topic.roadmapPhaseTitle ?? "Other topics";
    const key = title.trim().toLocaleLowerCase();
    const phase = phaseMap.get(key) ?? { title, order: topic.roadmapPhaseOrder ?? Number.MAX_SAFE_INTEGER, topics: [] };
    phase.topics.push(topic);
    phaseMap.set(key, phase);
  }
  const phases = [...phaseMap.values()]
    .map((phase) => ({ ...phase, topics: phase.topics.sort((a, b) => (a.roadmapTopicOrder ?? 0) - (b.roadmapTopicOrder ?? 0)) }))
    .sort((a, b) => a.order - b.order);

  const handleDragEnd = (event: DragEndEvent) => {
    const target = event.over?.data.current;
    const source = event.active.data.current;
    if (target?.type !== "roadmap-column" || source?.type !== "roadmap-topic") return;
    if (target.phaseTitle !== source.phaseTitle || target.status === source.status) return;
    onUpdate(String(event.active.id), { status: target.status as Status });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <section className="board-roadmap" aria-label="C++ roadmap phases">
        {phases.map((phase) => {
          const completed = phase.topics.filter((topic) => topic.status === "completed").length;
          const phaseStatus = getPhaseStatus(phase.topics);
          const phaseKey = phase.title.trim().toLocaleLowerCase();
          const collapsed = collapsedPhases.has(phaseKey);
          return (
            <article className={`board-roadmap-phase ${collapsed ? "collapsed" : ""}`} key={`${phase.order}-${phaseKey}`}>
              <header>
                <div className="phase-heading">
                  <button
                    type="button"
                    className="phase-collapse-button"
                    aria-expanded={!collapsed}
                    aria-label={`${collapsed ? "Expand" : "Collapse"} ${phase.title}`}
                    onClick={() => setCollapsedPhases((current) => {
                      const next = new Set(current);
                      if (next.has(phaseKey)) next.delete(phaseKey);
                      else next.add(phaseKey);
                      return next;
                    })}
                  ><ChevronDown size={18} /></button>
                  <div><span className="mono phase-kicker">Phase {phase.order === Number.MAX_SAFE_INTEGER ? "—" : phase.order}</span><h2>{phase.title}</h2></div>
                </div>
                <div className="phase-header-controls">
                  <span className="mono phase-progress">{completed}/{phase.topics.length} complete</span>
                  <select
                    className={`status-select status-${phaseStatus}`}
                    value={phaseStatus}
                    onChange={(event) => onUpdatePhaseStatus(phase.title, event.target.value as Status)}
                    aria-label={`Status for phase ${phase.title}`}
                  >
                    {STATUS_ORDER.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                  </select>
                </div>
              </header>
              {!collapsed && (
                <div className="phase-kanban">
                  {STATUS_ORDER.map((status) => (
                    <RoadmapStatusColumn
                      key={status}
                      phaseTitle={phase.title}
                      status={status}
                      topics={phase.topics.filter((topic) => topic.status === status)}
                      onUpdate={onUpdate}
                    />
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </DndContext>
  );
}

function RoadmapStatusColumn({ phaseTitle, status, topics, onUpdate }: {
  phaseTitle: string;
  status: Status;
  topics: Subtask[];
  onUpdate: (id: string, changes: Partial<Subtask>) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `roadmap-column-${phaseTitle}-${status}`,
    data: { type: "roadmap-column", phaseTitle, status },
  });
  return (
    <section ref={setNodeRef} className={`phase-kanban-column column-${status} ${isOver ? "drop-target" : ""}`}>
      <header><div><span className="status-dot" /><h3>{STATUS_LABELS[status]}</h3></div><span className="mono">{topics.length}</span></header>
      <div className="phase-column-body">
        {topics.length ? topics.map((topic) => <RoadmapTopicCard key={topic.id} topic={topic} phaseTitle={phaseTitle} onUpdate={onUpdate} />) : <span className="phase-drop-empty">Drop here</span>}
      </div>
    </section>
  );
}

function RoadmapTopicCard({ topic, phaseTitle, onUpdate }: {
  topic: Subtask;
  phaseTitle: string;
  onUpdate: (id: string, changes: Partial<Subtask>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: topic.id,
    data: { type: "roadmap-topic", phaseTitle, status: topic.status },
  });
  return (
    <article
      ref={setNodeRef}
      className={`phase-topic-card ${isDragging ? "dragging" : ""}`}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
    >
      <div className="phase-topic-heading">
        <button type="button" className="drag-handle" {...listeners} {...attributes} aria-label={`Drag ${topic.title}`}><GripVertical size={14} /></button>
        <span className="mono board-topic-order">{topic.roadmapTopicOrder ?? "—"}</span>
        <h4>{topic.title}</h4>
      </div>
      {topic.description && <p>{topic.description}</p>}
      <ItemCommentEditor comment={topic.comment} onSave={(comment) => onUpdate(topic.id, { comment })} />
      <select
        className={`status-select status-${topic.status}`}
        value={topic.status}
        onChange={(event) => onUpdate(topic.id, { status: event.target.value as Status })}
        aria-label={`Status for ${topic.title}`}
      >
        {STATUS_ORDER.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
      </select>
    </article>
  );
}

function getPhaseStatus(topics: Subtask[]): Status {
  if (!topics.length) return "todo";
  const first = topics[0].status;
  if (topics.every((topic) => topic.status === first)) return first;
  return "in_progress";
}
