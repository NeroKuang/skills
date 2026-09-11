# Frontend Rule

Context-selected when the task edits UI files, frontend components, styles, or client-side flows.

## Portable conventions

- Read existing components, design tokens, CSS variables, and UI libraries before changing UI.
- Follow the repository's actual frontend stack. Do not invent a default framework.
- Confirm backend path, method, auth, and response contract before wiring UI to an API.
- Do not add packages without an explicit need and approval path.
- Prefer responsive / mobile-first layouts that match existing breakpoints.
- Use semantic HTML, labels, keyboard access, and image alt text.
- Prefer existing utility or component classes over inline styles and `!important`.
- Provide loading, empty, and error states for async UI.
- Change one screen or flow at a time. Embed into the current routing and layout instead of creating a parallel design system.
- Before completion, verify contract fields/types/pagination and exercise the key UI path.

## Not a Skill

This Rule constrains frontend implementation inside the selected workflow Skill. It is not itself a primary workflow.
