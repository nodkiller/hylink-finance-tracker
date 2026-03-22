# Suggested Updates Recovery — Hylink Finance Tracker

**Date:** 2026-03-22
**Branch:** main (commit: 430d179)

---

## Backup Location

```
/Users/jeffreywang/Documents/Programs/hylink-finance-tracker-backup-20260322-223605.tar.gz
```

Size: 297KB (excludes `node_modules/`, `.next/`, `.git/`)

### How to Restore from Backup

```bash
# 1. Move current project out of the way (safety first)
mv /Users/jeffreywang/Documents/Programs/hylink-finance-tracker \
   /Users/jeffreywang/Documents/Programs/hylink-finance-tracker-old

# 2. Extract backup
cd /Users/jeffreywang/Documents/Programs
tar xzf hylink-finance-tracker-backup-20260322-223605.tar.gz

# 3. Restore git history (backup excludes .git)
#    Option A: If the old directory still exists, copy .git back
cp -r hylink-finance-tracker-old/.git hylink-finance-tracker/.git

#    Option B: If .git is gone, re-clone and overlay
git clone <your-repo-url> hylink-finance-tracker-temp
mv hylink-finance-tracker-temp/.git hylink-finance-tracker/.git
rm -rf hylink-finance-tracker-temp

# 4. Install dependencies
cd hylink-finance-tracker
npm install

# 5. Verify
npm run build
```

### What the Backup Contains
- All source code (`src/`, `supabase/`, `public/`)
- Configuration files (`package.json`, `next.config.ts`, `vercel.json`, `tsconfig.json`, etc.)
- `CLAUDE.md`, `DESIGN.md` (design system, created today)
- Does NOT contain: `node_modules/`, `.next/`, `.git/` (regenerated via `npm install` / `npm run build` / `git clone`)

---

## Session Summary (2026-03-22)

This session conducted a complete design-to-implementation planning cycle using 5 gstack skills. No code was written — only planning artifacts were produced.

### Review Pipeline Results

```
+====================================================================+
|                    REVIEW READINESS DASHBOARD                       |
+====================================================================+
| Review          | Runs | Status      | Findings                    |
|-----------------|------|-------------|-----------------------------|
| Eng Review      |  1   | CLEAR       | 6 issues, 0 critical gaps   |
| CEO Review      |  1   | CLEAR       | 5 proposals, 5 accepted     |
| Design Review   |  1   | CLEAR (FULL)| score: 5/10 -> 8/10         |
+--------------------------------------------------------------------+
| VERDICT: CEO + ENG + DESIGN CLEARED — ready to implement            |
+====================================================================+
```

---

## 1. Office Hours (`/office-hours`) — Design Doc

**Output:** `~/.gstack/projects/nodkiller-hylink-finance-tracker/jeffreywang-main-design-20260322-105812.md`

**Mode:** Startup (Intrapreneurship)

**Problem:** Hylink's finance team uses spreadsheets to track supplier payments on the 15th/30th of each month. No reminders, no batch processing, no audit trail.

**Demand Evidence:**
- Stakeholders saw a live demo and specifically requested payment date reminders (15th/30th)
- The head/MD needs gross profit dashboard visibility
- Two stakeholders, two killer features: finance team needs payment ops, head needs dashboard

**Chosen Approach:** Payment Operations Dashboard (Approach B — full payment ops module with calendar, batch mark-as-paid, automated reminders, and supplier ledger deferred to v2)

**Adversarial Spec Review:** 3 rounds, quality score 7/10. 34 issues found, 22 fixed, 6 documented as reviewer concerns.

---

## 2. Engineering Review (`/plan-eng-review`) — Architecture Decisions

**Output:** Plan file at `~/.claude/plans/breezy-leaping-bonbon.md`

### Two Work Streams (sequenced: i18n first, then payment ops)

#### Work Stream 1: i18n (English Default + Chinese Toggle)

**Architecture decisions made:**
1. **Custom dictionary** (not next-intl) — JSON files + React context + cookie. Zero external deps. Reason: only 2 locales, no complex ICU patterns.
2. **Error keys on client** (not server-side translation) — Server Actions return translation keys like `'errors.notLoggedIn'`, client does `t(key)`. DRY-er approach.
3. **`getServerT()` per page** — Server Components call async helper. Only approach that works with Next.js App Router.

