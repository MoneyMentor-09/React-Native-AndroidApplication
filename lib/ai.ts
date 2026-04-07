// import { supabase } from "./supabase"; // FUTURE AI: uncomment when re-enabling Supabase Edge Function calls
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
    .slice(0, 5);

  for (const t of transactions) {
    const transactionDate = t.date ?? "";

    if (transactionDate.startsWith(currentMonthKey)) {
      if (t.type === "income") {
        monthlyIncome += Math.abs(Number(t.amount) || 0);
      } else {
        monthlyExpenses += Math.abs(Number(t.amount) || 0);
      }
    }

    if (t.type === "expense") {
      const category = t.category?.trim() || "Uncategorized";
      categoryTotals[category] =
        (categoryTotals[category] || 0) + Math.abs(Number(t.amount) || 0);
    }
  }

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return {
    monthlyIncome,
    monthlyExpenses,
    monthlyNet: monthlyIncome - monthlyExpenses,
    totalTransactions: transactions.length,
    recentTransactions,
    topCategories,
  };
}

export async function getHelpResponse(question: string): Promise<string> {
  const transactions = await fetchTransactions();
  const context = buildTransactionContext(transactions);
  const q = question.trim().toLowerCase();

  if (q.includes("what is a budget")) {
    return "A budget is a plan for how you use your money. It helps you track income, control spending, and make sure you have enough for bills, savings, and goals.";
  }

  if (q.includes("how much did i spend this month")) {
    return `So far this month, you have spent ${formatMoney(context.monthlyExpenses)}.`;
  }

  if (q.includes("what did i earn this month")) {
    return `So far this month, you have earned ${formatMoney(context.monthlyIncome)}.`;
  }

  if (q.includes("what am i spending the most on")) {
    if (context.topCategories.length === 0) {
      return "I could not find enough expense category data yet to show your top spending categories.";
    }

    const lines = context.topCategories
      .map(
        ([category, total], index) =>
          `${index + 1}. ${category}: ${formatMoney(total)}`
      )
      .join("\n");

    return `Your top spending categories are:\n${lines}`;
  }

  if (q.includes("show recent transactions")) {
    if (context.recentTransactions.length === 0) {
      return "I could not find any recent transactions yet.";
    }

    const lines = context.recentTransactions
      .map((t) => {
        const description = t.description || "No description";
        const amount = formatMoney(Number(t.amount) || 0);
        const date = t.date || "No date";
        return `• ${description} — ${amount} on ${date}`;
      })
      .join("\n");

    return `Here are your most recent transactions:\n${lines}`;
  }

  if (q.includes("50/30/20")) {
    return "The 50/30/20 rule is a simple budgeting method: about 50% of income goes to needs, 30% to wants, and 20% to savings or debt payoff.";
  }

  if (q.includes("how can i save more money")) {
    return "A good way to save more is to track your biggest spending categories, cut one non-essential expense, and move a set amount into savings each payday.";
  }

  if (q.includes("emergency savings")) {
    return "A common goal is to build an emergency fund that covers 3 to 6 months of essential expenses. Starting with a smaller goal like $500 or $1,000 is also a great first step.";
  }

  if (q.includes("am i spending more than i make")) {
    if (context.monthlyExpenses > context.monthlyIncome) {
      return `Right now, your monthly spending (${formatMoney(
        context.monthlyExpenses
      )}) is higher than your monthly income (${formatMoney(
        context.monthlyIncome
      )}).`;
    }

    return `Right now, your monthly income (${formatMoney(
      context.monthlyIncome
    )}) is higher than your monthly spending (${formatMoney(
      context.monthlyExpenses
    )}).`;
  }

  if (q.includes("3 budgeting tips")) {
    return `Here are 3 budgeting tips:
1. Review your spending every week.
2. Set a limit for your biggest spending category.
3. Save a small fixed amount each month before spending on extras.`;
  }

  return "I can help with budgeting basics, recent transactions, monthly spending, income, and savings tips.";
}

/*
Future AI integration can be added back later by:
- uncommenting the supabase import
- sending question + transaction context to a Supabase Edge Function
- swapping getHelpResponse() in the widget back to askFinanceAssistant()
*/
