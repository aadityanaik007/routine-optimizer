import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Dumbbell, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Goal, GymWorkoutOption, ScheduledGymWorkout } from "../types";

interface GymBoardProps {
  goal: Goal;
  onUpdateGoal: (changes: Partial<Goal>) => void;
}

const makeId = () => crypto.randomUUID();

export function GymBoard({ goal, onUpdateGoal }: GymBoardProps) {
  const allOptions = useMemo(() => [...(goal.gymWorkoutOptions ?? [])].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)), [goal.gymWorkoutOptions]);
  const options = useMemo(() => allOptions.filter((option) => !option.archived), [allOptions]);
  const schedules = goal.scheduledGymWorkouts ?? [];
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [editingOption, setEditingOption] = useState<GymWorkoutOption | "new" | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<{ date: string; schedule?: ScheduledGymWorkout; workoutId?: string } | null>(null);
  const calendarDays = getCalendarDays(month);

  const saveOption = (value: { name: string; description: string }) => {
    if (editingOption === "new") {
      onUpdateGoal({ gymWorkoutOptions: [...allOptions, { id: makeId(), name: value.name, description: value.description, order: Math.max(0, ...allOptions.map((option) => option.order)) + 1 }] });
    } else if (editingOption) {
      onUpdateGoal({ gymWorkoutOptions: allOptions.map((option) => option.id === editingOption.id ? { ...option, ...value } : option) });
    }
    setEditingOption(null);
  };

  const deleteOption = (id: string) => {
    const hasHistory = schedules.some((schedule) => schedule.workoutId === id);
    onUpdateGoal({
      gymWorkoutOptions: hasHistory ? allOptions.map((option) => option.id === id ? { ...option, archived: true } : option) : allOptions.filter((option) => option.id !== id),
    });
    setEditingOption(null);
  };

  const saveSchedule = (value: Omit<ScheduledGymWorkout, "id" | "createdAt" | "completedAt">) => {
    const existing = scheduleDraft?.schedule;
    const now = new Date().toISOString();
    const schedule: ScheduledGymWorkout = {
      ...value,
      id: existing?.id ?? makeId(),
      createdAt: existing?.createdAt ?? now,
      completedAt: value.status === "completed" ? (existing?.status === "completed" ? existing.completedAt : now) : null,
    };
    onUpdateGoal({ scheduledGymWorkouts: existing ? schedules.map((item) => item.id === existing.id ? schedule : item) : [...schedules, schedule] });
    setScheduleDraft(null);
  };

  const deleteSchedule = (id: string) => {
    onUpdateGoal({ scheduledGymWorkouts: schedules.filter((schedule) => schedule.id !== id) });
    setScheduleDraft(null);
  };

  return (
    <section className="gym-board">
      <section className="gym-options-panel">
        <div className="gym-section-heading"><div><span className="eyebrow">Reusable library</span><h2>Workout Options</h2></div><button type="button" className="primary-button" onClick={() => setEditingOption("new")}><Plus size={16} /> Add Workout</button></div>
        {options.length === 0 ? <div className="gym-options-empty"><Dumbbell size={22} /><p>Add a workout option or import a Gym CSV to get started.</p></div> : <div className="gym-option-grid">{options.map((option) => (
          <article className="gym-option-card" key={option.id}>
            <div><span className="mono">{option.order}</span><h3>{option.name}</h3></div>
            {option.description && <p>{option.description}</p>}
            <div><button type="button" className="text-button" onClick={() => setScheduleDraft({ date: toDateKey(new Date()), workoutId: option.id })}><CalendarDays size={13} /> Schedule</button><button type="button" className="icon-button ghost" onClick={() => setEditingOption(option)} aria-label={`Edit ${option.name}`}><Pencil size={14} /></button></div>
          </article>
        ))}</div>}
      </section>

      <section className="gym-calendar-panel">
        <div className="gym-section-heading calendar-heading">
          <div><span className="eyebrow">Scheduled sessions</span><h2>Workout Calendar</h2></div>
          <div className="calendar-navigation"><button className="icon-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft size={17} /></button><strong>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong><button className="icon-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight size={17} /></button></div>
        </div>
        <div className="gym-calendar-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="gym-calendar-grid">
          {calendarDays.map((day) => {
            const key = toDateKey(day);
            const daySchedules = schedules.filter((schedule) => schedule.scheduledDate === key);
            const isCurrentMonth = day.getMonth() === month.getMonth();
            const isToday = key === toDateKey(new Date());
            return (
              <div className={`gym-calendar-day ${isCurrentMonth ? "" : "outside"} ${isToday ? "today" : ""}`} key={key}>
                <button type="button" className="calendar-date-button" disabled={!options.length} onClick={() => setScheduleDraft({ date: key })} aria-label={`Schedule workout on ${day.toLocaleDateString()}`}><span className="mono">{day.getDate()}</span><Plus size={12} /></button>
                <div className="calendar-workouts">{daySchedules.map((schedule) => {
                  const option = allOptions.find((item) => item.id === schedule.workoutId);
                  return <button type="button" className={`calendar-workout ${schedule.status}`} key={schedule.id} onClick={() => setScheduleDraft({ date: schedule.scheduledDate, schedule })}>{schedule.status === "completed" && <Check size={11} />}<span>{option?.name ?? "Deleted workout"}</span></button>;
                })}</div>
              </div>
            );
          })}
        </div>
      </section>

      {editingOption && <GymOptionModal option={editingOption === "new" ? undefined : editingOption} scheduledCount={editingOption === "new" ? 0 : schedules.filter((schedule) => schedule.workoutId === editingOption.id).length} onClose={() => setEditingOption(null)} onSave={saveOption} onDelete={deleteOption} />}
      {scheduleDraft && <GymScheduleModal options={scheduleDraft.schedule ? allOptions.filter((option) => !option.archived || option.id === scheduleDraft.schedule?.workoutId) : options} date={scheduleDraft.date} initialWorkoutId={scheduleDraft.workoutId} schedule={scheduleDraft.schedule} onClose={() => setScheduleDraft(null)} onSave={saveSchedule} onDelete={deleteSchedule} />}
    </section>
  );
}

