import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { Board } from "./components/Board";
import { GoalDetail } from "./components/GoalDetail";
import { NewGoalModal } from "./components/NewGoalModal";
import { Reports } from "./components/Reports";
import { RoadmapImportModal, type ImportCategory, type ImportMode, type RoadmapImportPayload } from "./components/RoadmapImportModal";
import { RoadmapCsvGuide } from "./components/RoadmapCsvGuide";
import { Sidebar } from "./components/Sidebar";
import { getAppData, saveAppData, CATEGORY_COLORS } from "./lib/storage";
import { completionStreak } from "./lib/stats";
import { mergeRoadmaps, validateRoadmapData } from "./lib/roadmapCsv";
import { mapStudyRoadmapToGoal } from "./lib/roadmapBoard";
import { mapGymRoadmapToGoal } from "./lib/gymBoard";
import { mergeGymRoadmaps, validateGymRoadmap } from "./lib/gymCsv";
import type { Period } from "./lib/dates";
import type { AppData, Category, Goal, Status, Subtask, View } from "./types";

const makeId = () => crypto.randomUUID();

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [view, setView] = useState<View>("board");
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [reportScope, setReportScope] = useState("all");
  const [period, setPeriod] = useState<Period>("week");
  const [saveError, setSaveError] = useState(false);
  const [roadmapFile, setRoadmapFile] = useState<{ file: File; category: ImportCategory; targetGoalId: string } | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [csvGuideCategory, setCsvGuideCategory] = useState<ImportCategory | null>(null);
  const errorTimer = useRef<number | null>(null);
  const successTimer = useRef<number | null>(null);

  useEffect(() => {
    getAppData().then(setData).catch(() => {
      setSaveError(true);
      setData({ goals: [], categories: [], theme: "light", roadmap: [], gymRoadmap: [] });
    });
  }, []);

  useEffect(() => {
    if (!data) return;
    document.documentElement.dataset.theme = data.theme;
    document.documentElement.style.colorScheme = data.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", data.theme === "dark" ? "#13160F" : "#EAEFE3");
  }, [data?.theme]);

  const showSaveError = useCallback(() => {
    setSaveError(true);
    if (errorTimer.current) window.clearTimeout(errorTimer.current);
    errorTimer.current = window.setTimeout(() => setSaveError(false), 5000);
  }, []);

  const commit = useCallback((recipe: (current: AppData) => AppData) => {
    setData((current) => {
      if (!current) return current;
      const next = recipe(current);
      void saveAppData(next).catch(showSaveError);
      return next;
    });
  }, [showSaveError]);

  const createCategory = useCallback((label: string): Category => {
    const category: Category = {
      id: makeId(),
      label,
      color: CATEGORY_COLORS[data?.categories.length ? data.categories.length % CATEGORY_COLORS.length : 0],
    };
    commit((current) => ({ ...current, categories: [...current.categories, category] }));
    return category;
  }, [commit, data?.categories.length]);

  const createGoal = (title: string, description: string, categoryId: string | null, csvFile: File | null = null) => {
    const goal: Goal = {
      id: makeId(), title, description, categoryId, status: "todo",
      createdAt: new Date().toISOString(), completedAt: null, subtasks: [],
    };
    commit((current) => ({ ...current, goals: [goal, ...current.goals] }));
    setNewGoalOpen(false);
    setSelectedGoalId(goal.id);
    setView("goal");
    if (csvFile) {
      const categoryLabel = data?.categories.find((category) => category.id === categoryId)?.label.toLocaleLowerCase();
      const importCategory: ImportCategory | null = categoryLabel === "gym" ? "gym" : categoryLabel === "studies" ? "studies" : null;
      if (importCategory) setRoadmapFile({ file: csvFile, category: importCategory, targetGoalId: goal.id });
    }
  };

  const updateGoal = (goalId: string, changes: Partial<Goal>) => {
    commit((current) => ({
      ...current,
      goals: current.goals.map((goal) => {
        if (goal.id !== goalId) return goal;
        const timedChanges = changes.status
          ? { ...changes, completedAt: changes.status === "completed" ? (goal.status === "completed" ? goal.completedAt : new Date().toISOString()) : null }
          : changes;
        return { ...goal, ...timedChanges };
      }),
    }));
  };

  const deleteGoal = (goalId: string) => {
    commit((current) => {
      const deletedGoal = current.goals.find((goal) => goal.id === goalId);
      return {
        ...current,
        goals: current.goals.filter((goal) => goal.id !== goalId),
        roadmap: deletedGoal?.roadmapRoot ? [] : current.roadmap,
        gymRoadmap: deletedGoal?.roadmapKind === "gym" ? [] : current.gymRoadmap,
      };
    });
    setSelectedGoalId(null);
    if (reportScope === goalId) setReportScope("all");
    setView("board");
  };

  const addSubtask = (goalId: string, title: string) => {
    const subtask: Subtask = { id: makeId(), title, description: "", status: "todo", createdAt: new Date().toISOString(), completedAt: null };
    commit((current) => ({ ...current, goals: current.goals.map((goal) => goal.id === goalId ? { ...goal, subtasks: [subtask, ...goal.subtasks] } : goal) }));
  };

  const updateSubtask = (goalId: string, subtaskId: string, changes: Partial<Subtask>) => {
    commit((current) => ({
      ...current,
      goals: current.goals.map((goal) => goal.id !== goalId ? goal : {
        ...goal,
        subtasks: goal.subtasks.map((subtask) => {
          if (subtask.id !== subtaskId) return subtask;
          const timedChanges = changes.status
            ? { ...changes, completedAt: changes.status === "completed" ? (subtask.status === "completed" ? subtask.completedAt : new Date().toISOString()) : null }
            : changes;
          return { ...subtask, ...timedChanges };
        }),
      }),
    }));
  };

  const deleteSubtask = (goalId: string, subtaskId: string) => {
    commit((current) => ({ ...current, goals: current.goals.map((goal) => goal.id === goalId ? { ...goal, subtasks: goal.subtasks.filter((item) => item.id !== subtaskId) } : goal) }));
  };

  const updateRoadmapPhaseStatus = (goalId: string, phaseTitle: string, status: Status) => {
    const phaseKey = phaseTitle.trim().toLocaleLowerCase();
    const completedAt = status === "completed" ? new Date().toISOString() : null;
    commit((current) => ({
      ...current,
      goals: current.goals.map((goal) => goal.id !== goalId ? goal : {
        ...goal,
        subtasks: goal.subtasks.map((subtask) => (
          subtask.roadmapPhaseTitle?.trim().toLocaleLowerCase() === phaseKey
            ? { ...subtask, status, completedAt: status === "completed" ? (subtask.status === "completed" ? subtask.completedAt : completedAt) : null }
            : subtask
        )),
      }),
    }));
  };

  const navigate = (target: "board" | "reports") => {
    setView(target);
    if (target === "board") setSelectedGoalId(null);
  };

  const importRoadmap = (payload: RoadmapImportPayload, mode: ImportMode): string | null => {
    const targetGoalId = roadmapFile?.targetGoalId;
    const targetGoal = data?.goals.find((goal) => goal.id === targetGoalId);
    if (!targetGoalId || !targetGoal) return "The target goal could not be found.";
    const categoryLabel = data?.categories.find((category) => category.id === targetGoal.categoryId)?.label.toLocaleLowerCase();
    if (categoryLabel !== payload.category) return `This goal is in ${categoryLabel ?? "an unsupported category"}; select ${payload.category === "gym" ? "Gym" : "Studies"} before importing.`;
    let nextGoals: Goal[];
    let summary: string;
    try {
      if (payload.category === "gym") {
        const gymRoadmap = mode === "merge" ? mergeGymRoadmaps(targetGoal.gymRoadmapDefinition ?? [], payload.tasks) : payload.tasks;
        validateGymRoadmap(gymRoadmap);
        nextGoals = mapGymRoadmapToGoal(data?.goals ?? [], targetGoalId, gymRoadmap, mode);
        summary = `${payload.filename} imported into ${targetGoal.title} — ${payload.tasks.length} workouts.`;
      } else {
        const roadmap = mode === "merge" ? mergeRoadmaps(targetGoal.studyRoadmapDefinition ?? [], payload.roadmap) : payload.roadmap;
        validateRoadmapData(roadmap);
        nextGoals = mapStudyRoadmapToGoal(data?.goals ?? [], targetGoalId, roadmap, mode);
        const topicCount = payload.roadmap.reduce((sum, phase) => sum + phase.topics.length, 0);
        summary = `${payload.filename} imported into ${targetGoal.title} — ${payload.roadmap.length} phases and ${topicCount} topics.`;
      }
    } catch (error) {
      return error instanceof Error ? error.message : "The CSV failed final validation.";
    }
    commit((current) => ({ ...current, goals: nextGoals }));
    setRoadmapFile(null);
    setView("goal");
    setSelectedGoalId(targetGoalId);
    setImportSuccess(summary);
    if (successTimer.current) window.clearTimeout(successTimer.current);
    successTimer.current = window.setTimeout(() => setImportSuccess(null), 6000);
    return null;
  };

  const selectedGoal = useMemo(() => data?.goals.find((goal) => goal.id === selectedGoalId), [data?.goals, selectedGoalId]);
  const importTargetGoal = useMemo(() => data?.goals.find((goal) => goal.id === roadmapFile?.targetGoalId), [data?.goals, roadmapFile?.targetGoalId]);

  if (!data) return <div className="loading-screen"><span className="loading-ring" /><p>Opening your growth log…</p></div>;

  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        theme={data.theme}
        streak={completionStreak(data.goals)}
        onNavigate={navigate}
        onNewGoal={() => setNewGoalOpen(true)}
        onToggleTheme={() => commit((current) => ({ ...current, theme: current.theme === "light" ? "dark" : "light" }))}
      />
      <div className="main-area">
        {view === "reports" ? (
          <Reports goals={data.goals} categories={data.categories} scopeId={reportScope} period={period} onScopeChange={setReportScope} onPeriodChange={setPeriod} />
        ) : view === "goal" && selectedGoal ? (
          <GoalDetail
            goal={selectedGoal}
            categories={data.categories}
            onBack={() => navigate("board")}
            onCreateCategory={createCategory}
            onUpdateGoal={(changes) => updateGoal(selectedGoal.id, changes)}
            onDeleteGoal={() => deleteGoal(selectedGoal.id)}
            onAddSubtask={(title) => addSubtask(selectedGoal.id, title)}
            onUpdateSubtask={(id, changes) => updateSubtask(selectedGoal.id, id, changes)}
            onUpdatePhaseStatus={(phaseTitle, status) => updateRoadmapPhaseStatus(selectedGoal.id, phaseTitle, status)}
            onDeleteSubtask={(id) => deleteSubtask(selectedGoal.id, id)}
            onSelectCsv={(file, category) => setRoadmapFile({ file, category, targetGoalId: selectedGoal.id })}
            onShowCsvGuide={setCsvGuideCategory}
          />
        ) : (
          <Board goals={data.goals} categories={data.categories} filter={filter} onFilter={setFilter} onNewGoal={() => setNewGoalOpen(true)} onOpenGoal={(id) => { setSelectedGoalId(id); setView("goal"); }} />
        )}
      </div>

      {newGoalOpen && <NewGoalModal categories={data.categories} onCreateCategory={createCategory} onClose={() => setNewGoalOpen(false)} onCreate={createGoal} onShowCsvGuide={setCsvGuideCategory} />}
      {roadmapFile && <RoadmapImportModal initialFile={roadmapFile.file} initialCategory={roadmapFile.category} hasExistingStudies={Boolean(importTargetGoal?.studyRoadmapDefinition?.length)} hasExistingGym={Boolean(importTargetGoal?.gymRoadmapDefinition?.length)} lockCategory onCancel={() => setRoadmapFile(null)} onImport={importRoadmap} />}
      {csvGuideCategory && <RoadmapCsvGuide initialCategory={csvGuideCategory} onClose={() => setCsvGuideCategory(null)} />}
      {saveError && <div className="save-banner" role="status"><AlertCircle size={17} /><span>Couldn’t save your last change</span><button onClick={() => setSaveError(false)} aria-label="Dismiss"><X size={16} /></button></div>}
      {importSuccess && <div className="save-banner success-banner" role="status"><span>{importSuccess}</span><button onClick={() => setImportSuccess(null)} aria-label="Dismiss"><X size={16} /></button></div>}
    </div>
  );
}
