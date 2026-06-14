import {
  matrixColumns,
  statusKeys,
  type AgentRoutinesApi,
  type AppSettings,
  type DiagnosticsResult,
  type DocsEntry,
  type InstallMatrixResult,
  type InstallDiscoveryConfig,
  type InventoryScanResult,
  type RoutineItem,
  type TaskRecord,
  type ValidationGate,
} from "../shared/contracts.js";

export const api: AgentRoutinesApi =
  window.agentRoutines ?? createBrowserPreviewApi();
export const isBrowserPreview = !window.agentRoutines;

function createBrowserPreviewApi(): AgentRoutinesApi {
  const previewParams = new URLSearchParams(window.location.search);
  const previewManifestDigest =
    "0000000000000000000000000000000000000000000000000000000000000000";
  let settings: AppSettings = {
    sourceRepositoryPath: "D:\\Repositories\\agent-routines",
    activeConfigPath:
      "D:\\Repositories\\agent-routines\\tools\\install-discovery.config.example.json",
    theme: "system",
    language: "zh-CN",
    recentProjectRoots: ["D:\\Repositories\\agent-routines"],
  };
  let tasks: TaskRecord[] = [];
  let distributionApplied = false;

  return {
    app: {
      onSearch: () => () => undefined,
    },
    settings: {
      get: async () => settings,
      update: async (next) => {
        settings = {
          ...settings,
          ...next,
          activeConfigPath:
            next.sourceRepositoryPath && next.activeConfigPath === undefined
              ? `${next.sourceRepositoryPath}\\tools\\install-discovery.config.example.json`
              : (next.activeConfigPath ?? settings.activeConfigPath),
        };
        return settings;
      },
    },
    inventory: {
      scan: async () => sampleInventory(),
      matrix: async () => sampleMatrix(distributionApplied),
    },
    installConfig: {
      open: async () => ({ canceled: true, paths: [] }),
      read: async () => sampleConfig(),
      validateDraft: async (config) => validateConfigPreview(config),
      validate: async () =>
        pushPreviewTask(
          tasks,
          "validateInstallConfig",
          "tasks.validateInstallConfig",
        ),
      saveAs: async (request) => ({
        canceled: false,
        paths: [
          request.suggestedPath ??
            "D:\\Repositories\\agent-routines\\tools\\install-discovery.config.example.json",
        ],
      }),
    },
    plan: {
      generate: async () => {
        if (previewParams.get("plan") === "fail") {
          return {
            task: await pushPreviewTask(
              tasks,
              "generateInstallPlan",
              "tasks.generateInstallPlan",
              "failed",
              ["browser-preview", "plan=fail"],
              "",
              "projectDiscovery.rootOptions must be an array.",
            ),
            manifestDiff: { state: "unavailable" },
          };
        }
        const skipOnlyPlan = previewParams.get("plan") === "skip";
        const generatedManifest = {
          version: 2,
          desiredTargets: [
            {
              scope: "user",
              tool: "codex",
              kind: "skill",
              name: "guarded-change",
              sourcePath:
                "D:\\Repositories\\agent-routines\\skills\\guarded-change",
              targetPath: "C:\\Users\\preview\\.codex\\skills\\guarded-change",
            },
            {
              scope: "user",
              tool: "claudeCode",
              kind: "skill",
              name: "guarded-change",
              sourcePath:
                "D:\\Repositories\\agent-routines\\skills\\guarded-change",
              targetPath: "C:\\Users\\preview\\.claude\\skills\\guarded-change",
            },
          ],
          actions: [
            {
              operation: skipOnlyPlan ? "skip" : "install",
              scope: "user",
              tool: "codex",
              kind: "skill",
              name: "guarded-change",
              sourcePath:
                "D:\\Repositories\\agent-routines\\skills\\guarded-change",
              targetPath: "C:\\Users\\preview\\.codex\\skills\\guarded-change",
            },
            {
              operation: skipOnlyPlan ? "skip" : "install",
              scope: "user",
              tool: "claudeCode",
              kind: "skill",
              name: "guarded-change",
              sourcePath:
                "D:\\Repositories\\agent-routines\\skills\\guarded-change",
              targetPath: "C:\\Users\\preview\\.claude\\skills\\guarded-change",
            },
          ],
          backupPlan: [],
          restorePlan: [],
          unknownInstalledItems: [],
          unclassifiedInstalledItems: [],
          summary: {
            install: skipOnlyPlan ? 0 : 2,
            skip: skipOnlyPlan ? 2 : 0,
            replace: 0,
            prune: 0,
            unknown: 0,
            unclassified: 0,
          },
        };
        return {
          task: await pushPreviewTask(
            tasks,
            "generateInstallPlan",
            "tasks.generateInstallPlan",
          ),
          planJson: { preview: true, generatedManifest, commandsToRun: [] },
          generatedManifest,
          manifestDiff: {
            state: "missing-current",
            currentPath:
              "D:\\Repositories\\agent-routines\\.agent-routines\\generated\\install.manifest.json",
            digest: previewManifestDigest,
            text: JSON.stringify(generatedManifest, null, 2),
          },
        };
      },
    },
    manifest: {
      write: async (request) =>
        pushPreviewTask(
          tasks,
          "writeManifest",
          "tasks.writeManifest",
          request.manifestDigest === previewManifestDigest
            ? "succeeded"
            : "failed",
        ),
    },
    distribution: {
      apply: async (request) => {
        const mode = request.force
          ? "replace-listed"
          : (request.mode ?? "merge");
        const destructive = mode === "replace-listed" || mode === "sync-prune";
        distributionApplied = true;
        return pushPreviewTask(
          tasks,
          destructive ? "destructiveApplyDistribution" : "applyDistribution",
          destructive
            ? "tasks.destructiveApplyDistribution"
            : "tasks.applyDistribution",
          "succeeded",
        );
      },
    },
    validation: {
      listGates: async () => sampleValidationGates(),
      runGate: async (request) =>
        pushPreviewTask(
          tasks,
          "runRepositoryGate",
          `validation.gates.${request.gateId}`,
          "succeeded",
          request.shell === "bash"
            ? ["bash", `tests/${request.gateId}.sh`]
            : ["powershell.exe", "-File", `tests\\${request.gateId}.ps1`],
        ),
    },
    diagnostics: {
      run: async () => sampleDiagnostics(),
    },
    tasks: {
      list: async () => tasks,
      cancel: async (taskId) => {
        const task = tasks.find((item) => item.id === taskId) ?? tasks[0];
        if (!task) {
          return pushPreviewTask(
            tasks,
            "diagnostics.run",
            "tasks.noTask",
            "failed",
          );
        }
        if (task.cancelable) {
          task.state = "canceled";
          task.cancelable = false;
          task.endedAt = new Date().toISOString();
        }
        return task;
      },
      subscribe: () => () => undefined,
    },
    archive: {
      write: async () => ({
        task: await pushPreviewTask(
          tasks,
          "archive.write",
          "tasks.archiveWrite",
        ),
        archivePath: "D:\\Repositories\\agent-routines\\executions\\preview",
      }),
    },
    dialogs: {
      pickFile: async () => {
        throw new Error(
          "浏览器预览不支持系统文件选择框。请在桌面应用中使用此功能。",
        );
      },
      pickDirectory: async () => {
        throw new Error(
          "浏览器预览不支持系统文件选择框。请在桌面应用中使用此功能。",
        );
      },
    },
    docs: {
      list: async () => sampleDocs(),
      open: async () => pushPreviewTask(tasks, "docs.open", "docs.usageManual"),
    },
  };
}

