import type { Goal, GymWorkoutDefinition, GymWorkoutOption, ScheduledGymWorkout } from "../types";

type ImportMode = "replace" | "merge";

const GOAL_TITLE = "Workout Plan";
const keyFor = (value: string) => value.trim().toLocaleLowerCase();

function uniqueDefinitions(definitions: GymWorkoutDefinition[]): GymWorkoutDefinition[] {
  const options = new Map<string, GymWorkoutDefinition>();
  definitions.forEach((definition) => {
    const key = keyFor(definition.workoutName);
    const existing = options.get(key);
    if (!existing) options.set(key, { ...definition });
    else if (!existing.description && definition.description) existing.description = definition.description;
  });
  return [...options.values()].sort((a, b) => a.taskOrder - b.taskOrder);
}

function toDateKey(iso: string): string {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function migrateExistingGymState(goal: Goal, now: string, makeId: () => string) {
  const options = (goal.gymWorkoutOptions ?? []).map((option) => ({ ...option }));
  const schedules = (goal.scheduledGymWorkouts ?? []).map((schedule) => ({ ...schedule }));
  const legacyTasks = goal.subtasks.filter((task) => task.gymTaskOrder !== undefined);

  legacyTasks.forEach((task) => {
    let option = options.find((item) => keyFor(item.name) === keyFor(task.title));
    if (!option) {
      option = { id: makeId(), name: task.title, description: task.description, order: task.gymTaskOrder ?? options.length + 1 };
      options.push(option);
    }
    if (task.status === "completed" && task.completedAt && !schedules.some((schedule) => schedule.id === `legacy-${task.id}`)) {
      schedules.push({
        id: `legacy-${task.id}`,
        workoutId: option.id,
        scheduledDate: toDateKey(task.completedAt),
        status: "completed",
        comment: task.comment ?? "",
        createdAt: task.createdAt || now,
        completedAt: task.completedAt,
      });
    }
  });
  return { options, schedules };
}

export function mapGymRoadmapToGoal(
  existingGoals: Goal[],
  targetGoalId: string,
  roadmap: GymWorkoutDefinition[],
  mode: ImportMode,
  now = new Date().toISOString(),
  makeId: () => string = () => crypto.randomUUID(),
): Goal[] {
  return existingGoals.map((goal) => {
    if (goal.id !== targetGoalId) return goal;
    const migrated = migrateExistingGymState(goal, now, makeId);
    const importedDefinitions = uniqueDefinitions(roadmap);
    const importedKeys = new Set(importedDefinitions.map((item) => keyFor(item.workoutName)));
    const importedOptions = importedDefinitions.map((definition): GymWorkoutOption => {
      const existing = migrated.options.find((option) => keyFor(option.name) === keyFor(definition.workoutName));
      return {
        id: existing?.id ?? makeId(),
        name: definition.workoutName,
        description: definition.description,
        order: definition.taskOrder,
        archived: false,
      };
    });
    const referencedOptionIds = new Set(migrated.schedules.map((schedule) => schedule.workoutId));
    const retainedOptions = migrated.options.filter((option) => (
      !importedKeys.has(keyFor(option.name))
      && (mode === "merge" || referencedOptionIds.has(option.id))
    )).map((option) => mode === "replace" ? { ...option, archived: true } : option);
    const options = [...importedOptions, ...retainedOptions].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    const manualTasks = goal.subtasks.filter((task) => task.gymTaskOrder === undefined && !task.roadmapPhaseTitle);
    return {
      ...goal,
      roadmapRoot: false,
      roadmapKind: "gym",
      studyRoadmapDefinition: undefined,
      gymRoadmapDefinition: roadmap,
      gymWorkoutOptions: options,
      scheduledGymWorkouts: migrated.schedules,
      gymCalendarMigrated: true,
      subtasks: manualTasks,
    };
  });
}

export function mapGymToBoard(
  existingGoals: Goal[],
  importedTasks: GymWorkoutDefinition[],
  mode: ImportMode,
  categoryId: string | null,
  now = new Date().toISOString(),
  makeId: () => string = () => crypto.randomUUID(),
): Goal[] {
  const existingGoal = existingGoals.find((goal) => goal.roadmapKind === "gym")
    ?? existingGoals.find((goal) => goal.title.trim().toLocaleLowerCase() === GOAL_TITLE.toLocaleLowerCase() && goal.categoryId === categoryId);
  const target: Goal = existingGoal ?? {
    id: makeId(),
    title: GOAL_TITLE,
    description: "Reusable workout options and calendar schedule",
    status: "todo",
    categoryId,
    createdAt: now,
    completedAt: null,
    roadmapKind: "gym",
    gymCalendarMigrated: true,
    subtasks: [],
  };
  const withTarget = existingGoal ? existingGoals : [target, ...existingGoals];
  return mapGymRoadmapToGoal(withTarget, target.id, importedTasks, mode, now, makeId)
    .map((goal) => goal.id === target.id ? { ...goal, categoryId: categoryId ?? goal.categoryId } : goal);
}
