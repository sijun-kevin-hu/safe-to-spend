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

- Ask how users want to keep their balance up to date after their first authenticated sign-in: Log purchases or Update my balance. Existing accounts without a preference see the same one-time choice. Save the preference with their plan and allow changes in Plan → Balance tracking.
- Both Home actions remain available. The preference determines which action is prominent once a balance has been confirmed; a first balance check-in comes first for everyone.
- Logging a purchase deducts its amount from the working balance once and stores the entry. Updating the balance replaces the working balance, retains purchase history, and never reapplies old purchases. Show when the balance was last checked separately from the latest purchase timestamp.
- Home calculates spending room immediately from committed balance, bills, and savings. Balance drafts require Update balance; they do not change the saved plan while typing. Percentage savings retain their existing behavior of recalculating from the current balance.
- The lightweight purchase view shows the latest five entries. Purchases are stored in the plan JSON for this MVP; full history navigation, editing, refunds, and concurrent multi-device conflict resolution remain out of scope.

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
- Savings amount and percentage are alternative nullable inputs: fixed amount stores only `savingsAmount`, percentage stores only `savingsPercentage`, and no savings stores both as null. Reject plans that set both. Calculate `savingsReserved` from the selected input rather than storing it as the user's choice. Percentage savings use the nonnegative current balance as the base, rounded to cents, and recalculate when balance changes.
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

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript
- Expo Router
- Node.js, Express, and TypeScript for the backend
- Supabase PostgreSQL and Supabase Auth for persistent, user-specific data
- Git and GitHub

## Current Progress

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

The tracking preference and purchase flow are implemented locally. Apply `backend/sql/002_tracking_preference.sql` after migration 001, then deploy the updated API before using the new frontend. Neither migration nor deployment was performed as part of this change. Client save confirmation rejects older APIs that omit tracking data. Existing plans keep their data and receive no invented balance-check timestamp.

The new savings-input API is implemented locally. Apply `backend/sql/001_savings_percentage.sql` to Supabase before deploying the updated backend. This migration and deployment have not been performed in this task. Legacy fixed-amount plans remain compatible; new savings inputs require the updated API and are not reported as saved if an older API drops the setting.

1. Verify sign-up/sign-in, saving, reopening the app, and separate accounts on a physical device; capture app/backend evidence. Deployment and mobile integration are implemented, but authenticated end-to-end verification remains pending.
2. Complete and document the two-way partner collaboration workflow: each person clones, builds, modifies, tests, deploys, and commits the other's code, then fetches and runs the returned changes on their device.
3. Finish the individual submission: setup instructions, annotated references and AI use, debugging notes, screenshots or video, repository/API URLs, Git history, and collaboration lessons.

Durable offline persistence, notifications, further UI refinement, and additional interview testing are deferred until the required assignment workflow is complete.

## Development Approach

The user is learning Expo and React Native by implementing the code. Assistance should provide explanations, small next steps, targeted review, and debugging guidance without taking over routine implementation.
