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
  { id: "q1", label: "What is a budget?", prompt: "What is a budget?" },
  {
    id: "q2",
    label: "How much did I spend this month?",
    prompt: "How much did I spend this month?",
  },
  {
    id: "q3",
    label: "What did I earn this month?",
    prompt: "What did I earn this month?",
  },
  {
    id: "q4",
    label: "What am I spending the most on?",
    prompt: "What am I spending the most on?",
  },
  {
    id: "q5",
    label: "Show recent transactions",
    prompt: "Show recent transactions",
  },
  {
    id: "q6",
    label: "What is the 50/30/20 rule?",
    prompt: "What is the 50/30/20 rule?",
  },
  {
    id: "q7",
    label: "How can I save more money?",
    prompt: "How can I save more money?",
  },
  {
    id: "q8",
    label: "Emergency savings help",
    prompt: "How much should I keep in emergency savings?",
  },
  {
    id: "q9",
    label: "Am I spending more than I make?",
    prompt: "Am I spending more than I make?",
  },
  {
    id: "q10",
    label: "Give me 3 budgeting tips",
    prompt: "Give me 3 budgeting tips",
  },
];

// Paste the Codespaces backend URL here.
const BACKEND_URL = "https://zany-funicular-974v7r954qrj24q7-3001.app.github.dev";

function formatMoney(amount: number): string {
  return `$${Math.abs(amount).toFixed(2)}`;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function safeDate(dateString?: string): number {
  if (!dateString) return 0;
  const time = new Date(dateString).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function buildTransactionContext(transactions: Transaction[]) {
  const currentMonthKey = getCurrentMonthKey();

  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  const categoryTotals: Record<string, number> = {};

  const recentTransactions = [...transactions]
    .sort((a, b) => safeDate(b.created_at) - safeDate(a.created_at))
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      description: t.description || "No description",
      amount: Math.abs(Number(t.amount) || 0),
      type: t.type || "unknown",
      category: t.category?.trim() || "Uncategorized",
      date: t.date || "No date",
      created_at: t.created_at || "",
    }));

  for (const t of transactions) {
    const transactionDate = t.date ?? "";
    const numericAmount = Math.abs(Number(t.amount) || 0);

    if (transactionDate.startsWith(currentMonthKey)) {
      if (t.type === "income") {
        monthlyIncome += numericAmount;
      } else {
        monthlyExpenses += numericAmount;
      }
    }

    if (t.type === "expense") {
      const category = t.category?.trim() || "Uncategorized";
      categoryTotals[category] = (categoryTotals[category] || 0) + numericAmount;
    }
  }

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, total]) => ({
      category,
      total,
      formattedTotal: formatMoney(total),
    }));

  return {
    summary: {
      monthlyIncome,
      monthlyExpenses,
      monthlyNet: monthlyIncome - monthlyExpenses,
      formattedMonthlyIncome: formatMoney(monthlyIncome),
      formattedMonthlyExpenses: formatMoney(monthlyExpenses),
      formattedMonthlyNet: formatMoney(monthlyIncome - monthlyExpenses),
      totalTransactions: transactions.length,
    },
    topCategories,
    recentTransactions,
  };
}

export async function getHelpResponse(question: string): Promise<string> {
  const transactions = await fetchTransactions();
  const financialContext = buildTransactionContext(transactions);

  const response = await fetch(`${BACKEND_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: question,
      financialContext,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Failed to get AI response.");
  }

  if (!data?.reply || typeof data.reply !== "string") {
    throw new Error("Backend returned an invalid AI response.");
  }

  return data.reply;
}
