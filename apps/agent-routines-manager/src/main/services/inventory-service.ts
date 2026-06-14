import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  matrixColumns,
  statusKeys,
  type ConfigToolKind,
  type DesiredTargetToolKind,
  type InstallActionOperation,
  type InstallDiscoveryConfig,
  type InstallMatrixCell,
  type InstallMatrixProjectDetail,
  type InstallMatrixResult,
  type InstallMatrixRow,
  type InstallStatus,
  type InventoryScanResult,
  type MatrixColumnId,
  type RoutineItem,
  type ScopeKind,
} from "../../shared/contracts.js";
import { pathExists, toDisplayPath, userHomePath } from "../path-utils.js";
import { migrateV1ToV2 } from "./install-discovery-service.js";

export class InventoryService {
  public constructor(private readonly repositoryPath: string) {}

  public async scan(): Promise<InventoryScanResult> {
    const [skills, workflows, defaultNames] = await Promise.all([
      this.scanSkills(),
      this.scanWorkflows(),
      this.readDefaultRoutineNames(),
    ]);
    const routines = [...skills, ...workflows].map((routine) => ({
      ...routine,
      includedByDefault: defaultNames.has(routine.name),
    }));

    return {
      repositoryPath: this.repositoryPath,
      scannedAt: new Date().toISOString(),
      routines,
      counts: {
        skills: skills.length,
        workflows: workflows.length,
        broken: routines.filter((routine) => !routine.hasRequiredFiles).length,
      },
    };
  }

  public async matrix(
    config?: InstallDiscoveryConfig,
  ): Promise<InstallMatrixResult> {
    const inventory = await this.scan();
    const rows: InstallMatrixRow[] = [];
    const summary = Object.fromEntries(
      statusKeys.map((status) => [status, 0]),
    ) as Record<InstallStatus, number>;
    const details: InstallMatrixProjectDetail[] = [];
    const desiredTargets = config
      ? await this.resolveDesiredTargets(config)
      : undefined;

    for (const routine of inventory.routines) {
      const cells = desiredTargets
        ? await Promise.all(
            matrixColumns.map((column) =>
              this.buildDesiredCell(
                routine,
                column.id,
                desiredTargets,
                details,
              ),
            ),
          )
        : await Promise.all(
            matrixColumns.map((column) => this.buildCell(routine, column.id)),
          );
      for (const cell of cells) {
        if (!desiredTargets || cell.desired) {
          summary[cell.status] += 1;
        }
      }
      rows.push({ routine, cells });
    }

    return {
      scannedAt: new Date().toISOString(),
      columns: matrixColumns,
      rows,
      summary,
      projectDetails: details,
      desiredOnly: Boolean(desiredTargets),
    };
  }

  private async scanSkills(): Promise<RoutineItem[]> {
    const skillsRoot = path.join(this.repositoryPath, "skills");
    const names = await readDirectoryNames(skillsRoot);
    return Promise.all(
      names.map(async (name) => {
        const sourcePath = path.join(skillsRoot, name);
        const skillPath = path.join(sourcePath, "SKILL.md");
        const readmePath = path.join(sourcePath, "README.md");
        const missingRequiredFiles: string[] = [];
        if (!(await pathExists(skillPath))) {
          missingRequiredFiles.push("SKILL.md");
        }
        if (!(await pathExists(readmePath))) {
          missingRequiredFiles.push("README.md");
        }
        const skillText = missingRequiredFiles.includes("SKILL.md")
          ? ""
          : await fs.promises.readFile(skillPath, "utf8");
        return {
          name,
          kind: "skill",
          sourcePath: toDisplayPath(sourcePath),
          description: parseFrontmatterValue(skillText, "description"),
          summary: firstNonHeadingLine(skillText),
          recommendedWorkflows: parseRecommendedWorkflows(skillText),
          hasRequiredFiles: missingRequiredFiles.length === 0,
          includedByDefault: false,
          missingRequiredFiles,
        } satisfies RoutineItem;
      }),
    );
  }

