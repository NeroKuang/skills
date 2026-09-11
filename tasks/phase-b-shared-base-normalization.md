# Phase B Task Contract: Shared-Base Normalization

Status: READY_FOR_EXECUTOR

## Goal

Normalize the existing public shared-base so every intended first-party Skill participates in deterministic routing, and convert portable Cursor engineering Rules into canonical shared execution / technology Rules.

This task normalizes existing shared-base behavior only. It does not migrate private-user, project-local, or real third-party Skills.

## Mode

IMPLEMENT

## Framework Contract

Framework-Repo: `NeroKuang/skills`

Framework-Ref: `32d6ffb365259f738585141f50b9e0c4dd3b59bd`

Base branch: `framework/skill-router-v1`

Execution branch: `phase-b/shared-base-normalization`

Private intake evidence source: `NeroKuang/skills-cursor-intake#1`

The private intake is evidence only. Do not copy private project/customer/environment details into this public repository.

## Skill Plan

Primary: `implement`

Supporting:
- `writing-for-agents` when editing agent-facing Skill, routing, or Rule contracts

Re-route to `code-review` when implementation is complete and ready for self-review.

Do not load unrelated Skills unless preflight proves a distinct need.

## Required References

Read before editing:

- `FRAMEWORK.md`
- `CANONICAL_MIGRATION_V1.md`
- `routing/scope-model.yaml`
- `routing/SKILL_METADATA_SCHEMA.md`
- `routing/migration-matrix.yaml`
- `routing/flows.yaml`
- `routing/README.md`
- `skills/in-progress/skill-router/SKILL.md`
- `rules/SHARED_RULES.md`
- `rules/CONTROLLER_RULES.md`
- `rules/CURSOR_RULES.md`
- private intake PR `NeroKuang/skills-cursor-intake#1`: `inventory.md`, `inventory.json`, and only the Rule artifacts needed for normalization

Run the current Phase A routing tests before changing anything.

## Scope

### B1. First-party routing metadata backfill

Add `routing.yaml` metadata to every existing first-party Skill under `skills/**/SKILL.md` that is intended to participate in routing.

For each Skill:

1. Read its full `SKILL.md`.
2. Determine its actual owning phase, actor, capabilities, side-effect class, useful composition edges, conflicts, and source.
3. Add metadata conforming to `routing/SKILL_METADATA_SCHEMA.md`.
4. Preserve the Skill's existing behavior. Do not rewrite a Skill merely to make metadata easier.
5. Do not infer private/project selectors for public shared-base Skills.

Default scope for portable canonical Skills is `shared-base`.

Metadata must describe actual behavior, not aspirational behavior.

Do not mechanically give every Skill the same actor/capability/phase values.

### B2. Explicit non-routable exemption mechanism

After Phase B, missing routing metadata for a first-party Skill must no longer silently remain a warning if that Skill is intended to be routable.

Create one explicit, machine-readable exemption mechanism for first-party `SKILL.md` files that intentionally should not enter routing.

Preferred shape:

```text
routing/non-routable.yaml
```

Each exemption must contain at least:

```yaml
- id: <skill-id>
  path: <path-to-SKILL.md>
  reason: <short reason>
```

Requirements:

- exemptions are explicit, reviewable, deterministic, and path-bound
- deprecated or compatibility-only Skills may be exempt when justified
- a missing `routing.yaml` that is not explicitly exempt becomes validation failure
- an exemption pointing to a missing file or unknown Skill becomes validation failure
- duplicate exemption ids/paths become validation failure
- the generated Skill index reports exempted first-party Skills separately from routable Skills

If repository reality proves this shape materially inadequate, use the Blocking Protocol instead of silently inventing a different model.

### B3. Routing validation hardening

Update routing validation so Phase B completion means:

```text
first-party SKILL.md
  -> routing.yaml
  OR
  -> explicit non-routable exemption
```

No unclassified first-party Skill may remain.

Keep all Phase A admission invariants intact:

