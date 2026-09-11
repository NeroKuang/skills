# Phase D Task Contract: Project-Local Extraction

Status: READY
Mode: IMPLEMENT

Framework-Repo: `NeroKuang/skills`
Framework-Ref: `f4e346db4c61d0290c1033887aab2f55852182f7`
Source evidence: `NeroKuang/skills-cursor-intake#1`

## Goal

Move project-specific AI workflows, rules, and operational knowledge out of global/user installation surfaces and into the repositories that own that knowledge.

Phase D covers the project-local items explicitly classified in `CANONICAL_MIGRATION_V1.md` and `routing/migration-matrix.yaml`:

- Lobster project-local Skills and Rules -> `NeroKuang/lobster_agi`
- Manmanlu API Rule -> its verified owning repository

The result must preserve the framework invariant that project-local items are not routing candidates when another repository is active.

## Controller anchor vs implementation repositories

This public `NeroKuang/skills` Phase D PR is the Controller Task Contract and cross-repository review trail only.

Substantive private project knowledge MUST remain in the owning project repositories. Do not copy Lobster or Manmanlu implementation details into the public framework repository.

## Verified repository state at contract creation

### Lobster

Verified owner repository:

`NeroKuang/lobster_agi`

- visibility: private
- default branch: `main`
- current Controller access: admin/push

This is the authorized Phase D target for Lobster content.

### Manmanlu

`NeroKuang/manmanlu-api` does not exist in the repositories currently visible to the Controller, and no repository named `manmanlu` is currently discoverable in the authenticated GitHub installation.

Do NOT create a new repository or guess an owner repository.

Before any Manmanlu mutation, resolve its owning repository from evidence, in this order:

1. inspect the captured intake artifact for repository/path clues
2. inspect an existing local Manmanlu checkout and its `git remote -v`, if available
3. inspect authenticated GitHub repositories for an exact/evidenced match
4. if one unique owning repository cannot be proven, report `STATUS: BLOCKED` for the Manmanlu subtask and make no Manmanlu write

Phase D cannot be marked fully `READY_FOR_REVIEW` until Manmanlu is either migrated to a verified owner or explicitly resolved by the Controller through a follow-up decision.

## Source-of-truth rules

- `NeroKuang/skills-cursor-intake#1` is evidence/archive only.
- Read the full captured Skill/Rule artifacts before adapting them.
- Do not reconstruct project facts from memory when the intake or owning repository can be inspected.
- Owning project repositories become canonical for project-local behavior after approved merge.
- `~/.cursor/skills` and `~/.agents/skills` remain installation surfaces until Phase F and are not canonical.

## Phase D migration set

### Lobster Skills

Evaluate and migrate these captured Skills into `NeroKuang/lobster_agi`:

- `fix-lobster-telegram-ping`
- `lobster-deploy-02`
- `lobster-deploy-06`
- `lobster-market-monitor`
- `lobster-startup`

### Lobster local-coding disposition

`lobster-local-coding` MUST NOT survive as a global or mechanically copied project-local top-level Skill in its current form.

Dissolve it:

- generic coding behavior remains covered by shared `implement`, `code-review`, and shared Executor Rules
- only genuinely Lobster-specific constraints/facts may remain in project-local Rules/context
- if a distinct Lobster-only multi-step workflow remains after removing generic behavior, document the evidence before creating a replacement Skill

### Lobster Rules

Normalize these captured Rules into the Lobster owner repository:

- `lobster-market-monitor`
- `lobster-n8n-workflows`
- `lobster-telegram-ollama`

If a Rule overlaps a Skill with the same subject, apply the framework distinction:

- Skill owns HOW / procedure / workflow
- Rule owns invariant / constraint / stable project fact

Do not duplicate the same procedure in both surfaces.

### Manmanlu Rule

Migrate captured `manmanlu-api.mdc` only after the owning repository is verified.

It remains a project-local Rule unless evidence proves a distinct reusable multi-step workflow that should be modeled differently. Do not promote Manmanlu-specific topology, endpoints, deployment facts, customer facts, or environment details into shared-base or private-user scope.

## Canonical project-local layout

Preferred project-local surfaces from the migration design:

```text
<project-repo>/
  .agents/
    skills/
      <skill-id>/
        SKILL.md
        routing.yaml
  .cursor/
    rules/
      <rule-id>.mdc
  AGENTS.md or project context docs   # only when genuinely needed
```

