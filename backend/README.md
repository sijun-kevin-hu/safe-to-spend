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

This project does not preserve tracking preferences previously stored in `plans`.

The plan contract accepts one savings input: `savingsAmount`, `savingsPercentage`, or neither. Both inputs are nullable, but they cannot both contain values. Responses include the calculated `savingsReserved`, which percentage plans derive from the nonnegative current balance and round to cents.

The database keeps the old `savings_goal` column populated with the calculated reserve during rollout. New clients do not use it as an input.

For rollout compatibility, requests from an older client containing only `savingsGoal` are interpreted as fixed-amount savings.

Frontend changes save automatically through `PUT /plan`; the API still validates the whole plan and uses the authenticated user's RLS policy. There is no database migration runner configured, so deploying code alone does not apply the SQL.

Run contract checks with:

```bash
npm run build
node --test tests/plan.test.cjs
```
