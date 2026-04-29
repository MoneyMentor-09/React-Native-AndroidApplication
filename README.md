# Money Mentor Mobile

Money Mentor Mobile is a React Native application that helps users manage personal finances through transaction tracking, budgeting, receipt capture, and proactive spending alerts.

## Overview

This repository contains the mobile client for Money Mentor, built with Expo and TypeScript. The app is designed to support day-to-day money management with a balance of automation (OCR receipt parsing, alert generation) and manual controls (budget planning, transaction editing).

## Core Capabilities

- Secure authentication (email/password and Google OAuth)
- Financial dashboard with date-range insights
- Transaction management (manual entry, edit, search, filter, delete)
- Receipt scanning and OCR-assisted data extraction
- Category-based budget planning and monthly tracking
- Alert center for suspicious/unusual activity patterns
- In-app assistant integration scaffold for financial guidance

## Product Areas

### Authentication & Access

- Sign up and sign in flows
- Supabase-backed session management
- OAuth support via Google

### Dashboard & Insights

- Income vs expense summaries
- Custom and preset time windows
- Category-level spending visibility
- Recent activity review
- Forecast-style monthly expense projection

### Transactions

- Manual transaction creation
- Receipt capture workflow:
  - Capture/import image
  - OCR text extraction
  - Parsed draft review before save
- Transaction editing and deletion
- Bulk selection and bulk delete

### Budgets

- Month/year scoped budgets
- Spend progress visualization per category
- Auto-create budgets from historical values
- Single and bulk deletion

### Alerts

- Suspicious transaction pattern analysis
- Risk score-based alert presentation
- Mark-as-read and mark-all-read actions
- Alert dismissal and suppression of repeated patterns

## Technology Stack

- Expo SDK 54
- React 19
- React Native 0.81
- Expo Router (file-based navigation)
- TypeScript
- Supabase (auth and data)
- OCR.Space API (receipt OCR)

## Repository Structure

```text
app/                  Expo Router routes and screens
app/(tabs)/           Primary tab navigation screens
components/           Shared UI components
lib/                  Data, auth, AI, and transaction logic
services/             OCR + receipt parsing services
assets/               Icons and image assets
```

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm
- Expo Go (for mobile device testing)
- Supabase project (with required tables)

## Environment Configuration

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_OCR_SPACE_API_KEY=your_ocr_space_api_key
```

Notes:

- `EXPO_PUBLIC_OCR_SPACE_API_KEY` is optional.
- If omitted, OCR uses the OCR.Space demo key (`helloworld`) with limited reliability/throughput.

## Getting Started

```bash
npm install
npm start
```

Run specific targets:

```bash
npm run android
npm run ios
npm run web
```

## Route Map

- `/` Onboarding
- `/login` Sign in
- `/signup` Registration
- `/(tabs)/dashboard`
- `/(tabs)/transactions`
- `/(tabs)/budget`
- `/(tabs)/alerts`
- `/ReceiptCaptureScreen`
- `/ManualTransactionScreen`
- `/profile`

## Data Dependencies

The app currently expects these Supabase tables:

- `transactions`
- `budgets`
- `alerts`
- `dismissed_suspicious_alerts`

Each table is expected to be user-scoped via `user_id` where applicable.

## AI Assistant Backend

The assistant request endpoint is configured in `lib/ai.ts`:

- `BACKEND_URL = https://reactnativebackendai.onrender.com`

Update this value when switching environments.

## Development Notes

- Built with Expo Router conventions (`app/`-first routing).
- Designed for mobile-first interaction patterns.
- Supports iterative feature growth around insights, alerts, and assistant workflows.

## Security & Privacy

- Never commit real API keys or secrets.
- Use environment-specific credentials for development/staging/production.
- Review Supabase Row Level Security policies before deploying to production.

## Contributing

Internal and external contributors should:

1. Create a feature branch from `main`.
2. Keep changes scoped and documented.
3. Verify core user flows before opening a PR.
4. Include screenshots or short recordings for UI-impacting changes.

<!-- ## License

No license file is currently included in this repository.
Add a `LICENSE` file if you plan to distribute this project externally. -->