  private async scanWorkflows(): Promise<RoutineItem[]> {
    const workflowsRoot = path.join(this.repositoryPath, "workflows");
    const names = await readDirectoryNames(workflowsRoot);
    return Promise.all(
      names.map(async (name) => {
        const sourcePath = path.join(workflowsRoot, name);
        const readmePath = path.join(sourcePath, "README.md");
        const required = [
          "README.md",
          "schema.json",
          `${name}.ps1`,
          `${name}.sh`,
        ];
        const missingRequiredFiles: string[] = [];
        for (const filename of required) {
          if (!(await pathExists(path.join(sourcePath, filename)))) {
            missingRequiredFiles.push(filename);
          }
        }
        const readmeText = missingRequiredFiles.includes("README.md")
          ? ""
          : await fs.promises.readFile(readmePath, "utf8");
        return {
          name,
          kind: "workflow",
          sourcePath: toDisplayPath(sourcePath),
          description: firstSectionBody(readmeText, "Purpose"),
          summary: firstNonHeadingLine(readmeText),
          recommendedWorkflows: [],
          hasRequiredFiles: missingRequiredFiles.length === 0,
          includedByDefault: false,
          missingRequiredFiles,
        } satisfies RoutineItem;
      }),
    );
  }

  private async readDefaultRoutineNames(): Promise<Set<string>> {
    const names = new Set<string>();
    const manifestPath = path.join(
      this.repositoryPath,
      "distribution",
      "agent-routines.manifest.json",
    );
    try {
      const manifest = JSON.parse(
        await fs.promises.readFile(manifestPath, "utf8"),
      ) as {
        user?: Record<string, { skills?: string[]; workflows?: string[] }>;
        projects?: Array<Record<string, unknown>>;
      };
      for (const toolConfig of Object.values(manifest.user ?? {})) {
        for (const name of toolConfig.skills ?? []) {
          names.add(name);
        }
        for (const name of toolConfig.workflows ?? []) {
          names.add(name);
        }
      }
      for (const projectConfig of manifest.projects ?? []) {
        for (const value of Object.values(projectConfig)) {
          if (
            typeof value !== "object" ||
            value === null ||
            Array.isArray(value)
          ) {
            continue;
          }
          const toolConfig = value as {
            skills?: string[];
            workflows?: string[];
          };
          for (const name of toolConfig.skills ?? []) {
            names.add(name);
          }
          for (const name of toolConfig.workflows ?? []) {
            names.add(name);
          }
        }
      }
    } catch {
      return names;
    }
    return names;
  }

  private async buildCell(
    routine: RoutineItem,
    columnId: MatrixColumnId,
  ): Promise<InstallMatrixCell> {
    const column = matrixColumns.find((item) => item.id === columnId);
    if (!column) {
      throw new Error(`Unknown matrix column: ${columnId}`);
    }

    if (routine.kind === "workflow" && columnId !== "workflowRuntime") {
      return {
        routineName: routine.name,
        kind: routine.kind,
        tool: column.tool,
        scope: column.scope,
        columnId,
        status: "shared",
        sourcePath: routine.sourcePath,
        targetPath: undefined,
        missingFiles: [],
        changedFiles: [],
      };
    }

    if (routine.kind === "skill" && columnId === "workflowRuntime") {
      return {
        routineName: routine.name,
        kind: routine.kind,
        tool: column.tool,
        scope: column.scope,
        columnId,
        status: "not-targeted",
        sourcePath: routine.sourcePath,
        targetPath: undefined,
        missingFiles: [],
        changedFiles: [],
      };
    }

    const targetPath = this.targetPathFor(routine, columnId);
    const comparison = await compareDirectories(routine.sourcePath, targetPath);
    return {
      routineName: routine.name,
      kind: routine.kind,
      tool: column.tool,
      scope: column.scope,
      columnId,
      status: comparison.status,
      sourcePath: routine.sourcePath,
      targetPath: toDisplayPath(targetPath),
      missingFiles: comparison.missingFiles,
      changedFiles: comparison.changedFiles,
    };
  }

