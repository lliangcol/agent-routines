import path from "node:path";

import type {
  ApplyDistributionRequest,
  CommandId,
  ConfigPathRequest,
  GateId,
  ManifestWriteRequest,
  RunGateRequest,
  ShellKind,
} from "../shared/contracts.js";
import { getPlatformKind, resolveInside } from "./path-utils.js";

export interface CommandSpec {
  commandId: CommandId;
  executable: string;
  args: string[];
  cwd: string;
  shell: ShellKind | "direct";
  titleKey: string;
  writes: boolean;
}

const psExecutable = process.platform === "win32" ? "powershell.exe" : "pwsh";

export class CommandRegistry {
  public constructor(private readonly repositoryPath: string) {}

  public buildValidateInstallConfig(request: ConfigPathRequest): CommandSpec {
    const configPath = this.resolveConfig(request.configPath);
    return this.buildInstallDiscoveryCommand(
      "validateInstallConfig",
      configPath,
      false,
      [],
    );
  }

  public buildGenerateInstallPlan(request: ConfigPathRequest): CommandSpec {
    const configPath = this.resolveConfig(request.configPath);
    return this.buildInstallDiscoveryCommand(
      "generateInstallPlan",
      configPath,
      false,
      [],
    );
  }

  public buildWriteManifest(request: ManifestWriteRequest): CommandSpec {
    const configPath = this.resolveConfig(request.configPath);
    return this.buildInstallDiscoveryCommand(
      "writeManifest",
      configPath,
      true,
      ["writeManifest"],
      "merge",
      request.manifestDigest,
    );
  }

  public buildApplyDistribution(
    request: ApplyDistributionRequest,
  ): CommandSpec {
    const configPath = this.resolveConfig(request.configPath);
    const mode = request.force ? "replace-listed" : (request.mode ?? "merge");
    const flags: Array<"writeManifest" | "apply" | "force"> = request.force
      ? ["writeManifest", "apply", "force"]
      : ["writeManifest", "apply"];
    return this.buildInstallDiscoveryCommand(
      mode === "replace-listed" || mode === "sync-prune"
        ? "destructiveApplyDistribution"
        : "applyDistribution",
      configPath,
      true,
      flags,
      mode,
      request.manifestDigest,
    );
  }

  public buildRunRepositoryGate(request: RunGateRequest): CommandSpec {
    const gate = gateCommands[request.gateId];
    if (!gate) {
      throw new Error(`Unknown gate: ${request.gateId}`);
    }

    if (request.shell === "powershell") {
      const scriptPath = resolveInside(
        this.repositoryPath,
        path.join("tests", `${gate.scriptBase}.ps1`),
      );
      return {
        commandId: "runRepositoryGate",
        executable: psExecutable,
        args: [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          scriptPath,
          ...gate.psArgs(this.repositoryPath),
        ],
        cwd: this.repositoryPath,
        shell: "powershell",
        titleKey: `validation.gates.${request.gateId}`,
        writes: false,
      };
    }

    const scriptPath = resolveInside(
      this.repositoryPath,
      path.join("tests", `${gate.scriptBase}.sh`),
    );
    return {
      commandId: "runRepositoryGate",
      executable: "bash",
      args: [scriptPath, ...gate.bashArgs(this.repositoryPath)],
      cwd: this.repositoryPath,
      shell: "bash",
      titleKey: `validation.gates.${request.gateId}`,
      writes: false,
    };
  }

