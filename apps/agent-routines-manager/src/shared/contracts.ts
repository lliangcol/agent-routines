export type PlatformKind = "windows" | "macos" | "linux";
export type ThemeMode = "light" | "dark" | "system";
export type LanguageCode = "en" | "zh-CN";
export type RoutineKind = "skill" | "workflow";
export type ToolKind = "codex" | "claude-code" | "shared-workflow-runtime";
export type ConfigToolKind = "codex" | "claudeCode";
export type DesiredTargetToolKind = ConfigToolKind | "shared";
export type ScopeKind = "user" | "project";
export type ApplyMode = "dry-run" | "merge" | "replace-listed" | "sync-prune";
export type InstallStatus =
  | "same"
  | "drift"
  | "broken"
  | "missing"
  | "unknown"
  | "shared"
  | "not-targeted";
export type TaskState =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";
export type ShellKind = "powershell" | "bash";

export type CommandId =
  | "validateInstallConfig"
  | "generateInstallPlan"
  | "writeManifest"
  | "applyDistribution"
  | "destructiveApplyDistribution"
  | "runRepositoryGate"
  | "checkInstallTarget";

export type GateId =
  | "validate-structure"
  | "validate-skills"
  | "validate-workflows"
  | "validate-docs"
  | "validate-changelog"
  | "validate-manifest"
  | "validate-install-discovery-config"
  | "run-workflows";

export interface RoutineItem {
  name: string;
  kind: RoutineKind;
  sourcePath: string;
  description: string;
  summary: string;
  recommendedWorkflows: string[];
  hasRequiredFiles: boolean;
  includedByDefault: boolean;
  missingRequiredFiles: string[];
}

export interface InstallMatrixCell {
  routineName: string;
  kind: RoutineKind;
  tool: ToolKind;
  scope: ScopeKind;
  columnId: MatrixColumnId;
  status: InstallStatus;
  projectPath?: string;
  desired?: boolean;
  operation?: InstallActionOperation;
  sourcePath?: string;
  targetPath?: string;
  missingFiles: string[];
  changedFiles: string[];
}

export type MatrixColumnId =
  | "codexUser"
  | "codexProject"
  | "claudeUser"
  | "claudeProject"
  | "workflowRuntime";

export interface MatrixColumn {
  id: MatrixColumnId;
  labelKey: string;
  metaKey: string;
  tool: ToolKind;
  scope: ScopeKind;
}

export interface InventoryScanResult {
  repositoryPath: string;
  scannedAt: string;
  routines: RoutineItem[];
  counts: {
    skills: number;
    workflows: number;
    broken: number;
  };
}

export interface InstallMatrixResult {
  scannedAt: string;
  columns: MatrixColumn[];
  rows: InstallMatrixRow[];
  summary: Record<InstallStatus, number>;
  projectDetails: InstallMatrixProjectDetail[];
  desiredOnly: boolean;
}

export interface InstallMatrixRow {
  routine: RoutineItem;
  cells: InstallMatrixCell[];
}

export interface InstallMatrixProjectDetail {
  projectPath: string;
  routineName: string;
  kind: RoutineKind;
  tool: DesiredTargetToolKind;
  status: InstallStatus;
  operation?: InstallActionOperation;
  sourcePath?: string;
  targetPath?: string;
  missingFiles: string[];
  changedFiles: string[];
}

export interface AppSettings {
  sourceRepositoryPath: string;
  activeConfigPath?: string;
  theme: ThemeMode;
  language: LanguageCode;
  recentProjectRoots: string[];
}

export type InstallDiscoveryConfig =
  | InstallDiscoveryConfigV1
  | InstallDiscoveryConfigV2;

export interface InstallDiscoveryConfigV1 {
  version: 1;
  projectRoots: string[];
  tools: ConfigToolKind[];
  projectDiscovery: {
    mode: "git-repos";
    maxDepth: number;
    excludeDirs: string[];
    skipNestedRepos: boolean;
    rootOptions?: ProjectRootDiscoveryOption[];
  };
  scopePolicy: ScopePolicy;
  output: {
    manifestPath: string;
    reportPath: string;
  };
  install: {
    validateBeforeInstall: boolean;
    verifyAfterInstall: boolean;
    force: boolean;
  };
}

