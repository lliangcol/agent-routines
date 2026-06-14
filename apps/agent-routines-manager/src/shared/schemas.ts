import { z } from "zod";

import { gateIds, statusKeys } from "./contracts.js";

export const platformKindSchema = z.enum(["windows", "macos", "linux"]);
export const themeModeSchema = z.enum(["light", "dark", "system"]);
export const languageCodeSchema = z.enum(["en", "zh-CN"]);
export const routineKindSchema = z.enum(["skill", "workflow"]);
export const toolKindSchema = z.enum([
  "codex",
  "claude-code",
  "shared-workflow-runtime",
]);
export const scopeKindSchema = z.enum(["user", "project"]);
export const installStatusSchema = z.enum(statusKeys);
export const taskStateSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
  "canceled",
]);
export const shellKindSchema = z.enum(["powershell", "bash"]);
export const commandIdSchema = z.enum([
  "validateInstallConfig",
  "generateInstallPlan",
  "writeManifest",
  "applyDistribution",
  "destructiveApplyDistribution",
  "runRepositoryGate",
  "checkInstallTarget",
]);
export const gateIdSchema = z.enum(gateIds);
export const applyModeSchema = z.enum([
  "dry-run",
  "merge",
  "replace-listed",
  "sync-prune",
]);

const pathSchema = z.string().trim().min(1).max(4096);

export const appSettingsSchema = z.object({
  sourceRepositoryPath: pathSchema,
  activeConfigPath: pathSchema.optional(),
  theme: themeModeSchema,
  language: languageCodeSchema,
  recentProjectRoots: z.array(pathSchema).max(20),
});

export const appSettingsUpdateSchema = appSettingsSchema.partial().strict();

const routineNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9][a-z0-9-]*$/);

export const scopePolicySchema = z
  .object({
    desiredStateSource: z.literal("policy-with-installed-evidence"),
    userLevelSkills: z.array(routineNameSchema).max(200),
    projectLevelOnlySkills: z.array(routineNameSchema).max(200),
    userLevelWorkflows: z.array(routineNameSchema).max(200),
    projectDefaultWorkflows: z.array(routineNameSchema).max(200),
    unknownInstalledItems: z.literal("report-only"),
  })
  .strict();

const configToolKindSchema = z.enum(["codex", "claudeCode"]);
const configToolsSchema = z.array(configToolKindSchema).min(1).max(2);

const toolRoutineSelectionSchema = z
  .object({
    codex: z.array(routineNameSchema).max(200),
    claudeCode: z.array(routineNameSchema).max(200),
  })
  .strict();

const projectRootDiscoveryOptionSchema = z
  .object({
    root: pathSchema,
    skipNestedRepos: z.boolean(),
  })
  .strict();

const projectDiscoveryV1Schema = z
  .object({
    mode: z.literal("git-repos"),
    maxDepth: z.number().int().min(0).max(12),
    excludeDirs: z.array(z.string().trim().min(1).max(160)).max(200),
    skipNestedRepos: z.boolean(),
    rootOptions: z.array(projectRootDiscoveryOptionSchema).max(100).optional(),
  })
  .strict();

const projectDiscoveryV2Schema = z
  .object({
    roots: z.array(pathSchema).max(100),
    maxDepth: z.number().int().min(0).max(12),
    excludeDirs: z.array(z.string().trim().min(1).max(160)).max(200),
    skipNestedRepos: z.boolean(),
    rootOptions: z.array(projectRootDiscoveryOptionSchema).max(100).optional(),
  })
  .strict();

const projectTargetDefaultsSchema = z
  .object({
    enabled: z.boolean(),
    tools: configToolsSchema,
    skills: toolRoutineSelectionSchema,
    workflows: z.array(routineNameSchema).max(200),
    createTargets: z.boolean(),
    mode: z.enum(["merge", "replace-listed"]),
  })
  .strict();

export const installDiscoveryConfigV1Schema = z
  .object({
    version: z.literal(1),
    projectRoots: z.array(pathSchema).max(100),
    tools: configToolsSchema,
    projectDiscovery: projectDiscoveryV1Schema,
    scopePolicy: scopePolicySchema,
    output: z
      .object({
        manifestPath: pathSchema,
        reportPath: pathSchema,
      })
      .strict(),
    install: z
      .object({
        validateBeforeInstall: z.boolean(),
        verifyAfterInstall: z.boolean(),
        force: z.boolean(),
      })
      .strict(),
  })
  .strict();

export const installDiscoveryConfigV2Schema = z
  .object({
    version: z.literal(2),
    userTargets: z
      .object({
        enabled: z.boolean(),
        tools: configToolsSchema,
        skills: toolRoutineSelectionSchema,
        workflows: z.array(routineNameSchema).max(200),
      })
      .strict(),
    projectDefaults: projectTargetDefaultsSchema,
    projectTargets: z
      .array(projectTargetDefaultsSchema.extend({ path: pathSchema }).strict())
      .max(500),
    discovery: projectDiscoveryV2Schema,
    promotionRules: z
      .object({
        doNotPromoteToUserSkills: z.array(routineNameSchema).max(200),
      })
      .strict(),
    output: z
      .object({
        manifestPath: pathSchema,
        reportPath: pathSchema,
      })
      .strict(),
    applySafety: z
      .object({
        unknownInstalledItems: z.literal("report-only"),
      })
      .strict(),
  })
  .strict();

export const installDiscoveryConfigSchema = z.union([
  installDiscoveryConfigV1Schema,
  installDiscoveryConfigV2Schema,
]);

export const configSaveAsRequestSchema = z
  .object({
    config: installDiscoveryConfigSchema,
    suggestedPath: pathSchema.optional(),
  })
  .strict();

export const configPathRequestSchema = z
  .object({
    configPath: pathSchema,
  })
  .strict();

export const confirmedConfigPathRequestSchema = configPathRequestSchema
  .extend({
    confirmed: z.literal(true),
  })
  .strict();

const reviewedManifestDigestSchema = z.string().regex(/^[a-f0-9]{64}$/i);

export const manifestWriteRequestSchema = confirmedConfigPathRequestSchema
  .extend({
    manifestDigest: reviewedManifestDigestSchema,
  })
  .strict();

export const applyDistributionRequestSchema = manifestWriteRequestSchema
  .extend({
    mode: applyModeSchema.optional(),
    force: z.boolean().optional(),
    confirmationText: z.string().max(120).optional(),
    manifestPath: pathSchema.optional(),
  })
  .strict();

export const runGateRequestSchema = z
  .object({
    gateId: gateIdSchema,
    shell: shellKindSchema,
  })
  .strict();

export const pickFileRequestSchema = z
  .object({
    titleKey: z.string().min(1).max(120),
    filters: z
      .array(
        z.object({
          name: z.string().min(1).max(80),
          extensions: z.array(z.string().min(1).max(16)).max(12),
        }),
      )
      .max(8)
      .optional(),
  })
  .strict();

export const pickDirectoryRequestSchema = z
  .object({
    titleKey: z.string().min(1).max(120),
  })
  .strict();

export const docOpenRequestSchema = z
  .object({
    id: z.string().min(1).max(80),
  })
  .strict();

export const archiveWriteRequestSchema = z
  .object({
    taskId: z.string().min(1).max(80),
    includePlan: z.boolean(),
    confirmed: z.literal(true),
  })
  .strict();

export const taskCancelRequestSchema = z
  .object({
    taskId: z.string().min(1).max(80),
  })
  .strict();

export type AppSettingsUpdateInput = z.infer<typeof appSettingsUpdateSchema>;
