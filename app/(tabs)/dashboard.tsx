// Ionicons
// --------
// Expo icon library used throughout the dashboard for:
// - summary card icons
// - loading / empty / error states
// - transaction direction icons
// - category icons in recent activity rows
import { Ionicons } from "@expo/vector-icons";

// Router
// ------
// Used for programmatic navigation to screens such as /transactions.
import { router } from "expo-router";

// React hooks
// -----------
// useEffect -> runs side effects such as loading data on mount
// useState  -> stores component state like transactions, loading, refresh, and error states
import { useEffect, useState } from "react";

// React Native components
// -----------------------
// ActivityIndicator -> loading spinner
// Pressable         -> touchable button component
// RefreshControl    -> pull-to-refresh support for ScrollView
// ScrollView        -> vertical scroll container for the dashboard
// StyleSheet        -> optimized styles
// Text/View         -> core UI layout and text components
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Transaction utilities
// ---------------------
// fetchTransactions retrieves saved transactions from your data layer.
// Transaction type defines the shape of a transaction object.
import { fetchTransactions, type Transaction } from "../../lib/transactions";

/**
 * DashboardMetrics type
 * ---------------------
 * Defines the computed data used to render the dashboard:
 * - periodExpenseTotal: total expenses for the selected period
 * - periodIncomeTotal: total income for the selected period
 * - netTotal: income minus expenses
 * - topCategories: highest spending categories for the selected period
 * - spendingTrend: grouped expense totals for chart rendering
 * - recentTransactions: most recent transactions shown in the UI
 *
 * This keeps all derived dashboard values grouped into one predictable object
 * after raw transaction data has been processed.
 */
type DashboardMetrics = {
  periodExpenseTotal: number;
  periodIncomeTotal: number;
  netTotal: number;
  topCategories: Array<{ name: string; total: number; share: number; color: string }>;
  spendingTrend: Array<{ label: string; total: number }>;
  recentTransactions: Transaction[];
};

/**
 * DashboardPeriod type
 * --------------------
 * Restricts the dashboard filter to only the supported time windows.
 */
type DashboardPeriod = "week" | "month" | "year";

/**
 * CHART_COLORS
 * ------------
 * Reusable color palette assigned to top spending categories.
 * Colors cycle if more categories exist than colors available.
 */
const CHART_COLORS = ["#2563EB", "#0F766E", "#EA580C", "#7C3AED", "#DC2626"];

/**
 * PERIOD_OPTIONS
 * --------------
 * Metadata used to render the period filter chips.
 * key   -> internal state value
 * label -> user-facing text shown in the chip
 */
const PERIOD_OPTIONS: Array<{ key: DashboardPeriod; label: string }> = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
];

/**
 * CATEGORY_ICONS
 * --------------
 * Maps transaction category names to icon names so each recent activity row
 * can show a category-appropriate visual.
 *
 * Any category not present here will fall back to the generic tag icon
 * in getCategoryIcon().
 */
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  "Food & Dining": "restaurant-outline",
  Transportation: "car-outline",
  Shopping: "bag-handle-outline",
  Entertainment: "film-outline",
  "Bills & Utilities": "flash-outline",
  Healthcare: "medical-outline",
  Education: "school-outline",
  Travel: "airplane-outline",
  Groceries: "cart-outline",
  Gas: "speedometer-outline",
  "Rent/Mortgage": "home-outline",
  Insurance: "shield-checkmark-outline",
  Salary: "wallet-outline",
  Freelance: "briefcase-outline",
  Investment: "trending-up-outline",
  Other: "pricetag-outline",
};

/**
 * getCategoryIcon
 * ---------------
 * Safely resolves the correct icon for a category.
 *
 * Behavior:
 * - trims whitespace
 * - falls back to "Other" if category is empty/null/undefined
 * - falls back to "pricetag-outline" if category is unknown
 */