export interface InstallDiscoveryConfigV2 {
  version: 2;
  userTargets: UserTargetsV2;
  projectDefaults: ProjectTargetDefaultsV2;
  projectTargets: ProjectTargetOverrideV2[];
  discovery: ProjectDiscoveryV2;
  promotionRules: PromotionRulesV2;
  output: {
    manifestPath: string;
    reportPath: string;
  };
  applySafety: {
    unknownInstalledItems: "report-only";
  };
}

export interface UserTargetsV2 {
  enabled: boolean;
  tools: ConfigToolKind[];
  skills: ToolRoutineSelection;
  workflows: string[];
}

export interface ProjectTargetDefaultsV2 {
  enabled: boolean;
  tools: ConfigToolKind[];
  skills: ToolRoutineSelection;
  workflows: string[];
  createTargets: boolean;
  mode: Exclude<ApplyMode, "dry-run" | "sync-prune">;
}

export interface ProjectTargetOverrideV2 extends ProjectTargetDefaultsV2 {
  path: string;
}

export interface ToolRoutineSelection {
  codex: string[];
  claudeCode: string[];
}

export interface ProjectDiscoveryV2 {
  roots: string[];
  maxDepth: number;
  excludeDirs: string[];
  skipNestedRepos: boolean;
  rootOptions?: ProjectRootDiscoveryOption[];
}

export interface PromotionRulesV2 {
  doNotPromoteToUserSkills: string[];
}

export interface ProjectRootDiscoveryOption {
  root: string;
  skipNestedRepos: boolean;
}

export interface ScopePolicy {
  desiredStateSource: "policy-with-installed-evidence";
  userLevelSkills: string[];
  projectLevelOnlySkills: string[];
  userLevelWorkflows: string[];
  projectDefaultWorkflows: string[];
  unknownInstalledItems: "report-only";
}

export type InstallActionOperation =
  | "install"
  | "skip"
  | "replace"
  | "prune-candidate";

export interface ConfigReadRequest extends ConfigPathRequest {}

export interface ConfigSaveAsRequest {
  config: InstallDiscoveryConfig;
  suggestedPath?: string;
}

export interface ConfigValidationIssue {
  path: string;
  messageKey: string;
  detail: string;
}

export interface ConfigDraftValidationResult {
  ok: boolean;
  issues: ConfigValidationIssue[];
}

export interface CommandEvidence {
  commandId: CommandId;
  executable: string;
  args: string[];
  cwd: string;
  shell: ShellKind | "direct";
  startedAt: string;
  endedAt: string;
  durationMs: number;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  canceled: boolean;
}

export interface TaskRecord {
  id: string;
  commandId:
    | CommandId
    | "inventory.scan"
    | "diagnostics.run"
    | "docs.open"
    | "archive.write";
  state: TaskState;
  startedAt?: string;
  endedAt?: string;
  exitCode?: number | null;
  cwd: string;
  argv: string[];
  titleKey: string;
  evidence?: CommandEvidence;
  stdout?: string;
  stderr?: string;
  cancelable: boolean;
}

export interface DiagnosticCheck {
  id: string;
  labelKey: string;
  status: "ok" | "warning" | "failed";
  detail: string;
  reasonKey?: DiagnosticReasonKey;
  command?: string[];
}

export type DiagnosticReasonKey =
  | "diagnostics.reason.commandNotFound"
  | "diagnostics.reason.pathUnavailable"
  | "diagnostics.reason.commandFailed"
  | "diagnostics.reason.timedOut";

export interface DiagnosticsResult {
  platform: PlatformKind;
  repositoryPath: string;
  checkedAt: string;
  checks: DiagnosticCheck[];
}

export interface ValidationGate {
  id: GateId;
  labelKey: string;
  shell: ShellKind;
  commandPreview: string[];
}

export interface RunGateRequest {
  gateId: GateId;
  shell: ShellKind;
}

export interface ConfigPathRequest {
  configPath: string;
}

export interface ConfirmedConfigPathRequest extends ConfigPathRequest {
  confirmed: boolean;
}

export interface ManifestWriteRequest extends ConfirmedConfigPathRequest {
  manifestDigest: string;
}

export interface ApplyDistributionRequest extends ManifestWriteRequest {
  mode?: ApplyMode;
  force?: boolean;
  confirmationText?: string;
  manifestPath?: string;
}

