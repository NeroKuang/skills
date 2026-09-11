# Go Rule

Context-selected when the task edits Go source or Go tooling.

## Portable conventions

- Prefer the standard library. Justify new dependencies.
- Follow the repository package layout (`cmd`, `internal`, `pkg`, or the local equivalent).
- Keep package names aligned with directories. Exported APIs need brief godoc.
- Propagate errors with wrapping that preserves the chain. Do not swallow errors.
- Pass `context.Context` through HTTP, gRPC, and long-running work with timeouts or cancellation.
- Give goroutines a clear lifecycle to avoid leaks.
- Prefer table-driven tests. Run the repository's Go test target after changes.
- Align with existing lint configuration when present.
- Never hard-code secrets.

## Not a Skill

This Rule constrains Go implementation inside the selected workflow Skill.
