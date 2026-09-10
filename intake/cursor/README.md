# Cursor Intake

This directory receives review-only snapshots of Cursor-local Skills and Rules.

Each snapshot should live under its own directory:

```text
intake/cursor/<snapshot-id>/
```

Generate a snapshot with:

```bash
node scripts/cursor-inventory.mjs --project <target-project-path> --out intake/cursor/<snapshot-id>
```

Push snapshots on dedicated `intake/cursor-*` branches and open pull requests for Controller review.

Do not normalize, merge, rename, or promote collected items inside an intake pull request.

See `CURSOR_INTAKE.md` for the complete protocol.
