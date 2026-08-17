import { useEffect, useState } from "react";
import { Check, Clipboard, Download, Dumbbell, GraduationCap, X } from "lucide-react";
import type { ImportCategory } from "./RoadmapImportModal";

export const EXAMPLE_STUDIES_CSV = `phase_order,title,subtitle_order,subtitle,description
1,Core Syntax,1,Variables and Data Types,"Learn int, double, char, bool, string, const, and auto."
1,Core Syntax,2,Input and Output,"Use cin, cout, cerr, and basic stream formatting."
2,References and Pointers,1,Memory Addresses,"Understand the address-of operator & and how variables occupy memory."
2,References and Pointers,2,Pointers,"Declare pointers and store addresses."`;

export const EXAMPLE_GYM_CSV = `task_order,workout_name,description
1,Legs,"Leg-focused workout including quads, hamstrings, glutes, and calves."
2,Chest and Shoulders,"Train chest and shoulders."
3,Back and Biceps,"Train back and biceps."
4,Legs,"Second leg session of the cycle."
5,Chest and Triceps,"Train chest and triceps."
6,Back and Shoulders,"Train back and shoulders."`;

export const CLAUDE_STUDIES_PROMPT = `Create a study roadmap as a valid CSV using exactly these columns in this order:
phase_order,title,subtitle_order,subtitle,description

Rules:
- Output only the CSV, with one row per topic.
- Each unique title becomes a phase and each subtitle becomes a topic.
- phase_order and subtitle_order must be whole numbers greater than 0.
- Use the same title and phase_order for every topic in a phase.
- Put descriptions in double quotes and escape double quotes correctly.
- Do not add blank rows, Markdown, commentary, or additional columns.
- Order content from beginner to advanced.

Build the roadmap for this subject:
[PASTE YOUR SUBJECT OR LEARNING GOAL HERE]`;

export const CLAUDE_GYM_PROMPT = `Create a workout roadmap as a valid CSV using exactly these columns in this order:
task_order,workout_name,description

Rules:
- Output only the CSV.
- One row represents one complete workout session.
- task_order must be a whole number greater than 0.
- Order workouts in the sequence they should be performed.
- workout_name should be concise, such as Legs, Chest and Shoulders, or Back and Biceps.
- description should contain a short summary of what the workout focuses on.
- Do not list individual exercises, subcategories, sets, reps, or exercise-level details.
- Put descriptions in double quotes and escape double quotes correctly.
- Do not include blank rows, Markdown, or commentary.

Build a workout sequence for:
[PASTE YOUR TRAINING GOAL OR SCHEDULE HERE]`;

interface RoadmapCsvGuideProps {
  initialCategory: ImportCategory;
  onClose: () => void;
}

export function RoadmapCsvGuide({ initialCategory, onClose }: RoadmapCsvGuideProps) {
  const [category, setCategory] = useState<ImportCategory>(initialCategory);
  const [copied, setCopied] = useState<"prompt" | "csv" | null>(null);
  const example = category === "gym" ? EXAMPLE_GYM_CSV : EXAMPLE_STUDIES_CSV;
  const prompt = category === "gym" ? CLAUDE_GYM_PROMPT : CLAUDE_STUDIES_PROMPT;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const copyText = async (value: string, target: "prompt" | "csv") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(target);
      window.setTimeout(() => setCopied((current) => current === target ? null : current), 2000);
    } catch { setCopied(null); }
  };

  const downloadExample = () => {
    const url = URL.createObjectURL(new Blob([example], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${category}-roadmap-example.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal csv-guide-modal" role="dialog" aria-modal="true" aria-labelledby="csv-guide-title">
        <div className="modal-header">
          <div><span className="eyebrow">Import reference</span><h2 id="csv-guide-title">CSV format guide</h2></div>
          <button className="icon-button ghost" onClick={onClose} aria-label="Close format guide"><X size={19} /></button>
        </div>

        <div className="import-category-selector guide-category-selector">
          <button className={category === "studies" ? "active" : ""} onClick={() => setCategory("studies")}><GraduationCap size={16} /><span><strong>Studies</strong><small>Phases and topics</small></span></button>
          <button className={category === "gym" ? "active" : ""} onClick={() => setCategory("gym")}><Dumbbell size={16} /><span><strong>Gym</strong><small>Complete workouts</small></span></button>
        </div>
        <p className="guide-intro">{category === "gym" ? "Each CSV row becomes one complete, sequential workout task. There are no exercise lists or nested workout categories." : "Study CSVs keep the existing phase-and-topic hierarchy, with each topic retaining its description."}</p>

        <section className="guide-section">
          <div className="guide-section-heading"><div><span className="mono guide-step">01</span><h3>{category === "gym" ? "Gym example CSV" : "Studies example CSV"}</h3></div><div className="guide-actions"><button type="button" className="mini-button" onClick={() => copyText(example, "csv")}>{copied === "csv" ? <Check size={14} /> : <Clipboard size={14} />}{copied === "csv" ? "Copied" : "Copy CSV"}</button><button type="button" className="mini-button" onClick={downloadExample}><Download size={14} /> Download</button></div></div>
          <pre className="csv-code"><code>{example}</code></pre>
        </section>

        <section className="guide-section claude-section">
          <div className="guide-section-heading"><div><span className="mono guide-step">02</span><h3>Generate with Claude</h3></div><button type="button" className="primary-button copy-prompt" onClick={() => copyText(prompt, "prompt")}>{copied === "prompt" ? <Check size={15} /> : <Clipboard size={15} />}{copied === "prompt" ? "Prompt copied" : "Copy Claude prompt"}</button></div>
          <pre className="prompt-code"><code>{prompt}</code></pre>
        </section>

        <div className="format-rules"><strong>Validated before import</strong><span>{category === "gym" ? "Workout names are required and task orders must be unique positive whole numbers." : "Titles and subtitles are required, and both order fields must be positive whole numbers."}</span></div>
      </div>
    </div>
  );
}