function sampleConfig(): InstallDiscoveryConfig {
  const userTargetsEnabled =
    new URLSearchParams(window.location.search).get("config") !==
    "user-disabled";
  return {
    version: 2,
    userTargets: {
      enabled: userTargetsEnabled,
      tools: ["codex", "claudeCode"],
      skills: {
        codex: ["guarded-change", "review-loop", "merge-fix"],
        claudeCode: ["guarded-change", "review-loop", "merge-fix"],
      },
      workflows: ["preflight", "gate-check", "runtime-check"],
    },
    projectDefaults: {
      enabled: true,
      tools: ["codex", "claudeCode"],
      skills: { codex: [], claudeCode: [] },
      workflows: ["preflight", "gate-check", "governance-check"],
      createTargets: false,
      mode: "merge",
    },
    projectTargets: [
      {
        path: "D:\\Repositories\\agent-routines",
        enabled: true,
        tools: ["codex", "claudeCode"],
        skills: {
          codex: ["electron-app-builder"],
          claudeCode: ["electron-app-builder"],
        },
        workflows: ["preflight", "gate-check"],
        createTargets: false,
        mode: "merge",
      },
    ],
    discovery: {
      roots: ["D:\\Work\\Projects", "D:\\Repositories"],
      maxDepth: 4,
      excludeDirs: [
        ".git",
        "node_modules",
        "vendor",
        "dist",
        "build",
        ".agent-routines",
        ".codex",
        ".claude",
      ],
      skipNestedRepos: true,
      rootOptions: [
        { root: "D:\\Work\\Projects", skipNestedRepos: true },
        { root: "D:\\Repositories", skipNestedRepos: true },
      ],
    },
    promotionRules: {
      doNotPromoteToUserSkills: ["pay-docs", "dms-repair", "api-sync"],
    },
    output: {
      manifestPath: ".agent-routines/generated/install.manifest.json",
      reportPath: ".agent-routines/generated/install.plan.json",
    },
    applySafety: {
      unknownInstalledItems: "report-only",
    },
  };
}

