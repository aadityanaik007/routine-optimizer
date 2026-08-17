import type { AppData, Category } from "../types";
import { mapRoadmapToBoard } from "./roadmapBoard";
import { mapGymRoadmapToGoal, mapGymToBoard } from "./gymBoard";

const DB_NAME = "rings-growth-log";
const STORE_NAME = "app";
const DATA_KEY = "data";

export const CATEGORY_COLORS = [
  "#C1562F", "#3B5BA5", "#A0459A", "#2F6F6E", "#5C7A3E",
  "#6B5B95", "#8A6D3B", "#B4436C", "#4B7BA6", "#7A5C3E",
];

const DEFAULT_CATEGORY_NAMES = [
  "Gym", "Studies", "Socialize", "Career", "Health", "Mindfulness", "Finance", "Hobbies",
];

function defaultCategories(): Category[] {
  return DEFAULT_CATEGORY_NAMES.map((label, index) => ({
    id: `category-${label.toLowerCase()}`,
    label,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }));
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local storage"));
  });
}

export async function getAppData(): Promise<AppData> {
  const database = await openDatabase();
  const stored = await new Promise<AppData | undefined>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(DATA_KEY);
    request.onsuccess = () => resolve(request.result as AppData | undefined);
    request.onerror = () => reject(request.error);
  });
  database.close();

  if (stored) {
    let migrated: AppData = { ...stored, roadmap: stored.roadmap ?? [], gymRoadmap: stored.gymRoadmap ?? [] };
    let changed = !stored.roadmap || !stored.gymRoadmap;
    if (migrated.categories.length === 0) {
      migrated = { ...migrated, categories: defaultCategories() };
      changed = true;
    }
    const roadmapRoot = migrated.goals.find((goal) => goal.roadmapKind === "studies" || goal.roadmapRoot);
    const hasLegacyPhaseGoals = migrated.goals.some((goal) => Boolean(goal.roadmapPhaseKey));
    const studiesCategoryId = migrated.categories.find((category) => category.label.toLocaleLowerCase() === "studies")?.id ?? null;
    const studyMetadataNeedsUpdate = Boolean(roadmapRoot && (roadmapRoot.roadmapKind !== "studies" || roadmapRoot.categoryId !== studiesCategoryId || !roadmapRoot.studyRoadmapDefinition));
    const roadmapNeedsBoardMapping = migrated.roadmap.length > 0 && (
      !roadmapRoot
      || hasLegacyPhaseGoals
      || studyMetadataNeedsUpdate
      || migrated.roadmap.some((phase) => phase.topics.some((topic) => !roadmapRoot.subtasks.some((subtask) => (
        subtask.roadmapPhaseTitle?.trim().toLocaleLowerCase() === phase.title.trim().toLocaleLowerCase()
        && subtask.title.trim().toLocaleLowerCase() === topic.subtitle.trim().toLocaleLowerCase()
      ))))
    );
    if (roadmapNeedsBoardMapping) {
      migrated = { ...migrated, goals: mapRoadmapToBoard(migrated.goals, migrated.roadmap, "merge", studiesCategoryId) };
      changed = true;
    }
    const gymGoal = migrated.goals.find((goal) => goal.roadmapKind === "gym");
    const gymNeedsBoardMapping = migrated.gymRoadmap.length > 0 && (
      !gymGoal
      || !gymGoal.gymRoadmapDefinition
      || migrated.gymRoadmap.some((task) => !gymGoal.subtasks.some((subtask) => subtask.gymTaskOrder === task.taskOrder))
    );
    if (gymNeedsBoardMapping) {
      const gymCategoryId = migrated.categories.find((category) => category.label.toLocaleLowerCase() === "gym")?.id ?? null;
      migrated = { ...migrated, goals: mapGymToBoard(migrated.goals, migrated.gymRoadmap, "merge", gymCategoryId) };
      changed = true;
    }
    for (const goal of [...migrated.goals]) {
      if (goal.roadmapKind !== "gym" || goal.gymCalendarMigrated) continue;
      const definition = goal.gymRoadmapDefinition ?? goal.subtasks.filter((task) => task.gymTaskOrder !== undefined).map((task) => ({ taskOrder: task.gymTaskOrder!, workoutName: task.title, description: task.description }));
      migrated = { ...migrated, goals: mapGymRoadmapToGoal(migrated.goals, goal.id, definition, "merge") };
      changed = true;
    }
    if (migrated.roadmap.length > 0 && migrated.goals.some((goal) => goal.studyRoadmapDefinition?.length)) {
      migrated = { ...migrated, roadmap: [] };
      changed = true;
    }
    if (migrated.gymRoadmap.length > 0 && migrated.goals.some((goal) => goal.gymRoadmapDefinition?.length)) {
      migrated = { ...migrated, gymRoadmap: [] };
      changed = true;
    }
    if (changed) await saveAppData(migrated);
    return migrated;
  }

  const initial: AppData = { goals: [], categories: defaultCategories(), theme: "light", roadmap: [], gymRoadmap: [] };
  await saveAppData(initial);
  return initial;
}

export async function saveAppData(data: AppData): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(data, DATA_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Save was interrupted"));
  });
  database.close();
}
