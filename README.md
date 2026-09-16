# Safe to Spend

Safe to Spend is a privacy-first Expo and React Native app that shows how much money remains after protecting upcoming bills and a savings goal. It uses Supabase for authentication and database storage and an Express REST API deployed on Vercel.

## Requirements

- Node.js 22.13 or newer
- npm
- The Expo Go app on an iOS or Android device
- A Supabase project URL and publishable key from the project owner

## Run the mobile app

1. Clone the repository and enter its directory:

   ```bash
   git clone https://github.com/sijun-kevin-hu/safe-to-spend.git
   cd safe-to-spend
   ```

2. Install the mobile dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

4. Add the supplied Supabase project URL and publishable key to `.env`. Keep the deployed API URL as shown:

   ```text
   EXPO_PUBLIC_SUPABASE_URL=your-project-url
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   EXPO_PUBLIC_API_URL=https://safe-to-spend-chi.vercel.app
   ```

   Only use the Supabase publishable key in the mobile app. Never put a secret or service-role key here.

5. Start Expo with a cleared cache:

   ```bash
   npx expo start --clear
   ```

6. Connect the phone and computer to the same network. Open Expo Go and scan the QR code shown by Expo. If local network discovery does not work, start with `npx expo start --tunnel` instead.

7. Create an account and sign in. If email confirmation is enabled, confirm the email before signing in. Edit the balance on Home, edit bills or savings on Plan, and tap **Save plan** on Plan.

## Run the backend locally (optional)

The mobile app uses the deployed API by default, so running the backend locally is not required. To work on the backend:

1. Enter the backend directory and install its dependencies:

   ```bash
   cd backend
   npm install
   ```

2. Copy `backend/.env.example` to `backend/.env` and enter the Supabase project URL and publishable key.

3. Start the development server:

   ```bash
   npm run dev
   ```

The local API runs at `http://localhost:3000`. To make the mobile app use it, change `EXPO_PUBLIC_API_URL` in the root `.env` to an address your phone can reach, such as your computer's local network IP address, and restart Expo.

## Useful commands

- `npm start` starts Expo.
- `npm run ios` opens the iOS target.
- `npm run android` opens the Android target.
- `npm run web` opens the web target.
- `npx tsc --noEmit` checks the mobile TypeScript code.
- From `backend`, `npm run check` checks the backend TypeScript code.
- From `backend`, `npm run build` builds the backend.

## Backend API

Production API: [https://safe-to-spend-chi.vercel.app](https://safe-to-spend-chi.vercel.app)

- `GET /health` checks service availability.
- `GET /auth/me` returns the authenticated user.
- `GET /plan` retrieves the authenticated user's plan and tracking preference.
- `PUT /plan` validates and saves plan data while storing the tracking preference in the user's profile.

Protected endpoints require a Supabase access token. Plan and profile data are separated by user through Supabase Row Level Security.

## Verification

The app has been tested on a physical device for account creation/sign-in, saving a plan, restoring the plan after restarting, signing out, and keeping two users' plans separate.

## Technology

- Expo SDK 57 and React Native
- TypeScript and Expo Router
- Express REST API
- Supabase Auth and PostgreSQL
- Vercel backend deployment

This project was developed with assistance from Codex. See `PROJECT.md` for the product rationale, interview findings, implementation decisions, and debugging notes.