function validateConfigPreview(config: InstallDiscoveryConfig) {
  if (config.version === 1) {
    return Promise.resolve({
      ok: false,
      issues: [
        {
          path: "version",
          messageKey: "config.validation.schema",
          detail: "browser preview expects migrated config v2",
        },
      ],
    });
  }
  const issues = [
    ...duplicateIssues("discovery.roots", config.discovery.roots),
    ...duplicateIssues("discovery.excludeDirs", config.discovery.excludeDirs),
    ...duplicateIssues(
      "discovery.rootOptions.root",
      config.discovery.rootOptions?.map((option) => option.root) ?? [],
    ),
    ...duplicateIssues(
      "userTargets.skills.codex",
      config.userTargets.skills.codex,
    ),
    ...duplicateIssues(
      "promotionRules.doNotPromoteToUserSkills",
      config.promotionRules.doNotPromoteToUserSkills,
    ),
    ...duplicateIssues("userTargets.workflows", config.userTargets.workflows),
    ...duplicateIssues(
      "projectDefaults.workflows",
      config.projectDefaults.workflows,
    ),
  ];
  return Promise.resolve({ ok: issues.length === 0, issues });
}

function duplicateIssues(path: string, values: string[]) {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    if (seen.has(value)) {
      return [
        { path, messageKey: "config.validation.duplicate", detail: value },
      ];
    }
    seen.add(value);
    return [];
  });
}

