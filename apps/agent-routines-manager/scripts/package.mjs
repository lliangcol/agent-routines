import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const args = process.argv.slice(2);

const hasElectronDistOverride = args.some(
  (arg) =>
    arg === "--config.electronDist" || arg.startsWith("--config.electronDist="),
);

const localElectronDist = path.join(
  appRoot,
  "node_modules",
  "electron",
  "dist",
);
const localElectronBinary = path.join(localElectronDist, "electron.exe");

if (
  process.platform === "win32" &&
  process.arch === "x64" &&
  !hasElectronDistOverride &&
  existsSync(localElectronBinary)
) {
  args.push("--config.electronDist=node_modules/electron/dist");
}

const electronBuilderCli = path.join(
  appRoot,
  "node_modules",
  "electron-builder",
  "cli.js",
);
const child = spawn(process.execPath, [electronBuilderCli, ...args], {
  cwd: appRoot,
  stdio: "inherit",
  windowsHide: process.platform === "win32",
});

child.on("error", (error) => {
  console.error(`Failed to start electron-builder: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`electron-builder exited with signal ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 0);
});
