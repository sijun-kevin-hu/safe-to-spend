# Safe to Spend

## Overview

Safe to Spend is a privacy-first mobile app that gives users one clear answer: how much money they can safely spend after accounting for upcoming bills and a savings goal.

The app is based on personal-finance interviews conducted for CS4261. Most interviewees relied on banking apps to check balances and transactions but did not consistently budget. Common barriers included effort, boredom, stress, variable income, forgetting to update a tracker, and privacy concerns about connecting financial accounts. The product should complement banking apps instead of duplicating them.

## Product Objective

Help people make a quick spending decision without requiring them to track every transaction, create detailed categories, or connect a bank account.

The core calculation is:

```text
safe to spend = current balance - upcoming bills - savings goal
```

## Product Principles

- Low effort: require only the information needed for the next spending decision.
- Forward-looking: emphasize upcoming obligations and savings rather than past transaction reports.
- Calm: present a clear answer without making budgeting feel stressful or judgmental.
- Privacy-first: do not require direct access to bank or credit-card accounts.
- Focused: avoid becoming a general-purpose expense tracker or accounting tool.

## MVP Objectives

- Enter a current available balance.
- Enter upcoming bills.
- Set a savings goal.
- Calculate and prominently display the safe-to-spend amount.
- Handle blank and decimal inputs safely.
- Run and test the application on a physical mobile device through Expo.
- Store and retrieve relevant data through a backend REST API.
- Maintain clear Git history and support the required partner collaboration workflow.

## Deferred Features

- Direct bank connections
- Investment tracking
- Complex expense categories
- Full accounting features
- AI-generated financial advice
- Detailed categories, purchase editing, and full transaction reports
- A separate planned-purchase calculator, unless user testing shows that it reduces effort enough to justify another interaction

## Product Decisions

- Bills may repeat weekly, every two weeks, monthly, or yearly (Never remains the default). Each outstanding bill holds its future template: frequency, name, amount, original schedule anchor, and next due date. Only one unpaid occurrence per recurring bill is reserved. Overdue bills stay reserved and advance one occurrence at a time when marked paid.
- Mark paid removes a one-time bill or replaces a recurring bill with the next scheduled occurrence and a new ID. It never changes the working balance or records a purchase; users log spending or update their balance separately. Duplicate payment presses for the previous occurrence cannot advance its replacement again.
- Edit this bill changes only the current occurrence; Edit future bills changes template defaults and the next schedule date. Amount/name-only future edits preserve the original schedule anchor. Stop repeating retains the current unpaid bill as a one-time bill; removal asks for confirmation and removes the whole remaining series.
- Monthly/yearly dates clamp to the last valid day without losing their original anchor (Jan 31 → Feb 28 → Mar 31; Feb 29 returns in leap years). Calendar arithmetic uses UTC components without turning bill dates into timestamps. A current payment’s edited due date must remain before its next scheduled payment.
- Recurring schedules reuse the existing bill_items JSONB column and need no new migration. The API advertises supportsRecurringBills, validates templates and unique bill IDs, and returns full repeat metadata. The client disables recurring setup on older APIs and verifies every bill field on save.

