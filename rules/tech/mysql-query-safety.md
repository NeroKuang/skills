# MySQL Query Safety Rule

Context-selected for list endpoints, pagination, COUNT queries, and SQL visibility filters on large tables.

## Portable prohibitions on hot list paths

- Do not use correlated `EXISTS` / `IN` subqueries that rescan a large table for every outer row.
- Do not implement orthography / variant matching with nested SQL `REPLACE` chains in list `WHERE` clauses.
- Do not use leading-wildcard `LIKE '%…%'` as a list-visibility condition on large tables.
- Do not repair missing mappings with online full-table comparison. Prefer offline mapping tables or maintained counter columns that list queries can read through indexes.

## Preferred patterns

- Index-friendly visibility fields or counters.
- Small mapping-table `EXISTS` predicates keyed by the outer row id.
- Broader matching only on single-entity detail paths after an indexed lookup.
- Search through full-text indexes or a search engine; use the database as a narrow fallback.
- Alias / variant normalization in application code or offline jobs, not list SQL.

## Change checklist

Before shipping a list/COUNT change:

1. Estimate cost per outer row.
2. `EXPLAIN` the COUNT query.
3. Watch for `DEPENDENT SUBQUERY` plus full scans on large tables.
4. Confirm new `orWhere` / `orWhereExists` conditions do not run on every list request including COUNT.

If latency spikes after a list-condition change, roll back the query condition before scaling hardware.

## Out of scope for this shared Rule

Private incident narratives, private schema names, private endpoints, and customer/system identifiers belong in project-local incident docs, not in this shared Rule.

## Not a Skill

This Rule constrains SQL safety inside the selected workflow Skill.
