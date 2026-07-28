# Product

## Register

product

## Users

A Russian college's electronic journal (электронный журнал), serving three roles that all matter equally:

- **Teachers** — mark attendance and grades, often quickly between or during lessons, frequently on a phone or a shared classroom PC. Need speed, big tap targets, and zero ambiguity about what they just recorded.
- **Admins / staff** — manage groups, schedules, specialties, semesters, subjects, users, journals, and reports. Power users, mostly on desktop, working with dense tables and bulk actions, scoped to their specialty.
- **Students** — check their own schedule, grades, attendance, and lab results. Mobile-first, glanceable, low-friction; they read more than they edit.

The shared job: keep an accurate, official academic record and make the day's information (who's present, what's scheduled, what was graded) fast to find and trust.

## Product Purpose

A role-based system of record for attendance, schedules, grade journals, and academic reporting at a college. It exists to replace cluttered legacy university portals and paper journals with something fast, correct, and pleasant to use across phone and desktop. Success looks like: a teacher marks a full group's attendance in seconds without a mistake; an admin builds and scopes a schedule without fighting the UI; a student finds their grade or next lesson at a glance.

## Brand Personality

**Calm, trustworthy, precise.** This is an official institutional record, so the interface should feel like a well-run registrar's office: quiet, reliable, and out of the way. Confidence comes from clarity and correctness, not decoration. The restrained indigo (hue 274) accent and tinted-neutral surfaces already in the codebase carry this — institutional but contemporary, never sterile. Motion is supportive and brief, signalling state and continuity, never performing.

## Anti-references

- **Legacy gov/university portals** — cluttered, cramped, gray 2000s-era systems with broken layouts and confusing IA. The thing we exist to be better than.
- **Generic AI SaaS** — cream backgrounds, gradient text, all-caps eyebrow kickers above every section, endless identical icon-card grids. The "AI made this" template.
- **Heavy enterprise (SAP / 1C-style)** — overwhelming toolbars, nested panels, density-for-its-own-sake. Dense where data demands it, never by reflex.
- **Playful / gamified** — mascots, badges, confetti, bright childish color. Too casual for an official academic record.

## Design Principles

1. **Correctness is the feature.** The user must always be certain what state they just recorded (present/absent, grade, scheduled). Unambiguous status, clear confirmation, reversible actions.
2. **Same system, three contexts.** One coherent design language flexes from a teacher's fast phone-tap flow to an admin's dense desktop table to a student's glanceable read. Don't fork the look; flex the density.
3. **Quiet by default, legible always.** Restraint over decoration; indigo accent earns its appearances. Body text and status always clear the WCAG AA bar — never light-gray-for-elegance.
4. **Speed is respect.** These users are between lessons. Few clicks, large targets, fast feedback, no dead ends.
5. **Trustworthy, not flashy.** Motion and color signal and reassure; they never show off. If an effect doesn't help someone do their job, it's out.

## Accessibility & Inclusion

- **WCAG AA contrast** — body text ≥4.5:1, large/bold ≥3:1, visible focus rings. The institutional default, enforced.
- **Mobile / touch first** — teachers and students are largely on phones; large tap targets and thumb-reachable primary actions.
- **Reduced motion respected** — `prefers-reduced-motion` honored across the full animation vocabulary (already partly implemented in globals.css).
- **Print-friendly** — journals and attendance sheets print cleanly on white, including from dark theme (already partly implemented).