- Ask how users want to keep their balance up to date after their first authenticated sign-in: Log purchases & income or Update my balance. Keep the stored preference values (`purchases` / `balance`) unchanged. Save the preference in their profile and allow changes in Plan → Balance tracking.
- Both Home modes lead with the same prominent safe-to-spend card. Logging Home shows a smaller Spent this month summary of logged purchases in the current local calendar month, independent of the Purchase/Income toggle. The logging Home uses one Purchase/Income toggle, amount input, and optional description. A separate Activity tab is available in both modes, with day-grouped history, 20 entries at a time. Switching the toggle clears the draft. A starting balance is required before the first entry.
- Income represents money already received and not yet included in the working balance. Purchases decrease the balance; income increases it. Updating the balance replaces it, preserves history, and never reapplies old entries. Balance check-in users do not need to log either purchases or income. Their Log purchase or income action opens a keyboard-aware bottom sheet over Home with the shared entry form. A confirmed purchase/income save dismisses the sheet and shows a success snackbar on Home for five seconds, with manual dismissal. Validation failures and failed saves keep the sheet open; retries do not announce success early. Done, tapping the backdrop, or the system back action also dismisses it; no page navigation is required. Logging-mode users keep the full activity Home.
- Balance and history are saved in the same plan snapshot; repeated transaction IDs and autosave retries do not apply amounts again. Descriptions are optional and limited to 120 characters. The existing `purchases` JSONB/API field holds purchase, income, and balance_check_in entries; missing `kind` means a legacy purchase. New entries record balanceBefore and balanceAfter. Check-in amounts represent the signed change, including zero; a starting balance uses null for balanceBefore and zero for its unknown change. Older entries remain visible without invented balance details. No SQL migration is required for this extension.
- The API advertises `supportsIncome: true`. Income submission is disabled when the loaded API lacks that capability, preventing an older API from storing income as a purchase. Save confirmation also checks entry kinds. Production now includes income and balance-history support. Avoid older API/client versions once income entries exist because they cannot preserve their meaning.
- Home calculates spending room from committed balance, bills, and savings. Balance drafts require Update balance. Of balance savings recalculate from the current balance. From income reserves a chosen percentage only when received income is logged; purchases and balance check-ins leave that reserve unchanged.
- Activity supports loading older entries 20 at a time. Editing, refunds, advanced history search, and concurrent multi-device conflict resolution remain out of scope.

- Keep the safe-to-spend amount immediately visible as the primary experience.
- Do not require users to enter each purchase or navigate through a separate purchase-checking flow.
- Make the result trustworthy by showing which upcoming bills and savings amount were reserved.
- Reconsider a planned-purchase calculator only if user testing shows that people want added reassurance for large purchases.
- Use progressive disclosure: require only an available balance, while bills and savings tools remain optional and discoverable.
- Keep the Home screen focused on the current safe-to-spend amount, a short calculation breakdown, and quick balance updates.
- Put individual bills, savings strategies, and other advanced controls in a separate Plan area rather than presenting every form on Home.
- If optional reserves are missing, explicitly tell the user that the result currently uses only the information provided.
- Keep additions focused on the approved Home/Plan flow and optional tracking preference; prioritize physical-device, REST backend, Git, partner, and documentation evidence afterward.
- Build the backend with Node.js, Express, and TypeScript so the mobile app and API use the same language and package-management workflow.
- Add authentication and user-specific plan storage only after the basic health and plan endpoints work, keeping bank connections and financial credentials out of scope.
- Use Supabase for hosted PostgreSQL storage and authentication while retaining Express as the custom REST API and business-logic layer.
- Legacy savings amount and balance percentage are alternative nullable inputs: fixed amount stores only `savingsAmount`, percentage stores only `savingsPercentage`, and no savings stores both as null. Reject plans that set both. Calculate `savingsReserved` from the selected input rather than storing it as the user's choice. Percentage savings use the nonnegative current balance as the base, rounded to cents, and recalculate when balance changes.
- Automatic saves require a valid balance and savings setting. Show pending/failure status, retry while mounted, and keep sign-out unavailable until saved. Unsaved edits are not a durable offline queue; keep the app open until saved.

## Possible Stretch Features

- Warn when a planned purchase would reduce safe-to-spend below a chosen threshold.
- Schedule a native notification for an upcoming bill or low safe-to-spend amount.
- Show a lightweight monthly summary without requiring detailed expense entry.

## Course Requirements to Demonstrate

- Develop with a mobile development environment.
- Run an interactive application on a physical device.
- Keep the mobile app and backend in revision control.
- Deploy a backend service that processes, stores, or exchanges data through a REST API.
- Complete the two-way partner clone, build, modify, test, deploy, commit, and pull workflow.
- Document references, AI assistance, debugging, pivots, screenshots or video, setup instructions, repository and API URLs, and collaboration lessons.

## Current Technical Stack

- Expo SDK 58
- React Native 0.88
- React 19.3
- TypeScript
- Expo Router
- Node.js, Express, and TypeScript for the backend
- Supabase PostgreSQL and Supabase Auth for persistent, user-specific data
- Git and GitHub

