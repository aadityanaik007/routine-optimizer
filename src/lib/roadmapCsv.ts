import Papa from "papaparse";
import type { RoadmapPhase, RoadmapTopic } from "../types";

export const ROADMAP_COLUMNS = ["phase_order", "title", "subtitle_order", "subtitle", "description"] as const;

export interface RawRoadmapRow {
  phase_order?: string;
  title?: string;
  subtitle_order?: string;
  subtitle?: string;
  description?: string;
  [key: string]: string | undefined;
}

export interface NormalizedRoadmapRow {
  phaseOrder: number;
  title: string;
  order: number;
  subtitle: string;
  description: string;
}

export interface ParsedRoadmapCSV {
  filename: string;
  phases: RoadmapPhase[];
  topicCount: number;
}

export class RoadmapCSVError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoadmapCSVError";
  }
}

const clean = (value: unknown) => String(value ?? "").trim();
const keyFor = (value: string) => value.trim().toLocaleLowerCase();

const TITLE_MAX_LENGTH = 120;
const SUBTITLE_MAX_LENGTH = 160;
const DESCRIPTION_MAX_LENGTH = 5000;

function validateOrder(value: number, field: string, context: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RoadmapCSVError(`${context}: ${field} must be a whole number greater than 0.`);
  }
}

function validateLabel(value: string, field: string, maxLength: number, context: string): void {
  if (!value) throw new RoadmapCSVError(`${context}: ${field} cannot be empty.`);
  if (value.length > maxLength) throw new RoadmapCSVError(`${context}: ${field} must be ${maxLength} characters or fewer.`);
  if (/[\r\n\t]/.test(value)) throw new RoadmapCSVError(`${context}: ${field} cannot contain line breaks or tabs.`);
}

export function validateRoadmapRows(rows: RawRoadmapRow[], fields: string[]): void {
  const missing = ROADMAP_COLUMNS.filter((column) => !fields.includes(column));
  if (missing.length) {
    throw new RoadmapCSVError(`Missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`);
  }
  if (!rows.length) throw new RoadmapCSVError("This CSV does not contain any roadmap rows.");

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const context = `Row ${rowNumber}`;
    const phaseOrder = Number(clean(row.phase_order));
    const topicOrder = Number(clean(row.subtitle_order));
    validateLabel(clean(row.title), "title", TITLE_MAX_LENGTH, context);
    validateLabel(clean(row.subtitle), "subtitle", SUBTITLE_MAX_LENGTH, context);
    validateOrder(phaseOrder, "phase_order", context);
    validateOrder(topicOrder, "subtitle_order", context);
    if (clean(row.description).length > DESCRIPTION_MAX_LENGTH) {
      throw new RoadmapCSVError(`${context}: description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`);
    }
  });

  const ordersByTitle = new Map<string, number>();
  rows.forEach((row, index) => {
    const title = clean(row.title);
    const phaseOrder = Number(clean(row.phase_order));
    const existingOrder = ordersByTitle.get(keyFor(title));
    if (existingOrder !== undefined && existingOrder !== phaseOrder) {
      throw new RoadmapCSVError(`Row ${index + 2}: “${title}” uses conflicting phase_order values (${existingOrder} and ${phaseOrder}).`);
    }
    ordersByTitle.set(keyFor(title), phaseOrder);
  });
}

export function validateRoadmapData(roadmap: RoadmapPhase[]): void {
  const phaseTitles = new Set<string>();
  roadmap.forEach((phase, phaseIndex) => {
    const context = `Phase ${phaseIndex + 1}`;
    validateLabel(clean(phase.title), "title", TITLE_MAX_LENGTH, context);
    validateOrder(phase.phaseOrder, "phaseOrder", context);
    const phaseKey = keyFor(phase.title);
    if (phaseTitles.has(phaseKey)) throw new RoadmapCSVError(`${context}: duplicate title “${phase.title}”.`);
    phaseTitles.add(phaseKey);

    const topicTitles = new Set<string>();
    phase.topics.forEach((topic, topicIndex) => {
      const topicContext = `${context}, topic ${topicIndex + 1}`;
      validateLabel(clean(topic.subtitle), "subtitle", SUBTITLE_MAX_LENGTH, topicContext);
      validateOrder(topic.order, "order", topicContext);
      if (clean(topic.description).length > DESCRIPTION_MAX_LENGTH) {
        throw new RoadmapCSVError(`${topicContext}: description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`);
      }
      const topicKey = keyFor(topic.subtitle);
      if (topicTitles.has(topicKey)) throw new RoadmapCSVError(`${topicContext}: duplicate subtitle “${topic.subtitle}”.`);
      topicTitles.add(topicKey);
    });
  });
}

