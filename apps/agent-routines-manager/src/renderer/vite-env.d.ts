/// <reference types="vite/client" />

import type { AgentRoutinesApi } from "../shared/contracts.js";

declare global {
  interface Window {
    agentRoutines?: AgentRoutinesApi;
  }
}
