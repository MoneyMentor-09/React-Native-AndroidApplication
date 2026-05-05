# Data Model and Supabase Notes

Money Mentor stores user data in Supabase. The mobile app assumes Row Level Security and server-side policies prevent users from reading or mutating records owned by another user.

## Tables Used by the App

### `transactions`

Primary table for income and expense activity.

Expected fields used by the app:

| Column | Expected Type | Notes |
| --- | --- | --- |
| `id` | string or number | Converted to string in normalized app code. |
| `user_id` | uuid/string | Must match the authenticated Supabase user. |
| `description` | text | Merchant, paycheck source, or user-entered description. |
| `amount` | numeric | Expenses are stored negative; income is stored positive in normalized helpers. |
| `category` | text/null | Category label. Some screens use duplicated category lists. |
| `date` | date/text | Most app code expects `YYYY-MM-DD`. |
| `type` | text | Expected values are `income` or `expense`. |
| `created_at` | timestamp/null | Used for secondary sorting and recent activity context. |

Important behaviors:

- `lib/transactions.ts` normalizes transaction IDs to strings.
- `createTransaction()` stores expense amounts as negative and income amounts as positive.
- `fetchTransactions()` treats any non-`income` type as `expense`.
- The dashboard and assistant use absolute values for expense totals.

### `budgets`

Stores category budgets by user and month.

Expected fields used by the app:

| Column | Expected Type | Notes |
| --- | --- | --- |
| `id` | string | Used for edit/delete selection. |
| `user_id` | uuid/string | Owner of the budget. |
| `category` | text | Category this budget applies to. |
| `amount` | numeric | Budget limit for the selected month. |
| `spent` | numeric | Present in the local `Budget` type, but spend is recomputed from transactions. |
| `purpose` | text/null | Optional user-entered note. |
| `month` | text | Expected format is `YYYY-MM`. |

Important behaviors:

- Budget screen filters budgets by `user_id` and exact `month`.
- Duplicate category/month budgets are blocked in UI before insert.
- Spending progress is calculated from matching expense transactions in the selected month.

### `alerts`

Stores alerts shown in the alert center.

Expected fields used by the app:

| Column | Expected Type | Notes |
| --- | --- | --- |
| `id` | string | Alert row identifier. |
| `user_id` | uuid/string | Owner of the alert. |
| `message` | text | Human-readable alert message. |
| `risk_score` | numeric | Used for risk display and high-risk counts. |
| `timestamp` | timestamp/text | Used for sorting. |
| `read` | boolean | Controls unread count and filtering. |
| `type` | text | Expected values include `fraud`, `unusual_spending`, `budget_warning`, `low_balance`. |
| `transaction_id` | string/null | Optional related transaction. |
| `suspicious_pattern_id` | text/null | Deterministic ID from suspicious transaction analysis. |

Important behaviors:

- Suspicious alerts are upserted on `user_id,suspicious_pattern_id`.
- The alert screen sorts unread alerts before read alerts, then by timestamp descending.
- Alert navigation can pass related IDs to the transactions screen for highlighting.

### `dismissed_suspicious_alerts`

Tracks suspicious patterns users have dismissed so those patterns are not recreated.

Expected fields used by the app:

| Column | Expected Type | Notes |
| --- | --- | --- |
| `user_id` | uuid/string | Owner of the dismissal. |
| `pattern_id` | text | Matches `SuspiciousAlert.id`. |

Important behaviors:

- The alerts screen reads this table before generating suspicious alerts.
- Pattern IDs should remain deterministic across sessions.

## Recommended Constraints

The app works best with these database constraints:

- `transactions.user_id` references `auth.users.id`.
- `budgets.user_id` references `auth.users.id`.
- `alerts.user_id` references `auth.users.id`.
- Unique index on `alerts(user_id, suspicious_pattern_id)` where `suspicious_pattern_id` is not null.
- Optional unique index on `budgets(user_id, month, category)` to enforce duplicate prevention server-side.
- RLS policies that require `user_id = auth.uid()` for select, insert, update, and delete.

## Sign and Date Conventions

The normalized data helpers use these conventions:

- Store expenses as negative values.
- Store income as positive values.
- Display totals using absolute values when the UI is talking about spend.
- Prefer `YYYY-MM-DD` for transaction dates.
- Prefer `YYYY-MM` for budget months.

Older or direct screen code may read from Supabase without going through `lib/transactions.ts`, so keeping database rows consistent is important.

## Known Implementation Notes

- Category lists are duplicated in multiple files. Any category change should be applied everywhere listed in `docs/CODE_DOCUMENTATION.md`.
- There are two Supabase client entry points. `lib/supabase.ts` is a singleton; `lib/supabase/client.ts` creates a new client. If auth state bugs appear, consider consolidating on one client module.
- `budgets.spent` exists in the TypeScript type, but the current budget screen recalculates spend from transactions.

