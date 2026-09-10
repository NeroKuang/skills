# Cursor Execution Flow

This document defines how Cursor joins the Nero AI Controller-Executor workflow and stays synchronized with ChatGPT.

## One-time setup

Cursor supports version-controlled Project Rules under `.cursor/rules` and can import Remote Rules from GitHub. Use the repository `https://github.com/NeroKuang/skills` as the remote rule source after the framework branch is merged to the default branch.

In Cursor:

1. Open Customize.
2. Open Rules.
3. Choose Add Rule.
4. Choose Remote Rule (GitHub).
5. Paste `https://github.com/NeroKuang/skills`.
6. Confirm the imported `nero-ai-framework.mdc` rule is active.

The imported remote rule is only the bootstrap adapter. The complete Skills and Rules library is synchronized at execution time into the current project by terminal commands.

## Shared architecture

```text
User
  |
  v
ChatGPT Controller
  |
  | creates or updates GitHub Issue
  | pins Framework-Ref
  | declares initial Skill-Plan
  v
GitHub Task Contract
  |
  v
Cursor Executor
  |
  | syncs canonical skills repository
  | validates Framework-Ref
  | performs Skill Preflight
  | executes with terminal, HTTP, code and tests
  | posts evidence to GitHub
  v
GitHub Evidence / Pull Request
  |
  v
ChatGPT Controller Review / Decision
```

## Contract between ChatGPT and Cursor

The task contract should include:

```text
Framework-Repo: NeroKuang/skills
Framework-Ref: <commit SHA>

Skill-Plan:
  Primary: <skill>
  Supporting:
    - <skill>

Mode: INVESTIGATE | IMPLEMENT | VERIFY | OPERATE
```

ChatGPT should pin `Framework-Ref` when the task is created. Cursor must use that exact framework revision for the task.

## Cursor command from the user

The normal user instruction should be only:

```text
Execute issue #N.
```

Cursor must not require the user to paste the ChatGPT analysis again.

## Full Cursor runtime sequence

### 1. Read the task

Run:

```bash
gh issue view N --comments
```

Read the complete task contract and all Controller decisions.

### 2. Synchronize Skills and Rules

The Cursor Remote Rule instructs the Agent to maintain a project-local, untracked checkout at:

```text
.cursor/.nero-framework/skills
```

If missing:

```bash
git clone https://github.com/NeroKuang/skills.git .cursor/.nero-framework/skills
```

If present:

```bash
git -C .cursor/.nero-framework/skills fetch origin --prune
```

### 3. Pin the task revision

Read `Framework-Ref` from the Issue, then:

```bash
git -C .cursor/.nero-framework/skills checkout --detach <Framework-Ref>
git -C .cursor/.nero-framework/skills rev-parse HEAD
```

The resolved SHA must equal the task contract.

### 4. Load canonical framework context

Read:

```text
FRAMEWORK.md
rules/SHARED_RULES.md
rules/CURSOR_RULES.md
skills/in-progress/skill-router/SKILL.md
routing/flows.yaml
```

Do not rely on previous Cursor conversation memory instead of these files.

### 5. Discover Skills

Run:

```bash
node .cursor/.nero-framework/skills/scripts/skill-catalog.mjs
```

Optionally filter based on task vocabulary.

The catalog is only the candidate index. Cursor must read each candidate's `SKILL.md` before selecting it.

### 6. Perform Skill Preflight

Determine:

- current phase
- task mode
- candidate skills
- primary skill
- supporting skills
- execution order
- rejected alternatives
- re-route conditions

Compare the result with the Controller's `Skill-Plan`.

### 7. Resolve plan differences

If Cursor agrees with the Controller plan, execute it.

If Cursor has local evidence for a better composition without changing scope, document a `SKILL PLAN REFINEMENT` and continue.

If the difference changes requirements, architecture, acceptance criteria, production behavior, risk, or scope, stop and post `STATUS: BLOCKED` with the evidence and decision required.

The user then tells ChatGPT:

```text
Review issue #N and decide from Cursor's evidence.
```

ChatGPT updates the GitHub Issue. The user then tells Cursor:

```text
Continue issue #N after the Controller decision.
```

Cursor re-reads all Issue comments before continuing.

### 8. Execute

Use Cursor's local capabilities as required by the task:

- source inspection
- codebase search
- git history
- terminal commands
- unit and integration tests
- build and lint
- Docker
- HTTP requests
- logs
- authorized database queries
- implementation
- deployment only when authorized

The Cursor chat is not the final record. Significant findings go back to GitHub.

### 9. Report evidence

For INVESTIGATE, post an Issue comment using the investigation report format from the bootstrap rule.

For IMPLEMENT, create a branch and Pull Request, then post branch, commit, tests, changed files, limitations, risk, framework SHA, and Skill Plan used.

### 10. Controller review

The user tells ChatGPT:

```text
Review PR #N.
```

ChatGPT reads the task contract, framework revision, Skill Plan, PR diff, and Cursor evidence, then either approves or requests changes.

### 11. Cursor addresses review

The user tells Cursor:

```text
Address the latest Controller review on PR #N.
```

Cursor must read the latest PR review and task Issue before modifying code.

### 12. Re-route when the phase changes

Do not assume the implementation Skill remains correct after investigation or review.

At every phase boundary, run Skill Preflight again and update the Skill Plan used in the evidence report.

## Example: intermittent API 500

User to ChatGPT:

```text
Our API sometimes returns 500. Handle it.
```

ChatGPT creates Issue #42:

```text
Mode: INVESTIGATE
Framework-Ref: abc123
Skill-Plan:
  Primary: diagnosing-bugs
  Supporting:
    - tdd
    - code-review
```

User to Cursor:

```text
Execute issue #42.
```

Cursor:

1. reads #42
2. syncs `NeroKuang/skills`
3. checks out `abc123`
4. loads framework rules
5. discovers skills
6. validates `diagnosing-bugs`
7. inspects code, logs, HTTP behavior and tests
8. posts evidence to #42

User to ChatGPT:

```text
Review issue #42 and decide.
```

ChatGPT may update the Issue with an implementation decision.

User to Cursor:

```text
Continue issue #42 after the Controller decision.
```

Cursor re-routes the new implementation phase, reads the selected implementation and TDD skills, changes code, runs tests, creates the PR, and returns evidence.

## Failure rules

### Framework checkout unavailable

Return `STATUS: BLOCKED` instead of guessing from remembered skills.

### `Framework-Ref` cannot be resolved

Return `STATUS: BLOCKED` with the unresolved ref and local git evidence.

### GitHub CLI is not authenticated

Report the exact missing capability. Do not ask the user to copy the whole Issue into Cursor as a normal workaround.

### No Skill matches

Return `STATUS: SKILL_GAP` so the Controller can improve the framework.

### Skill Plan conflicts with codebase reality

Provide evidence and follow the refinement or Controller-decision rules.

## What the user should no longer do

Do not manually copy long ChatGPT plans into Cursor.

Do not manually select a Skill unless intentionally overriding the router.

Do not copy Cursor investigation output back into ChatGPT when that output can be posted to GitHub.

The normal human bridge is reduced to short commands:

```text
ChatGPT: Create the task.
Cursor: Execute issue #N.
ChatGPT: Review issue/PR #N.
Cursor: Continue / address review.
```

GitHub carries the actual state between the two agents.
