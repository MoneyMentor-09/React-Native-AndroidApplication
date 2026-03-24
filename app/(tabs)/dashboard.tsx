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
// useRef   -> stores animated values across renders
// useState  -> stores component state like transactions, loading, refresh, and error states
import { useEffect, useRef, useState } from "react";

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
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, G } from "react-native-svg";

// Transaction utilities
// ---------------------
// fetchTransactions retrieves saved transactions from your data layer.
// Transaction type defines the shape of a transaction object.
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import { fetchTransactions, type Transaction } from "../../lib/transactions";

/**
 * DashboardMetrics type
 * ---------------------
 * Defines the computed data used to render the dashboard:
 * - periodExpenseTotal: total expenses for the selected month
 * - periodIncomeTotal: total income for the selected month
 * - netTotal: income minus expenses
 * - topCategories: highest spending categories for the selected month
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
 * CHART_COLORS
 * ------------
 * Reusable color palette assigned to top spending categories.
 * Colors cycle if more categories exist than colors available.
 */
const CHART_COLORS = ["#2563EB", "#0F766E", "#EA580C", "#7C3AED", "#DC2626"];

/**
 * MONTH_OPTIONS
 * -------------
 * Fixed month labels used by the dashboard dropdown.
 */
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, monthIndex) => ({
  monthIndex,
  label: new Date(2026, monthIndex, 1).toLocaleDateString("en-US", { month: "long" }),
}));

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
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * buildDashboardMetrics
 * ---------------------
 * Converts raw transactions into dashboard-friendly summary data.
 *
 * Steps performed:
 * 1. Filters transactions into the selected month range
 * 2. Separates income and expense totals
 * 3. Groups monthly expenses by category
 * 4. Builds a "top categories" list with percentage shares
 * 5. Computes chart-friendly weekly buckets within that month
 * 6. Selects the most recent 5 transactions in the selected month
 *
 * This function keeps all aggregation logic outside the render body
 * so the screen component remains easier to read and maintain.
 */
