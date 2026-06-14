import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type {
  InstallDiscoveryConfigV1,
  InstallDiscoveryConfigV2,
} from "../../shared/contracts.js";
import { InstallDiscoveryService } from "./install-discovery-service.js";

const tempRoots: string[] = [];

describe("InstallDiscoveryService", () => {
  afterEach(async () => {
    await Promise.all(
      tempRoots
        .splice(0)
        .map((root) => fs.promises.rm(root, { recursive: true, force: true })),
    );
  });

  it("reports duplicate and missing routine names in a draft", async () => {
    const root = await createRepositoryFixture();
    const service = new InstallDiscoveryService(root);
    const config = configFixture();
    config.userTargets.skills.codex = [
      "guarded-change",
      "guarded-change",
      "missing-skill",
    ];
    config.userTargets.skills.claudeCode = ["guarded-change", "missing-skill"];

    const result = await service.validateDraft(config);

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.messageKey)).toContain(
      "config.validation.duplicate",
    );
    expect(result.issues.map((issue) => issue.detail)).toContain(
      "missing-skill",
    );
  });

  it("reads config files only from inside the reviewed repository", async () => {
    const root = await createRepositoryFixture();
    const service = new InstallDiscoveryService(root);
    await fs.promises.mkdir(path.join(root, "tools"), { recursive: true });
    await fs.promises.writeFile(
      path.join(root, "tools", "install-discovery.config.example.json"),
      `${JSON.stringify(v1ConfigFixture(), null, 2)}\n`,
      "utf8",
    );

    await expect(
      service.read("tools/install-discovery.config.example.json"),
    ).resolves.toMatchObject({
      version: 2,
    });
    await expect(
      service.read(path.resolve(root, "..", "outside.json")),
    ).rejects.toThrow(/outside/);
  });

  it("refuses to save config into install target directories", async () => {
    const root = await createRepositoryFixture();
    const service = new InstallDiscoveryService(root);

    await expect(
      service.saveAs(
        path.join(root, ".agent-routines", "install-discovery.config.json"),
        configFixture(),
      ),
    ).rejects.toThrow(/install target/);
  });
});

async function createRepositoryFixture(): Promise<string> {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "arm-config-"));
  tempRoots.push(root);
  await fs.promises.mkdir(path.join(root, "skills", "guarded-change"), {
    recursive: true,
  });
  await fs.promises.writeFile(
    path.join(root, "skills", "guarded-change", "SKILL.md"),
    "Recommended workflows: gate-check\n",
  );
  await fs.promises.writeFile(
    path.join(root, "skills", "guarded-change", "README.md"),
    "# Skill\n",
  );
  await fs.promises.mkdir(path.join(root, "workflows", "gate-check"), {
    recursive: true,
  });
  await fs.promises.writeFile(
    path.join(root, "workflows", "gate-check", "README.md"),
    "# Workflow\n",
  );
  await fs.promises.writeFile(
    path.join(root, "workflows", "gate-check", "schema.json"),
    "{}\n",
  );
  await fs.promises.writeFile(
    path.join(root, "workflows", "gate-check", "gate-check.ps1"),
    "Write-Output ok\n",
  );
  await fs.promises.writeFile(
    path.join(root, "workflows", "gate-check", "gate-check.sh"),
    "#!/usr/bin/env bash\n",
  );
  return root;
}

function configFixture(): InstallDiscoveryConfigV2 {
  return {
    version: 2,
    userTargets: {
      enabled: true,
      tools: ["codex", "claudeCode"],
      skills: {
        codex: ["guarded-change"],
        claudeCode: ["guarded-change"],
      },
      workflows: ["gate-check"],
    },
    projectDefaults: {
      enabled: true,
      tools: ["codex", "claudeCode"],
      skills: { codex: [], claudeCode: [] },
      workflows: ["gate-check"],
      createTargets: false,
      mode: "merge",
    },
    projectTargets: [],
    discovery: {
      roots: ["D:\\Repositories"],
      maxDepth: 2,
      excludeDirs: [".git", "node_modules"],
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
}

function v1ConfigFixture(): InstallDiscoveryConfigV1 {
  return {
    version: 1,
    projectRoots: ["D:\\Repositories"],
    tools: ["codex", "claudeCode"],
    projectDiscovery: {
      mode: "git-repos",
      maxDepth: 2,
      excludeDirs: [".git", "node_modules"],
      skipNestedRepos: true,
    },
    scopePolicy: {
      desiredStateSource: "policy-with-installed-evidence",
      userLevelSkills: ["guarded-change"],
      projectLevelOnlySkills: [],
      userLevelWorkflows: ["gate-check"],
      projectDefaultWorkflows: ["gate-check"],
      unknownInstalledItems: "report-only",
    },
    output: {
      manifestPath: ".agent-routines/generated/install.manifest.json",
      reportPath: ".agent-routines/generated/install.plan.json",
    },
    install: {
      validateBeforeInstall: true,
      verifyAfterInstall: true,
      force: false,
    },
  };
}
