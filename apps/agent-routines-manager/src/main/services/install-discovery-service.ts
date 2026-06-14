import fs from "node:fs";
import path from "node:path";

import type {
  ConfigToolKind,
  ConfigDraftValidationResult,
  ConfigValidationIssue,
  InstallDiscoveryConfig,
  InstallDiscoveryConfigV1,
  InstallDiscoveryConfigV2,
  ProjectDiscoveryV2,
  ProjectTargetDefaultsV2,
  ProjectTargetOverrideV2,
  ToolRoutineSelection,
} from "../../shared/contracts.js";
import { installDiscoveryConfigSchema } from "../../shared/schemas.js";
import { resolveInside } from "../path-utils.js";
import { InventoryService } from "./inventory-service.js";

export class InstallDiscoveryService {
  public constructor(private readonly repositoryPath: string) {}

  public async read(configPath: string): Promise<InstallDiscoveryConfig> {
    const resolved = resolveInside(this.repositoryPath, configPath);
    const parsed = JSON.parse(
      await fs.promises.readFile(resolved, "utf8"),
    ) as unknown;
    const config = installDiscoveryConfigSchema.parse(parsed);
    return config.version === 1 ? migrateV1ToV2(config) : config;
  }

  public async validateDraft(
    config: InstallDiscoveryConfig,
  ): Promise<ConfigDraftValidationResult> {
    const issues: ConfigValidationIssue[] = [];
    const schemaResult = installDiscoveryConfigSchema.safeParse(config);
    if (!schemaResult.success) {
      for (const issue of schemaResult.error.issues) {
        issues.push({
          path: issue.path.join("."),
          messageKey: "config.validation.schema",
          detail: issue.message,
        });
      }
      return { ok: false, issues };
    }

    validateConfigShape(issues, config);

    const inventory = await new InventoryService(this.repositoryPath).scan();
    const skillNames = new Set(
      inventory.routines
        .filter((routine) => routine.kind === "skill")
        .map((routine) => routine.name),
    );
    const workflowNames = new Set(
      inventory.routines
        .filter((routine) => routine.kind === "workflow")
        .map((routine) => routine.name),
    );

    validateConfigRoutineNames(issues, config, skillNames, workflowNames);

    return {
      ok: issues.length === 0,
      issues,
    };
  }

  public async saveAs(
    filePath: string,
    config: InstallDiscoveryConfig,
  ): Promise<string> {
    const resolved = resolveInside(this.repositoryPath, filePath);
    const parts = resolved.split(path.sep);
    if (
      parts.includes(".codex") ||
      parts.includes(".claude") ||
      parts.includes(".agent-routines")
    ) {
      throw new Error(
        "Refusing to write install-discovery config inside an install target directory.",
      );
    }
    const parsed = installDiscoveryConfigSchema.parse(config);
    await fs.promises.mkdir(path.dirname(resolved), { recursive: true });
    await fs.promises.writeFile(
      resolved,
      `${JSON.stringify(parsed, null, 2)}\n`,
      "utf8",
    );
    return resolved;
  }
}

function validateConfigShape(
  issues: ConfigValidationIssue[],
  config: InstallDiscoveryConfig,
): void {
  if (config.version === 1) {
    pushDuplicates(issues, "projectRoots", config.projectRoots);
    pushDuplicates(
      issues,
      "projectDiscovery.excludeDirs",
      config.projectDiscovery.excludeDirs,
    );
    pushDuplicates(
      issues,
      "projectDiscovery.rootOptions.root",
      config.projectDiscovery.rootOptions?.map((option) => option.root) ?? [],
    );
    validateRootOptionsReferenceKnownRoots(
      issues,
      config.projectRoots,
      config.projectDiscovery.rootOptions ?? [],
      "projectDiscovery.rootOptions",
    );
    pushDuplicates(
      issues,
      "scopePolicy.userLevelSkills",
      config.scopePolicy.userLevelSkills,
    );
    pushDuplicates(
      issues,
      "scopePolicy.projectLevelOnlySkills",
      config.scopePolicy.projectLevelOnlySkills,
    );
    pushDuplicates(
      issues,
      "scopePolicy.userLevelWorkflows",
      config.scopePolicy.userLevelWorkflows,
    );
    pushDuplicates(
      issues,
      "scopePolicy.projectDefaultWorkflows",
      config.scopePolicy.projectDefaultWorkflows,
    );
    return;
  }

  pushDuplicates(issues, "discovery.roots", config.discovery.roots);
  pushDuplicates(issues, "discovery.excludeDirs", config.discovery.excludeDirs);
  pushDuplicates(
    issues,
    "discovery.rootOptions.root",
    config.discovery.rootOptions?.map((option) => option.root) ?? [],
  );
  validateRootOptionsReferenceKnownRoots(
    issues,
    config.discovery.roots,
    config.discovery.rootOptions ?? [],
    "discovery.rootOptions",
  );
  pushDuplicates(issues, "userTargets.tools", config.userTargets.tools);
  pushDuplicates(
    issues,
    "userTargets.skills.codex",
    config.userTargets.skills.codex,
  );
  pushDuplicates(
    issues,
    "userTargets.skills.claudeCode",
    config.userTargets.skills.claudeCode,
  );
  pushDuplicates(issues, "userTargets.workflows", config.userTargets.workflows);
  validateProjectTargetShape(issues, "projectDefaults", config.projectDefaults);
  pushDuplicates(
    issues,
    "projectTargets.path",
    config.projectTargets.map((target) => target.path),
  );
  config.projectTargets.forEach((target, index) =>
    validateProjectTargetShape(issues, `projectTargets[${index}]`, target),
  );
  pushDuplicates(
    issues,
    "promotionRules.doNotPromoteToUserSkills",
    config.promotionRules.doNotPromoteToUserSkills,
  );
}

