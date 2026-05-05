# Money Mentor Code Documentation

This document explains how the mobile app is organized, how major features are wired together, and which files own the important behavior. It is intended for developers who need to maintain or extend the codebase.

## Application Shape

Money Mentor Mobile is an Expo Router application. The executable entry point is `expo-router/entry`, configured in `package.json`, so the files under `app/` define navigation rather than a traditional `App.tsx` root component.

The app has three main layers:

- `app/`: route components and screen-level UI.
- `components/`: reusable UI pieces shared by screens.
- `lib/`, `services/`, and `db/`: Supabase access, business logic, OCR, parsing, and compatibility data helpers.

`App.tsx` currently contains only the default Expo starter code commented out. Runtime routing is controlled by Expo Router through `app/_layout.tsx`.

## Navigation

### Root Stack

File: `app/_layout.tsx`

The root layout wraps the whole app in `SafeAreaProvider`, configures the status bar, and defines the stack routes:

- `index`: onboarding carousel.
- `login`: email/password and Google auth.
- `signup`: registration.
- `(tabs)`: authenticated main app tabs.
- `ReceiptCaptureScreen`: receipt scanning and OCR transaction creation.
- `ManualTransactionScreen`: manual transaction creation.
- `profile`: account/profile screen.

The root stack also replaces the default back button with an Ionicons button that calls `router.back()`.

### Tab Layout

File: `app/(tabs)/_layout.tsx`

The tab layout owns the authenticated app shell:

- Bottom tabs for dashboard, transactions, budget, and alerts.
- A hidden chat tab (`href: null`) that is available programmatically but not shown in the tab bar.
- A sliding sidebar menu with shortcuts to core routes.
- Header buttons for opening the sidebar and navigating to profile.
- `HelpChatWidget`, which overlays the assistant experience inside the tab shell.

The current header title is derived from `usePathname()`, mapped through `HEADER_TITLES`.

## Screens

### Onboarding

File: `app/index.tsx`

Shows an auto-advancing feature carousel. It uses:

- `Animated.FlatList` for paged slides.
- `scrollX` to drive slide and pagination animations.
- `useWindowDimensions()` and `onLayout` to keep the current slide aligned after rotation or split-screen resize.
- `expo-screen-orientation` to unlock orientation on the onboarding screen.

Primary actions route users to sign up or login.

### Login

File: `app/login.tsx`

Supports two authentication paths:

- Email/password through `supabase.auth.signInWithPassword`.
- Google OAuth through `signInWithOAuth("google")` from `lib/auth.ts`.

On successful authentication it uses `router.replace("/dashboard")`, which prevents users from navigating back to the login screen.

### Signup

File: `app/signup.tsx`

Creates an account through Supabase auth. It uses the same Supabase client setup as login and then routes the user into the main authenticated experience.

### Dashboard

File: `app/(tabs)/dashboard.tsx`

The dashboard loads transactions through `fetchTransactions()` from `lib/transactions.ts` and computes derived metrics for the selected range:

- Expense total.
- Income total.
- Net total.
- Top spending categories.
- Spending trend groups.
- Recent transactions.
- Forecast-style monthly expense projection.

It also includes date-range controls, refresh behavior, and chart rendering with `react-native-svg`.

### Transactions

File: `app/(tabs)/transactions.tsx`

The transactions screen manages transaction browsing and editing:

- Loads user-scoped rows from the `transactions` table.
- Supports search by description and category.
- Supports filtering by transaction type.
- Supports edit and delete flows.
- Supports selection mode for bulk deletion.
- Reads alert route params (`alertPatternId`, `alertTransactionId`) and highlights related transactions.

Suspicious alert highlighting is backed by `analyzeSuspiciousTransactions()` from `lib/transactions/suspicious.ts`.

### Manual Transaction

File: `app/ManualTransactionScreen.tsx`

Provides a focused transaction creation form. It validates amount input to at most two decimal places, lets the user choose expense/income categories, and saves through `createTransaction()` from `lib/transactions.ts`.

`createTransaction()` normalizes amount signs before insert:

- Expenses are stored as negative amounts.
- Income is stored as positive amounts.

### Receipt Capture

File: `app/ReceiptCaptureScreen.tsx`

Coordinates the receipt workflow:

