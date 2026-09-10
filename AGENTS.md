Skills are organized into bucket folders under `skills/`:

- `engineering/`: daily code work
- `productivity/`: daily non-code workflow tools
- `misc/`: kept around but rarely used, not promoted
- `in-progress/`: beta: public on purpose, feedback wanted, not shipped in the plugin
- `deprecated/`: no longer used

Every skill in `engineering/` or `productivity/` (the **promoted** buckets) must have a reference in the top-level `README.md` and an entry in `.claude-plugin/plugin.json`'s `skills` array (the Claude Code plugin ships exactly the promoted set). Skills in `misc/`, `in-progress/`, and `deprecated/` must not appear in either.

Install commands are copied verbatim from [.agents/install-block.md](./.agents/install-block.md). `.claude-plugin/marketplace.json` makes the repo its own single-plugin marketplace (a fallback the install block explains, not the documented route). Run `claude plugin validate . --strict` after touching either manifest. Why a Claude plugin but not (yet) a Codex one lives in [.agents/adr/0002-ship-as-a-claude-code-plugin.md](./.agents/adr/0002-ship-as-a-claude-code-plugin.md).

Each skill entry in the top-level `README.md` must link the skill name to its `SKILL.md`.

Each bucket folder has a `README.md` that lists every skill in the bucket with a one-line description, with the skill name linked to its `SKILL.md`. The promoted buckets' `README.md`s and the top-level `README.md` group entries into **User-invoked** and **Model-invoked**; non-promoted bucket `README.md`s (`misc/`, `in-progress`) use a flat list.

Skills in `engineering/` and `productivity/` also have a human-facing docs page at `docs/<bucket>/<skill-name>.md` (the docs tree mirrors those two bucket folders under `skills/`). The published URL is `https://aihero.dev/skills-<skill-name>` regardless of bucket: the docs path is repo organisation only. When you add, rename, or change the behaviour of a skill in `engineering/` or `productivity/`, create or re-sync its docs page following [.agents/writing-docs.md](./.agents/writing-docs.md). A finished page carries four sections: **What it does**, **When to reach for it**, **Common questions**, and **It's working if**. `writing-docs.md` holds the template, the section order, and where to hunt for the questions. Skills in the non-promoted buckets (`misc/`, `in-progress`, `deprecated`) get **no** docs page.

Every `SKILL.md` is either user-invoked (`disable-model-invocation: true` plus `policy.allow_implicit_invocation: false` in `agents/openai.yaml`, reachable only by the human) or model-invoked (model- or user-reachable). See [.agents/invocation.md](./.agents/invocation.md).

[`ask-matt`](./skills/engineering/ask-matt/SKILL.md) is the human-facing router that maps user-reachable skills and how they relate. The same trigger that re-syncs a docs page applies to it: whenever you add, rename, remove, or change how a user-reachable skill fits the flows, re-read `ask-matt`'s `SKILL.md` and update it so the map stays accurate: a new skill it never mentions, or a stale one it still routes to, is a router that lies.

The cross-agent engineering framework lives in [`FRAMEWORK.md`](./FRAMEWORK.md). Shared behavioral rules live under [`rules/`](./rules/), the mandatory preflight router lives at [`skills/in-progress/skill-router/SKILL.md`](./skills/in-progress/skill-router/SKILL.md), and curated composition edges live in [`routing/flows.yaml`](./routing/flows.yaml).

For non-trivial engineering work, agents must not rely on remembered skill names alone. They must perform Skill Preflight, discover available skills, read the selected `SKILL.md` files, and compose the smallest useful ordered flow before execution.

When ChatGPT and Cursor cooperate, this repository is the canonical source of truth for both Skills and Rules. GitHub task contracts should carry a `Framework-Ref` and `Skill-Plan`. Cursor must compare that plan with the actual local repository and tool capabilities before execution. ChatGPT must inspect the canonical skill files before issuing or materially revising execution work.

Whenever a skill is added, removed, renamed, or materially changes behavior, also review and synchronize:

- `skills/in-progress/skill-router/SKILL.md`
- `routing/flows.yaml`
- `rules/SHARED_RULES.md`
- `rules/CONTROLLER_RULES.md` when Controller behavior is affected
- `rules/CURSOR_RULES.md` when Executor behavior is affected
- `skills/engineering/ask-matt/SKILL.md` when the human-facing map is affected

A skill change is incomplete until routing and applicable rules still describe the real workflow.

To (re)link every skill into the local harness skill directories (`~/.claude/skills`, `~/.agents/skills`), run `scripts/link-skills.sh`. Each entry is a symlink into this repo, so a `git pull` keeps installed skills current; re-run the script after adding, removing, or renaming a skill.

Use `node scripts/skill-catalog.mjs` to discover the current skill set locally. Filtering by a keyword is allowed, but the catalog is only a discovery aid. The selected `SKILL.md` remains authoritative.

No em-dashes anywhere in this repo's prose (`SKILL.md` files, docs, `README.md`, `CHANGELOG.md`, ADRs, changesets, code comments). Where a sentence reaches for one, rewrite it instead with a comma, colon, period, parentheses, or a conjunction, whichever the sentence actually wants; never do a blind character substitution.
