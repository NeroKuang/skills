# Technology Rules

These files are shared **Rules**, not Skills.

- Skill = process / workflow
- Rule = constraint / standard / policy

## Selection contract

Load only the technology Rules that match the active task, files, or stack.

Examples:

- editing `*.tsx` / CSS / UI components -> `frontend.md`
- editing `*.go` -> `go.md`
- editing `*.py` -> `python.md`
- Laravel / PHP application work -> `laravel.md`
- designing or changing HTTP APIs -> `api-design.md`
- list/pagination SQL or query-plan safety -> `mysql-query-safety.md`

Do not mark every technology Rule as globally always-loaded.

Technology Rules constrain the selected Skill workflow. They must not become competing primary Skills merely because a technology name appears in the task.

## Precedence

When guidance conflicts:

```text
explicit task contract
  > project-local verified contract
  > Controller-approved specification
  > shared technology Rule
  > generic convention
```

For API work specifically:

```text
existing public API contract
  > Controller-approved specification
  > shared generic API convention
```
