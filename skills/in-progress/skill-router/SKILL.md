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

If any of these are unknown, inspect available context first. Do not ask the human to select a skill.

## Step 1: Discover the available skill set

Do not route from memory alone.

Preferred discovery order:

1. Read the repository skill catalog if present.
2. Inspect promoted skills under `skills/engineering` and `skills/productivity`.
3. Inspect relevant beta skills under `skills/in-progress` when the task may benefit from them.
4. Read the candidate `SKILL.md` files before final selection.

When running locally in this repository, use:

```bash
node scripts/skill-catalog.mjs
```

Use keyword filtering when useful:

```bash
node scripts/skill-catalog.mjs bug
node scripts/skill-catalog.mjs research
node scripts/skill-catalog.mjs deploy
```

The catalog is for discovery only. The selected skill's `SKILL.md` remains authoritative.

## Step 2: Classify the current phase

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

## Step 3: Generate candidates

Generate a small candidate set from actual discovered skills.

For each candidate record:

- why it matches
- what phase it owns
- what unique capability it contributes
- whether another candidate subsumes it

Do not select a skill merely because its name contains a matching word.

## Step 4: Choose the primary skill

Choose the skill that best owns the current phase and deliverable.

Rules:

- Prefer specific skills over broad ones.
- Prefer stateful repo-aware flows when a working directory exists and durable context matters.
- Prefer evidence-gathering skills before implementation when root cause is unknown.
- Prefer implementation skills only after behavior and acceptance criteria are clear enough.
- Prefer human-loop skills only when the executor truly cannot perform the required step itself.

## Step 5: Compose supporting skills

Add supporting skills only when each one contributes a distinct phase or control.

Good composition:

`diagnosing-bugs -> tdd -> code-review`

Bad composition:

loading `diagnosing-bugs`, `triage`, `research`, `prototype`, `implement`, and `tdd` just because they may all touch engineering.

Use `routing/flows.yaml` as the curated graph of common edges and forbidden shortcuts.

## Step 6: Reject plausible alternatives

The router must explicitly state at least the strongest rejected alternative when ambiguity exists.

Example:

```text
Rejected: triage
Reason: this is a bug we are actively debugging, not an incoming unprocessed issue.
```

This makes routing decisions auditable and helps improve the routing map over time.

## Step 7: Produce the Skill Plan

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

## Step 8: Re-route at phase boundaries

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
