---
name: NextHire
description: Calm, dark productivity UI for tracking job applications. Notion-inspired restraint (warm neutrals, sober rectangles, hairline borders, sentence-case labels) on a dark canvas with a single light-blue accent.
reference: Notion DESIGN.md from VoltAgent/awesome-design-md, adapted to dark mode
---

# NextHire Design System

All tokens live as CSS custom properties in `:root` of `style.css`. Use the tokens; don't hard-code new colors.

## Principles

1. **One accent.** `--brand` (#c2e9ff) is the only call-to-action color. Only one primary button per view region; everything else is secondary or ghost.
2. **Status color is information, not decoration.** The seven status hues appear only as small dots, the card's left bar, and tinted badges.
3. **Warm neutrals, one gray family.** Surfaces step up in small increments (`--bg` → `--surface` → `--surface-2` → `--surface-3`). Borders are hairlines.
4. **Sober geometry.** Rectangles, not pills: 8px for buttons/inputs, 12px for cards, 14px for dialogs.
5. **No glow.** Shadows are reserved for floating layers (dialogs, toasts). Buttons and cards are flat.
6. **Sentence case.** No uppercase tracking on labels, headings or badges. Title Case for buttons only.

## Color

| Token | Value | Use |
|---|---|---|
| `--bg` | #1e1e1d | Page canvas, input fill |
| `--surface` | #252524 | Cards, dialogs, sections |
| `--surface-2` | #2c2c2a | Hover, secondary buttons |
| `--surface-3` | #353533 | Active tab, pressed |
| `--border` / `--border-2` | #31302e / #3f3e3b | Hairlines / control borders |
| `--text` / `--text-2` / `--text-3` | #ebeae8 / #b4b2ad / #8f8d88 | Primary / secondary / meta (all ≥ 4.5:1 on surface) |
| `--brand` | #c2e9ff | Primary buttons, focus ring, selected state |
| `--brand-btn-text` | #0d3a5c | Text on brand fill |

### Status hues

| Status | Token |
|---|---|
| Planning | `--purple` #b9a6f5 |
| Applied | `--blue` #7cb4f5 |
| Interview Scheduled | `--yellow` #f2cc60 |
| Interviewed | `--orange` #f4a26b |
| Offer | `--green` #6fd3a4 |
| Rejected | `--red` #f28b82 |
| Withdrawn | `--muted` #9a9893 |

Badges: text in the hue, background = hue at 14% (`color-mix`), leading 6px dot. Deadlines always use `--orange`.

## Typography

Inter (Notion Sans is Inter-based), with `cv11` + `ss01` alternates.

| Role | Size / weight |
|---|---|
| Logo | 1.05rem / 700, -0.02em |
| Dialog title | 1.05rem / 600 |
| Section heading | 0.95–1rem / 600 |
| Card title | 0.98rem / 600 |
| Body | 0.875–0.95rem / 400 |
| Meta / labels | 0.8rem / 500 |
| Stat numbers | 1.6rem / 700, `tabular-nums` |

## Components

- **Primary button** (`.btn-primary`, `.btn-add`, `.btn-auth`): brand fill, 8px radius, 600 weight, no shadow.
- **Secondary button** (`.btn-secondary`, `.btn-calendar`): `--surface-2` fill + `--border-2`.
- **Ghost button** (`.btn-board-add`, `.btn-icon`, `.modal-close`): transparent until hover.
- **Card** (`.app-card`): `--surface`, 12px radius, 3px inset status bar via `::before`, tinted avatar (hue at 24% L bg / 84% L text).
- **Dialog** (`.modal`): `role="dialog"`, `aria-modal`, focus moves in on open, Tab is trapped, focus returns to the opener on close.
- **Icons**: SVG sprite in `index.html` (`#i-pin`, `#i-cal`, `#i-flag`, `#i-edit`, `#i-trash`, `#i-x`, `#i-check`, `#i-chevron`, `#i-plus`, `#i-clock`), 1.6px stroke. No emoji as UI icons.

## Interaction & accessibility rules

- Every interactive element gets the shared `:focus-visible` ring (`--focus-ring`).
- Icon-only buttons need `aria-label`.
- Clickable things are `<button>`s, or have `role="button"` + `tabindex="0"` + Enter/Space handling.
- Transitions list properties explicitly (never `transition: all`); `prefers-reduced-motion` disables motion.
- Dates go through `Intl.DateTimeFormat` / `Intl.RelativeTimeFormat` and are parsed as local dates.
- Layout must not scroll horizontally at 375px; grid columns use `minmax(0, 1fr)`.
