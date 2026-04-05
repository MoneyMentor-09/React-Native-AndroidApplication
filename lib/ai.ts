import { supabase } from "./supabase";
import { fetchTransactions, type Transaction } from "./transactions";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

export type QuickQuestion = {
  id: string;
  label: string;
  prompt: string;
};

export const QUICK_QUESTIONS: QuickQuestion[] = [
  {
    id: "q1",
    label: "Spending this month",
    prompt: "How much have I spent this month?",
  },
  {
    id: "q2",
    label: "Top categories",
    prompt: "What categories am I spending the most on?",
  },
  {
    id: "q3",
    label: "Recent transactions",
    prompt: "Summarize my recent transactions.",
  },
  {
    id: "q4",
    label: "Budget tips",
    prompt: "Based on my transactions, give me 3 budget tips.",
  },
];

function formatMoney(amount: number): string {
  return `$${Math.abs(amount).toFixed(2)}`;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function buildTransactionContext(transactions: Transaction[]) {
  const currentMonthKey = getCurrentMonthKey();

  const recent = [...transactions]
    .sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return bTime - aTime;
    })
    .slice(0, 20)
    .map((t) => ({
      description: t.description,
      amount: t.amount,
      category: t.category ?? "Uncategorized",
      date: t.date,
      type: t.type,
    }));

  let monthlyIncome = 0;
  let monthlyExpenses = 0;

  const categoryTotals: Record<string, number> = {};

  for (const t of transactions) {
    if (t.date.startsWith(currentMonthKey)) {
      if (t.type === "income") {
        monthlyIncome += Math.abs(t.amount);
      } else {
        monthlyExpenses += Math.abs(t.amount);
      }
    }

    if (t.type === "expense") {
      const category = t.category ?? "Uncategorized";
      categoryTotals[category] = (categoryTotals[category] ?? 0) + Math.abs(t.amount);
    }
  }

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, total]) => ({
      category,
      total,
      prettyTotal: formatMoney(total),
    }));

  return {
    summary: {
      monthlyIncome,
      monthlyExpenses,
      monthlyNet: monthlyIncome - monthlyExpenses,
      totalTransactions: transactions.length,
      currentMonth: currentMonthKey,
      prettyMonthlyIncome: formatMoney(monthlyIncome),
      prettyMonthlyExpenses: formatMoney(monthlyExpenses),
      prettyMonthlyNet: `${monthlyIncome - monthlyExpenses < 0 ? "-" : ""}$${Math.abs(
        monthlyIncome - monthlyExpenses
      ).toFixed(2)}`,
    },
    topCategories,
    recentTransactions: recent,
  };
}

export async function askFinanceAssistant(question: string): Promise<string> {
  const transactions = await fetchTransactions();
  const context = buildTransactionContext(transactions);

  const { data, error } = await supabase.functions.invoke("ai-chat", {
    body: {
      question,
      context,
    },
  });

  if (error) {
    throw new Error(error.message || "Failed to reach AI assistant.");
  }

  if (!data?.answer || typeof data.answer !== "string") {
    throw new Error("AI assistant returned an invalid response.");
  }

  return data.answer;
}