export function normalizeRoadmapRows(rows: RawRoadmapRow[]): NormalizedRoadmapRow[] {
  return rows.map((row) => ({
    phaseOrder: Number(clean(row.phase_order)),
    title: clean(row.title),
    order: Number(clean(row.subtitle_order)),
    subtitle: clean(row.subtitle),
    description: clean(row.description),
  }));
}

export function groupRoadmapByPhase(rows: NormalizedRoadmapRow[]): RoadmapPhase[] {
  const phases = new Map<string, RoadmapPhase>();

  for (const row of rows) {
    const phaseKey = keyFor(row.title);
    const phase = phases.get(phaseKey) ?? { phaseOrder: row.phaseOrder, title: row.title, topics: [] };
    phase.phaseOrder = row.phaseOrder;
    phase.title = row.title;

    const topicKey = keyFor(row.subtitle);
    const existingTopicIndex = phase.topics.findIndex((topic) => keyFor(topic.subtitle) === topicKey);
    const topic: RoadmapTopic = { order: row.order, subtitle: row.subtitle, description: row.description };
    if (existingTopicIndex >= 0) phase.topics[existingTopicIndex] = topic;
    else phase.topics.push(topic);
    phases.set(phaseKey, phase);
  }

  return [...phases.values()]
    .map((phase) => ({ ...phase, topics: [...phase.topics].sort((a, b) => a.order - b.order || a.subtitle.localeCompare(b.subtitle)) }))
    .sort((a, b) => a.phaseOrder - b.phaseOrder || a.title.localeCompare(b.title));
}

export function mergeRoadmaps(existingRoadmap: RoadmapPhase[], importedRoadmap: RoadmapPhase[]): RoadmapPhase[] {
  const merged = existingRoadmap.map((phase) => ({ ...phase, topics: phase.topics.map((topic) => ({ ...topic })) }));

  for (const importedPhase of importedRoadmap) {
    const phaseIndex = merged.findIndex((phase) => keyFor(phase.title) === keyFor(importedPhase.title));
    if (phaseIndex < 0) {
      merged.push({ ...importedPhase, topics: importedPhase.topics.map((topic) => ({ ...topic })) });
      continue;
    }

    const current = merged[phaseIndex];
    const topics = current.topics.map((topic) => ({ ...topic }));
    for (const importedTopic of importedPhase.topics) {
      const topicIndex = topics.findIndex((topic) => keyFor(topic.subtitle) === keyFor(importedTopic.subtitle));
      if (topicIndex >= 0) topics[topicIndex] = { ...importedTopic };
      else topics.push({ ...importedTopic });
    }
    merged[phaseIndex] = {
      phaseOrder: importedPhase.phaseOrder,
      title: importedPhase.title,
      topics: topics.sort((a, b) => a.order - b.order || a.subtitle.localeCompare(b.subtitle)),
    };
  }

  return merged.sort((a, b) => a.phaseOrder - b.phaseOrder || a.title.localeCompare(b.title));
}

export function parseRoadmapCSV(file: File): Promise<ParsedRoadmapCSV> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawRoadmapRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.replace(/^\uFEFF/, "").trim(),
      complete: (results) => {
        try {
          const seriousErrors = results.errors.filter((error) => error.code !== "TooFewFields");
          if (seriousErrors.length) {
            const first = seriousErrors[0];
            throw new RoadmapCSVError(`CSV parsing failed${typeof first.row === "number" ? ` near row ${first.row + 2}` : ""}: ${first.message}`);
          }
          const fields = results.meta.fields ?? [];
          const rows = results.data.filter((row) => Object.values(row).some((value) => clean(value) !== ""));
          validateRoadmapRows(rows, fields);
          const phases = groupRoadmapByPhase(normalizeRoadmapRows(rows));
          validateRoadmapData(phases);
          resolve({ filename: file.name, phases, topicCount: phases.reduce((sum, phase) => sum + phase.topics.length, 0) });
        } catch (error) {
          reject(error instanceof Error ? error : new RoadmapCSVError("The CSV could not be imported."));
        }
      },
      error: (error) => reject(new RoadmapCSVError(error.message || "The CSV file could not be read.")),
    });
  });
}
