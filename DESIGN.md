---
name: Электронный журнал (kbpej)
description: College attendance & grade journal as a data command-center — cool neutral surfaces, cyan accent, real charts, mono numerals.
colors:
  primary: "oklch(0.64 0.11 218)"
  primary-foreground: "oklch(0.99 0.005 220)"
  background: "oklch(0.975 0.003 240)"
  foreground: "oklch(0.2 0.012 255)"
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.2 0.012 255)"
  secondary: "oklch(0.955 0.004 240)"
  secondary-foreground: "oklch(0.27 0.012 255)"
  muted: "oklch(0.96 0.004 240)"
  muted-foreground: "oklch(0.5 0.012 250)"
  accent: "oklch(0.95 0.03 220)"
  accent-foreground: "oklch(0.45 0.1 220)"
  border: "oklch(0.91 0.005 240)"
  destructive: "oklch(0.6 0.2 18)"
  success: "oklch(0.62 0.13 150)"
  background-dark: "oklch(0.16 0.006 255)"
  card-dark: "oklch(0.205 0.007 255)"
  primary-dark: "oklch(0.8 0.13 215)"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.65625rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.06em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  pill: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: "20px"
  kpi-tile:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: "20px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "4px 12px"
---

# Design System: Электронный журнал (kbpej)

## 1. Overview

**Creative North Star: "The Command Center"**

A data command-center for an academic record. Cool neutral surfaces (a hair of blue, not warm), white panels separated by thin borders and soft shadows, and a single confident **cyan** accent for action, focus, and live state. Numbers, codes, and micro-labels are set in a monospace; the UI runs on Inter — sharp, neutral, screen-optimised. The flagship surface — the **Обзор** — leads with KPI tiles + sparklines, an 8-week trend chart, a current-semester panel, and a **group × day absence heatmap**: real data viz that makes oversight feel powerful, not a Bootstrap admin.

The system rejects four things by name: the **cramped gray legacy university portal** (density as neglect); the **generic AI-SaaS template** — especially the **indigo/violet accent on tinted near-white shadcn cards** that reads "generated"; **heavy enterprise** (toolbar-on-toolbar); and **gamification** (mascots, confetti, childish color). The "wow" here comes from ambition and craft — composition, data viz, big confident numbers — not from effects.

Light theme is a crisp daytime command-center; dark theme is a deep, cool control room with bright cyan. Both are first-class.

**Key Characteristics:**
- One cyan accent (hue ~215–218), for action / active / live / focus
- Cool neutral surfaces; panels via thin border + soft shadow
- Inter for UI & display; JetBrains Mono for data / codes / labels
- Signature data viz: KPI sparklines, 8-week trend, absence heatmap
- Status stays semantic green/red; cyan is the brand/action voice
- WCAG AA contrast; touch-first; print-clean journals

## 2. Colors

A restrained command-center palette: one cyan over cool neutrals, status reserved for meaning.

### Primary
- **Signal Cyan** (`oklch(0.64 0.11 218)` light / `oklch(0.8 0.13 215)` dark; ≈ `#1a9cb8` / `#37d2f2`): The single brand-and-action color. Primary buttons, active nav, focus rings, the live "идёт сейчас" pulse, chart lines, the brand mark.

### Neutral (cool)
- **Mist** (`oklch(0.975 0.003 240)`): Light body background — cool neutral, never warm.
- **Panel White** (`oklch(1 0 0)`): Raised panels, separated by thin border + soft shadow.
- **Ink** (`oklch(0.2 0.012 255)`): Primary text.
- **Muted Ink** (`oklch(0.5 0.012 250)`): Secondary text and labels — clears 4.5:1.
- **Hairline** (`oklch(0.91 0.005 240)`): Borders, dividers, gridlines.
- **Control Room** (`oklch(0.16 0.006 255)`): Dark-theme ground; panels lift to `oklch(0.205 0.007 255)`.

### Status & data (meaning only)
- **Present Green** (`oklch(0.62 0.13 150)`): Present / reward / success.
- **Absence Red** (`oklch(0.6 0.2 18)`): Absence, penalty, destructive, validation, heatmap intensity.

### Named Rules
**The One Voice Rule.** Cyan is the only accent and appears on a small fraction of any screen. Its rarity makes it read as *the* action.

**The Cool-Neutral Rule.** Surfaces are cool-neutral. Never warm-tint, never the indigo/violet-on-tinted-white shadcn default — that combination is the generated-app tell this design exists to escape.

**The Status-Means-Status Rule.** Green = present/reward, red = absent/penalty/destructive. In data viz, red intensity = more absences. Color is data.

## 3. Typography

**UI / Display Font:** Inter (with system-ui, sans-serif)
**Mono Font:** JetBrains Mono (with ui-monospace, monospace)

