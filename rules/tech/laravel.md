# Laravel Rule

Context-selected when the task edits Laravel / PHP application code.

## Portable conventions

- Read the framework version from `composer.json` before choosing syntax or features.
- Follow the repository's existing structure (Actions, Services, Repositories, or whatever is already established). Do not impose a conflicting layering style.
- Keep controllers thin. Put business logic in Services, Actions, or domain objects already used by the project.
- Validate with Form Requests. Authorize with Policies or Gates.
- Prefer API Resources for list/detail responses and match the project's error envelope.
- Use Eloquent directly for simple CRUD. Extract query objects or repositories only when complexity earns them.
- Put slow work on queues/jobs when the project already uses them.
- Prefer reversible migrations. Call out destructive changes and rollback strategy. Avoid N+1 queries.
- Be explicit about mass assignment. Escape Blade output by default. Validate upload type and size.
- Follow the project's existing web session/CSRF and API auth conventions.
- Prefer `config()` over runtime `env()` in application code.
- Be careful with cache helpers that can cache null results or reuse stale query builders across closures.
- Prefer query-level `count()` over loading collections only to count them.
- Validate JSON decode results before indexing.
- For list/pagination COUNT safety, also apply `mysql-query-safety.md`.

## Out of scope for this shared Rule

Project-specific topologies, private service assumptions, private incident history, and private schema or endpoint catalogs belong in project-local Rules, not here.

## Not a Skill

This Rule constrains Laravel implementation inside the selected workflow Skill.
