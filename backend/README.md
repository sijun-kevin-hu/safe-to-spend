# Safe to Spend API

Express and TypeScript REST API for authenticated Safe to Spend plans stored in Supabase.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and add the Supabase project URL and publishable key.

3. Start the development server:

   ```bash
   npm run dev
   ```

The API runs at `http://localhost:3000` by default.

## Commands

- `npm run dev` starts the TypeScript development server with automatic reloads.
- `npm run check` checks TypeScript without producing build files.
- `npm run build` compiles TypeScript into `dist`.
- `npm start` runs the compiled production server.

## Endpoints

- `GET /health` returns the service status.
- `GET /auth/me` validates a Supabase bearer token and returns the current user.
- `GET /profile` returns the authenticated user's completed identity profile or `null`.
- `PUT /profile` validates and saves the authenticated user's display name and date of birth.
- `GET /plan` returns the authenticated user's stored plan or an empty plan.
- `PUT /plan` validates and saves the authenticated user's plan.

Protected endpoints require this header:

```text
Authorization: Bearer <supabase-access-token>
```

## Database migrations and deployment

Apply `sql/001_savings_percentage.sql` in the Supabase SQL editor **before** deploying this API version. It adds nullable `savings_amount` and `savings_percentage` columns and migrates existing nonzero goals into fixed amounts.

Tracking preferences now belong to `profiles`, while balances and purchase history remain in `plans`. Apply migrations in this order:

1. Apply `sql/002_tracking_preference.sql` if it has not already run.
2. Apply `sql/003_profiles.sql` once to create and backfill profiles.
3. Deploy this API version, which reads and writes preferences through `profiles`.
4. Apply `sql/004_drop_plan_tracking_preference.sql` to remove the unused column from `plans`.
5. Apply `sql/005_profile_identity.sql` before deploying the profile-onboarding client. It adds the date-of-birth field and identity validation constraints.

This project does not preserve tracking preferences previously stored in `plans`.

The plan contract accepts one savings strategy: `savingsAmount`, `savingsPercentage`, `savingsIncomePercentage`, or none. These inputs are nullable and mutually exclusive. Responses include the calculated `savingsReserved`, which percentage plans derive from the nonnegative current balance and round to cents.

The database keeps the old `savings_goal` column populated with the calculated reserve during rollout. New clients do not use it as an input.

For rollout compatibility, requests from an older client containing only `savingsGoal` are interpreted as fixed-amount savings.

Frontend changes save automatically through `PUT /plan`; the API still validates the whole plan and uses the authenticated user's RLS policy. There is no database migration runner configured, so deploying code alone does not apply the SQL.

Run contract checks with:

```bash
npm run build
node --test tests/plan.test.cjs
```

## Purchase and income logging

The existing `purchases` array holds purchase, income, and balance_check_in activity entries. Purchase/income entries contain a positive `amount`, `id`, ISO `createdAt`, optional `note` (up to 120 characters), and optional `kind` (`purchase` or `income`). New entries include `balanceBefore` and `balanceAfter`. Balance check-ins use `kind: "balance_check_in"`, require before/after balances, and store a signed change in `amount` (including zero). A starting balance has `balanceBefore: null` and `amount: 0`. Validation rejects partial or inconsistent snapshots. Entries without a kind remain legacy purchases.

The client applies each entry once to the working balance and sends the resulting balance and complete history together in `PUT /plan`. The API validates and stores that snapshot without applying amounts again. A balance check-in replaces the working balance while retaining history. Percentage savings still derive from the current balance.

Plan responses advertise `supportsIncome: true`. The client prevents income submission against older APIs and checks that saved entry kinds were preserved. This change reuses the existing JSONB column and requires no additional database migration. Deploy the API before the income-aware client, and avoid older API/client versions once income entries exist.

Production was updated on November 15, 2026. Health returns 200, and plan/profile/auth endpoints reject unauthenticated requests with 401. Signed-in production writes have not been tested in this task.

Balance check-in history and before/after snapshots were deployed to production on November 15, 2026. Existing JSONB storage supports the new entry shape without a database migration. Older entries are retained without reconstructing unknown balance details.

## Recurring bills

Each bill may include `recurrence` with `frequency` (`weekly`, `biweekly`, `monthly`, `yearly`), future `name` and `amount` defaults, `anchorDate`, and `nextDueDate`. Dates are valid local calendar strings (`YYYY-MM-DD`); the next repeat must be after the current due date. One-time bills omit this object. Bill IDs are unique within a plan.

The client reserves one outstanding occurrence per bill. Mark paid removes a one-time bill or replaces a recurring occurrence with the next one and a new ID. Balance and purchase/activity history remain unchanged. Overdue schedules advance a single payment at a time, and monthly/yearly calculations preserve the anchor through shorter months and leap years.

Editing this bill preserves future defaults. Editing future bills preserves the current payment; amount/name-only changes keep the original anchor. Stopping recurrence retains the current unpaid occurrence. Removing a recurring bill removes the current occurrence and template together.

The API returns `supportsRecurringBills: true`. Recurrence is stored inside the existing `bill_items` JSONB, so no new SQL migration is required. Client save confirmation checks all bill and recurrence fields; deploy this API before enabling recurring setup. Production deployment on November 15, 2026 is READY; health/auth checks pass, and signed-in production persistence/account isolation have been verified.