  private targetPathFor(
    routine: RoutineItem,
    columnId: MatrixColumnId,
  ): string {
    const sourceKindPath = routine.kind === "skill" ? "skills" : "workflows";
    switch (columnId) {
      case "codexUser":
        return userHomePath(".codex", "skills", routine.name);
      case "codexProject":
        return path.join(this.repositoryPath, ".codex", "skills", routine.name);
      case "claudeUser":
        return userHomePath(".claude", "skills", routine.name);
      case "claudeProject":
        return path.join(
          this.repositoryPath,
          ".claude",
          "skills",
          routine.name,
        );
      case "workflowRuntime":
        return path.join(
          os.homedir(),
          ".agent-routines",
          sourceKindPath,
          routine.name,
        );
    }
  }

  private async buildDesiredCell(
    routine: RoutineItem,
    columnId: MatrixColumnId,
    desiredTargets: DesiredTarget[],
    details: InstallMatrixProjectDetail[],
  ): Promise<InstallMatrixCell> {
    const column = matrixColumns.find((item) => item.id === columnId);
    if (!column) {
      throw new Error(`Unknown matrix column: ${columnId}`);
    }

    const matchingTargets = desiredTargets.filter(
      (target) =>
        target.routineName === routine.name &&
        target.kind === routine.kind &&
        target.columnId === columnId,
    );

    if (matchingTargets.length === 0) {
      const isSharedWorkflowRepresentation =
        routine.kind === "workflow" &&
        columnId !== "workflowRuntime" &&
        desiredTargets.some(
          (target) =>
            target.kind === "workflow" &&
            target.routineName === routine.name &&
            target.columnId === "workflowRuntime",
        );
      return {
        routineName: routine.name,
        kind: routine.kind,
        tool: column.tool,
        scope: column.scope,
        columnId,
        status: isSharedWorkflowRepresentation ? "shared" : "not-targeted",
        desired: false,
        sourcePath: routine.sourcePath,
        missingFiles: [],
        changedFiles: [],
      };
    }

    const comparisons = await Promise.all(
      matchingTargets.map(async (target) => {
        const comparison = await compareDirectories(
          routine.sourcePath,
          target.targetPath,
        );
        const operation: InstallActionOperation =
          comparison.status === "missing" ? "install" : "skip";
        const detail: InstallMatrixProjectDetail = {
          projectPath: target.projectPath ?? "",
          routineName: routine.name,
          kind: routine.kind,
          tool: target.tool,
          status: comparison.status,
          operation,
          sourcePath: routine.sourcePath,
          targetPath: toDisplayPath(target.targetPath),
          missingFiles: comparison.missingFiles,
          changedFiles: comparison.changedFiles,
        };
        if (target.scope === "project") {
          details.push(detail);
        }
        return { target, comparison, operation };
      }),
    );

    const worst = comparisons.reduce((current, next) =>
      statusRank(next.comparison.status) > statusRank(current.comparison.status)
        ? next
        : current,
    );

    return {
      routineName: routine.name,
      kind: routine.kind,
      tool: column.tool,
      scope: column.scope,
      columnId,
      status: worst.comparison.status,
      desired: true,
      operation: worst.operation,
      sourcePath: routine.sourcePath,
      targetPath: toDisplayPath(worst.target.targetPath),
      projectPath: worst.target.projectPath,
      missingFiles: worst.comparison.missingFiles,
      changedFiles: worst.comparison.changedFiles,
    };
  }