**New files (i18n):**
- `src/i18n/locales/en.json` — English dictionary (~200+ keys)
- `src/i18n/locales/zh.json` — Chinese dictionary
- `src/i18n/get-locale.ts` — reads `locale` cookie, defaults to `'en'`
- `src/i18n/dictionary.ts` — loads dictionary by locale
- `src/i18n/context.tsx` — `LocaleProvider` + `useTranslation()` hook
- `src/i18n/use-server-t.ts` — server-side `t()` function
- `src/components/locale-toggle.tsx` — language toggle pill in sidebar

**Modified files (i18n):** ALL 80+ component/page files — replace hardcoded Chinese with `t('key')` calls.

#### Work Stream 2: Payment Operations Dashboard

**Architecture decisions made:**
4. **Vercel Cron** (not Supabase pg_cron) — API route at `/api/cron/payment-reminders`, scheduled `0 1 * * *` (01:00 UTC = 09:00 CST). Hobby plan supports 1 cron.
5. **Existing edit-expense-dialog** for `payment_due_date` editing (not inline picker) — reuse existing pattern, minimal diff.

**Schema (migration 010 — run manually in Supabase SQL Editor):**
- `ALTER TABLE expenses ADD COLUMN payment_due_date DATE`
- `CREATE TABLE payment_audit_log (id, batch_id, expense_id, paid_by, paid_at)`
- Backfill existing expenses based on `created_at` date

**New files (payment ops):**
- `src/lib/payments.ts` — `getNextPaymentDueDate()`, `getPaymentCalendar()`
- `src/lib/email.ts` — Resend wrapper (fallback to in-app if no API key)
- `src/app/payments/page.tsx` — Server Component (role-gated)
- `src/app/payments/payment-calendar.tsx` — Client Component (list grouped by date)
- `src/app/payments/batch-actions.tsx` — Client Component (sticky bottom bar + dialog)
- `src/app/actions/payments.ts` — `batchMarkAsPaid`, `updatePaymentDueDate`
- `src/app/api/cron/payment-reminders/route.ts` — daily reminder handler
- `src/app/api/export-payments/route.ts` — CSV export (CEO expansion)
- `supabase/migrations/010_payment_ops.sql`

**Modified files (payment ops):**
- `src/proxy.ts` — add `/api/cron/*` bypass + `/payments` role check
- `src/components/sidebar-nav.tsx` — remove `comingSoon: true` from /payments
- `src/app/actions/expenses.ts` — auto-assign `payment_due_date` in `createExpense`
- `src/app/dashboard/page.tsx` — add "Upcoming Payments" + "Overdue Payments" KPI cards
- `src/app/projects/[id]/edit-expense-dialog.tsx` — add `payment_due_date` field
- `src/types/database.ts` — add new types
- `vercel.json` — add cron config
- `package.json` — add `resend` + `vitest`

**Tests (Vitest):**
- `src/lib/__tests__/payments.test.ts` — unit tests for `getNextPaymentDueDate()` (Feb edge case, boundaries)
- `src/i18n/__tests__/dictionary.test.ts` — unit tests for `t()` lookup (dot notation, missing keys)
- `src/lib/__tests__/cron-dates.test.ts` — unit tests for cron reminder logic

**Failure Modes:**
| Codepath | Failure | Covered? |
|----------|---------|----------|
| payment_due_date Feb edge | Invalid Feb 30 | Unit test |
| Concurrent batch payment | Double-pay | SQL WHERE guard |
| Cron CRON_SECRET missing | 401 returned | Error handling |
| Resend API missing | Falls back to in-app | console.warn |
| Proxy cron bypass | Redirect to /login | Manual QA needed |
| Invalid locale cookie | Defaults to 'en' | Unit test |
| Missing translation key | Shows raw key | Unit test |

---

## 3. Design Review (`/plan-design-review`) — UI/UX Decisions

**Score:** 5/10 -> 8/10

**Decisions made:**
1. **Batch payment success animation** — rows transition from blue/amber to green with highlight animation + toast. Not just a toast.
2. **Mobile card layout** — reuse existing `expense-section.tsx` card pattern for mobile (<768px). Checkboxes on card headers.
3. **Sticky bottom batch action bar** — "3 selected . Y64,800 [Mark as Paid]" fixed to viewport bottom when items selected.

