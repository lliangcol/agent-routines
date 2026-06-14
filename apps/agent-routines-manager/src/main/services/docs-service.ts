import { shell } from "electron";
import fs from "node:fs";
import path from "node:path";

import type {
  DocsEntry,
  LanguageCode,
  TaskRecord,
} from "../../shared/contracts.js";
import { resolveInside, toDisplayPath } from "../path-utils.js";

const docDefinitions = [
  [
    "electron-plan",
    "docs.electronPlan",
    "docs.category.security",
    "docs/electron-app-plan.md",
  ],
  [
    "electron-ui",
    "docs.electronUi",
    "docs.category.design",
    "docs/electron-app-ui-design.md",
  ],
  [
    "electron-prerequisites",
    "docs.electronPrerequisites",
    "docs.category.setup",
    "docs/electron-app-prerequisites.md",
  ],
  [
    "electron-manual-test-cases",
    "docs.electronManualTestCases",
    "docs.category.setup",
    "docs/electron-app-manual-test-cases.md",
  ],
  [
    "electron-install-tutorial",
    "docs.electronInstallTutorial",
    "docs.category.distribution",
    "docs/electron-app-install-tutorial.md",
  ],
  [
    "electron-distribution-guide-ui",
    "docs.electronDistributionGuideUi",
    "docs.category.distribution",
    "docs/electron-app-distribution-guide-ui.md",
  ],
  [
    "usage-manual",
    "docs.usageManual",
    "docs.category.overview",
    "docs/usage-manual.md",
  ],
  [
    "install-discovery",
    "docs.installDiscovery",
    "docs.category.distribution",
    "docs/install-discovery.md",
  ],
  [
    "release-process",
    "docs.releaseProcess",
    "docs.category.release",
    "docs/release-process.md",
  ],
  ["readme", "docs.readme", "docs.category.overview", "README.md"],
] as const;

type DocDefinition = {
  id: string;
  titleKey: string;
  categoryKey: string;
  relativePath: string;
  title?: string;
};

export class DocsService {
  public constructor(
    private readonly repositoryPath: string,
    private readonly language: LanguageCode = "en",
  ) {}

  public async list(): Promise<DocsEntry[]> {
    const routineDocs = await this.listRoutineDocDefinitions();
    const definitions: DocDefinition[] = [
      ...docDefinitions.map(([id, titleKey, categoryKey, relativePath]) => ({
        id,
        titleKey,
        categoryKey,
        relativePath,
      })),
      ...routineDocs,
    ];
    const entries = await Promise.all(
      definitions.map((definition) =>
        this.readDocEntry(
          definition.id,
          definition.titleKey,
          definition.categoryKey,
          definition.relativePath,
          definition.title,
        ),
      ),
    );
    return entries.filter((entry): entry is DocsEntry => Boolean(entry));
  }

  public async open(id: string): Promise<TaskRecord> {
    const entry = (await this.list()).find((item) => item.id === id);
    if (!entry) {
      throw new Error(`Unknown document id: ${id}`);
    }
    const docPath = entry.path;
    const opened = await shell.openPath(docPath);
    const now = new Date().toISOString();
    return {
      id: `docs-${id}-${Date.now()}`,
      commandId: "docs.open",
      state: opened ? "failed" : "succeeded",
      startedAt: now,
      endedAt: now,
      exitCode: opened ? 1 : 0,
      cwd: this.repositoryPath,
      argv: ["openPath", docPath],
      titleKey: entry.titleKey,
      stdout: opened ? "" : docPath,
      stderr: opened,
      cancelable: false,
    };
  }

  private async readDocEntry(
    id: string,
    titleKey: string,
    categoryKey: string,
    relativePath: string,
    title?: string,
    category?: string,
  ): Promise<DocsEntry | undefined> {
    const localizedRelativePath =
      await this.resolveLocalizedRelativePath(relativePath);
    const docPath = resolveInside(this.repositoryPath, localizedRelativePath);
    if (!(await pathExists(docPath))) {
      return undefined;
    }
    const text = await fs.promises.readFile(docPath, "utf8");
    const headings = text
      .split(/\r?\n/)
      .filter((line) => line.startsWith("#"))
      .map((line) => line.replace(/^#+\s*/, ""))
      .slice(0, 12);
    const summary = text
      .split(/\r?\n/)
      .find((line) => line.trim() && !line.startsWith("#"))
      ?.trim()
      .slice(0, 260);
    return {
      id,
      titleKey,
      title,
      categoryKey,
      category,
      path: toDisplayPath(docPath),
      headings,
      summary: summary ?? "",
      bodyPreview: text.slice(0, 3600),
    };
  }

  private async listRoutineDocDefinitions(): Promise<DocDefinition[]> {
    const [skills, workflows] = await Promise.all([
      this.listRoutineNames("skills"),
      this.listRoutineNames("workflows"),
    ]);
    return [
      ...skills.flatMap((name) => [
        {
          id: `skill-${name}-readme`,
          titleKey: "docs.routineReadme",
          title: `${name} README`,
          categoryKey: "docs.category.skills",
          relativePath: path.posix.join("skills", name, "README.md"),
        },
        {
          id: `skill-${name}-instruction`,
          titleKey: "docs.skillInstruction",
          title: `${name} SKILL.md`,
          categoryKey: "docs.category.skills",
          relativePath: path.posix.join("skills", name, "SKILL.md"),
        },
      ]),
      ...workflows.map((name) => ({
        id: `workflow-${name}-readme`,
        titleKey: "docs.routineReadme",
        title: `${name} README`,
        categoryKey: "docs.category.workflows",
        relativePath: path.posix.join("workflows", name, "README.md"),
      })),
    ];
  }

  private async listRoutineNames(
    kind: "skills" | "workflows",
  ): Promise<string[]> {
    const rootPath = resolveInside(this.repositoryPath, kind);
    try {
      const entries = await fs.promises.readdir(rootPath, {
        withFileTypes: true,
      });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));
    } catch {
      return [];
    }
  }

  private async resolveLocalizedRelativePath(
    relativePath: string,
  ): Promise<string> {
    if (this.language !== "zh-CN" || !relativePath.endsWith(".md")) {
      return relativePath;
    }
    if (relativePath.endsWith(".zh-CN.md")) {
      return relativePath;
    }
    const companionPath = relativePath.replace(/\.md$/, ".zh-CN.md");
    if (await pathExists(resolveInside(this.repositoryPath, companionPath))) {
      return companionPath;
    }
    return relativePath;
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}