- project-local selectors are hard gates
- task-contract includes cannot bypass project-local selectors
- third-party lock/provenance is a hard gate
- task-contract includes cannot bypass third-party admission
- scope -> actor -> capability -> phase remains the deterministic filtering order

### B4. Shared execution policy normalization

Use the private intake only as evidence and merge portable parts of `coding-sop` into canonical shared Executor policy.

Portable behavior to preserve:

- read before edit
- minimal diff / avoid unrelated scope expansion
- secret hygiene
- explicit error handling
- verify before completion

Do not promote these personal conventions into framework law:

- mandatory bilingual commit messages
- implicit prohibition on commit/push when the Task Contract already authorizes repository writes

Normalize the old `ask-when-unclear` behavior into the existing Controller-Executor protocol:

```text
inspect available evidence first
  -> if unresolved and material
  -> STATUS: BLOCKED
  -> persist evidence/options to GitHub
  -> Controller decision
```

Do not make the human the routine message bus between agents.

Normalize the account-level "double-check correctness" intent into one self-verification pass against task requirements, evidence, tests, and acceptance criteria. Do not require duplicate answers.

### B5. Shared technology Rules

Create the canonical shared technology Rule set under:

```text
rules/tech/
  README.md
  frontend.md
  go.md
  python.md
  laravel.md
  api-design.md
  mysql-query-safety.md
```

These are Rules / references, not workflow Skills.

Use the relevant private intake Rule artifacts as evidence, but remove project-local/private details.

#### `api-design.md`

Normalize the captured Postman API best practices, including:

- resource-oriented HTTP semantics
- OpenAPI operationId / summary / tags / response discipline
- parameter schemas and examples
- consistent error response shape
- pagination guidance
- auth documentation
- ISO 8601 and schema formats
- API versioning

Precedence requirement:

```text
existing public API contract
  > Controller-approved specification
  > shared generic API convention
```

Generic naming guidance must never silently rewrite an existing API contract.

#### `laravel.md`

Keep only portable Laravel guidance.

Remove or relocate from the shared Rule any pali/manmanlu-specific topology, incidents, endpoint names, internal tables, or private service assumptions.

#### `mysql-query-safety.md`

Extract portable list-query/query-plan safety guidance.

Do not publish pali-specific incident history, private schema names, endpoint names, or customer/system identifiers.

#### `frontend.md`, `go.md`, `python.md`

Normalize only portable engineering conventions from the intake artifacts.

Do not create a Skill solely because a technology name exists.

### B6. Technology Rule selection contract

Update canonical Executor/shared documentation so relevant `rules/tech/*.md` are loaded based on the active task/files/technology context.

Rules constrain the selected workflow; they do not become competing primary Skills.

The selection contract must make clear:

```text
Skill = process / workflow
Rule = constraint / standard / policy
```

Do not mark every technology Rule as globally always-loaded.

### B7. Router and documentation consistency

Update docs/tooling only as needed so all of these agree:

- metadata schema
- scope model
- validator
- generated index
- skill-router instructions
- Executor Rule loading behavior

Do not introduce a second routing source of truth.

## Out of Scope

Do not:

- create the private-user canonical repository
- migrate `dev-stack-audit`, Notion, Obsidian, goal-system, shop-questions, or edit-article
- move lobster Skills or Rules into `lobster_agi`
- move manmanlu Rules into its owning project
- import/fork/lock the real `last30days` Skill
- convert `zeabur-platform-ops` into its final Skill
- add/promote `design-an-interface`
- add/promote `find-skills`
- add/promote `qa`
- resolve `batch-grill-me` / `request-refactor-plan` migration
- remove or relink `~/.cursor/skills` or `~/.agents/skills`
- modify Cursor Account User Rules
- modify private intake PR #1
- merge framework PR #1
- start Phase C-F

## Acceptance Criteria

### Metadata coverage

- [ ] every first-party `skills/**/SKILL.md` is either routable with valid `routing.yaml` or explicitly exempt as non-routable
- [ ] no unexplained `discovered_without_metadata` items remain
- [ ] metadata matches actual Skill behavior rather than generic defaults
- [ ] existing Skill behavioral content remains authoritative
- [ ] project-local/private data is not introduced into public metadata

