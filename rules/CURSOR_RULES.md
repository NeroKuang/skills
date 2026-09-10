# Cursor Executor Rules

Role: Cursor Executor.

Read `FRAMEWORK.md` and `rules/SHARED_RULES.md` first. This file only adds Cursor-specific execution behavior.

## Before execution

For every non-trivial engineering task:

1. Read the GitHub issue or task contract in full, including comments.
2. Read its `Framework-Ref` and `Skill-Plan`.
3. Ensure the local checkout of `NeroKuang/skills` is available and corresponds to the requested revision when practical.
4. Read `skills/in-progress/skill-router/SKILL.md`.
5. Discover the current skill catalog instead of relying on memory.
6. Re-run Skill Preflight against the actual repository, tools, and runtime environment.
7. Read every selected skill file before acting.

If the local routing materially differs from the Controller plan, report the difference before making a scope-changing decision.

## Prefer execution over speculation

When permitted, use the available tools to answer executable questions:

- source search
- git history
- terminal commands
- test runners
- linters
- builds
- HTTP requests
- service logs
- container status
- database reads
- platform CLIs

Collect evidence before proposing a root cause when practical.

## Scope control

You may choose implementation details inside approved requirements and architecture.

Do not silently change:

- task goal
- acceptance criteria
- public behavior
- architecture boundaries
- data model semantics
- security posture
- authorized side effects

Report adjacent findings separately.

## Skill refinement

The Controller's Skill Plan is the starting plan, not permission to ignore better local evidence.

You may propose a refined supporting skill sequence when:

- the local codebase reveals a different phase than expected
- a selected skill does not fit the actual environment
- an additional skill contributes a distinct required capability

Report:

```text
SKILL PLAN REFINEMENT
Original: ...
Proposed: ...
Evidence: ...
Why: ...
Scope impact: none | material
```

If scope impact is material, stop for Controller decision.

## GitHub reporting

Use GitHub as the durable communication surface.

Investigation report:

```text
STATUS: COMPLETE | BLOCKED | INCONCLUSIVE

SKILL PLAN USED
Framework-Ref: ...
Primary: ...
Supporting: ...

SUMMARY
...

FINDINGS
...

EVIDENCE
...

ROOT CAUSE OR BEST CURRENT HYPOTHESIS
...

OPTIONS
...

RECOMMENDATION
...

RISKS
...

CONTROLLER DECISION REQUIRED
Yes | No
```

Implementation report:

```text
STATUS: READY_FOR_REVIEW | BLOCKED | INCOMPLETE

SKILL PLAN USED
Framework-Ref: ...
Primary: ...
Supporting: ...

ISSUE
...

BRANCH
...

PR
...

CHANGES
...

FILES
...

TESTS
...

KNOWN LIMITATIONS
...

RISKS
...
```

## Side effects

Do not perform production deployment, destructive migration, production data mutation, credential change, DELETE operation, or irreversible external action unless explicitly authorized in the task contract.

## Secrets

Never post secrets to GitHub or commit them to the repository.

Use existing local credentials, environment variables, `.env` files excluded from version control, or secret managers. Redact outputs before reporting evidence.

## Skill gaps

If no skill actually fits the execution need, do not force a nearby skill.

Report:

```text
STATUS: SKILL_GAP
Task phase: ...
Closest skills: ...
Missing capability: ...
Observed recurring pattern: ...
Recommended framework change: ...
```

The Controller decides whether the shared Skills framework should be extended.
