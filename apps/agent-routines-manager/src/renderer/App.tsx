import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CircuitBoard,
  ClipboardCheck,
  Copy,
  Download,
  Eye,
  FileText,
  Filter,
  FolderTree,
  Languages,
  LayoutDashboard,
  ListChecks,
  MonitorCog,
  Moon,
  Network,
  ArrowDown,
  ArrowUp,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCcw,
  Route as RouteIcon,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  SquareTerminal,
  Sun,
  TableProperties,
  Trash2,
  Users,
  Workflow,
  X,
  XCircle,
} from "lucide-react";
import type { TFunction } from "i18next";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import {
  matrixColumns,
  statusKeys,
  type AppSettings,
  type ApplyMode,
  type ConfigToolKind,
  type DiagnosticCheck,
  type DiagnosticsResult,
  type DocsEntry,
  type ConfigDraftValidationResult,
  type InstallDiscoveryConfig,
  type InstallDiscoveryConfigV1,
  type InstallDiscoveryConfigV2,
  type InstallMatrixCell,
  type InstallMatrixResult,
  type InstallStatus,
  type InventoryScanResult,
  type LanguageCode,
  type ManifestDiffResult,
  type MatrixColumnId,
  type PlanGenerateResult,
  type ProjectTargetOverrideV2,
  type RoutineKind,
  type RoutineItem,
  type ToolRoutineSelection,
  type TaskRecord,
  type ThemeMode,
  type ToolKind,
  type ValidationGate,
} from "../shared/contracts.js";
import { api, isBrowserPreview } from "./api.js";
import claudeIconUrl from "./assets/claude-color.svg";
import codexIconUrl from "./assets/codex-color.svg";
import {
  buildPolicyRecommendations,
  buildProjectCandidates,
  type PolicyRecommendation,
  type PolicyRecommendationCategory,
} from "./domain/policy-recommendations.js";

type RouteId =
  | "dashboard"
  | "inventory"
  | "installMatrix"
  | "projects"
  | "policy"
  | "distribute"
  | "validation"
  | "taskCenter"
  | "docs"
  | "settings";

type SettingsPathFocusTarget = "sourceRepository" | "activeConfig";

type PolicyPaneId =
  | "user"
  | "projectDefaults"
  | "projectTargets"
  | "recommendations";

interface NavItem {
  id: RouteId;
  labelKey: string;
  icon: ComponentType<{ size?: number }>;
}

const navItems: NavItem[] = [
  { id: "dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { id: "inventory", labelKey: "nav.inventory", icon: Boxes },
  { id: "installMatrix", labelKey: "nav.installMatrix", icon: TableProperties },
  { id: "projects", labelKey: "nav.projects", icon: FolderTree },
  { id: "policy", labelKey: "nav.policy", icon: SlidersHorizontal },
  { id: "distribute", labelKey: "nav.distribute", icon: Send },
  { id: "validation", labelKey: "nav.validation", icon: ListChecks },
  { id: "taskCenter", labelKey: "nav.taskCenter", icon: SquareTerminal },
  { id: "docs", labelKey: "nav.docs", icon: FileText },
  { id: "settings", labelKey: "nav.settings", icon: Settings },
];

const routeTitleKey: Record<RouteId, string> = {
  dashboard: "dashboard.title",
  inventory: "inventory.title",
  installMatrix: "matrix.title",
  projects: "projects.title",
  policy: "policy.title",
  distribute: "distribute.title",
  validation: "validation.title",
  taskCenter: "tasks.title",
  docs: "docs.title",
  settings: "settings.title",
};

const routeSubtitleKey: Record<RouteId, string> = {
  dashboard: "dashboard.subtitle",
  inventory: "inventory.subtitle",
  installMatrix: "matrix.subtitle",
  projects: "projects.subtitle",
  policy: "policy.subtitle",
  distribute: "distribute.subtitle",
  validation: "validation.subtitle",
  taskCenter: "tasks.subtitle",
  docs: "docs.subtitle",
  settings: "settings.subtitle",
};

const statusIcons: Record<InstallStatus, ComponentType<{ size?: number }>> = {
  same: CheckCircle2,
  drift: AlertTriangle,
  broken: XCircle,
  missing: XCircle,
  unknown: CircleHelp,
  shared: Users,
  "not-targeted": Filter,
};

const routineKindIcons: Record<
  RoutineKind,
  ComponentType<{ size?: number }>
> = {
  skill: CircuitBoard,
  workflow: Network,
};

type DisplayToolKind = Extract<ToolKind, "codex" | "claude-code">;

const toolIconMeta: Record<
  DisplayToolKind,
  { labelKey: string; iconUrl: string }
> = {
  codex: { labelKey: "matrix.tools.codex", iconUrl: codexIconUrl },
  "claude-code": {
    labelKey: "matrix.tools.claudeCode",
    iconUrl: claudeIconUrl,
  },
};

function configToolToDisplayTool(tool: ConfigToolKind): DisplayToolKind {
  return tool === "claudeCode" ? "claude-code" : "codex";
}

function maybeDisplayTool(tool: string): DisplayToolKind | undefined {
  if (tool === "codex" || tool === "claude-code") {
    return tool;
  }
  if (tool === "claudeCode") {
    return "claude-code";
  }
  return undefined;
}

function ToolIconBadge({
  tool,
  size = "md",
  decorative = false,
}: {
  tool: DisplayToolKind;
  size?: "xs" | "sm" | "md";
  decorative?: boolean;
}) {
  const { t } = useTranslation();
  const meta = toolIconMeta[tool];
  const label = t(meta.labelKey);
  return (
    <span
      className={`tool-icon-badge tool-icon-${tool} tool-icon-${size}`}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      title={label}
    >
      <img src={meta.iconUrl} alt="" aria-hidden="true" />
    </span>
  );
}

function RoutineKindIcon({
  kind,
  size = "sm",
  decorative = false,
}: {
  kind: RoutineKind;
  size?: "xs" | "sm" | "md";
  decorative?: boolean;
}) {
  const { t } = useTranslation();
  const Icon = routineKindIcons[kind];
  const label = t(`routine.kind.${kind}`);
  return (
    <span
      className={`routine-kind-icon routine-kind-${kind} routine-kind-${size}`}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      title={label}
    >
      <Icon size={size === "xs" ? 13 : size === "sm" ? 15 : 17} />
    </span>
  );
}

function RoutineNameWithKind({
  name,
  kind,
}: {
  name: string;
  kind: RoutineKind;
}) {
  return (
    <span className="routine-name-with-kind">
      <code>{name}</code>
      <RoutineKindIcon kind={kind} />
    </span>
  );
}

function ToolSkillHeading({
  title,
  scopeLabel,
  tool,
}: {
  title: string;
  scopeLabel: string;
  tool: ConfigToolKind;
}) {
  return (
    <span className="tool-skill-heading" aria-label={title} title={title}>
      <span>{scopeLabel}</span>
      <ToolIconBadge tool={configToolToDisplayTool(tool)} decorative />
      <RoutineKindIcon kind="skill" decorative />
    </span>
  );
}

function RoutineScopeHeading({
  title,
  scopeLabel,
  kind,
}: {
  title: string;
  scopeLabel: string;
  kind: RoutineKind;
}) {
  return (
    <span className="routine-scope-heading" aria-label={title} title={title}>
      <span>{scopeLabel}</span>
      <RoutineKindIcon kind={kind} decorative />
    </span>
  );
}

function ToolBadgeList({ tools }: { tools: ConfigToolKind[] }) {
  return (
    <span className="tool-badge-list">
      {tools.map((tool) => (
        <ToolIconBadge
          key={tool}
          tool={configToolToDisplayTool(tool)}
          size="sm"
        />
      ))}
    </span>
  );
}

function toolTargetCountLabel(t: TFunction, tools: ConfigToolKind[]): string {
  return t("policy.toolTargetsCount", { count: tools.length });
}

function routineDisplayCopy(t: TFunction, text?: string): string {
  if (!text) {
    return "-";
  }
  return text
    .replace(/\bSkills\b/g, t("routine.kind.skillPlural"))
    .replace(/\bSkill\b/g, t("routine.kind.skill"))
    .replace(/\bworkflows\b/g, t("routine.kind.workflowPlural"))
    .replace(/\bworkflow\b/g, t("routine.kind.workflow"));
}

function MatrixColumnTitle({
  column,
}: {
  column: {
    tool: ToolKind;
    scope: string;
    labelKey: string;
  };
}) {
  const { t } = useTranslation();
  const displayTool = maybeDisplayTool(column.tool);
  if (column.tool === "shared-workflow-runtime") {
    return (
      <span
        className="matrix-column-title matrix-column-runtime"
        aria-label={t(column.labelKey)}
        title={t(column.labelKey)}
      >
        <RoutineKindIcon kind="workflow" size="md" decorative />
      </span>
    );
  }
  if (!displayTool) {
    return <span>{t(column.labelKey)}</span>;
  }
  return (
    <span
      className="matrix-column-title"
      aria-label={t(column.labelKey)}
      title={t(column.labelKey)}
    >
      <ToolIconBadge tool={displayTool} decorative />
      <span>{t(`matrix.columnScope.${column.scope}`)}</span>
    </span>
  );
}

const INVENTORY_PAGE_SIZE = 20;
const MATRIX_PAGE_SIZE = 15;
const DOCS_PAGE_SIZE = 14;
const FEEDBACK_DELAY_MS = 450;

const distributeStepIds = [
  "scope",
  "routines",
  "targets",
  "mode",
  "run",
  "result",
] as const;

type DistributeStep = (typeof distributeStepIds)[number];

const distributeStepIcons: Record<
  DistributeStep,
  ComponentType<{ size?: number }>
> = {
  scope: Filter,
  routines: ListChecks,
  targets: FolderTree,
  mode: SlidersHorizontal,
  run: RouteIcon,
  result: ShieldCheck,
};

const helpTopics = {
  "route.dashboard": {
    titleKey: "help.dashboard.title",
    bodyKey: "help.dashboard.body",
    itemKeys: [
      "help.dashboard.item.inventory",
      "help.dashboard.item.diagnostics",
      "help.dashboard.item.tasks",
    ],
  },
  "route.inventory": {
    titleKey: "help.inventory.title",
    bodyKey: "help.inventory.body",
    itemKeys: [
      "help.inventory.item.source",
      "help.inventory.item.required",
      "help.inventory.item.recommended",
    ],
  },
  "route.installMatrix": {
    titleKey: "help.matrix.title",
    bodyKey: "help.matrix.body",
    itemKeys: [
      "help.matrix.item.status",
      "help.matrix.item.scope",
      "help.matrix.item.drawer",
    ],
  },
  "route.projects": {
    titleKey: "help.projects.title",
    bodyKey: "help.projects.body",
    itemKeys: [
      "help.projects.item.roots",
      "help.projects.item.depth",
      "help.projects.item.exclude",
    ],
  },
  "route.policy": {
    titleKey: "help.policy.title",
    bodyKey: "help.policy.body",
    itemKeys: [
      "help.policy.item.user",
      "help.policy.item.project",
      "help.policy.item.validation",
    ],
  },
  "route.distribute": {
    titleKey: "help.distribute.title",
    bodyKey: "help.distribute.body",
    itemKeys: [
      "help.distribute.item.steps",
      "help.distribute.item.dryRun",
      "help.distribute.item.apply",
    ],
  },
  "route.validation": {
    titleKey: "help.validation.title",
    bodyKey: "help.validation.body",
    itemKeys: [
      "help.validation.item.readonly",
      "help.validation.item.shells",
      "help.validation.item.output",
    ],
  },
  "route.taskCenter": {
    titleKey: "help.tasks.title",
    bodyKey: "help.tasks.body",
    itemKeys: [
      "help.tasks.item.queue",
      "help.tasks.item.logs",
      "help.tasks.item.redaction",
    ],
  },
  "route.docs": {
    titleKey: "help.docs.title",
    bodyKey: "help.docs.body",
    itemKeys: [
      "help.docs.item.whitelist",
      "help.docs.item.preview",
      "help.docs.item.search",
    ],
  },
  "route.settings": {
    titleKey: "help.settings.title",
    bodyKey: "help.settings.body",
    itemKeys: [
      "help.settings.item.theme",
      "help.settings.item.paths",
      "help.settings.item.runtime",
    ],
  },
  "search.global": {
    titleKey: "help.search.title",
    bodyKey: "help.search.body",
    itemKeys: [
      "help.search.item.shortcut",
      "help.search.item.scope",
      "help.search.item.clear",
    ],
  },
  "status.legend": {
    titleKey: "help.status.title",
    bodyKey: "help.status.body",
    itemKeys: [
      "help.status.item.same",
      "help.status.item.drift",
      "help.status.item.broken",
      "help.status.item.shared",
      "help.status.item.notTargeted",
    ],
  },
  "distribute.step.scope": {
    titleKey: "help.distribute.step.scope.title",
    bodyKey: "help.distribute.step.scope.body",
  },
  "distribute.step.routines": {
    titleKey: "help.distribute.step.routines.title",
    bodyKey: "help.distribute.step.routines.body",
  },
  "distribute.step.targets": {
    titleKey: "help.distribute.step.targets.title",
    bodyKey: "help.distribute.step.targets.body",
  },
  "distribute.step.mode": {
    titleKey: "help.distribute.step.mode.title",
    bodyKey: "help.distribute.step.mode.body",
  },
  "distribute.mode.dry-run": {
    titleKey: "help.distribute.mode.dryRun.title",
    bodyKey: "help.distribute.mode.dryRun.body",
    itemKeys: [
      "help.distribute.mode.dryRun.item.review",
      "help.distribute.mode.dryRun.item.noWrite",
      "help.distribute.mode.dryRun.item.result",
    ],
  },
  "distribute.mode.merge": {
    titleKey: "help.distribute.mode.merge.title",
    bodyKey: "help.distribute.mode.merge.body",
    itemKeys: [
      "help.distribute.mode.merge.item.risk",
      "help.distribute.mode.merge.item.noOverwrite",
      "help.distribute.mode.merge.item.confirm",
    ],
  },
  "distribute.mode.replace-listed": {
    titleKey: "help.distribute.mode.replaceListed.title",
    bodyKey: "help.distribute.mode.replaceListed.body",
    itemKeys: [
      "help.distribute.mode.replaceListed.item.match",
      "help.distribute.mode.replaceListed.item.scoped",
      "help.distribute.mode.replaceListed.item.confirm",
    ],
  },
  "distribute.mode.sync-prune": {
    titleKey: "help.distribute.mode.syncPrune.title",
    bodyKey: "help.distribute.mode.syncPrune.body",
    itemKeys: [
      "help.distribute.mode.syncPrune.item.impact",
      "help.distribute.mode.syncPrune.item.delete",
      "help.distribute.mode.syncPrune.item.confirm",
    ],
  },
  "distribute.step.run": {
    titleKey: "help.distribute.step.run.title",
    bodyKey: "help.distribute.step.run.body",
  },
  "distribute.step.result": {
    titleKey: "help.distribute.step.result.title",
    bodyKey: "help.distribute.step.result.body",
  },
  "validation.output": {
    titleKey: "help.validation.output.title",
    bodyKey: "help.validation.output.body",
  },
  "settings.runtime": {
    titleKey: "help.settings.runtime.title",
    bodyKey: "help.settings.runtime.body",
  },
} as const;

type HelpTopicId = keyof typeof helpTopics;

type HelpPreviewPosition = {
  left: number;
  top: number;
  width: number;
  placement: "above" | "below";
};

const routeHelpTopic: Record<RouteId, HelpTopicId> = {
  dashboard: "route.dashboard",
  inventory: "route.inventory",
  installMatrix: "route.installMatrix",
  projects: "route.projects",
  policy: "route.policy",
  distribute: "route.distribute",
  validation: "route.validation",
  taskCenter: "route.taskCenter",
  docs: "route.docs",
  settings: "route.settings",
};

const applyModeHelpTopic: Record<ApplyMode, HelpTopicId> = {
  "dry-run": "distribute.mode.dry-run",
  merge: "distribute.mode.merge",
  "replace-listed": "distribute.mode.replace-listed",
  "sync-prune": "distribute.mode.sync-prune",
};

const HelpContext = createContext<((topicId: HelpTopicId) => void) | undefined>(
  undefined,
);

export default function App() {
  const { t, i18n } = useTranslation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const appBodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const configLoadRequestId = useRef(0);
  const configValidationRequestId = useRef(0);
  const [route, setRoute] = useState<RouteId>("installMatrix");
  const [settings, setSettings] = useState<AppSettings>();
  const [inventory, setInventory] = useState<InventoryScanResult>();
  const [matrix, setMatrix] = useState<InstallMatrixResult>();
  const [docs, setDocs] = useState<DocsEntry[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResult>();
  const [gates, setGates] = useState<ValidationGate[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [selectedCell, setSelectedCell] = useState<InstallMatrixCell>();
  const [selectedTaskId, setSelectedTaskId] = useState<string>();
  const [selectedDocId, setSelectedDocId] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<InstallStatus | "all">(
    "all",
  );
  const [kindFilter, setKindFilter] = useState<RoutineKind | "all">("all");
  const [toolFilter, setToolFilter] = useState<ToolKind | "all">("all");
  const [searchText, setSearchText] = useState("");
  const [planResult, setPlanResult] = useState<PlanGenerateResult>();
  const [manifestWriteTask, setManifestWriteTask] = useState<TaskRecord>();
  const [distributionApplyTask, setDistributionApplyTask] =
    useState<TaskRecord>();
  const [configDraft, setConfigDraft] = useState<InstallDiscoveryConfig>();
  const [configValidation, setConfigValidation] =
    useState<ConfigDraftValidationResult>();
  const [configDirty, setConfigDirty] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDiagnosticsRunning, setIsDiagnosticsRunning] = useState(false);
  const [isConfigValidating, setIsConfigValidating] = useState(false);
  const [isPlanGenerating, setIsPlanGenerating] = useState(false);
  const [isManifestWriting, setIsManifestWriting] = useState(false);
  const [isDistributionApplying, setIsDistributionApplying] = useState(false);
  const [operationError, setOperationError] = useState<string>();
  const [activeHelpTopic, setActiveHelpTopic] = useState<HelpTopicId>();
  const [settingsPathFocusTarget, setSettingsPathFocusTarget] =
    useState<SettingsPathFocusTarget>();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<string>();
  const [lastAction, setLastAction] = useState<
    { kind: "refresh" | "diagnostics"; at: string } | undefined
  >();
  const [lastConfigAction, setLastConfigAction] = useState<
    { kind: "validate" | "save"; at: string } | undefined
  >();

  const validateConfigDraft = useCallback(
    async (draft: InstallDiscoveryConfig) => {
      const requestId = ++configValidationRequestId.current;
      const result = await api.installConfig.validateDraft(draft);
      if (requestId === configValidationRequestId.current) {
        setConfigValidation(result);
      }
      return result;
    },
    [],
  );

  const clearDistributionState = useCallback(() => {
    setPlanResult(undefined);
    setManifestWriteTask(undefined);
    setDistributionApplyTask(undefined);
  }, []);

  const loadActiveConfig = useCallback(
    async (configPath?: string) => {
      const requestId = ++configLoadRequestId.current;
      if (!configPath) {
        configValidationRequestId.current += 1;
        setConfigDraft(undefined);
        setConfigValidation(undefined);
        setConfigDirty(false);
        return;
      }
      const nextConfig = await api.installConfig.read({ configPath });
      if (requestId !== configLoadRequestId.current) {
        return;
      }
      setConfigDraft(nextConfig);
      setConfigDirty(false);
      await validateConfigDraft(nextConfig);
    },
    [validateConfigDraft],
  );

  const reportOperationError = useCallback((error: unknown) => {
    setOperationError(error instanceof Error ? error.message : String(error));
  }, []);

  const focusGlobalSearch = useCallback(() => {
    const input = searchInputRef.current;
    if (!input) {
      return;
    }
    input.focus();
    input.select();
  }, []);

  const openSettingsPath = useCallback((target: SettingsPathFocusTarget) => {
    setSettingsPathFocusTarget(target);
    setRoute("settings");
  }, []);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    setOperationError(undefined);
    try {
      const minimumFeedbackDelay = waitForFeedback();
      const [nextInventory, nextMatrix, nextDocs, nextTasks, nextGates] =
        await Promise.all([
          api.inventory.scan(),
          api.inventory.matrix(),
          api.docs.list(),
          api.tasks.list(),
          api.validation.listGates(),
          minimumFeedbackDelay,
        ]);
      setInventory(nextInventory);
      setMatrix(nextMatrix);
      setDocs(nextDocs);
      setTasks(nextTasks);
      setGates(nextGates);
      setSelectedDocId((current) => current ?? nextDocs[0]?.id);
      setSelectedCell((current) => findMatchingMatrixCell(nextMatrix, current));
      const refreshedAt = new Date().toISOString();
      setLastRefreshAt(refreshedAt);
      setLastAction({ kind: "refresh", at: refreshedAt });
    } catch (error) {
      reportOperationError(error);
    } finally {
      setIsRefreshing(false);
    }
  }, [reportOperationError]);

  const refreshInstallState = useCallback(async () => {
    try {
      const [nextInventory, nextMatrix] = await Promise.all([
        api.inventory.scan(),
        api.inventory.matrix(),
      ]);
      setInventory(nextInventory);
      setMatrix(nextMatrix);
      setSelectedCell((current) => findMatchingMatrixCell(nextMatrix, current));
      const refreshedAt = new Date().toISOString();
      setLastRefreshAt(refreshedAt);
      setLastAction({ kind: "refresh", at: refreshedAt });
    } catch (error) {
      reportOperationError(error);
    }
  }, [reportOperationError]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        focusGlobalSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusGlobalSearch]);

  useEffect(() => api.app.onSearch(focusGlobalSearch), [focusGlobalSearch]);

  useEffect(() => {
    appBodyRef.current?.scrollTo({ top: 0, left: 0 });
    contentRef.current?.scrollTo({ top: 0, left: 0 });
  }, [route]);

  const updateConfigDraft = useCallback(
    (updater: (current: InstallDiscoveryConfig) => InstallDiscoveryConfig) => {
      if (!configDraft) {
        return;
      }
      const next = updater(configDraft);
      setConfigDraft(next);
      setConfigDirty(true);
      clearDistributionState();
      void validateConfigDraft(next);
    },
    [clearDistributionState, configDraft, validateConfigDraft],
  );

  useEffect(() => {
    void api.settings
      .get()
      .then(async (nextSettings) => {
        setSettings(nextSettings);
        applyTheme(nextSettings.theme);
        await i18n.changeLanguage(nextSettings.language);
        await loadActiveConfig(nextSettings.activeConfigPath);
        await refreshData();
      })
      .catch(reportOperationError);
    return api.tasks.subscribe((task) => {
      setTasks((current) => [
        task,
        ...current.filter((item) => item.id !== task.id),
      ]);
      setSelectedTaskId((current) => current ?? task.id);
    });
  }, [i18n, loadActiveConfig, refreshData, reportOperationError]);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? tasks[0],
    [selectedTaskId, tasks],
  );

  const selectedDoc = useMemo(
    () => docs.find((doc) => doc.id === selectedDocId) ?? docs[0],
    [docs, selectedDocId],
  );

  const planBlockReasonKey = useMemo(() => {
    if (!settings?.activeConfigPath) {
      return "distribute.noActiveConfig";
    }
    if (configDirty) {
      return "distribute.dirtyConfigBlocksPlan";
    }
    if (!configValidation) {
      return "config.validation.notRun";
    }
    if (!configValidation.ok) {
      return "distribute.invalidConfigBlocksPlan";
    }
    return undefined;
  }, [configDirty, configValidation, settings?.activeConfigPath]);
  const canGeneratePlan = !planBlockReasonKey;

  const updateSettings = async (patch: Partial<AppSettings>) => {
    setOperationError(undefined);
    try {
      const previousSettings = settings;
      const next = await api.settings.update(patch);
      setSettings(next);
      applyTheme(next.theme);
      await i18n.changeLanguage(next.language);
      const sourceChanged =
        patch.sourceRepositoryPath !== undefined &&
        next.sourceRepositoryPath !== previousSettings?.sourceRepositoryPath;
      const activeConfigChanged =
        next.activeConfigPath !== previousSettings?.activeConfigPath;
      if (sourceChanged || activeConfigChanged) {
        clearDistributionState();
        setSelectedCell(undefined);
        await loadActiveConfig(next.activeConfigPath);
        await refreshData();
      }
    } catch (error) {
      reportOperationError(error);
    }
  };

  const chooseSourceRepository = async () => {
    try {
      const result = await api.dialogs.pickDirectory({
        titleKey: "settings.sourceRepository",
      });
      if (!result.canceled && result.paths[0]) {
        await updateSettings({ sourceRepositoryPath: result.paths[0] });
      }
    } catch (error) {
      reportOperationError(error);
    }
  };

  const chooseActiveConfig = async () => {
    try {
      const result = await api.dialogs.pickFile({
        titleKey: "settings.activeConfig",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!result.canceled && result.paths[0]) {
        await updateSettings({ activeConfigPath: result.paths[0] });
      }
    } catch (error) {
      reportOperationError(error);
    }
  };

  const runDiagnostics = async () => {
    setIsDiagnosticsRunning(true);
    setOperationError(undefined);
    try {
      const [result] = await Promise.all([
        api.diagnostics.run(),
        waitForFeedback(),
      ]);
      setDiagnostics(result);
      setLastAction({ kind: "diagnostics", at: result.checkedAt });
    } catch (error) {
      reportOperationError(error);
    } finally {
      setIsDiagnosticsRunning(false);
    }
  };

  const generatePlan = async () => {
    if (!settings?.activeConfigPath || planBlockReasonKey) {
      return;
    }
    setIsPlanGenerating(true);
    setOperationError(undefined);
    try {
      setManifestWriteTask(undefined);
      setDistributionApplyTask(undefined);
      const [result] = await Promise.all([
        api.plan.generate({
          configPath: settings.activeConfigPath,
        }),
        waitForFeedback(),
      ]);
      setPlanResult(result);
      setTasks((current) => [
        result.task,
        ...current.filter((task) => task.id !== result.task.id),
      ]);
      setSelectedTaskId(result.task.id);
    } catch (error) {
      reportOperationError(error);
    } finally {
      setIsPlanGenerating(false);
    }
  };

  const validateActiveConfig = async () => {
    if (!settings?.activeConfigPath) {
      return;
    }
    setIsConfigValidating(true);
    setOperationError(undefined);
    try {
      const [task] = await Promise.all([
        api.installConfig.validate({
          configPath: settings.activeConfigPath,
        }),
        waitForFeedback(),
      ]);
      if (configDraft) {
        await validateConfigDraft(configDraft);
      }
      setTasks((current) => [
        task,
        ...current.filter((item) => item.id !== task.id),
      ]);
      setSelectedTaskId(task.id);
      setLastConfigAction({ kind: "validate", at: new Date().toISOString() });
    } catch (error) {
      reportOperationError(error);
    } finally {
      setIsConfigValidating(false);
    }
  };

  const writeManifest = async (manifestDigest: string) => {
    if (!settings?.activeConfigPath || !isPlanResultReady(planResult)) {
      return;
    }
    setIsManifestWriting(true);
    setOperationError(undefined);
    try {
      const [task] = await Promise.all([
        api.manifest.write({
          configPath: settings.activeConfigPath,
          confirmed: true,
          manifestDigest,
        }),
        waitForFeedback(),
      ]);
      setTasks((current) => [
        task,
        ...current.filter((item) => item.id !== task.id),
      ]);
      setManifestWriteTask(task);
      setDistributionApplyTask(undefined);
      setSelectedTaskId(task.id);
    } catch (error) {
      reportOperationError(error);
    } finally {
      setIsManifestWriting(false);
    }
  };

  const applyDistribution = async (
    mode: ApplyMode,
    confirmationText: string,
    manifestDigest?: string,
  ) => {
    if (
      !settings?.activeConfigPath ||
      !isPlanResultReady(planResult) ||
      !manifestDigest
    ) {
      return;
    }
    setIsDistributionApplying(true);
    setOperationError(undefined);
    try {
      const [task] = await Promise.all([
        api.distribution.apply({
          configPath: settings.activeConfigPath,
          confirmed: true,
          force: mode === "replace-listed",
          mode,
          confirmationText,
          manifestDigest,
        }),
        waitForFeedback(),
      ]);
      setTasks((current) => [
        task,
        ...current.filter((item) => item.id !== task.id),
      ]);
      setDistributionApplyTask(task);
      setSelectedTaskId(task.id);
      if (task.state === "succeeded") {
        await refreshInstallState();
      }
    } catch (error) {
      reportOperationError(error);
    } finally {
      setIsDistributionApplying(false);
    }
  };

  const saveConfigAs = async () => {
    if (!configDraft) {
      return;
    }
    setOperationError(undefined);
    try {
      const result = await api.installConfig.saveAs({
        config: configDraft,
        suggestedPath: settings?.activeConfigPath,
      });
      if (!result.canceled && result.paths[0]) {
        await updateSettings({ activeConfigPath: result.paths[0] });
        setConfigDirty(false);
        setManifestWriteTask(undefined);
        await validateConfigDraft(configDraft);
        setLastConfigAction({ kind: "save", at: new Date().toISOString() });
      }
    } catch (error) {
      reportOperationError(error);
    }
  };

  const openDocsForRoutine = (
    routine: RoutineItem,
    docKind: "readme" | "instruction" = "readme",
  ) => {
    setSelectedDocId(
      routine.kind === "skill" && docKind === "instruction"
        ? `skill-${routine.name}-instruction`
        : `${routine.kind}-${routine.name}-readme`,
    );
    setRoute("docs");
  };

  const runGate = async (gate: ValidationGate) => {
    setOperationError(undefined);
    try {
      const task = await api.validation.runGate({
        gateId: gate.id,
        shell: gate.shell,
      });
      setTasks((current) => [
        task,
        ...current.filter((item) => item.id !== task.id),
      ]);
      setSelectedTaskId(task.id);
    } catch (error) {
      reportOperationError(error);
    }
  };

  const cancelTask = async (taskId: string) => {
    setOperationError(undefined);
    try {
      const task = await api.tasks.cancel(taskId);
      setTasks((current) => [
        task,
        ...current.filter((item) => item.id !== task.id),
      ]);
      setSelectedTaskId(task.id);
    } catch (error) {
      reportOperationError(error);
    }
  };

  const archiveTask = async (taskId: string) => {
    setOperationError(undefined);
    try {
      const result = await api.archive.write({
        taskId,
        includePlan: true,
        confirmed: true,
      });
      setTasks((current) => [
        result.task,
        ...current.filter((item) => item.id !== result.task.id),
      ]);
      setSelectedTaskId(result.task.id);
      return result;
    } catch (error) {
      reportOperationError(error);
      return {};
    }
  };

  return (
    <HelpContext.Provider value={setActiveHelpTopic}>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand-mark" aria-hidden="true">
            <MonitorCog size={17} />
          </div>
          <div className="brand-copy">
            <div className="brand-title">{t("app.title")}</div>
            <div className="brand-subtitle">{t("app.subtitle")}</div>
          </div>
          {isBrowserPreview ? (
            <span className="preview-chip">{t("app.browserPreview")}</span>
          ) : null}
          <PathChip
            label="repo"
            value={settings?.sourceRepositoryPath ?? ""}
            actionLabel={t("settings.openSourceRepositorySettings")}
            onClick={() => openSettingsPath("sourceRepository")}
          />
          <PathChip
            label="config"
            value={settings?.activeConfigPath ?? ""}
            actionLabel={t("settings.openActiveConfigSettings")}
            onClick={() => openSettingsPath("activeConfig")}
          />
          <div className="global-search">
            <Search size={15} />
            <input
              ref={searchInputRef}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={t("app.search")}
            />
          </div>
          <Segmented
            label={t("settings.theme")}
            value={settings?.theme ?? "system"}
            options={[
              ["light", t("theme.light"), Sun],
              ["dark", t("theme.dark"), Moon],
              ["system", t("theme.system"), MonitorCog],
            ]}
            onChange={(value) =>
              void updateSettings({ theme: value as ThemeMode })
            }
          />
          <Segmented
            label={t("settings.language")}
            value={settings?.language ?? "zh-CN"}
            options={[
              ["en", t("language.en"), Languages],
              ["zh-CN", t("language.zh-CN"), Languages],
            ]}
            onChange={(value) =>
              void updateSettings({ language: value as LanguageCode })
            }
          />
        </header>

        <div
          ref={appBodyRef}
          className={[
            "app-body",
            route === "installMatrix" && selectedCell
              ? "has-drawer"
              : "no-drawer",
            isSidebarCollapsed ? "sidebar-collapsed" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <aside className="sidebar">
            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setIsSidebarCollapsed((current) => !current)}
              aria-label={
                isSidebarCollapsed
                  ? t("nav.expandSidebar")
                  : t("nav.collapseSidebar")
              }
              title={
                isSidebarCollapsed
                  ? t("nav.expandSidebar")
                  : t("nav.collapseSidebar")
              }
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen size={16} />
              ) : (
                <PanelLeftClose size={16} />
              )}
            </button>
            <div className="source-card">
              <div className="eyebrow">{t("sidebar.sourceRepository")}</div>
              <code>
                {middleEllipsis(settings?.sourceRepositoryPath ?? "")}
              </code>
              <span className="config-chip">
                <CheckCircle2 size={13} />
                {t("statusbar.config")}
              </span>
            </div>
            <nav aria-label={t("nav.primaryLabel")}>
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === route ? "nav-item active" : "nav-item"}
                  onClick={() => setRoute(item.id)}
                  title={t(item.labelKey)}
                >
                  <item.icon size={19} />
                  <span>{t(item.labelKey)}</span>
                </button>
              ))}
            </nav>
            <div className="safe-action">
              <strong>{t("matrix.details.suggestedAction")}</strong>
              <span>{t("matrix.details.writeSafetyBody")}</span>
              <button
                type="button"
                className="compact-button"
                onClick={() => setRoute("distribute")}
              >
                <RouteIcon size={14} />
                {t("actions.openWizard")}
              </button>
            </div>
          </aside>

          <main className="content" ref={contentRef}>
            <section className="content-header">
              <div className="content-heading">
                <div className="content-heading-copy">
                  <div className="content-title-row">
                    <h1>{t(routeTitleKey[route])}</h1>
                    <HelpButton topicId={routeHelpTopic[route]} />
                  </div>
                  <p>{t(routeSubtitleKey[route])}</p>
                </div>
              </div>
              <HeaderActions
                route={route}
                onRefresh={() => void refreshData()}
                onDiagnostics={() => void runDiagnostics()}
                onGeneratePlan={() => void generatePlan()}
                onValidateConfig={() => void validateActiveConfig()}
                onSaveConfig={() => void saveConfigAs()}
                onOpenWizard={() => setRoute("distribute")}
                canSaveConfig={Boolean(configDraft)}
                canGeneratePlan={canGeneratePlan}
                planBlockReasonKey={planBlockReasonKey}
                isRefreshing={isRefreshing}
                isDiagnosticsRunning={isDiagnosticsRunning}
                isConfigValidating={isConfigValidating}
                isPlanGenerating={isPlanGenerating}
                actionStatusText={getActionStatusText(
                  t,
                  lastAction,
                  isRefreshing,
                  isDiagnosticsRunning,
                )}
                configActionStatusText={getConfigActionStatusText(
                  t,
                  lastConfigAction,
                  isConfigValidating,
                )}
              />
            </section>

            {operationError ? (
              <div className="operation-error" role="alert">
                <StatusPill status="broken" label={t("common.error")} />
                <span>{operationError}</span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setOperationError(undefined)}
                  aria-label={t("actions.close")}
                  title={t("actions.close")}
                >
                  <X size={14} />
                </button>
              </div>
            ) : null}

            {route === "dashboard" ? (
              <Dashboard
                inventory={inventory}
                matrix={matrix}
                diagnostics={diagnostics}
                tasks={tasks}
                lastRefreshAt={lastRefreshAt}
                diagnosticsRunning={isDiagnosticsRunning}
                onDiagnostics={runDiagnostics}
                onRoute={setRoute}
              />
            ) : null}
            {route === "inventory" ? (
              <Inventory
                inventory={inventory}
                searchText={searchText}
                onClearSearch={() => setSearchText("")}
                onOpenDocs={openDocsForRoutine}
              />
            ) : null}
            {route === "installMatrix" ? (
              <InstallMatrix
                matrix={matrix}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                kindFilter={kindFilter}
                setKindFilter={setKindFilter}
                toolFilter={toolFilter}
                setToolFilter={setToolFilter}
                searchText={searchText}
                setSearchText={setSearchText}
                selectedCell={selectedCell}
                setSelectedCell={setSelectedCell}
              />
            ) : null}
            {route === "projects" ? (
              <ProjectsPage
                config={configDraft}
                validation={configValidation}
                dirty={configDirty}
                onChange={updateConfigDraft}
              />
            ) : null}
            {route === "policy" ? (
              <PolicyPage
                config={configDraft}
                inventory={inventory}
                matrix={matrix}
                validation={configValidation}
                dirty={configDirty}
                onChange={updateConfigDraft}
                onOpenDocs={openDocsForRoutine}
              />
            ) : null}
            {route === "distribute" ? (
              <Distribute
                planResult={planResult}
                manifestWriteTask={manifestWriteTask}
                distributionApplyTask={distributionApplyTask}
                configValidation={configValidation}
                configDirty={configDirty}
                canGeneratePlan={canGeneratePlan}
                planBlockReasonKey={planBlockReasonKey}
                onGeneratePlan={generatePlan}
                inventory={inventory}
                matrix={matrix}
                config={configDraft}
                isPlanGenerating={isPlanGenerating}
                onWriteManifest={writeManifest}
                onApplyDistribution={applyDistribution}
                isManifestWriting={isManifestWriting}
                isDistributionApplying={isDistributionApplying}
                sourceRepositoryPath={settings?.sourceRepositoryPath}
              />
            ) : null}
            {route === "validation" ? (
              <Validation gates={gates} tasks={tasks} onRunGate={runGate} />
            ) : null}
            {route === "taskCenter" ? (
              <TaskCenter
                tasks={tasks}
                selectedTask={selectedTask}
                onSelect={setSelectedTaskId}
                onCancel={cancelTask}
                onArchive={archiveTask}
                searchText={searchText}
              />
            ) : null}
            {route === "docs" ? (
              <Docs
                docs={docs}
                selectedDoc={selectedDoc}
                onSelect={setSelectedDocId}
                searchText={searchText}
              />
            ) : null}
            {route === "settings" ? (
              <SettingsPage
                settings={settings}
                diagnostics={diagnostics}
                diagnosticsRunning={isDiagnosticsRunning}
                onSettings={updateSettings}
                onChooseSourceRepository={chooseSourceRepository}
                onChooseActiveConfig={chooseActiveConfig}
                onDiagnostics={runDiagnostics}
                focusTarget={settingsPathFocusTarget}
                onFocusHandled={() => setSettingsPathFocusTarget(undefined)}
              />
            ) : null}
          </main>

          {route === "installMatrix" ? (
            <DetailDrawer
              cell={selectedCell}
              matrix={matrix}
              onOpenDocs={openDocsForRoutine}
              onGeneratePlan={() => setRoute("distribute")}
              onClose={() => setSelectedCell(undefined)}
            />
          ) : null}
        </div>

        <footer className="statusbar">
          <span>
            <CheckCircle2 size={14} />
            {getActionStatusText(
              t,
              lastAction,
              isRefreshing,
              isDiagnosticsRunning,
            ) ?? t("statusbar.scan")}
          </span>
          <span>{t("statusbar.config")}</span>
          <span>
            {tasks.some((task) => task.state === "running")
              ? t("taskState.running")
              : t("statusbar.noWrite")}
          </span>
          <span>PowerShell</span>
          <span>Bash</span>
          <span className="statusbar-spacer" />
          <button
            type="button"
            className="statusbar-search"
            onClick={focusGlobalSearch}
            title={t("help.search.title")}
          >
            <Search size={14} />
            {t("statusbar.search")}
          </button>
          <HelpButton topicId="search.global" className="statusbar-help" />
        </footer>
        {activeHelpTopic ? (
          <HelpDialog
            topicId={activeHelpTopic}
            onClose={() => setActiveHelpTopic(undefined)}
          />
        ) : null}
      </div>
    </HelpContext.Provider>
  );
}

