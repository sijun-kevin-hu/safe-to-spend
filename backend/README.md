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