function GymOptionModal({ option, scheduledCount, onClose, onSave, onDelete }: { option?: GymWorkoutOption; scheduledCount: number; onClose: () => void; onSave: (value: { name: string; description: string }) => void; onDelete: (id: string) => void }) {
  const [name, setName] = useState(option?.name ?? "");
  const [description, setDescription] = useState(option?.description ?? "");
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  return <div className="nested-modal-backdrop"><div className="modal gym-editor-modal" role="dialog" aria-modal="true" aria-labelledby="gym-option-title"><div className="modal-header"><h2 id="gym-option-title">{option ? "Edit workout" : "Add workout"}</h2><button className="icon-button ghost" onClick={onClose}><X size={18} /></button></div><div className="form-stack"><div><label className="field-label">Workout name</label><input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={160} placeholder="e.g. Legs" /></div><div><label className="field-label">Short description <span className="optional">Optional</span></label><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} placeholder="What does this workout focus on?" /></div>{option && scheduledCount > 0 && <p className="option-history-note">Removing this option keeps its {scheduledCount} scheduled session{scheduledCount === 1 ? "" : "s"} in calendar history.</p>}<div className="modal-actions">{option && <button type="button" className={`delete-button option-delete ${confirming ? "confirming" : ""}`} onClick={() => { if (confirming) return onDelete(option.id); setConfirming(true); timer.current = window.setTimeout(() => setConfirming(false), 3000); }}><Trash2 size={14} />{confirming ? "Confirm remove?" : "Remove option"}</button>}<span className="modal-action-spacer" /><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), description: description.trim() })}>Save workout</button></div></div></div></div>;
}

function GymScheduleModal({ options, date, initialWorkoutId, schedule, onClose, onSave, onDelete }: { options: GymWorkoutOption[]; date: string; initialWorkoutId?: string; schedule?: ScheduledGymWorkout; onClose: () => void; onSave: (value: Omit<ScheduledGymWorkout, "id" | "createdAt" | "completedAt">) => void; onDelete: (id: string) => void }) {
  const [workoutId, setWorkoutId] = useState(schedule?.workoutId ?? initialWorkoutId ?? options[0]?.id ?? "");
  const [scheduledDate, setScheduledDate] = useState(schedule?.scheduledDate ?? date);
  const [status, setStatus] = useState<"todo" | "completed">(schedule?.status ?? "todo");
  const [comment, setComment] = useState(schedule?.comment ?? "");
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const option = options.find((item) => item.id === workoutId);
  return <div className="nested-modal-backdrop"><div className="modal gym-editor-modal" role="dialog" aria-modal="true" aria-labelledby="schedule-title"><div className="modal-header"><div><span className="eyebrow">Scheduled workout</span><h2 id="schedule-title">{option?.name ?? "Choose workout"}</h2></div><button className="icon-button ghost" onClick={onClose}><X size={18} /></button></div><div className="form-stack"><div><label className="field-label">Workout</label><select value={workoutId} onChange={(event) => setWorkoutId(event.target.value)}>{options.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div><div><label className="field-label">Date</label><input type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} /></div><div><label className="field-label">Status</label><select className={`status-select status-${status}`} value={status} onChange={(event) => setStatus(event.target.value as "todo" | "completed")}><option value="todo">To Do</option><option value="completed">Completed</option></select></div><div><label className="field-label">Comment <span className="optional">Optional</span></label><textarea rows={4} maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="How did this session go?" /></div>{schedule?.completedAt && status === "completed" && <p className="schedule-completed-at mono">Completed {new Date(schedule.completedAt).toLocaleString()}</p>}<div className="modal-actions">{schedule && <button type="button" className={`delete-button ${confirming ? "confirming" : ""}`} onClick={() => { if (confirming) return onDelete(schedule.id); setConfirming(true); timer.current = window.setTimeout(() => setConfirming(false), 3000); }}><Trash2 size={14} />{confirming ? "Remove workout?" : "Remove"}</button>}<span className="modal-action-spacer" /><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!workoutId || !scheduledDate} onClick={() => onSave({ workoutId, scheduledDate, status, comment: comment.trim() })}>Save</button></div></div></div></div>;
}

function getCalendarDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