Do not create duplicate canonical copies under a second project path merely to satisfy tooling.

For project-local Skills, `SKILL.md` is authoritative behavior and adjacent `routing.yaml` is deterministic routing metadata.

## Project-local routing contract

Every retained project-local Skill must use:

```yaml
scope: project-local
```

and must declare selectors that prove ownership.

For Lobster, include the exact repository selector:

```yaml
selectors:
  repository:
    - NeroKuang/lobster_agi
```

Additional marker/path selectors may be added only when they reflect verified project structure and improve safety. Do not invent marker files.

For Manmanlu, use the verified repository identity, not the string `manmanlu-api` from the Rule filename unless that repository identity is independently proven.

Project-local selectors are hard admission constraints. Task-contract inclusion must not bypass a repository-selector mismatch.

## Actor / phase / capability metadata

Use the Phase B hard-AND semantics:

- `capabilities` contains only capabilities universally required to execute the Skill
- optional tools do not become hard capabilities
- actor and phase reflect actual behavior, not aspirational architecture
- `side_effects` reflects the highest normal effect of the workflow

Read each source artifact in full before assigning metadata.

Do not mechanically infer every deployment Skill as `production-write`; determine whether the Skill performs production mutation or only prepares/verifies operations.

## Rule normalization requirements

Project-local Rules remain in the owning repository and constrain relevant work only.

Requirements:

- avoid `alwaysApply` behavior unless the rule is truly safe and required for every task in that repository
- preserve project-specific invariants/facts only when verified against current repository evidence
- stale incident facts must be marked historical or removed rather than presented as current truth
- do not copy secrets, tokens, private keys, auth headers, cookies, or live credentials
- do not duplicate portable engineering policy already present in shared Rules
- project-local contract beats generic shared conventions when both apply

## Repository inspection before edits

Before creating project-local artifacts in an owning repo:

1. read existing `AGENTS.md`, `.agents/`, `.cursor/`, README, deployment docs, and relevant operational files if present
2. search for existing equivalent procedures/rules to avoid duplicate authority
3. inspect the current repository layout and deployment surfaces
4. compare captured intake claims with current code/docs
5. classify stale or contradicted intake knowledge explicitly rather than silently preserving it

## Validation against the public framework

Do not fork the public routing validator/schema into project repositories.

The public loader at `Framework-Ref` supports an explicit `skillsRoot` override. Use the pinned framework implementation to load project-local Skills from `.agents/skills` and validate the resulting registry.

Conceptually:

```js
const registry = loadRoutingRegistry(projectRoot, {
  skillsRoot: path.join(projectRoot, '.agents', 'skills'),
});
const result = validateRoutingRegistry(registry, { repoRoot: projectRoot });
```

A temporary verification harness is acceptable. Do not add unrelated JavaScript tooling to an owner repository solely to run one migration check unless a durable project-local checker is justified.

If the public framework genuinely cannot validate the preferred project-local layout without a framework change, report `STATUS: BLOCKED` with evidence before modifying public routing semantics.

## Required isolation proof

Use the public resolver at the pinned Framework-Ref and the actual project-local metadata.

At minimum prove:

### Positive control

When active repository equals the owning repository and actor/phase/hard capabilities match, the intended project-local Skill can survive scope filtering.

### Negative control

When active repository is unrelated, for example `NeroKuang/skills`, `NeroKuang/skills-private`, or another repository, every Lobster project-local Skill is excluded at scope with `project-local-selector-mismatch`.

For Manmanlu, perform the same proof using its verified repository identity after owner resolution.

### Include cannot bypass selector

Explicit `taskContract.includeSkills` for a project-local Skill MUST still fail when active repository does not satisfy its project selector.

This must remain consistent with the Phase A invariant.

## Implementation PR structure

### Lobster

Create a dedicated branch in `NeroKuang/lobster_agi`, preferably:

`phase-d/project-local-ai-context`

Open a Draft PR against its current default branch.

Post the Lobster Draft PR URL and exact head SHA back to this public Phase D PR.

### Manmanlu

After owner resolution, create an equivalent dedicated branch and Draft PR in the verified owning repository.

Post the repository identity, evidence used to resolve ownership, Draft PR URL, and exact head SHA back to this public Phase D PR.

