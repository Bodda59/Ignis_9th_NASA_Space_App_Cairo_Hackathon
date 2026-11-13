# Design system — Flame in Freefall

Rules every page follows. Tokens live in `src/index.css`; shared components in `src/components/ui/`.
Audit (WCAG 2.1 AA, axe-core on all 5 pages): **0 violations**.

## Color (dark, low-glare)

| Token | Value | Use | Contrast on bg / panel |
|---|---|---|---|
| `void` | `#08090e` | Page background (not pure black — reduces glare) | — |
| `panel` | `#0f1219` | Cards, popovers | — |
| `ink` | `#e2e5ed` | Primary text (soft off-white, avoids halation) | 15.8 / 14.9 |
| `ink-dim` | `#a7aec0` | Secondary text, descriptions | 9.0 / 8.4 |
| `ink-faint` | `#7c849c` | Labels, meta, placeholders — **lowest allowed text color** | 5.3 / 5.0 |
| `line` / `line-strong` | white 9% / 18% | Dividers, card borders (decorative) | — |
| `line-input` | white 38% | Form-field edges (WCAG 1.4.11 ≥ 3:1) | 3.5 |
| `flame` | `#6cc8ff` | Primary accent, links, focus, μg | 10.7 |
| `nebula` | `#9d8cff` | AI interpretation **only** | 7.2 |
| `ember` | `#f5a54a` | Warnings, gaps, 1g fire, synthetic data | 9.8 |
| `prevention` / `detection` / `suppression` | `#7dd3a7` / `#6cc8ff` / `#c79bff` | Safety topics — fixed everywhere | ≥ 9 |

Meaning is never color-only: every colored state also has an icon and/or text (✓ match, ⚠ gap, ✦ AI, ◌ not reported).

## Type

| Role | Font | Size |
|---|---|---|
| Display (page titles, acronyms, big numbers) | Unbounded, uppercase, tracking −0.04em | clamp 2.8–9rem |
| Section titles | Unbounded, uppercase, tracking −0.02em | 1.5–1.875rem |
| Body | Inter | 15px (long text), 13–14px (dense UI) |
| Labels / tags / units | JetBrains Mono, uppercase, tracking 0.12em | **11px minimum** |
| Numbers in tables | JetBrains Mono, `tabular-nums` | 12–15px |

Units keep their case (`kPa`, `m/s`) — wrap them in `normal-case` inside uppercase labels.

## Shape & spacing
- Cards/panels `rounded-2xl`; controls (buttons, chips, pills) `rounded-full`; inner fields `rounded-lg`.
- Page gutter `px-6 lg:px-10`, max width 1440px; sections separated by `border-t line` + `py-14`.

## Motion
- One easing everywhere: `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out), 0.3–1.2s.
- Text reveals slide up from a mask; lists stagger ≤ 0.08s per item.
- OS "reduce motion" is honored by CSS and by framer-motion (`MotionConfig reducedMotion="user"`).

## Interaction & HCI rules (Nielsen heuristics)
1. **Status visible** — every async view has skeleton → content, a refresh bar, and empty/error states. Mock mode badge is always on.
2. **Real-world language** — "Not reported", "Evidence gap", "Relevance ≠ fire danger"; no raw error codes.
3. **User control** — every selection is removable (×, Reset, Clear, New conversation); state lives in the URL so Back works.
4. **Consistency** — same component for the same job (Chip, TopicBadge, EvidenceBadge, CitationChip, StateMessage).
5. **Error prevention** — inputs validate on blur/Enter with inline messages; limits enforced (2–3 compare, 2,000 chars).
6. **Recognition over recall** — example questions, active-filter pills, scope chips.
7. **Flexibility** — Enter submits, Shift+Enter newline, keyboard arrows on the habitat orbit.
8. **Minimalist** — one accent per meaning; decorative motion sits behind content.
9. **Recover from errors** — service errors are distinct from evidence gaps and always offer Retry with inputs kept.
10. **Help** — legends, inline notes, citation hover cards.

## Accessibility checklist (keep passing)
- Visible focus ring on every interactive element (fields use border + ring).
- One `h1` per page, headings in order; results/tables have captions or sr-only headings.
- Text ≥ 11px; text color never below `ink-faint`.
