import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { PlatformKind } from "../shared/contracts.js";

export function getPlatformKind(): PlatformKind {
  if (process.platform === "win32") {
    return "windows";
  }
  if (process.platform === "darwin") {
    return "macos";
  }
  return "linux";
}

export function findDefaultSourceRepositoryPath(): string {
  const cwd = process.cwd();
  if (
    path.basename(cwd) === "agent-routines-manager" &&
    path.basename(path.dirname(cwd)) === "apps"
  ) {
    return path.resolve(cwd, "..", "..");
  }

  let probe = cwd;
  for (let index = 0; index < 6; index += 1) {
    if (
      fs.existsSync(path.join(probe, "AGENTS.md")) &&
      fs.existsSync(path.join(probe, "skills")) &&
      fs.existsSync(path.join(probe, "workflows"))
    ) {
      return probe;
    }
    const next = path.dirname(probe);
    if (next === probe) {
      break;
    }
    probe = next;
  }

  return path.resolve(cwd, "..", "..");
}

export function resolveInside(basePath: string, requestedPath: string): string {
  const resolved = path.isAbsolute(requestedPath)
    ? path.resolve(requestedPath)
    : path.resolve(basePath, requestedPath);
  if (!isInside(basePath, resolved)) {
    throw new Error(
      `Path is outside the reviewed repository: ${requestedPath}`,
    );
  }
  return resolved;
}

export function isInside(basePath: string, candidatePath: string): boolean {
  const base = path.resolve(basePath);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(base, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

export function userHomePath(...segments: string[]): string {
  return path.join(os.homedir(), ...segments);
}

export function toDisplayPath(value: string): string {
  return path.normalize(value);
}

export function pathExists(value: string): Promise<boolean> {
  return fs.promises
    .access(value)
    .then(() => true)
    .catch(() => false);
}
