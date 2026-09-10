# Canonical Migration Design v1

Status: DESIGN ONLY

This document defines the target architecture for migrating the current Cursor Skills and Rules inventory into the Nero AI Controller-Executor framework.

It does not authorize moving, deleting, rewriting, installing, or uninstalling any existing Skill or Rule.

## 1. Goal

The system must remove the human from manual Skill selection.

A task should be resolved in this order:

```text
Task
  -> Scope Resolution
  -> Actor Resolution
  -> Phase Resolution
  -> Skill Selection
  -> Skill Composition
  -> Rule Resolution
  -> Execution
```

The router must not flatten every installed Skill into one candidate set.

## 2. Core distinction

A Skill and a Rule solve different problems.

- Skill: a process, workflow, or executable procedure. It answers HOW work should proceed.
- Rule: a constraint, standard, invariant, preference, or policy. It constrains execution without owning the workflow.
- Project Context: facts and conventions specific to one repository or system.
- Third-party Skill: externally maintained behavior that should remain traceable to its upstream source and version.

A technology name alone is not a reason to create a Skill. Laravel, Go, Python, frontend, OpenAPI conventions, and similar standards usually belong to Rules unless they define a distinct multi-step workflow.

## 3. Canonical layers

### 3.1 shared-base

Repository: `NeroKuang/skills`

Purpose: portable behavior that is safe and useful across projects.

Contains:

- Controller / Executor framework
- cross-project engineering Skills
- cross-project productivity Skills
- shared safety and execution Rules
- technology Rules
- scope and routing schemas
- metadata and validation tooling

A shared-base item must not depend on a private absolute path, private customer name, private service identifier, private token, or one repository's internal file layout.

### 3.2 private-user

Target: a separate private repository or private local registry. Do not use the intake repository as the long-term canonical store.

Purpose: reusable workflows that belong to this user's environment but are not portable or public.

Examples:

- personal Notion / Calendar integration
- personal Obsidian vault integration
- local AI stack audit
- personal goal workflow
- client-question workflow when it encodes personal operating conventions

Private-user Skills may reference local tools and private integration conventions, but must still avoid committed secrets.

### 3.3 project-local

Target: the project repository itself.

Preferred locations:

```text
.agents/skills/<skill>/SKILL.md
.cursor/rules/<rule>.mdc
AGENTS.md or project context docs
```

Purpose: behavior or facts that only make sense inside one project.

Examples:

- lobster workflow deployment procedures
- lobster Telegram routing behavior
- manmanlu API topology and deployment procedure
- project-specific incident knowledge

Project-local candidates must not enter the global router candidate set when another repository is active.

### 3.4 third-party

Purpose: externally maintained Skills whose upstream identity and version must remain explicit.

Third-party Skills are not copied and silently forked into shared-base.

The framework stores a lock entry containing at least:

```yaml
id: last30days
source: https://github.com/mvanhorn/last30days-skill
ref: <version-or-commit>
trust: third-party
routing_metadata: <overlay reference>
```

Local installation may be linked into Cursor-compatible Skill roots, but the upstream source remains authoritative for Skill behavior unless an intentional fork is created.

## 4. Scope resolution

Scope resolution happens before normal Skill routing.

### 4.1 Precedence

The candidate layers are resolved in this order:

1. Explicit task contract override
2. Project-local
3. Private-user
4. Shared-base
5. Third-party

Precedence does not mean lower layers are ignored. It means more specific knowledge wins when behavior conflicts.

### 4.2 Project-local filtering

A project-local Skill or Rule must declare selectors such as:

- repository identity
- path pattern
- project marker file
- explicit project id

If the selector does not match, the item is not a routing candidate.

### 4.3 Private-user filtering

Private-user Skills are candidates only when the task requests the corresponding personal capability or the task contract explicitly includes them.

Example: a Laravel API task must not consider an Obsidian Skill merely because it exists globally.

### 4.4 Third-party filtering

Third-party Skills enter the candidate set only when their routing overlay matches the task or when the task explicitly names the capability.

## 5. Actor resolution

Every routable Skill should declare one or more actors:

- `controller`
- `executor`
- `both`

Examples:

- issue intake and requirement decomposition usually belong to Controller
- terminal diagnostics and deployment belong to Executor
- routing and verification policy may apply to both

The router must not select an Executor-only Skill for ChatGPT when the Skill requires local terminal access that ChatGPT does not have.

## 6. Phase resolution

After scope and actor filtering, classify the current phase:

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