If owner resolution fails, stop the Manmanlu subtask and post `STATUS: BLOCKED` with evidence. Do not create a repository as a workaround.

## Required verification cases

### D1: source and owner verification

- Lobster owner is `NeroKuang/lobster_agi`.
- Manmanlu owner is proven from repository/local-remote evidence before mutation.
- Intake remains evidence/archive only.

### D2: Lobster Skill classification

Every approved Lobster Skill has one explicit disposition:

- migrated as project-local Skill
- dissolved into shared behavior + project-local Rule/context
- retired as stale/redundant with rationale

No item is silently dropped.

### D3: Lobster Rule classification

Every approved Lobster Rule has an explicit disposition and does not duplicate procedural content already owned by a Skill.

### D4: Manmanlu classification

`manmanlu-api.mdc` has a verified owning repository and explicit migration disposition before Phase D completion.

### D5: metadata validation

All retained project-local Skills validate against the pinned public schema using `.agents/skills` as the first-party skills root.

Report:

- entries validated
- unclassified count
- validation PASS/FAIL

### D6: project selector correctness

Every retained project-local Skill declares verified project selectors, including exact repository identity.

No Lobster Skill is selectable outside `NeroKuang/lobster_agi`.

### D7: deterministic isolation

Provide resolver evidence for:

- positive owner-repo selection
- unrelated-repo rejection
- explicit include unable to bypass selector mismatch

### D8: secret / private-data hygiene

Run secret scanning over each project-local AI-context delta. Report categories checked and PASS/FAIL without echoing secret values.

The public framework Phase D PR must contain no substantive Lobster/Manmanlu private project details.

### D9: canonical ownership

After proposed migration:

- substantive Lobster AI behavior exists only in Lobster owner repo PR
- substantive Manmanlu AI behavior exists only in verified Manmanlu owner repo PR
- intake remains archive/evidence
- no new canonical project-local copies are added to `NeroKuang/skills` or `NeroKuang/skills-private`

### D10: phase boundary

`PHASE E-F CHANGES: None`

Do not pin/import `last30days` and do not modify local installation convergence.

## Acceptance criteria

Phase D may report `STATUS: READY_FOR_REVIEW` only when:

- Lobster Draft PR exists and is linked here
- all six Lobster Skill-source items, including `lobster-local-coding`, have explicit dispositions
- all three Lobster Rule-source items have explicit dispositions
- retained Lobster Skills use `scope: project-local` with verified selectors
- Lobster project-local validation and isolation tests PASS
- Manmanlu owning repository is uniquely verified
- Manmanlu Draft PR exists and is linked here
- `manmanlu-api.mdc` has an explicit project-local disposition
- Manmanlu validation/isolation checks PASS when it has routable Skills; Rule-only migration must still prove canonical ownership/location
- secret scans PASS
- no substantive private project content is added to this public repo
- no Phase E-F work is present
- no implementation PR is merged

If Manmanlu owner cannot be uniquely resolved, report `STATUS: BLOCKED` rather than `READY_FOR_REVIEW` and stop after completing only safe, independently reviewable Lobster work.

## Explicit out of scope

Do NOT:

- modify `NeroKuang/skills-private` Phase C content
- migrate Pali-specific incident history in this phase
- promote project-local content into shared-base or private-user
- pin/import `last30days` or perform Phase E
- relink/synchronize `~/.cursor/skills` or `~/.agents/skills` or perform Phase F
- create a new Manmanlu repository without explicit Controller authorization
- merge the Lobster/Manmanlu implementation PRs
- merge this public Phase D PR
- delete intake/archive evidence

## Skill Plan

Primary: `implement`

Supporting:

- `code-review` before completion
- `domain-modeling` only if repository-specific terminology must be normalized and durable project context is warranted

Use evidence-first investigation before every adaptation. Current owner-repository evidence overrides stale intake assumptions.

## Completion report

When execution is complete, post to this public PR:

- `STATUS: READY_FOR_REVIEW` or `STATUS: BLOCKED`
- Framework-Ref
- Lobster repository + Draft PR URL + head SHA
- Manmanlu verified repository + ownership evidence + Draft PR URL + head SHA, or precise BLOCKED evidence
- disposition table for all Phase D migration items
- validator results
- D1-D10 evidence summary
- isolation negative/positive/include-bypass results
- secret scan results
- `PHASE E-F CHANGES: None`

Then stop and wait for Controller Review.
