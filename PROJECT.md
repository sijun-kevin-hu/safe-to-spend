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
- Detailed manual transaction tracking
- A separate planned-purchase calculator, unless user testing shows that it reduces effort enough to justify another interaction

## Product Decisions

- Keep the safe-to-spend amount immediately visible as the primary experience.
- Do not require users to enter each purchase or navigate through a separate purchase-checking flow.
- Make the result trustworthy by showing which upcoming bills and savings amount were reserved.
- Reconsider a planned-purchase calculator only if user testing shows that people want added reassurance for large purchases.
- Use progressive disclosure: require only an available balance, while bills and savings tools remain optional and discoverable.
- Keep the Home screen focused on the current safe-to-spend amount, a short calculation breakdown, and quick balance updates.
- Put individual bills, savings strategies, and other advanced controls in a separate Plan area rather than presenting every form on Home.
- If optional reserves are missing, explicitly tell the user that the result currently uses only the information provided.
- Fast-track the coursework submission: stop adding product features after the basic Home/Plan flow and prioritize the required physical-device, REST backend, Git, partner, and documentation evidence.
- Build the backend with Node.js, Express, and TypeScript so the mobile app and API use the same language and package-management workflow.
- Add authentication and user-specific plan storage only after the basic health and plan endpoints work, keeping bank connections and financial credentials out of scope.
- Use Supabase for hosted PostgreSQL storage and authentication while retaining Express as the custom REST API and business-logic layer.

## Possible Stretch Features

- Support a savings percentage for users with variable income.
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

- Mobile Supabase sign-up/sign-in, persistent sessions, foreground token refresh, and sign-out implemented. The root authentication gate prevents Home/Plan from mounting while signed out; user changes remount the plan provider to discard prior account state.
- Mobile plan provider loads through the Vercel API and offers explicit Save plan actions. Failed initial loads block editing and provide retry/sign-out rather than allowing empty data to overwrite a saved plan.
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

1. Deploy the Express backend and configure its Supabase environment variables.
2. Add Expo sign-up, sign-in, persistent sessions, and protected navigation.
3. Connect the Expo plan state to the authenticated backend GET and PUT endpoints.
4. Verify the full flow on a physical device and capture app/backend evidence.
5. Complete and document the two-way partner collaboration workflow.
6. Finish setup instructions, annotated references and AI use, debugging notes, screenshots or video, repository/API URLs, and collaboration lessons.

Local persistence, advanced savings strategies, notifications, further UI refinement, and additional interview testing are deferred until the required assignment workflow is complete.

## Development Approach

The user is learning Expo and React Native by implementing the code. Assistance should provide explanations, small next steps, targeted review, and debugging guidance without taking over routine implementation.
