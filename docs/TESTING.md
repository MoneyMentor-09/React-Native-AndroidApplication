# Testing and QA

The project includes Maestro end-to-end test flows under `Maestro/`. There is no npm test script configured in `package.json` at this time.

## Manual Development Checks

Use these commands during local development:

```bash
npm install
npm start
npm run android
npm run ios
npm run web
```

`npm start` launches Expo. The target commands open platform-specific Expo sessions.

## TypeScript Check

The project has `tsconfig.json`, but no `typecheck` script. To run TypeScript directly:

```bash
npx tsc --noEmit
```

If this command is used often, add a package script:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

## Maestro Flows

The `Maestro/` directory contains mobile E2E flows:

| Flow | Purpose |
| --- | --- |
| `_login.yaml` | Shared login helper used by other flows. |
| `navigation_smoke.yaml` | Verifies authenticated navigation across dashboard, transactions, budget, alerts, menu, and profile. |
| `signup_flow.yaml` | Covers account creation flow. |
| `auth_signup_validation.yaml` | Verifies signup validation behavior. |
| `auth_login_success.yaml` | Verifies successful login. |
| `budget_create_duplicate_cleanup.yaml` | Tests budget creation, duplicate prevention, and cleanup. |
| `transactions_create_edit_delete.yaml` | Tests transaction create/edit/delete workflow. |
| `receipt_manual_add.yaml` | Tests manual add path in receipt workflow. |
| `profile_logout.yaml` | Tests profile navigation and logout. |

Run a flow with Maestro after starting the app on a simulator/emulator:

```bash
maestro test Maestro/navigation_smoke.yaml
```

Run all flows:

```bash
maestro test Maestro
```

## Test Data Requirements

Most Maestro flows assume:

- The app can reach Supabase.
- `.env` has valid `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- `_login.yaml` contains credentials for a test user or can otherwise authenticate in the configured environment.
- The Supabase database has the expected tables documented in `docs/DATA_MODEL.md`.

Do not run test flows against production user data unless the test account and cleanup behavior are explicitly safe for that environment.

## High-Value Manual QA Paths

Before release, verify these flows on at least one Android target:

- Sign up and login with email/password.
- Google OAuth login and return-to-app callback.
- Dashboard loads transactions and refreshes correctly.
- Manual transaction create, edit, search, filter, and delete.
- Receipt capture from camera and gallery.
- Budget create, duplicate prevention, auto budget, and delete.
- Alerts generation, mark read, dismiss, and transaction highlighting.
- Profile logout.