function validateRootOptionsReferenceKnownRoots(
  issues: ConfigValidationIssue[],
  roots: string[],
  rootOptions: Array<{ root: string }>,
  pathName: string,
): void {
  const rootSet = new Set(roots);
  for (const option of rootOptions) {
    if (!rootSet.has(option.root)) {
      issues.push({
        path: pathName,
        messageKey: "config.validation.missingSource",
        detail: option.root,
      });
    }
  }
}

function validateProjectTargetShape(
  issues: ConfigValidationIssue[],
  pathName: string,
  target: ProjectTargetDefaultsV2 | ProjectTargetOverrideV2,
): void {
  pushDuplicates(issues, `${pathName}.tools`, target.tools);
  pushDuplicates(issues, `${pathName}.skills.codex`, target.skills.codex);
  pushDuplicates(
    issues,
    `${pathName}.skills.claudeCode`,
    target.skills.claudeCode,
  );
  pushDuplicates(issues, `${pathName}.workflows`, target.workflows);
}

function validateConfigRoutineNames(
  issues: ConfigValidationIssue[],
  config: InstallDiscoveryConfig,
  skillNames: Set<string>,
  workflowNames: Set<string>,
): void {
  if (config.version === 1) {
    validateNamesExist(
      issues,
      "scopePolicy.userLevelSkills",
      config.scopePolicy.userLevelSkills,
      skillNames,
    );
    validateNamesExist(
      issues,
      "scopePolicy.projectLevelOnlySkills",
      config.scopePolicy.projectLevelOnlySkills,
      skillNames,
    );
    validateNamesExist(
      issues,
      "scopePolicy.userLevelWorkflows",
      config.scopePolicy.userLevelWorkflows,
      workflowNames,
    );
    validateNamesExist(
      issues,
      "scopePolicy.projectDefaultWorkflows",
      config.scopePolicy.projectDefaultWorkflows,
      workflowNames,
    );
    return;
  }

  validateToolRoutineSelection(
    issues,
    "userTargets.skills",
    config.userTargets.skills,
    skillNames,
  );
  validateNamesExist(
    issues,
    "userTargets.workflows",
    config.userTargets.workflows,
    workflowNames,
  );
  validateProjectTargetNames(
    issues,
    "projectDefaults",
    config.projectDefaults,
    skillNames,
    workflowNames,
  );
  config.projectTargets.forEach((target, index) =>
    validateProjectTargetNames(
      issues,
      `projectTargets[${index}]`,
      target,
      skillNames,
      workflowNames,
    ),
  );
  validateNamesExist(
    issues,
    "promotionRules.doNotPromoteToUserSkills",
    config.promotionRules.doNotPromoteToUserSkills,
    skillNames,
  );
}

function validateProjectTargetNames(
  issues: ConfigValidationIssue[],
  pathName: string,
  target: ProjectTargetDefaultsV2 | ProjectTargetOverrideV2,
  skillNames: Set<string>,
  workflowNames: Set<string>,
): void {
  validateToolRoutineSelection(
    issues,
    `${pathName}.skills`,
    target.skills,
    skillNames,
  );
  validateNamesExist(
    issues,
    `${pathName}.workflows`,
    target.workflows,
    workflowNames,
  );
}

function validateToolRoutineSelection(
  issues: ConfigValidationIssue[],
  pathName: string,
  selection: ToolRoutineSelection,
  skillNames: Set<string>,
): void {
  validateNamesExist(issues, `${pathName}.codex`, selection.codex, skillNames);
  validateNamesExist(
    issues,
    `${pathName}.claudeCode`,
    selection.claudeCode,
    skillNames,
  );
}

function pushDuplicates(
  issues: ConfigValidationIssue[],
  path: string,
  values: string[],
): void {
  const seen = new Set<string>();
  const duplicateValues = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicateValues.add(value);
    }
    seen.add(value);
  }
  for (const value of duplicateValues) {
    issues.push({
      path,
      messageKey: "config.validation.duplicate",
      detail: value,
    });
  }
}

function validateNamesExist(
  issues: ConfigValidationIssue[],
  path: string,
  values: string[],
  validNames: Set<string>,
): void {
  for (const value of values) {
    if (!validNames.has(value)) {
      issues.push({
        path,
        messageKey: "config.validation.missingSource",
        detail: value,
      });
    }
  }
}

export function migrateV1ToV2(
  config: InstallDiscoveryConfigV1,
): InstallDiscoveryConfigV2 {
  const skills = selectionForTools(
    config.tools,
    config.scopePolicy.userLevelSkills.filter(
      (name) => !config.scopePolicy.projectLevelOnlySkills.includes(name),
    ),
  );
  return {
    version: 2,
    userTargets: {
      enabled:
        config.scopePolicy.userLevelSkills.length > 0 ||
        config.scopePolicy.userLevelWorkflows.length > 0,
      tools: uniqueTools(config.tools),
      skills,
      workflows: [...config.scopePolicy.userLevelWorkflows],
    },
    projectDefaults: {
      enabled: config.scopePolicy.projectDefaultWorkflows.length > 0,
      tools: uniqueTools(config.tools),
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
      ...(config.projectDiscovery.rootOptions
        ? { rootOptions: [...config.projectDiscovery.rootOptions] }
        : {}),
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

function selectionForTools(
  tools: ConfigToolKind[],
  names: string[],
): ToolRoutineSelection {
  const selection: ToolRoutineSelection = { codex: [], claudeCode: [] };
  for (const tool of uniqueTools(tools)) {
    selection[tool] = [...names];
  }
  return selection;
}

function uniqueTools(tools: ConfigToolKind[]): ConfigToolKind[] {
  return Array.from(new Set(tools));
}