Only then select the primary Skill and supporting Skills.

## 7. Routing metadata schema

`SKILL.md` remains the behavioral source of truth.

Routing metadata is separate so the framework can index and validate Skills without rewriting every third-party Skill format.

Preferred canonical layout for a first-party Skill:

```text
skills/<bucket>/<skill-name>/
  SKILL.md
  routing.yaml
  agents/openai.yaml        # when needed by the existing harness
  references/...            # optional disclosed reference
```

Minimum `routing.yaml` fields:

```yaml
schema_version: 1
id: diagnosing-bugs
scope: shared-base
actors: [executor]
phases: [investigate]
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

Fields:

- `id`: stable Skill identifier
- `scope`: shared-base | private-user | project-local | third-party
- `actors`: controller | executor | both
- `phases`: phases this Skill can own or support
- `capabilities`: tool or environment abilities required or contributed
- `side_effects`: none | local-write | repo-write | external-write | production-write
- `requires`: hard Skill or environment dependencies
- `composes_with`: known useful composition edges
- `conflicts_with`: Skills that should not own the same phase together
- `selectors`: scope selectors
- `source`: provenance information

The description in `SKILL.md` continues to drive model invocation. `routing.yaml` drives deterministic filtering and validation.

## 8. Third-party routing overlays

Third-party Skills should not be edited only to satisfy this framework.

Use an overlay:

```text
third-party/
  skills.lock.yaml
  routing/
    last30days.yaml
```

The overlay describes scope, actor, phase, capability, and side-effect metadata without changing upstream Skill behavior.

## 9. Rule architecture

Target shared layout:

```text
rules/
  SHARED_RULES.md
  CONTROLLER_RULES.md
  CURSOR_RULES.md
  tech/
    laravel.md
    go.md
    python.md
    frontend.md
    api-design.md
    mysql-query-safety.md
```

Project-local Cursor Rules remain inside project repositories under `.cursor/rules/`.

Private-user presentation preferences should remain in the account-level User Rules when that is the native surface.

### 9.1 Rule precedence

When rules conflict:

```text
Explicit task contract
  > project-local verified contract
  > Controller-approved specification
  > private-user preference
  > shared technology rule
  > generic convention
```

Safety constraints may only be overridden by an explicitly authorized workflow when the framework itself permits the override.

### 9.2 Existing contract wins over generic style

A generic API design Rule must never silently rewrite an existing public API contract simply because another naming convention is preferred.

Example:

```text
existing endpoint contract
  > generic kebab-case recommendation
```

## 10. Current Cursor inventory migration classes

The 2026-09-11 Cursor intake found 104 Skill files representing 52 exact duplicate pairs across `~/.cursor/skills` and `~/.agents/skills`.

Those two roots are installation surfaces, not separate canonical sources.

### 10.1 Already represented in shared-base

Skills whose canonical equivalent already exists in `NeroKuang/skills` should be synchronized from the repository rather than re-imported from Cursor snapshots.

The local copies must eventually become generated links or synchronized installs, not independently edited sources.

### 10.2 Candidate shared-base additions or extensions

Evaluate for canonical inclusion:

- `design-an-interface`: distinct design-phase capability
- `find-skills`: external ecosystem discovery used after `SKILL_GAP`, not as the normal router
- `qa`: Controller-side raw issue intake, after removing assumptions about unavailable background tools
- `zeabur-platform-ops`: convert from always-loaded Rule into an Executor operation / verification Skill plus disclosed reference

### 10.3 Candidate private-user

Keep outside the public shared repository:

- `dev-stack-audit`
- `notion-reminder-hook`
- `obsidian-vault`
- `goal-system`, converted from Rule to Skill if retained
- `shop-questions`, unless generalized into a public client-question workflow later
- `edit-article`, pending evaluation of whether it earns shared context or remains personal tooling

### 10.4 Project-local

Move to their project repositories:

- `fix-lobster-telegram-ping`
- `lobster-deploy-02`
- `lobster-deploy-06`
- `lobster-market-monitor`
- `lobster-startup`
- lobster-specific Rules
- `manmanlu-api.mdc`
- project-specific incident references that are not generalizable

`lobster-local-coding` should not survive as a global Skill in its current form. Its generic behavior is covered by shared execution Rules, `implement`, and `code-review`; project-specific context belongs to lobster.

### 10.5 Third-party

- `last30days`: retain upstream identity and pin its version/commit in the third-party lock.

### 10.6 Merge, replace, or retire

- `ubiquitous-language` -> `domain-modeling`
- `writing-great-skills` -> `writing-for-agents`
- `request-refactor-plan` -> compose `improve-codebase-architecture`, `grill-with-docs`, `to-spec`, and `to-tickets`
- `batch-grill-me` -> evaluate as a mode or branch of `grilling`, not a parallel permanent top-level workflow unless independent invocation proves valuable

## 11. Current Rules migration classes

### Shared execution policy

Merge the portable parts of `coding-sop` into shared Executor policy:

- read before edit
- minimal diff
- secret hygiene
- explicit error handling
- appropriate verification before completion

Do not automatically preserve personal commit-message formatting as framework law.

### Blocking decision policy

Replace the global `ask-when-unclear` behavior with:

```text
inspect evidence first
  -> if unresolved and material
  -> STATUS: BLOCKED
  -> Controller decision