## Current Progress

- Savings now offers two income-based methods: percentage or fixed amount per income (capped at income). Positive allocations create pending cards on Home and Plan → Savings. Mark as saved confirms money was moved to another account, reduces balance and reserve equally, records Activity, and leaves safe-to-spend unchanged. Saved cards are expandable; prior reserves are preserved as carryover cards. The applied migration `supabase/migrations/20261115175430_income_savings_tasks.sql` protects completed receipts. Optional device-local 6 PM reminders cover pending cards; native delivery and a rebuilt app remain to be verified. See backend README for rollout and validation details.

- Log purchases & income is the recommended, preselected onboarding option and fallback Home view. Balance check-ins remain available as an alternative; existing saved preferences are respected.

- Simplified Savings to a method picker, one input, a live “For every $100” income example, and a Set aside summary. Income reserve editing lives under Adjust. Untouched plans with supported APIs default to From income at 10%; existing savings settings and existing balance/history plans are preserved. Fixed amount behavior is unchanged; Mark as saved was skipped at the user’s request. Frontend TypeScript, all 32 frontend tests, web export, and synthetic browser checks passed for defaults, preservation, allocations, adjustments, reload, validation, unsupported APIs, and 320px layout. No backend or database changes are required.

- Income-based savings is implemented as a third strategy, From income. Each income entry adds its rounded percentage to a persistent virtual reserve and records the allocation in Activity details. Rate changes affect future entries; Already reserved adjusts savings still included in the balance. Switching strategies preserves the existing reserve. The additive migration `supabase/migrations/20261115164407_income_based_savings.sql` is applied in production, preserving all six existing plans. All 47 frontend/backend tests, TypeScript, backend build, web export, synthetic browser checks, and live authenticated two-account API/RLS checks pass. Physical-device checks remain pending.

- Recurring bills are implemented in Plan → Upcoming bills, with a repeat picker, one-time/future editing, Mark paid, Stop repeating, overdue labels, and cross-platform removal confirmation. Backend deployed READY on November 15, 2026. All 37 frontend/backend tests, TypeScript, backend build, and web export pass. Synthetic browser checks using the actual backend validator passed for creation/reload, current/future edits, payment advancement, unchanged working balances, Safe to Spend recalculation, stopping/removal, overdue handling, old-API guards, negative amounts, and 320px layout. Production health returns 200, protected endpoints return 401 without authentication, and no deployment runtime errors were found. Native-device checks remain pending. Signed-in production persistence and account isolation were verified during the income-savings rollout.

- Activity logging now waits for confirmed autosave before closing the sheet and showing a dismissible success snackbar. Input/toggle changes and duplicate submissions are blocked while the entry saves. TypeScript, all 17 frontend tests, web export, and synthetic browser checks pass, including delayed saves, failure/retry, auto/manual dismissal, and 320px layout. Native-device behavior remains unverified.

- Simplified Activity into a compact daily ledger: mint income symbols, lavender check-in symbols, inline balance trails, and one expanded entry at a time for full details. Removed repeated descriptions and the default saved-status message. TypeScript and web export pass; synthetic browser checks cover 320/390/1280px layouts, keyboard/tap expansion, legacy entries, pagination, empty state, and no writes while browsing.

- Balance-tracking Home opens logging in a bottom sheet with the existing Purchase/Income toggle. The sheet shares live plan state with Home, supports keyboard avoidance and scrolling, and dismisses through Done, backdrop, or system back. The logging Home has no Update my balance action after setup; Set starting balance remains available before the first check-in. Both modes have an Activity tab for purchases, income, and check-ins, including before/after balances and change details.

- Income entry and Activity history are implemented, including balance check-ins and before/after snapshots. The backend was deployed to production on November 15, 2026 (READY); health returns 200 and unauthenticated plan access returns 401. All 27 frontend/backend tests, TypeScript checks, backend build, and web export pass. Browser checks using synthetic accounts and the actual backend validator passed for both modes, saved/reloaded history, legacy entries, starting/unchanged/negative/zero check-ins, removal of the logging-mode update action, and 320px layout. Physical-device and signed-in production data tests remain pending.

