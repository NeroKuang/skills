# Routing tooling

Phase A provides deterministic Skill index generation and routing validation.

## Commands

Build the Skill index:

```bash
node scripts/build-skill-index.mjs
```

Default output:

```text
routing/generated/skill-index.json
```

Validate routing metadata:

```bash
node scripts/validate-routing.mjs
```

Run Cases A-E:

```bash
node tests/routing/run-cases.mjs
node tests/routing/run-cases.mjs --demo
```

## Design notes

- `SKILL.md` is the behavioral source of truth.
- `routing.yaml` is routing metadata only.
- Filtering order: scope -> actor -> capability -> phase.
- Project-local mismatches are removed before semantic Skill selection.
- `~/.cursor/skills` and `~/.agents/skills` are never canonical sources.
- Third-party Skills require `third-party/skills.lock.yaml` provenance plus a pinned ref.
- Task-contract `includeSkills` cannot bypass third-party admission.
- Lock and overlay `source` / `ref` must agree; the lock is authoritative.
- `build-skill-index` validates metadata before writing and fails closed on invalid input.
