import { EventEmitter } from "node:events";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";

import type { CommandEvidence, TaskRecord } from "../shared/contracts.js";
import type { CommandSpec } from "./command-registry.js";

export class TaskQueue extends EventEmitter {
  private readonly tasks: TaskRecord[] = [];
  private readonly processes = new Map<
    string,
    ChildProcessWithoutNullStreams
  >();
  private tail: Promise<unknown> = Promise.resolve();

  public list(): TaskRecord[] {
    return [...this.tasks];
  }

  public run(spec: CommandSpec): Promise<TaskRecord> {
    const run = () => this.execute(spec);
    const queued = this.tail.then(run, run);
    this.tail = queued.catch(() => undefined);
    return queued;
  }

  public recordBlocked(
    commandId: TaskRecord["commandId"],
    titleKey: string,
    message: string,
  ): TaskRecord {
    const now = new Date().toISOString();
    const task: TaskRecord = {
      id: randomUUID(),
      commandId,
      state: "failed",
      startedAt: now,
      endedAt: now,
      exitCode: 1,
      cwd: "",
      argv: [],
      titleKey,
      stdout: "",
      stderr: message,
      cancelable: false,
    };
    this.tasks.unshift(task);
    this.emit("changed", task);
    return task;
  }

  public cancel(taskId: string): TaskRecord {
    const task = this.tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const child = this.processes.get(taskId);
    if (!child) {
      return task;
    }

    child.kill();
    task.state = "canceled";
    task.endedAt = new Date().toISOString();
    task.cancelable = false;
    this.emit("changed", task);
    return task;
  }

  private execute(spec: CommandSpec): Promise<TaskRecord> {
    const id = randomUUID();
    const startedAt = new Date();
    const task: TaskRecord = {
      id,
      commandId: spec.commandId,
      state: "running",
      startedAt: startedAt.toISOString(),
      cwd: spec.cwd,
      argv: [spec.executable, ...spec.args],
      titleKey: spec.titleKey,
      cancelable: true,
    };
    this.tasks.unshift(task);
    this.emit("changed", task);

    return new Promise<TaskRecord>((resolve) => {
      let stdout = "";
      let stderr = "";
      const child = spawn(spec.executable, spec.args, {
        cwd: spec.cwd,
        shell: false,
        windowsHide: true,
      });
      this.processes.set(id, child);

      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
        task.stdout = redact(stdout);
        this.emit("changed", task);
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
        task.stderr = redact(stderr);
        this.emit("changed", task);
      });
      child.on("error", (error) => {
        stderr += error.message;
      });
      child.on("close", (exitCode) => {
        this.processes.delete(id);
        const endedAt = new Date();
        const canceled = task.state === "canceled";
        const evidence: CommandEvidence = {
          commandId: spec.commandId,
          executable: spec.executable,
          args: spec.args,
          cwd: spec.cwd,
          shell: spec.shell,
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationMs: endedAt.getTime() - startedAt.getTime(),
          exitCode,
          stdout: redact(stdout),
          stderr: redact(stderr),
          canceled,
        };
        task.state = canceled
          ? "canceled"
          : exitCode === 0
            ? "succeeded"
            : "failed";
        task.endedAt = endedAt.toISOString();
        task.exitCode = exitCode;
        task.stdout = evidence.stdout;
        task.stderr = evidence.stderr;
        task.evidence = evidence;
        task.cancelable = false;
        this.emit("changed", task);
        resolve(task);
      });
    });
  }
}

function redact(value: string): string {
  return value
    .replace(/(token|secret|password|api[_-]?key)=([^\s]+)/gi, "$1=[redacted]")
    .replace(/(Authorization:\s*Bearer\s+)([^\s]+)/gi, "$1[redacted]");
}