function buildDashboardMetrics(
  transactions: Transaction[],
  selectedMonthIndex: number,
  selectedYear: number,
): DashboardMetrics {
  // start/end define the inclusive/exclusive time window:
  // keep transactions where start <= txDate < end
  const start = new Date(selectedYear, selectedMonthIndex, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(selectedYear, selectedMonthIndex + 1, 1);
  end.setHours(0, 0, 0, 0);

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

  // Approximate the selected month as 7-day weekly buckets: W1, W2, W3, etc.
  const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
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
 * AnimatedDonutChart Component
 * ----------------------------
 * Lightweight SVG-based donut chart used instead of Victory Native.
 *
 * Why this exists:
 * - The older victory-native package is not compatible with the Fabric renderer
 *   used by this Expo / React Native version.
 * - This keeps the animated category chart stable without adding another charting dependency.
 */
function AnimatedDonutChart({
  categories,
  total,
}: {
  categories: DashboardMetrics["topCategories"];
  total: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const chartSize = 248;
  const strokeWidth = 24;
  const radius = (chartSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const segmentGap = 8;

  useEffect(() => {
    progress.setValue(0);

    Animated.timing(progress, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  let cumulativeShare = 0;

  return (
    <Animated.View
      style={[
        styles.pieChartWrap,
        {
          opacity: progress,
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.92, 1],
              }),
            },
          ],
        },
      ]}
    >
      <Svg width={chartSize} height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`}>
        <G rotation={-90} origin={`${chartSize / 2}, ${chartSize / 2}`}>
          <Circle
            cx={chartSize / 2}
            cy={chartSize / 2}
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
          />

          {categories.map((category) => {
            const rawSliceLength = circumference * category.share;
            const sliceLength = Math.max(rawSliceLength - segmentGap, 0);
            const gapLength = Math.max(circumference - sliceLength, 0);
            const strokeDashoffset = -circumference * cumulativeShare;

            cumulativeShare += category.share;

            return (
              <Circle
                key={category.name}
                cx={chartSize / 2}
                cy={chartSize / 2}
                r={radius}
                fill="none"
                stroke={category.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${sliceLength} ${gapLength}`}
                strokeDashoffset={strokeDashoffset}
              />
            );
          })}
        </G>
      </Svg>

      <View pointerEvents="none" style={styles.pieChartCenter}>
        <Text style={styles.pieChartCenterLabel}>Total spent</Text>
        <Text style={styles.pieChartCenterValue}>{formatCurrency(total)}</Text>
      </View>
    </Animated.View>
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

  // Name shown in the dashboard greeting.
  const [displayName, setDisplayName] = useState("User");

  // Controls which month the dashboard is currently summarizing.
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(new Date().getMonth());

  // Toggles the month dropdown visibility.
  const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false);

  // Shared animated value for the dropdown enter/exit transition.
  const monthMenuAnimation = useRef(new Animated.Value(0)).current;

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

  const loadDisplayName = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setDisplayName("User");
        return;
      }

      const profileName =
        user.user_metadata?.full_name ||
        user.user_metadata?.first_name ||
        user.email?.split("@")[0] ||
        "User";

      setDisplayName(profileName);
    } catch {
      setDisplayName("User");
    }
  };

  /**
   * Load dashboard data once when the screen first mounts.
   *
   * `void` is used to intentionally ignore the Promise result here.
   */
  useEffect(() => {
    void loadTransactions();
    void loadDisplayName();
  }, []);

  useEffect(() => {
    Animated.timing(monthMenuAnimation, {
      toValue: isMonthMenuOpen ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isMonthMenuOpen, monthMenuAnimation]);

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

  const selectedYear = new Date().getFullYear();
  const selectedMonthLabel =
    MONTH_OPTIONS.find((option) => option.monthIndex === selectedMonthIndex)?.label ??
    MONTH_OPTIONS[new Date().getMonth()].label;

  // Derive dashboard-ready summary values from the raw transactions.
  const metrics = buildDashboardMetrics(transactions, selectedMonthIndex, selectedYear);
  const comparisonMax = Math.max(metrics.periodExpenseTotal, metrics.periodIncomeTotal, 1);
  const expenseBarHeight = Math.max((metrics.periodExpenseTotal / comparisonMax) * 124, metrics.periodExpenseTotal > 0 ? 28 : 10);
  const incomeBarHeight = Math.max((metrics.periodIncomeTotal / comparisonMax) * 124, metrics.periodIncomeTotal > 0 ? 10 : 6);
  const monthMenuAnimatedStyle = {
    opacity: monthMenuAnimation,
    transform: [
      {
        translateY: monthMenuAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [-10, 0],
        }),
      },
      {
        scale: monthMenuAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1],
        }),
      },
    ],
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.contentContainer}
      onScrollBeginDrag={() => setIsMonthMenuOpen(false)}
      scrollEventThrottle={16}
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
      {/* Dashboard header with the month selector aligned to the right. */}
      <View style={styles.summaryHeader}>
        <View style={styles.summaryHeaderCopy}>
          <Text style={styles.summaryHeaderTitle}>Hello, {displayName}!</Text>
          <Text style={styles.summaryHeaderSubtitle}>Track how your month is balancing so far.</Text>
        </View>

        <View style={styles.monthMenuWrap}>
          <Pressable
            style={styles.monthButton}
            onPress={() => setIsMonthMenuOpen((currentValue) => !currentValue)}
          >
            <Text style={styles.monthButtonText}>{selectedMonthLabel}</Text>
            <Ionicons
              name={isMonthMenuOpen ? "chevron-up-outline" : "chevron-down-outline"}
              size={16}
              color="#0F172A"
            />
          </Pressable>

          {isMonthMenuOpen ? (
            <Animated.View style={[styles.monthMenu, monthMenuAnimatedStyle]}>
              {MONTH_OPTIONS.map((option) => {
                const isActive = option.monthIndex === selectedMonthIndex;

                return (
                  <Pressable
                    key={option.monthIndex}
                    style={[styles.monthMenuItem, isActive && styles.monthMenuItemActive]}
                    onPress={() => {
                      setSelectedMonthIndex(option.monthIndex);
                      setIsMonthMenuOpen(false);
                    }}
                  >
                    <Text style={[styles.monthMenuText, isActive && styles.monthMenuTextActive]}>
                      {option.label}
                    </Text>
                    {isActive ? <Ionicons name="checkmark-outline" size={16} color="#2563EB" /> : null}
                  </Pressable>
                );
              })}
            </Animated.View>
          ) : null}
        </View>
      </View>

      <View style={styles.sectionGroup}>
        <Text style={styles.sectionTitle}>Expenses vs Income</Text>

        <View style={styles.comparisonCard}>
          <View style={styles.comparisonHeader}>
            <View>
              <Text style={styles.comparisonTitle}>{selectedMonthLabel}</Text>
              <Text style={styles.comparisonSubtitle}>A quick look at money in versus money out.</Text>
            </View>

            <View style={styles.netPill}>
              <Text style={styles.netPillLabel}>Net</Text>
              <Text
                style={[
                  styles.netPillValue,
                  metrics.netTotal >= 0 ? styles.incomeAmount : styles.expenseAmount,
                ]}
              >
                {formatCurrency(metrics.netTotal)}
              </Text>
            </View>
          </View>

          <View style={styles.comparisonChartRow}>
            <View style={styles.comparisonMiniChart}>
              <View style={styles.comparisonChartFloor} />

              <View style={styles.comparisonBarsWrap}>
                <View style={styles.comparisonBarSlot}>
                  <View
                    style={[
                      styles.comparisonBarStub,
                      styles.comparisonIncomeBar,
                      { height: incomeBarHeight },
                    ]}
                  />
                </View>

                <View style={styles.comparisonBarSlot}>
                  <View
                    style={[
                      styles.comparisonBarStub,
                      styles.comparisonExpenseBar,
                      { height: expenseBarHeight },
                    ]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.comparisonLegend}>
              <View style={styles.comparisonLegendRow}>
                <View style={styles.comparisonLegendLabelWrap}>
                  <View style={[styles.comparisonLegendDot, styles.comparisonIncomeDot]} />
                  <Text style={styles.comparisonLegendLabel}>Income</Text>
                </View>
                <Text style={[styles.comparisonLegendValue, styles.incomeAmount]}>
                  {formatCurrency(metrics.periodIncomeTotal)}
                </Text>
              </View>

              <View style={styles.comparisonLegendRow}>
                <View style={styles.comparisonLegendLabelWrap}>
                  <View style={[styles.comparisonLegendDot, styles.comparisonExpenseDot]} />
                  <Text style={styles.comparisonLegendLabel}>Expense</Text>
                </View>
                <Text style={[styles.comparisonLegendValue, styles.expenseAmount]}>
                  -{formatCurrency(metrics.periodExpenseTotal)}
                </Text>
              </View>

              <View style={styles.comparisonDivider} />

              <Text
                style={[
                  styles.comparisonNetValue,
                  metrics.netTotal >= 0 ? styles.incomeAmount : styles.expenseNetValue,
                ]}
              >
                {formatCurrency(metrics.netTotal)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Category spending breakdown section */}
      <View style={styles.sectionGroup}>
        <Text style={styles.sectionTitle}>Spending by category</Text>

        <View style={styles.section}>
          {metrics.topCategories.length > 0 ? (
            <>
              <AnimatedDonutChart
                key={`${selectedMonthIndex}-${metrics.topCategories.map((category) => `${category.name}:${category.total}`).join("|")}`}
                categories={metrics.topCategories}
                total={metrics.periodExpenseTotal}
              />

              <View style={styles.categoryLegend}>
                {metrics.topCategories.map((category) => (
                  <View key={category.name} style={styles.categoryRow}>
                    <View
                      style={[styles.categoryColorLine, { backgroundColor: category.color }]}
                    />

                    <View style={styles.categoryText}>
                      <Text numberOfLines={1} style={styles.categoryName}>
                        {category.name}
                      </Text>
                      <Text style={styles.categoryAmount}>{formatCurrency(category.total)}</Text>
                    </View>

                    <Text style={styles.categoryShare}>{Math.round(category.share * 100)}%</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.emptySectionText}>
              No expense categories recorded for {selectedMonthLabel.toLowerCase()}.
            </Text>
          )}
        </View>
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
      <View style={styles.sectionGroup}>
        <Text style={styles.sectionTitle}>Recent activity</Text>

        <View style={styles.section}>
          {metrics.recentTransactions.length > 0 ? (
            <View style={styles.transactionList}>
              {metrics.recentTransactions.map((tx) => {
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
              })}

              <Pressable style={styles.transactionFooter} onPress={() => router.push("/transactions")}>
                <Text style={styles.linkText}>View all</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.emptySectionText}>
              No transactions recorded for {selectedMonthLabel.toLowerCase()}.
            </Text>
          )}
        </View>
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

  // Header row that introduces the overview and aligns the month selector to the right.
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    zIndex: 20,
  },

  // Copy block on the left side of the summary header.
  summaryHeaderCopy: {
    flex: 1,
    gap: 6,
    paddingTop: 4,
  },

  // Main title for the dashboard summary area.
  summaryHeaderTitle: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "900",
  },

  // Support text beneath the overview title.
  summaryHeaderSubtitle: {
    color: "#64748B",
    fontSize: 15,
    lineHeight: 22,
  },

  // Relative wrapper used to anchor the month dropdown below the button.
  monthMenuWrap: {
    position: "relative",
    alignItems: "flex-end",
  },

  // Top-right month selector button.
  monthButton: {
    minWidth: 128,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  // Text inside the month selector button.
  monthButtonText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },

  // Dropdown card listing the available months.
  monthMenu: {
    position: "absolute",
    top: 52,
    right: 0,
    width: 170,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  // One pressable month row inside the dropdown.
  monthMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  // Highlight for the selected month row.
  monthMenuItemActive: {
    backgroundColor: "#EFF6FF",
  },

  // Base month label styling.
  monthMenuText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
  },

  // Emphasized month label styling when selected.
  monthMenuTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },

  // Groups a heading with its card container.
  sectionGroup: {
    gap: 10,
  },

  // Elevated card for the compact expenses-vs-income comparison.
  comparisonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 20,
    gap: 20,
    // shadowColor: "#000000",
    // shadowOpacity: 0.12,
    // shadowRadius: 18,
    // shadowOffset: { width: 0, height: 10 },
    // elevation: 6,
  },

  // Header row inside the comparison card.
  comparisonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  // Current month label inside the comparison card.
  comparisonTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
  },

  // Supporting copy for the comparison chart.
  comparisonSubtitle: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: 220,
  },

  // Small badge highlighting the net balance.
  netPill: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minWidth: 92,
  },

  // Label inside the net badge.
  netPillLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Net amount inside the badge.
  netPillValue: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4,
  },

  // Main layout for the screenshot-inspired chart + legend block.
  comparisonChartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 18,
  },

  // Left chart area that holds the two compact comparison bars.
  comparisonMiniChart: {
    width: 150,
    height: 152,
    justifyContent: "flex-end",
    position: "relative",
  },

  // Baseline under the two comparison bars.
  comparisonChartFloor: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: "#E2E8F0",
  },

  // Horizontal layout for the tiny income and expense bars.
  comparisonBarsWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingLeft: 4,
    paddingRight: 10,
  },

  // Slot that controls each bar's footprint.
  comparisonBarSlot: {
    width: 64,
    alignItems: "center",
    justifyContent: "flex-end",
  },

  // Shared shape for the custom comparison bars.
  comparisonBarStub: {
    width: "100%",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },

  // Small green income bar like the reference card.
  comparisonIncomeBar: {
    backgroundColor: "#22C55E",
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },

  // Taller light expense bar like the reference card.
  comparisonExpenseBar: {
    backgroundColor: "#F5F5F5",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  // Right column for legend rows and the emphasized net figure.
  comparisonLegend: {
    flex: 1,
    gap: 14,
    paddingBottom: 2,
  },

  // One legend row with label on the left and value on the right.
  comparisonLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  // Left side of each legend row.
  comparisonLegendLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  // Circular color bullet in the legend.
  comparisonLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },

  // Green dot for income.
  comparisonIncomeDot: {
    backgroundColor: "#22C55E",
  },

  // Light dot for expense.
  comparisonExpenseDot: {
    backgroundColor: "#F5F5F5",
  },

  // Legend label text.
  comparisonLegendLabel: {
    color: "#475569",
    fontSize: 15,
    fontWeight: "600",
  },

  // Legend amount text.
  comparisonLegendValue: {
    fontSize: 15,
    fontWeight: "800",
  },

  // Divider above the net amount.
  comparisonDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginTop: 2,
  },

  // Larger net total aligned to the bottom-right.
  comparisonNetValue: {
    fontSize: 19,
    fontWeight: "900",
    textAlign: "right",
  },

  // Accent color for a negative net figure on the dark card.
  expenseNetValue: {
    color: "#E879F9",
  },

  // Generic white content card used for dashboard sections.
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    gap: 14,
  },

  // Section title text.
  sectionTitle: {
    color: "#0F172A",
    fontSize: 19,
    fontWeight: "800",
  },

  // Action/link text such as "View all".
  linkText: {
    alignSelf: "center",
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700",
  },

  // Stack for recent activity rows and the footer action.
  transactionList: {
    marginTop: -17,
    marginHorizontal: -18,
  },

  // Compact legend cards shown below the donut chart.
  categoryLegend: {
    width: "100%",
    marginTop: 8,
  },

  // Wrapper for each category item in the spending list.
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },

  // Container that centers the donut chart and its overlay content.
  pieChartWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    marginBottom: 16,
  },

  // Center overlay that turns the pie chart into a readable dashboard donut.
  pieChartCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: "#FFFFFF",
  },

  // Small label above the donut total.
  pieChartCenterLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },

  // Total amount displayed in the center of the donut chart.
  pieChartCenterValue: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
  },

  // Slim legend marker that matches the donut slice color.
  categoryColorLine: {
    width: 28,
    height: 4,
    borderRadius: 999,
  },

  // Middle text column for category details.
  categoryText: {
    flex: 1,
    minWidth: 0,
  },

  // Category label text.
  categoryName: {
    color: "#1F2937",
    fontSize: 16,
    fontWeight: "500",
  },

  // Category amount text under the label.
  categoryAmount: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "400",
    marginTop: 3,
  },

  // Large percentage shown at the far right of each legend row.
  categoryShare: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "500",
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
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
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

  // Footer action placed after the recent activity rows.
  transactionFooter: {
    paddingTop: 14,
    paddingHorizontal: 18,
    alignItems: "flex-end",
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