function HeaderActions({
  route,
  onRefresh,
  onDiagnostics,
  onGeneratePlan,
  onValidateConfig,
  onSaveConfig,
  onOpenWizard,
  canSaveConfig,
  canGeneratePlan,
  planBlockReasonKey,
  isRefreshing,
  isDiagnosticsRunning,
  isConfigValidating,
  isPlanGenerating,
  actionStatusText,
  configActionStatusText,
}: {
  route: RouteId;
  onRefresh: () => void;
  onDiagnostics: () => void;
  onGeneratePlan: () => void;
  onValidateConfig: () => void;
  onSaveConfig: () => void;
  onOpenWizard: () => void;
  canSaveConfig: boolean;
  canGeneratePlan: boolean;
  planBlockReasonKey?: string;
  isRefreshing: boolean;
  isDiagnosticsRunning: boolean;
  isConfigValidating: boolean;
  isPlanGenerating: boolean;
  actionStatusText?: string;
  configActionStatusText?: string;
}) {
  const { t } = useTranslation();
  if (route === "dashboard") {
    return (
      <div className="header-actions">
        <button
          type="button"
          className="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-busy={isRefreshing}
        >
          <RefreshCcw size={15} />
          {isRefreshing ? t("actions.refreshing") : t("actions.refresh")}
        </button>
        <button
          type="button"
          className="button primary"
          onClick={onDiagnostics}
          disabled={isDiagnosticsRunning}
          aria-busy={isDiagnosticsRunning}
        >
          <ShieldCheck size={15} />
          {isDiagnosticsRunning
            ? t("actions.diagnosticsRunning")
            : t("actions.runDiagnostics")}
        </button>
        {actionStatusText ? (
          <span className="action-feedback" role="status">
            {actionStatusText}
          </span>
        ) : null}
      </div>
    );
  }
  if (route === "distribute") {
    return (
      <div className="header-actions">
        <button
          type="button"
          className={`button primary ${isPlanGenerating ? "is-running" : ""}`}
          onClick={onGeneratePlan}
          disabled={!canGeneratePlan || isPlanGenerating}
          aria-busy={isPlanGenerating}
          title={planBlockReasonKey ? t(planBlockReasonKey) : undefined}
        >
          <Sparkles size={15} />
          {isPlanGenerating
            ? t("actions.generatingPlan")
            : t("actions.generatePlan")}
        </button>
      </div>
    );
  }
  if (route === "projects" || route === "policy") {
    return (
      <div className="header-actions">
        <button
          type="button"
          className={`button ${isConfigValidating ? "is-running" : ""}`}
          onClick={onValidateConfig}
          disabled={isConfigValidating}
          aria-busy={isConfigValidating}
        >
          <ShieldCheck size={15} />
          {isConfigValidating
            ? t("actions.configValidating")
            : t("actions.validateConfig")}
        </button>
        <button
          type="button"
          className="button primary"
          onClick={onSaveConfig}
          disabled={!canSaveConfig}
        >
          <Download size={15} />
          {t("actions.saveAs")}
        </button>
        {configActionStatusText ? (
          <span className="action-feedback" role="status">
            {configActionStatusText}
          </span>
        ) : null}
      </div>
    );
  }
  return (
    <div className="header-actions">
      <button
        type="button"
        className="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-busy={isRefreshing}
      >
        <RefreshCcw size={15} />
        {isRefreshing ? t("actions.refreshing") : t("actions.refresh")}
      </button>
      {route === "installMatrix" ? (
        <button type="button" className="button primary" onClick={onOpenWizard}>
          <RouteIcon size={15} />
          {t("actions.openWizard")}
        </button>
      ) : null}
      {actionStatusText ? (
        <span className="action-feedback" role="status">
          {actionStatusText}
        </span>
      ) : null}
    </div>
  );
}

