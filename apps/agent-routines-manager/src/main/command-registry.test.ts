import path from "node:path";
import { describe, expect, it } from "vitest";

import { CommandRegistry } from "./command-registry.js";

describe("CommandRegistry", () => {
  const repositoryPath = path.resolve("..", "..");
  const registry = new CommandRegistry(repositoryPath);

  it("builds install config validation without shell string concatenation", () => {
    const spec = registry.buildValidateInstallConfig({
      configPath: "tools/install-discovery.config.example.json",
    });
    expect(spec.commandId).toBe("validateInstallConfig");
    expect(spec.args).toContain(
      path.join(
        repositoryPath,
        "tools",
        "install-discovery.config.example.json",
      ),
    );
    expect(spec.args.join(" ")).not.toContain("&&");
  });

  it("rejects config paths outside the reviewed repository", () => {
    expect(() =>
      registry.buildGenerateInstallPlan({
        configPath: path.resolve(repositoryPath, "..", "outside.json"),
      }),
    ).toThrow(/outside/);
  });

  it("passes the reviewed manifest digest into apply commands", () => {
    const digest = "a".repeat(64);
    const spec = registry.buildApplyDistribution({
      configPath: "tools/install-discovery.config.example.json",
      confirmed: true,
      mode: "merge",
      confirmationText: "APPLY",
      manifestDigest: digest,
    });

    expect(spec.commandId).toBe("applyDistribution");
    expect(spec.args).toContain(digest);
    expect(spec.args.join(" ")).toMatch(
      /ExpectedManifestDigest|expected-manifest-digest/,
    );
  });
});
