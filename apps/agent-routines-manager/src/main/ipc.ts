import { BrowserWindow, dialog, ipcMain, nativeTheme } from "electron";
import { createHash } from "node:crypto";
import fs from "node:fs";
import type { ZodTypeAny } from "zod";

import type {
  AgentRoutinesApi,
  AppSettings,
  ArchiveWriteRequest,
  ConfigSaveAsRequest,
  ConfigPathRequest,
  DocOpenRequest,
  ManifestDiffResult,
  PickDirectoryRequest,
  PickFileRequest,
  RunGateRequest,
} from "../shared/contracts.js";
import {
  appSettingsUpdateSchema,
  archiveWriteRequestSchema,
  applyDistributionRequestSchema,
  configPathRequestSchema,
  configSaveAsRequestSchema,
  docOpenRequestSchema,
  installDiscoveryConfigSchema,
  manifestWriteRequestSchema,
  pickDirectoryRequestSchema,
  pickFileRequestSchema,
  runGateRequestSchema,
  taskCancelRequestSchema,
} from "../shared/schemas.js";
import { CommandRegistry } from "./command-registry.js";
import { resolveInside } from "./path-utils.js";
import { ArchiveService } from "./services/archive-service.js";
import { DiagnosticsService } from "./services/diagnostics-service.js";
import { DocsService } from "./services/docs-service.js";
import { InventoryService } from "./services/inventory-service.js";
import { InstallDiscoveryService } from "./services/install-discovery-service.js";
import { SettingsStore } from "./services/settings-store.js";
import { ValidationService } from "./services/validation-service.js";
import { TaskQueue } from "./task-queue.js";

