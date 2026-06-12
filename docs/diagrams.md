# Diagrams

## System Architecture

```mermaid
flowchart LR
  Repo[Source repository] --> Skills[Skills]
  Repo --> Workflows[Workflows]
  Repo --> Adapters[Adapters]
  Adapters --> UserTargets[User-level targets]
  Adapters --> ProjectTargets[Project-level targets]
```

## Skill Invocation Flowchart

```mermaid
flowchart TD
  A[User request] --> B[Select Skill]
  B --> C[Load references]
  C --> D[Identify risk gates]
  D --> E[Run workflows if useful]
  E --> F[Summarize outcome]
```

## Workflow Execution Flowchart

```mermaid
flowchart TD
  A[Start script] --> B[Parse args]
  B --> C[Run readonly checks]
  C --> D[Build JSON]
  D --> E[Exit with status]
```

## Review-Loop Sequence

```mermaid
sequenceDiagram
  participant User
  participant Agent
  participant Workflow
  User->>Agent: Review and fix until clean
  Agent->>Workflow: preflight and gate-check
  Agent->>Agent: Review latest diff
  Agent->>Agent: Patch issues
  Agent->>Workflow: Re-run gates
  Agent->>User: Findings and final state
```

## API-Sync Sequence

```mermaid
sequenceDiagram
  participant Agent
  participant Backend
  participant Frontend
  Agent->>Backend: Compare base, target, merge-base
  Backend-->>Agent: Contract changes
  Agent->>Frontend: Update wrappers, types, enums, UI
  Agent->>Agent: Validate and list exclusions
```

## DMS-Repair Sequence

```mermaid
sequenceDiagram
  participant Agent
  participant Readonly
  participant Human
  Agent->>Readonly: Confirm current state
  Agent->>Human: Provide minimal SQL for DMS
  Human-->>Agent: Confirms execution
  Agent->>Readonly: Post-check
  Agent->>Human: Evidence and residual risk
```

## Distribution Flowchart

```mermaid
flowchart TD
  A[Validate source] --> B{Install scope}
  B -->|User| C[Copy to user Skill and workflow paths]
  B -->|Project| D[Copy to project Skill and workflow paths]
  C --> E[Review installed content]
  D --> E
```

## Cross-Platform Runtime Selection

```mermaid
flowchart TD
  A[Need workflow] --> B{PowerShell available?}
  B -->|Yes| C[Run ps1]
  B -->|No| D{Bash available?}
  D -->|Yes| E[Run sh]
  D -->|No| F[Report missing runtime]
```