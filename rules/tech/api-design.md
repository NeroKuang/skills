# API Design Rule

Context-selected when designing, documenting, or changing HTTP APIs.

This shared Rule encodes portable API design conventions. It is not a workflow Skill.

## Precedence

```text
existing public API contract
  > Controller-approved specification
  > shared generic API convention
```

Generic naming or style guidance in this file must never silently rewrite an existing public API contract.

## Portable conventions

- Prefer resource-oriented HTTP methods and status codes that match the operation semantics.
- Document operations with stable `operationId`, concise summary, tags, and explicit response schemas.
- Define parameter schemas and include realistic examples.
- Keep a consistent error response shape across endpoints in the same API surface.
- Document pagination clearly (page/cursor, limits, totals when applicable).
- Document authentication and authorization requirements per operation.
- Prefer ISO 8601 timestamps and explicit schema formats for dates, money, and identifiers.
- Version APIs deliberately. Do not break published contracts without an approved migration path.
- Keep OpenAPI (or equivalent) synchronized with implemented behavior when the repository maintains a spec.

## Intake note

The private Cursor intake snapshot used for Phase B did not contain a dedicated Postman/API-design Rule artifact. This file is derived from the Phase B task contract and portable API practice, not from private project examples.