1. Opens `ReceiptScanner`.
2. Receives an image URI from camera or gallery.
3. Calls `extractReceiptText()` in `services/ocr.ts`.
4. Calls `parseReceiptText()` in `services/receiptParser.ts`.
5. Builds an editable draft.
6. Saves the reviewed draft through `createTransaction()`.
7. Refreshes the displayed transactions.

The screen keeps OCR state (`ocrLoading`) separate from save state (`saving`) so the UI can communicate which operation is active.

### Budget

File: `app/(tabs)/budget.tsx`

Manages monthly category budgets:

- Loads budgets for the selected `YYYY-MM` month.
- Loads expense transactions in the selected month to compute spending progress.
- Creates manual budgets.
- Auto-creates a budget from spending history for a selected category.
- Prevents duplicate budget entries for the same user, month, and category.
- Supports single and bulk deletion.

Budget spending is calculated by matching transaction categories and summing absolute expense amounts.

### Alerts

File: `app/(tabs)/alerts.tsx`

Builds the alert center from two sources:

- Existing rows in the `alerts` table.
- Newly computed suspicious transaction patterns.

The screen:

1. Loads dismissed suspicious pattern IDs from `dismissed_suspicious_alerts`.
2. Loads recent transactions from the last 90 days.
3. Runs `analyzeSuspiciousTransactions()`.
4. Upserts new alert rows by `user_id,suspicious_pattern_id`.
5. Reloads alerts ordered by timestamp.

Supported alert interactions include filtering, marking alerts as read, deleting alerts, dismissing suspicious patterns, and navigating into related transaction details.

### Chat

File: `app/(tabs)/chat.tsx`

Hosts the assistant conversation UI. The reusable assistant logic lives in `lib/ai.ts`, and the floating in-app version is provided by `components/HelpChatWidget.tsx`.

### Profile and Informational Screens

Files:

- `app/profile.tsx`
- `app/about-us.tsx`
- `app/accessibility.tsx`

These screens cover account controls, static product information, and accessibility-oriented content.

## Components

### HelpChatWidget

File: `components/HelpChatWidget.tsx`

Provides a floating assistant entry point inside the tab shell. It uses the assistant data functions in `lib/ai.ts`.

### ExpenseForm

File: `components/ExpenseForm.tsx`

Renders and validates an editable receipt/manual expense draft before it is saved as a transaction.

### ReceiptScanner

File: `components/ReceiptScanner.tsx`

Displays a modal camera/gallery picker for receipt images. It handles:

- Camera permission checks.
- Camera capture through `expo-camera`.
- Gallery selection through `expo-image-picker`.
- Busy/capturing state so users cannot submit multiple images at once.

## Data and Business Logic

### Supabase Client

Files:

- `lib/supabase.ts`
- `lib/supabase/client.ts`

Both files create Supabase clients for Expo/React Native. They configure:

- `react-native-url-polyfill/auto` for URL APIs.
- `AsyncStorage` for auth persistence.
- `autoRefreshToken: true`.
- `persistSession: true`.
- `detectSessionInUrl: false` because native OAuth callbacks are handled manually.

`lib/supabase.ts` exports a singleton client and fails fast if Supabase environment variables are missing. `lib/supabase/client.ts` exports a factory function named `getSupabaseBrowserClient()`, despite being used in React Native. Existing screens import both patterns, so keep behavior consistent if consolidating later.

### Authentication Helper

File: `lib/auth.ts`

`signInWithOAuth(provider)` handles native OAuth:

1. Builds a deep-link redirect URI with scheme `moneymentor`.
2. Requests a provider login URL from Supabase.
3. Opens the provider flow with `WebBrowser.openAuthSessionAsync`.
4. Extracts tokens from the callback URL hash.
5. Stores the Supabase session with `supabase.auth.setSession`.

Supabase and provider redirect URL configuration must match the app scheme and callback path.

### Transactions

File: `lib/transactions.ts`

This is the normalized transaction data layer used by dashboard, receipt capture, manual transaction creation, and assistant context.

Important exports:

- `CATEGORIES`: canonical category list.
- `TransactionCategory`: strict category union derived from `CATEGORIES`.
- `Transaction`: normalized row shape for the app.
- `NewTransaction`: creation input shape.
- `fetchTransactions()`: loads current-user transactions ordered newest first.
- `createTransaction(input)`: validates and normalizes a new row before insert.

