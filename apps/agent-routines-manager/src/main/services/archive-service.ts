import fs from "node:fs";
import path from "node:path";

import type { ArchiveWriteResult, TaskRecord } from "../../shared/contracts.js";
import { toDisplayPath } from "../path-utils.js";
import { TaskQueue } from "../task-queue.js";

export class ArchiveService {
  public constructor(
    private readonly repositoryPath: string,
    private readonly taskQueue: TaskQueue,
  ) {}

  public async write(
    taskId: string,
    includePlan: boolean,
  ): Promise<ArchiveWriteResult> {
    const sourceTask = this.taskQueue.list().find((task) => task.id === taskId);
    if (!sourceTask) {
      const task = this.taskQueue.recordBlocked(
        "archive.write",
        "tasks.archiveWrite",
        `Task not found for archive request: ${taskId}`,
      );
      return { task };
    }

    const now = new Date();
    const stamp = archiveStamp(now);
    const archivePath = path.join(
      this.repositoryPath,
      "executions",
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, "0"),
      `${stamp}-agent-routines-manager`,
    );
    await fs.promises.mkdir(path.join(archivePath, "evidence"), {
      recursive: true,
    });
    await fs.promises.mkdir(path.join(archivePath, "artifacts"), {
      recursive: true,
    });
    await fs.promises.writeFile(
      path.join(archivePath, "README.md"),
      `# Agent Routines Manager Execution\n\nTask: ${sourceTask.titleKey}\n\nState: ${sourceTask.state}\n`,
      "utf8",
    );
    await fs.promises.writeFile(
      path.join(archivePath, "result.md"),
      `# Result\n\n- Task ID: ${sourceTask.id}\n- State: ${sourceTask.state}\n- Exit code: ${sourceTask.exitCode ?? "n/a"}\n`,
      "utf8",
    );
    await fs.promises.writeFile(
      path.join(archivePath, "evidence", "commands.md"),
      formatTaskEvidence(sourceTask),
      "utf8",
    );
    if (includePlan && sourceTask.stdout) {
      await fs.promises.writeFile(
        path.join(archivePath, "artifacts", "plan.json"),
        sourceTask.stdout,
        "utf8",
      );
    }

    const completedAt = new Date().toISOString();
    const task: TaskRecord = {
      id: `archive-${Date.now()}`,
      commandId: "archive.write",
      state: "succeeded",
      startedAt: completedAt,
      endedAt: completedAt,
      exitCode: 0,
      cwd: this.repositoryPath,
      argv: ["archive.write", archivePath],
      titleKey: "tasks.archiveWrite",
      stdout: archivePath,
      stderr: "",
      cancelable: false,
    };
    return { task, archivePath: toDisplayPath(archivePath) };
  }
}

function archiveStamp(value: Date): string {
  const pad = (input: number) => String(input).padStart(2, "0");
  const tz = -value.getTimezoneOffset();
  const sign = tz >= 0 ? "+" : "-";
  const tzHours = pad(Math.floor(Math.abs(tz) / 60));
  const tzMinutes = pad(Math.abs(tz) % 60);
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(
    value.getHours(),
  )}${pad(value.getMinutes())}${sign}${tzHours}${tzMinutes}`;
}

function formatTaskEvidence(task: TaskRecord): string {
  const argv = task.argv
    .map((arg) => `\`${arg.replace(/`/g, "\\`")}\``)
    .join(" ");
  return `# Command Evidence\n\n- Command: ${argv}\n- CWD: \`${task.cwd}\`\n- State: ${task.state}\n- Exit code: ${
    task.exitCode ?? "n/a"
  }\n\n## stdout\n\n\`\`\`text\n${task.stdout ?? ""}\n\`\`\`\n\n## stderr\n\n\`\`\`text\n${
    task.stderr ?? ""
  }\n\`\`\`\n`;
}
