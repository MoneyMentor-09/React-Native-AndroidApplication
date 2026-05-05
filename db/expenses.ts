import { supabase } from "../lib/supabase";
import type { Expense, NewExpense } from "../types";

// Compatibility shape for transaction rows that are exposed through the older
// Expense-oriented API in this module.
type TransactionRow = {
  id: number | string;
  description: string;
  amount: number;
  category: string | null;
  date: string;
  type: string | null;
  created_at: string | null;
};

// Expense helpers are still user-scoped, so every read/write starts by
// resolving the current Supabase auth session.
async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(`Failed to resolve authenticated user: ${error.message}`);
  }

  const userId = data.session?.user?.id;
  if (!userId) {
    throw new Error("No authenticated user session found. Please sign in again.");
  }

  return userId;
}

// Adapts the canonical transactions table to the legacy Expense type used by
// receipt-related components.
function toExpense(row: TransactionRow): Expense {
  const notesParts = [
    row.category ? `Category: ${row.category}` : null,
    row.type ? `Type: ${row.type}` : null
  ].filter(Boolean);

  return {
    id: row.id,
    vendor: row.description,
    expenseDate: row.date,
    amount: row.amount,
    notes: notesParts.length > 0 ? notesParts.join(" | ") : undefined,
    createdAt: row.created_at ?? new Date().toISOString()
  };
}

export async function initExpensesDb(): Promise<void> {
  // Supabase schema is managed remotely; nothing to initialize on device.
}

// Returns transactions as expenses for older call sites. New transaction
// features should prefer lib/transactions.ts directly.
export async function listExpenses(): Promise<Expense[]> {
  const userId = await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from("transactions")
    .select("id, description, amount, category, date, type, created_at")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load transactions: ${error.message}`);
  }

  return (data as TransactionRow[] | null)?.map(toExpense) ?? [];
}

// Inserts an expense-style record into the transactions table. The newer
// createTransaction helper performs more normalization and categorization.
export async function insertExpense(expense: NewExpense): Promise<void> {
  const userId = await getAuthenticatedUserId();

  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    description: expense.vendor,
    amount: expense.amount,
    category: "Uncategorized",
    date: expense.expenseDate,
    type: "expense"
  });

  if (error) {
    throw new Error(`Failed to save transaction: ${error.message}`);
  }
}