export interface PickFileRequest {
  titleKey: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

export interface PickDirectoryRequest {
  titleKey: string;
}

export interface DialogSelection {
  canceled: boolean;
  paths: string[];
}

export interface PlanGenerateResult {
  task: TaskRecord;
  planJson?: unknown;
  generatedManifest?: unknown;
  manifestDiff?: ManifestDiffResult;
}

export interface ManifestDiffResult {
  state: "unavailable" | "missing-current" | "unchanged" | "changed";
  currentPath?: string;
  digest?: string;
  text?: string;
}

export interface DocsEntry {
  id: string;
  titleKey: string;
  title?: string;
  categoryKey: string;
  category?: string;
  path: string;
  headings: string[];
  summary: string;
  bodyPreview?: string;
}

export interface DocOpenRequest {
  id: string;
}

export interface ArchiveWriteRequest {
  taskId: string;
  includePlan: boolean;
  confirmed: boolean;
}

export interface ArchiveWriteResult {
  task: TaskRecord;
  archivePath?: string;
}

export interface AgentRoutinesApi {
  app: {
    onSearch: (listener: () => void) => () => void;
  };
  settings: {
    get: () => Promise<AppSettings>;
    update: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  };
  inventory: {
    scan: () => Promise<InventoryScanResult>;
    matrix: () => Promise<InstallMatrixResult>;
  };
  installConfig: {
    open: (request: PickFileRequest) => Promise<DialogSelection>;
    read: (request: ConfigReadRequest) => Promise<InstallDiscoveryConfig>;
    validateDraft: (
      config: InstallDiscoveryConfig,
    ) => Promise<ConfigDraftValidationResult>;
    validate: (request: ConfigPathRequest) => Promise<TaskRecord>;
    saveAs: (request: ConfigSaveAsRequest) => Promise<DialogSelection>;
  };
  plan: {
    generate: (request: ConfigPathRequest) => Promise<PlanGenerateResult>;
  };
  manifest: {
    write: (request: ManifestWriteRequest) => Promise<TaskRecord>;
  };
  distribution: {
    apply: (request: ApplyDistributionRequest) => Promise<TaskRecord>;
  };
  validation: {
    listGates: () => Promise<ValidationGate[]>;
    runGate: (request: RunGateRequest) => Promise<TaskRecord>;
  };
  diagnostics: {
    run: () => Promise<DiagnosticsResult>;
  };
  tasks: {
    list: () => Promise<TaskRecord[]>;
    cancel: (taskId: string) => Promise<TaskRecord>;
    subscribe: (listener: (task: TaskRecord) => void) => () => void;
  };
  archive: {
    write: (request: ArchiveWriteRequest) => Promise<ArchiveWriteResult>;
  };
  dialogs: {
    pickFile: (request: PickFileRequest) => Promise<DialogSelection>;
    pickDirectory: (request: PickDirectoryRequest) => Promise<DialogSelection>;
  };
  docs: {
    list: () => Promise<DocsEntry[]>;
    open: (request: DocOpenRequest) => Promise<TaskRecord>;
  };
}

export const statusKeys: InstallStatus[] = [
  "same",
  "drift",
  "broken",
  "missing",
  "unknown",
  "shared",
  "not-targeted",
];

export const gateIds: GateId[] = [
  "validate-structure",
  "validate-skills",
  "validate-workflows",
  "validate-docs",
  "validate-changelog",
  "validate-manifest",
  "validate-install-discovery-config",
  "run-workflows",
];

export const matrixColumns: MatrixColumn[] = [
  {
    id: "codexUser",
    labelKey: "matrix.columns.codexUser",
    metaKey: "matrix.columns.codexUserMeta",
    tool: "codex",
    scope: "user",
  },
  {
    id: "codexProject",
    labelKey: "matrix.columns.codexProject",
    metaKey: "matrix.columns.codexProjectMeta",
    tool: "codex",
    scope: "project",
  },
  {
    id: "claudeUser",
    labelKey: "matrix.columns.claudeUser",
    metaKey: "matrix.columns.claudeUserMeta",
    tool: "claude-code",
    scope: "user",
  },
  {
    id: "claudeProject",
    labelKey: "matrix.columns.claudeProject",
    metaKey: "matrix.columns.claudeProjectMeta",
    tool: "claude-code",
    scope: "project",
  },
  {
    id: "workflowRuntime",
    labelKey: "matrix.columns.workflowRuntime",
    metaKey: "matrix.columns.workflowRuntimeMeta",
    tool: "shared-workflow-runtime",
    scope: "user",
  },
];