**Design specs added to plan:**
- Page hierarchy: summary bar -> filter bar -> date groups (urgency-sorted) -> sticky action bar
- Date group headers: status-aware summary with colored dot indicator
- Paid items collapsed by default in each group
- Interaction states table (loading/empty/error/success/partial for all features)
- User journey emotional arc (anxiety -> control -> action -> relief)
- Accessibility specs (aria-labels, semantic headings, touch targets >=44px)

---

## 4. CEO Review (`/plan-ceo-review`) — Strategic Expansions

**Mode:** Selective Expansion

**5 proposals surfaced, all 5 accepted:**

| # | Proposal | Effort | Status |
|---|----------|--------|--------|
| 1 | Overdue payments stat on dashboard | XS | ACCEPTED |
| 2 | Payment history CSV export | S | ACCEPTED |
| 3 | Month navigator on payment calendar | S | ACCEPTED |
| 4 | Payment cycle completion badge | XS | ACCEPTED |
| 5 | Cron failure -> Super Admin alert | XS | ACCEPTED |

**Error gap fixed:** Cron DB failure = silent no reminders. Now wraps in try/catch and notifies Super Admin on failure.

**CEO Plan:** `~/.gstack/projects/nodkiller-hylink-finance-tracker/ceo-plans/2026-03-22-i18n-payment-ops.md`

---

## 5. Design Consultation (`/design-consultation`) — DESIGN.md

**Output:** `/Users/jeffreywang/Documents/Programs/hylink-finance-tracker/DESIGN.md`

**Aesthetic:** Industrial/Utilitarian — function-first, data-dense, clean
**Typography:** Inter (latin) + Noto Sans SC (Chinese), tabular-nums mandatory for financial data
**Color palette:**
- Primary: `#2563eb` (interactive blue)
- Deep blue: `#1e40af` (sidebar, headings)
- Success: `#16a34a` (income, profit, paid)
- Danger: `#dc2626` (expenses, loss, rejected)
- Warning: `#f59e0b` (pending, due soon)
- Background: `#f8fafc`
**Spacing:** 4px base unit, scale: 4/8/12/16/24/32/48/64
**Motion:** Minimal-functional (page fade-in, skeleton shimmer, batch payment green transition)
**Risks (differentiators):** Dark sidebar navigation + minimal decoration

**CLAUDE.md updated** with design system reference.

---

## TODOs Captured

| Item | Priority | Source |
|------|----------|--------|
| E2E test infrastructure (Playwright) | P2 | Eng Review |
| WeChat/WeCom notification channel | P2 | Office Hours |
| Supplier management module (v2) | P2 | CEO Review |

---

## Env Vars Needed (Vercel Dashboard)

| Var | Required | Notes |
|-----|----------|-------|
| `CRON_SECRET` | Auto | Injected by Vercel for cron routes |
| `RESEND_API_KEY` | Optional | Falls back to in-app notifications only |
| `RESEND_FROM_EMAIL` | Optional | Verified sender domain for Resend |

---

## Execution Order

1. i18n infrastructure (7 new files)
2. i18n extraction pass (all existing files)
3. Payment ops schema (migration 010) — run in Supabase SQL Editor
4. Payment ops helpers + actions
5. Payment ops UI (/payments page + calendar + batch actions)
6. Payment ops cron
7. Modified files (proxy.ts, dashboard, sidebar, edit-dialog, vercel.json)
8. Vitest setup + unit tests
9. Manual QA pass

---

## Artifact Locations

| Artifact | Path |
|----------|------|
| Design Doc (Office Hours) | `~/.gstack/projects/nodkiller-hylink-finance-tracker/jeffreywang-main-design-20260322-105812.md` |
| Implementation Plan | `~/.claude/plans/breezy-leaping-bonbon.md` |
| Test Plan | `~/.gstack/projects/nodkiller-hylink-finance-tracker/jeffreywang-main-test-plan-20260322-112500.md` |
| CEO Plan | `~/.gstack/projects/nodkiller-hylink-finance-tracker/ceo-plans/2026-03-22-i18n-payment-ops.md` |
| Design System | `/Users/jeffreywang/Documents/Programs/hylink-finance-tracker/DESIGN.md` |
| Design Preview | `/tmp/design-consultation-preview-1711100000.html` |
| Project Backup | `/Users/jeffreywang/Documents/Programs/hylink-finance-tracker-backup-20260322-223605.tar.gz` |