const previewRoutineSpecs = [
  ["api-sync", "skill", ["preflight", "gate-check"]],
  ["archive-record", "skill", ["archive-check"]],
  ["commit-guard", "skill", ["commit-check", "gate-check", "preflight"]],
  ["desktop-design-system", "skill", ["doc-check", "gate-check"]],
  [
    "desktop-packaging-release",
    "skill",
    ["node-workspace-check", "release-check", "security-check", "gate-check"],
  ],
  [
    "desktop-qa",
    "skill",
    ["runtime-check", "node-workspace-check", "gate-check"],
  ],
  ["dms-repair", "skill", ["db-read"]],
  [
    "electron-app-builder",
    "skill",
    ["node-workspace-check", "runtime-check", "security-check", "gate-check"],
  ],
  [
    "env-audit",
    "skill",
    ["preflight", "gate-check", "runtime-check", "startup-check"],
  ],
  ["github-guard", "skill", ["github-check", "release-check", "gate-check"]],
  ["governance-audit", "skill", ["governance-check", "preflight"]],
  ["graph-audit", "skill", ["graph-check", "preflight", "governance-check"]],
  ["guarded-change", "skill", ["preflight", "gate-check"]],
  ["i18n-checklist", "skill", ["doc-check", "gate-check"]],
  ["java-maven-verify", "skill", ["maven-check", "gate-check"]],
  ["knowledge-drift", "skill", ["drift-check", "doc-check"]],
  ["merge-fix", "skill", ["merge-check", "gate-check"]],
  ["node-workspace-release", "skill", ["node-workspace-check", "gate-check"]],
  ["pay-docs", "skill", ["doc-check"]],
  ["prompt-qa", "skill", []],
  [
    "release-guard",
    "skill",
    ["release-check", "security-check", "node-workspace-check", "gate-check"],
  ],
  ["review-loop", "skill", ["preflight", "gate-check"]],
  ["runtime-repair", "skill", ["runtime-check", "preflight"]],
  [
    "security-review",
    "skill",
    ["security-check", "release-check", "gate-check"],
  ],
  ["archive-check", "workflow", []],
  ["commit-check", "workflow", []],
  ["db-read", "workflow", []],
  ["doc-check", "workflow", []],
  ["drift-check", "workflow", []],
  ["gate-check", "workflow", []],
  ["github-check", "workflow", []],
  ["governance-check", "workflow", []],
  ["graph-check", "workflow", []],
  ["maven-check", "workflow", []],
  ["merge-check", "workflow", []],
  ["node-workspace-check", "workflow", []],
  ["preflight", "workflow", []],
  ["release-check", "workflow", []],
  ["runtime-check", "workflow", []],
  ["security-check", "workflow", []],
  ["startup-check", "workflow", []],
] as const;

function sampleRoutines(): RoutineItem[] {
  return previewRoutineSpecs.map(([name, kind, recommendedWorkflows]) =>
    routine(name, kind, [...recommendedWorkflows]),
  );
}

function routine(
  name: string,
  kind: "skill" | "workflow",
  recommendedWorkflows: string[],
): RoutineItem {
  const description = previewRoutineDescription(name, kind);
  return {
    name,
    kind,
    sourcePath: `D:\\Repositories\\agent-routines\\${kind === "skill" ? "skills" : "workflows"}\\${name}`,
    description,
    summary: description,
    recommendedWorkflows,
    hasRequiredFiles: true,
    includedByDefault: true,
    missingRequiredFiles: [],
  };
}

function previewRoutineDescription(
  name: string,
  kind: "skill" | "workflow",
): string {
  const descriptions: Record<string, string> = {
    "commit-guard":
      "Validated local commit and optional push workflows with explicit scope and gates.",
    "electron-app-builder":
      "Electron desktop app implementation with secure main/preload/renderer boundaries.",
    "java-maven-verify":
      "Java Maven verification with module scope and shell-specific argument handling.",
    "dms-repair":
      "Database repair planning that starts with readonly confirmation.",
    "guarded-change":
      "Governed repository code changes with local rules, branch state, and verification.",
    "review-loop":
      "Review current branch changes, fix actionable issues, and repeat review.",
    "gate-check":
      "Run safe common gates such as git diff checks and readonly custom commands.",
    preflight: "Collect readonly repository and runtime readiness evidence.",
  };
  return (
    descriptions[name] ??
    (kind === "skill"
      ? `${name} Skill guidance for agent work.`
      : `${name} shared workflow runtime check.`)
  );
}

function sampleInventory(): InventoryScanResult {
  const routines = sampleRoutines();
  return {
    repositoryPath: "D:\\Repositories\\agent-routines",
    scannedAt: new Date().toISOString(),
    routines,
    counts: {
      skills: routines.filter((item) => item.kind === "skill").length,
      workflows: routines.filter((item) => item.kind === "workflow").length,
      broken: 0,
    },
  };
}

