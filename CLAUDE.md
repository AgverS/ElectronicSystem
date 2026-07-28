# CLAUDE.md

## Commits

- Commit after every change
- One-line message only — no body
- No `Co-Authored-By` line

## This project

A demonstration build. No server, no database, no auth — see README.md.

- Data access goes through `lib/prisma.ts`, which is the in-browser demo
  database in `lib/demo-db/`. Keep writing Prisma-style queries.
- Run `pnpm check:demo-db` after touching the query engine.
- No user-facing string is hard-coded. Add a key to `lib/i18n/locales/en.ts`
  and use `useT()` (or `translate()` outside components).
- Grade and lesson-type values are language-neutral codes (`AB`, `lecture`,
  `practical`, `lab`, `assessment`) translated at render time.
