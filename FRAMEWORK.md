# Nero AI Engineering Framework

This repository is the canonical source of truth for shared AI Skills, Rules, routing logic, and execution protocol used by ChatGPT and Cursor.

## Core model

There is one project control plane and one execution plane.

- ChatGPT acts as Controller: requirement analysis, decomposition, scope, architecture decisions, acceptance criteria, prioritization, risk analysis, review, and next-step decisions.
- Cursor acts as Executor: codebase inspection, terminal commands, HTTP calls, logs, tests, builds, implementation, deployment when explicitly authorized, and evidence collection.
- GitHub acts as Shared State: issues are task contracts, pull requests are implementation and review surfaces, and commits are durable execution history.

Cursor may recommend technical options. It must not silently redefine requirements, expand scope, or make irreversible product or architecture decisions that belong to the Controller.

## Mandatory Skill Preflight

No non-trivial task starts with execution.

Before planning or execution, the active agent must perform Skill Preflight:

1. Identify the task intent, current phase, constraints, required tools, and expected output.
2. Discover the available skills instead of relying on memory.
3. Select one primary skill when possible.
4. Select supporting skills only when they add a distinct capability or phase.
5. Determine execution order and handoff boundaries.
6. Explicitly reject plausible but incorrect alternatives.
7. Lock the Skill Plan before implementation, mutation, deployment, or destructive operations.

The canonical routing procedure lives in `skills/in-progress/skill-router/SKILL.md`.

## Skill composition

A task may require more than one skill. Skills are composed by phase, not by loading everything that looks related.

Typical composition pattern:

`discover -> investigate -> decide -> implement -> verify -> review -> operate`

Examples:

- Hard bug: `diagnosing-bugs -> tdd -> code-review`
- Unclear feature: `grill-with-docs -> to-spec -> to-tickets -> implement`
- Architecture problem found during debugging: `diagnosing-bugs -> improve-codebase-architecture -> grill-with-docs`
- External knowledge needed before design: `research -> grill-with-docs -> to-spec`

Curated composition edges live in `routing/flows.yaml`.

## Shared Rules synchronization

ChatGPT and Cursor must use the same repository revision for Skills and Rules whenever they cooperate on a task.

For every GitHub task contract, the Controller should record:

```text
Framework-Repo: NeroKuang/skills
Framework-Ref: <git commit SHA, tag, or branch>
Skill-Plan:
  Primary: <skill>
  Supporting: <ordered skills or none>
```

### Controller sync contract

Before creating or materially revising an execution task, ChatGPT must:

1. Read this file.
2. Read the applicable files under `rules/`.
3. Read `skills/in-progress/skill-router/SKILL.md`.
4. Inspect the relevant skill files selected by the router.
5. Use the current GitHub revision as the task's `Framework-Ref`.

The Controller must not choose a skill only from memory when the repository can be inspected.

### Executor sync contract

Before executing a task, Cursor must:

1. Read the task's `Framework-Ref` and `Skill-Plan`.
2. Ensure the local Skills checkout or installed skill set corresponds to that revision.
3. Run Skill Preflight again against the actual local codebase and capabilities.
4. Report any mismatch between the Controller's plan and the execution environment.
5. Stop and report `STATUS: BLOCKED` when a material mismatch could change the implementation strategy.

The Executor may refine the supporting skill list when local evidence shows a better composition, but it must report the change and rationale. It must not change the task goal, scope, or acceptance criteria without Controller approval.

## Drift prevention

Any change that adds, removes, renames, or materially changes a skill must trigger a routing review.

At minimum, review:

- `skills/in-progress/skill-router/SKILL.md`
- `routing/flows.yaml`
- applicable files under `rules/`
- `ask-matt` when the user-facing flow map changes

A router that does not know about a reachable skill is considered stale.

## Evidence first

Execution reports must distinguish observation from inference.

Preferred evidence includes:

- file paths and relevant lines
- commands executed
- test output summaries
- HTTP method, endpoint class, status code, and redacted response summary
- log excerpts with secrets removed
- database query result summaries
- commit and pull request references

Never put credentials, tokens, cookies, private keys, or unredacted secrets in issues, pull requests, comments, or committed files.

## Human commands

The desired interaction is intentionally short.

Controller side:

```text
Create a task for this problem.
Review issue #N.
Review PR #N.
Decide from the evidence in issue #N.
```

Executor side:

```text
Execute issue #N.
Continue issue #N after the Controller decision.
Address the latest review on PR #N.
```

The detailed context belongs in GitHub and this repository, not in repeated copy and paste between AI clients.
