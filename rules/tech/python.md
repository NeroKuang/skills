# Python Rule

Context-selected when the task edits Python source or Python tooling.

## Portable conventions

- Use the repository's existing environment and dependency files. Do not silently major-upgrade runtimes or packages.
- Prefer the standard library for scripts and internal tools unless a dependency already exists.
- Add type hints on public or complex APIs. Follow the repo formatter/linter (Ruff, Black, or PEP 8).
- Keep modules focused. Avoid growing a single file into an unrelated toolbox.
- For web frameworks, validate at schema/serializer boundaries and keep business logic out of thin view layers.
- Treat the repository's existing API docs or endpoints as the contract source.
- Run pytest or the project test command when present.
- Do not hard-code secrets.

## Not a Skill

This Rule constrains Python implementation inside the selected workflow Skill.
