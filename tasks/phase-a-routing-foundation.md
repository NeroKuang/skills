# Phase A Task Contract: Routing Foundation

Status: READY_FOR_EXECUTOR

## Goal

Implement Phase A of `CANONICAL_MIGRATION_V1.md`: machine-readable routing metadata, deterministic scope resolution, Skill index generation, third-party lock foundation, and validation tooling.

This task does not migrate existing Skills or Rules.

## Mode

IMPLEMENT

## Framework Contract

Framework-Repo: `NeroKuang/skills`

Framework-Ref: `03f38452b07c1ed0d6aa166e7d2660a1f56d2559`

Base branch: `framework/skill-router-v1`

Execution branch: `phase-a/routing-foundation`

## Skill Plan

Primary: `implement`

Supporting:
- `writing-for-agents` only when modifying agent-facing routing/schema documentation

`implement` owns normal implementation, testing, and review discipline. Do not load every engineering Skill unless Skill Preflight proves a distinct need.

Re-route when:
- implementation enters review
- a material schema conflict is discovered
- a required capability is missing

## Required References

Read before editing:

- `FRAMEWORK.md`
- `CANONICAL_MIGRATION_V1.md`
- `routing/scope-model.yaml`
- `routing/SKILL_METADATA_SCHEMA.md`
- `routing/migration-matrix.yaml`
- `routing/flows.yaml`
- `skills/in-progress/skill-router/SKILL.md`
- `rules/SHARED_RULES.md`
- `rules/CURSOR_RULES.md`

Inspect the current repository structure before choosing implementation details.

## Scope

### 1. Routing metadata loader

Support first-party `routing.yaml` metadata as defined in `routing/SKILL_METADATA_SCHEMA.md`.

`SKILL.md` remains behavioral source of truth.

Do not add metadata to every existing Skill in this task. Add only minimal fixtures/examples required to prove tooling.

### 2. Skill index builder

Create:

```text
scripts/build-skill-index.mjs
```

Requirements:

- discover existing first-party Skill directories
- read optional first-party `routing.yaml`
- read third-party routing overlays when present
- preserve provenance
- generate deterministic normalized machine-readable output
- never treat `~/.cursor/skills` or `~/.agents/skills` as canonical sources
- fail clearly on malformed metadata

Document the output path.

### 3. Scope resolver

Create reusable routing logic accepting at minimum:

- active repository identity when known
- working path
- actor
- phase
- available capabilities
- explicit task-contract overrides

Filtering must occur in this order:

```text
scope
-> actor
-> capability
-> phase
```

before semantic Skill selection.

Core resolver logic must be testable independently of CLI parsing.

### 4. Validation tooling

Create:

```text
scripts/validate-routing.mjs
```

Validate at least:

- unique Skill ids
- valid scope
- valid actors
- valid phases
- valid side-effect classes
- resolvable Skill references where expected
- project-local entries have selectors
- third-party entries have provenance and pinned ref
- first-party entries map to existing `SKILL.md`
- obvious secret values are rejected

Validation errors must produce a non-zero exit code.

### 5. Third-party lock foundation

Create schema/layout for:

```text
third-party/skills.lock.yaml
third-party/routing/<skill-id>.yaml
```

Use only synthetic examples or schema fixtures. Do not migrate `last30days` in Phase A.

### 6. Router integration

Update `skill-router` only as needed so the documented runtime order is:

```text
scope resolution
-> actor filtering
-> capability filtering
-> phase classification
-> read surviving SKILL.md files
-> primary Skill selection
-> supporting Skill composition
```

Do not rewrite unrelated Skills.

### 7. Executable tests or fixture checks

Cover at least:

A. Project-local isolation: a Skill scoped to example project A is excluded in unrelated project B.

B. Actor filtering: an Executor-only terminal Skill is excluded for Controller without terminal capability.

C. Shared fallback: a shared engineering Skill remains available when no more-specific candidate matches.

D. Third-party admission: missing lock/provenance makes a third-party entry invalid or excluded.

E. Malformed metadata: invalid phase/scope/reference returns validation failure.

Use synthetic project names and fixtures. Do not copy private intake content.

## Out of Scope

Do not:

- move lobster Skills
- move manmanlu Rules
- create the private-user canonical repository
- migrate Notion, Obsidian, goal-system, shop-questions, edit-article, or dev-stack-audit
- import/fork `last30days`
- delete duplicate local Skill roots
- modify Cursor Account User Rules
- normalize Laravel/Postman/MySQL Rules
- convert Zeabur into a final production Skill
- promote `skill-router`
- merge framework PR #1

## Acceptance Criteria

- [ ] deterministic Skill index builder exists
- [ ] scope resolution runs before semantic Skill selection
- [ ] actor and capability mismatches are excluded deterministically
- [ ] project-local selectors prevent unrelated project candidate pollution
- [ ] invalid routing metadata causes non-zero validation exit
- [ ] third-party entries require provenance and pinned ref
- [ ] Cases A-E are executable and pass
- [ ] existing Skills remain usable without immediate metadata migration of every Skill
- [ ] `SKILL.md` remains behavioral source of truth
- [ ] no private intake data enters the public repository
- [ ] no Phase B-F migration occurs
- [ ] docs explain build, validate, and inspect commands

## Implementation Constraints

- Prefer Node.js and standard library unless a dependency clearly earns its cost.
- Separate core logic from CLI wrappers.
- Use deterministic ordering and stable output.
- Preserve the repository prohibition on em dashes in prose.
- Do not silently change this schema if implementation reveals a material design conflict.

## Blocking Protocol

If a material schema/design conflict appears, stop and report in this PR:

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

## Completion Report

When ready for Controller review, post:

```text
STATUS: READY_FOR_REVIEW

SKILL PLAN USED
Framework-Ref:
Primary:
Supporting:
Refinements:

IMPLEMENTED
...

FILES CHANGED
...

TESTS
<exact commands and results>

DEMO
<commands proving Cases A-E>

KNOWN LIMITATIONS
...

DESIGN QUESTIONS DISCOVERED
...

PHASE B-F CHANGES
None
```