function sampleMatrix(distributionApplied = false): InstallMatrixResult {
  const routines = sampleRoutines();
  const summary = Object.fromEntries(
    statusKeys.map((status) => [status, 0]),
  ) as InstallMatrixResult["summary"];
  const rows = routines.map((item, rowIndex) => ({
    routine: item,
    cells: matrixColumns.map((column, columnIndex) => {
      const status = previewCellStatus(
        item,
        rowIndex,
        columnIndex,
        column.id,
        distributionApplied,
      );
      summary[status] += 1;
      return {
        routineName: item.name,
        kind: item.kind,
        tool: column.tool,
        scope: column.scope,
        columnId: column.id,
        status,
        sourcePath: item.sourcePath,
        targetPath:
          status === "shared" || status === "not-targeted"
            ? undefined
            : `C:\\Users\\liu liang\\${column.metaKey.includes("Project") ? ".codex" : ".agent-routines"}\\${item.name}`,
        missingFiles: status === "broken" ? ["SKILL.md"] : [],
        changedFiles: status === "drift" ? ["SKILL.md", "README.md"] : [],
      };
    }),
  }));
  return {
    scannedAt: new Date().toISOString(),
    columns: matrixColumns,
    rows,
    summary,
    desiredOnly: true,
    projectDetails: rows
      .flatMap((row) => row.cells)
      .filter((cell) => cell.scope === "project")
      .slice(0, 8)
      .map((cell) => ({
        projectPath: "D:\\Repositories\\agent-routines",
        routineName: cell.routineName,
        kind: cell.kind,
        tool:
          cell.tool === "shared-workflow-runtime"
            ? "shared"
            : cell.tool === "claude-code"
              ? "claudeCode"
              : "codex",
        status: cell.status,
        operation: cell.status === "missing" ? "install" : "skip",
        sourcePath: cell.sourcePath,
        targetPath: cell.targetPath,
        missingFiles: cell.missingFiles,
        changedFiles: cell.changedFiles,
      })),
  };
}

function previewCellStatus(
  routine: RoutineItem,
  rowIndex: number,
  columnIndex: number,
  columnId: string,
  distributionApplied: boolean,
): InstallMatrixResult["rows"][number]["cells"][number]["status"] {
  if (routine.kind === "workflow") {
    return columnIndex === 4
      ? rowIndex % 5 === 0
        ? "drift"
        : "same"
      : "shared";
  }
  if (columnIndex === 4) {
    return "not-targeted";
  }
  if (
    distributionApplied &&
    routine.kind === "skill" &&
    columnId === "claudeUser"
  ) {
    return "same";
  }
  const value = (rowIndex + columnIndex) % 7;
  if (value === 0) {
    return "drift";
  }
  if (value === 1 || value === 4) {
    return "missing";
  }
  if (value === 2) {
    return "broken";
  }
  return "same";
}

function sampleValidationGates(): ValidationGate[] {
  return [
    "validate-structure",
    "validate-skills",
    "validate-workflows",
    "validate-docs",
    "validate-changelog",
    "validate-manifest",
    "validate-install-discovery-config",
    "run-workflows",
  ].flatMap((id) => [
    {
      id: id as ValidationGate["id"],
      labelKey: `validation.gates.${id}`,
      shell: "powershell",
      commandPreview: ["powershell.exe", "-File", `tests\\${id}.ps1`],
    },
    {
      id: id as ValidationGate["id"],
      labelKey: `validation.gates.${id}`,
      shell: "bash",
      commandPreview: ["bash", `tests/${id}.sh`],
    },
  ]);
}

