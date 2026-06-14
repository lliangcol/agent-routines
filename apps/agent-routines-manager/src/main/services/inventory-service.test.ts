import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { compareDirectories, InventoryService } from "./inventory-service.js";
import type { InstallDiscoveryConfigV2 } from "../../shared/contracts.js";

const tempRoots: string[] = [];

describe("InventoryService", () => {
  afterEach(async () => {
    await Promise.all(
      tempRoots
        .splice(0)
        .map((root) => fs.promises.rm(root, { recursive: true, force: true })),
    );
  });

  it("scans skills, workflows, required files, and recommended workflows", async () => {
    const root = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "arm-inventory-"),
    );
    tempRoots.push(root);
    await fs.promises.mkdir(
      path.join(root, "skills", "desktop-design-system"),
      { recursive: true },
    );
    await fs.promises.writeFile(
      path.join(root, "skills", "desktop-design-system", "SKILL.md"),
      [
        "---",
        "description: Use this skill for desktop productivity UI design systems.",
        "---",
        "",
        "# desktop-design-system",
        "",
        "Use this Skill for dense desktop UI work.",
        "",
        "Recommended workflows: doc-check, gate-check",
        "",
      ].join("\n"),
    );
    await fs.promises.writeFile(
      path.join(root, "skills", "desktop-design-system", "README.md"),
      "# Skill\n",
    );
    await fs.promises.mkdir(path.join(root, "workflows", "doc-check"), {
      recursive: true,
    });
    await fs.promises.writeFile(
      path.join(root, "workflows", "doc-check", "README.md"),
      "# doc-check Workflow\n\n## Purpose\nValidate docs coverage without writes.\n",
    );
    await fs.promises.writeFile(
      path.join(root, "workflows", "doc-check", "schema.json"),
      "{}\n",
    );
    await fs.promises.writeFile(
      path.join(root, "workflows", "doc-check", "doc-check.ps1"),
      "Write-Output ok\n",
    );
    await fs.promises.writeFile(
      path.join(root, "workflows", "doc-check", "doc-check.sh"),
      "#!/usr/bin/env bash\n",
    );

    const result = await new InventoryService(root).scan();

    expect(result.counts.skills).toBe(1);
    expect(result.counts.workflows).toBe(1);
    expect(
      result.routines.find(
        (routine) => routine.name === "desktop-design-system",
      ),
    ).toMatchObject({
      hasRequiredFiles: true,
      description: "Use this skill for desktop productivity UI design systems.",
      summary: "Use this Skill for dense desktop UI work.",
      recommendedWorkflows: ["doc-check", "gate-check"],
    });
    expect(
      result.routines.find((routine) => routine.name === "doc-check"),
    ).toMatchObject({
      description: "Validate docs coverage without writes.",
      summary: "Validate docs coverage without writes.",
    });
  });

  it("marks install targets with extra files as drift", async () => {
    const root = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "arm-compare-"),
    );
    tempRoots.push(root);
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await fs.promises.mkdir(source, { recursive: true });
    await fs.promises.mkdir(target, { recursive: true });
    await fs.promises.writeFile(path.join(source, "SKILL.md"), "# Skill\n");
    await fs.promises.writeFile(path.join(target, "SKILL.md"), "# Skill\n");
    await fs.promises.writeFile(path.join(target, "stale-note.md"), "stale\n");

    await expect(compareDirectories(source, target)).resolves.toMatchObject({
      status: "drift",
      changedFiles: ["stale-note.md"],
    });
  });

  it("distinguishes non-targeted skills from shared workflow runtime cells", async () => {
    const root = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "arm-matrix-"),
    );
    tempRoots.push(root);
    for (const skill of ["api-sync", "guarded-change"]) {
      await fs.promises.mkdir(path.join(root, "skills", skill), {
        recursive: true,
      });
      await fs.promises.writeFile(
        path.join(root, "skills", skill, "SKILL.md"),
        `# ${skill}\n`,
      );
      await fs.promises.writeFile(
        path.join(root, "skills", skill, "README.md"),
        `# ${skill}\n`,
      );
    }
    await fs.promises.mkdir(path.join(root, "workflows", "preflight"), {
      recursive: true,
    });
    await fs.promises.writeFile(
      path.join(root, "workflows", "preflight", "README.md"),
      "# preflight\n",
    );
    await fs.promises.writeFile(
      path.join(root, "workflows", "preflight", "schema.json"),
      "{}\n",
    );
    await fs.promises.writeFile(
      path.join(root, "workflows", "preflight", "preflight.ps1"),
      "Write-Output ok\n",
    );
    await fs.promises.writeFile(
      path.join(root, "workflows", "preflight", "preflight.sh"),
      "#!/usr/bin/env bash\n",
    );
    const config: InstallDiscoveryConfigV2 = {
      version: 2,
      userTargets: {
        enabled: false,
        tools: ["codex"],
        skills: { codex: [], claudeCode: [] },
        workflows: [],
      },
      projectDefaults: {
        enabled: false,
        tools: ["codex"],
        skills: { codex: [], claudeCode: [] },
        workflows: [],
        createTargets: false,
        mode: "merge",
      },
      projectTargets: [
        {
          path: root,
          enabled: true,
          tools: ["codex"],
          skills: { codex: ["guarded-change"], claudeCode: [] },
          workflows: ["preflight"],
          createTargets: false,
          mode: "merge",
        },
      ],
      discovery: {
        roots: [],
        maxDepth: 0,
        excludeDirs: [],
        skipNestedRepos: true,
      },
      promotionRules: {
        doNotPromoteToUserSkills: [],
      },
      output: {
        manifestPath: ".agent-routines/generated/install.manifest.json",
        reportPath: ".agent-routines/generated/install.plan.json",
      },
      applySafety: {
        unknownInstalledItems: "report-only",
      },
    };

    const result = await new InventoryService(root).matrix(config);
    const apiSync = result.rows.find((row) => row.routine.name === "api-sync");
    const guardedChange = result.rows.find(
      (row) => row.routine.name === "guarded-change",
    );
    const preflight = result.rows.find(
      (row) => row.routine.name === "preflight",
    );

    const apiSyncCodexProject = apiSync?.cells.find(
      (cell) => cell.columnId === "codexProject",
    );
    expect(apiSyncCodexProject).toMatchObject({
      status: "not-targeted",
      desired: false,
    });
    expect(apiSyncCodexProject?.targetPath).toBeUndefined();
    expect(
      apiSync?.cells.find((cell) => cell.columnId === "workflowRuntime"),
    ).toMatchObject({
      status: "not-targeted",
      desired: false,
    });
    expect(
      guardedChange?.cells.find((cell) => cell.columnId === "codexProject"),
    ).toMatchObject({
      status: "missing",
      desired: true,
    });
    const preflightCodexProject = preflight?.cells.find(
      (cell) => cell.columnId === "codexProject",
    );
    expect(preflightCodexProject).toMatchObject({
      status: "shared",
      desired: false,
    });
    expect(preflightCodexProject?.targetPath).toBeUndefined();
  });
});
