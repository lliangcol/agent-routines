import type { ValidationGate } from "../../shared/contracts.js";
import { gateIds } from "../../shared/contracts.js";
import { CommandRegistry } from "../command-registry.js";

export class ValidationService {
  private readonly registry: CommandRegistry;

  public constructor(repositoryPath: string) {
    this.registry = new CommandRegistry(repositoryPath);
  }

  public listGates(): ValidationGate[] {
    return gateIds.flatMap((gateId) => {
      const powershell = this.registry.buildRunRepositoryGate({
        gateId,
        shell: "powershell",
      });
      const bash = this.registry.buildRunRepositoryGate({
        gateId,
        shell: "bash",
      });
      return [
        {
          id: gateId,
          labelKey: `validation.gates.${gateId}`,
          shell: "powershell",
          commandPreview: [powershell.executable, ...powershell.args],
        },
        {
          id: gateId,
          labelKey: `validation.gates.${gateId}`,
          shell: "bash",
          commandPreview: [bash.executable, ...bash.args],
        },
      ];
    });
  }
}