function sampleDiagnostics(): DiagnosticsResult {
  return {
    platform: "windows",
    repositoryPath: "D:\\Repositories\\agent-routines",
    checkedAt: new Date().toISOString(),
    checks: [
      {
        id: "git",
        labelKey: "diagnostics.git",
        status: "ok",
        detail: "git version preview",
      },
      {
        id: "powershell",
        labelKey: "diagnostics.powershell",
        status: "ok",
        detail: "PowerShell preview",
      },
      {
        id: "npm",
        labelKey: "diagnostics.npm",
        status: "failed",
        detail: "'npm' is not recognized as an internal or external command",
        reasonKey: "diagnostics.reason.commandNotFound",
      },
      {
        id: "bash",
        labelKey: "diagnostics.bash",
        status: "warning",
        detail: "Bash probe unavailable in browser preview",
      },
    ],
  };
}

function sampleDocs(): DocsEntry[] {
  const routineDocs = sampleRoutines().flatMap((routine) => {
    const readme: DocsEntry = {
      id: `${routine.kind}-${routine.name}-readme`,
      titleKey: "docs.routineReadme",
      title: `${routine.name} README`,
      categoryKey:
        routine.kind === "skill"
          ? "docs.category.skills"
          : "docs.category.workflows",
      path: `${routine.kind === "skill" ? "skills" : "workflows"}/${routine.name}/README.zh-CN.md`,
      headings: [
        `${routine.name} README`,
        routine.kind === "skill" ? "Recommended workflows" : "Schema",
      ],
      summary: `${routine.name} ${routine.kind} documentation.`,
      bodyPreview: `# ${routine.name} README\n\n${routine.name} ${routine.kind} documentation.\n\n## Recommended workflows\n\n${routine.recommendedWorkflows.join(", ") || "none required"}`,
    };
    if (routine.kind === "workflow") {
      return [readme];
    }
    return [
      readme,
      {
        id: `skill-${routine.name}-instruction`,
        titleKey: "docs.skillInstruction",
        title: `${routine.name} SKILL.md`,
        categoryKey: "docs.category.skills",
        path: `skills/${routine.name}/SKILL.md`,
        headings: [`${routine.name}`, "Workflow Routing"],
        summary: `${routine.name} source skill instruction.`,
        bodyPreview: `# ${routine.name}\n\nSkill instruction source.\n\nRecommended workflows: ${routine.recommendedWorkflows.join(", ") || "none required"}`,
      },
    ];
  });
  return [
    {
      id: "electron-plan",
      titleKey: "docs.electronPlan",
      categoryKey: "docs.category.security",
      path: "docs/electron-app-plan.zh-CN.md",
      headings: ["Electron 应用执行规范", "目标", "验收"],
      summary: "Agent Routines Manager 的 Electron 应用执行规范。",
      bodyPreview:
        "# Electron 应用执行规范\n\nAgent Routines Manager 的 Electron 应用执行规范。\n\n## 目标\n\n定义本地桌面应用的交付边界。",
    },
    {
      id: "electron-ui",
      titleKey: "docs.electronUi",
      categoryKey: "docs.category.design",
      path: "docs/electron-app-ui-design.zh-CN.md",
      headings: ["Electron 应用 UI 设计", "布局", "状态"],
      summary: "Agent Routines Manager 的 UI 设计说明。",
      bodyPreview:
        "# Electron 应用 UI 设计\n\nAgent Routines Manager 的 UI 设计说明。\n\n## 布局\n\n覆盖主要信息架构和响应式行为。",
    },
    {
      id: "electron-prerequisites",
      titleKey: "docs.electronPrerequisites",
      categoryKey: "docs.category.setup",
      path: "docs/electron-app-prerequisites.zh-CN.md",
      headings: ["提前安装和准备清单", "系统", "工具"],
      summary: "开发和验收 Agent Routines Manager 前的准备清单。",
      bodyPreview:
        "# 提前安装和准备清单\n\n开发和验收 Agent Routines Manager 前的准备清单。",
    },
    {
      id: "electron-manual-test-cases",
      titleKey: "docs.electronManualTestCases",
      categoryKey: "docs.category.setup",
      path: "docs/electron-app-manual-test-cases.zh-CN.md",
      headings: ["Electron 应用人工测试用例", "范围", "步骤"],
      summary: "Agent Routines Manager 的人工验收用例。",
      bodyPreview:
        "# Electron 应用人工测试用例\n\nAgent Routines Manager 的人工验收用例。",
    },
    {
      id: "usage-manual",
      titleKey: "docs.usageManual",
      categoryKey: "docs.category.overview",
      path: "docs/usage-manual.zh-CN.md",
      headings: ["Agent Routines 使用手册", "用途", "推荐工作流"],
      summary: "Agent Routines 的最终用户使用入口。",
      bodyPreview:
        "# Agent Routines 使用手册\n\nAgent Routines 的最终用户使用入口。\n\n## 用途\n\n用于安装、检查和分发本仓库维护的 Skills 与 workflows。",
    },
    {
      id: "install-discovery",
      titleKey: "docs.installDiscovery",
      categoryKey: "docs.category.distribution",
      path: "docs/install-discovery.zh-CN.md",
      headings: ["Install Discovery", "配置", "使用"],
      summary: "Install Discovery 配置和分发目标说明。",
      bodyPreview:
        "# Install Discovery\n\nInstall Discovery 配置和分发目标说明。\n\n## 配置\n\n用于确定用户级、项目级和共享 workflow 运行时目标。",
    },
    {
      id: "electron-distribution-guide-ui",
      titleKey: "docs.electronDistributionGuideUi",
      categoryKey: "docs.category.distribution",
      path: "docs/electron-app-distribution-guide-ui.zh-CN.md",
      headings: ["分发向导 UI", "目标", "流程"],
      summary: "Agent Routines Manager 分发向导 UI 说明。",
      bodyPreview: "# 分发向导 UI\n\nAgent Routines Manager 分发向导 UI 说明。",
    },
    {
      id: "electron-install-tutorial",
      titleKey: "docs.electronInstallTutorial",
      categoryKey: "docs.category.setup",
      path: "docs/electron-app-install-tutorial.zh-CN.md",
      headings: ["Electron App 安装实战教程", "目标", "安装"],
      summary: "Agent Routines Manager 的安装使用教程。",
      bodyPreview:
        "# Electron App 安装实战教程\n\nAgent Routines Manager 的安装使用教程。\n\n## 目标\n\n帮助用户安装并启动本地桌面应用。",
    },
    {
      id: "release-process",
      titleKey: "docs.releaseProcess",
      categoryKey: "docs.category.release",
      path: "docs/release-process.zh-CN.md",
      headings: ["发布流程", "版本", "标签"],
      summary: "Agent Routines 的发布流程。",
      bodyPreview: "# 发布流程\n\nAgent Routines 的发布流程。",
    },
    {
      id: "readme",
      titleKey: "docs.readme",
      categoryKey: "docs.category.overview",
      path: "README.zh-CN.md",
      headings: ["Agent Routines", "安装", "验证"],
      summary: "Agent Routines 仓库入口。",
      bodyPreview: "# Agent Routines\n\nAgent Routines 仓库入口。",
    },
    ...routineDocs,
  ];
}

async function pushPreviewTask(
  tasks: TaskRecord[],
  commandId: TaskRecord["commandId"],
  titleKey: string,
  state: TaskRecord["state"] = "succeeded",
  argv: string[] = ["browser-preview"],
  stdout = "Browser preview task evidence.",
  stderr = state === "failed"
    ? "Apply requires a human-approved write phase."
    : "",
): Promise<TaskRecord> {
  const now = new Date().toISOString();
  const task: TaskRecord = {
    id: `preview-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    commandId,
    state,
    startedAt: now,
    endedAt: now,
    exitCode: state === "succeeded" ? 0 : 1,
    cwd: "D:\\Repositories\\agent-routines",
    argv,
    titleKey,
    stdout,
    stderr,
    cancelable: false,
  };
  tasks.unshift(task);
  return task;
}
