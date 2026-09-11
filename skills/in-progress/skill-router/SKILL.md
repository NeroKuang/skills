---
name: skill-router
description: Mandatory preflight router that discovers available skills, composes the smallest useful flow, rejects wrong alternatives, and locks a Skill Plan before execution.
---

# Skill Router

Use this before every non-trivial task.

The purpose is not to ask the human to remember skill names. The agent must discover and select the right skills itself.

## Inputs

Determine:

- task goal
- task mode or current phase
- working directory or repository context
- expected deliverable
- constraints
- allowed side effects
- available execution capabilities
- actor (`controller` or `executor`)
- active repository identity when known

If any of these are unknown, inspect available context first. Do not ask the human to select a skill.

## Runtime order (mandatory)

Deterministic filtering happens before any semantic `SKILL.md` comparison:

```text
scope resolution
  -> actor filtering
  -> capability filtering
  -> phase classification
  -> read surviving SKILL.md files
  -> primary Skill selection
  -> supporting Skill composition
```

Project-local Skills whose selectors do not match the active repository must be excluded during scope resolution. They must never enter the semantic candidate set.

Machine-readable helpers in this repository:

```bash
node scripts/build-skill-index.mjs
node scripts/validate-routing.mjs
node tests/routing/run-cases.mjs --demo
```

`routing.yaml` is routing metadata only. `SKILL.md` remains the behavioral source of truth.

## Step 1: Discover and scope-filter the available skill set

Do not route from memory alone.

Preferred discovery order:

1. Prefer the generated Skill index when present (`routing/generated/skill-index.json`).
2. Read first-party `routing.yaml` metadata and third-party lock/overlays when present.
3. Apply scope resolution first. Drop project-local mismatches immediately.
4. Inspect promoted skills under `skills/engineering` and `skills/productivity` that survive filtering.
5. Inspect relevant beta skills under `skills/in-progress` when the task may benefit from them.
6. Only then read surviving candidate `SKILL.md` files before final selection.

When running locally in this repository, use:

```bash
node scripts/skill-catalog.mjs
node scripts/build-skill-index.mjs
```

Use keyword filtering when useful:

```bash
node scripts/skill-catalog.mjs bug
node scripts/skill-catalog.mjs research
node scripts/skill-catalog.mjs deploy
```

The catalog is for discovery only. The selected skill's `SKILL.md` remains authoritative.
Never treat `~/.cursor/skills` or `~/.agents/skills` as canonical sources.

## Step 2: Filter by actor and capability

After scope resolution:

1. Remove Skills whose `actors` do not match the current actor.
2. Remove Skills whose required `capabilities` are impossible in the current environment.

Example: an Executor-only Skill that requires `terminal` must not remain a candidate for a Controller without terminal access.

## Step 3: Classify the current phase

Classify the task into one primary phase:

- `discover`: unclear problem, requirements, domain, or direction
- `research`: external knowledge is required before a decision
- `investigate`: failure exists and evidence or root cause is needed
- `design`: architecture, domain model, module shape, or specification is being decided
- `plan`: work must be decomposed into tickets or dependencies
- `implement`: expected behavior and scope are sufficiently defined
- `verify`: implementation or behavior must be proven
- `review`: diff, branch, PR, or implementation must be evaluated
- `operate`: deployment, migration, provisioning, or external side-effect operation
- `recover`: merge conflicts or interrupted repository state
- `teach`: learning is the primary goal

Only one phase should own the next action. Supporting skills may cover adjacent phases.

Keep only Skills whose declared `phases` include the active phase before semantic selection.

## Step 4: Generate semantic candidates

Generate a small candidate set from Skills that survived scope, actor, capability, and phase filters.

For each candidate record:

- why it matches
- what phase it owns
- what unique capability it contributes
- whether another candidate subsumes it

Do not select a skill merely because its name contains a matching word.
Do not spend reasoning budget comparing Skills already excluded by deterministic filters.

## Step 5: Choose the primary skill

Choose the skill that best owns the current phase and deliverable.

Rules:

- Prefer specific skills over broad ones.
- Prefer stateful repo-aware flows when a working directory exists and durable context matters.
- Prefer evidence-gathering skills before implementation when root cause is unknown.
- Prefer implementation skills only after behavior and acceptance criteria are clear enough.
- Prefer human-loop skills only when the executor truly cannot perform the required step itself.

## Step 6: Compose supporting skills

Add supporting skills only when each one contributes a distinct phase or control.

Good composition:

`diagnosing-bugs -> tdd -> code-review`

Bad composition:

loading `diagnosing-bugs`, `triage`, `research`, `prototype`, `implement`, and `tdd` just because they may all touch engineering.

Use `routing/flows.yaml` as the curated graph of common edges and forbidden shortcuts.

## Step 7: Reject plausible alternatives

The router must explicitly state at least the strongest rejected alternative when ambiguity exists.

Example:

```text
Rejected: triage
Reason: this is a bug we are actively debugging, not an incoming unprocessed issue.
```

This makes routing decisions auditable and helps improve the routing map over time.

## Step 8: Produce the Skill Plan

Use this compact output:

```text
SKILL PLAN
Phase: <phase>
Primary: <skill>
Supporting: <ordered skills or none>
Execution order: <skill -> skill -> ...>
Rejected: <skill: reason, or none>
Re-route when: <phase boundary or evidence condition>
Framework-Ref: <commit SHA, tag, or branch when available>
```

For GitHub-controlled work, persist this plan in the issue before execution.

## Step 9: Re-route at phase boundaries

Routing is repeated when the nature of the task changes.

Examples:

- diagnosing a bug discovers an architecture seam problem
- research produces enough information to start specification
- prototype answers the design question
- implementation is complete and enters review
- review approves a change and deployment becomes the next action

Do not force the original skill plan onto a new phase.

## Controller behavior

When acting as Controller:

1. Run this router before creating an executor task.
2. Read every selected skill's `SKILL.md`.
3. Encode the Skill Plan, scope, acceptance criteria, and required evidence in the task contract.
4. Route uncertain implementation questions to Cursor as evidence-gathering tasks rather than guessing about the local environment.

## Executor behavior

When acting as Executor:

1. Read the Controller's Skill Plan.
2. Run this router again against the actual repository and available tools.
3. Read all selected skill files before execution.
4. If the local routing differs materially, report the proposed refinement with evidence.
5. Do not silently change the goal, scope, or acceptance criteria.

## Routing failure

If no existing skill fits well:

```text
STATUS: SKILL_GAP
Task phase: ...
Closest skills: ...
Missing capability: ...
Recommended action: create or extend a skill
```

Do not force an unrelated skill to fit.

A recurring `SKILL_GAP` is evidence that the shared Skills repository needs a new skill or a routing update.