function getCategoryIcon(category: string | null | undefined): keyof typeof Ionicons.glyphMap {
  const normalizedCategory = category?.trim() || "Other";
  return CATEGORY_ICONS[normalizedCategory] ?? "pricetag-outline";
}

/**
 * formatCurrency
 * --------------
 * Formats a number into US currency.
 * Example:
 * 1200 -> "$1,200"
 *
 * maximumFractionDigits: 0 removes cents from the display.
 * This keeps dashboard summary numbers visually cleaner.
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * buildDashboardMetrics
 * ---------------------
 * Converts raw transactions into dashboard-friendly summary data.
 *
 * Steps performed:
 * 1. Filters transactions into the selected period range
 * 2. Separates income and expense totals
 * 3. Groups period expenses by category
 * 4. Builds a "top categories" list with percentage shares
 * 5. Computes chart-friendly spending trend buckets
 * 6. Selects the most recent 5 transactions in the selected period
 *
 * This function keeps all aggregation logic outside the render body
 * so the screen component remains easier to read and maintain.
 */
function buildDashboardMetrics(transactions: Transaction[], period: DashboardPeriod): DashboardMetrics {
  // Capture the current moment as the reference point for the selected period.
  const now = new Date();

  // start/end define the inclusive/exclusive time window:
  // keep transactions where start <= txDate < end
  const start = new Date(now);
  const end = new Date(now);

  if (period === "week") {
    // JavaScript getDay():
    // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    // This implementation treats Sunday as the first day of the week.
    const dayOfWeek = now.getDay();

    // Move start to the beginning of the current week at midnight.
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - dayOfWeek);

    // End is 7 days after the week start, also at midnight.
    end.setHours(0, 0, 0, 0);
    end.setDate(start.getDate() + 7);
  } else if (period === "month") {
    // Start at the first day of the current month.
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    // End at the first day of the next month.
    end.setMonth(now.getMonth() + 1, 1);
    end.setHours(0, 0, 0, 0);
  } else {
    // Year view:
    // start at January 1st of the current year
    // end at January 1st of the next year
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setFullYear(now.getFullYear() + 1, 0, 1);
    end.setHours(0, 0, 0, 0);
  }

  // Keep only transactions whose dates are valid and fall within the selected range.
  const periodTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date);

    // Ignore malformed dates so they do not distort dashboard metrics.
    if (Number.isNaN(txDate.getTime())) {
      return false;
    }

    return txDate >= start && txDate < end;
  });

  // Running totals for the current period.
  let periodExpenseTotal = 0;
  let periodIncomeTotal = 0;

  // Map of category name -> total spending amount for that category.
  const categoryTotals = new Map<string, number>();

  // Compute totals in a single pass through the filtered transactions.
  for (const tx of periodTransactions) {
    // Use absolute values so totals are positive even if expenses are stored as negatives.
    const absoluteAmount = Math.abs(tx.amount);

    if (tx.type === "income") {
      periodIncomeTotal += absoluteAmount;
    } else {
      periodExpenseTotal += absoluteAmount;

      // Normalize missing or blank categories to "Other".
      const categoryName = tx.category?.trim() || "Other";
      categoryTotals.set(categoryName, (categoryTotals.get(categoryName) ?? 0) + absoluteAmount);
    }
  }

  // Convert the category totals map into a sorted array of the top 5 categories.
  // Each category also gets a share value used for progress bar widths
  // and a display color from CHART_COLORS.
  const topCategories = [...categoryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, total], index) => ({
      name,
      total,
      share: periodExpenseTotal > 0 ? total / periodExpenseTotal : 0,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

  // spendingTrend is prepared for the optional chart section.
  // Although the chart is currently commented out, this data structure
  // is still generated so the screen can support that section when enabled.
  let spendingTrend: Array<{ label: string; total: number }> = [];

  if (period === "week") {
    // Build one expense bucket for each day of the current week.
    spendingTrend = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);

      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);

      // Sum only expense transactions occurring on this specific day.
      const total = periodTransactions.reduce((sum, tx) => {
        if (tx.type === "income") {
          return sum;
        }

        const txDate = new Date(tx.date);
        return txDate >= day && txDate < nextDay ? sum + Math.abs(tx.amount) : sum;
      }, 0);

      return {
        label: day.toLocaleDateString("en-US", { weekday: "short" }),
        total,
      };
    });
  } else if (period === "month") {
    // Approximate the month as 7-day weekly buckets: W1, W2, W3, etc.
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const weekCount = Math.ceil(daysInMonth / 7);

    spendingTrend = Array.from({ length: weekCount }, (_, index) => {
      const weekStart = new Date(start);
      weekStart.setDate(1 + index * 7);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      // Sum only expense transactions in this 7-day range.
      const total = periodTransactions.reduce((sum, tx) => {
        if (tx.type === "income") {
          return sum;
        }

        const txDate = new Date(tx.date);
        return txDate >= weekStart && txDate < weekEnd ? sum + Math.abs(tx.amount) : sum;
      }, 0);

      return {
        label: `W${index + 1}`,
        total,
      };
    });
  } else {
    // Build one bucket per month for the current year.
    spendingTrend = Array.from({ length: 12 }, (_, index) => {
      const monthStart = new Date(now.getFullYear(), index, 1);
      const monthEnd = new Date(now.getFullYear(), index + 1, 1);

      // Sum only expense transactions in this month.
      const total = periodTransactions.reduce((sum, tx) => {
        if (tx.type === "income") {
          return sum;
        }

        const txDate = new Date(tx.date);
        return txDate >= monthStart && txDate < monthEnd ? sum + Math.abs(tx.amount) : sum;
      }, 0);

      return {
        label: monthStart.toLocaleDateString("en-US", { month: "short" }),
        total,
      };
    });
  }

  // Sort filtered transactions newest-first, then keep only the latest five
  // for the "Recent activity" section.
  const recentTransactions = periodTransactions
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return {
    periodExpenseTotal,
    periodIncomeTotal,
    netTotal: periodIncomeTotal - periodExpenseTotal,
    topCategories,
    spendingTrend,
    recentTransactions,
  };
}

