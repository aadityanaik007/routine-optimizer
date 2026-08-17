import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Dumbbell, FileSpreadsheet, GraduationCap, LoaderCircle, Upload, X } from "lucide-react";
import type { GymWorkoutDefinition, RoadmapPhase } from "../types";
import { parseGymCSV, type ParsedGymCSV } from "../lib/gymCsv";
import { parseRoadmapCSV, type ParsedRoadmapCSV } from "../lib/roadmapCsv";

export type ImportMode = "replace" | "merge";
export type ImportCategory = "studies" | "gym";
export type RoadmapImportPayload =
  | { category: "studies"; filename: string; roadmap: RoadmapPhase[] }
  | { category: "gym"; filename: string; tasks: GymWorkoutDefinition[] };

type ParsedImport =
  | { category: "studies"; result: ParsedRoadmapCSV }
  | { category: "gym"; result: ParsedGymCSV };

interface RoadmapImportModalProps {
  initialFile: File;
  initialCategory: ImportCategory;
  hasExistingStudies: boolean;
  hasExistingGym: boolean;
  lockCategory?: boolean;
  onCancel: () => void;
  onImport: (payload: RoadmapImportPayload, mode: ImportMode) => string | null;
}

export function RoadmapImportModal({ initialFile, initialCategory, hasExistingStudies, hasExistingGym, lockCategory = false, onCancel, onImport }: RoadmapImportModalProps) {
  const [file, setFile] = useState(initialFile);
  const [category, setCategory] = useState<ImportCategory>(initialCategory);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ImportMode>((initialCategory === "gym" ? hasExistingGym : hasExistingStudies) ? "merge" : "replace");
  const [applyError, setApplyError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const hasExisting = category === "gym" ? hasExistingGym : hasExistingStudies;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setApplyError(null);
    setParsed(null);
    const parser = category === "gym" ? parseGymCSV(file) : parseRoadmapCSV(file);
    parser
      .then((result) => {
        if (!active) return;
        setParsed(category === "gym"
          ? { category: "gym", result: result as ParsedGymCSV }
          : { category: "studies", result: result as ParsedRoadmapCSV });
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "The CSV could not be imported."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [file, category]);

  useEffect(() => {
    setMode(hasExisting ? "merge" : "replace");
  }, [category, hasExisting]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const applyImport = () => {
    if (!parsed) return;
    const payload: RoadmapImportPayload = parsed.category === "gym"
      ? { category: "gym", filename: parsed.result.filename, tasks: parsed.result.tasks }
      : { category: "studies", filename: parsed.result.filename, roadmap: parsed.result.phases };
    setApplyError(onImport(payload, mode));
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div className="modal roadmap-import-modal" role="dialog" aria-modal="true" aria-labelledby="import-roadmap-title">
        <div className="modal-header">
          <div><span className="eyebrow">Category-aware CSV importer</span><div className="import-title-row"><h2 id="import-roadmap-title">Preview import</h2>{parsed && !loading && <span className="validated-badge"><Check size={12} /> CSV validated</span>}</div></div>
          <button className="icon-button ghost" onClick={onCancel} aria-label="Close import"><X size={19} /></button>
        </div>

        {lockCategory ? (
          <div className="locked-import-category">{category === "gym" ? <Dumbbell size={16} /> : <GraduationCap size={16} />}<span><strong>{category === "gym" ? "Gym" : "Studies"}</strong><small>Format selected from the goal category</small></span><Check size={14} /></div>
        ) : <div className="import-category-selector" aria-label="CSV category">
          <button type="button" className={category === "studies" ? "active" : ""} onClick={() => setCategory("studies")}><GraduationCap size={16} /><span><strong>Studies</strong><small>Phases and topics</small></span></button>
          <button type="button" className={category === "gym" ? "active" : ""} onClick={() => setCategory("gym")}><Dumbbell size={16} /><span><strong>Gym</strong><small>Sequential workouts</small></span></button>
        </div>}
        <p className="expected-columns mono">Expected: {category === "gym" ? "task_order, workout_name, description" : "phase_order, title, subtitle_order, subtitle, description"}</p>

        <button type="button" className="selected-file" onClick={() => fileInput.current?.click()}>
          <FileSpreadsheet size={21} /><span><strong>{file.name}</strong><small>Choose a different CSV</small></span><Upload size={16} />
        </button>
        <input ref={fileInput} className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => { const next = event.target.files?.[0]; if (next) setFile(next); event.target.value = ""; }} />

        {loading && <div className="import-state"><LoaderCircle className="spinner" size={24} /><p>Parsing and validating {category === "gym" ? "workouts" : "study roadmap"}…</p></div>}
        {!loading && error && <div className="import-error" role="alert"><AlertCircle size={19} /><div><strong>Couldn’t validate this {category === "gym" ? "Gym" : "Studies"} CSV</strong><p>{error}</p></div></div>}
        {applyError && <div className="import-error" role="alert"><AlertCircle size={19} /><div><strong>Import was not saved</strong><p>{applyError}</p></div></div>}

        {!loading && parsed?.category === "studies" && (
          <>
            <div className="import-summary">
              <div><strong className="mono">{parsed.result.phases.length}</strong><span>{parsed.result.phases.length === 1 ? "phase" : "phases"} found</span></div>
              <div><strong className="mono">{parsed.result.topicCount}</strong><span>{parsed.result.topicCount === 1 ? "topic" : "topics"} found</span></div>
            </div>
            <div className="import-preview" aria-label="Studies import preview">
              {parsed.result.phases.map((phase) => <div key={phase.title.toLocaleLowerCase()}><span className="mono">{phase.phaseOrder}</span><strong>{phase.title}</strong><small className="mono">{phase.topics.length} {phase.topics.length === 1 ? "topic" : "topics"}</small></div>)}
            </div>
          </>
        )}

        {!loading && parsed?.category === "gym" && (
          <>
            <div className="import-summary gym-import-summary"><div><strong className="mono">{parsed.result.tasks.length}</strong><span>{parsed.result.tasks.length === 1 ? "workout" : "workouts"} found</span></div></div>
            <div className="import-preview gym-import-preview" aria-label="Gym import preview">
              {parsed.result.tasks.map((task) => <div key={task.taskOrder}><span className="mono">{task.taskOrder}</span><strong>{task.workoutName}</strong><small>{task.description || "No description"}</small></div>)}
            </div>
          </>
        )}

        {!loading && parsed && hasExisting && (
          <fieldset className="import-mode">
            <legend>How should this import be applied?</legend>
            <label className={mode === "replace" ? "active" : ""}><input type="radio" name="import-mode" value="replace" checked={mode === "replace"} onChange={() => setMode("replace")} /><span><strong>Replace Existing {category === "gym" ? "Workout Plan" : "Study Roadmap"}</strong><small>Use this CSV definition while preserving progress for matching items.</small></span></label>
            <label className={mode === "merge" ? "active" : ""}><input type="radio" name="import-mode" value="merge" checked={mode === "merge"} onChange={() => setMode("merge")} /><span><strong>Merge With Existing</strong><small>Add or update items without duplicates while preserving statuses and comments.</small></span></label>
          </fieldset>
        )}

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>Cancel Import</button>
          <button type="button" className="primary-button" disabled={!parsed || loading} onClick={applyImport}><Upload size={16} /> Import to {category === "gym" ? "Gym" : "Studies"}</button>
        </div>
      </div>
    </div>
  );
}
