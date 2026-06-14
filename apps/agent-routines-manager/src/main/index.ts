import { app, BrowserWindow, Menu, nativeTheme, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { LanguageCode } from "../shared/contracts.js";
import { registerIpc } from "./ipc.js";
import { SettingsStore } from "./services/settings-store.js";
import { TaskQueue } from "./task-queue.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDevelopment = Boolean(process.env.VITE_DEV_SERVER_URL);
const userDataDir = process.env.AGENT_ROUTINES_MANAGER_USER_DATA_DIR;
if (userDataDir) {
  app.setPath("userData", path.resolve(userDataDir));
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
}

const settingsStore = new SettingsStore();
const taskQueue = new TaskQueue();

async function createWindow(): Promise<void> {
  const settings = await settingsStore.get();
  nativeTheme.themeSource = settings.theme;

  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    title: "Agent Routines Manager",
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const parsed = parseUrl(url);
    if (parsed?.protocol === "https:" || parsed?.protocol === "http:") {
      void shell.openExternal(parsed.toString());
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isAllowedDevNavigation(url)) {
      return;
    }
    event.preventDefault();
  });

  if (isDevelopment && process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(
      path.join(__dirname, "..", "renderer", "index.html"),
    );
  }
}

interface MenuLabels {
  app: string;
  about: string;
  quit: string;
  edit: string;
  undo: string;
  redo: string;
  cut: string;
  copy: string;
  paste: string;
  view: string;
  reload: string;
  toggleDevTools: string;
  resetZoom: string;
  zoomIn: string;
  zoomOut: string;
  help: string;
  search: string;
}

const menuLabels: Record<LanguageCode, MenuLabels> = {
  en: {
    app: "App",
    about: "About Agent Routines Manager",
    quit: "Quit",
    edit: "Edit",
    undo: "Undo",
    redo: "Redo",
    cut: "Cut",
    copy: "Copy",
    paste: "Paste",
    view: "View",
    reload: "Reload",
    toggleDevTools: "Toggle Developer Tools",
    resetZoom: "Reset Zoom",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    help: "Help",
    search: "Search",
  },
  "zh-CN": {
    app: "应用",
    about: "关于 Agent Routines Manager",
    quit: "退出",
    edit: "编辑",
    undo: "撤销",
    redo: "重做",
    cut: "剪切",
    copy: "复制",
    paste: "粘贴",
    view: "视图",
    reload: "重新加载",
    toggleDevTools: "切换开发者工具",
    resetZoom: "重置缩放",
    zoomIn: "放大",
    zoomOut: "缩小",
    help: "帮助",
    search: "搜索",
  },
};

function installMenu(language: LanguageCode): void {
  const modifier = process.platform === "darwin" ? "Command" : "Ctrl";
  const labels = menuLabels[language];
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: labels.app,
      submenu: [
        { role: "about", label: labels.about },
        { type: "separator" },
        {
          role: process.platform === "darwin" ? "close" : "quit",
          label: labels.quit,
        },
      ],
    },
    {
      label: labels.edit,
      submenu: [
        { role: "undo", label: labels.undo },
        { role: "redo", label: labels.redo },
        { type: "separator" },
        { role: "cut", label: labels.cut },
        { role: "copy", label: labels.copy },
        { role: "paste", label: labels.paste },
      ],
    },
    {
      label: labels.view,
      submenu: [
        { role: "reload", label: labels.reload },
        { role: "toggleDevTools", label: labels.toggleDevTools },
        { type: "separator" },
        { role: "resetZoom", label: labels.resetZoom },
        { role: "zoomIn", label: labels.zoomIn },
        { role: "zoomOut", label: labels.zoomOut },
      ],
    },
    {
      label: labels.help,
      submenu: [
        {
          label: labels.search,
          accelerator: `${modifier}+K`,
          click: sendSearchToFocusedWindow,
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function sendSearchToFocusedWindow(): void {
  const target = getTargetWindow();
  target?.webContents.send("app.search");
}

function getTargetWindow(): BrowserWindow | undefined {
  return (
    BrowserWindow.getFocusedWindow() ??
    BrowserWindow.getAllWindows().find((window) => !window.isDestroyed())
  );
}

function focusMainWindow(): void {
  const target = getTargetWindow();
  if (!target) {
    return;
  }

  if (target.isMinimized()) {
    target.restore();
  }
  target.show();
  target.focus();
}

if (hasSingleInstanceLock) {
  app.on("second-instance", focusMainWindow);

  app.on("web-contents-created", (_event, contents) => {
    contents.on("will-attach-webview", (event) => {
      event.preventDefault();
    });
  });

  app.whenReady().then(async () => {
    registerIpc(settingsStore, taskQueue, (settings) =>
      installMenu(settings.language),
    );
    const settings = await settingsStore.get();
    installMenu(settings.language);
    await createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}

function parseUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function isAllowedDevNavigation(url: string): boolean {
  const allowedDevUrl = process.env.VITE_DEV_SERVER_URL;
  if (!allowedDevUrl) {
    return false;
  }
  const target = parseUrl(url);
  const allowed = parseUrl(allowedDevUrl);
  return Boolean(target && allowed && target.origin === allowed.origin);
}
