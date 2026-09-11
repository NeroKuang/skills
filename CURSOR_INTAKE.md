# Cursor Skills and Rules Intake

This document defines the intake interface used to inventory Cursor-local Skills and Rules before they are normalized into the shared `NeroKuang/skills` framework.

## Goal

Before changing the canonical Skills and Rules library, collect what Cursor is actually using.

The intake must answer:

- What Skills exist?
- What Rules exist?
- Where did each item come from?
- Is it project-level, user-level, imported, or compatibility-loaded?
- Which items are duplicates or near-duplicates?
- Which items are likely to conflict?
- Which items should remain local instead of becoming canonical?
- Which capabilities are not available from the file system and therefore require manual capture?

Intake is inventory only. Do not merge, rename, rewrite, delete, or promote Skills and Rules during collection.

## Cursor sources to inspect

Cursor currently loads project and user Skills from several compatible locations.

Project-level Skill roots:

```text
.cursor/skills/
.agents/skills/
.claude/skills/
.codex/skills/
```

User-level Skill roots:

```text
~/.cursor/skills/
~/.agents/skills/
~/.claude/skills/
~/.codex/skills/
```

Project Rules:

```text
.cursor/rules/**/*.mdc
```

Project instruction files:

```text
AGENTS.md
**/AGENTS.md
```

Machine-local Rule files:

```text
~/.cursor/rules/**/*.mdc
```

Imported Remote Rules are normally found beneath a project's imported rule directory. They must be marked as imported instead of being treated as original local rules.

## Sources that cannot be assumed to exist as local files

Cursor account User Rules configured in Customize and server-managed Team Rules are not guaranteed to be available as ordinary local files.

The inventory must record these as `manual_capture_required` when they cannot be read safely from disk.

Do not invent their contents.

If the human wants them included, capture them manually into the snapshot under:

```text
manual/account-user-rules.md
manual/team-rules.md
```

The human should review those files for secrets before pushing them.

## Snapshot format

A complete intake snapshot contains:

```text
intake/cursor/<snapshot-id>/
  inventory.json
  inventory.md
  artifacts/
    skills/
    rules/
    agents/
  manual/
    README.md
```

`inventory.json` is the machine-readable source of truth for intake analysis.

`inventory.md` is the human-readable summary.

`artifacts/` contains redacted copies of readable Skill and Rule files.

## Privacy and secret handling

Never upload raw secrets as part of an intake.

The collector must redact obvious credentials from copied text and must not copy:

- `.env` files
- credential stores
- SSH keys
- browser state
- cookies
- authentication databases
- editor databases
- shell history

The original source path should be normalized so the user's home directory is represented as `~` in the manifest.

The inventory is allowed to include file hashes, normalized paths, scope, source type, and redacted text copies.

## Duplicate handling

The intake collector hashes normalized redacted content.

Exact duplicate hashes should be grouped in the inventory, but no duplicate should be deleted during intake.

Near-duplicate and semantic duplicate decisions belong to the Controller after the snapshot is pushed.

## Cursor execution sequence

From the `NeroKuang/skills` checkout:

```bash
node scripts/cursor-inventory.mjs --project <target-project-path> --out intake/cursor/<snapshot-id>
```

Review the generated summary before committing.

Then create an intake branch:

```bash
git checkout -b intake/cursor-<snapshot-id>
git add intake/cursor/<snapshot-id>
git commit -m "chore: add Cursor skills and rules inventory <snapshot-id>"
git push -u origin intake/cursor-<snapshot-id>
```

Create a pull request whose title begins with:

```text
intake: Cursor skills and rules
```

Do not merge the intake PR before Controller review.

## Controller review sequence

When the intake PR exists, ChatGPT should:

1. Read `inventory.json` and `inventory.md`.
2. Inspect all collected Skill and Rule artifacts that are relevant to overlaps or conflicts.
3. Group exact duplicates by content hash.
4. Identify semantic duplicates.
5. Identify Rules that should remain project-local.
6. Identify Rules that should become shared Rules.
7. Identify Skills that should become canonical Skills.
8. Identify Skills that overlap and should be composed rather than merged.
9. Identify router changes required by the collected Skills.
10. Propose a migration plan before changing canonical files.

## Intake status report

Cursor should finish by reporting:

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

## Non-goals

The intake process does not decide which Skill is best.

The intake process does not rewrite local Rules.

The intake process does not install or uninstall Skills.

The intake process does not modify product code.

Its only job is to create a safe, reviewable snapshot that both Cursor and ChatGPT can inspect through GitHub.