### Validation/index

- [ ] unclassified first-party Skill causes validation failure
- [ ] invalid exemption causes validation failure
- [ ] generated index separates routable and exempted first-party Skills
- [ ] all Phase A tests A-I remain PASS
- [ ] new Phase B tests cover metadata completeness and exemption behavior
- [ ] build-skill-index remains fail-closed

### Rules

- [ ] portable coding-sop behavior is represented in shared Executor policy
- [ ] evidence-first BLOCKED -> Controller decision replaces ask-first ambiguity behavior
- [ ] self-verification is represented once without duplicate-response behavior
- [ ] `rules/tech/` contains normalized frontend, Go, Python, Laravel, API design, and MySQL query-safety guidance
- [ ] no private project/customer/system details leak from intake
- [ ] API generic conventions explicitly lose to existing contract / approved specification
- [ ] technology Rules are context-selected constraints, not primary workflow Skills

### Safety and scope

- [ ] no real third-party Skill is admitted
- [ ] no private-user/project-local migration occurs
- [ ] no local Skill installation roots are deleted/relinked
- [ ] no secrets or credentials are committed
- [ ] Phase C-F changes are absent

## Required Tests / Demonstrations

Keep Cases A-I from Phase A and add at least:

### Case J: complete first-party classification

Repository fixture with first-party Skills where every Skill has metadata or a valid exemption.

Expected: validation PASS.

### Case K: missing first-party classification fails

A first-party `SKILL.md` with neither `routing.yaml` nor exemption.

Expected: validation FAIL and build-index FAIL.

### Case L: invalid exemption fails

At least one stale/missing path or unknown Skill exemption.

Expected: validation FAIL.

### Case M: exempt Skill stays out of candidate/index Skills

A valid exempt Skill must appear in the index exemption section but never in routable `skills` or resolver candidates.

### Case N: Phase A admission invariants survive metadata backfill

Re-run A-I unchanged and prove 9/9 remain PASS.

## Private Intake Handling

The intake repository is private and contains project-specific information.

Before committing any normalized Rule:

1. remove private repository names unless they are public synthetic examples
2. remove customer/system names
3. remove hostnames, endpoints, table names, internal paths, credentials, tokens, account identifiers, and private incident details
4. keep only portable engineering principles
5. search the public diff for known private identifiers before reporting completion

If portable and private content cannot be separated safely, omit the private detail and report the limitation.

## Completion Gate

Do not mark ready merely because files exist.

Before reporting completion:

1. run routing validation
2. build the index
3. run Phase A A-I regressions
4. run Phase B J-N tests
5. inspect metadata distribution for suspicious copy/paste defaults
6. inspect all public Rule diffs for private leakage
7. run a `code-review` phase against the complete diff
8. confirm no out-of-scope migration

## Blocking Protocol

If a material architecture conflict appears, stop that portion and post:

```text
STATUS: BLOCKED

EVIDENCE
...

CONFLICT
...

OPTIONS
A. ...
B. ...

RECOMMENDATION
...

CONTROLLER DECISION REQUIRED
YES
```

Do not silently alter the approved scope model or metadata semantics.

## Completion Report

When ready for Controller review, post:

```text
STATUS: READY_FOR_REVIEW

SKILL PLAN USED
Framework-Ref:
Primary:
Supporting:
Review Skill:
Refinements:

METADATA COVERAGE
Total first-party SKILL.md:
Routable with routing.yaml:
Explicitly exempt:
Unclassified:

RULES NORMALIZED
...

FILES CHANGED
...

TESTS
<exact commands and exit codes>

DEMO
Case J:
Case K:
Case L:
Case M:
Case N:

PRIVATE DATA CHECK
Identifiers searched:
Result:

KNOWN LIMITATIONS
...

DESIGN QUESTIONS DISCOVERED
...

PHASE C-F CHANGES
None

CONTROLLER REVIEW REQUIRED
YES
```

Keep the PR Draft and do not merge it. Stop after posting the completion report.