function Dashboard({
  inventory,
  matrix,
  diagnostics,
  tasks,
  lastRefreshAt,
  diagnosticsRunning,
  onDiagnostics,
  onRoute,
}: {
  inventory?: InventoryScanResult;
  matrix?: InstallMatrixResult;
  diagnostics?: DiagnosticsResult;
  tasks: TaskRecord[];
  lastRefreshAt?: string;
  diagnosticsRunning: boolean;
  onDiagnostics: () => void;
  onRoute: (route: RouteId) => void;
}) {
  const { t } = useTranslation();
  const lastTask = tasks[0];
  let inlineDiagnosticsFeedback: string | undefined;
  if (diagnosticsRunning) {
    inlineDiagnosticsFeedback = t("actions.diagnosticsRunning");
  } else if (diagnostics) {
    inlineDiagnosticsFeedback = t("actions.diagnosticsFinishedAt", {
      time: formatTimestamp(diagnostics.checkedAt),
    });
  }
  return (
    <div className="dashboard-grid">
      <Metric
        label={t("dashboard.inventory")}
        value={t("dashboard.inventoryValue", {
          count: inventory?.counts.skills ?? 0,
        })}
        detail={t("dashboard.inventoryDetail", {
          count: inventory?.counts.workflows ?? 0,
        })}
      />
      <Metric
        label={t("dashboard.installState")}
        value={t("dashboard.sameValue", {
          count: matrix?.summary.same ?? 0,
        })}
        detail={t("dashboard.driftDetail", {
          count: matrix?.summary.drift ?? 0,
        })}
      />
      <Metric
        label={t("dashboard.validation")}
        value={
          diagnostics
            ? t("dashboard.diagnosticsRun")
            : t("dashboard.diagnosticsNotRun")
        }
        detail={
          diagnostics
            ? t("dashboard.diagnosticsDetail", {
                platform: diagnostics.platform,
                time: formatTimestamp(diagnostics.checkedAt),
              })
            : diagnosticsRunning
              ? t("actions.diagnosticsRunning")
              : ""
        }
      />
      <Metric
        label={t("dashboard.lastTask")}
        value={
          lastTask ? t(`taskState.${lastTask.state}`) : t("dashboard.none")
        }
        detail={
          lastTask?.titleKey ? t(lastTask.titleKey) : t("dashboard.zeroFailed")
        }
      />
      <section className="pane dashboard-readiness">
        <PaneTitle helpId="route.dashboard">
          {t("dashboard.readiness")}
        </PaneTitle>
        <StatusLine status="same" text={t("dashboard.repositoryReadable")} />
        <StatusLine
          status={lastRefreshAt ? "same" : "unknown"}
          text={
            lastRefreshAt
              ? t("dashboard.lastRefresh", {
                  time: formatTimestamp(lastRefreshAt),
                })
              : t("dashboard.neverRefreshed")
          }
        />
        <StatusLine
          status={diagnostics ? "same" : "unknown"}
          text={
            diagnostics
              ? t("dashboard.diagnosticsChecked", {
                  time: formatTimestamp(diagnostics.checkedAt),
                })
              : t("dashboard.diagnosticsNotRun")
          }
        />
        <StatusLine status="same" text={t("dashboard.configReviewed")} />
        <div className="inline-actions">
          <button
            type="button"
            className="button"
            onClick={() => onRoute("installMatrix")}
          >
            <TableProperties size={15} />
            {t("nav.installMatrix")}
          </button>
          <button
            type="button"
            className="button"
            onClick={onDiagnostics}
            disabled={diagnosticsRunning}
            aria-busy={diagnosticsRunning}
          >
            <ShieldCheck size={15} />
            {diagnosticsRunning
              ? t("actions.diagnosticsRunning")
              : diagnostics
                ? t("actions.rerunDiagnostics")
                : t("actions.runDiagnostics")}
          </button>
          {inlineDiagnosticsFeedback ? (
            <span className="action-feedback inline-feedback" role="status">
              {inlineDiagnosticsFeedback}
            </span>
          ) : null}
        </div>
      </section>
      <section className="pane dashboard-activity">
        <PaneTitle helpId="route.dashboard">
          {t("dashboard.activity")}
        </PaneTitle>
        {lastRefreshAt ? (
          <StatusLine
            status="same"
            text={t("dashboard.lastRefresh", {
              time: formatTimestamp(lastRefreshAt),
            })}
          />
        ) : null}
        {diagnostics ? (
          <StatusLine
            status="same"
            text={t("dashboard.diagnosticsChecked", {
              time: formatTimestamp(diagnostics.checkedAt),
            })}
          />
        ) : null}
        {tasks.slice(0, 5).map((task) => (
          <StatusLine
            key={task.id}
            status={task.state === "failed" ? "broken" : "same"}
            text={t(task.titleKey)}
          />
        ))}
        {!lastRefreshAt && !diagnostics && tasks.length === 0 ? (
          <span className="muted block-copy">{t("dashboard.noActivity")}</span>
        ) : null}
      </section>
      <section className="pane dashboard-diagnostics-pane">
        <PaneTitle helpId="route.dashboard">
          {t("dashboard.diagnostics")}
        </PaneTitle>
        {diagnostics ? (
          <div className="diagnostic-list dashboard-diagnostics">
            {diagnostics.checks.map((check) => (
              <DiagnosticLine key={check.id} check={check} />
            ))}
          </div>
        ) : (
          <span className="muted block-copy">
            {t("dashboard.diagnosticsNotRun")}
          </span>
        )}
      </section>
    </div>
  );
}

function Inventory({
  inventory,
  searchText,
  onClearSearch,
  onOpenDocs,
}: {
  inventory?: InventoryScanResult;
  searchText: string;
  onClearSearch: () => void;
  onOpenDocs: (routine: RoutineItem) => void;
}) {
  const { t } = useTranslation();
  const [inventorySearch, setInventorySearch] = useState("");
  const [page, setPage] = useState(1);
  const query = [searchText, inventorySearch]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const routines = (inventory?.routines ?? []).filter((routine) =>
    query.every(
      (value) =>
        routine.name.toLowerCase().includes(value) ||
        routine.kind.toLowerCase().includes(value) ||
        routine.recommendedWorkflows.some((workflow) =>
          workflow.toLowerCase().includes(value),
        ),
    ),
  );
  const pageCount = getPageCount(routines.length, INVENTORY_PAGE_SIZE);
  const currentPage = clampPage(page, pageCount);
  const pageRoutines = paginate(routines, currentPage, INVENTORY_PAGE_SIZE);
  const hasSearch = Boolean(searchText.trim() || inventorySearch.trim());
  const resetSearch = () => {
    setInventorySearch("");
    onClearSearch();
  };
  useEffect(() => {
    setPage(1);
  }, [searchText, inventorySearch, inventory?.routines]);
  return (
    <section className="pane fill">
      <div className="list-toolbar">
        <label className="toolbar-search">
          <Search size={15} />
          <input
            value={inventorySearch}
            onChange={(event) => setInventorySearch(event.target.value)}
            placeholder={t("inventory.search")}
          />
        </label>
        <PaginationControls
          page={currentPage}
          pageCount={pageCount}
          total={routines.length}
          onPageChange={setPage}
        />
      </div>
      <div className="table-header inventory-grid">
        <span>{t("inventory.name")}</span>
        <span>{t("inventory.kind")}</span>
        <span>{t("inventory.requiredFiles")}</span>
        <span>{t("inventory.recommended")}</span>
      </div>
      {pageRoutines.map((routine) => (
        <div
          key={`${routine.kind}-${routine.name}`}
          className="table-row inventory-grid"
        >
          <button
            type="button"
            className="routine-doc-button"
            onClick={() => onOpenDocs(routine)}
            title={t("actions.openDocsFor", { name: routine.name })}
          >
            <FileText size={15} />
            <RoutineNameWithKind name={routine.name} kind={routine.kind} />
          </button>
          <RoutineKindIcon kind={routine.kind} />
          <StatusPill
            status={routine.hasRequiredFiles ? "same" : "broken"}
            label={
              routine.hasRequiredFiles
                ? t("inventory.complete")
                : t("inventory.broken")
            }
          />
          <span className="muted">
            {routine.recommendedWorkflows.join(", ") || "-"}
          </span>
        </div>
      ))}
      {routines.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("inventory.empty.title")}
          body={
            hasSearch ? t("inventory.empty.search") : t("inventory.empty.body")
          }
          actionLabel={hasSearch ? t("actions.resetFilters") : undefined}
          onAction={hasSearch ? resetSearch : undefined}
        />
      ) : null}
    </section>
  );
}

