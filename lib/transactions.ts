// Supabase client
// ---------------
// Imports the configured Supabase instance used for:
// - authentication lookups
// - reading transactions from the database
// - creating new transactions in the database
import { supabase } from "./supabase";

// CATEGORIES
// ----------
// Centralized list of supported transaction categories.
//
// `as const` tells TypeScript to treat each entry as a literal string
// instead of a generic `string`, which allows us to build a strict
// union type from this array later.
export const CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Healthcare",
  "Education",
  "Travel",
  "Groceries",
  "Gas",
  "Rent/Mortgage",
  "Insurance",
  "Salary",
  "Freelance",
  "Investment",
  "Other",
] as const;

// TransactionCategory type
// ------------------------
// Creates a union type from the CATEGORIES array.
//
// Resulting type is equivalent to:
// "Food & Dining" | "Transportation" | ... | "Other"
//
// This is useful for functions like autoCategorize so they can only
// return one of the approved category values.
export type TransactionCategory = (typeof CATEGORIES)[number];

// Transaction type
// ----------------
// Represents the normalized transaction shape used throughout the app.
//
// id         -> unique identifier
// description-> transaction label or merchant name
// amount     -> numeric amount (expenses may be stored as negative)
// category   -> optional category label
// date       -> transaction date string
// type       -> whether transaction is income or expense
// created_at -> timestamp for when the transaction record was created
export type Transaction = {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  date: string;
  type: "expense" | "income";
  created_at: string;
};

// NewTransaction type
// -------------------
// Represents the input required when creating a new transaction.
//
// category is optional because the app can auto-categorize.
// type is optional because it can be inferred from the amount:
// - positive amount -> income
// - negative amount -> expense
export type NewTransaction = {
  description: string;
  amount: number;
  category?: string | null;
  date: string;
  type?: "expense" | "income";
};

// TransactionRow type
// -------------------
// Represents the raw shape of a row returned by Supabase.
//
// This may differ slightly from the app-level Transaction type because:
// - id may come back as a number or string
// - type may be null or an unexpected string
// - created_at may be null
//
// The fetchTransactions function converts this database shape into the
// normalized Transaction shape used by the UI.
type TransactionRow = {
  id: number | string;
  description: string;
  amount: number;
  category: string | null;
  date: string;
  type: string | null;
  created_at: string | null;
};

// getAuthenticatedUserId
// ----------------------
// Retrieves the currently signed-in user's ID from the active Supabase session.
//
// Why this exists:
// Every transaction query is user-specific, so we need the authenticated
// user's id before reading or writing transaction records.
//
// Throws:
// - if session lookup fails
// - if there is no currently authenticated user
async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();

  // If Supabase fails to retrieve the session, surface a clear error message.
  if (error) {
    throw new Error(`Failed to resolve authenticated user: ${error.message}`);
  }

  // Extract the user id from the current session.
  const userId = data.session?.user?.id;

  // If no session or user id exists, the user must sign in again.
  if (!userId) {
    throw new Error("No authenticated user session found. Please sign in again.");
  }

  return userId;
}

// normalizeDate
// -------------
// Converts a variety of date input formats into YYYY-MM-DD format.
//
// Supported inputs:
// - already normalized: "2026-03-12"
// - US format: "3/12/2026" or "03/12/2026"
// - any string parsable by JavaScript Date
//
// If parsing fails, the original string is returned unchanged.
// This avoids silently destroying the user's input.
function normalizeDate(dateStr: string): string {
  // If the date is already in YYYY-MM-DD format, return it as-is.
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Try to parse US-style dates like MM/DD/YYYY.
  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const month = usMatch[1].padStart(2, "0");
    const day = usMatch[2].padStart(2, "0");
    const year = usMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Fall back to JavaScript Date parsing for other recognizable formats.
  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // If no parsing strategy works, return the original input unchanged.
  return dateStr;
}

