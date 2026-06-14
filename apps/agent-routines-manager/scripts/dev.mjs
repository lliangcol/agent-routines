import { spawn, spawnSync } from "node:child_process";
import { request } from "node:http";
import { createServer } from "node:net";

const isWindows = process.platform === "win32";
const npx = isWindows ? "npx.cmd" : "npx";
const devHost = "127.0.0.1";
const preferredDevPort = 5173;

const quoteWindowsShellArg = (value) => {
  if (/^[A-Za-z0-9_./:=+-]+$/.test(value)) {
    return value;
  }
  return `"${value.replaceAll('"', '""')}"`;
};

const getNpxInvocation = (args) => {
  if (!isWindows) {
    return { command: npx, args };
  }
  return {
    command: ["npx", ...args].map(quoteWindowsShellArg).join(" "),
    args: [],
  };
};

const spawnNpx = (args, options) => {
  const invocation = getNpxInvocation(args);
  return spawn(invocation.command, invocation.args, {
    ...options,
    shell: isWindows,
    windowsHide: isWindows,
  });
};

const spawnNpxSync = (args, options) => {
  const invocation = getNpxInvocation(args);
  return spawnSync(invocation.command, invocation.args, {
    ...options,
    shell: isWindows,
    windowsHide: isWindows,
  });
};

const buildMain = spawnNpxSync(["tsc", "-p", "tsconfig.main.json"], {
  stdio: "inherit",
});

if (buildMain.error) {
  console.error(`Failed to start TypeScript build: ${buildMain.error.message}`);
  process.exit(1);
}

if (buildMain.status !== 0) {
  process.exit(buildMain.status ?? 1);
}

const isPortAvailable = (port) =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", (error) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        resolve(false);
        return;
      }
      reject(error);
    });
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, devHost);
  });

const findAvailablePort = async (startPort) => {
  for (let port = startPort; port < startPort + 50; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available dev server port found from ${startPort}.`);
};

const devPort = await findAvailablePort(preferredDevPort);
const devServerUrl = `http://${devHost}:${devPort}`;

const vite = spawnNpx(
  ["vite", "--host", devHost, "--port", String(devPort), "--strictPort"],
  {
    stdio: "inherit",
  },
);

const waitForServer = (url, attempts = 80) =>
  new Promise((resolve, reject) => {
    let remaining = attempts;
    const tick = () => {
      const req = request(url, { method: "GET" }, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        remaining -= 1;
        if (remaining <= 0) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(tick, 250);
      });
      req.end();
    };
    tick();
  });

const cleanup = () => {
  vite.kill();
};

vite.on("error", (error) => {
  console.error(`Failed to start Vite dev server: ${error.message}`);
  process.exit(1);
});

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

try {
  await waitForServer(devServerUrl);
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}

const electron = spawnNpx(["electron", "."], {
  stdio: "inherit",
  env: {
    ...process.env,
    VITE_DEV_SERVER_URL: devServerUrl,
  },
});

electron.on("error", (error) => {
  console.error(`Failed to start Electron: ${error.message}`);
  cleanup();
  process.exit(1);
});

electron.on("exit", (code) => {
  cleanup();
  process.exit(code ?? 0);
});
