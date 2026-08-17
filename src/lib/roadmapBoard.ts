import type { Goal, RoadmapPhase, Subtask } from "../types";

type ImportMode = "replace" | "merge";

const ROOT_TITLE = "C++ Roadmap";
const keyFor = (value: string) => value.trim().toLocaleLowerCase();

export function mapRoadmapToBoard(
  existingGoals: Goal[],
  importedRoadmap: RoadmapPhase[],
  mode: ImportMode,
  categoryId: string | null = null,
  now = new Date().toISOString(),
  makeId: () => string = () => crypto.randomUUID(),
): Goal[] {
  const existingRoot = existingGoals.find((goal) => goal.roadmapKind === "studies")
    ?? existingGoals.find((goal) => goal.roadmapRoot)
    ?? existingGoals.find((goal) => keyFor(goal.title) === keyFor(ROOT_TITLE) && !goal.roadmapPhaseKey);
  const legacyPhaseGoals = existingGoals.filter((goal) => Boolean(goal.roadmapPhaseKey));
  const existingRoadmapTopics = existingRoot?.subtasks.filter((subtask) => subtask.roadmapPhaseTitle) ?? [];
  const manualRootSubtasks = existingRoot?.subtasks.filter((subtask) => !subtask.roadmapPhaseTitle) ?? [];
  const matchedTopicIds = new Set<string>();

  const findExistingTopic = (phaseTitle: string, subtitle: string): Subtask | undefined => {
    const phaseKey = keyFor(phaseTitle);
    const topicKey = keyFor(subtitle);
    const current = existingRoadmapTopics.find((subtask) => (
      keyFor(subtask.roadmapPhaseTitle ?? "") === phaseKey && keyFor(subtask.title) === topicKey
    ));
    if (current) return current;
    return legacyPhaseGoals
      .find((goal) => goal.roadmapPhaseKey === phaseKey || keyFor(goal.title) === phaseKey)
      ?.subtasks.find((subtask) => keyFor(subtask.title) === topicKey);
  };

  const importedTopics = importedRoadmap.flatMap((phase) => phase.topics.map((topic): Subtask => {
    const existing = findExistingTopic(phase.title, topic.subtitle);
    if (existing) matchedTopicIds.add(existing.id);
    return {
      id: existing?.id ?? makeId(),
      title: topic.subtitle,
      description: topic.description,
      status: existing?.status ?? "todo",
      createdAt: existing?.createdAt ?? now,
      completedAt: existing?.completedAt ?? null,
      comment: existing?.comment ?? "",
      roadmapPhaseTitle: phase.title,
      roadmapPhaseOrder: phase.phaseOrder,
      roadmapTopicOrder: topic.order,
    };
  }));

  const retainedRoadmapTopics = mode === "merge"
    ? existingRoadmapTopics.filter((subtask) => !matchedTopicIds.has(subtask.id))
    : [];
  const allTopics = [...importedTopics, ...retainedRoadmapTopics].sort((a, b) => (
    (a.roadmapPhaseOrder ?? 0) - (b.roadmapPhaseOrder ?? 0)
    || (a.roadmapTopicOrder ?? 0) - (b.roadmapTopicOrder ?? 0)
    || a.title.localeCompare(b.title)
  ));

  const roadmapGoal: Goal = {
    id: existingRoot?.id ?? makeId(),
    title: ROOT_TITLE,
    description: existingRoot?.description || `${new Set(allTopics.map((topic) => keyFor(topic.roadmapPhaseTitle ?? ""))).size} phases · ${allTopics.length} topics`,
    status: existingRoot?.status ?? "todo",
    categoryId: categoryId ?? existingRoot?.categoryId ?? null,
    createdAt: existingRoot?.createdAt ?? now,
    completedAt: existingRoot?.completedAt ?? null,
    roadmapRoot: true,
    roadmapKind: "studies",
    studyRoadmapDefinition: importedRoadmap,
    subtasks: [...allTopics, ...manualRootSubtasks],
  };

  const removedIds = new Set([roadmapGoal.id, ...legacyPhaseGoals.map((goal) => goal.id)]);
  return [roadmapGoal, ...existingGoals.filter((goal) => !removedIds.has(goal.id))];
}

export function mapStudyRoadmapToGoal(
  existingGoals: Goal[],
  targetGoalId: string,
  roadmap: RoadmapPhase[],
  mode: ImportMode,
  now = new Date().toISOString(),
  makeId: () => string = () => crypto.randomUUID(),
): Goal[] {
  return existingGoals.map((goal) => {
    if (goal.id !== targetGoalId) return goal;
    const existingTopics = goal.subtasks.filter((subtask) => subtask.roadmapPhaseTitle);
    const manualTasks = goal.subtasks.filter((subtask) => !subtask.roadmapPhaseTitle && subtask.gymTaskOrder === undefined);
    const matchedIds = new Set<string>();
    const importedTopics = roadmap.flatMap((phase) => phase.topics.map((topic): Subtask => {
      const existing = existingTopics.find((subtask) => (
        keyFor(subtask.roadmapPhaseTitle ?? "") === keyFor(phase.title)
        && keyFor(subtask.title) === keyFor(topic.subtitle)
      ));
      if (existing) matchedIds.add(existing.id);
      return {
        id: existing?.id ?? makeId(),
        title: topic.subtitle,
        description: topic.description,
        status: existing?.status ?? "todo",
        createdAt: existing?.createdAt ?? now,
        completedAt: existing?.completedAt ?? null,
        comment: existing?.comment ?? "",
        roadmapPhaseTitle: phase.title,
        roadmapPhaseOrder: phase.phaseOrder,
        roadmapTopicOrder: topic.order,
      };
    }));
    const retained = mode === "merge" ? existingTopics.filter((topic) => !matchedIds.has(topic.id)) : [];
    const topics = [...importedTopics, ...retained].sort((a, b) => (
      (a.roadmapPhaseOrder ?? 0) - (b.roadmapPhaseOrder ?? 0)
      || (a.roadmapTopicOrder ?? 0) - (b.roadmapTopicOrder ?? 0)
    ));
    return {
      ...goal,
      roadmapRoot: false,
      roadmapKind: "studies",
      roadmapPhaseKey: undefined,
      studyRoadmapDefinition: roadmap,
      gymRoadmapDefinition: undefined,
      subtasks: [...topics, ...manualTasks],
    };
  });
}
