# Skill Routing Metadata Schema v1

This schema is used by the Nero AI framework to filter and compose Skills before execution.

`SKILL.md` remains the authoritative behavioral contract. `routing.yaml` is routing metadata only.

## Canonical location

For first-party Skills:

```text
skills/<bucket>/<skill-name>/routing.yaml
```

For third-party Skills:

```text
third-party/routing/<skill-id>.yaml
```

## Required fields

```yaml
schema_version: 1
id: diagnosing-bugs
scope: shared-base
actors:
  - executor
phases:
  - investigate
capabilities:
  - source-read
  - terminal
  - tests
side_effects: none
requires: []
composes_with:
  - tdd
  - code-review
conflicts_with:
  - triage
selectors: {}
source:
  type: first-party
```

## Field semantics

### `schema_version`

Metadata schema revision. Current value: `1`.

### `id`

Stable routing identifier. It should normally match the Skill directory name.

Renaming a display title does not require changing the id. Changing the id is a migration.

### `scope`

One of:

- `shared-base`
- `private-user`
- `project-local`
- `third-party`

### `actors`

One or more of:

- `controller`
- `executor`
- `both`

Use `both` only when the same workflow can actually be executed by both actors without pretending unavailable tools exist.

### `phases`

One or more phases from the canonical scope model:

- discover
- research
- investigate
- design
- plan
- implement
- verify
- review
- operate
- recover
- teach

The first phase should be the phase the Skill most naturally owns.

### `capabilities`

Capabilities the Skill needs or materially uses.

Initial vocabulary:

- `source-read`
- `source-write`
- `git-read`
- `git-write`
- `github-read`
- `github-write`
- `terminal`
- `tests`
- `build`
- `http`
- `database-read`
- `database-write`
- `browser`
- `external-research`
- `deployment`
- `human-input`

This list may expand, but free-form synonyms should not be introduced casually.

### `side_effects`

Highest normal side-effect class of the Skill:

- `none`
- `local-write`
- `repo-write`
- `external-write`
- `production-write`

A Skill may still contain steps that require explicit task authorization even when its normal side effect is lower.

### `requires`

Hard dependencies needed before the Skill can run.

Examples:

```yaml
requires:
  - skill: codebase-design
```

or:

```yaml
requires:
  - capability: terminal
```

A requirement is not the same as a useful composition edge.

### `composes_with`

Known useful Skill edges.

This is advisory graph metadata, not permission to auto-load every listed Skill.

The router still checks phase and task relevance.

### `conflicts_with`

Skills that should not own the same phase in the same plan.

A conflict does not necessarily mean the Skills can never appear in one multi-phase flow.

Example:

`triage` and `diagnosing-bugs` may both appear across a lifecycle, but they should not both be selected as the primary Skill for the same active investigation phase.

### `selectors`

Scope selectors. Normally empty for shared-base.

Project-local example:

```yaml
selectors:
  repository:
    - NeroKuang/lobster_agi
  marker_file:
    - n8n-workflows/README.md
```

Private-user example:

```yaml
selectors:
  explicit_capabilities:
    - personal-notion
    - apple-calendar
```

Selectors are filters, not descriptive prose.

### `source`

Provenance.

First-party:

```yaml
source:
  type: first-party
```

Third-party:

```yaml
source:
  type: third-party
  repository: https://github.com/example/skill
  ref: v1.2.3
```

## Optional fields

```yaml
priority: 50
supports_modes:
  - INVESTIGATE
  - VERIFY
notes: "Short routing-only note"
```

`priority` may only break otherwise equivalent candidates. It must never override scope, actor, phase, or hard capability mismatches.

## Validation rules

A valid routing entry must satisfy all of the following:

1. `id` is unique inside the resolved registry.
2. `scope` exists in `routing/scope-model.yaml`.
3. every actor is valid.
4. every phase is valid.
5. every side-effect class is valid.
6. referenced Skills exist or are declared third-party entries.
7. project-local Skills have at least one project selector.
8. third-party Skills have provenance and a pinned ref.
9. `SKILL.md` exists for first-party Skills.
10. metadata must not contain secrets.

## Router behavior

Routing uses metadata for deterministic exclusion first.

```text
all discovered Skills
  -> remove scope mismatches
  -> remove actor mismatches
  -> remove capability impossibilities
  -> rank by phase and task intent
  -> read surviving SKILL.md files
  -> choose primary
  -> compose supporting Skills
```

This prevents the model from spending reasoning budget comparing Skills that should never have been candidates.
