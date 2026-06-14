import { spawn } from "node:child_process";

import type {
  DiagnosticCheck,
  DiagnosticReasonKey,
  DiagnosticsResult,
} from "../../shared/contracts.js";
import { getPlatformKind } from "../path-utils.js";

export class DiagnosticsService {
  public constructor(private readonly repositoryPath: string) {}

  public async run(): Promise<DiagnosticsResult> {
    const checks: DiagnosticCheck[] = [];
    const commands: DiagnosticProbe[] = [
      commandProbe("git", "git", ["--version"]),
      commandProbe("node", "node", ["--version"]),
      npmProbe(),
      commandProbe(
        "powershell",
        process.platform === "win32" ? "powershell.exe" : "pwsh",
        ["-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"],
      ),
      commandProbe("bash", "bash", ["--version"], true),
      commandProbe("python", "python", ["--version"]),
      commandProbe("python3", "python3", ["--version"], true),
    ];

    for (const probe of commands) {
      const result = await runProbe(probe, this.repositoryPath);
      checks.push({
        id: probe.id,
        labelKey: `diagnostics.${probe.id}`,
        status: result.ok ? "ok" : probe.optional ? "warning" : "failed",
        detail: result.output,
        reasonKey: result.reasonKey,
        command: probe.displayCommand,
      });
    }

    const shMode = await runProbe(
      commandProbe("git", "git", ["ls-files", "--stage", "--", "*.sh"]),
      this.repositoryPath,
    );
    const nonExecutable = shMode.output
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => !line.startsWith("100755"));
    checks.push({
      id: "sh-executable-bit",
      labelKey: "diagnostics.executableBit",
      status: shMode.ok && nonExecutable.length === 0 ? "ok" : "warning",
      detail:
        shMode.ok && nonExecutable.length === 0
          ? "All tracked .sh files have executable bit in the git index."
          : nonExecutable.slice(0, 8).join("\n") || shMode.output,
      reasonKey: shMode.reasonKey,
      command: ["git", "ls-files", "--stage", "--", "*.sh"],
    });

    return {
      platform: getPlatformKind(),
      repositoryPath: this.repositoryPath,
      checkedAt: new Date().toISOString(),
      checks,
    };
  }
}

interface DiagnosticProbe {
  id: string;
  executable: string;
  args: string[];
  displayCommand: string[];
  optional?: boolean;
  targetCommand?: string;
}

interface ProbeResult {
  ok: boolean;
  output: string;
  reasonKey?: DiagnosticReasonKey;
}

function commandProbe(
  id: string,
  executable: string,
  args: string[],
  optional = false,
): DiagnosticProbe {
  return {
    id,
    executable,
    args,
    displayCommand: [id, ...args],
    optional,
    targetCommand: id,
  };
}

function npmProbe(): DiagnosticProbe {
  if (process.platform !== "win32") {
    return commandProbe("npm", "npm", ["--version"]);
  }
  return {
    id: "npm",
    executable: "cmd.exe",
    args: ["/d", "/s", "/c", "npm --version"],
    displayCommand: ["npm", "--version"],
    targetCommand: "npm",
  };
}

function runProbe(probe: DiagnosticProbe, cwd: string): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const child = spawn(probe.executable, probe.args, {
      cwd,
      shell: false,
      windowsHide: true,
    });
    let output = "";
    let reasonKey: DiagnosticReasonKey | undefined;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      reasonKey = "diagnostics.reason.timedOut";
      child.kill();
    }, 5_000);

    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      output += error.message;
      reasonKey = classifySpawnError(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (!reasonKey && code !== 0) {
        reasonKey = classifyExitFailure(probe, output, timedOut);
      }
      resolve({
        ok: code === 0,
        output: output.trim() || `exit code ${code ?? "unknown"}`,
        reasonKey,
      });
    });
  });
}

function classifySpawnError(error: Error): DiagnosticReasonKey {
  if (isNodeError(error) && error.code === "ENOENT") {
    return hasPathValue()
      ? "diagnostics.reason.commandNotFound"
      : "diagnostics.reason.pathUnavailable";
  }
  return "diagnostics.reason.commandFailed";
}

function classifyExitFailure(
  probe: DiagnosticProbe,
  output: string,
  timedOut: boolean,
): DiagnosticReasonKey {
  if (timedOut) {
    return "diagnostics.reason.timedOut";
  }
  if (!hasPathValue()) {
    return "diagnostics.reason.pathUnavailable";
  }
  if (
    probe.targetCommand &&
    new RegExp(
      `(?:${escapeRegExp(probe.targetCommand)}[^\\r\\n]*(?:not recognized|not found)|command not found)`,
      "i",
    ).test(output)
  ) {
    return "diagnostics.reason.commandNotFound";
  }
  return "diagnostics.reason.commandFailed";
}

function hasPathValue(): boolean {
  return Boolean(process.env.PATH || process.env.Path);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