// autoCategorize
// --------------
// Infers a transaction category from its description and type.
//
// Strategy:
// - lowercase the description for easier keyword matching
// - if transaction is income, match against income-related keywords
// - if transaction is expense, match against expense-related keywords
// - if no keyword matches, fall back to "Other"
//
// This function helps reduce user effort during transaction creation.
function autoCategorize(description: string, type: "expense" | "income"): TransactionCategory {
  // Normalize description to lowercase so matching is case-insensitive.
  const desc = description.toLowerCase();

  // Income categorization rules.
  if (type === "income") {
    if (desc.includes("salary") || desc.includes("payroll") || desc.includes("paycheck")) {
      return "Salary";
    }

    if (
      desc.includes("freelance") ||
      desc.includes("contract") ||
      desc.includes("client payment")
    ) {
      return "Freelance";
    }

    if (
      desc.includes("dividend") ||
      desc.includes("interest") ||
      desc.includes("stock") ||
      desc.includes("investment")
    ) {
      return "Investment";
    }

    // Default category for income if no known keywords match.
    return "Other";
  }

  // Expense categorization rules.

  if (
    desc.includes("restaurant") ||
    desc.includes("cafe") ||
    desc.includes("coffee") ||
    desc.includes("food") ||
    desc.includes("pizza") ||
    desc.includes("burger")
  ) {
    return "Food & Dining";
  }

  if (
    desc.includes("grocery") ||
    desc.includes("groceries") ||
    desc.includes("supermarket") ||
    desc.includes("market")
  ) {
    return "Groceries";
  }

  if (desc.includes("gas") || desc.includes("fuel")) {
    return "Gas";
  }

  if (
    desc.includes("uber") ||
    desc.includes("lyft") ||
    desc.includes("taxi") ||
    desc.includes("parking") ||
    desc.includes("transit")
  ) {
    return "Transportation";
  }

  if (
    desc.includes("electric") ||
    desc.includes("water") ||
    desc.includes("gas bill") ||
    desc.includes("internet") ||
    desc.includes("phone") ||
    desc.includes("utility") ||
    desc.includes("bill")
  ) {
    return "Bills & Utilities";
  }

  if (
    desc.includes("amazon") ||
    desc.includes("walmart") ||
    desc.includes("target") ||
    desc.includes("shopping") ||
    desc.includes("store")
  ) {
    return "Shopping";
  }

  if (
    desc.includes("movie") ||
    desc.includes("theater") ||
    desc.includes("netflix") ||
    desc.includes("spotify") ||
    desc.includes("game") ||
    desc.includes("entertainment")
  ) {
    return "Entertainment";
  }

  if (
    desc.includes("doctor") ||
    desc.includes("pharmacy") ||
    desc.includes("health") ||
    desc.includes("medical")
  ) {
    return "Healthcare";
  }

  if (
    desc.includes("tuition") ||
    desc.includes("school") ||
    desc.includes("course") ||
    desc.includes("education") ||
    desc.includes("bookstore")
  ) {
    return "Education";
  }

  if (
    desc.includes("flight") ||
    desc.includes("hotel") ||
    desc.includes("airbnb") ||
    desc.includes("travel") ||
    desc.includes("vacation")
  ) {
    return "Travel";
  }

  if (
    desc.includes("rent") ||
    desc.includes("mortgage") ||
    desc.includes("landlord")
  ) {
    return "Rent/Mortgage";
  }

  if (
    desc.includes("insurance") ||
    desc.includes("premium") ||
    desc.includes("policy")
  ) {
    return "Insurance";
  }

  // Final fallback if no expense keywords matched.
  return "Other";
}

// fetchTransactions
// -----------------
// Loads all transactions belonging to the currently authenticated user.
//
// Query behavior:
// - selects the fields needed by the app
// - filters rows by user_id
// - sorts newest dates first
// - uses created_at as a secondary sort when dates are equal
//
// Return value:
// A normalized array of Transaction objects safe for use in the UI.
export async function fetchTransactions(): Promise<Transaction[]> {
  // Resolve the current user's id so only their transactions are fetched.
  const userId = await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from("transactions")
    .select("id, description, amount, category, date, type, created_at")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  // Surface a friendly error if the database query fails.
  if (error) {
    throw new Error(`Failed to load transactions: ${error.message}`);
  }

  // Normalize raw database rows into the Transaction shape used by the app.
  return ((data as TransactionRow[] | null) ?? []).map((row) => ({
    // Ensure id is always a string, even if the database returns a number.
    id: String(row.id),

    // Preserve the core transaction fields.
    description: row.description,
    amount: row.amount,
    category: row.category,
    date: row.date,

    // Normalize the transaction type.
    // Any non-"income" value is treated as "expense" to keep the type safe.
    type: row.type === "income" ? "income" : "expense",

    // If created_at is missing, provide a fallback timestamp.
    created_at: row.created_at ?? new Date().toISOString()
  }));
}

// createTransaction
// -----------------
// Inserts a new transaction for the authenticated user.
//
// Input normalization performed before insert:
// - resolves current user id
// - determines transaction type if omitted
// - forces expense amounts to be negative
// - forces income amounts to be positive
// - trims category or auto-categorizes if no category is provided
// - normalizes date to YYYY-MM-DD when possible
export async function createTransaction(input: NewTransaction): Promise<void> {
  // Resolve the authenticated user so the new row is linked correctly.
  const userId = await getAuthenticatedUserId();

  // Determine the transaction type.
  // If type is not provided:
  // - non-negative amount -> income
  // - negative amount     -> expense
  const normalizedType = input.type ?? (input.amount >= 0 ? "income" : "expense");

  // Normalize amount sign so stored values are consistent:
  // - expenses are always negative
  // - income is always positive
  const normalizedAmount =
    normalizedType === "expense" ? -Math.abs(input.amount) : Math.abs(input.amount);

  const { error } = await supabase.from("transactions").insert({
    // Associate the transaction with the signed-in user.
    user_id: userId,

    // Save the original description.
    description: input.description,

    // Save the normalized signed amount.
    amount: normalizedAmount,

    // Use the provided category if available after trimming whitespace.
    // Otherwise, infer a category automatically from description + type.
    category: input.category?.trim() || autoCategorize(input.description, normalizedType),

    // Convert the date into a consistent format when possible.
    date: normalizeDate(input.date),

    // Save the resolved transaction type.
    type: normalizedType
  });

  // Throw a descriptive error if the insert fails.
  if (error) {
    throw new Error(`Failed to save transaction: ${error.message}`);
  }
}