- Upgraded to Expo SDK 58 (`expo` 58.0.19), React Native 0.88.0, and React 19.3.0 with aligned Expo/native dependencies and a regenerated npm lockfile. Added `.nvmrc` for the locally available supported Node 22.17.1 runtime. Updated strict native ref typing, nullable app-state/color-scheme handling, and web CSS safe-area spacing. Verified TypeScript, all 11 frontend tests, Expo Doctor (20/20), dependency alignment, and clean production exports for iOS, Android, and web. Physical-device navigation, date picker, authentication, and saving in SDK 58-compatible Expo Go remain unverified.

- New authenticated accounts now complete a themed profile step before plan onboarding. The app collects a full name and date of birth, saves them as `profiles.display_name` and `profiles.date_of_birth` through authenticated `/profile` endpoints, and reuses the existing privacy-first design system. Apply migration 005 and deploy the updated API before testing this flow with a real account.

- Tracking preferences now belong to `profiles` without changing the mobile API contract. The updated API reads and writes profiles, and migration 004 removes the unused plan column. Existing preference data is intentionally not migrated. Local type checks, builds, and contract tests pass; live profile reads and writes remain unverified.

- The earlier purchase-only Home and inline history were superseded by the current shared entry form and separate Activity tab. Purchase descriptions and income-aware history are deployed in the API; no additional SQL migration beyond the existing tracking JSONB column is required.

- Tracking onboarding, changeable Plan preference, amount-only purchase entry, balance replacement, recent purchases, and separate balance-check/purchase timestamps are implemented. Home calculates from committed values immediately. Verified with 16 focused tests (10 frontend/API-client, 6 backend), frontend TypeScript, backend build, web export, and synthetic-account browser checks for onboarding, deduction, balance replacement, preference changes, reload persistence, zero-purchase rejection, keyboard focus, and 320px overflow. Production database writes and physical-device behavior remain unverified for this flow.

- Mobile Supabase sign-up/sign-in, persistent sessions, foreground token refresh, and sign-out implemented. The root authentication gate prevents Home/Plan from mounting while signed out; user changes remount the plan provider to discard prior account state.
- Mobile plan provider loads through the REST API, then automatically saves valid balance, savings, and bill changes after a short pause. Writes are serialized and failed saves retry automatically. Failed initial loads block editing so empty state cannot overwrite a saved plan. Save status appears on Home and Plan; sign-out waits for changes to finish saving.
- Home and Plan share a safe-area-aware, keyboard-aware scrolling layout. Home keeps a result area above the reserve breakdown and balance editor. Plan opens with Savings and Upcoming bills summary cards; tapping a card opens its own section with Back to Plan navigation. Savings supports a fixed amount or 0–100% of the current nonnegative balance. Bills shows the total and saved items plus an Add bill form. There is no Save button; adding a bill queues it for automatic saving.
- Shared design tokens, buttons, currency/date formatting, and screen layout keep the frontend consistent. The MVP intentionally uses a light theme, including navigation and status bar. Bill due dates are stored as local calendar dates.
- Visual refinements include focused/error currency inputs, clearer empty states and optional-reserve messaging, and product-branded web navigation. TypeScript, production web export, and browser checks with mock account/plan data pass (calculation, stale-result clearing, blank/negative balance, navigation, saving, and 320px overflow). The separate Plan sections and autosave have also passed nine focused frontend/backend tests and mock-API browser checks for percentage validation, percentage recalculation on balance changes, reopening, bill addition, and old-API save confirmation. Native keyboard, large-text, and real-account end-to-end checks remain pending. ESLint is not installed, so lint remains unverified.
- Supabase session persistence is disabled only during static web rendering, where browser storage is unavailable; native and browser session persistence remain enabled.
- Production API at https://safe-to-spend-chi.vercel.app verified: health returns 200 and unauthenticated plan access returns 401. Authenticated two-account and physical-device testing remain pending.
- Mobile configuration uses the root `.env.example`; Expo needs EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in its own root environment file. No secret/service-role key belongs in the app.