  public buildCheckInstallTarget(): CommandSpec {
    const isWindows = getPlatformKind() === "windows";
    const scriptPath = resolveInside(
      this.repositoryPath,
      isWindows
        ? path.join("adapters", "codex", "check-user.ps1")
        : path.join("adapters", "codex", "check-user.sh"),
    );
    return {
      commandId: "checkInstallTarget",
      executable: isWindows ? psExecutable : "bash",
      args: isWindows
        ? ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath]
        : [scriptPath],
      cwd: this.repositoryPath,
      shell: isWindows ? "powershell" : "bash",
      titleKey: "tasks.checkInstallTarget",
      writes: false,
    };
  }

  private resolveConfig(configPath: string): string {
    return resolveInside(this.repositoryPath, configPath);
  }

  private buildInstallDiscoveryCommand(
    commandId: CommandId,
    configPath: string,
    writes: boolean,
    flags: Array<"writeManifest" | "apply" | "force">,
    mode = "merge",
    expectedManifestDigest?: string,
  ): CommandSpec {
    const isWindows = getPlatformKind() === "windows";
    if (isWindows) {
      const scriptPath = resolveInside(
        this.repositoryPath,
        commandId === "validateInstallConfig"
          ? path.join("tests", "validate-install-discovery-config.ps1")
          : path.join("tools", "generate-install-manifest.ps1"),
      );
      const args = [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,
      ];
      if (commandId === "validateInstallConfig") {
        args.push("-ConfigPath", configPath);
      } else {
        args.push("-ConfigPath", configPath);
        if (flags.includes("writeManifest")) {
          args.push("-WriteManifest");
        }
        if (flags.includes("apply")) {
          args.push("-Apply");
        }
        if (flags.includes("force")) {
          args.push("-Force");
        }
        if (mode !== "merge") {
          args.push("-ApplyMode", mode);
        }
        if (expectedManifestDigest) {
          args.push("-ExpectedManifestDigest", expectedManifestDigest);
        }
      }
      return {
        commandId,
        executable: psExecutable,
        args,
        cwd: this.repositoryPath,
        shell: "powershell",
        titleKey: `tasks.${commandId}`,
        writes,
      };
    }

    const scriptPath = resolveInside(
      this.repositoryPath,
      commandId === "validateInstallConfig"
        ? path.join("tests", "validate-install-discovery-config.sh")
        : path.join("tools", "generate-install-manifest.sh"),
    );
    const args = [scriptPath];
    if (commandId === "validateInstallConfig") {
      args.push("--config-path", configPath);
    } else {
      args.push("--config-path", configPath);
      if (flags.includes("writeManifest")) {
        args.push("--write-manifest");
      }
      if (flags.includes("apply")) {
        args.push("--apply");
      }
      if (flags.includes("force")) {
        args.push("--force");
      }
      if (mode !== "merge") {
        args.push("--mode", mode);
      }
      if (expectedManifestDigest) {
        args.push("--expected-manifest-digest", expectedManifestDigest);
      }
    }

    return {
      commandId,
      executable: "bash",
      args,
      cwd: this.repositoryPath,
      shell: "bash",
      titleKey: `tasks.${commandId}`,
      writes,
    };
  }
}

interface GateCommand {
  scriptBase: string;
  psArgs: (repositoryPath: string) => string[];
  bashArgs: (repositoryPath: string) => string[];
}

const noArgs = (): string[] => [];

export const gateCommands: Record<GateId, GateCommand> = {
  "validate-structure": {
    scriptBase: "validate-structure",
    psArgs: noArgs,
    bashArgs: noArgs,
  },
  "validate-skills": {
    scriptBase: "validate-skills",
    psArgs: noArgs,
    bashArgs: noArgs,
  },
  "validate-workflows": {
    scriptBase: "validate-workflows",
    psArgs: noArgs,
    bashArgs: noArgs,
  },
  "validate-docs": {
    scriptBase: "validate-docs",
    psArgs: noArgs,
    bashArgs: noArgs,
  },
  "validate-changelog": {
    scriptBase: "validate-changelog",
    psArgs: noArgs,
    bashArgs: noArgs,
  },
  "validate-manifest": {
    scriptBase: "validate-manifest",
    psArgs: (repositoryPath) => [
      "-ManifestPath",
      path.join(repositoryPath, "distribution", "agent-routines.manifest.json"),
    ],
    bashArgs: (repositoryPath) => [
      "--manifest-path",
      path.join(repositoryPath, "distribution", "agent-routines.manifest.json"),
    ],
  },
  "validate-install-discovery-config": {
    scriptBase: "validate-install-discovery-config",
    psArgs: (repositoryPath) => [
      "-ConfigPath",
      path.join(
        repositoryPath,
        "tools",
        "install-discovery.config.example.json",
      ),
    ],
    bashArgs: (repositoryPath) => [
      "--config-path",
      path.join(
        repositoryPath,
        "tools",
        "install-discovery.config.example.json",
      ),
    ],
  },
  "run-workflows": {
    scriptBase: "run-workflows",
    psArgs: noArgs,
    bashArgs: noArgs,
  },
};