Internal helpers:

- `getAuthenticatedUserId()`: reads the active Supabase session and returns `user.id`.
- `normalizeDate()`: converts common date formats to `YYYY-MM-DD`.
- `autoCategorize()`: infers category from transaction description and type.

### Suspicious Transaction Analysis

File: `lib/transactions/suspicious.ts`

`analyzeSuspiciousTransactions(transactions, options)` returns sorted suspicious pattern alerts. Current rules are:

- `duplicate`: same date, description, and absolute amount.
- `high-amount`: expense at or above the high amount threshold.
- `many-small`: many low-value transactions on the same date.

Each alert includes a deterministic `id`, rule name, message, risk score, and related transactions. The alerts screen persists these computed patterns to Supabase.

### Assistant Context

File: `lib/ai.ts`

The assistant flow builds a financial context from local transactions before calling the backend:

- Current-month income, expense, and net values.
- Top expense categories.
- Five most recent transactions.
- Cleaned conversation history.

Requests are sent to `https://reactnativebackendai.onrender.com/chat`. Update `BACKEND_URL` when changing environments.

### Receipt OCR

File: `services/ocr.ts`

`extractReceiptText(imageUri)` posts receipt images to OCR.Space:

- Uses `EXPO_PUBLIC_OCR_SPACE_API_KEY` when available.
- Falls back to the OCR.Space demo key `helloworld`.
- Sends the image as multipart form data.
- Throws detailed errors for HTTP failures or OCR processing errors.
- Returns joined parsed text from OCR results.

### Receipt Parsing

File: `services/receiptParser.ts`

`parseReceiptText(rawText)` extracts a best-effort receipt draft:

- `vendor`: selected from high-scoring early lines.
- `expenseDate`: parsed from ISO or US-style dates.
- `amount`: preferred from a `total` line, falling back to the largest valid money token.
- `rawText`: preserved for debugging and review.

The parser intentionally uses heuristics. Users should still review OCR drafts before saving.

### Expense Compatibility Helpers

File: `db/expenses.ts`

This file adapts transaction rows to older `Expense` types from `types.ts`. It reads and writes the `transactions` table while exposing functions named like an expenses database module:

- `initExpensesDb()`: no-op because Supabase owns schema setup.
- `listExpenses()`: maps transaction rows to `Expense`.
- `insertExpense(expense)`: inserts an expense-style row into `transactions`.

## Type Conventions

File: `types.ts`

Defines receipt/expense-focused types:

- `Expense`
- `NewExpense`
- `ExpenseDraft`
- `ParsedReceipt`

`lib/transactions.ts` defines transaction-focused types separately. When building new transaction features, prefer the transaction types unless the feature is specifically tied to the receipt compatibility flow.

## Environment Variables

Required:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Optional:

- `EXPO_PUBLIC_OCR_SPACE_API_KEY`

Expo only exposes runtime variables prefixed with `EXPO_PUBLIC_`.

## Common Extension Points

### Add a New Screen

1. Add a route file under `app/`.
2. Register it in `app/_layout.tsx` if it needs explicit stack options.
3. Add it to `app/(tabs)/_layout.tsx` if it belongs in the tab shell or sidebar.

### Add a New Transaction Category

Update all category lists that are relevant to the feature:

- `lib/transactions.ts`
- `app/ManualTransactionScreen.tsx`
- `app/(tabs)/transactions.tsx`
- `app/(tabs)/budget.tsx`
- `app/(tabs)/alerts.tsx`
- Dashboard category icon map if the category should have a custom icon.

The current code has several duplicated category arrays. Keep them synchronized when adding or renaming categories.

### Add a New Suspicious Alert Rule

1. Add a new rule value to `SuspiciousAlert["rule"]`.
2. Implement the rule inside `analyzeSuspiciousTransactions()`.
3. Pick a deterministic alert ID format.
4. Decide how `app/(tabs)/alerts.tsx` should map that rule to an alert `type`.
5. Add Maestro coverage if the rule affects a visible alert flow.

### Change the Assistant Backend

Update `BACKEND_URL` in `lib/ai.ts`. The backend is expected to accept:

- `message`
- `messages`
- `financialContext`

and return JSON containing a string `reply`.

