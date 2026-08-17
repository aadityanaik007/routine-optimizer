import Papa from "papaparse";
import type { GymWorkoutDefinition } from "../types";
import { RoadmapCSVError } from "./roadmapCsv";

export const GYM_COLUMNS = ["task_order", "workout_name", "description"] as const;

interface RawGymRow {
  task_order?: string;
  workout_name?: string;
  description?: string;
  [key: string]: string | undefined;
}

export interface ParsedGymCSV {
  filename: string;
  tasks: GymWorkoutDefinition[];
}

const clean = (value: unknown) => String(value ?? "").trim();

export function validateGymRows(rows: RawGymRow[], fields: string[]): void {
  const missing = GYM_COLUMNS.filter((column) => !fields.includes(column));
  if (missing.length) throw new RoadmapCSVError(`Missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`);
  if (!rows.length) throw new RoadmapCSVError("This CSV does not contain any workout rows.");
  const orders = new Set<number>();
  rows.forEach((row, index) => {
    const context = `Row ${index + 2}`;
    const order = Number(clean(row.task_order));
    const name = clean(row.workout_name);
    const description = clean(row.description);
    if (!Number.isInteger(order) || order < 1) throw new RoadmapCSVError(`${context}: task_order must be a whole number greater than 0.`);
    if (orders.has(order)) throw new RoadmapCSVError(`${context}: task_order ${order} is duplicated.`);
    if (!name) throw new RoadmapCSVError(`${context}: workout_name cannot be empty.`);
    if (name.length > 160) throw new RoadmapCSVError(`${context}: workout_name must be 160 characters or fewer.`);
    if (/[\r\n\t]/.test(name)) throw new RoadmapCSVError(`${context}: workout_name cannot contain line breaks or tabs.`);
    if (description.length > 5000) throw new RoadmapCSVError(`${context}: description must be 5000 characters or fewer.`);
    orders.add(order);
  });
}

export function normalizeGymRows(rows: RawGymRow[]): GymWorkoutDefinition[] {
  return rows.map((row) => ({
    taskOrder: Number(clean(row.task_order)),
    workoutName: clean(row.workout_name),
    description: clean(row.description),
  })).sort((a, b) => a.taskOrder - b.taskOrder);
}

export function validateGymRoadmap(tasks: GymWorkoutDefinition[]): void {
  validateGymRows(tasks.map((task) => ({
    task_order: String(task.taskOrder),
    workout_name: task.workoutName,
    description: task.description,
  })), [...GYM_COLUMNS]);
}

export function mergeGymRoadmaps(existing: GymWorkoutDefinition[], imported: GymWorkoutDefinition[]): GymWorkoutDefinition[] {
  const byOrder = new Map(existing.map((task) => [task.taskOrder, { ...task }]));
  imported.forEach((task) => byOrder.set(task.taskOrder, { ...task }));
  const merged = [...byOrder.values()].sort((a, b) => a.taskOrder - b.taskOrder);
  validateGymRoadmap(merged);
  return merged;
}

export function parseGymCSV(file: File): Promise<ParsedGymCSV> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawGymRow>(file, {
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
          const rows = results.data.filter((row) => Object.values(row).some((value) => clean(value) !== ""));
          validateGymRows(rows, results.meta.fields ?? []);
          resolve({ filename: file.name, tasks: normalizeGymRows(rows) });
        } catch (error) {
          reject(error instanceof Error ? error : new RoadmapCSVError("The Gym CSV could not be imported."));
        }
      },
      error: (error) => reject(new RoadmapCSVError(error.message || "The Gym CSV could not be read.")),
    });
  });
}
