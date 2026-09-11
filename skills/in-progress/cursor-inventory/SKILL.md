---
name: cursor-inventory
description: Inventory Cursor-local Skills and Rules, create a safe redacted snapshot, and prepare it for Controller review before canonical framework changes.
---

# Cursor Inventory

Use this skill before reorganizing the shared Skills and Rules framework when the current Cursor environment contains local, project, imported, or compatibility-loaded Skills and Rules that the Controller cannot see directly.

## Purpose

Create evidence about the execution environment before normalization.

This is an intake skill, not a migration skill.

Do not rewrite, merge, remove, install, or promote Skills and Rules while collecting them.

## Required inputs

- the target project path
- a local checkout of `NeroKuang/skills`
- permission to read the relevant local Skill and Rule directories

## Procedure

### 1. Read the intake contract

Read:

```text
CURSOR_INTAKE.md
```

Treat it as authoritative for source coverage, privacy, output layout, and handoff.

### 2. Run the collector

From the `NeroKuang/skills` checkout:

```bash
node scripts/cursor-inventory.mjs --project <target-project-path> --out intake/cursor/<snapshot-id>
```

Use a snapshot id that is stable and understandable, for example:

```text
2026-09-11-desktop-main
```

### 3. Review before push

Inspect:

```text
inventory.json
inventory.md
artifacts/
manual/README.md
```

Confirm that no obvious secret or credential remains in copied artifacts.

Do not rely only on automated redaction.

### 4. Account and team rule limitation

If account User Rules or Team Rules exist only inside Cursor-managed settings, record them as manual capture required.

Do not invent their contents.

If the human provides them, save reviewed copies under `manual/` before push.

### 5. Push intake only

Create a dedicated intake branch.

Do not mix product changes, canonical Skill changes, or Rule rewrites into the intake branch.

Push the snapshot and open a pull request.

### 6. Report

Return:

```text
CURSOR INTAKE STATUS

Snapshot:
Project:
Items discovered:
Skills discovered:
Rules discovered:
AGENTS files discovered:
Imported items discovered:
Exact duplicate groups:
Manual capture required:
Redaction warnings:
Intake branch:
Intake PR:
Ready for Controller review: YES / NO
```

## Safety

Never collect or push:

- `.env`
- credentials
- browser state
- cookies
- SSH private keys
- token stores
- editor databases
- shell history

Only Skill, Rule, and AGENTS instruction content belongs in this intake.

## Completion

The skill is complete when the Controller can inspect a GitHub intake PR containing a safe snapshot and make a migration decision without asking the human to copy Cursor files into chat.