- Expo project created and connected to Expo Application Services.
- Git repository created and connected to GitHub.
- Default home screen replaced with a Safe to Spend form.
- Current balance, upcoming bills, and savings goal inputs added.
- Safe-to-spend calculation implemented.
- Blank inputs treated as zero.
- Required-balance, invalid-number, and negative bill/savings validation added.
- Positive and negative safe-to-spend results presented in a calm result card.
- Shared balance, savings, and bill data moved into a React Context provider.
- Home reduced to balance entry, protected totals, calculation, and result.
- Plan screen created for savings and individual bill management.
- Plan-specific savings and bill validation added.
- Added explicit keyboard dismissal after physical-device testing showed that the iOS decimal keypad offered no obvious way to close it.
- Currency inputs now use a visible dollar prefix, stronger placeholder contrast, and two-decimal formatting after entry.
- Upcoming bills use a clearer protected-money card and a native date picker for due dates.
- TypeScript and whitespace checks pass for the initial calculator milestone.
- Node.js, Express, and TypeScript backend initialized in the same repository.
- Backend `GET /health` endpoint verified locally and returns `{ "status": "ok" }`.
- Backend plan and bill types mirror the mobile data shape; the typed plan endpoints progressed from an in-memory prototype to Supabase persistence.
- Zod runtime validation protects the plan-writing contract, and a safely configured Supabase client is ready for persistent storage.
- Supabase `plans` table created with one plan per authenticated user, an `auth.users` foreign key, and owner-only SELECT, INSERT, and UPDATE Row Level Security policies.
- Express authentication middleware now validates Supabase bearer tokens and shares the authenticated user with protected route handlers; `/auth/me` uses the middleware.
- Authentication middleware also creates a request-scoped Supabase client so database queries carry the correct user's token and remain protected by RLS.
- Authenticated plan reads and writes now use Supabase persistence; PUT validates input and upserts only the verified user's row.
- Backend production scripts compile TypeScript to `dist`, and the server honors the deployment host's `PORT` environment variable.
- Vercel selected to deploy the Express backend from the `backend` subdirectory; Supabase values remain deployment secrets.

## Debugging Notes

- On iOS, numeric inputs using the decimal keypad did not provide an obvious Done key. Home and Plan now dismiss the keyboard when the user taps outside an input, with submit-to-dismiss support on keyboards that expose a return key.
- The native iOS date picker initially inherited a dark appearance inside a light card, making its controls difficult to see. It now uses an explicit light theme, high-contrast panel, and product accent color.
- After plan data moved into shared Context, Home could display an outdated calculated result when bills or savings changed on Plan. Home now invalidates the result whenever balance, savings, or the bill list changes.
- The first Vercel backend deployment compiled successfully but failed because the project expected a static `public` output directory. The backend is an Express function, so the static Output Directory override must be cleared before redeploying.
- A later Vercel deployment reported TS2688 for Node types. Changing dependency installation did not resolve it. Full logs showed the project build succeeded and Vercel's separate TypeScript 7 transpilation failed; omitted dependencies were not established as the cause. The backend compiler is now pinned to TypeScript 5.9.3 as a compatibility workaround. Local type checks and production build pass; cloud redeployment remains pending.

## Next Steps

Legacy migrations `backend/sql/001-005` are reflected in the hosted schema. The income-savings migration is applied and recorded in Supabase migration history. Backend deployment and live authenticated plan/profile persistence, savings, recurrence metadata, and two-account isolation have been verified.

1. Verify sign-up/sign-in, saving, reopening the app, and separate accounts on a physical device; capture app/backend evidence. API authentication and persistence are verified; physical-device end-to-end verification remains pending.
2. Complete and document the two-way partner collaboration workflow: each person clones, builds, modifies, tests, deploys, and commits the other's code, then fetches and runs the returned changes on their device.
3. Finish the individual submission: setup instructions, annotated references and AI use, debugging notes, screenshots or video, repository/API URLs, Git history, and collaboration lessons.

Durable offline persistence, notifications, further UI refinement, and additional interview testing are deferred until the required assignment workflow is complete.

## Development Approach

The user is learning Expo and React Native by implementing the code. Assistance should provide explanations, small next steps, targeted review, and debugging guidance without taking over routine implementation.