function ProjectsPage({
  config,
  validation,
  dirty,
  onChange,
}: {
  config?: InstallDiscoveryConfig;
  validation?: ConfigDraftValidationResult;
  dirty: boolean;
  onChange: (
    updater: (current: InstallDiscoveryConfig) => InstallDiscoveryConfig,
  ) => void;
}) {
  const { t } = useTranslation();
  const [newRoot, setNewRoot] = useState("");
  const [newExclude, setNewExclude] = useState("");

  if (!config) {
    return <Placeholder titleKey="projects.title" bodyKey="config.loading" />;
  }
  const configV2 = toV2Config(config);
  const skippedRoots = configV2.discovery.roots.filter(
    (root) => getNestedRepoMode(config, root) === "skip",
  ).length;
  const enabledProjectTargets = configV2.projectTargets.filter(
    (target) => target.enabled,
  ).length;

  const addRoot = () => {
    const value = newRoot.trim();
    if (!value) {
      return;
    }
    onChange((current) =>
      updateV2Config(current, (draft) => {
        draft.discovery.roots = [...draft.discovery.roots, value];
      }),
    );
    setNewRoot("");
  };

  const addExclude = () => {
    const value = newExclude.trim();
    if (!value) {
      return;
    }
    onChange((current) =>
      updateV2Config(current, (draft) => {
        draft.discovery.excludeDirs = [...draft.discovery.excludeDirs, value];
      }),
    );
    setNewExclude("");
  };

  return (
    <div className="projects-layout">
      <section className="projects-main">
        <div className="projects-summary" aria-label={t("projects.summary")}>
          <div className="project-summary-item">
            <span>{t("projects.summaryRoots")}</span>
            <strong>{configV2.discovery.roots.length}</strong>
            <small>
              {t("projects.summaryDepth", {
                depth: configV2.discovery.maxDepth,
              })}
            </small>
          </div>
          <div className="project-summary-item">
            <span>{t("projects.summaryNested")}</span>
            <strong>{skippedRoots}</strong>
            <small>{t("projects.summaryNestedDetail")}</small>
          </div>
          <div className="project-summary-item">
            <span>{t("projects.summaryOverrides")}</span>
            <strong>{enabledProjectTargets}</strong>
            <small>
              {t("projects.summaryOverridesDetail", {
                count: configV2.projectTargets.length,
              })}
            </small>
          </div>
        </div>
        <section className="pane fill project-roots-pane">
          <PaneTitle helpId="route.projects" className="row-title">
            <span>{t("projects.roots")}</span>
            <ConfigValidationBadge dirty={dirty} validation={validation} />
          </PaneTitle>
          <div className="project-root-table">
            <div className="table-header project-grid">
              <span>{t("projects.rootPath")}</span>
              <span>{t("projects.depth")}</span>
              <span>{t("projects.nestedRepos")}</span>
              <span />
            </div>
            {configV2.discovery.roots.map((root, index) => (
              <div key={`${root}-${index}`} className="table-row project-grid">
                <input
                  value={root}
                  aria-label={`${t("projects.rootPath")} ${index + 1}`}
                  onChange={(event) =>
                    onChange((current) =>
                      replaceProjectRoot(
                        current,
                        index,
                        root,
                        event.target.value,
                      ),
                    )
                  }
                />
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={configV2.discovery.maxDepth}
                  aria-label={t("projects.depth")}
                  onChange={(event) =>
                    onChange((current) =>
                      updateV2Config(current, (draft) => {
                        draft.discovery.maxDepth = Number(event.target.value);
                      }),
                    )
                  }
                />
                <Segmented
                  label={t("projects.nestedRepos")}
                  value={getNestedRepoMode(config, root)}
                  options={[
                    ["skip", t("projects.skip"), ShieldCheck],
                    ["include", t("projects.include"), FolderTree],
                  ]}
                  onChange={(value) =>
                    onChange((current) =>
                      setNestedRepoMode(current, root, value === "skip"),
                    )
                  }
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t("actions.remove")}
                  onClick={() =>
                    onChange((current) =>
                      removeProjectRoot(current, index, root),
                    )
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="editor-row project-root-add">
            <input
              value={newRoot}
              onChange={(event) => setNewRoot(event.target.value)}
              placeholder={t("projects.addRootPlaceholder")}
            />
            <button type="button" className="compact-button" onClick={addRoot}>
              <Plus size={14} />
              {t("projects.addRoot")}
            </button>
          </div>
        </section>
      </section>
      <aside className="pane side-panel project-inspector">
        <PaneTitle helpId="route.projects">
          {t("projects.excludedDirs")}
        </PaneTitle>
        <div className="token-list">
          {configV2.discovery.excludeDirs.map((dir, index) => (
            <span key={`${dir}-${index}`} className="token">
              <code>{dir}</code>
              <button
                type="button"
                aria-label={t("actions.remove")}
                onClick={() =>
                  onChange((current) =>
                    updateV2Config(current, (draft) => {
                      draft.discovery.excludeDirs =
                        draft.discovery.excludeDirs.filter(
                          (_, itemIndex) => itemIndex !== index,
                        );
                    }),
                  )
                }
              >
                <XCircle size={13} />
              </button>
            </span>
          ))}
        </div>
        <div className="editor-row stacked">
          <input
            value={newExclude}
            onChange={(event) => setNewExclude(event.target.value)}
            placeholder={t("projects.addExcludePlaceholder")}
          />
          <button type="button" className="compact-button" onClick={addExclude}>
            <Plus size={14} />
            {t("projects.addExclude")}
          </button>
        </div>
        <div className="project-target-list">
          <PaneTitle helpId="route.projects">
            {t("projects.projectOverrides")}
          </PaneTitle>
          {configV2.projectTargets.length > 0 ? (
            configV2.projectTargets.map((target) => (
              <div key={target.path} className="target-line">
                <span title={target.path}>{middleEllipsis(target.path)}</span>
                <StatusPill
                  status={target.enabled ? "same" : "unknown"}
                  label={
                    target.enabled
                      ? t("projects.enabled")
                      : t("projects.disabled")
                  }
                />
                <ToolBadgeList tools={target.tools} />
                <button
                  type="button"
                  className="compact-button"
                  onClick={() =>
                    onChange((current) =>
                      keepOnlyProjectTarget(current, target.path),
                    )
                  }
                >
                  <Filter size={14} />
                  {t("projects.keepOnlyThisProject")}
                </button>
              </div>
            ))
          ) : (
            <span className="muted block-copy">
              {t("projects.noProjectOverrides")}
            </span>
          )}
        </div>
        <section className="project-validation-panel">
          <PaneTitle helpId="route.projects">
            {t("projects.validationMessages")}
          </PaneTitle>
          <ValidationMessages validation={validation} />
        </section>
      </aside>
    </div>
  );
}

function PolicyPage({
  config,
  inventory,
  matrix,
  validation,
  dirty,
  onChange,
  onOpenDocs,
}: {
  config?: InstallDiscoveryConfig;
  inventory?: InventoryScanResult;
  matrix?: InstallMatrixResult;
  validation?: ConfigDraftValidationResult;
  dirty: boolean;
  onChange: (
    updater: (current: InstallDiscoveryConfig) => InstallDiscoveryConfig,
  ) => void;
  onOpenDocs: (
    routine: RoutineItem,
    docKind?: "readme" | "instruction",
  ) => void;
}) {
  const { t } = useTranslation();
  const [selectedProjectPath, setSelectedProjectPath] = useState("");
  const [newProjectPath, setNewProjectPath] = useState("");
  const [activePolicyPane, setActivePolicyPane] =
    useState<PolicyPaneId>("user");

  if (!config) {
    return <Placeholder titleKey="policy.title" bodyKey="config.loading" />;
  }
  const configV2 = toV2Config(config);

  const skills = (inventory?.routines ?? []).filter(
    (routine) => routine.kind === "skill",
  );
  const workflows = (inventory?.routines ?? []).filter(
    (routine) => routine.kind === "workflow",
  );
  const projectCandidates = buildProjectCandidates(configV2, inventory, matrix);
  const activeProjectTarget =
    configV2.projectTargets.find(
      (target) => target.path === selectedProjectPath,
    ) ?? configV2.projectTargets[0];
  const recommendations = buildPolicyRecommendations(
    t,
    configV2,
    skills,
    workflows,
    projectCandidates,
  );
  const userSkillCount =
    configV2.userTargets.skills.codex.length +
    configV2.userTargets.skills.claudeCode.length;
  const projectDefaultCount =
    configV2.projectDefaults.skills.codex.length +
    configV2.projectDefaults.skills.claudeCode.length +
    configV2.projectDefaults.workflows.length;
  const openRecommendationCount = recommendations.filter(
    (item) => !item.configured,
  ).length;
  const policyTabs: Array<{
    id: PolicyPaneId;
    label: string;
    count: number;
    icon: ComponentType<{ size?: number }>;
  }> = [
    {
      id: "user",
      label: t("policy.tabs.user"),
      count: userSkillCount + configV2.userTargets.workflows.length,
      icon: Users,
    },
    {
      id: "projectDefaults",
      label: t("policy.tabs.projectDefaults"),
      count: projectDefaultCount,
      icon: ShieldCheck,
    },
    {
      id: "projectTargets",
      label: t("policy.tabs.projectTargets"),
      count: configV2.projectTargets.length,
      icon: FolderTree,
    },
    {
      id: "recommendations",
      label: t("policy.tabs.recommendations"),
      count: openRecommendationCount,
      icon: Sparkles,
    },
  ];

  const addProject = (pathValue = newProjectPath.trim()) => {
    const value = pathValue.trim();
    if (!value) {
      return;
    }
    onChange((current) => addProjectTarget(current, value));
    setSelectedProjectPath(value);
    setNewProjectPath("");
  };

  return (
    <div className="policy-layout">
      <section className="policy-main">
        <div className="projects-summary" aria-label={t("policy.summary")}>
          <div className="project-summary-item">
            <span>{t("policy.summaryUser")}</span>
            <strong>
              {userSkillCount + configV2.userTargets.workflows.length}
            </strong>
            <small>
              {configV2.userTargets.enabled ? (
                <ToolBadgeList tools={configV2.userTargets.tools} />
              ) : (
                t("projects.disabled")
              )}
            </small>
          </div>
          <div className="project-summary-item">
            <span>{t("policy.summaryProjectDefaults")}</span>
            <strong>{projectDefaultCount}</strong>
            <small>
              {configV2.projectDefaults.enabled ? (
                <ToolBadgeList tools={configV2.projectDefaults.tools} />
              ) : (
                t("projects.disabled")
              )}
            </small>
          </div>
          <div className="project-summary-item">
            <span>{t("policy.summaryRecommendations")}</span>
            <strong>{openRecommendationCount}</strong>
            <small>
              {t("policy.summaryProjectOverrides", {
                count: configV2.projectTargets.length,
              })}
            </small>
          </div>
        </div>
        <section className="pane fill policy-workbench">
          <div className="policy-workbench-head">
            <PaneTitle helpId="route.policy" className="row-title">
              <span>{t("policy.available")}</span>
              <ConfigValidationBadge dirty={dirty} validation={validation} />
            </PaneTitle>
            <div
              className="policy-tabs"
              role="tablist"
              aria-label={t("policy.available")}
            >
              {policyTabs.map(({ id, label, count, icon: Icon }) => (
                <button
                  key={id}
                  id={`policy-tab-${id}`}
                  type="button"
                  role="tab"
                  aria-selected={activePolicyPane === id}
                  aria-controls={`policy-panel-${id}`}
                  className={
                    activePolicyPane === id ? "policy-tab active" : "policy-tab"
                  }
                  onClick={() => setActivePolicyPane(id)}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                  <strong>{count}</strong>
                </button>
              ))}
            </div>
          </div>
          <div className="policy-all-sections policy-tab-panels">
            <section
              id="policy-panel-user"
              className="policy-group"
              role="tabpanel"
              aria-labelledby="policy-tab-user"
              hidden={activePolicyPane !== "user"}
            >
              <div className="policy-group-header">
                <h3>{t("policy.tabs.user")}</h3>
                <div className="policy-mode-strip">
                  <label className="policy-toggle-row">
                    <input
                      type="checkbox"
                      checked={configV2.userTargets.enabled}
                      onChange={(event) =>
                        onChange((current) =>
                          updateV2Config(current, (draft) => {
                            draft.userTargets.enabled = event.target.checked;
                          }),
                        )
                      }
                    />
                    <span>{t("policy.userTargetsEnabled")}</span>
                  </label>
                </div>
              </div>
              <div className="policy-section-grid">
                <PolicySection
                  title={
                    <ToolSkillHeading
                      title={t("policy.userCodexSkills")}
                      scopeLabel={t("policy.scope.userLevel")}
                      tool="codex"
                    />
                  }
                  description={t("policy.help.userCodexSkills")}
                  target={{ kind: "skill", scope: "user", tool: "codex" }}
                  routines={skills}
                  selected={configV2.userTargets.skills.codex}
                  onChange={onChange}
                  onOpenDocs={onOpenDocs}
                />
                <PolicySection
                  title={
                    <ToolSkillHeading
                      title={t("policy.userClaudeSkills")}
                      scopeLabel={t("policy.scope.userLevel")}
                      tool="claudeCode"
                    />
                  }
                  description={t("policy.help.userClaudeSkills")}
                  target={{ kind: "skill", scope: "user", tool: "claudeCode" }}
                  routines={skills}
                  selected={configV2.userTargets.skills.claudeCode}
                  onChange={onChange}
                  onOpenDocs={onOpenDocs}
                />
                <PolicySection
                  title={
                    <RoutineScopeHeading
                      title={t("policy.userLevelWorkflows")}
                      scopeLabel={t("policy.scope.userShared")}
                      kind="workflow"
                    />
                  }
                  description={t("policy.help.userWorkflows")}
                  target={{ kind: "workflow", scope: "user" }}
                  routines={workflows}
                  selected={configV2.userTargets.workflows}
                  onChange={onChange}
                  onOpenDocs={onOpenDocs}
                />
                <PolicySection
                  title={
                    <RoutineScopeHeading
                      title={t("policy.doNotPromoteToUserSkills")}
                      scopeLabel={t("policy.scope.exclusions")}
                      kind="skill"
                    />
                  }
                  description={t("policy.help.doNotPromote")}
                  target={{ kind: "protection" }}
                  routines={skills}
                  selected={configV2.promotionRules.doNotPromoteToUserSkills}
                  onChange={onChange}
                  onOpenDocs={onOpenDocs}
                />
              </div>
            </section>

            <section
              id="policy-panel-projectDefaults"
              className="policy-group"
              role="tabpanel"
              aria-labelledby="policy-tab-projectDefaults"
              hidden={activePolicyPane !== "projectDefaults"}
            >
              <div className="policy-group-header">
                <h3>{t("policy.tabs.projectDefaults")}</h3>
                <div className="policy-mode-strip">
                  <label className="policy-toggle-row">
                    <input
                      type="checkbox"
                      checked={configV2.projectDefaults.enabled}
                      onChange={(event) =>
                        onChange((current) =>
                          updateV2Config(current, (draft) => {
                            draft.projectDefaults.enabled =
                              event.target.checked;
                          }),
                        )
                      }
                    />
                    <span>{t("policy.projectDefaultsEnabled")}</span>
                  </label>
                  <label className="policy-toggle-row">
                    <input
                      type="checkbox"
                      checked={configV2.projectDefaults.createTargets}
                      onChange={(event) =>
                        onChange((current) =>
                          updateV2Config(current, (draft) => {
                            draft.projectDefaults.createTargets =
                              event.target.checked;
                          }),
                        )
                      }
                    />
                    <span>{t("policy.createProjectTargets")}</span>
                  </label>
                  <Segmented
                    label={t("distribute.mode.title")}
                    value={configV2.projectDefaults.mode}
                    options={[
                      ["merge", t("distribute.mode.merge"), ShieldCheck],
                      [
                        "replace-listed",
                        t("distribute.mode.replace-listed"),
                        RefreshCcw,
                      ],
                    ]}
                    onChange={(value) =>
                      onChange((current) =>
                        updateV2Config(current, (draft) => {
                          draft.projectDefaults.mode = value as Exclude<
                            ApplyMode,
                            "dry-run" | "sync-prune"
                          >;
                        }),
                      )
                    }
                  />
                </div>
              </div>
              <div className="policy-section-grid">
                <PolicySection
                  title={
                    <ToolSkillHeading
                      title={t("policy.projectDefaultCodexSkills")}
                      scopeLabel={t("policy.scope.projectDefault")}
                      tool="codex"
                    />
                  }
                  description={t("policy.help.projectDefaultCodexSkills")}
                  target={{
                    kind: "skill",
                    scope: "projectDefaults",
                    tool: "codex",
                  }}
                  routines={skills}
                  selected={configV2.projectDefaults.skills.codex}
                  onChange={onChange}
                  onOpenDocs={onOpenDocs}
                />
                <PolicySection
                  title={
                    <ToolSkillHeading
                      title={t("policy.projectDefaultClaudeSkills")}
                      scopeLabel={t("policy.scope.projectDefault")}
                      tool="claudeCode"
                    />
                  }
                  description={t("policy.help.projectDefaultClaudeSkills")}
                  target={{
                    kind: "skill",
                    scope: "projectDefaults",
                    tool: "claudeCode",
                  }}
                  routines={skills}
                  selected={configV2.projectDefaults.skills.claudeCode}
                  onChange={onChange}
                  onOpenDocs={onOpenDocs}
                />
                <PolicySection
                  title={
                    <RoutineScopeHeading
                      title={t("policy.projectDefaultWorkflows")}
                      scopeLabel={t("policy.scope.projectDefaultShared")}
                      kind="workflow"
                    />
                  }
                  description={t("policy.help.projectWorkflows")}
                  target={{ kind: "workflow", scope: "projectDefaults" }}
                  routines={workflows}
                  selected={configV2.projectDefaults.workflows}
                  onChange={onChange}
                  onOpenDocs={onOpenDocs}
                />
              </div>
            </section>

            <section
              id="policy-panel-projectTargets"
              className="policy-group"
              role="tabpanel"
              aria-labelledby="policy-tab-projectTargets"
              hidden={activePolicyPane !== "projectTargets"}
            >
              <div className="policy-group-header">
                <h3>{t("policy.tabs.projectTargets")}</h3>
              </div>
              <div className="policy-project-grid">
                <section className="policy-section policy-project-list">
                  <h3>{t("policy.projectTargets")}</h3>
                  <div className="editor-row">
                    <input
                      value={newProjectPath}
                      onChange={(event) =>
                        setNewProjectPath(event.target.value)
                      }
                      placeholder={t("policy.addProjectPlaceholder")}
                    />
                    <button
                      type="button"
                      className="compact-button"
                      onClick={() => addProject()}
                    >
                      <Plus size={14} />
                      {t("policy.addProject")}
                    </button>
                  </div>
                  <div className="policy-project-candidates">
                    {projectCandidates.map((pathValue) => {
                      const configured = configV2.projectTargets.some(
                        (target) => target.path === pathValue,
                      );
                      return (
                        <button
                          key={pathValue}
                          type="button"
                          title={pathValue}
                          className={
                            activeProjectTarget?.path === pathValue
                              ? "project-candidate active"
                              : "project-candidate"
                          }
                          onClick={() =>
                            configured
                              ? setSelectedProjectPath(pathValue)
                              : addProject(pathValue)
                          }
                        >
                          <span>{middleEllipsis(pathValue)}</span>
                          <small>
                            {configured
                              ? t("policy.projectConfigured")
                              : t("policy.projectCandidate")}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                </section>
                {activeProjectTarget ? (
                  <section className="policy-project-editor">
                    <div className="pane nested-pane">
                      <PaneTitle helpId="route.policy" className="row-title">
                        <span>{t("policy.projectTargetEditor")}</span>
                        <StatusPill
                          status={
                            activeProjectTarget.enabled ? "same" : "unknown"
                          }
                          label={
                            activeProjectTarget.enabled
                              ? t("projects.enabled")
                              : t("projects.disabled")
                          }
                        />
                      </PaneTitle>
                      <PathValue value={activeProjectTarget.path} />
                      <div className="policy-settings-list">
                        <label className="policy-toggle-row">
                          <input
                            type="checkbox"
                            checked={activeProjectTarget.enabled}
                            onChange={(event) =>
                              onChange((current) =>
                                updateProjectTarget(
                                  current,
                                  activeProjectTarget.path,
                                  (target) => {
                                    target.enabled = event.target.checked;
                                  },
                                ),
                              )
                            }
                          />
                          <span>{t("policy.projectTargetEnabled")}</span>
                        </label>
                        <Segmented
                          label={t("distribute.mode.title")}
                          value={activeProjectTarget.mode}
                          options={[
                            ["merge", t("distribute.mode.merge"), ShieldCheck],
                            [
                              "replace-listed",
                              t("distribute.mode.replace-listed"),
                              RefreshCcw,
                            ],
                          ]}
                          onChange={(value) =>
                            onChange((current) =>
                              updateProjectTarget(
                                current,
                                activeProjectTarget.path,
                                (target) => {
                                  target.mode = value as Exclude<
                                    ApplyMode,
                                    "dry-run" | "sync-prune"
                                  >;
                                },
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="policy-section-grid nested-policy-grid">
                      <PolicySection
                        title={
                          <ToolSkillHeading
                            title={t("policy.projectCodexSkills")}
                            scopeLabel={t("policy.scope.project")}
                            tool="codex"
                          />
                        }
                        description={t("policy.help.projectCodexSkills")}
                        target={{
                          kind: "skill",
                          scope: "projectTarget",
                          tool: "codex",
                          projectPath: activeProjectTarget.path,
                        }}
                        routines={skills}
                        selected={activeProjectTarget.skills.codex}
                        onChange={onChange}
                        onOpenDocs={onOpenDocs}
                      />
                      <PolicySection
                        title={
                          <ToolSkillHeading
                            title={t("policy.projectClaudeSkills")}
                            scopeLabel={t("policy.scope.project")}
                            tool="claudeCode"
                          />
                        }
                        description={t("policy.help.projectClaudeSkills")}
                        target={{
                          kind: "skill",
                          scope: "projectTarget",
                          tool: "claudeCode",
                          projectPath: activeProjectTarget.path,
                        }}
                        routines={skills}
                        selected={activeProjectTarget.skills.claudeCode}
                        onChange={onChange}
                        onOpenDocs={onOpenDocs}
                      />
                      <PolicySection
                        title={
                          <RoutineScopeHeading
                            title={t("policy.projectWorkflows")}
                            scopeLabel={t("policy.scope.projectShared")}
                            kind="workflow"
                          />
                        }
                        description={t("policy.help.projectWorkflows")}
                        target={{
                          kind: "workflow",
                          scope: "projectTarget",
                          projectPath: activeProjectTarget.path,
                        }}
                        routines={workflows}
                        selected={activeProjectTarget.workflows}
                        onChange={onChange}
                        onOpenDocs={onOpenDocs}
                      />
                    </div>
                  </section>
                ) : (
                  <section className="pane nested-pane">
                    <PaneTitle helpId="route.policy">
                      {t("policy.projectTargetEditor")}
                    </PaneTitle>
                    <span className="muted block-copy">
                      {t("projects.noProjectOverrides")}
                    </span>
                  </section>
                )}
              </div>
            </section>

            <section
              id="policy-panel-recommendations"
              className="policy-group"
              role="tabpanel"
              aria-labelledby="policy-tab-recommendations"
              hidden={activePolicyPane !== "recommendations"}
            >
              <div className="policy-group-header">
                <h3>{t("policy.tabs.recommendations")}</h3>
              </div>
              <PolicyRecommendations
                recommendations={recommendations}
                onChange={onChange}
                onOpenDocs={onOpenDocs}
              />
            </section>
          </div>
        </section>
      </section>
      <section className="pane side-panel">
        <PaneTitle helpId="route.policy">
          {t("policy.validationMessages")}
        </PaneTitle>
        <ValidationMessages validation={validation} />
        <div className="policy-meta">
          <StatusLine
            status="same"
            text={t("policy.meta.userDefaults", {
              value: configV2.userTargets.enabled
                ? toolTargetCountLabel(t, configV2.userTargets.tools)
                : t("projects.disabled"),
            })}
          />
          <StatusLine
            status="same"
            text={t("policy.meta.projectDefaults", {
              value: configV2.projectDefaults.enabled
                ? `${toolTargetCountLabel(t, configV2.projectDefaults.tools)} / ${
                    configV2.projectDefaults.mode
                  }`
                : t("projects.disabled"),
            })}
          />
          <StatusLine
            status="same"
            text={t("policy.meta.unknownInstalledItems", {
              value: t("policy.values.reportOnly"),
            })}
          />
        </div>
      </section>
    </div>
  );
}

function PolicySection({
  title,
  description,
  target,
  routines,
  selected,
  onChange,
  onOpenDocs,
}: {
  title: ReactNode;
  description: string;
  target: PolicySelectionTarget;
  routines: InventoryScanResult["routines"];
  selected: string[];
  onChange: (
    updater: (current: InstallDiscoveryConfig) => InstallDiscoveryConfig,
  ) => void;
  onOpenDocs: (
    routine: RoutineItem,
    docKind?: "readme" | "instruction",
  ) => void;
}) {
  const { t } = useTranslation();
  const targetKey = policyTargetKey(target);
  const selectedNames = new Set(selected);
  const selectedRoutines = routines.filter((routine) =>
    selectedNames.has(routine.name),
  );
  const pendingRoutines = routines.filter(
    (routine) => !selectedNames.has(routine.name),
  );
  const routineGroups = [
    {
      key: "selected",
      title: t("policy.routineGroup.selected"),
      routines: selectedRoutines,
    },
    {
      key: "pending",
      title: t("policy.routineGroup.pending"),
      routines: pendingRoutines,
    },
  ].filter((group) => group.routines.length > 0);
  const renderRoutineRow = (routine: RoutineItem) => {
    const checked = selectedNames.has(routine.name);
    const inputId = `${targetKey}-${routine.name}`;
    return (
      <div
        key={`${targetKey}-${routine.name}`}
        className={`checkbox-row policy-checkbox-row ${
          checked ? "is-selected" : ""
        }`}
      >
        <input
          id={inputId}
          type="checkbox"
          aria-label={routine.name}
          checked={checked}
          onChange={(event) =>
            onChange((current) =>
              togglePolicyItem(
                current,
                target,
                routine.name,
                event.target.checked,
              ),
            )
          }
        />
        <label htmlFor={inputId} className="policy-routine-copy">
          <code>{routine.name}</code>
          <small>
            {routineDisplayCopy(t, routine.description || routine.summary)}
          </small>
        </label>
        <button
          type="button"
          className="icon-button"
          aria-label={t("actions.openDocsFor", { name: routine.name })}
          onClick={() => onOpenDocs(routine)}
        >
          <FileText size={14} />
        </button>
        <StatusPill
          status={routine.hasRequiredFiles ? "same" : "broken"}
          label={
            routine.hasRequiredFiles
              ? t("inventory.complete")
              : t("inventory.broken")
          }
        />
      </div>
    );
  };
  return (
    <section className="policy-section">
      <h3>{title}</h3>
      <p className="policy-section-description">{description}</p>
      <div className="selected-strip">
        {selected.length > 0 ? (
          selected.map((name, index) => (
            <span
              key={`${targetKey}-${name}-${index}`}
              className="selected-token"
            >
              <code>{name}</code>
              <button
                type="button"
                aria-label={t("actions.moveUp")}
                disabled={index === 0}
                onClick={() =>
                  onChange((current) =>
                    movePolicyItem(current, target, index, -1),
                  )
                }
              >
                <ArrowUp size={12} />
              </button>
              <button
                type="button"
                aria-label={t("actions.moveDown")}
                disabled={index === selected.length - 1}
                onClick={() =>
                  onChange((current) =>
                    movePolicyItem(current, target, index, 1),
                  )
                }
              >
                <ArrowDown size={12} />
              </button>
            </span>
          ))
        ) : (
          <span className="selected-empty">{t("policy.noSelectedItems")}</span>
        )}
      </div>
      <div className="policy-routine-list">
        {routineGroups.map((group) => (
          <div
            key={`${targetKey}-${group.key}`}
            className="policy-routine-group"
          >
            <div className="policy-routine-group-header">
              <span>{group.title}</span>
              <strong>{group.routines.length}</strong>
            </div>
            {group.routines.map(renderRoutineRow)}
          </div>
        ))}
      </div>
    </section>
  );
}

function PolicyRecommendations({
  recommendations,
  onChange,
  onOpenDocs,
}: {
  recommendations: PolicyRecommendation[];
  onChange: (
    updater: (current: InstallDiscoveryConfig) => InstallDiscoveryConfig,
  ) => void;
  onOpenDocs: (
    routine: RoutineItem,
    docKind?: "readme" | "instruction",
  ) => void;
}) {
  const { t } = useTranslation();
  const groups: Array<[PolicyRecommendationCategory, string]> = [
    ["user-reuse", t("policy.recommend.userReuse")],
    ["project-specific", t("policy.recommend.projectSpecific")],
    ["workflow-runtime", t("policy.recommend.workflowRuntime")],
  ];
  const markerLabels: Record<PolicyRecommendationCategory, string> = {
    "user-reuse": t("policy.recommend.marker.userReuse"),
    "project-specific": t("policy.recommend.marker.projectSpecific"),
    "workflow-runtime": t("policy.recommend.marker.workflowRuntime"),
  };
  return (
    <div className="policy-recommendation-groups">
      {groups.map(([category, title]) => {
        const items = recommendations.filter(
          (recommendation) => recommendation.category === category,
        );
        return (
          <section key={category} className="policy-recommendation-group">
            <h3>{title}</h3>
            <div className="policy-recommendation-list">
              {items.map((recommendation) => (
                <article
                  key={recommendation.id}
                  className="policy-recommendation-card"
                >
                  <div className="recommendation-card-main">
                    <div className="recommendation-title-row">
                      <StatusPill
                        status={recommendation.configured ? "same" : "missing"}
                        label={
                          recommendation.configured
                            ? t("policy.recommend.configured")
                            : t("policy.recommend.notConfigured")
                        }
                      />
                      <code>{recommendation.routine.name}</code>
                      <span
                        className={`recommendation-marker marker-${recommendation.category}`}
                        title={recommendation.reason}
                      >
                        {markerLabels[recommendation.category]}
                      </span>
                    </div>
                    <small className="recommendation-description">
                      {routineDisplayCopy(
                        t,
                        recommendation.routine.description ||
                          recommendation.routine.summary,
                      )}
                    </small>
                  </div>
                  <div className="recommendation-meta">
                    {recommendation.workflowNames.length > 0 ? (
                      <div className="recommendation-chip-row">
                        <span>{t("policy.recommend.relatedWorkflows")}</span>
                        <div className="recommendation-chip-list">
                          {recommendation.workflowNames.map((workflow) => (
                            <code key={workflow}>{workflow}</code>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {recommendation.projectPaths.length > 0 ? (
                      <div className="recommendation-chip-row">
                        <span>{t("policy.recommend.applicableProjects")}</span>
                        <div className="recommendation-chip-list">
                          {recommendation.projectPaths.map((projectPath) => (
                            <code key={projectPath} title={projectPath}>
                              {middleEllipsis(projectPath)}
                            </code>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="recommendation-actions">
                    <button
                      type="button"
                      className="compact-button"
                      onClick={() => onOpenDocs(recommendation.routine)}
                    >
                      <FileText size={14} />
                      {t("docs.readme")}
                    </button>
                    {recommendation.routine.kind === "skill" ? (
                      <button
                        type="button"
                        className="compact-button"
                        onClick={() =>
                          onOpenDocs(recommendation.routine, "instruction")
                        }
                      >
                        <ClipboardCheck size={14} />
                        {t("docs.skillInstruction")}
                      </button>
                    ) : null}
                    {recommendation.routine.kind === "skill" ? (
                      <>
                        <button
                          type="button"
                          className="compact-button primary-action"
                          onClick={() =>
                            onChange((current) =>
                              addSkillToBothTools(
                                current,
                                recommendation.category === "user-reuse"
                                  ? "user"
                                  : "projectDefaults",
                                recommendation.routine.name,
                              ),
                            )
                          }
                        >
                          <Plus size={14} />
                          {recommendation.category === "user-reuse"
                            ? t("policy.actions.addUserBoth")
                            : t("policy.actions.addProjectDefaults")}
                        </button>
                        {recommendation.projectPaths[0] ? (
                          <button
                            type="button"
                            className="compact-button primary-action"
                            onClick={() =>
                              onChange((current) =>
                                addSkillToBothTools(
                                  current,
                                  "projectTarget",
                                  recommendation.routine.name,
                                  recommendation.projectPaths[0],
                                ),
                              )
                            }
                          >
                            <Plus size={14} />
                            {t("policy.actions.addFirstProject")}
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="compact-button primary-action"
                          onClick={() =>
                            onChange((current) =>
                              addPolicyName(
                                current,
                                { kind: "workflow", scope: "user" },
                                recommendation.routine.name,
                              ),
                            )
                          }
                        >
                          <Plus size={14} />
                          {t("policy.actions.addUserRuntime")}
                        </button>
                        <button
                          type="button"
                          className="compact-button primary-action"
                          onClick={() =>
                            onChange((current) =>
                              addPolicyName(
                                current,
                                { kind: "workflow", scope: "projectDefaults" },
                                recommendation.routine.name,
                              ),
                            )
                          }
                        >
                          <Plus size={14} />
                          {t("policy.actions.addProjectRuntime")}
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function InstallMatrix({
  matrix,
  statusFilter,
  setStatusFilter,
  kindFilter,
  setKindFilter,
  toolFilter,
  setToolFilter,
  searchText,
  setSearchText,
  selectedCell,
  setSelectedCell,
}: {
  matrix?: InstallMatrixResult;
  statusFilter: InstallStatus | "all";
  setStatusFilter: (status: InstallStatus | "all") => void;
  kindFilter: RoutineKind | "all";
  setKindFilter: (kind: RoutineKind | "all") => void;
  toolFilter: ToolKind | "all";
  setToolFilter: (tool: ToolKind | "all") => void;
  searchText: string;
  setSearchText: (value: string) => void;
  selectedCell?: InstallMatrixCell;
  setSelectedCell: (cell: InstallMatrixCell | undefined) => void;
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const visibleColumns = matrixColumns.filter(
    (column) => toolFilter === "all" || column.tool === toolFilter,
  );
  const rows = (matrix?.rows ?? []).filter((row) => {
    const matchesSearch = row.routine.name
      .toLowerCase()
      .includes(searchText.toLowerCase());
    const matchesKind = kindFilter === "all" || row.routine.kind === kindFilter;
    const matchesStatus =
      statusFilter === "all" ||
      row.cells.some(
        (cell) =>
          visibleColumns.some((column) => column.id === cell.columnId) &&
          cell.status === statusFilter,
      );
    return matchesSearch && matchesKind && matchesStatus;
  });
  const pageCount = getPageCount(rows.length, MATRIX_PAGE_SIZE);
  const currentPage = clampPage(page, pageCount);
  const pageRows = paginate(rows, currentPage, MATRIX_PAGE_SIZE);
  const hasActiveFilters =
    kindFilter !== "all" ||
    toolFilter !== "all" ||
    statusFilter !== "all" ||
    Boolean(searchText.trim());
  const resetFilters = () => {
    setKindFilter("all");
    setToolFilter("all");
    setStatusFilter("all");
    setSearchText("");
  };
  useEffect(() => {
    setPage(1);
  }, [searchText, statusFilter, kindFilter, toolFilter, matrix?.rows]);

  return (
    <div className="matrix-view">
      <div className="compact-viewport-note" role="status">
        <AlertTriangle size={15} />
        <span>{t("matrix.narrowLayout")}</span>
      </div>
      <section className="pane matrix-toolbar">
        <div className="filter-row">
          <MatrixFilterGroup<RoutineKind | "all">
            label={t("matrix.filters.allRoutines")}
            value={kindFilter}
            options={[
              {
                value: "all",
                label: t("matrix.filters.allRoutines"),
                icon: Boxes,
              },
              {
                value: "skill",
                label: t("matrix.filters.skills"),
                kind: "skill",
              },
              {
                value: "workflow",
                label: t("matrix.filters.workflows"),
                kind: "workflow",
              },
            ]}
            onChange={setKindFilter}
          />
          <MatrixFilterGroup<ToolKind | "all">
            label={t("matrix.filters.allTools")}
            value={toolFilter}
            options={[
              { value: "all", label: t("matrix.filters.allTools"), icon: Eye },
              {
                value: "codex",
                label: t("matrix.tools.codex"),
                tool: "codex",
              },
              {
                value: "claude-code",
                label: t("matrix.tools.claudeCode"),
                tool: "claude-code",
              },
              {
                value: "shared-workflow-runtime",
                label: t("matrix.tools.sharedWorkflowRuntime"),
                icon: Network,
              },
            ]}
            onChange={setToolFilter}
          />
          <MatrixFilterGroup<InstallStatus | "all">
            label={t("matrix.filters.allStatus")}
            value={statusFilter}
            options={[
              {
                value: "all",
                label: t("matrix.filters.allStatus"),
                icon: ListChecks,
              },
              ...statusKeys.map((status) => ({
                value: status,
                label: t(`status.${status}`),
                status,
              })),
            ]}
            onChange={setStatusFilter}
          />
        </div>
        <label className="toolbar-search">
          <Search size={15} />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={t("matrix.search")}
          />
        </label>
        <div className="matrix-toolbar-meta">
          <span className="view-options">
            <Eye size={16} />
            {t("matrix.viewOptions")}
          </span>
          <span className="muted">
            {t("matrix.cells", { count: rows.length * visibleColumns.length })}
          </span>
        </div>
        <PaginationControls
          page={currentPage}
          pageCount={pageCount}
          total={rows.length}
          onPageChange={setPage}
        />
      </section>

      <section className="pane matrix-table-card">
        <div className="matrix-scroll">
          <section
            className="matrix-grid"
            aria-label={t("matrix.title")}
            style={{
              gridTemplateColumns: `minmax(240px, 1.2fr) repeat(${visibleColumns.length}, minmax(116px, 1fr))`,
            }}
          >
            <div className="matrix-header routine-column">
              {t("matrix.columns.routine")}
            </div>
            {visibleColumns.map((column) => (
              <div key={column.id} className="matrix-header">
                <MatrixColumnTitle column={column} />
                <small>{t(column.metaKey)}</small>
              </div>
            ))}
            {pageRows.map((row) => (
              <RowFragment key={`${row.routine.kind}-${row.routine.name}`}>
                <button
                  type="button"
                  className="routine-cell"
                  onClick={() => setSelectedCell(row.cells[0])}
                >
                  <RoutineNameWithKind
                    name={row.routine.name}
                    kind={row.routine.kind}
                  />
                </button>
                {visibleColumns.map((column) => {
                  const cell = row.cells.find(
                    (item) => item.columnId === column.id,
                  );
                  if (!cell) {
                    return null;
                  }
                  return (
                    <button
                      key={`${cell.routineName}-${cell.columnId}`}
                      type="button"
                      className={
                        selectedCell === cell
                          ? "matrix-cell selected"
                          : "matrix-cell"
                      }
                      onClick={() => setSelectedCell(cell)}
                    >
                      <StatusPill status={cell.status} />
                    </button>
                  );
                })}
              </RowFragment>
            ))}
          </section>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={Search}
            title={t("matrix.empty.title")}
            body={
              hasActiveFilters
                ? t("matrix.empty.search")
                : t("matrix.empty.body")
            }
            actionLabel={
              hasActiveFilters ? t("actions.resetFilters") : undefined
            }
            onAction={hasActiveFilters ? resetFilters : undefined}
          />
        ) : null}
      </section>

      <section className="pane legend matrix-summary">
        {statusKeys.map((status) => (
          <StatusPill
            key={status}
            status={status}
            label={`${t(`status.${status}`)} ${matrix?.summary[status] ?? 0}`}
          />
        ))}
        <HelpButton topicId="status.legend" />
      </section>
    </div>
  );
}

function MatrixFilterGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{
    value: T;
    label: string;
    icon?: ComponentType<{ size?: number }>;
    tool?: DisplayToolKind;
    kind?: RoutineKind;
    status?: InstallStatus;
  }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="matrix-filter-group" aria-label={label}>
      <span className="matrix-filter-label">{label}</span>
      <div className="matrix-filter-options">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              className={
                option.value === value
                  ? "matrix-filter-option active"
                  : "matrix-filter-option"
              }
              aria-pressed={option.value === value}
              aria-label={option.label}
              title={option.label}
              onClick={() => onChange(option.value)}
            >
              {option.status ? (
                <StatusPill status={option.status} label={option.label} />
              ) : option.tool ? (
                <ToolIconBadge tool={option.tool} />
              ) : option.kind ? (
                <RoutineKindIcon kind={option.kind} />
              ) : (
                <>
                  {Icon ? <Icon size={13} /> : null}
                  <span>{option.label}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RowFragment({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function PaginationControls({
  page,
  pageCount,
  total,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="pagination-controls">
      <span>{t("pagination.summary", { page, pageCount, total })}</span>
      <button
        type="button"
        className="icon-button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label={t("pagination.previous")}
        title={t("pagination.previous")}
      >
        <ChevronLeft size={14} />
      </button>
      <button
        type="button"
        className="icon-button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        aria-label={t("pagination.next")}
        title={t("pagination.next")}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

function getPageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

function clampPage(page: number, pageCount: number): number {
  return Math.min(Math.max(page, 1), pageCount);
}

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function findMatchingMatrixCell(
  matrix: InstallMatrixResult,
  current?: InstallMatrixCell,
): InstallMatrixCell | undefined {
  if (!current) {
    return undefined;
  }
  return matrix.rows
    .flatMap((row) => row.cells)
    .find(
      (cell) =>
        cell.routineName === current.routineName &&
        cell.columnId === current.columnId &&
        cell.projectPath === current.projectPath,
    );
}

function DetailDrawer({
  cell,
  matrix,
  onOpenDocs,
  onGeneratePlan,
  onClose,
}: {
  cell?: InstallMatrixCell;
  matrix?: InstallMatrixResult;
  onOpenDocs: (routine: RoutineItem) => void;
  onGeneratePlan: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const routine = matrix?.rows.find(
    (row) => row.routine.name === cell?.routineName,
  )?.routine;
  useEffect(() => {
    if (!cell) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cell, onClose]);

  if (!cell || !routine) {
    return null;
  }
  return (
    <aside className="detail-drawer" aria-label={t("matrix.details.title")}>
      <div className="drawer-head">
        <div>
          <h2>{cell.routineName}</h2>
          <p>{t("matrix.details.title")}</p>
        </div>
        <div className="drawer-head-actions">
          <HelpButton topicId="route.installMatrix" />
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={t("actions.close")}
            title={t("actions.close")}
          >
            <X size={15} />
          </button>
        </div>
      </div>
      <div className="safety-box">
        <strong>{t("matrix.details.writeSafety")}</strong>
        <span>{t("matrix.details.writeSafetyBody")}</span>
      </div>
      <section className="drawer-section">
        <h3>{t("matrix.details.targetStatus")}</h3>
        {matrixColumns.map((column) => {
          const sibling = matrix.rows
            .find((row) => row.routine.name === cell.routineName)
            ?.cells.find((item) => item.columnId === column.id);
          return (
            <div key={column.id} className="target-line">
              <MatrixColumnTitle column={column} />
              {sibling ? <StatusPill status={sibling.status} /> : null}
            </div>
          );
        })}
      </section>
      <section className="drawer-section detail-list">
        <h3>{t("matrix.details.sourcePath")}</h3>
        <PathValue value={cell.sourcePath ?? routine.sourcePath} />
        <h3>{t("matrix.details.targetPath")}</h3>
        <PathValue value={matrixTargetPathValue(t, cell)} />
        <h3>{t("matrix.details.projectPath")}</h3>
        <PathValue value={cell.projectPath ?? "-"} />
        <h3>{t("matrix.details.desiredAction")}</h3>
        <span>{cell.operation ?? (cell.desired ? "skip" : "-")}</span>
        <h3>{t("matrix.details.changedFiles")}</h3>
        <span>{cell.changedFiles.join(", ") || "-"}</span>
        <h3>{t("matrix.details.missingFiles")}</h3>
        <span>{cell.missingFiles.join(", ") || "-"}</span>
        <h3>{t("matrix.details.recommended")}</h3>
        <span>{routine.recommendedWorkflows.join(", ") || "-"}</span>
      </section>
      <div className="drawer-actions">
        <button
          type="button"
          className="button"
          onClick={() => onOpenDocs(routine)}
        >
          <FileText size={15} />
          {t("actions.open")}
        </button>
        <button
          type="button"
          className="button primary"
          onClick={onGeneratePlan}
        >
          <Sparkles size={15} />
          {t("actions.generatePlan")}
        </button>
      </div>
    </aside>
  );
}

function Distribute({
  planResult,
  manifestWriteTask,
  distributionApplyTask,
  configValidation,
  configDirty,
  canGeneratePlan,
  planBlockReasonKey,
  onGeneratePlan,
  inventory,
  matrix,
  config,
  isPlanGenerating,
  onWriteManifest,
  onApplyDistribution,
  isManifestWriting,
  isDistributionApplying,
  sourceRepositoryPath,
}: {
  planResult?: PlanGenerateResult;
  manifestWriteTask?: TaskRecord;
  distributionApplyTask?: TaskRecord;
  configValidation?: ConfigDraftValidationResult;
  configDirty: boolean;
  canGeneratePlan: boolean;
  planBlockReasonKey?: string;
  onGeneratePlan: () => void;
  onWriteManifest: (manifestDigest: string) => void;
  onApplyDistribution: (
    mode: ApplyMode,
    confirmationText: string,
    manifestDigest?: string,
  ) => void;
  inventory?: InventoryScanResult;
  matrix?: InstallMatrixResult;
  config?: InstallDiscoveryConfig;
  isPlanGenerating: boolean;
  isManifestWriting: boolean;
  isDistributionApplying: boolean;
  sourceRepositoryPath?: string;
}) {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState<DistributeStep>("scope");
  const [applyMode, setApplyMode] = useState<ApplyMode>("merge");
  const [confirmationText, setConfirmationText] = useState("");
  const [reviewedManifestDigest, setReviewedManifestDigest] =
    useState<string>();
  const planReady = isPlanResultReady(planResult);
  const planPreviewText = getPlanDraftText(t, planResult);
  const manifestPreviewText = getManifestDiffText(t, planResult?.manifestDiff);
  const [planDraft, setPlanDraft] = useState(planPreviewText);
  const [manifestDraft, setManifestDraft] = useState(manifestPreviewText);
  const requiredConfirmation = getRequiredConfirmation(applyMode, planResult);
  const manifestDigest = planResult?.manifestDiff?.digest;
  const applyActionSummary = getApplyActionSummary(planResult);
  const actionableApplyCount = getActionableApplyCount(
    applyMode,
    applyActionSummary,
  );
  const configStatus: InstallStatus = !configValidation
    ? "unknown"
    : configValidation.ok
      ? configDirty
        ? "drift"
        : "same"
      : "broken";
  const configStatusText = !configValidation
    ? t("config.validation.notRun")
    : configValidation.ok
      ? configDirty
        ? t("config.validation.dirtyValid")
        : t("config.validation.valid")
      : t("config.validation.invalid");
  const canReviewManifest = Boolean(
    planReady && manifestDigest && configValidation?.ok && !configDirty,
  );
  const manifestReviewed = Boolean(
    manifestDigest && reviewedManifestDigest === manifestDigest,
  );
  const canWriteManifest = Boolean(
    canReviewManifest && manifestReviewed && manifestDigest,
  );
  const manifestWriteStatus = canWriteManifest
    ? getTaskCompletionStatus(manifestWriteTask, isManifestWriting)
    : "missing";
  const manifestWritten = manifestWriteTask?.state === "succeeded";
  const canViewResult = manifestWritten;
  const canApply =
    canWriteManifest &&
    Boolean(manifestDigest) &&
    manifestWritten &&
    actionableApplyCount > 0 &&
    applyMode !== "dry-run" &&
    confirmationText === requiredConfirmation;

  useEffect(() => {
    setPlanDraft(planPreviewText);
  }, [planPreviewText]);

  useEffect(() => {
    setManifestDraft(manifestPreviewText);
  }, [manifestPreviewText]);

  useEffect(() => {
    if (planResult) {
      setActiveStep("run");
    }
  }, [planResult]);

  useEffect(() => {
    if (activeStep === "result" && !canViewResult) {
      setActiveStep("run");
    }
  }, [activeStep, canViewResult]);

  useEffect(() => {
    setReviewedManifestDigest(undefined);
    setConfirmationText("");
  }, [manifestDigest]);

  return (
    <div className="split-view distribute-view">
      <section className="pane fill">
        <DistributeFlowOverview
          activeStep={activeStep}
          canViewResult={canViewResult}
        />
        <div
          className="stepper distribute-step-nav"
          aria-label={t("distribute.navTitle")}
        >
          {distributeStepIds.map((step, index) => (
            <button
              key={step}
              type="button"
              className={getDistributeStepClass(
                step,
                activeStep,
                canViewResult,
              )}
              onClick={() => setActiveStep(step)}
              disabled={!canVisitDistributeStep(step, canViewResult)}
              aria-pressed={activeStep === step}
              title={
                canVisitDistributeStep(step, canViewResult)
                  ? t(`distribute.stepHelp.${step}`)
                  : t("distribute.resultLocked")
              }
            >
              <span className="step-index">{index + 1}</span>
              <span className="step-label">{t(`distribute.step.${step}`)}</span>
            </button>
          ))}
          <HelpButton
            topicId={`distribute.step.${activeStep}` as HelpTopicId}
          />
        </div>
        {activeStep === "scope" ? (
          <DistributeScopeStep
            inventory={inventory}
            matrix={matrix}
            config={config}
          />
        ) : null}
        {activeStep === "routines" ? (
          <DistributePolicyStep config={config} />
        ) : null}
        {activeStep === "targets" ? (
          <DistributeTargetsStep
            config={config}
            matrix={matrix}
            sourceRepositoryPath={sourceRepositoryPath}
          />
        ) : null}
        {activeStep === "mode" ? (
          <DistributeApplyModeStep
            mode={applyMode}
            onModeChange={(mode) => {
              setApplyMode(mode);
              setConfirmationText("");
            }}
            planResult={planResult}
          />
        ) : null}
        {activeStep === "run" ? (
          <DistributePlanStep
            planDraft={planDraft}
            manifestDraft={manifestDraft}
            planResult={planResult}
            canGeneratePlan={canGeneratePlan}
            planBlockReasonKey={planBlockReasonKey}
            onGeneratePlan={onGeneratePlan}
            isPlanGenerating={isPlanGenerating}
            onReviewManifest={() => {
              if (manifestDigest) {
                setReviewedManifestDigest(manifestDigest);
              }
            }}
            canReviewManifest={canReviewManifest}
            manifestReviewed={manifestReviewed}
            manifestDigest={manifestDigest}
            onWriteManifest={() => {
              if (manifestDigest) {
                onWriteManifest(manifestDigest);
              }
            }}
            isManifestWriting={isManifestWriting}
            canWriteManifest={canWriteManifest}
          />
        ) : null}
        {activeStep === "result" ? (
          <DistributeApplyStep
            planReady={planReady}
            configStatus={configStatus}
            configStatusText={configStatusText}
            confirmationText={confirmationText}
            onConfirmationTextChange={setConfirmationText}
            onSelectApplyMode={() => setActiveStep("mode")}
            onWriteManifest={() => {
              if (manifestDigest) {
                onWriteManifest(manifestDigest);
              }
            }}
            onApplyDistribution={onApplyDistribution}
            applyMode={applyMode}
            requiredConfirmation={requiredConfirmation}
            manifestDigest={manifestDigest}
            isManifestWriting={isManifestWriting}
            isDistributionApplying={isDistributionApplying}
            canWriteManifest={canWriteManifest}
            manifestReviewed={manifestReviewed}
            manifestWriteStatus={manifestWriteStatus}
            distributionApplyTask={distributionApplyTask}
            canApply={canApply}
            applyActionSummary={applyActionSummary}
            actionableApplyCount={actionableApplyCount}
          />
        ) : null}
      </section>
      <section className="pane side">
        <PaneTitle helpId="route.distribute">{t("distribute.gates")}</PaneTitle>
        <StatusLine status={configStatus} text={configStatusText} />
        {planBlockReasonKey ? (
          <StatusLine status="drift" text={t(planBlockReasonKey)} />
        ) : null}
        <StatusLine
          status={getPlanStatus(planResult)}
          text={
            planResult?.task.state === "failed" ||
            planResult?.task.state === "canceled"
              ? t("distribute.planFailed")
              : t("distribute.planGenerated")
          }
        />
        <StatusLine
          status={
            manifestReviewed
              ? "same"
              : planResult && !planReady
                ? "broken"
                : "missing"
          }
          text={t("distribute.manifestReview")}
        />
        <StatusLine
          status={manifestWriteStatus}
          text={t("distribute.writeConfirmation")}
        />
      </section>
    </div>
  );
}

function DistributeFlowOverview({
  activeStep,
  canViewResult,
}: {
  activeStep: DistributeStep;
  canViewResult: boolean;
}) {
  const { t } = useTranslation();
  const activeIndex = distributeStepIds.indexOf(activeStep);
  return (
    <section
      className="distribution-flow"
      aria-label={t("distribute.flowTitle")}
    >
      <div className="distribution-flow-head">
        <strong>{t("distribute.flowTitle")}</strong>
        <span>{t("distribute.flowSubtitle")}</span>
      </div>
      <ol className="distribution-flow-steps">
        {distributeStepIds.map((step, index) => {
          const Icon = distributeStepIcons[step];
          const stateClass = getDistributeStepState(
            step,
            index,
            activeIndex,
            canViewResult,
          );
          return (
            <li
              key={step}
              className={`distribution-flow-step ${stateClass}`}
              aria-current={step === activeStep ? "step" : undefined}
            >
              <span className="flow-step-icon">
                <Icon size={15} />
              </span>
              <span className="flow-step-copy">
                <strong>{t(`distribute.step.${step}`)}</strong>
                <small>{t(`distribute.flowDetail.${step}`)}</small>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function DistributeScopeStep({
  inventory,
  matrix,
  config,
}: {
  inventory?: InventoryScanResult;
  matrix?: InstallMatrixResult;
  config?: InstallDiscoveryConfig;
}) {
  const { t } = useTranslation();
  return (
    <div className="step-content">
      <PaneTitle helpId="distribute.step.scope">
        {t("distribute.step.scope")}
      </PaneTitle>
      <StatusLine
        status={config ? "same" : "unknown"}
        text={t("distribute.scopeSummary", {
          scope: getScopeSummary(t, config),
        })}
      />
      <StatusLine
        status={inventory ? "same" : "unknown"}
        text={t("distribute.inventoryCount", {
          skills: inventory?.counts.skills ?? 0,
          workflows: inventory?.counts.workflows ?? 0,
        })}
      />
      <StatusLine
        status={(inventory?.counts.broken ?? 0) === 0 ? "same" : "broken"}
        text={t("distribute.inventoryBroken", {
          count: inventory?.counts.broken ?? 0,
        })}
      />
      <StatusLine
        status={matrix ? "same" : "unknown"}
        text={t("distribute.matrixCells", {
          count: matrix
            ? matrix.rows.reduce((total, row) => total + row.cells.length, 0)
            : 0,
        })}
      />
    </div>
  );
}

function DistributeTargetsStep({
  config,
  matrix,
  sourceRepositoryPath,
}: {
  config?: InstallDiscoveryConfig;
  matrix?: InstallMatrixResult;
  sourceRepositoryPath?: string;
}) {
  const { t } = useTranslation();
  const configV2 = config ? toV2Config(config) : undefined;
  const projectTargets = configV2?.projectTargets ?? [];
  const projectDetails = matrix?.projectDetails ?? [];
  const discoveryRoots = configV2?.discovery.roots ?? [];
  const outputManifest = configV2?.output.manifestPath ?? "";
  const outputReport = configV2?.output.reportPath ?? "";
  return (
    <div className="step-content">
      <PaneTitle helpId="distribute.step.targets">
        {t("distribute.step.targets")}
      </PaneTitle>
      <StatusLine
        status={config ? "same" : "unknown"}
        text={t("distribute.targetRoots", {
          count: configV2?.discovery.roots.length ?? 0,
        })}
      />
      <StatusLine
        status={config ? "same" : "unknown"}
        text={t("distribute.outputTargets", {
          manifest: outputManifest,
          report: outputReport,
        })}
      />
      <StatusLine
        status={matrix?.desiredOnly ? "same" : "unknown"}
        text={t("distribute.projectDetailCells", {
          count: projectDetails.length,
        })}
      />
      <div className="review-target-grid">
        <section className="review-target-card">
          <div className="review-target-card-header">
            <span>{t("distribute.reviewedRootsTitle")}</span>
            <StatusPill
              status={config ? "same" : "unknown"}
              label={t("distribute.reviewedCount", {
                count: discoveryRoots.length,
              })}
            />
          </div>
          <div className="token-list">
            {discoveryRoots.length > 0 ? (
              discoveryRoots.map((root) => (
                <span key={root} className="token">
                  <code>{root}</code>
                </span>
              ))
            ) : (
              <span className="muted">{t("common.none")}</span>
            )}
          </div>
        </section>
        <section className="review-target-card">
          <div className="review-target-card-header">
            <span>{t("distribute.reviewedRepositoryTitle")}</span>
            <StatusPill
              status={config ? "same" : "unknown"}
              label={config ? t("status.same") : t("status.unknown")}
            />
          </div>
          <code className="review-target-path">
            {sourceRepositoryPath || t("common.unknown")}
          </code>
        </section>
        <section className="review-target-card">
          <div className="review-target-card-header">
            <span>{t("distribute.reviewedOutputsTitle")}</span>
            <StatusPill
              status={config ? "same" : "unknown"}
              label={config ? t("status.same") : t("status.unknown")}
            />
          </div>
          <dl className="review-target-output-list">
            <div>
              <dt>{t("distribute.manifestFile")}</dt>
              <dd>
                <code>{outputManifest || t("common.unknown")}</code>
              </dd>
            </div>
            <div>
              <dt>{t("distribute.reportFile")}</dt>
              <dd>
                <code>{outputReport || t("common.unknown")}</code>
              </dd>
            </div>
          </dl>
        </section>
        <section className="review-target-card">
          <div className="review-target-card-header">
            <span>{t("distribute.reviewedProjectTargetsTitle")}</span>
            <StatusPill
              status={matrix?.desiredOnly ? "same" : "unknown"}
              label={t("distribute.reviewedCount", {
                count: projectDetails.length,
              })}
            />
          </div>
          <div className="project-target-list">
            {projectDetails.length > 0 ? (
              projectDetails.map((detail) => {
                const displayTool = maybeDisplayTool(detail.tool);
                return (
                  <div
                    key={`${detail.projectPath}:${detail.tool}:${detail.kind}:${detail.routineName}`}
                    className="target-line target-line-detail"
                  >
                    <span>
                      <strong>{detail.routineName}</strong>
                      <small className="target-detail-meta">
                        {displayTool ? (
                          <ToolIconBadge tool={displayTool} size="xs" />
                        ) : (
                          <span>{detail.tool}</span>
                        )}
                        <RoutineKindIcon kind={detail.kind} size="xs" />
                        <span>{middleEllipsis(detail.projectPath)}</span>
                      </small>
                      {detail.targetPath ? (
                        <code>{middleEllipsis(detail.targetPath)}</code>
                      ) : null}
                    </span>
                    <StatusPill
                      status={detail.status}
                      label={t(`status.${detail.status}`)}
                    />
                  </div>
                );
              })
            ) : projectTargets.length > 0 ? (
              projectTargets.map((target) => (
                <div key={target.path} className="target-line">
                  <span>{middleEllipsis(target.path)}</span>
                  <StatusPill
                    status={target.enabled ? "same" : "unknown"}
                    label={
                      target.enabled
                        ? t("projects.enabled")
                        : t("projects.disabled")
                    }
                  />
                </div>
              ))
            ) : (
              <span className="muted block-copy">
                {t("distribute.noProjectOverrides")}
              </span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function DistributePolicyStep({ config }: { config?: InstallDiscoveryConfig }) {
  const { t } = useTranslation();
  const configV2 = config ? toV2Config(config) : undefined;
  const sections: Array<{
    key: string;
    title: ReactNode;
    values: string[];
  }> = [
    {
      key: "user-codex",
      title: (
        <ToolSkillHeading
          title={t("policy.userCodexSkills")}
          scopeLabel={t("policy.scope.userLevel")}
          tool="codex"
        />
      ),
      values: configV2?.userTargets.skills.codex ?? [],
    },
    {
      key: "user-claude",
      title: (
        <ToolSkillHeading
          title={t("policy.userClaudeSkills")}
          scopeLabel={t("policy.scope.userLevel")}
          tool="claudeCode"
        />
      ),
      values: configV2?.userTargets.skills.claudeCode ?? [],
    },
    {
      key: "user-workflows",
      title: (
        <RoutineScopeHeading
          title={t("policy.userLevelWorkflows")}
          scopeLabel={t("policy.scope.userShared")}
          kind="workflow"
        />
      ),
      values: configV2?.userTargets.workflows ?? [],
    },
    {
      key: "project-default-codex",
      title: (
        <ToolSkillHeading
          title={t("policy.projectDefaultCodexSkills")}
          scopeLabel={t("policy.scope.projectDefault")}
          tool="codex"
        />
      ),
      values: configV2?.projectDefaults.skills.codex ?? [],
    },
    {
      key: "project-default-claude",
      title: (
        <ToolSkillHeading
          title={t("policy.projectDefaultClaudeSkills")}
          scopeLabel={t("policy.scope.projectDefault")}
          tool="claudeCode"
        />
      ),
      values: configV2?.projectDefaults.skills.claudeCode ?? [],
    },
    {
      key: "project-default-workflows",
      title: (
        <RoutineScopeHeading
          title={t("policy.projectDefaultWorkflows")}
          scopeLabel={t("policy.scope.projectDefaultShared")}
          kind="workflow"
        />
      ),
      values: configV2?.projectDefaults.workflows ?? [],
    },
    {
      key: "promotion-protection",
      title: (
        <RoutineScopeHeading
          title={t("policy.doNotPromoteToUserSkills")}
          scopeLabel={t("policy.scope.exclusions")}
          kind="skill"
        />
      ),
      values: configV2?.promotionRules.doNotPromoteToUserSkills ?? [],
    },
  ];
  return (
    <div className="step-content">
      <PaneTitle helpId="distribute.step.routines">
        {t("distribute.step.routines")}
      </PaneTitle>
      <div className="policy-section-grid compact-policy-grid">
        {sections.map(({ key, title, values }) => (
          <section key={key} className="policy-section">
            <h3>{title}</h3>
            <div className="token-list">
              {values.length > 0 ? (
                values.map((value) => (
                  <span key={value} className="token">
                    <code>{value}</code>
                  </span>
                ))
              ) : (
                <span className="muted">{t("distribute.noPolicyItems")}</span>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function DistributeApplyModeStep({
  mode,
  onModeChange,
  planResult,
}: {
  mode: ApplyMode;
  onModeChange: (mode: ApplyMode) => void;
  planResult?: PlanGenerateResult;
}) {
  const { t } = useTranslation();
  const requiredConfirmation = getRequiredConfirmation(mode, planResult);
  return (
    <div className="step-content">
      <PaneTitle helpId="distribute.step.mode">
        {t("distribute.step.mode")}
      </PaneTitle>
      <div className="mode-grid">
        {(
          ["dry-run", "merge", "replace-listed", "sync-prune"] as ApplyMode[]
        ).map((option) => (
          <div
            key={option}
            className={mode === option ? "mode-card active" : "mode-card"}
          >
            <button
              type="button"
              className="mode-card-main"
              aria-pressed={mode === option}
              onClick={() => onModeChange(option)}
            >
              <span className="mode-card-title">
                <strong>{t(`distribute.mode.${option}`)}</strong>
                <code>{t(`distribute.modeCode.${option}`)}</code>
              </span>
              <span>{t(`distribute.modeHelp.${option}`)}</span>
            </button>
            <HelpButton
              topicId={applyModeHelpTopic[option]}
              className="mode-card-help"
            />
          </div>
        ))}
      </div>
      <StatusLine
        status={mode === "dry-run" ? "unknown" : "same"}
        text={t("distribute.requiredConfirmation", {
          phrase:
            mode === "dry-run"
              ? t("distribute.noApplyForDryRun")
              : requiredConfirmation,
        })}
      />
    </div>
  );
}

function DistributePlanStep({
  planDraft,
  manifestDraft,
  planResult,
  canGeneratePlan,
  planBlockReasonKey,
  onGeneratePlan,
  isPlanGenerating,
  onReviewManifest,
  canReviewManifest,
  manifestReviewed,
  manifestDigest,
  onWriteManifest,
  isManifestWriting,
  canWriteManifest,
}: {
  planDraft: string;
  manifestDraft: string;
  planResult?: PlanGenerateResult;
  canGeneratePlan: boolean;
  planBlockReasonKey?: string;
  onGeneratePlan: () => void;
  isPlanGenerating: boolean;
  onReviewManifest: () => void;
  canReviewManifest: boolean;
  manifestReviewed: boolean;
  manifestDigest?: string;
  onWriteManifest: () => void;
  isManifestWriting: boolean;
  canWriteManifest: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      {planResult && !isPlanResultReady(planResult) ? (
        <div className="plan-error-banner" role="status">
          <StatusPill status="broken" label={t("distribute.planFailed")} />
          <span>
            {t("distribute.planFailureExitCode", {
              exitCode: formatExitCode(t, planResult.task.exitCode),
            })}
          </span>
        </div>
      ) : null}
      <div className="two-pane">
        <div>
          <PaneTitle helpId="distribute.step.run">
            {t("distribute.planJson")}
          </PaneTitle>
          <textarea
            className="distribute-editor"
            value={planDraft}
            aria-label={t("distribute.planJson")}
            spellCheck={false}
            readOnly
          />
        </div>
        <div>
          <PaneTitle helpId="distribute.step.run">
            {t("distribute.manifestDiff")}
          </PaneTitle>
          <textarea
            className="distribute-editor"
            value={manifestDraft}
            aria-label={t("distribute.manifestDiff")}
            spellCheck={false}
            readOnly
          />
        </div>
      </div>
      <div className="manifest-review-panel">
        <StatusPill
          status={
            manifestReviewed ? "same" : canReviewManifest ? "drift" : "missing"
          }
          label={
            manifestReviewed
              ? t("distribute.manifestReviewed")
              : t("distribute.manifestReviewRequired")
          }
        />
        <code>{manifestDigest ?? t("common.unknown")}</code>
        <button
          type="button"
          className="compact-button"
          onClick={onReviewManifest}
          disabled={!canReviewManifest || manifestReviewed}
        >
          <ClipboardCheck size={14} />
          {manifestReviewed ? t("actions.reviewed") : t("actions.markReviewed")}
        </button>
      </div>
      <div className="inline-actions">
        <button
          type="button"
          className={`button primary ${isPlanGenerating ? "is-running" : ""}`}
          onClick={onGeneratePlan}
          disabled={!canGeneratePlan || isPlanGenerating}
          aria-busy={isPlanGenerating}
          title={planBlockReasonKey ? t(planBlockReasonKey) : undefined}
        >
          <Sparkles size={15} />
          {isPlanGenerating
            ? t("actions.generatingPlan")
            : t("actions.generatePlan")}
        </button>
        <button
          type="button"
          className={`button ${isManifestWriting ? "is-running" : ""}`}
          onClick={onWriteManifest}
          disabled={!canWriteManifest || isManifestWriting}
          aria-busy={isManifestWriting}
          title={
            !canWriteManifest
              ? t("distribute.writeManifestDisabled")
              : undefined
          }
        >
          <FileText size={15} />
          {isManifestWriting
            ? t("actions.writingManifest")
            : t("actions.writeManifest")}
        </button>
      </div>
    </>
  );
}

function DistributeApplyStep({
  planReady,
  configStatus,
  configStatusText,
  confirmationText,
  onConfirmationTextChange,
  onSelectApplyMode,
  onWriteManifest,
  onApplyDistribution,
  applyMode,
  requiredConfirmation,
  manifestDigest,
  isManifestWriting,
  isDistributionApplying,
  canWriteManifest,
  manifestReviewed,
  manifestWriteStatus,
  distributionApplyTask,
  canApply,
  applyActionSummary,
  actionableApplyCount,
}: {
  planReady: boolean;
  configStatus: InstallStatus;
  configStatusText: string;
  confirmationText: string;
  onConfirmationTextChange: (value: string) => void;
  onSelectApplyMode: () => void;
  onWriteManifest: () => void;
  onApplyDistribution: (
    mode: ApplyMode,
    confirmationText: string,
    manifestDigest?: string,
  ) => void;
  applyMode: ApplyMode;
  requiredConfirmation: string;
  manifestDigest?: string;
  isManifestWriting: boolean;
  isDistributionApplying: boolean;
  canWriteManifest: boolean;
  manifestReviewed: boolean;
  manifestWriteStatus: InstallStatus;
  distributionApplyTask?: TaskRecord;
  canApply: boolean;
  applyActionSummary: ApplyActionSummary;
  actionableApplyCount: number;
}) {
  const { t } = useTranslation();
  const destructive =
    applyMode === "replace-listed" || applyMode === "sync-prune";
  const isDryRunOnly = applyMode === "dry-run";
  return (
    <div className="step-content">
      <PaneTitle helpId="distribute.step.result">
        {t("distribute.step.result")}
      </PaneTitle>
      <StatusLine status={configStatus} text={configStatusText} />
      <StatusLine
        status={planReady ? "same" : "missing"}
        text={t("distribute.planGenerated")}
      />
      <StatusLine
        status={manifestReviewed ? "same" : "missing"}
        text={t("distribute.manifestReview")}
      />
      <StatusLine
        status={manifestWriteStatus}
        text={t("distribute.writeConfirmation")}
      />
      <StatusLine
        status={
          applyMode === "dry-run"
            ? "unknown"
            : actionableApplyCount > 0
              ? "same"
              : "missing"
        }
        text={t("distribute.applyActionSummary", {
          install: applyActionSummary.install,
          replace: applyActionSummary.replace,
          prune: applyActionSummary.prune,
          skip: applyActionSummary.skip,
        })}
      />
      {applyMode !== "dry-run" && actionableApplyCount === 0 ? (
        <div className="plan-error-banner" role="status">
          <StatusPill
            status="missing"
            label={t("distribute.noActionableApplyShort")}
          />
          <span>{t("distribute.noActionableApply")}</span>
        </div>
      ) : null}
      {isDryRunOnly ? (
        <div className="dry-run-result" role="status">
          <StatusPill status="unknown" label={t("distribute.mode.dry-run")} />
          <span>{t("distribute.dryRunResultHint")}</span>
          <button type="button" className="button" onClick={onSelectApplyMode}>
            {t("distribute.chooseApplyMode")}
          </button>
        </div>
      ) : (
        <div className="apply-confirmation">
          <label htmlFor="apply-confirmation">
            {t("distribute.confirmationLabel")}
          </label>
          <input
            id="apply-confirmation"
            value={confirmationText}
            onChange={(event) => onConfirmationTextChange(event.target.value)}
            placeholder={t("distribute.confirmationPlaceholder")}
            spellCheck={false}
          />
          <small>
            {t("distribute.confirmationHint", {
              phrase: requiredConfirmation,
            })}
          </small>
        </div>
      )}
      {distributionApplyTask ? (
        <div
          className={`apply-feedback status-${taskStateToStatus(distributionApplyTask.state)}`}
          role="status"
        >
          <StatusPill status={taskStateToStatus(distributionApplyTask.state)} />
          <span>
            {t("distribute.applyQueued", {
              task: t(distributionApplyTask.titleKey),
            })}
          </span>
        </div>
      ) : null}
      <div className="inline-actions">
        <button
          type="button"
          className={`button ${isManifestWriting ? "is-running" : ""}`}
          onClick={onWriteManifest}
          disabled={!canWriteManifest || isManifestWriting}
          aria-busy={isManifestWriting}
          title={
            !canWriteManifest
              ? t("distribute.writeManifestDisabled")
              : undefined
          }
        >
          <FileText size={15} />
          {isManifestWriting
            ? t("actions.writingManifest")
            : t("actions.writeManifest")}
        </button>
        <button
          type="button"
          className={[
            "button",
            destructive ? "danger" : "primary",
            isDistributionApplying ? "is-running" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() =>
            onApplyDistribution(applyMode, confirmationText, manifestDigest)
          }
          disabled={!canApply || isDistributionApplying}
          aria-busy={isDistributionApplying}
          title={
            !canApply
              ? isDryRunOnly
                ? t("distribute.selectApplyModeFirst")
                : manifestWriteStatus !== "same"
                  ? t("distribute.writeManifestFirst")
                  : t("distribute.applyDisabled")
              : undefined
          }
        >
          <Send size={15} />
          {isDistributionApplying
            ? t("actions.applying")
            : t(`distribute.applyModeAction.${applyMode}`)}
        </button>
      </div>
    </div>
  );
}

function getDistributeStepClass(
  step: DistributeStep,
  activeStep: DistributeStep,
  canViewResult: boolean,
): string {
  const completed =
    step === "scope" ||
    step === "routines" ||
    step === "targets" ||
    step === "mode" ||
    (step === "run" && canViewResult);
  return [
    "step",
    completed ? "done" : "",
    step === activeStep ? "active" : "",
    !canVisitDistributeStep(step, canViewResult) ? "blocked" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getDistributeStepState(
  step: DistributeStep,
  index: number,
  activeIndex: number,
  canViewResult: boolean,
): string {
  if (step === distributeStepIds[activeIndex]) {
    return "is-current";
  }
  if (index < activeIndex || (step === "run" && canViewResult)) {
    return "is-complete";
  }
  if (!canVisitDistributeStep(step, canViewResult)) {
    return "is-gated";
  }
  return "is-pending";
}

function canVisitDistributeStep(
  step: DistributeStep,
  canViewResult: boolean,
): boolean {
  return step !== "result" || canViewResult;
}

function isPlanResultReady(result?: PlanGenerateResult): boolean {
  return (
    result?.task.state === "succeeded" && Boolean(result.generatedManifest)
  );
}

function getRequiredConfirmation(
  mode: ApplyMode,
  result?: PlanGenerateResult,
): string {
  if (mode === "dry-run") {
    return "";
  }
  if (mode === "replace-listed") {
    return `REPLACE ${countManifestActions(result, "replace")} TARGETS`;
  }
  if (mode === "sync-prune") {
    return `SYNC PRUNE ${countManifestActions(result, "prune-candidate")} TARGETS`;
  }
  return "APPLY";
}

interface ApplyActionSummary {
  install: number;
  replace: number;
  prune: number;
  skip: number;
}

function getApplyActionSummary(
  result: PlanGenerateResult | undefined,
): ApplyActionSummary {
  return {
    install: countManifestActions(result, "install"),
    replace: countManifestActions(result, "replace"),
    prune: countManifestActions(result, "prune-candidate"),
    skip: countManifestActions(result, "skip"),
  };
}

function getActionableApplyCount(
  mode: ApplyMode,
  summary: ApplyActionSummary,
): number {
  if (mode === "merge") {
    return summary.install;
  }
  if (mode === "replace-listed") {
    return summary.replace;
  }
  if (mode === "sync-prune") {
    return summary.prune;
  }
  return 0;
}

function countManifestActions(
  result: PlanGenerateResult | undefined,
  operation: string,
): number {
  const manifest = result?.generatedManifest;
  if (!manifest || typeof manifest !== "object" || !("actions" in manifest)) {
    return 0;
  }
  const actions = (manifest as { actions?: unknown }).actions;
  if (!Array.isArray(actions)) {
    return 0;
  }
  return actions.filter(
    (action) =>
      action &&
      typeof action === "object" &&
      (action as { operation?: unknown }).operation === operation,
  ).length;
}

function getPlanStatus(result?: PlanGenerateResult): InstallStatus {
  if (!result) {
    return "missing";
  }
  if (isPlanResultReady(result)) {
    return "same";
  }
  if (result.task.state === "pending" || result.task.state === "running") {
    return "unknown";
  }
  return "broken";
}

function getTaskCompletionStatus(
  task: TaskRecord | undefined,
  isRunning: boolean,
): InstallStatus {
  if (isRunning) {
    return "unknown";
  }
  if (!task) {
    return "missing";
  }
  if (task.state === "succeeded") {
    return "same";
  }
  if (task.state === "pending" || task.state === "running") {
    return "unknown";
  }
  return "broken";
}

function getPlanDraftText(t: TFunction, result?: PlanGenerateResult): string {
  if (!result) {
    return stringify({
      status: t("distribute.planNotGenerated"),
      commandsToRun: [],
    });
  }
  if (result.task.state !== "succeeded") {
    const sections = [
      t("distribute.planFailed"),
      t("distribute.planFailureStatus", {
        state: t(`taskState.${result.task.state}`),
      }),
      t("distribute.planFailureExitCode", {
        exitCode: formatExitCode(t, result.task.exitCode),
      }),
    ];
    if (result.task.stderr?.trim()) {
      sections.push(`stderr:\n${result.task.stderr.trim()}`);
    }
    if (result.task.stdout?.trim()) {
      sections.push(`stdout:\n${result.task.stdout.trim()}`);
    }
    if (!result.task.stderr?.trim() && !result.task.stdout?.trim()) {
      sections.push(t("distribute.planFailureNoOutput"));
    }
    return sections.join("\n\n");
  }
  return stringify(
    result.planJson ??
      result.task.stdout ?? {
        status: t("distribute.planJsonUnavailable"),
      },
  );
}

function getManifestDiffText(t: TFunction, diff?: ManifestDiffResult): string {
  if (!diff || diff.state === "unavailable") {
    return t("distribute.noGeneratedDiff");
  }
  if (diff.state === "unchanged") {
    return t("distribute.manifestDiffUnchanged", {
      path: diff.currentPath ?? "",
    });
  }
  if (diff.state === "missing-current") {
    return [
      t("distribute.manifestDiffMissingCurrent", {
        path: diff.currentPath ?? "",
      }),
      diff.text,
    ]
      .filter(Boolean)
      .join("\n\n");
  }
  return [
    t("distribute.manifestDiffChanged", {
      path: diff.currentPath ?? "",
    }),
    diff.text,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function formatExitCode(t: TFunction, exitCode: number | null | undefined) {
  return exitCode === undefined || exitCode === null
    ? t("common.unknown")
    : String(exitCode);
}

function Validation({
  gates,
  tasks,
  onRunGate,
}: {
  gates: ValidationGate[];
  tasks: TaskRecord[];
  onRunGate: (gate: ValidationGate) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<ValidationGate>();
  const [runningGateKey, setRunningGateKey] = useState<string>();
  const [isRunningAll, setIsRunningAll] = useState(false);
  const activeGate = selected ?? gates[0];
  const activeTask = activeGate
    ? tasks.find((task) => matchesGateTask(task, activeGate))
    : undefined;
  const anyGateRunning = gates.some((gate) =>
    tasks.some(
      (task) =>
        matchesGateTask(task, gate) &&
        (task.state === "running" || task.state === "pending"),
    ),
  );
  const activeOutput = [activeTask?.stdout, activeTask?.stderr]
    .filter(Boolean)
    .join("\n");
  const activeOutputText =
    activeOutput || getValidationOutputEmptyText(t, activeTask);
  const runSelectedGate = async (gate: ValidationGate, withFeedback = true) => {
    setSelected(gate);
    const key = validationGateKey(gate);
    setRunningGateKey(key);
    try {
      if (withFeedback) {
        await Promise.all([onRunGate(gate), waitForFeedback()]);
      } else {
        await onRunGate(gate);
      }
    } finally {
      setRunningGateKey((current) => (current === key ? undefined : current));
    }
  };
  const runAllGates = async () => {
    setIsRunningAll(true);
    try {
      for (const gate of gates) {
        setSelected(gate);
        await runSelectedGate(gate, false);
      }
    } finally {
      setIsRunningAll(false);
    }
  };
  return (
    <div className="split-view validation-view">
      <section className="pane fill">
        <PaneTitle helpId="route.validation">
          {t("validation.gatesList")}
        </PaneTitle>
        <div className="validation-toolbar">
          <button
            type="button"
            className={`button ${isRunningAll ? "is-running" : ""}`}
            onClick={() => void runAllGates()}
            disabled={gates.length === 0 || isRunningAll || anyGateRunning}
            aria-busy={isRunningAll}
          >
            <ClipboardCheck size={15} />
            {isRunningAll
              ? t("taskState.running")
              : t("actions.runAllReadonly")}
          </button>
        </div>
        <div className="table-header validation-grid">
          <span>{t("validation.gate")}</span>
          <span>{t("validation.shell")}</span>
          <span>{t("validation.status")}</span>
          <span />
        </div>
        {gates.map((gate) => (
          <ValidationGateRow
            key={`${gate.id}-${gate.shell}`}
            gate={gate}
            task={tasks.find((task) => matchesGateTask(task, gate))}
            isRunning={
              runningGateKey === validationGateKey(gate) ||
              tasks.some(
                (task) =>
                  matchesGateTask(task, gate) &&
                  (task.state === "running" || task.state === "pending"),
              )
            }
            onRunGate={runSelectedGate}
            onSelect={setSelected}
          />
        ))}
      </section>
      <section className="pane side">
        <PaneTitle helpId="validation.output">
          {t("validation.output")}
        </PaneTitle>
        <code className="command-preview">
          {activeGate?.commandPreview.join(" ")}
        </code>
        <div className="output-meta">
          <StatusPill
            status={
              activeTask ? taskStateToStatus(activeTask.state) : "unknown"
            }
            label={
              activeTask
                ? t(`taskState.${activeTask.state}`)
                : t("validation.idle")
            }
          />
        </div>
        <pre className={activeOutput ? "" : "empty-output"}>
          {activeOutputText}
        </pre>
      </section>
    </div>
  );
}

function ValidationGateRow({
  gate,
  task,
  isRunning,
  onRunGate,
  onSelect,
}: {
  gate: ValidationGate;
  task?: TaskRecord;
  isRunning: boolean;
  onRunGate: (gate: ValidationGate) => void;
  onSelect: (gate: ValidationGate) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="table-row validation-grid">
      <button
        type="button"
        className="link-button"
        onClick={() => onSelect(gate)}
      >
        {t(gate.labelKey)}
      </button>
      <span>{gate.shell}</span>
      <StatusPill
        status={task ? taskStateToStatus(task.state) : "unknown"}
        label={task ? t(`taskState.${task.state}`) : t("validation.idle")}
      />
      <button
        type="button"
        className={`compact-button ${isRunning ? "is-running" : ""}`}
        onClick={() => onRunGate(gate)}
        disabled={isRunning}
        aria-busy={isRunning}
      >
        <ClipboardCheck size={14} />
        {isRunning ? t("taskState.running") : t("actions.runSelected")}
      </button>
    </div>
  );
}

function validationGateKey(gate: ValidationGate): string {
  return `${gate.id}-${gate.shell}`;
}

function getValidationOutputEmptyText(t: TFunction, task?: TaskRecord): string {
  if (!task) {
    return t("validation.outputEmpty");
  }
  if (task.state === "running" || task.state === "pending") {
    return t("validation.outputRunning");
  }
  return t("validation.outputNoStreams");
}

function matchesGateTask(task: TaskRecord, gate: ValidationGate): boolean {
  if (task.commandId !== "runRepositoryGate") {
    return false;
  }
  if (task.titleKey !== `validation.gates.${gate.id}`) {
    return false;
  }
  const executable = task.argv[0]?.toLowerCase() ?? "";
  return gate.shell === "bash"
    ? executable.includes("bash")
    : executable.includes("powershell") || executable.includes("pwsh");
}

function taskStateToStatus(state: TaskRecord["state"]): InstallStatus {
  if (state === "failed") {
    return "broken";
  }
  if (state === "running" || state === "pending") {
    return "drift";
  }
  if (state === "canceled") {
    return "unknown";
  }
  return "same";
}

function TaskCenter({
  tasks,
  selectedTask,
  onSelect,
  onCancel,
  onArchive,
  searchText,
}: {
  tasks: TaskRecord[];
  selectedTask?: TaskRecord;
  onSelect: (taskId: string) => void;
  onCancel: (taskId: string) => Promise<void>;
  onArchive: (taskId: string) => Promise<{ archivePath?: string }>;
  searchText: string;
}) {
  const { t } = useTranslation();
  const [hiddenTaskIds, setHiddenTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isArchiving, setIsArchiving] = useState(false);
  const [archivePath, setArchivePath] = useState<string>();
  const visibleQueueTasks = tasks.filter((task) => !hiddenTaskIds.has(task.id));
  const normalizedSearch = searchText.trim().toLowerCase();
  const visibleTasks = visibleQueueTasks.filter((task) => {
    if (!normalizedSearch) {
      return true;
    }
    const values = [
      t(task.titleKey),
      task.commandId,
      task.state,
      task.cwd,
      task.argv.join(" "),
      task.stdout,
      task.stderr,
    ];
    return values.some(
      (value) =>
        typeof value === "string" &&
        value.toLowerCase().includes(normalizedSearch),
    );
  });
  const canCancel =
    selectedTask?.cancelable &&
    (selectedTask.state === "pending" || selectedTask.state === "running");
  const canArchive = Boolean(
    selectedTask &&
    selectedTask.state !== "pending" &&
    selectedTask.state !== "running",
  );
  const clearCompleted = () => {
    setHiddenTaskIds(
      new Set(
        tasks
          .filter(
            (task) => task.state !== "pending" && task.state !== "running",
          )
          .map((task) => task.id),
      ),
    );
  };
  const archiveSelected = async () => {
    if (!selectedTask || !canArchive) {
      return;
    }
    setIsArchiving(true);
    try {
      const result = await onArchive(selectedTask.id);
      setArchivePath(result.archivePath);
    } finally {
      setIsArchiving(false);
    }
  };
  return (
    <div className="split-view task-view">
      <section className="pane queue">
        <PaneTitle helpId="route.taskCenter">{t("tasks.queue")}</PaneTitle>
        <div className="task-toolbar">
          <button
            type="button"
            className="compact-button"
            onClick={clearCompleted}
            disabled={
              !tasks.some(
                (task) => task.state !== "pending" && task.state !== "running",
              )
            }
          >
            <Trash2 size={14} />
            {t("actions.clearCompleted")}
          </button>
        </div>
        {visibleTasks.map((task) => (
          <button
            key={task.id}
            type="button"
            className="task-row"
            onClick={() => onSelect(task.id)}
          >
            <StatusPill
              status={
                task.state === "failed"
                  ? "broken"
                  : task.state === "running"
                    ? "drift"
                    : "same"
              }
              label={t(`taskState.${task.state}`)}
            />
            <span>{t(task.titleKey)}</span>
          </button>
        ))}
        {visibleTasks.length === 0 ? (
          <span className="muted block-copy">{t("tasks.noMatchingTasks")}</span>
        ) : null}
      </section>
      <section className="pane fill">
        <PaneTitle helpId="route.taskCenter">
          {t("tasks.logInspector")}
        </PaneTitle>
        {selectedTask ? (
          <>
            <div className="task-actions">
              <StatusPill
                status={taskStateToStatus(selectedTask.state)}
                label={t(`taskState.${selectedTask.state}`)}
              />
              <button
                type="button"
                className="compact-button"
                onClick={() => void onCancel(selectedTask.id)}
                disabled={!canCancel}
                title={!canCancel ? t("tasks.cancelUnavailable") : undefined}
              >
                <X size={14} />
                {t("actions.cancel")}
              </button>
              <button
                type="button"
                className={`compact-button ${isArchiving ? "is-running" : ""}`}
                onClick={() => void archiveSelected()}
                disabled={!canArchive || isArchiving}
                aria-busy={isArchiving}
              >
                <Download size={14} />
                {isArchiving
                  ? t("actions.archiving")
                  : t("actions.writeArchive")}
              </button>
            </div>
            {archivePath ? (
              <div className="apply-feedback status-same" role="status">
                <StatusPill status="same" />
                <span>{t("tasks.archiveWritten", { path: archivePath })}</span>
              </div>
            ) : null}
            <code>{selectedTask.argv.join(" ")}</code>
            <pre>{`${selectedTask.stdout ?? ""}\n${selectedTask.stderr ?? ""}`}</pre>
          </>
        ) : (
          <span className="muted">{t("tasks.noTask")}</span>
        )}
      </section>
    </div>
  );
}

function Docs({
  docs,
  selectedDoc,
  onSelect,
  searchText,
}: {
  docs: DocsEntry[];
  selectedDoc?: DocsEntry;
  onSelect: (id: string) => void;
  searchText: string;
}) {
  const { t } = useTranslation();
  const [docSearch, setDocSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = [searchText, docSearch]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const filteredDocs = docs.filter((doc) => {
    if (query.length === 0) {
      return true;
    }
    const values = [
      doc.title ?? t(doc.titleKey),
      doc.category ?? t(doc.categoryKey),
      doc.path,
      doc.summary,
      doc.bodyPreview,
      ...doc.headings,
    ];
    return query.every((term) =>
      values.some(
        (value) =>
          typeof value === "string" && value.toLowerCase().includes(term),
      ),
    );
  });
  const pageCount = getPageCount(filteredDocs.length, DOCS_PAGE_SIZE);
  const currentPage = clampPage(page, pageCount);
  const pageDocs = paginate(filteredDocs, currentPage, DOCS_PAGE_SIZE);
  const activeDoc =
    filteredDocs.find((doc) => doc.id === selectedDoc?.id) ??
    pageDocs[0] ??
    filteredDocs[0];
  useEffect(() => {
    setPage(1);
  }, [searchText, docSearch, docs]);
  return (
    <div className="split-view docs-view">
      <section className="pane queue">
        <PaneTitle helpId="route.docs">{t("docs.title")}</PaneTitle>
        <div className="list-toolbar stacked-toolbar">
          <label className="toolbar-search">
            <Search size={15} />
            <input
              value={docSearch}
              onChange={(event) => setDocSearch(event.target.value)}
              placeholder={t("docs.search")}
            />
          </label>
        </div>
        <div className="doc-list">
          {pageDocs.map((doc) => (
            <button
              key={doc.id}
              type="button"
              className={`doc-row ${activeDoc?.id === doc.id ? "selected" : ""}`}
              onClick={() => onSelect(doc.id)}
            >
              <FileText size={16} />
              <span>{doc.title ?? t(doc.titleKey)}</span>
              <small>{doc.category ?? t(doc.categoryKey)}</small>
            </button>
          ))}
          {pageDocs.length === 0 ? (
            <span className="muted block-copy">{t("docs.noMatchingDocs")}</span>
          ) : null}
        </div>
        <div className="docs-pagination">
          <PaginationControls
            page={currentPage}
            pageCount={pageCount}
            total={filteredDocs.length}
            onPageChange={setPage}
          />
        </div>
      </section>
      <section className="pane fill">
        <PaneTitle helpId="route.docs">
          {activeDoc
            ? (activeDoc.title ?? t(activeDoc.titleKey))
            : t("docs.title")}
        </PaneTitle>
        <PathValue value={activeDoc?.path ?? ""} />
        <p>{activeDoc?.summary}</p>
        {activeDoc?.path.endsWith("SKILL.md") ? (
          <p className="source-note">{t("docs.sourceInstructionEnglish")}</p>
        ) : null}
        <ul className="heading-list">
          {activeDoc?.headings.map((heading) => (
            <li key={heading}>{heading}</li>
          ))}
        </ul>
        {activeDoc?.bodyPreview ? (
          <pre className="doc-preview">{activeDoc.bodyPreview}</pre>
        ) : null}
      </section>
    </div>
  );
}

function SettingsPage({
  settings,
  diagnostics,
  diagnosticsRunning,
  onSettings,
  onChooseSourceRepository,
  onChooseActiveConfig,
  onDiagnostics,
  focusTarget,
  onFocusHandled,
}: {
  settings?: AppSettings;
  diagnostics?: DiagnosticsResult;
  diagnosticsRunning: boolean;
  onSettings: (patch: Partial<AppSettings>) => Promise<void>;
  onChooseSourceRepository: () => Promise<void>;
  onChooseActiveConfig: () => Promise<void>;
  onDiagnostics: () => Promise<void>;
  focusTarget?: SettingsPathFocusTarget;
  onFocusHandled?: () => void;
}) {
  const { t } = useTranslation();
  const sourceRepositoryRef = useRef<HTMLDivElement>(null);
  const activeConfigRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusTarget) {
      return;
    }
    const target =
      focusTarget === "sourceRepository"
        ? sourceRepositoryRef.current
        : activeConfigRef.current;
    if (!target) {
      return;
    }
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    target.focus({ preventScroll: true });
    onFocusHandled?.();
  }, [focusTarget, onFocusHandled]);

  return (
    <div className="settings-grid">
      <section className="pane">
        <PaneTitle helpId="route.settings">
          {t("settings.appearance")}
        </PaneTitle>
        <div className="settings-field">
          <label>{t("settings.theme")}</label>
          <Segmented
            label={t("settings.theme")}
            value={settings?.theme ?? "system"}
            options={[
              ["light", t("theme.light"), Sun],
              ["dark", t("theme.dark"), Moon],
              ["system", t("theme.system"), MonitorCog],
            ]}
            onChange={(value) => void onSettings({ theme: value as ThemeMode })}
          />
        </div>
        <div className="settings-field">
          <label>{t("settings.language")}</label>
          <Segmented
            label={t("settings.language")}
            value={settings?.language ?? "zh-CN"}
            options={[
              ["en", t("language.en"), Languages],
              ["zh-CN", t("language.zh-CN"), Languages],
            ]}
            onChange={(value) =>
              void onSettings({ language: value as LanguageCode })
            }
          />
        </div>
      </section>
      <section className="pane">
        <PaneTitle helpId="route.settings">{t("settings.paths")}</PaneTitle>
        <PathValue
          value={settings?.sourceRepositoryPath ?? ""}
          label={t("settings.sourceRepository")}
          actionLabel={t("actions.choose")}
          onAction={onChooseSourceRepository}
          containerRef={sourceRepositoryRef}
          tabIndex={-1}
        />
        <PathValue
          value={settings?.activeConfigPath ?? ""}
          label={t("settings.activeConfig")}
          actionLabel={t("actions.choose")}
          onAction={onChooseActiveConfig}
          containerRef={activeConfigRef}
          tabIndex={-1}
        />
      </section>
      <section className="pane wide">
        <PaneTitle helpId="settings.runtime">{t("settings.runtime")}</PaneTitle>
        <div className="inline-actions settings-runtime-actions">
          <button
            type="button"
            className={`button ${diagnosticsRunning ? "is-running" : ""}`}
            onClick={() => void onDiagnostics()}
            disabled={diagnosticsRunning}
            aria-busy={diagnosticsRunning}
          >
            <ShieldCheck size={15} />
            {diagnosticsRunning
              ? t("actions.diagnosticsRunning")
              : diagnostics
                ? t("actions.rerunDiagnostics")
                : t("actions.runDiagnostics")}
          </button>
          <span className="action-feedback" role="status">
            {diagnosticsRunning
              ? t("actions.diagnosticsRunning")
              : diagnostics
                ? t("actions.diagnosticsFinishedAt", {
                    time: formatTimestamp(diagnostics.checkedAt),
                  })
                : t("dashboard.diagnosticsNotRun")}
          </span>
        </div>
        <div className="diagnostic-list">
          {diagnostics?.checks.map((check) => (
            <DiagnosticLine key={check.id} check={check} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ConfigValidationBadge({
  dirty,
  validation,
}: {
  dirty: boolean;
  validation?: ConfigDraftValidationResult;
}) {
  const { t } = useTranslation();
  if (!validation) {
    return (
      <StatusPill status="unknown" label={t("config.validation.notRun")} />
    );
  }
  return (
    <span className="config-validation-badge">
      <StatusPill
        status={validation.ok ? (dirty ? "drift" : "same") : "broken"}
        label={
          validation.ok
            ? dirty
              ? t("config.validation.dirtyValid")
              : t("config.validation.valid")
            : t("config.validation.invalid")
        }
      />
    </span>
  );
}

function ValidationMessages({
  validation,
  prefix,
}: {
  validation?: ConfigDraftValidationResult;
  prefix?: string;
}) {
  const { t } = useTranslation();
  const issues =
    validation?.issues.filter((issue) =>
      prefix ? issue.path.startsWith(prefix) : true,
    ) ?? [];
  if (!validation) {
    return <p className="muted block-copy">{t("config.validation.notRun")}</p>;
  }
  if (issues.length === 0) {
    return <StatusLine status="same" text={t("config.validation.noIssues")} />;
  }
  return (
    <div className="validation-message-list">
      {issues.map((issue, index) => (
        <div
          key={`${issue.path}-${issue.detail}-${index}`}
          className="validation-message"
        >
          <StatusPill status="broken" label={t(issue.messageKey)} />
          <code>{issue.path}</code>
          <span>{issue.detail}</span>
        </div>
      ))}
    </div>
  );
}

function getNestedRepoMode(
  config: InstallDiscoveryConfig,
  root: string,
): "skip" | "include" {
  const configV2 = toV2Config(config);
  const override = configV2.discovery.rootOptions?.find(
    (option) => option.root === root,
  );
  const skipNestedRepos =
    override?.skipNestedRepos ?? configV2.discovery.skipNestedRepos;
  return skipNestedRepos ? "skip" : "include";
}

function replaceProjectRoot(
  current: InstallDiscoveryConfig,
  index: number,
  previousRoot: string,
  value: string,
): InstallDiscoveryConfig {
  return updateV2Config(current, (draft) => {
    draft.discovery.roots = draft.discovery.roots.map((item, itemIndex) =>
      itemIndex === index ? value : item,
    );
    draft.discovery.rootOptions = draft.discovery.rootOptions?.map((option) =>
      option.root === previousRoot ? { ...option, root: value } : option,
    );
  });
}

function removeProjectRoot(
  current: InstallDiscoveryConfig,
  index: number,
  root: string,
): InstallDiscoveryConfig {
  return updateV2Config(current, (draft) => {
    draft.discovery.roots = draft.discovery.roots.filter(
      (_, itemIndex) => itemIndex !== index,
    );
    draft.discovery.rootOptions = draft.discovery.rootOptions?.filter(
      (option) => option.root !== root,
    );
  });
}

function setNestedRepoMode(
  current: InstallDiscoveryConfig,
  root: string,
  skipNestedRepos: boolean,
): InstallDiscoveryConfig {
  return updateV2Config(current, (draft) => {
    const rootOptions = draft.discovery.rootOptions ?? [];
    const existing = rootOptions.some((option) => option.root === root);
    draft.discovery.rootOptions = existing
      ? rootOptions.map((option) =>
          option.root === root ? { ...option, skipNestedRepos } : option,
        )
      : [...rootOptions, { root, skipNestedRepos }];
  });
}

function keepOnlyProjectTarget(
  current: InstallDiscoveryConfig,
  projectPath: string,
): InstallDiscoveryConfig {
  return updateV2Config(current, (draft) => {
    draft.userTargets.enabled = false;
    draft.projectDefaults.enabled = false;
    draft.projectTargets = draft.projectTargets
      .filter((target) => target.path === projectPath)
      .map((target) => ({ ...target, enabled: true }));
  });
}

type PolicySelectionTarget =
  | { kind: "skill"; scope: "user"; tool: ConfigToolKind }
  | { kind: "skill"; scope: "projectDefaults"; tool: ConfigToolKind }
  | {
      kind: "skill";
      scope: "projectTarget";
      tool: ConfigToolKind;
      projectPath: string;
    }
  | { kind: "workflow"; scope: "user" }
  | { kind: "workflow"; scope: "projectDefaults" }
  | { kind: "workflow"; scope: "projectTarget"; projectPath: string }
  | { kind: "protection" };

function togglePolicyItem(
  current: InstallDiscoveryConfig,
  target: PolicySelectionTarget,
  name: string,
  checked: boolean,
): InstallDiscoveryConfig {
  return updateV2Config(current, (draft) => {
    const existing = getPolicyValues(draft, target);
    setPolicyValues(
      draft,
      target,
      checked
        ? addUnique(existing, name)
        : existing.filter((item) => item !== name),
    );
  });
}

function movePolicyItem(
  current: InstallDiscoveryConfig,
  selectionTarget: PolicySelectionTarget,
  index: number,
  direction: -1 | 1,
): InstallDiscoveryConfig {
  return updateV2Config(current, (draft) => {
    const values = [...getPolicyValues(draft, selectionTarget)];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= values.length) {
      return;
    }
    const [item] = values.splice(index, 1);
    values.splice(targetIndex, 0, item);
    setPolicyValues(draft, selectionTarget, values);
  });
}

function getPolicyValues(
  config: InstallDiscoveryConfigV2,
  target: PolicySelectionTarget,
): string[] {
  if (target.kind === "protection") {
    return config.promotionRules.doNotPromoteToUserSkills;
  }
  if (target.scope === "user") {
    return target.kind === "skill"
      ? config.userTargets.skills[target.tool]
      : config.userTargets.workflows;
  }
  if (target.scope === "projectDefaults") {
    return target.kind === "skill"
      ? config.projectDefaults.skills[target.tool]
      : config.projectDefaults.workflows;
  }
  const projectTarget = config.projectTargets.find(
    (item) => item.path === target.projectPath,
  );
  if (!projectTarget) {
    return [];
  }
  return target.kind === "skill"
    ? projectTarget.skills[target.tool]
    : projectTarget.workflows;
}

function setPolicyValues(
  config: InstallDiscoveryConfigV2,
  target: PolicySelectionTarget,
  values: string[],
): void {
  if (target.kind === "protection") {
    config.promotionRules.doNotPromoteToUserSkills = values;
    return;
  }
  if (target.scope === "user") {
    config.userTargets.enabled = true;
    if (target.kind === "skill") {
      config.userTargets.tools = addUnique(
        config.userTargets.tools,
        target.tool,
      );
      config.userTargets.skills[target.tool] = values;
    } else {
      config.userTargets.workflows = values;
    }
    return;
  }
  if (target.scope === "projectDefaults") {
    config.projectDefaults.enabled = true;
    if (target.kind === "skill") {
      config.projectDefaults.tools = addUnique(
        config.projectDefaults.tools,
        target.tool,
      );
      config.projectDefaults.skills[target.tool] = values;
    } else {
      config.projectDefaults.workflows = values;
    }
    return;
  }
  const projectTarget = ensureProjectTarget(config, target.projectPath);
  projectTarget.enabled = true;
  if (target.kind === "skill") {
    projectTarget.tools = addUnique(projectTarget.tools, target.tool);
    projectTarget.skills[target.tool] = values;
  } else {
    projectTarget.workflows = values;
  }
}

function addPolicyName(
  current: InstallDiscoveryConfig,
  target: PolicySelectionTarget,
  name: string,
): InstallDiscoveryConfig {
  return updateV2Config(current, (draft) => {
    setPolicyValues(
      draft,
      target,
      addUnique(getPolicyValues(draft, target), name),
    );
  });
}

function addSkillToBothTools(
  current: InstallDiscoveryConfig,
  scope: "user" | "projectDefaults" | "projectTarget",
  name: string,
  projectPath?: string,
): InstallDiscoveryConfig {
  return updateV2Config(current, (draft) => {
    const targets: PolicySelectionTarget[] =
      scope === "projectTarget"
        ? [
            {
              kind: "skill",
              scope,
              tool: "codex",
              projectPath: projectPath ?? "",
            },
            {
              kind: "skill",
              scope,
              tool: "claudeCode",
              projectPath: projectPath ?? "",
            },
          ]
        : [
            { kind: "skill", scope, tool: "codex" },
            { kind: "skill", scope, tool: "claudeCode" },
          ];
    for (const target of targets) {
      if (
        target.kind === "skill" &&
        target.scope === "projectTarget" &&
        !target.projectPath
      ) {
        continue;
      }
      setPolicyValues(
        draft,
        target,
        addUnique(getPolicyValues(draft, target), name),
      );
    }
  });
}

function addProjectTarget(
  current: InstallDiscoveryConfig,
  projectPath: string,
): InstallDiscoveryConfig {
  return updateV2Config(current, (draft) => {
    ensureProjectTarget(draft, projectPath).enabled = true;
  });
}

function updateProjectTarget(
  current: InstallDiscoveryConfig,
  projectPath: string,
  updater: (target: ProjectTargetOverrideV2) => void,
): InstallDiscoveryConfig {
  return updateV2Config(current, (draft) => {
    updater(ensureProjectTarget(draft, projectPath));
  });
}

function ensureProjectTarget(
  config: InstallDiscoveryConfigV2,
  projectPath: string,
): ProjectTargetOverrideV2 {
  const existing = config.projectTargets.find(
    (target) => target.path === projectPath,
  );
  if (existing) {
    return existing;
  }
  const created: ProjectTargetOverrideV2 = {
    path: projectPath,
    enabled: true,
    tools: ["codex", "claudeCode"],
    skills: { codex: [], claudeCode: [] },
    workflows: [],
    createTargets: false,
    mode: "merge",
  };
  config.projectTargets.push(created);
  return created;
}

function policyTargetKey(target: PolicySelectionTarget): string {
  if (target.kind === "protection") {
    return "protection";
  }
  return [
    target.kind,
    target.scope,
    "tool" in target ? target.tool : "shared",
    "projectPath" in target ? target.projectPath : "",
  ]
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9_-]/g, "-");
}

function addUnique<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values : [...values, value];
}

function getAllToolNames(selection?: ToolRoutineSelection): string[] {
  if (!selection) {
    return [];
  }
  return Array.from(new Set([...selection.codex, ...selection.claudeCode]));
}

function toToolRoutineSelection(
  values: string[],
  tools: ConfigToolKind[],
): ToolRoutineSelection {
  return {
    codex: tools.includes("codex") ? [...values] : [],
    claudeCode: tools.includes("claudeCode") ? [...values] : [],
  };
}

function updateV2Config(
  current: InstallDiscoveryConfig,
  updater: (draft: InstallDiscoveryConfigV2) => void,
): InstallDiscoveryConfigV2 {
  const draft = cloneConfig(toV2Config(current));
  updater(draft);
  return draft;
}

function cloneConfig(
  config: InstallDiscoveryConfigV2,
): InstallDiscoveryConfigV2 {
  return {
    ...config,
    userTargets: {
      ...config.userTargets,
      tools: [...config.userTargets.tools],
      skills: {
        codex: [...config.userTargets.skills.codex],
        claudeCode: [...config.userTargets.skills.claudeCode],
      },
      workflows: [...config.userTargets.workflows],
    },
    projectDefaults: cloneProjectTargetDefaults(config.projectDefaults),
    projectTargets: config.projectTargets.map((target) => ({
      ...cloneProjectTargetDefaults(target),
      path: target.path,
    })),
    discovery: {
      ...config.discovery,
      roots: [...config.discovery.roots],
      excludeDirs: [...config.discovery.excludeDirs],
      rootOptions: config.discovery.rootOptions?.map((option) => ({
        ...option,
      })),
    },
    promotionRules: {
      doNotPromoteToUserSkills: [
        ...config.promotionRules.doNotPromoteToUserSkills,
      ],
    },
    output: { ...config.output },
    applySafety: { ...config.applySafety },
  };
}

function cloneProjectTargetDefaults<
  T extends
    | ProjectTargetOverrideV2
    | InstallDiscoveryConfigV2["projectDefaults"],
>(target: T): T {
  return {
    ...target,
    tools: [...target.tools],
    skills: {
      codex: [...target.skills.codex],
      claudeCode: [...target.skills.claudeCode],
    },
    workflows: [...target.workflows],
  };
}

function toV2Config(config: InstallDiscoveryConfig): InstallDiscoveryConfigV2 {
  if (config.version === 2) {
    return config;
  }
  return migrateV1Config(config);
}

function migrateV1Config(
  config: InstallDiscoveryConfigV1,
): InstallDiscoveryConfigV2 {
  const userSkills = config.scopePolicy.userLevelSkills.filter(
    (name) => !config.scopePolicy.projectLevelOnlySkills.includes(name),
  );
  return {
    version: 2,
    userTargets: {
      enabled:
        userSkills.length > 0 ||
        config.scopePolicy.userLevelWorkflows.length > 0,
      tools: [...config.tools],
      skills: toToolRoutineSelection(userSkills, config.tools),
      workflows: [...config.scopePolicy.userLevelWorkflows],
    },
    projectDefaults: {
      enabled: config.scopePolicy.projectDefaultWorkflows.length > 0,
      tools: [...config.tools],
      skills: { codex: [], claudeCode: [] },
      workflows: [...config.scopePolicy.projectDefaultWorkflows],
      createTargets: false,
      mode: "merge",
    },
    projectTargets: [],
    discovery: {
      roots: [...config.projectRoots],
      maxDepth: config.projectDiscovery.maxDepth,
      excludeDirs: [...config.projectDiscovery.excludeDirs],
      skipNestedRepos: config.projectDiscovery.skipNestedRepos,
      rootOptions: config.projectDiscovery.rootOptions?.map((option) => ({
        ...option,
      })),
    },
    promotionRules: {
      doNotPromoteToUserSkills: [...config.scopePolicy.projectLevelOnlySkills],
    },
    output: { ...config.output },
    applySafety: {
      unknownInstalledItems: config.scopePolicy.unknownInstalledItems,
    },
  };
}

function getScopeSummary(
  t: TFunction,
  config?: InstallDiscoveryConfig,
): string {
  if (!config) {
    return t("common.unknown");
  }
  const configV2 = toV2Config(config);
  if (configV2.userTargets.enabled && configV2.projectTargets.length > 0) {
    return t("distribute.scope.userAndSelectedProjects");
  }
  if (configV2.userTargets.enabled) {
    return t("distribute.scope.userOnly");
  }
  if (configV2.projectTargets.length > 0) {
    return t("distribute.scope.selectedProjects");
  }
  if (configV2.projectDefaults.enabled) {
    return t("distribute.scope.allDiscoveredProjects");
  }
  return t("distribute.scope.none");
}

function Placeholder({
  titleKey,
  bodyKey,
}: {
  titleKey: string;
  bodyKey: string;
}) {
  const { t } = useTranslation();
  return (
    <section className="pane fill placeholder">
      <h2>{t(titleKey)}</h2>
      <p>{t(bodyKey)}</p>
      <StatusLine status="unknown" text={t("common.loading")} />
    </section>
  );
}

function EmptyState({
  icon: Icon = CircleHelp,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: ComponentType<{ size?: number }>;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <section className="empty-state" aria-live="polite">
      <span className="empty-state-icon" aria-hidden="true">
        <Icon size={20} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
      {actionLabel && onAction ? (
        <button type="button" className="compact-button" onClick={onAction}>
          <RefreshCcw size={14} />
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <section className="metric pane">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </section>
  );
}

function PaneTitle({
  children,
  helpId,
  className,
}: {
  children: ReactNode;
  helpId?: HelpTopicId;
  className?: string;
}) {
  return (
    <div className={["pane-title", className ?? ""].filter(Boolean).join(" ")}>
      <div className="pane-title-content">{children}</div>
      {helpId ? <HelpButton topicId={helpId} /> : null}
    </div>
  );
}

function HelpButton({
  topicId,
  className,
}: {
  topicId: HelpTopicId;
  className?: string;
}) {
  const { t } = useTranslation();
  const openHelp = useContext(HelpContext);
  const topic = helpTopics[topicId];
  const [previewPosition, setPreviewPosition] = useState<HelpPreviewPosition>();
  const previewId = `help-preview-${topicId.replace(/[^a-z0-9-]/gi, "-")}`;
  const updatePreviewPosition = (button: HTMLButtonElement) => {
    const rect = button.getBoundingClientRect();
    const width = Math.min(320, Math.max(240, window.innerWidth - 24));
    const left = Math.min(
      Math.max(12, rect.right - width),
      window.innerWidth - width - 12,
    );
    const placement = rect.top > 220 ? "above" : "below";
    setPreviewPosition({
      left,
      top: placement === "above" ? rect.top - 8 : rect.bottom + 8,
      width,
      placement,
    });
  };
  const hidePreview = () => setPreviewPosition(undefined);
  return (
    <>
      <button
        type="button"
        className={["help-button", className ?? ""].filter(Boolean).join(" ")}
        onClick={(event) => {
          event.stopPropagation();
          hidePreview();
          openHelp?.(topicId);
        }}
        onMouseEnter={(event) => updatePreviewPosition(event.currentTarget)}
        onMouseLeave={hidePreview}
        onFocus={(event) => updatePreviewPosition(event.currentTarget)}
        onBlur={hidePreview}
        aria-label={t("help.openShort")}
        aria-describedby={previewPosition ? previewId : undefined}
      >
        <span className="help-glyph" aria-hidden="true">
          ?
        </span>
      </button>
      {previewPosition
        ? createPortal(
            <HelpPreview
              id={previewId}
              topicId={topicId}
              position={previewPosition}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function HelpPreview({
  id,
  topicId,
  position,
}: {
  id: string;
  topicId: HelpTopicId;
  position: HelpPreviewPosition;
}) {
  const { t } = useTranslation();
  const topic = helpTopics[topicId];
  const style = {
    left: position.left,
    top: position.top,
    width: position.width,
  } satisfies CSSProperties;
  return (
    <section
      id={id}
      className={`help-popover help-popover-${position.placement}`}
      role="tooltip"
      style={style}
    >
      <strong>{t(topic.titleKey)}</strong>
      <p>{t(topic.bodyKey)}</p>
      {"itemKeys" in topic && topic.itemKeys.length > 0 ? (
        <ul>
          {topic.itemKeys.slice(0, 3).map((itemKey) => (
            <li key={itemKey}>{t(itemKey)}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function HelpDialog({
  topicId,
  onClose,
}: {
  topicId: HelpTopicId;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const topic = helpTopics[topicId];
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  return (
    <div
      className="help-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
      >
        <div className="help-dialog-head">
          <h2 id="help-dialog-title">{t(topic.titleKey)}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={t("actions.close")}
            title={t("actions.close")}
          >
            <X size={15} />
          </button>
        </div>
        <p>{t(topic.bodyKey)}</p>
        {"itemKeys" in topic && topic.itemKeys.length > 0 ? (
          <ul>
            {topic.itemKeys.map((itemKey) => (
              <li key={itemKey}>{t(itemKey)}</li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function StatusLine({ status, text }: { status: InstallStatus; text: string }) {
  return (
    <div className="status-line">
      <StatusPill status={status} />
      <span>{text}</span>
    </div>
  );
}

function DiagnosticLine({ check }: { check: DiagnosticCheck }) {
  const { t } = useTranslation();
  const status: InstallStatus =
    check.status === "ok"
      ? "same"
      : check.status === "warning"
        ? "drift"
        : "broken";
  const detail = check.reasonKey
    ? `${t(check.reasonKey)}: ${check.detail}`
    : check.detail;
  return (
    <div className="diagnostic-line">
      <StatusPill status={status} />
      <span>{t(check.labelKey)}</span>
      <code>{detail}</code>
    </div>
  );
}

function StatusPill({
  status,
  label,
}: {
  status: InstallStatus;
  label?: string;
}) {
  const { t } = useTranslation();
  const Icon = statusIcons[status];
  return (
    <span className={`status-pill status-${status}`}>
      <Icon size={15} />
      {label ?? t(`status.${status}`)}
    </span>
  );
}

function matrixTargetPathValue(t: TFunction, cell: InstallMatrixCell): string {
  if (cell.targetPath) {
    return cell.targetPath;
  }
  if (cell.status === "shared") {
    return t("matrix.details.sharedTarget");
  }
  if (cell.status === "not-targeted") {
    return t("matrix.details.notTargeted");
  }
  return "-";
}

function PathChip({
  label,
  value,
  actionLabel,
  onClick,
}: {
  label: string;
  value: string;
  actionLabel?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span>{label}</span>
      <code title={value}>{middleEllipsis(value)}</code>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        className="path-chip path-chip-button"
        onClick={onClick}
        aria-label={actionLabel}
        title={actionLabel}
      >
        {content}
      </button>
    );
  }
  return (
    <div className="path-chip" title={value}>
      {content}
    </div>
  );
}

function PathValue({
  value,
  label,
  actionLabel,
  onAction,
  containerRef,
  tabIndex,
}: {
  value: string;
  label?: string;
  actionLabel?: string;
  onAction?: () => Promise<void> | void;
  containerRef?: Ref<HTMLDivElement>;
  tabIndex?: number;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copyValue = async () => {
    if (!value) {
      return;
    }
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(value);
      }
    } catch {
      // Browser preview may block clipboard writes; still show local feedback.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div
      ref={containerRef}
      className={`path-value ${onAction ? "with-action" : ""}`}
      tabIndex={tabIndex}
      title={value}
    >
      {label ? <span>{label}</span> : null}
      <code>{middleEllipsis(value)}</code>
      {copied ? (
        <small className="copy-feedback" role="status" aria-live="polite">
          {t("actions.copied")}
        </small>
      ) : null}
      {onAction ? (
        <button
          type="button"
          className="icon-button path-action-button"
          onClick={() => void onAction()}
          aria-label={[actionLabel, label].filter(Boolean).join(" ")}
          title={actionLabel}
        >
          <FolderTree size={14} />
        </button>
      ) : null}
      <button
        type="button"
        className="icon-button copy-button"
        onClick={() => void copyValue()}
        disabled={!value}
        aria-label={t("actions.copyPath")}
        title={copied ? t("actions.copied") : t("actions.copyPath")}
      >
        <Copy size={14} />
      </button>
    </div>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string, ComponentType<{ size?: number }>]>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(([optionValue, label, Icon]) => (
        <button
          key={optionValue}
          type="button"
          className={value === optionValue ? "active" : ""}
          aria-pressed={value === optionValue}
          onClick={() => onChange(optionValue)}
          title={label}
        >
          <Icon size={14} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

function middleEllipsis(value: string): string {
  if (value.length <= 44) {
    return value;
  }
  return `${value.slice(0, 18)}...${value.slice(-22)}`;
}

function stringify(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value, null, 2);
}

function getActionStatusText(
  t: TFunction,
  lastAction: { kind: "refresh" | "diagnostics"; at: string } | undefined,
  isRefreshing: boolean,
  isDiagnosticsRunning: boolean,
): string | undefined {
  if (isRefreshing) {
    return t("actions.refreshing");
  }
  if (isDiagnosticsRunning) {
    return t("actions.diagnosticsRunning");
  }
  if (!lastAction) {
    return undefined;
  }
  const key =
    lastAction.kind === "refresh"
      ? "actions.refreshedAt"
      : "actions.diagnosticsFinishedAt";
  return t(key, { time: formatTimestamp(lastAction.at) });
}

function getConfigActionStatusText(
  t: TFunction,
  lastAction: { kind: "validate" | "save"; at: string } | undefined,
  isConfigValidating: boolean,
): string | undefined {
  if (isConfigValidating) {
    return t("actions.configValidating");
  }
  if (!lastAction) {
    return undefined;
  }
  return t(
    lastAction.kind === "validate"
      ? "actions.configValidatedAt"
      : "actions.configSavedAt",
    { time: formatTimestamp(lastAction.at) },
  );
}

function waitForFeedback(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, FEEDBACK_DELAY_MS);
  });
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function applyTheme(theme: ThemeMode): void {
  const resolved =
    theme === "system"
      ? window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeMode = theme;
}
