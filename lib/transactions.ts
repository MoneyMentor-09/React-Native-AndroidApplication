import { supabase } from "./supabase";

export type Transaction = {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  date: string;
  type: "expense" | "income";
  created_at: string;
};

export type NewTransaction = {
  description: string;
  amount: number;
  category?: string | null;
  date: string;
  type?: "expense" | "income";
};

type TransactionRow = {
  id: number | string;
  description: string;
  amount: number;
  category: string | null;
  date: string;
  type: string | null;
  created_at: string | null;
};

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

function normalizeDate(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const month = usMatch[1].padStart(2, "0");
    const day = usMatch[2].padStart(2, "0");
    const year = usMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return dateStr;
}

function autoCategorize(description: string): string {
  const desc = description.toLowerCase();

  if (
    desc.includes("restaurant") ||
    desc.includes("cafe") ||
    desc.includes("coffee") ||
    desc.includes("food") ||
    desc.includes("grocery") ||
    desc.includes("market") ||
    desc.includes("pizza") ||
    desc.includes("burger")
  ) {
    return "Food & Dining";
  }

  if (
    desc.includes("gas") ||
    desc.includes("fuel") ||
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
    desc.includes("utility")
  ) {
    return "Utilities";
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
    desc.includes("gym") ||
    desc.includes("fitness") ||
    desc.includes("doctor") ||
    desc.includes("pharmacy") ||
    desc.includes("health") ||
    desc.includes("medical")
  ) {
    return "Health & Fitness";
  }

  if (
    desc.includes("salary") ||
    desc.includes("payroll") ||
    desc.includes("deposit") ||
    desc.includes("payment received") ||
    desc.includes("income")
  ) {
    return "Income";
  }

  return "Other";
}

export async function fetchTransactions(): Promise<Transaction[]> {
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

  return ((data as TransactionRow[] | null) ?? []).map((row) => ({
    id: String(row.id),
    description: row.description,
    amount: row.amount,
    category: row.category,
    date: row.date,
    type: row.type === "income" ? "income" : "expense",
    created_at: row.created_at ?? new Date().toISOString()
  }));
}

export async function createTransaction(input: NewTransaction): Promise<void> {
  const userId = await getAuthenticatedUserId();
  const normalizedType = input.type ?? (input.amount >= 0 ? "income" : "expense");
  const normalizedAmount =
    normalizedType === "expense" ? -Math.abs(input.amount) : Math.abs(input.amount);

  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    description: input.description,
    amount: normalizedAmount,
    category: input.category?.trim() || autoCategorize(input.description),
    date: normalizeDate(input.date),
    type: normalizedType
  });

  if (error) {
    throw new Error(`Failed to save transaction: ${error.message}`);
  }
}