/**
 * SummaryCard Component
 * ---------------------
 * Reusable card used for summary metrics such as:
 * - Expenses
 * - Income
 *
 * Props:
 * - label: text label shown above the value
 * - value: formatted amount
 * - accent: background color of the icon circle
 * - icon: Ionicons icon name
 *
 * Keeping this as a reusable component avoids duplicated UI markup
 * for each summary card.
 */
function SummaryCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.summaryCard}>
      {/* Small colored icon badge for the card */}
      <View style={[styles.summaryIcon, { backgroundColor: accent }]}>
        <Ionicons name={icon} size={18} color="#FFFFFF" />
      </View>

      {/* Metric label, e.g. "Expenses" or "Income" */}
      <Text style={styles.summaryLabel}>{label}</Text>

      {/* Main formatted value shown on the card */}
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

/**
 * DashboardScreen Component
 * -------------------------
 * Main dashboard screen.
 *
 * Responsibilities:
 * - load transactions
 * - handle loading / error / empty states
 * - compute metrics from transactions
 * - render cards, charts, and recent transaction activity
 */
export default function DashboardScreen() {
  // Raw transaction records loaded from the data layer.
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // True while the initial dashboard load is happening.
  const [isLoading, setIsLoading] = useState(true);

  // True while pull-to-refresh is active.
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stores a human-readable load error, if one occurs.
  const [error, setError] = useState<string | null>(null);

  // Controls which period filter is currently applied to dashboard metrics.
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>("month");

  /**
   * loadTransactions
   * ----------------
   * Shared async loader used for:
   * - initial data fetch on mount
   * - manual retry after an error
   * - pull-to-refresh
   *
   * isPullToRefresh changes which loading state is shown.
   */
  const loadTransactions = async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Request saved transactions from the data layer.
      const data = await fetchTransactions();

      // Save successful results into state.
      setTransactions(data);

      // Clear any previous error after a successful fetch.
      setError(null);
    } catch (loadError) {
      // Normalize thrown values into a user-friendly message.
      const message =
        loadError instanceof Error ? loadError.message : "Unable to load dashboard data.";
      setError(message);
    } finally {
      // Reset all loading flags no matter the outcome.
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  /**
   * Load dashboard data once when the screen first mounts.
   *
   * `void` is used to intentionally ignore the Promise result here.
   */
  useEffect(() => {
    void loadTransactions();
  }, []);

  // Loading state shown before transactions are ready.
  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.stateTitle}>Loading dashboard</Text>
      </View>
    );
  }

  // Error state shown if fetchTransactions fails.
  if (error) {
    return (
      <View style={styles.centerState}>
        <View style={styles.stateIconWrap}>
          <Ionicons name="alert-circle-outline" size={42} color="#DC2626" />
        </View>
        <Text style={styles.stateTitle}>Dashboard unavailable</Text>
        <Text style={styles.stateSubtitle}>{error}</Text>

        {/* Retry button reruns the transaction fetch */}
        <Pressable style={styles.primaryButton} onPress={() => void loadTransactions()}>
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // Empty state shown when the fetch succeeds but no transactions exist yet.
  if (transactions.length === 0) {
    return (
      <View style={styles.centerState}>
        <View style={styles.stateIconWrap}>
          <Ionicons name="bar-chart-outline" size={42} color="#9CA3AF" />
        </View>
        <Text style={styles.stateTitle}>No financial data yet</Text>
        <Text style={styles.stateSubtitle}>
          Add a transaction or scan a receipt to start building your dashboard.
        </Text>

        {/* CTA takes the user to the transactions screen to add data */}
        <Pressable style={styles.primaryButton} onPress={() => router.push("/transactions")}>
          <Text style={styles.primaryButtonText}>Add Transaction</Text>
        </Pressable>
      </View>
    );
  }

  // Derive dashboard-ready summary values from the raw transactions.
  const metrics = buildDashboardMetrics(transactions, selectedPeriod);

  // Maximum chart bucket value, used to scale the optional trend bars.
  // Fallback of 1 avoids divide-by-zero when every bucket total is 0.
  const maxTrendSpend = Math.max(...metrics.spendingTrend.map((item) => item.total), 1);

  // Human-readable label for the currently selected period chip.
  const activePeriodLabel =
    PERIOD_OPTIONS.find((option) => option.key === selectedPeriod)?.label ?? "This month";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          // Shows the native refresh indicator during pull-to-refresh.
          refreshing={isRefreshing}
          // Reloads transactions when the user pulls down.
          onRefresh={() => void loadTransactions(true)}
          tintColor="#2563EB"
        />
      }
    >
      {/* Period filter chips for week / month / year */}
      <View style={styles.periodFilterWrap}>
        {PERIOD_OPTIONS.map((option) => {
          const isActive = option.key === selectedPeriod;

          return (
            <Pressable
              key={option.key}
              onPress={() => setSelectedPeriod(option.key)}
              style={[styles.periodChip, isActive && styles.periodChipActive]}
            >
              <Text style={[styles.periodChipText, isActive && styles.periodChipTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Hero card highlighting the net amount for the selected period */}
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>{activePeriodLabel}</Text>
        <Text style={styles.heroValue}>{formatCurrency(metrics.netTotal)}</Text>
        <Text style={styles.heroSubtitle}>
          {metrics.netTotal >= 0 ? "Net positive" : "Net spending"} across your latest activity
        </Text>
      </View>

      {/* Summary cards for total expenses and income */}
      <View style={styles.summaryGrid}>
        <SummaryCard
          label="Expenses"
          // Expense totals are stored/aggregated as positive magnitudes,
          // but displayed as negative for clearer financial meaning.
          value={formatCurrency(-metrics.periodExpenseTotal)}
          accent="#DC2626"
          icon="caret-up-outline"
        />
        <SummaryCard
          label="Income"
          value={formatCurrency(metrics.periodIncomeTotal)}
          accent="#059669"
          icon="caret-down-outline"
        />
      </View>

      {/* Category spending breakdown section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Spending by category</Text>

        {metrics.topCategories.length > 0 ? (
          metrics.topCategories.map((category) => (
            <View key={category.name} style={styles.categoryRow}>
              {/* Top row containing category name and formatted amount */}
              <View style={styles.categoryHeader}>
                <View style={styles.categoryNameWrap}>
                  {/* Small color dot matching this category's progress bar */}
                  <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                  <Text style={styles.categoryName}>{category.name}</Text>
                </View>
                <Text style={styles.categoryAmount}>{formatCurrency(category.total)}</Text>
              </View>

              {/* Horizontal progress bar representing share of total spend */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      // Minimum width of 6% keeps very small categories visible.
                      width: `${Math.max(category.share * 100, 6)}%`,
                      backgroundColor: category.color,
                    },
                  ]}
                />
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptySectionText}>
            No expense categories recorded for {activePeriodLabel.toLowerCase()}.
          </Text>
        )}
      </View>

      {/*
      Optional spending trend section
      -------------------------------
      This chart is currently disabled, but the code is preserved for future use.
      It renders a simple bar chart using metrics.spendingTrend and scales each
      bar height relative to maxTrendSpend.

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Spending trend</Text>

        <View style={styles.weekChart}>
          {metrics.spendingTrend.map((item) => (
            <View key={item.label} style={styles.weekBarColumn}>
              <Text style={styles.weekValue}>{item.total > 0 ? formatCurrency(item.total) : "$0"}</Text>
              <View style={styles.weekBarTrack}>
                <View
                  style={[
                    styles.weekBarFill,
                    {
                      height: `${Math.max((item.total / maxTrendSpend) * 100, item.total > 0 ? 10 : 0)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.weekLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
      */}

      {/* Recent transactions section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent activity</Text>

          {/* Link to full transactions screen */}
          <Pressable onPress={() => router.push("/transactions")}>
            <Text style={styles.linkText}>View all</Text>
          </Pressable>
        </View>

        {metrics.recentTransactions.length > 0 ? (
          metrics.recentTransactions.map((tx) => {
            const isIncome = tx.type === "income";

            // Normalize empty categories to "Other" for consistent display.
            const categoryName = tx.category?.trim() || "Other";

            return (
              <View key={tx.id} style={styles.transactionRow}>
                {/* Circular badge showing a category icon with income/expense tint */}
                <View
                  style={[styles.transactionIconWrap, isIncome ? styles.incomeTint : styles.expenseTint]}
                >
                  <Ionicons
                    name={getCategoryIcon(categoryName)}
                    size={18}
                    color={isIncome ? "#047857" : "#B91C1C"}
                  />
                </View>

                {/* Main text block for transaction description and metadata */}
                <View style={styles.transactionText}>
                  <Text style={styles.transactionTitle}>{tx.description}</Text>
                  <Text style={styles.transactionMeta}>
                    {categoryName + " • " + tx.date}
                  </Text>
                </View>

                {/* Signed amount styled according to income vs expense */}
                <Text style={[styles.transactionAmount, isIncome ? styles.incomeAmount : styles.expenseAmount]}>
                  {isIncome ? "+" : "-"}
                  {formatCurrency(Math.abs(tx.amount))}
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptySectionText}>
            No transactions recorded for {activePeriodLabel.toLowerCase()}.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

/**
 * Stylesheet
 * ----------
 * Centralized style definitions for the dashboard.
 * Keeping styles here keeps JSX cleaner and makes visual tuning easier.
 */
const styles = StyleSheet.create({
  // Outer ScrollView wrapper for the dashboard screen.
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc00",
  },

  // Inner content spacing for all dashboard sections.
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
  },

  // Shared centered layout used by loading, error, and empty states.
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
  },

  // Rounded background container for state icons.
  stateIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  // Large heading text for loading/error/empty screens.
  stateTitle: {
    marginTop: 14,
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  // Supporting body text for loading/error/empty screens.
  stateSubtitle: {
    marginTop: 10,
    maxWidth: 320,
    textAlign: "center",
    color: "#6B7280",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },

  // Main hero summary card near the top of the screen.
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
  },

  // Small label above the hero value, e.g. "This month".
  heroEyebrow: {
    color: "#111727",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },

  // Large net total value shown in the hero card.
  heroValue: {
    color: "#111827",
    fontSize: 34,
    fontWeight: "900",
  },

  // Secondary text below the hero value.
  heroSubtitle: {
    color: "#111727",
    fontSize: 15,
    marginTop: 8,
  },

  // Two-column layout for the summary cards.
  summaryGrid: {
    flexDirection: "row",
    gap: 14,
  },

  // Wrapper for the period filter chips.
  periodFilterWrap: {
    alignSelf: "center",
    width: "100%",
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },

  // Base style for an inactive period chip.
  periodChip: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  // Active state background for a selected period chip.
  periodChipActive: {
    backgroundColor: "#2563EB",
  },

  // Base text style for period chips.
  periodChipText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
  },

  // Text color override for the selected period chip.
  periodChipTextActive: {
    color: "#FFFFFF",
  },

  // Reusable summary card container.
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
  },

  // Small circular icon badge inside a summary card.
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  // Label text in the summary card.
  summaryLabel: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },

  // Main amount text in the summary card.
  summaryValue: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 8,
  },

  // Generic white content card used for dashboard sections.
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    gap: 14,
  },

  // Header row for sections with a title and action link.
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // Section title text.
  sectionTitle: {
    color: "#0F172A",
    fontSize: 19,
    fontWeight: "800",
  },

  // Action/link text such as "View all".
  linkText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700",
  },

  // Wrapper for each category item in the spending list.
  categoryRow: {
    gap: 10,
  },

  // Top row of each category item containing label and amount.
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // Left side of the category row with dot + name.
  categoryNameWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 12,
  },

  // Small colored dot representing the category color.
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Category label text.
  categoryName: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "600",
  },

  // Category amount text on the right.
  categoryAmount: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
  },

  // Background track for category progress bars.
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },

  // Filled portion of the progress bar.
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  // Shared empty text used within dashboard sections.
  emptySectionText: {
    color: "#6B7280",
    fontSize: 15,
    lineHeight: 22,
  },

  // Layout wrapper for the optional bar chart section.
  weekChart: {
    height: 180,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },

  // A single bar + label column in the optional trend chart.
  weekBarColumn: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },

  // Small text above each chart bar showing the bucket amount.
  weekValue: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
  },

  // Background track for each chart bar.
  weekBarTrack: {
    width: "100%",
    flex: 1,
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    justifyContent: "flex-end",
    overflow: "hidden",
    minHeight: 110,
  },

  // Filled chart bar.
  weekBarFill: {
    width: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 999,
  },

  // Bottom label for each chart bar.
  weekLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },

  // One row in the recent activity list.
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  // Circular icon container for recent transactions.
  transactionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  // Light green background for income rows.
  incomeTint: {
    backgroundColor: "#D1FAE5",
  },

  // Light red background for expense rows.
  expenseTint: {
    backgroundColor: "#FEE2E2",
  },

  // Middle text column for transaction details.
  transactionText: {
    flex: 1,
  },

  // Primary transaction description text.
  transactionTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },

  // Secondary metadata text showing category and date.
  transactionMeta: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 4,
  },

  // Base amount text for recent activity rows.
  transactionAmount: {
    fontSize: 15,
    fontWeight: "800",
  },

  // Amount color for income transactions.
  incomeAmount: {
    color: "#047857",
  },

  // Amount color for expense transactions.
  expenseAmount: {
    color: "#B91C1C",
  },

  // Shared CTA button style used in error/empty states.
  primaryButton: {
    minWidth: 180,
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
  },

  // Button label text.
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});