# Present Sir

A responsive web application for Indian college students and class representatives (CRs):
**attendance intelligence + classroom coordination + what-was-taught tracking + academic planning.**

> The flagship feature is the **Lecture Log** — it answers *“Aaj class mein kya padhaya?”* and connects a
> topic to its notes, PYQs and missed-class recovery.

---

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 App Router + TypeScript (server components + server actions) |
| Styling | Tailwind CSS v4 · custom dark-first design system (`src/app/globals.css`) |
| Database | PostgreSQL via Drizzle ORM (`src/db/schema.ts`) |
| Auth | Cookie sessions with scrypt password hashing, enforced server-side |
| Validation | Zod-style guards + server-side permission checks |
| Tests | `node:test` unit tests · Playwright E2E (360 / 768 / 1440 px) |

> **Note:** The intended specifies Supabase for backend/auth/RLS. This implementation uses a
> local PostgreSQL instance with equivalent guarantees in the app layer —
> `src/lib/auth.ts` + `src/lib/actions/*` perform membership/role checks on every read and write.
> Swapping in Supabase later only touches this layer.

---

## Features

- **Home** (`/home`) — today’s classes with one-tap Present / Absent / Cancelled, today’s lecture
  topics, attendance risk (worst first), due soon, next exam, classroom activity, missed-class
  catch-up cards.

- **Attendance Engine** (`src/lib/attendance-engine`) — deterministic math, zero AI:
  `currentPct = A/T`, `safeSkips = floor((A - mT)/m)`,
  `recoveryNeeded = ceil((mT - A)/(1 - m))`, cumulative leave planning and semester forecasting.
  Cancelled/holiday classes never enter the denominator.

- **Attendance Screens** — `/attendance`, `/attendance/[subjectId]`, `/what-if` (live sliders, no
  Calculate button), `/budget`, `/leave`, `/forecast`, `/proofs`.

- **Classroom** — create/join by code, feed, timetable, lecture log, assignments, exams/datesheet,
  resources (notes / PYQs / books / videos), study groups, members & roles, classroom settings.

- **Planner** — month and week views merging classes, assignments, exams, personal events and leave
  plans.

- **Search** (`/search?q=normalization`) — across lecture logs, resources, PYQs, assignments, exams
  and announcements.

- **Profile / Settings** — language (English + हिंदी), attendance threshold, notifications, JSON
  export.

---

## Lecture Log Permission Modes

| Mode | Description |
| --- | --- |
| `cr_only` | Only the CR can post |
| `cr_contributors` *(default)* | CR + approved contributors |
| `open_approved` | Anyone can post; entries land in an approval queue |
| `open` | Anyone can post directly |

Enforced in `canCreateLectureLog()` on the server, not by hiding UI.

---

## Class Cancellation

When a CR cancels a class, `cancelClassAction` writes a cancellation record, converts every
member’s entry for that slot to `cancelled`, and posts to the feed — so the class leaves
**everyone’s** attendance denominator.

---

## Getting Started

```bash
npm install
npx drizzle-kit push --config drizzle.config.json   # apply schema
npx tsx src/db/seed.ts                               # seed the demo classroom
npm run dev
```

### Demo Data

CSE · Semester 5 · Section A · 6 subjects (DBMS, OS, DSA, CN, TOC, AI), Mon–Sat timetable with
labs, six weeks of attendance history (including CR-cancelled classes and a medical leave), 40
lecture logs, assignments, a datesheet, notes + PYQs, announcements and a study group.

| Account | Email | Password |
| --- | --- | --- |
| CR | `cr@present.sir` | `presentsir` |
| Student | `student@present.sir` | `presentsir` |

- **Join code:** `CSE5A1`
- Or press **“Try the demo class”** on the landing page.

---

## Tests

```bash
# Unit tests — attendance engine
npx tsx --test src/lib/attendance-engine/__tests__/attendance-engine.test.ts

# i18n key/copy regression
npx tsx --test src/lib/i18n/__tests__/design.test.ts

# E2E — layout, interactions, reduced motion, auth, deep links
npx playwright test
```

**Unit test coverage:** zero classes, exact minimum, below/above minimum bands, safe skips,
recovery, 100% minimum, cancelled/holiday exclusion, medical-leave policy, extra classes, what-if
simulation and cumulative leave planning.

---

## Visual Design

The interface uses a cinematic dark-first design system — absolute black surfaces, charcoal
elevated panels, large uppercase display typography, zero-radius controls, and gold (`#FFC000`)
primary CTAs. Typography is set in Roboto + Noto Sans Devanagari (open-license, bundled locally).

- Semantic attendance colors (green / amber / red bands) preserved across themes.
- Bilingual support — English + हिंदी throughout.
- Four-tab mobile navigation with accessible motion preferences.
- The landing page includes a live engine-powered what-if example and real demo deep links.

---

## Motion & Interaction System

Built across four levels — **nothing breaks the data-dense product**, and **everything degrades
gracefully** for touch devices and `prefers-reduced-motion`.

| Level | What Ships | Where |
| --- | --- | --- |
| 1 — Clean | Fluid page transitions, staggered entrance reveals, hover transitions, physics-based button press + shine sweep, image zoom, split-text reveals, sticky blurred nav, skeleton + shimmer loaders | Every app route |
| 2 — Premium | Magnetic cursor (aura + dot), magnetic buttons, scroll-linked animation, spotlight + animated border on cards, 3D perspective tilt, parallax layers, animated mesh gradient, film grain | App + Landing |
| 3 — Award-worthy | Smooth scrolling, sticky storytelling, horizontal scroll-driven section, velocity-reactive skew, SVG displacement, SVG path draw, pixel transitions, kinetic typography, infinite drag menu | Landing |
| 4 — Experimental | Particle typography (canvas 2D, pointer-repelling particles), text pressure (letters compress near pointer), physics-based magnetic settling | Landing |

### Key Files

```
src/app/globals.css                motion tokens, 25+ keyframes, effect utilities, reduced-motion rules
src/lib/motion/hooks.ts            useInView, useVisible, useScrollProgress, useMagnetic, useTilt
src/components/motion/index.tsx    Reveal, Stagger, SplitText, Kinetic, Magnetic, TiltCard, SpotlightCard, etc.
src/components/motion/Provider.tsx MotionProvider (cursor, grain, scroll, velocity, spotlight, SVG filters)
src/components/motion/*.tsx        ParticleText, TextPressure, ScrollStory, Skeleton
src/app/template.tsx               remounts per navigation → fluid page transition
src/app/**/loading.tsx             skeleton loaders for every primary route
```

### Accessibility & Performance

- `prefers-reduced-motion: reduce` disables every animation, transition, parallax, grain, cursor
  and mesh layer; particle/pressure components render static text instead.
- **Settings → Motion** stores an explicit on/off choice in `localStorage`; `html.motion-off`
  collapses all durations to 1 ms.
- Hover effects are wrapped in `@media (hover: hover) and (pointer: fine)` — touch devices never
  get sticky hover states.
- All `rAF` loops are gated by `IntersectionObserver` visibility and `document.hidden`, and cancel
  on unmount.
- Particle count adapts to viewport width (capped), with DPR-aware canvas sizing.
- Entrance animations use `opacity` / `transform` / `filter` only — no layout thrash.

---

## Roadmap

Phases 0–4 are implemented (foundation, solo attendance, classroom backend, lecture log, academic
hub). Phase 5 (PWA / offline, push notifications, OCR timetable import, light mode) is
intentionally not started — the architecture leaves room for it.

---
