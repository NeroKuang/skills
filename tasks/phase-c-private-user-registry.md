# Phase C Task Contract: Private-User Registry

Status: READY
Mode: IMPLEMENT

Framework-Repo: `NeroKuang/skills`
Framework-Ref: `cb88cecfd0bcb402f784f8db74bbeb04f843056f`
Source evidence: `NeroKuang/skills-cursor-intake#1`

## Goal

Create the permanent private canonical home for reusable Nero-specific Skills and migrate only the approved `private-user` workflows from the Cursor intake into that registry.

The private intake repository is evidence/archive only and MUST NOT become the canonical private registry.

## Target private repository

Create, if it does not already exist:

`NeroKuang/skills-private`

Requirements:

- GitHub visibility MUST be private.
- If a repository with that exact name already exists, inspect it first. Do not overwrite or repurpose it silently. If its purpose conflicts, report `STATUS: BLOCKED` on this PR.
- Do not commit credentials, tokens, cookies, API keys, private keys, auth headers, or secret values.
- Environment-specific absolute paths may only remain when the Skill genuinely requires them and they have been revalidated; otherwise convert them to configuration placeholders or documented setup inputs.

## Durable execution surface

After creating/confirming `NeroKuang/skills-private`:

1. Ensure it has a `main` branch with a minimal private-registry README/skeleton.
2. Create branch `phase-c/private-user-registry` in that private repository.
3. Open a Draft PR in `NeroKuang/skills-private` for the Phase C implementation.
4. Post that private PR URL back to public `NeroKuang/skills` PR #4.
5. All substantive private Skill changes belong in the private PR, not the public repository.

Public PR #4 is the Controller Task Contract and cross-repository review anchor only.

## Approved migration set

Migrate and normalize these items only:

- `dev-stack-audit`
- `notion-reminder-hook`
- `obsidian-vault`
- `goal-system`
- `shop-questions`
- `edit-article`

### Per-item decisions

#### `dev-stack-audit`

Keep private. Preserve the useful local-stack audit workflow, but remove assumptions that are not universally true for Nero's current machine unless they are detected at runtime.

#### `notion-reminder-hook`

Keep private. External writes MUST require explicit task authorization. Never commit credentials or tokens. Separate reusable workflow from account-specific secret/config values.

#### `obsidian-vault`

Keep private. Revalidate the captured environment-specific vault path on the current macOS environment before preserving any path assumption. Prefer configurable path discovery/input over a hard-coded stale path.

#### `goal-system`

The intake source is Rule-like. Convert it into a Skill only if the captured behavior represents a stateful personal workflow with a real invocation/process. Do not preserve it as an always-loaded engineering Rule.

If evidence shows it has no durable workflow value, classify it as `non-routable` or retire it with rationale rather than fabricating a workflow.

#### `shop-questions`

Keep private as the current personal/client workflow. Do not generalize it into public shared-base during Phase C.

#### `edit-article`

Keep private pending future evidence for shared-base promotion. Preserve only the reusable personal workflow; do not add public promotion work in this phase.

## Canonical private layout

Use the same behavioral/metadata separation as the public framework:

```text
NeroKuang/skills-private
  README.md
  registry.yaml
  skills/
    <skill-id>/
      SKILL.md
      routing.yaml
      references/...        # optional, disclosed and secret-free
```

`SKILL.md` is authoritative behavior.

`routing.yaml` is deterministic metadata and MUST conform to the public framework schema at `Framework-Ref` above.

For routable private Skills:

- `scope: private-user`
- actor/phase/capability metadata must reflect hard requirements only
- no project-local selector masquerading as private-user scope
- external-write workflows must declare the correct `side_effects`
- optional integrations/tools must not become hard capabilities unless universally required

`registry.yaml` is a private registry manifest, not a second behavioral source of truth. It should contain only stable registry information such as schema version, framework ref/schema compatibility, and the canonical Skill ids/paths.

## Validation contract

Do NOT fork the public routing validator into an independently maintained private copy.

Use the public framework tooling at the pinned Framework-Ref to validate the private repository root, e.g. conceptually:

```bash
node /path/to/NeroKuang/skills/scripts/validate-routing.mjs \
  --root /path/to/NeroKuang/skills-private
```

The public validator already supports `--root` and should remain the schema authority.

