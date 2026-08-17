import { useEffect, useRef, useState } from "react";
import { FileQuestion, FileUp, X } from "lucide-react";
import type { Category } from "../types";
import { CategoryField } from "./CategoryField";
import type { ImportCategory } from "./RoadmapImportModal";

interface NewGoalModalProps {
  categories: Category[];
  onCreateCategory: (label: string) => Category;
  onClose: () => void;
  onCreate: (title: string, description: string, categoryId: string | null, csvFile: File | null) => void;
  onShowCsvGuide: (category: ImportCategory) => void;
}

export function NewGoalModal({ categories, onCreateCategory, onClose, onCreate, onShowCsvGuide }: NewGoalModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const categoryLabel = categories.find((category) => category.id === categoryId)?.label.toLocaleLowerCase();
  const importCategory: ImportCategory | null = categoryLabel === "gym" ? "gym" : categoryLabel === "studies" ? "studies" : null;

  useEffect(() => {
    titleRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    onCreate(clean, description.trim(), categoryId, csvFile);
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-goal-title">
        <div className="modal-header"><div><span className="eyebrow">Start small, grow steadily</span><h2 id="new-goal-title">Create a new goal</h2></div><button className="icon-button ghost" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
        <form onSubmit={submit} className="form-stack">
          <div><label className="field-label" htmlFor="goal-title">Title <span aria-hidden="true">*</span></label><input ref={titleRef} id="goal-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Run my first 10K" required maxLength={120} /></div>
          <div><label className="field-label" htmlFor="goal-description">Description <span className="optional">Optional</span></label><textarea id="goal-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why does this matter to you?" rows={4} /></div>
          <CategoryField label="Category" categories={categories} value={categoryId} onChange={(nextCategoryId) => { setCategoryId(nextCategoryId); setCsvFile(null); }} onCreate={onCreateCategory} />
          <div className={`goal-csv-field ${importCategory ? "supported" : ""}`}>
            <div><span className="field-label">CSV import <span className="optional">Optional</span></span>{importCategory ? <small className="mono">{importCategory === "gym" ? "task_order, workout_name, description" : "phase_order, title, subtitle_order, subtitle, description"}</small> : <small>Select Studies or Gym to import a category-specific CSV.</small>}</div>
            <div className="goal-csv-actions">
              {importCategory && <button type="button" className="text-button" onClick={() => onShowCsvGuide(importCategory)}><FileQuestion size={14} /> Format</button>}
              <button type="button" className="secondary-button" disabled={!importCategory} onClick={() => csvInputRef.current?.click()}><FileUp size={15} />{csvFile ? csvFile.name : "Choose CSV"}</button>
              <input ref={csvInputRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => { setCsvFile(event.target.files?.[0] ?? null); event.target.value = ""; }} />
            </div>
          </div>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={!title.trim()}>Create goal</button></div>
        </form>
      </div>
    </div>
  );
}