  private async resolveDesiredTargets(
    input: InstallDiscoveryConfig,
  ): Promise<DesiredTarget[]> {
    const config = input.version === 1 ? migrateV1ToV2(input) : input;
    const targets: DesiredTarget[] = [];
    if (config.userTargets.enabled) {
      for (const tool of config.userTargets.tools) {
        for (const skill of config.userTargets.skills[tool]) {
          targets.push(skillTarget("user", tool, skill, this.repositoryPath));
        }
      }
      for (const workflow of config.userTargets.workflows) {
        targets.push(
          workflowTarget("user", "shared", workflow, this.repositoryPath),
        );
      }
    }

    const discoveredProjects = config.projectDefaults.enabled
      ? await discoverGitProjects(
          config.discovery.roots,
          config.discovery.maxDepth,
          new Set(config.discovery.excludeDirs),
          config.discovery.skipNestedRepos,
        )
      : [];
    const targetMap = new Map<string, ProjectDesiredConfig>();
    for (const projectPath of discoveredProjects) {
      targetMap.set(projectPath, {
        path: projectPath,
        enabled: config.projectDefaults.enabled,
        tools: config.projectDefaults.tools,
        skills: config.projectDefaults.skills,
        workflows: config.projectDefaults.workflows,
      });
    }
    for (const override of config.projectTargets) {
      targetMap.set(path.resolve(override.path), {
        path: path.resolve(override.path),
        enabled: override.enabled,
        tools: override.tools,
        skills: override.skills,
        workflows: override.workflows,
      });
    }

    for (const projectConfig of targetMap.values()) {
      if (!projectConfig.enabled) {
        continue;
      }
      for (const tool of projectConfig.tools) {
        for (const skill of projectConfig.skills[tool]) {
          targets.push(skillTarget("project", tool, skill, projectConfig.path));
        }
      }
      for (const workflow of projectConfig.workflows) {
        targets.push(
          workflowTarget("project", "shared", workflow, projectConfig.path),
        );
      }
    }
    return targets;
  }
}

interface DesiredTarget {
  scope: ScopeKind;
  tool: DesiredTargetToolKind;
  kind: "skill" | "workflow";
  routineName: string;
  targetPath: string;
  columnId: MatrixColumnId;
  projectPath?: string;
}

interface ProjectDesiredConfig {
  path: string;
  enabled: boolean;
  tools: ConfigToolKind[];
  skills: { codex: string[]; claudeCode: string[] };
  workflows: string[];
}

function skillTarget(
  scope: ScopeKind,
  tool: ConfigToolKind,
  routineName: string,
  rootPath: string,
): DesiredTarget {
  const isCodex = tool === "codex";
  const columnId =
    scope === "user"
      ? isCodex
        ? "codexUser"
        : "claudeUser"
      : isCodex
        ? "codexProject"
        : "claudeProject";
  const targetPath =
    scope === "user"
      ? userHomePath(isCodex ? ".codex" : ".claude", "skills", routineName)
      : path.join(
          rootPath,
          isCodex ? ".codex" : ".claude",
          "skills",
          routineName,
        );
  return {
    scope,
    tool,
    kind: "skill",
    routineName,
    targetPath,
    columnId,
    ...(scope === "project" ? { projectPath: rootPath } : {}),
  };
}

function workflowTarget(
  scope: ScopeKind,
  tool: "shared",
  routineName: string,
  rootPath: string,
): DesiredTarget {
  return {
    scope,
    tool,
    kind: "workflow",
    routineName,
    targetPath:
      scope === "user"
        ? userHomePath(".agent-routines", "workflows", routineName)
        : path.join(rootPath, ".agent-routines", "workflows", routineName),
    columnId: "workflowRuntime",
    ...(scope === "project" ? { projectPath: rootPath } : {}),
  };
}

function statusRank(status: InstallStatus): number {
  switch (status) {
    case "broken":
      return 5;
    case "unknown":
      return 4;
    case "drift":
      return 3;
    case "missing":
      return 2;
    case "same":
      return 1;
    case "shared":
    case "not-targeted":
      return 0;
  }
}