If Phase C exposes a genuine incompatibility between the public validator and a standalone private-user registry, report `STATUS: BLOCKED` with evidence before changing the public framework contract.

## Source/evidence rules

- Use `NeroKuang/skills-cursor-intake#1` only as evidence.
- Prefer the captured original Skill/Rule content over memory.
- Remove/redact secrets before any commit.
- Do not copy project-specific lobster, manmanlu, pali, customer, deployment, or incident knowledge into the private-user registry unless it is genuinely part of one of the six approved personal workflows. Project-local facts belong to Phase D.
- Do not copy `last30days`; it belongs to Phase E.
- Do not import candidate shared-base additions (`design-an-interface`, `find-skills`, `qa`, `zeabur-platform-ops`) in this phase.

## Routing/admission expectations

Phase C must preserve the scope model:

```text
explicit task contract
> project-local
> private-user
> shared-base
> third-party
```

Private-user Skills are candidates only when:

- the task requests the corresponding personal capability, or
- the task contract explicitly includes the Skill.

Their mere presence in a private registry must not make them candidates for unrelated engineering work.

Phase C does not need to implement Phase F local installation convergence. Do not relink `~/.cursor/skills` or `~/.agents/skills` yet.

## Required verification

At minimum provide executable or inspectable evidence for:

### Case C1: registry privacy and canonical ownership

- `NeroKuang/skills-private` exists and is private.
- `skills-cursor-intake` remains evidence/archive, not canonical target.

### Case C2: classification completeness

Every migrated/retained private Skill is classified as one of:

- routable `private-user` with valid `routing.yaml`, or
- explicitly non-routable/retired with a documented rationale.

No migrated item is left ambiguous.

### Case C3: secret hygiene

Run a private-data/secret scan over the new registry and report PASS/FAIL. The report may identify categories checked but must not echo secret values.

### Case C4: external-write safety

For external integration Skills such as `notion-reminder-hook`, prove the behavioral contract requires explicit authorization before mutation and contains no committed credentials.

### Case C5: path portability

`obsidian-vault` must not preserve a stale unvalidated absolute path as an unconditional requirement. Prove current handling is configurable/detected/revalidated.

### Case C6: deterministic validation

Run the public `validate-routing.mjs --root <private-repo>` using Framework-Ref `cb88cecfd0bcb402f784f8db74bbeb04f843056f` and report the exact result.

### Case C7: unrelated-task isolation

Demonstrate that private-user entries do not become normal shared-base candidates merely because they exist. Use resolver evidence or a deterministic equivalent consistent with the public scope model.

## Acceptance criteria

Phase C is READY_FOR_REVIEW only when:

- private canonical repository exists and is confirmed private
- private Draft PR exists and is linked from public PR #4
- all six approved items have an explicit migration disposition
- retained routable Skills have `scope: private-user` metadata
- private registry validates against the pinned public framework tooling
- no secrets are committed
- stale absolute paths are removed, parameterized, discovered, or explicitly revalidated
- external writes require explicit authorization
- unrelated engineering tasks do not admit private-user Skills by default
- public repo contains no substantive private Skill content
- `skills-cursor-intake` remains archive/evidence only
- Phase D-F changes are absent

## Explicit out of scope

Do NOT:

- migrate lobster/manmanlu/project-local content
- pin/import `last30days`
- implement third-party lock work beyond existing Phase A/B foundation
- relink or delete local Cursor/Agents Skill roots
- change account-level user preferences
- promote `design-an-interface`, `find-skills`, `qa`, or Zeabur work into shared-base
- merge either public PR #4 or the private Phase C PR
- begin Phase D, E, or F

## Skill Plan

Primary: `implement`

Supporting:

- `writing-for-agents` for durable Skill/registry contracts
- `code-review` at completion

Use evidence-first investigation before adapting each captured workflow. Do not mechanically copy private intake files when their environment assumptions are stale.

## Completion report

When done, post to public PR #4:

- `STATUS: READY_FOR_REVIEW`
- private repository name and confirmation that visibility is private
- private Draft PR URL and head SHA
- disposition table for all six approved items
- validator command/result
- Cases C1-C7 evidence summary
- secret/private-data scan result
- any intentionally retired/non-routable item and rationale
- `PHASE D-F CHANGES: None`

Then stop and wait for Controller Review.