```

Cursor should not turn the human into the normal message bus between agents.

### Technology Rules

Candidates for shared technology Rules after normalization:

- Laravel
- Go
- Python
- frontend
- OpenAPI / Postman API design

Technology Rules should be selected by file/task context and should not become independent workflow Skills.

### MySQL safety

Split `mysql-list-query-safety` into:

1. a general shared MySQL query-safety Rule containing portable query-plan guidance
2. project-local incident documentation containing the pali-specific historical failure

The shared Rule should not be `alwaysApply` to unrelated tasks.

### Zeabur

Convert operational procedure out of always-loaded Rules and into an operation / verification Skill. Stable facts and caveats may remain as disclosed references loaded by that Skill.

### Account User Rules

Current manual capture:

- Chinese response preference -> private account presentation preference
- perform a second correctness check -> already represented conceptually by framework verification/completion policy; normalize to a self-verification pass rather than duplicate-response behavior
- Postman API Best Practices -> shared technology Rule `api-design`, with existing contract precedence

Team Rules remain unresolved and non-blocking until supplied.

## 12. Local installation target

After canonical migration, local installation roots should stop being independent sources of truth.

Desired model:

```text
Canonical repos
  -> sync / link tool
  -> ~/.cursor/skills
  -> ~/.agents/skills
```

Both local roots may continue to exist for harness compatibility, but they should point to or be generated from the same source revision.

Local edits to generated mirrors are drift and should be detected.

## 13. Registry build

The framework should eventually provide:

```text
scripts/build-skill-index.mjs
scripts/validate-routing.mjs
scripts/sync-local-skills.mjs
```

`build-skill-index` reads first-party `routing.yaml` files and third-party overlays.

`validate-routing` checks:

- every routable Skill has metadata
- referenced Skills exist
- actor requirements are valid
- phase names are valid
- scope selectors are valid
- composition edges do not reference missing Skills
- third-party locks resolve to a source and ref

`sync-local-skills` installs or links the resolved user-visible Skill set into Cursor-compatible local roots without making those roots canonical.

## 14. Migration phases

### Phase A: schema and resolver

Create and validate:

- scope model
- `routing.yaml` schema
- third-party lock schema
- generated Skill index
- two-stage router behavior

No local Skill deletion yet.

### Phase B: shared-base normalization

Add metadata to existing canonical Skills and normalize shared Rules.

Introduce only approved new shared Skills.

### Phase C: private-user registry

Create the private canonical home for personal Skills and move approved personal workflows there.

Do not use `skills-cursor-intake` as the permanent private registry.

### Phase D: project-local extraction

Move lobster and manmanlu knowledge into their owning repositories.

Validate that unrelated projects no longer discover them.

### Phase E: third-party lock

Pin `last30days` and future external Skills with provenance and routing overlays.

### Phase F: local convergence

Replace independently edited `~/.cursor/skills` and `~/.agents/skills` copies with synchronized links or generated installs.

Run a final inventory and assert no unintended drift remains.

## 15. Acceptance criteria for migration design

The design is ready for implementation when:

- the four scope layers are explicit
- precedence is explicit
- Skill and Rule responsibilities are distinct
- actor filtering is explicit
- routing metadata is defined
- third-party provenance is defined
- current inventory items have a migration class
- project-specific Skills are excluded from unrelated project routing
- local install roots are no longer treated as canonical
- no destructive migration has been performed during design

## 16. Next implementation task

The next task after this document is approved is Phase A only:

`Implement routing metadata schema, scope resolver, Skill index builder, and validation tooling.`

Do not begin Phase B through F in the same implementation task.
