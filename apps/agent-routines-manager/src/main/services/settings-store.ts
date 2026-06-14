import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

import type { AppSettings } from "../../shared/contracts.js";
import {
  appSettingsSchema,
  appSettingsUpdateSchema,
} from "../../shared/schemas.js";
import {
  findDefaultSourceRepositoryPath,
  resolveInside,
} from "../path-utils.js";

export class SettingsStore {
  private readonly settingsPath: string;

  public constructor() {
    this.settingsPath = path.join(app.getPath("userData"), "settings.json");
  }

  public async get(): Promise<AppSettings> {
    try {
      const parsed = JSON.parse(
        await fs.promises.readFile(this.settingsPath, "utf8"),
      ) as unknown;
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return this.defaults();
      }
      return appSettingsSchema.parse({
        ...this.defaults(),
        ...(parsed as Record<string, unknown>),
      });
    } catch {
      return this.defaults();
    }
  }

  public async update(input: Partial<AppSettings>): Promise<AppSettings> {
    const update = appSettingsUpdateSchema.parse(input);
    const current = await this.get();
    const normalizedUpdate = { ...update };
    if (normalizedUpdate.sourceRepositoryPath) {
      normalizedUpdate.sourceRepositoryPath =
        await normalizeSourceRepositoryPath(
          normalizedUpdate.sourceRepositoryPath,
        );
      normalizedUpdate.activeConfigPath =
        normalizedUpdate.activeConfigPath ??
        defaultActiveConfigPath(normalizedUpdate.sourceRepositoryPath);
    }

    const next = appSettingsSchema.parse({
      ...current,
      ...normalizedUpdate,
    });
    if (next.activeConfigPath) {
      if (normalizedUpdate.activeConfigPath) {
        next.activeConfigPath = resolveInside(
          next.sourceRepositoryPath,
          next.activeConfigPath,
        );
      } else {
        try {
          next.activeConfigPath = resolveInside(
            next.sourceRepositoryPath,
            next.activeConfigPath,
          );
        } catch {
          next.activeConfigPath = defaultActiveConfigPath(
            next.sourceRepositoryPath,
          );
        }
      }
    }
    await fs.promises.mkdir(path.dirname(this.settingsPath), {
      recursive: true,
    });
    await fs.promises.writeFile(
      this.settingsPath,
      `${JSON.stringify(next, null, 2)}\n`,
      "utf8",
    );
    return next;
  }

  private defaults(): AppSettings {
    const repositoryPath = findDefaultSourceRepositoryPath();
    return {
      sourceRepositoryPath: repositoryPath,
      activeConfigPath: defaultActiveConfigPath(repositoryPath),
      theme: "system",
      language: "zh-CN",
      recentProjectRoots: [repositoryPath],
    };
  }
}

async function normalizeSourceRepositoryPath(value: string): Promise<string> {
  const resolved = path.resolve(value);
  const requiredPaths = ["AGENTS.md", "skills", "workflows", "tests"];
  for (const requiredPath of requiredPaths) {
    await fs.promises.access(path.join(resolved, requiredPath));
  }
  return resolved;
}

function defaultActiveConfigPath(repositoryPath: string): string {
  return path.join(
    repositoryPath,
    "tools",
    "install-discovery.config.example.json",
  );
}
