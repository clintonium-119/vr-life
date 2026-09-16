---
note_type: knowledge
template_version: 1
contract_version: 1
knowledge_id: "KNOW-0009"
category: taxonomy
title: "Bug Taxonomy"
status: planned
owner: ""
created: '2026-09-16'
updated: '2026-09-16'
reviewed_on: "2026-09-16"
related_notes: []
tags: [apovault, knowledge, taxonomy]
---

# Bug Taxonomy

> **(verify)** — Team-owned content; not codebase-extractable.
>
> Expected answers when this section is filled:
>
> - [ ] What is the severity ladder? (sev-1 through sev-4 in team terms)
> - [ ] What is the category enum? (logic, integration, regression, performance, ux, docs, test)
> - [ ] What are the lifecycle steps?
> - [ ] What is the primary tracker? (vault, JIRA, GitHub issues)
>
> Look at: Team workflow, issue tracker configuration when set up

## Known build/environment gotchas

### `NODE_ENV=development` in the shell silently emits a dev-env production bundle

**Category:** integration (build environment). **Confidence:** high — reproduced twice during the Phase 0 scaffold run.

This machine's login shell exports `NODE_ENV=development`. Vite derives `import.meta.env.PROD` and `import.meta.env.DEV` from `process.env.NODE_ENV`, **not** from the build mode. So a plain `npm run build` in this shell produced a bundle with `PROD:false, DEV:true` while `MODE:'production'` — an internally inconsistent, dev-flavored production bundle. The concrete consequence: the `import.meta.env.PROD` force-off guard for dev flags compiled away, so `?dev=1` was still live in the "production" build.

**Do:** build production artifacts on this box with `NODE_ENV` cleared — `env -u NODE_ENV npm run build` (or `unset NODE_ENV` first). **Do not:** trust `import.meta.env.MODE === 'production'` as the production signal here, and do not assume a passing `vite build` is a real production bundle; verify by grepping the emitted JS for a known prod-only branch or by logging `import.meta.env.PROD` in a scratch build.

CI (GitHub Actions) is not affected — it has no ambient `NODE_ENV` — so this is a local-dev verification trap, not a shipped-artifact defect.
