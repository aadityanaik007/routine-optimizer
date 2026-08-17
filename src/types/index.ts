export type Status = "todo" | "in_progress" | "completed" | "cancelled";

export interface Category {
  id: string;
  label: string;
  color: string;
}

export interface Subtask {
  id: string;
  title: string;
  description: string;
  status: Status;
  createdAt: string;
  completedAt: string | null;
  roadmapPhaseTitle?: string;
  roadmapPhaseOrder?: number;
  roadmapTopicOrder?: number;
  gymTaskOrder?: number;
  comment?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  status: Status;
  categoryId: string | null;
  createdAt: string;
  completedAt: string | null;
  subtasks: Subtask[];
  roadmapPhaseKey?: string;
  roadmapRoot?: boolean;
  roadmapKind?: "studies" | "gym";
  studyRoadmapDefinition?: RoadmapPhase[];
  gymRoadmapDefinition?: GymWorkoutDefinition[];
  gymWorkoutOptions?: GymWorkoutOption[];
  scheduledGymWorkouts?: ScheduledGymWorkout[];
  gymCalendarMigrated?: boolean;
}

export interface GymWorkoutDefinition {
  taskOrder: number;
  workoutName: string;
  description: string;
}

export interface GymWorkoutOption {
  id: string;
  name: string;
  description: string;
  order: number;
  archived?: boolean;
}

export interface ScheduledGymWorkout {
  id: string;
  workoutId: string;
  scheduledDate: string;
  status: "todo" | "completed";
  comment: string;
  createdAt: string;
  completedAt: string | null;
}

export interface RoadmapTopic {
  order: number;
  subtitle: string;
  description: string;
}

export interface RoadmapPhase {
  phaseOrder: number;
  title: string;
  topics: RoadmapTopic[];
}

export interface AppData {
  goals: Goal[];
  categories: Category[];
  theme: "light" | "dark";
  roadmap: RoadmapPhase[];
  gymRoadmap: GymWorkoutDefinition[];
}

export type View = "board" | "goal" | "reports";

export const STATUS_LABELS: Record<Status, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const STATUS_ORDER: Status[] = ["todo", "in_progress", "completed", "cancelled"];
