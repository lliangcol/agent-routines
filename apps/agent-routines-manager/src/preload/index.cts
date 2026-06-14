import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

import type {
  AgentRoutinesApi,
  AppSettings,
  ArchiveWriteRequest,
  ConfigSaveAsRequest,
  ConfigPathRequest,
  ConfirmedConfigPathRequest,
  DocOpenRequest,
  PickDirectoryRequest,
  PickFileRequest,
  RunGateRequest,
  TaskRecord,
} from "../shared/contracts.js";

const api: AgentRoutinesApi = {
  app: {
    onSearch: (listener: () => void) => {
      const handler = () => listener();
      ipcRenderer.on("app.search", handler);
      return () => ipcRenderer.removeListener("app.search", handler);
    },
  },
  settings: {
    get: () => ipcRenderer.invoke("settings.get") as Promise<AppSettings>,
    update: (settings) =>
      ipcRenderer.invoke("settings.update", settings) as Promise<AppSettings>,
  },
  inventory: {
    scan: () => ipcRenderer.invoke("inventory.scan"),
    matrix: () => ipcRenderer.invoke("inventory.matrix"),
  },
  installConfig: {
    open: (request: PickFileRequest) =>
      ipcRenderer.invoke("installConfig.open", request),
    read: (request: ConfigPathRequest) =>
      ipcRenderer.invoke("installConfig.read", request),
    validateDraft: (config) =>
      ipcRenderer.invoke("installConfig.validateDraft", config),
    validate: (request: ConfigPathRequest) =>
      ipcRenderer.invoke("installConfig.validate", request),
    saveAs: (request: ConfigSaveAsRequest) =>
      ipcRenderer.invoke("installConfig.saveAs", request),
  },
  plan: {
    generate: (request: ConfigPathRequest) =>
      ipcRenderer.invoke("plan.generate", request),
  },
  manifest: {
    write: (request: ConfirmedConfigPathRequest) =>
      ipcRenderer.invoke("manifest.write", request),
  },
  distribution: {
    apply: (request) => ipcRenderer.invoke("distribution.apply", request),
  },
  validation: {
    listGates: () => ipcRenderer.invoke("validation.listGates"),
    runGate: (request: RunGateRequest) =>
      ipcRenderer.invoke("validation.runGate", request),
  },
  diagnostics: {
    run: () => ipcRenderer.invoke("diagnostics.run"),
  },
  tasks: {
    list: () => ipcRenderer.invoke("tasks.list"),
    cancel: (taskId: string) => ipcRenderer.invoke("tasks.cancel", { taskId }),
    subscribe: (listener: (task: TaskRecord) => void) => {
      const handler = (_event: IpcRendererEvent, task: TaskRecord) =>
        listener(task);
      ipcRenderer.on("tasks.changed", handler);
      return () => ipcRenderer.removeListener("tasks.changed", handler);
    },
  },
  archive: {
    write: (request: ArchiveWriteRequest) =>
      ipcRenderer.invoke("archive.write", request),
  },
  dialogs: {
    pickFile: (request: PickFileRequest) =>
      ipcRenderer.invoke("dialogs.pickFile", request),
    pickDirectory: (request: PickDirectoryRequest) =>
      ipcRenderer.invoke("dialogs.pickDirectory", request),
  },
  docs: {
    list: () => ipcRenderer.invoke("docs.list"),
    open: (request: DocOpenRequest) => ipcRenderer.invoke("docs.open", request),
  },
};

contextBridge.exposeInMainWorld("agentRoutines", api);