async function discoverGitProjects(
  roots: string[],
  maxDepth: number,
  excludeDirs: Set<string>,
  skipNestedRepos: boolean,
): Promise<string[]> {
  const projects = new Set<string>();
  for (const root of roots) {
    await visitProjectRoot(path.resolve(root), 0, projects);
  }
  return [...projects].sort((left, right) => left.localeCompare(right));

  async function visitProjectRoot(
    directory: string,
    depth: number,
    projects: Set<string>,
  ): Promise<void> {
    if (depth > maxDepth || !(await pathExists(directory))) {
      return;
    }
    if (await pathExists(path.join(directory, ".git"))) {
      projects.add(directory);
      if (skipNestedRepos) {
        return;
      }
    }
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && !excludeDirs.has(entry.name))
        .map((entry) =>
          visitProjectRoot(
            path.join(directory, entry.name),
            depth + 1,
            projects,
          ),
        ),
    );
  }
}

async function readDirectoryNames(rootPath: string): Promise<string[]> {
  const entries = await fs.promises.readdir(rootPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

function parseRecommendedWorkflows(skillText: string): string[] {
  const match = skillText.match(/Recommended workflows:\s*([^\r\n]+)/i);
  if (!match) {
    return [];
  }
  return match[1]
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseFrontmatterValue(text: string, key: string): string {
  const match = text.match(new RegExp(`^${escapeRegExp(key)}:\\s*(.+)$`, "im"));
  return stripMarkdownQuotes(match?.[1]?.trim() ?? "");
}

function firstNonHeadingLine(text: string): string {
  const withoutFrontmatter = text.replace(/^---[\s\S]*?---\s*/m, "");
  return (
    withoutFrontmatter
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#")) ?? ""
  );
}

function firstSectionBody(text: string, heading: string): string {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex(
    (line) =>
      line
        .replace(/^#+\s*/, "")
        .trim()
        .toLowerCase() === heading.toLowerCase(),
  );
  if (start < 0) {
    return firstNonHeadingLine(text);
  }
  return (
    lines
      .slice(start + 1)
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#")) ?? ""
  );
}

function stripMarkdownQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface DirectoryComparison {
  status: Exclude<InstallStatus, "unknown" | "shared" | "not-targeted">;
  missingFiles: string[];
  changedFiles: string[];
}

export async function compareDirectories(
  sourcePath: string,
  targetPath: string,
): Promise<DirectoryComparison> {
  if (!(await pathExists(targetPath))) {
    return { status: "missing", missingFiles: [], changedFiles: [] };
  }

  const sourceFiles = await listFiles(sourcePath);
  const targetFiles = await listFiles(targetPath);
  const sourceSet = new Set(sourceFiles);
  const targetSet = new Set(targetFiles);
  const missingFiles = sourceFiles.filter((file) => !targetSet.has(file));
  const extraFiles = targetFiles.filter((file) => !sourceSet.has(file));
  if (missingFiles.length > 0) {
    return { status: "broken", missingFiles, changedFiles: extraFiles };
  }

  const changedFiles: string[] = [...extraFiles];
  for (const relativeFile of sourceFiles) {
    const [sourceHash, targetHash] = await Promise.all([
      hashFile(path.join(sourcePath, relativeFile)),
      hashFile(path.join(targetPath, relativeFile)),
    ]);
    if (sourceHash !== targetHash) {
      changedFiles.push(relativeFile);
    }
  }

  return {
    status: changedFiles.length > 0 ? "drift" : "same",
    missingFiles,
    changedFiles,
  };
}

async function listFiles(rootPath: string): Promise<string[]> {
  const result: string[] = [];
  const visit = async (directory: string) => {
    const entries = await fs.promises.readdir(directory, {
      withFileTypes: true,
    });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile()) {
        result.push(path.relative(rootPath, fullPath));
      }
    }
  };
  await visit(rootPath);
  return result.sort((left, right) => left.localeCompare(right));
}

async function hashFile(filePath: string): Promise<string> {
  const buffer = await fs.promises.readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}
