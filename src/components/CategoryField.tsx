import { useState } from "react";
import { Plus } from "lucide-react";
import type { Category } from "../types";

interface CategoryFieldProps {
  categories: Category[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
  onCreate: (label: string) => Category;
  label?: string;
  compact?: boolean;
}

export function CategoryField({ categories, value, onChange, onCreate, label, compact = false }: CategoryFieldProps) {
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const addCategory = () => {
    const clean = newLabel.trim();
    if (!clean) return;
    const category = onCreate(clean);
    onChange(category.id);
    setNewLabel("");
    setCreating(false);
  };

  return (
    <div className={`category-field ${compact ? "compact" : ""}`}>
      {label && <label className="field-label">{label}</label>}
      <select
        value={creating ? "__new" : value ?? ""}
        aria-label={label ?? "Category"}
        onChange={(event) => {
          if (event.target.value === "__new") setCreating(true);
          else { setCreating(false); onChange(event.target.value || null); }
        }}
      >
        <option value="">Uncategorized</option>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
        <option value="__new">＋ New category…</option>
      </select>
      {creating && (
        <div className="inline-create">
          <input
            autoFocus
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); addCategory(); }
              if (event.key === "Escape") { setCreating(false); setNewLabel(""); }
            }}
            placeholder="Category name"
            aria-label="New category name"
          />
          <button type="button" className="icon-button" onClick={addCategory} disabled={!newLabel.trim()} aria-label="Add category">
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
