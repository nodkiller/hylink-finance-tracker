# Design System — Hylink Finance Tracker

## Product Context
- **What this is:** Internal financial management system for tracking marketing project revenues, expenses, approvals, and supplier payments
- **Who it's for:** Finance team members (payment processing), Controllers/Admins (approvals), MD/Head (profit visibility)
- **Space/industry:** Internal finance tooling for a marketing agency (Hylink)
- **Project type:** Web app / dashboard / internal tool

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian — function-first, data-dense, clean. Every pixel earns its place by making numbers readable and status obvious.
- **Decoration level:** Minimal — subtle SVG background curve in layout. No gradients, illustrations, or hero sections.
- **Mood:** Professional, trustworthy, quietly confident. The tool says "we respect your time" through restraint. Data is the design.
- **Reference sites:** Stripe Dashboard, Mercury, Xero, QuickBooks (blue-primary trust palette, card-based KPIs, clean data tables)

## Typography
- **Display/Hero:** Inter 700 — industry standard for data-heavy UIs, excellent number rendering
- **Body:** Inter 400/500 — clean readability at all sizes
- **UI/Labels:** Inter 500/600 — 11-12px uppercase with letter-spacing for section headers and labels
- **Data/Tables:** Inter 600 with `font-variant-numeric: tabular-nums` — ALL financial figures must use tabular-nums for column alignment
- **Chinese:** Noto Sans SC 300/400/500/700 — full CJK coverage, pairs cleanly with Inter
- **Code:** Geist Mono (via Next.js font)
- **Loading:** Google Fonts via `next/font/google` (Inter + Noto Sans SC)
- **Scale:**
  - xs: 11px / 0.6875rem — labels, badges
  - sm: 12px / 0.75rem — captions, metadata
  - base: 14px / 0.875rem — body text, table cells
  - md: 15px / 0.9375rem — body emphasis
  - lg: 16px / 1rem — section headers
  - xl: 20px / 1.25rem — page titles
  - 2xl: 26-28px / 1.625-1.75rem — KPI values
  - 3xl: 36-42px / 2.25-2.625rem — hero/display

## Color
- **Approach:** Balanced — primary + secondary + semantic colors for clear hierarchy
- **Primary (interactive):** `#2563eb` — buttons, links, active states, interactive elements
- **Deep blue (brand):** `#1e40af` — sidebar background, page headings, brand anchoring
- **Accent blue:** `#3b82f6` — highlights, hover states, chart accents
- **Neutrals:** Slate scale (cool grays)
  - Background: `#f8fafc`
  - Card: `#ffffff`
  - Border: `#e2e8f0`
  - Text primary: `#0f172a`
  - Text secondary: `#64748b`
  - Text muted: `#94a3b8`
- **Semantic:**
  - Success/Income/Paid: `#16a34a` — revenue, profit, paid status, positive deltas
  - Danger/Expense/Loss: `#dc2626` — expenses, errors, rejected, negative deltas
  - Warning/Pending: `#f59e0b` — pending approval, due soon, overdue warnings
  - Info: `#2563eb` — informational alerts, completed status
- **Status badge pattern (consistent everywhere):**
  - Active/Paid: `bg-[color]/10 text-[color] border-[color]/25` using success green
  - Pending: same pattern using warning amber
  - Completed: same pattern using info blue
  - Rejected: same pattern using danger red
  - Reconciled: `bg-gray-100 text-gray-500 border-gray-200`
- **Dark mode:** Reduce saturation ~10-20%, invert surface hierarchy (dark bg `#0f172a`, card `#1e293b`), borders at `rgba(255,255,255,0.1)`

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — not cramped, not wasteful
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)
- **Component padding:** Cards 20-24px, table cells 14-16px, buttons 10-20px, inputs 10-14px
- **Section gaps:** 24px between cards, 32-48px between page sections

## Layout
- **Approach:** Grid-disciplined — strict card grid for KPIs, data tables for lists
- **Grid:** Sidebar (220px fixed) + fluid content area
- **KPI cards:** 4-column grid on desktop, 2-column on mobile
- **Data tables:** Full-width within content area, responsive card layout on mobile (<768px)
- **Max content width:** Fluid (fills available space minus sidebar)
- **Border radius:** Hierarchical — sm:6px (inputs, badges), md:8px (buttons, alerts), lg:10px (cards, panels), xl:12px (containers), full:9999px (pills/badges)

## Motion
- **Approach:** Minimal-functional — only transitions that aid comprehension
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms)
- **Existing animations:**
  - Page fade-in: 0.22s ease-out (opacity + translateY 5px)
  - Content fade-in-up: 0.28s ease-out (opacity + translateY 8px)
  - Skeleton shimmer: 1.5s infinite linear
  - Toast slide-in/out: 0.28s cubic-bezier(0.34, 1.20, 0.64, 1)
- **Payment-specific:** Batch payment success — rows transition from blue/amber to green with highlight animation (0.3s ease-out)
- **Forbidden:** No bouncy/spring animations, no parallax, no scroll-driven effects

## Component Patterns

### KPI Cards
- Left color bar (4px width) indicating category (green=revenue, red=expenses, blue=profit, amber=pending)
- Label: 11px uppercase, muted color
- Value: 26px+ font-weight-700, tabular-nums, color matches category
- Delta: 12px, green for positive, red for negative, format "↑ X% vs last month"

### Data Tables
- Header: 11px uppercase, font-weight-600, muted color, letter-spacing 0.05em
- Cells: 14px, 14-16px padding
- Hover: subtle blue tint (`rgba(37,99,235,0.02)`)
- Financial amounts: right-aligned, tabular-nums, green for positive, red for negative
- Mobile: collapse to card layout below 768px

### Status Badges
- Pill shape (border-radius: 9999px)
- 12px font-size, font-weight-500
- Pattern: `bg-[semantic-color]/10 text-[semantic-color] border-[semantic-color]/25`

### Empty States
- Centered text, muted color
- Descriptive message (not just "No data")
- Primary action button or link when applicable
- No illustrations — text-only, consistent with minimal decoration level

### Sidebar Navigation
- Dark background (`#1e40af` deep blue)
- Nav items: 13px, white/60 default, white/90 hover, white active with bg white/12
- Language toggle: pill toggle `[EN | 中文]` in footer area, white/20 border
- Logo: 15px font-weight-700, white

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-22 | Initial design system created | Formalized from existing codebase patterns + competitive research (Stripe, Mercury, Xero, QuickBooks). Industrial/utilitarian aesthetic chosen for internal finance tool — prioritizes scanability and trust. |
| 2026-03-22 | Inter + Noto Sans SC fonts | Inter is industry standard for data UIs, Noto Sans SC provides complete Chinese coverage. No change from current implementation. |
| 2026-03-22 | Dark sidebar as brand differentiator | Most internal tools use light sidebars. Deep blue sidebar creates distinct visual identity and separates navigation from content. |
| 2026-03-22 | Minimal decoration approach | Competitors add illustrations and onboarding graphics. This tool deliberately says "we respect your time" through restraint. Works because typography and spacing are well-specified. |
| 2026-03-22 | Tabular-nums mandatory for all financial data | Column alignment in tables and consistent character width in KPI values. Non-negotiable for a finance tool. |
