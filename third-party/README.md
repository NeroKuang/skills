# Third-party Skill lock foundation (Phase A)

This directory holds provenance locks and routing overlays for externally
maintained Skills.

Phase A ships the layout and synthetic examples only. Do not migrate
`last30days` here yet.

## Layout

```text
third-party/
  skills.lock.yaml
  routing/
    <skill-id>.yaml
```

## Lock entry shape

```yaml
schema_version: 1
skills:
  - id: example-synth-research
    source: https://github.com/example/synth-research-skill
    ref: <pinned-commit-or-tag>
    trust: third-party
    routing_metadata: third-party/routing/example-synth-research.yaml
```

## Overlay rules

- Overlays provide routing metadata only.
- Upstream `SKILL.md` remains the behavioral source of truth.
- An overlay without a matching lock entry is invalid and must not be admitted.