**Character:** Inter is a humanist grotesque engineered for screen legibility — sharp at 13–14px, neutral without being sterile, precise in dense tables and compact UI. JetBrains Mono carries every number, code, total, and small uppercase label; that's where the "instrument" feeling lives. Both ship full Cyrillic.

### Hierarchy
- **Display** (Inter 800, 1.875rem, -0.02em): Page titles; big KPI numerals run even larger in mono.
- **Headline** (Inter 700, 1.125rem): Panel and section titles.
- **Title** (Inter 600, 0.8125rem): Table headers, list leads.
- **Body** (Inter 400, 0.875rem, 1.5): Default text; prose capped 65–75ch.
- **Label** (JetBrains Mono 600, ~0.66rem, +0.06em, uppercase): KPI labels, column micro-labels, status tags, dates.
- **Mono** (JetBrains Mono 500, 0.8125rem): Group codes (Т-395), IDs, all tabular numerics.

### Named Rules
**The Numbers-Are-Mono Rule.** Every count, percent, total, date, and code is JetBrains Mono with tabular figures so data aligns and reads as data.

**The Cyrillic-First Rule.** Fonts must carry a real Cyrillic subset and be tested in Russian.

## 4. Elevation

Panels sit on a **thin border + a soft, low shadow** (`shadow-xs`) over the cool-neutral ground — present but quiet. Depth is structural (border + lightness step), not glassy. Hover/focus may add a slightly deeper shadow or a cyan ring; resting panels stay calm.

### Named Rules
**The Quiet-Panel Rule.** Panels read by border and a faint shadow, not by heavy drop shadows, glow, or `backdrop-blur` glass.

## 5. Components

### KPI Tile (signature)
A bordered panel: mono uppercase label, an oversized mono numeral, a pill delta (green good / red bad), and an optional inline sparkline bottom-right. The hero of the Обзор. Never the gradient hero-metric SaaS cliché — flat, bordered, data-first.

### Charts (signature)
- **Sparkline:** tiny token-colored polyline inside KPI tiles.
- **Trend chart:** area + line over the cyan primary, hairline gridlines, mono axis labels.
- **Absence heatmap:** group × day grid; cell intensity = red alpha by absence count, mono day labels, a small legend. Domain-distinctive oversight.

### Buttons
- **Shape:** Soft (`rounded-lg` ~10px); `h-9` default.
- **Primary:** Solid cyan, light text. Hover dims; active nudges 1px.
- **Ghost / Outline:** chromeless or hairline; fill `muted` on hover. Use ghost for row/toolbar actions.
- **Destructive:** tinted `destructive/10` + red text, never solid red.
- **Focus:** cyan `ring-3 ring-ring/50`. Always visible.

### Cards / Panels
- **Corner:** `rounded-xl` (~14px). **Background:** Panel White / lifted Control Room. **Elevation:** thin border + `shadow-xs`. **Padding:** 20px. Never nest panels.

### Inputs
- Transparent fill, hairline border, `rounded-lg`, `h-9`; focus → cyan border + ring, no layout shift; `aria-invalid` → destructive border. Placeholder clears 4.5:1.

### Navigation (Sidebar)
- Persistent left sidebar (`bg-sidebar`, cool neutral); active item = cyan-tinted `accent` fill + cyan text + a 3px cyan left marker; hover fills `muted`. Print-hidden.

### Brand Mark
A solid cyan rounded square with a light checkmark (attendance). No gradient, no glow.

## 6. Do's and Don'ts

### Do:
- **Do** keep cyan (`oklch(0.64 0.11 218)`) as the *only* accent, on a small fraction of each screen.
- **Do** keep surfaces cool-neutral; panels via thin border + soft shadow.
- **Do** set every number, code, total, percent, and date in JetBrains Mono with tabular figures.
- **Do** lead data surfaces with real viz (KPI sparklines, trend, heatmap), not walls of cards.
- **Do** use Present Green / Absence Red strictly as data.
- **Do** keep body text ≥4.5:1; test in Russian, both themes, and printed; honor `prefers-reduced-motion`.

### Don't:
- **Don't** reintroduce an **indigo/violet accent on tinted near-white cards** — the generic-AI-SaaS tell.
- **Don't** warm-tint the neutrals.
- **Don't** use the **gradient hero-metric** template, gradient text, glassmorphism, or `backdrop-blur` for depth.
- **Don't** look like a **cramped gray legacy university portal** or **heavy enterprise** toolbar-stack.
- **Don't** add **gamification** — mascots, confetti, badges-for-fun, childish color.
- **Don't** nest panels or use a colored `border-left`/`border-right` stripe as an accent (the cyan nav marker on the active item is the one deliberate exception).
- **Don't** ship a solid full-bleed red block; destructive is always a tint.