## Income-based savings

Apply `../supabase/migrations/20261115164407_income_based_savings.sql` after legacy migrations 001–005. This additive migration is applied and recorded in production. Existing financial values were preserved. Legacy migrations were applied outside Supabase migration history; do not replay the profile-creation migration against the hosted database.

`supportsIncomeSavings` is true only when both new columns exist. `savingsIncomePercentage` selects From income; `incomeSavingsReserved` stores the accumulated virtual reserve. Logging income adds the rounded share once and stores optional `savingsAllocated` on that activity entry. Gross income still increases the balance fully. Purchases and check-ins preserve the reserve. Rate changes affect future entries, and the user can adjust Already reserved after moving money out of the tracked balance.

Deploy the schema before this API and client. Legacy clients cannot overwrite an active income strategy: omitted new fields return 409; partial fields return 400. Missing schema disables the strategy while legacy methods remain available. Whole-plan snapshot writes retain the existing concurrency model.

Verification: 47 unit/API tests, frontend/backend TypeScript, backend build, web export, browser flows at 320px, local PostgreSQL migration/constraint/RLS checks, and live authenticated two-account profile/plan persistence, allocation, retry, reload, recurrence metadata, validation and RLS isolation passed. Native-device testing remains pending.

Existing Supabase advisor findings remain unchanged: trigger-function execution grants ([linter guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)) and disabled [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No authentication settings were changed.

## Savings cards and fixed allocations

Migration `../supabase/migrations/20261115175430_income_savings_tasks.sql` adds `savings_income_amount`, extends the mutually exclusive strategy constraint, and protects completed transfer receipts against deletion by stale snapshots/older clients. It is applied in production. All six existing plans and their previous columns were preserved byte-for-byte; legacy reserve choices remain readable until the user explicitly chooses an income method. No historical allocations are recalculated.

The client offers Percentage or Fixed amount per income. Fixed allocations are capped at the received income. Each positive `savingsAllocated` on an income entry creates a pending card. Completing it adds `savingsSavedAt` to that income and a linked `savings_transfer` activity receipt, while reducing balance and reserve by the same amount. Duplicate IDs/completions are idempotent. An unallocated prior reserve appears as a carryover card; carryover transfer receipts remain in Saved and Activity. These are manual records of money moved elsewhere, not bank transfers initiated by the app.

`supportsSavingsTasks` gates the new controls; older clients cannot overwrite an active fixed-per-income setting. The API checks completed income/transfer pairs. The existing whole-plan snapshot model remains; conflicting stale writes are rejected rather than allowed to erase completed receipts and may require reopening the app.

Optional local reminders are device/account specific, off by default, and request permission only on opt-in. At most one daily 6 PM notification is scheduled while a confirmed saved snapshot has pending cards. It is cancelled when cards are completed, reminders disabled, or the account signs out. Web shows the native-app availability message. No remote push service or notification database is required. Native notification delivery/permission flows require device validation and a rebuild with the new Expo Notifications plugin.

Validation: 53 unit/API tests, TypeScript, backend build, web/iOS/Android exports, PostgreSQL constraint and stale-snapshot trigger checks, and synthetic-account browser flows covering allocation, cancel/confirm, failed save/retry, unchanged safe-to-spend, persistence, history, method switching, web fallback, and 320px layout. Current feature writes were not tested with a live signed-in production account. Existing advisor findings are unchanged (see links above).


## Activity corrections

Migration `../supabase/migrations/20261115181450_activity_editing.sql` adds `activity_revision` (default 0). It is applied to the hosted database. Deploy the API before enabling the client: `supportsActivityEditing` gates the controls, and `activityRevision` is included in plan snapshots and verified on save. The API production deployment is pending explicit approval following an automatic review rejection of the Vercel source upload.

An explicit edit/delete increments the activity revision by exactly one; retries reuse it. After a correction, same-revision snapshots must preserve existing entries (normal logging and savings completion remain allowed). Stale, conflicting, or skipped revisions return 409. The trigger still protects completed savings receipts for clients that have not performed corrections. No existing plan contents are rewritten by the migration. This protects deliberate corrections; it does not implement general concurrent-device merging.

Corrections replay activity in saved ledger order, keeping check-ins as absolute anchors and preserving unknown snapshots for legacy entries. Income edits preserve the recorded allocation unless explicitly corrected; linked transfer amounts stay in sync. Deleting an income removes its linked transfer; deleting a savings transfer restores its pending savings allocation. Deleting a carryover transfer restores that reserve. These actions correct manual records and do not initiate bank transfers.

Validation: 44 frontend unit/API-client tests and 18 backend tests passed, along with frontend/backend TypeScript, backend build, web export, and browser checks at 320px. Browser checks cover amount/description edits, delete confirmation/cancel, persistence on reload, failed-save retry without early success, income allocations, check-in edits, invalid amounts, and overflow. PostgreSQL trigger tests are in `tests/sql/activity-editing.sql` and run in a rolled-back transaction after applying the migration to a local test database. Native device and authenticated production writes remain unverified for this feature.
