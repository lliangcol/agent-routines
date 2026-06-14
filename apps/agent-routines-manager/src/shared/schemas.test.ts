import { describe, expect, it } from "vitest";

import {
  applyDistributionRequestSchema,
  runGateRequestSchema,
} from "./schemas.js";

describe("shared IPC schemas", () => {
  it("rejects unknown validation gates", () => {
    expect(() =>
      runGateRequestSchema.parse({
        gateId: "delete-targets",
        shell: "powershell",
      }),
    ).toThrow();
  });

  it("requires explicit confirmation before apply", () => {
    expect(() =>
      applyDistributionRequestSchema.parse({
        configPath: "tools/install-discovery.config.example.json",
        confirmed: false,
      }),
    ).toThrow();
  });
});