export function registerIpc(
  settingsStore: SettingsStore,
  taskQueue: TaskQueue,
  onSettingsChanged?: (settings: AppSettings) => void,
): void {
  taskQueue.on("changed", (task) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send("tasks.changed", task);
    }
  });

  handle("settings.get", undefined, async () => settingsStore.get());
  handle("settings.update", appSettingsUpdateSchema, async (payload) => {
    const next = await settingsStore.update(payload);
    nativeTheme.themeSource = next.theme;
    onSettingsChanged?.(next);
    return next;
  });

  handle("inventory.scan", undefined, async () => {
    const settings = await settingsStore.get();
    return new InventoryService(settings.sourceRepositoryPath).scan();
  });
  handle("inventory.matrix", undefined, async () => {
    const settings = await settingsStore.get();
    let config;
    if (settings.activeConfigPath) {
      try {
        config = await new InstallDiscoveryService(
          settings.sourceRepositoryPath,
        ).read(settings.activeConfigPath);
      } catch {
        config = undefined;
      }
    }
    return new InventoryService(settings.sourceRepositoryPath).matrix(config);
  });

  handle("installConfig.open", pickFileRequestSchema, (payload) =>
    pickFile(payload),
  );
  handle("installConfig.read", configPathRequestSchema, async (payload) => {
    const settings = await settingsStore.get();
    return new InstallDiscoveryService(settings.sourceRepositoryPath).read(
      payload.configPath,
    );
  });
  handle(
    "installConfig.validateDraft",
    installDiscoveryConfigSchema,
    async (payload) => {
      const settings = await settingsStore.get();
      return new InstallDiscoveryService(
        settings.sourceRepositoryPath,
      ).validateDraft(payload);
    },
  );
  handle("installConfig.saveAs", configSaveAsRequestSchema, async (payload) => {
    const settings = await settingsStore.get();
    const result = await dialog.showSaveDialog({
      title: "Save install discovery config",
      defaultPath: payload.suggestedPath,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (result.canceled || !result.filePath) {
      return {
        canceled: true,
        paths: [],
      };
    }
    const savedPath = await new InstallDiscoveryService(
      settings.sourceRepositoryPath,
    ).saveAs(result.filePath, payload.config);
    return {
      canceled: false,
      paths: [savedPath],
    };
  });
  handle("installConfig.validate", configPathRequestSchema, async (payload) => {
    const registry = await registryFor(settingsStore);
    return taskQueue.run(registry.buildValidateInstallConfig(payload));
  });

  handle("plan.generate", configPathRequestSchema, async (payload) => {
    const registry = await registryFor(settingsStore);
    const task = await taskQueue.run(
      registry.buildGenerateInstallPlan(payload),
    );
    const planJson =
      task.state === "succeeded" ? parseJsonLoose(task.stdout) : undefined;
    return {
      task,
      planJson,
      generatedManifest: getGeneratedManifest(planJson),
      manifestDiff: await buildManifestDiff(planJson),
    };
  });

  handle("manifest.write", manifestWriteRequestSchema, async (payload) => {
    const registry = await registryFor(settingsStore);
    return taskQueue.run(registry.buildWriteManifest(payload));
  });

  handle(
    "distribution.apply",
    applyDistributionRequestSchema,
    async (payload) => {
      const mode = payload.force ? "replace-listed" : (payload.mode ?? "merge");
      if (mode === "dry-run") {
        return taskQueue.recordBlocked(
          "applyDistribution",
          "tasks.applyDistribution",
          "Dry-run mode cannot apply distribution.",
        );
      }
      const expected =
        mode === "sync-prune"
          ? /^SYNC PRUNE \d+ TARGETS$/
          : mode === "replace-listed"
            ? /^REPLACE \d+ TARGETS$/
            : /^APPLY$/;
      const commandId =
        mode === "merge" ? "applyDistribution" : "destructiveApplyDistribution";
      const titleKey =
        mode === "merge"
          ? "tasks.applyDistribution"
          : "tasks.destructiveApplyDistribution";
      if (!expected.test(payload.confirmationText ?? "")) {
        return taskQueue.recordBlocked(
          commandId,
          titleKey,
          `Confirmation text does not match the selected apply mode.`,
        );
      }
      if (!payload.manifestDigest) {
        return taskQueue.recordBlocked(
          commandId,
          titleKey,
          "Reviewed manifest digest is required before apply.",
        );
      }
      if (payload.manifestPath) {
        const settings = await settingsStore.get();
        const manifestPath = resolveInside(
          settings.sourceRepositoryPath,
          payload.manifestPath,
        );
        let digest: string;
        try {
          digest = await hashJsonFile(manifestPath);
        } catch {
          return taskQueue.recordBlocked(
            commandId,
            titleKey,
            "Reviewed manifest file is not available.",
          );
        }
        if (digest !== payload.manifestDigest.toLowerCase()) {
          return taskQueue.recordBlocked(
            commandId,
            titleKey,
            "Manifest digest changed after review.",
          );
        }
      }
      const registry = await registryFor(settingsStore);
      return taskQueue.run(registry.buildApplyDistribution(payload));
    },
  );

  handle("validation.listGates", undefined, async () => {
    const settings = await settingsStore.get();
    return new ValidationService(settings.sourceRepositoryPath).listGates();
  });
  handle("validation.runGate", runGateRequestSchema, async (payload) => {
    const registry = await registryFor(settingsStore);
    return taskQueue.run(registry.buildRunRepositoryGate(payload));
  });

  handle("diagnostics.run", undefined, async () => {
    const settings = await settingsStore.get();
    return new DiagnosticsService(settings.sourceRepositoryPath).run();
  });

  handle("tasks.list", undefined, async () => taskQueue.list());
  handle("tasks.cancel", taskCancelRequestSchema, async (payload) =>
    taskQueue.cancel(payload.taskId),
  );

  handle("archive.write", archiveWriteRequestSchema, async (payload) => {
    const settings = await settingsStore.get();
    return new ArchiveService(settings.sourceRepositoryPath, taskQueue).write(
      payload.taskId,
      payload.includePlan,
    );
  });

  handle("dialogs.pickFile", pickFileRequestSchema, (payload) =>
    pickFile(payload),
  );
  handle("dialogs.pickDirectory", pickDirectoryRequestSchema, (payload) =>
    pickDirectory(payload),
  );

  handle("docs.list", undefined, async () => {
    const settings = await settingsStore.get();
    return new DocsService(
      settings.sourceRepositoryPath,
      settings.language,
    ).list();
  });
  handle("docs.open", docOpenRequestSchema, async (payload) => {
    const settings = await settingsStore.get();
    return new DocsService(
      settings.sourceRepositoryPath,
      settings.language,
    ).open(payload.id);
  });
}

function handle<Schema extends ZodTypeAny | undefined, Result>(
  channel: string,
  schema: Schema,
  listener: (
    payload: Schema extends ZodTypeAny
      ? ReturnType<Schema["parse"]>
      : undefined,
  ) => Promise<Result> | Result,
): void {
  ipcMain.handle(channel, async (_event, payload: unknown) => {
    try {
      const parsed = schema ? schema.parse(payload) : undefined;
      return await listener(
        parsed as Schema extends ZodTypeAny
          ? ReturnType<Schema["parse"]>
          : undefined,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown IPC error";
      throw new Error(`IPC ${channel} rejected: ${message}`);
    }
  });
}

async function registryFor(
  settingsStore: SettingsStore,
): Promise<CommandRegistry> {
  const settings = await settingsStore.get();
  return new CommandRegistry(settings.sourceRepositoryPath);
}

async function pickFile(request: PickFileRequest) {
  const result = await dialog.showOpenDialog({
    title: request.titleKey,
    properties: ["openFile"],
    filters: request.filters,
  });
  return { canceled: result.canceled, paths: result.filePaths };
}

async function pickDirectory(request: PickDirectoryRequest) {
  const result = await dialog.showOpenDialog({
    title: request.titleKey,
    properties: ["openDirectory"],
  });
  return { canceled: result.canceled, paths: result.filePaths };
}

function parseJsonLoose(value: string | undefined): unknown {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch {
    const firstBrace = value.indexOf("{");
    const lastBrace = value.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(value.slice(firstBrace, lastBrace + 1));
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}

function getGeneratedManifest(planJson: unknown): unknown {
  if (!isRecord(planJson)) {
    return undefined;
  }
  return planJson.generatedManifest;
}

async function buildManifestDiff(
  planJson: unknown,
): Promise<ManifestDiffResult> {
  const generatedManifest = getGeneratedManifest(planJson);
  if (!generatedManifest || !isRecord(planJson)) {
    return { state: "unavailable" };
  }
  const installPlan = planJson.installPlan;
  const currentPath = isRecord(installPlan)
    ? getStringValue(installPlan.manifestPath)
    : undefined;
  if (!currentPath) {
    return { state: "unavailable" };
  }

  const generatedText = stringifyJson(generatedManifest);
  const digest = hashText(generatedText);
  let currentText: string;
  try {
    currentText = await fs.promises.readFile(currentPath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return {
        state: "missing-current",
        currentPath,
        digest,
        text: generatedText,
      };
    }
    return { state: "unavailable", currentPath, digest };
  }

  const normalizedCurrentText = normalizeJsonText(currentText);
  if (normalizedCurrentText === generatedText) {
    return { state: "unchanged", currentPath, digest };
  }

  return {
    state: "changed",
    currentPath,
    digest,
    text: createLineDiff(normalizedCurrentText, generatedText),
  };
}

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function hashJsonFile(filePath: string): Promise<string> {
  const value = await fs.promises.readFile(filePath, "utf8");
  return hashText(normalizeJsonText(value));
}

function normalizeJsonText(value: string): string {
  try {
    return stringifyJson(JSON.parse(value));
  } catch {
    return value.trim();
  }
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function createLineDiff(currentText: string, nextText: string): string {
  const currentLines = currentText.split(/\r?\n/);
  const nextLines = nextText.split(/\r?\n/);
  const output: string[] = [];
  const maxLength = Math.max(currentLines.length, nextLines.length);
  for (let index = 0; index < maxLength; index += 1) {
    const currentLine = currentLines[index];
    const nextLine = nextLines[index];
    if (currentLine === nextLine) {
      continue;
    }
    if (currentLine !== undefined) {
      output.push(`- ${currentLine}`);
    }
    if (nextLine !== undefined) {
      output.push(`+ ${nextLine}`);
    }
  }
  return output.join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

type _ApiContractCheck = keyof AgentRoutinesApi;
type _PayloadContractCheck =
  | AppSettings
  | ArchiveWriteRequest
  | ConfigSaveAsRequest
  | ConfigPathRequest
  | DocOpenRequest
  | PickDirectoryRequest
  | PickFileRequest
  | RunGateRequest;
