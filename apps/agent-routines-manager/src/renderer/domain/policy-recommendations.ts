import type { TFunction } from "i18next";

import type {
  InstallDiscoveryConfigV2,
  InstallMatrixResult,
  InventoryScanResult,
  RoutineItem,
} from "../../shared/contracts.js";

export type PolicyRecommendationCategory =
  | "user-reuse"
  | "project-specific"
  | "workflow-runtime";

export interface PolicyRecommendation {
  id: string;
  routine: RoutineItem;
  category: PolicyRecommendationCategory;
  reason: string;
  configured: boolean;
  workflowNames: string[];
  projectPaths: string[];
}

const reusableSkills = new Set([
  "guarded-change",
  "review-loop",
  "merge-fix",
  "env-audit",
  "runtime-repair",
  "commit-guard",
  "prompt-qa",
  "release-guard",
  "security-review",
  "github-guard",
  "graph-audit",
  "archive-record",
  "governance-audit",
]);

const projectSpecificSkills = new Set([
  "api-sync",
  "desktop-design-system",
  "desktop-packaging-release",
  "desktop-qa",
  "dms-repair",
  "electron-app-builder",
  "i18n-checklist",
  "java-maven-verify",
  "knowledge-drift",
  "node-workspace-release",
  "pay-docs",
]);

export function buildProjectCandidates(
  config: InstallDiscoveryConfigV2,
  inventory?: InventoryScanResult,
  matrix?: InstallMatrixResult,
): string[] {
  const candidates = new Set<string>();
  if (inventory?.repositoryPath) {
    candidates.add(inventory.repositoryPath);
  }
  for (const target of config.projectTargets) {
    candidates.add(target.path);
  }
  for (const detail of matrix?.projectDetails ?? []) {
    candidates.add(detail.projectPath);
  }
  if (candidates.size === 0) {
    for (const root of config.discovery.roots) {
      candidates.add(root);
    }
  }
  return Array.from(candidates).sort((left, right) =>
    left.localeCompare(right),
  );
}

export function buildPolicyRecommendations(
  t: TFunction,
  config: InstallDiscoveryConfigV2,
  skills: RoutineItem[],
  workflows: RoutineItem[],
  projectCandidates: string[],
): PolicyRecommendation[] {
  const recommendations: PolicyRecommendation[] = [];

  for (const skill of skills) {
    const isProjectSpecific =
      projectSpecificSkills.has(skill.name) ||
      config.promotionRules.doNotPromoteToUserSkills.includes(skill.name) ||
      descriptionLooksProjectSpecific(skill);
    const category: PolicyRecommendationCategory =
      isProjectSpecific && !reusableSkills.has(skill.name)
        ? "project-specific"
        : "user-reuse";
    recommendations.push({
      id: `skill-${skill.name}`,
      routine: skill,
      category,
      reason:
        category === "user-reuse"
          ? t("policy.recommend.reason.userReuse")
          : t("policy.recommend.reason.projectSpecific"),
      configured: isSkillConfigured(config, skill.name),
      workflowNames: skill.recommendedWorkflows,
      projectPaths:
        category === "project-specific"
          ? inferApplicableProjects(skill, projectCandidates)
          : [],
    });
  }

  for (const workflow of workflows) {
    recommendations.push({
      id: `workflow-${workflow.name}`,
      routine: workflow,
      category: "workflow-runtime",
      reason: t("policy.recommend.reason.workflowRuntime"),
      configured: isWorkflowConfigured(config, workflow.name),
      workflowNames: [],
      projectPaths: [],
    });
  }

  return recommendations.sort((left, right) => {
    if (left.configured !== right.configured) {
      return left.configured ? 1 : -1;
    }
    return left.routine.name.localeCompare(right.routine.name);
  });
}

function descriptionLooksProjectSpecific(routine: RoutineItem): boolean {
  return /electron|desktop|maven|database|payment|node|workspace|i18n|api/i.test(
    `${routine.name} ${routine.description} ${routine.summary}`,
  );
}

function inferApplicableProjects(
  routine: RoutineItem,
  candidates: string[],
): string[] {
  const text =
    `${routine.name} ${routine.description} ${routine.summary}`.toLowerCase();
  const keywords: string[] = [];
  if (text.includes("electron") || text.includes("desktop")) {
    keywords.push("electron", "desktop", "agent-routines");
  }
  if (text.includes("maven") || text.includes("java")) {
    keywords.push("maven", "java");
  }
  if (text.includes("database") || text.includes("dms")) {
    keywords.push("db", "database", "dms");
  }
  if (text.includes("node") || text.includes("workspace")) {
    keywords.push("node", "workspace", "agent-routines");
  }
  if (text.includes("payment")) {
    keywords.push("pay", "payment");
  }
  if (keywords.length === 0) {
    return [];
  }
  return candidates
    .filter((candidate) => {
      const normalized = candidate.toLowerCase();
      return keywords.some((keyword) => normalized.includes(keyword));
    })
    .slice(0, 4);
}

function isSkillConfigured(
  config: InstallDiscoveryConfigV2,
  name: string,
): boolean {
  return (
    config.userTargets.skills.codex.includes(name) ||
    config.userTargets.skills.claudeCode.includes(name) ||
    config.projectDefaults.skills.codex.includes(name) ||
    config.projectDefaults.skills.claudeCode.includes(name) ||
    config.projectTargets.some(
      (target) =>
        target.skills.codex.includes(name) ||
        target.skills.claudeCode.includes(name),
    )
  );
}

function isWorkflowConfigured(
  config: InstallDiscoveryConfigV2,
  name: string,
): boolean {
  return (
    config.userTargets.workflows.includes(name) ||
    config.projectDefaults.workflows.includes(name) ||
    config.projectTargets.some((target) => target.workflows.includes(name))
  );
}
