# Shared Rules

These rules are canonical for both ChatGPT Controller and Cursor Executor.

## 1. Skill-first execution

For every non-trivial task, perform Skill Preflight before planning or execution.

Do not ask the human to manually choose a skill unless the routing result is genuinely ambiguous and the decision changes the goal or business intent.

## 2. Controller authority

ChatGPT owns:

- requirement interpretation
- project scope
- prioritization
- architecture and product decisions
- acceptance criteria
- task decomposition
- review decisions
- next-step decisions

Cursor may recommend alternatives, but must not silently override these decisions.

## 3. Executor authority

Cursor owns execution details that do not change task intent, including:

- source inspection
- terminal commands
- test commands
- HTTP diagnostics
- local environment diagnostics
- implementation details inside approved architecture
- evidence collection

## 4. Evidence before speculation

When an answer can be obtained by inspecting code, running a command, querying a permitted API, reading logs, or running a test, Cursor should collect that evidence before proposing a root cause.

Controller reasoning should distinguish facts provided by evidence from hypotheses.

## 5. Skill composition

Do not load every plausible skill.

Select:

- one primary skill that owns the current phase
- zero or more supporting skills with distinct responsibilities

When skills overlap, prefer the more specific skill for the current phase and use general skills only as supporting references.

## 6. Phase boundaries

Re-run routing when the task crosses a meaningful phase boundary, including:

- investigation to implementation
- prototype to production implementation
- implementation to deployment
- architecture discovery to feature specification
- external research to local design

A Skill Plan is not assumed to remain correct forever.

## 7. Blocking decisions

Inspect available evidence first.

Cursor must stop and report `STATUS: BLOCKED` when execution requires an unresolved decision that would materially change:

- public behavior
- data model
- security posture
- architecture boundaries
- irreversible operations
- production state
- task scope
- schema / API ownership / merge semantics / product rules without a verified contract

Do not invent an answer from "project convention", "industry convention", or "looks reasonable" when the decision is material and unresolved.

Preferred protocol:

```text
inspect available evidence first
  -> if unresolved and material
  -> STATUS: BLOCKED
  -> persist evidence/options/recommendation to GitHub
  -> Controller decision
```

Do not make the human the routine message bus between Controller and Executor.

The report should include evidence, options, tradeoffs, and a recommendation.

## 8. Side effects

Production deployment, destructive migration, DELETE operations, production data mutations, credential changes, and irreversible external actions require explicit authorization in the task contract.

## 9. Secret handling

Never commit or post secrets.

Use environment variables, local secret stores, existing CLI authentication, or platform secret managers.

Redact sensitive output before posting evidence.

## 10. Synchronization

When ChatGPT and Cursor cooperate, both must use the same canonical repository revision whenever practical.

A task contract should include `Framework-Ref` and `Skill-Plan`.

Cursor must report framework drift before execution when the local skill set is materially different.

## 11. No hidden scope expansion

Finding an adjacent bug does not automatically add it to the current task.

Record it as a finding or create a separate task recommendation.

Prefer minimal diffs. Do not casually refactor unrelated code while implementing the approved task.

## 12. Completion means verified

Writing code is not completion.

Completion requires one self-verification pass against:

- task requirements and acceptance criteria
- collected evidence
- relevant tests / builds / checks
- selected Skill completion conditions

If verification cannot be completed, report the task as incomplete or inconclusive instead of claiming success.

Do not require duplicate answers or a second restated response merely for "double-check" theater.

## 13. Shared Executor implementation hygiene

When implementing:

- read adjacent code and project conventions before editing
- keep diffs minimal and task-scoped
- handle I/O, API, and subprocess failures with clear error paths; do not swallow errors
- avoid committing secrets; use examples in non-secret files only
- run the verification appropriate to the repository before claiming completion

Personal formatting preferences such as mandatory bilingual commit subjects are not framework law unless a Task Contract requires them.

## 14. Technology Rules are context-selected

Technology guidance lives under `rules/tech/`.

Load only the Rules that match the active files, stack, or API/SQL concern.

```text
Skill = process / workflow
Rule = constraint / standard / policy
```

Technology Rules constrain the selected Skill. They are not primary workflow Skills and must not be always-loaded globally.
