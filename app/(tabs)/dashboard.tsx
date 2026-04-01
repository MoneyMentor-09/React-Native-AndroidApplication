// Ionicons
// --------
// Expo icon library used throughout the dashboard for:
// - summary card icons
// - loading / empty / error states
// - transaction direction icons
// - category icons in recent activity rowss
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

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
  Modal,
  Platform,
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
 * - periodExpenseTotal: total expenses for the selected date range
 * - periodIncomeTotal: total income for the selected date range
 * - netTotal: income minus expenses
 * - topCategories: highest spending categories for the selected date range
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

type RangePreset = "week" | "month" | "quarter" | "year";
type QuickRangePreset = "last_7_days" | "last_30_days" | "this_month" | "last_month" | "year_to_date";

type MonthStripItem = {
  key: string;
  label: string;
  year: number;
  incomeTotal: number;
  expenseTotal: number;
  startDate: Date;
  endDate: Date;
};

/**
 * CHART_COLORS
 * ------------
 * Reusable color palette assigned to top spending categories.
 * Colors cycle if more categories exist than colors available.
 */
const CHART_COLORS = ["#2563EB", "#0F766E", "#EA580C", "#7C3AED", "#DC2626"];
const QUICK_RANGE_OPTIONS: Array<{ key: QuickRangePreset; label: string }> = [
  { key: "last_7_days", label: "Last 7 Days" },
  { key: "last_30_days", label: "Last 30 Days" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "year_to_date", label: "Year to Date" },
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
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRangeDate(value: Date): string {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRangeLabel(startDate: Date, endDate: Date): string {
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();

  if (sameMonth) {
    return `${startDate.toLocaleDateString("en-US", { month: "short" })} ${startDate.getDate()}-${endDate.getDate()}, ${endDate.getFullYear()}`;
  }

  if (sameYear) {
    return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }

  return `${formatRangeDate(startDate)} - ${formatRangeDate(endDate)}`;
}

function getPresetRange(preset: RangePreset, baseDate = new Date()) {
  const endDate = new Date(baseDate);
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);

  if (preset === "week") {
    startDate.setDate(endDate.getDate() - 6);
    return { startDate, endDate };
  }

  if (preset === "month") {
    startDate.setDate(1);
    return { startDate, endDate };
  }

  if (preset === "quarter") {
    const quarterStartMonth = Math.floor(endDate.getMonth() / 3) * 3;
    startDate.setMonth(quarterStartMonth, 1);
    return { startDate, endDate };
  }

  startDate.setMonth(0, 1);
  return { startDate, endDate };
}

function getQuickPresetRange(preset: QuickRangePreset, baseDate = new Date()) {
  const normalizedBaseDate = new Date(baseDate);
  normalizedBaseDate.setHours(0, 0, 0, 0);

  if (preset === "last_7_days") {
    const startDate = new Date(normalizedBaseDate);
    startDate.setDate(normalizedBaseDate.getDate() - 6);
    return { startDate, endDate: normalizedBaseDate };
  }

  if (preset === "last_30_days") {
    const startDate = new Date(normalizedBaseDate);
    startDate.setDate(normalizedBaseDate.getDate() - 29);
    return { startDate, endDate: normalizedBaseDate };
  }

  if (preset === "this_month") {
    return getPresetRange("month", normalizedBaseDate);
  }

  if (preset === "last_month") {
    const startDate = new Date(normalizedBaseDate.getFullYear(), normalizedBaseDate.getMonth() - 1, 1);
    const endDate = new Date(normalizedBaseDate.getFullYear(), normalizedBaseDate.getMonth(), 0);
    endDate.setHours(0, 0, 0, 0);
    return { startDate, endDate };
  }

  return getPresetRange("year", normalizedBaseDate);
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getActivePreset(startDate: Date, endDate: Date): RangePreset | "custom" {
  const presets: RangePreset[] = ["week", "month", "quarter", "year"];

  for (const preset of presets) {
    const presetRange = getPresetRange(preset, endDate);
    if (isSameDay(presetRange.startDate, startDate) && isSameDay(presetRange.endDate, endDate)) {
      return preset;
    }
  }

  return "custom";
}

function shiftRange(startDate: Date, endDate: Date, preset: RangePreset | "custom", direction: 1 | -1) {
  if (preset === "week") {
    const nextEndDate = new Date(endDate);
    nextEndDate.setDate(nextEndDate.getDate() + direction * 7);
    return getPresetRange("week", nextEndDate);
  }

  if (preset === "month") {
    const nextEndDate = new Date(endDate);
    nextEndDate.setMonth(nextEndDate.getMonth() + direction);
    return getPresetRange("month", nextEndDate);
  }

  if (preset === "year") {
    const nextEndDate = new Date(endDate);
    nextEndDate.setFullYear(nextEndDate.getFullYear() + direction);
    return getPresetRange("year", nextEndDate);
  }

  const rangeLengthInDays = Math.max(
    1,
    Math.round(
      (new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime() -
        new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1,
  );

  const nextStartDate = new Date(startDate);
  nextStartDate.setDate(nextStartDate.getDate() + direction * rangeLengthInDays);

  const nextEndDate = new Date(nextStartDate);
  nextEndDate.setDate(nextStartDate.getDate() + rangeLengthInDays - 1);

  return { startDate: nextStartDate, endDate: nextEndDate };
}

function shiftQuickPresetRange(preset: QuickRangePreset, endDate: Date, direction: 1 | -1) {
  if (preset === "last_7_days") {
    const nextEndDate = new Date(endDate);
    nextEndDate.setDate(nextEndDate.getDate() + direction * 7);
    return getQuickPresetRange("last_7_days", nextEndDate);
  }

  if (preset === "last_30_days") {
    const nextEndDate = new Date(endDate);
    nextEndDate.setDate(nextEndDate.getDate() + direction * 30);
    return getQuickPresetRange("last_30_days", nextEndDate);
  }

  if (preset === "this_month") {
    const nextEndDate = new Date(endDate);
    nextEndDate.setMonth(nextEndDate.getMonth() + direction);
    return getQuickPresetRange("this_month", nextEndDate);
  }

  if (preset === "last_month") {
    const nextAnchorDate = new Date(endDate);
    nextAnchorDate.setMonth(nextAnchorDate.getMonth() + direction);
    return getQuickPresetRange("last_month", nextAnchorDate);
  }

  const nextEndDate = new Date(endDate);
  nextEndDate.setFullYear(nextEndDate.getFullYear() + direction);
  return getQuickPresetRange("year_to_date", nextEndDate);
}

function buildMonthStripItems(
  transactions: Transaction[],
  anchorDate: Date,
  count = 6,
): MonthStripItem[] {
  return Array.from({ length: count }, (_, index) => {
    const monthDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - (count - 1 - index), 1);
    const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    let incomeTotal = 0;
    let expenseTotal = 0;

    for (const tx of transactions) {
      const txDate = new Date(tx.date);

      if (
        Number.isNaN(txDate.getTime()) ||
        txDate.getFullYear() !== monthDate.getFullYear() ||
        txDate.getMonth() !== monthDate.getMonth()
      ) {
        continue;
      }

      if (tx.type === "income") {
        incomeTotal += Math.abs(tx.amount);
      } else {
        expenseTotal += Math.abs(tx.amount);
      }
    }

    return {
      key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
      label: monthDate.toLocaleDateString("en-US", { month: "short" }),
      year: monthDate.getFullYear(),
      incomeTotal,
      expenseTotal,
      startDate,
      endDate,
    };
  });
}

/**
 * buildDashboardMetrics
 * ---------------------
 * Converts raw transactions into dashboard-friendly summary data.
 *
 * Steps performed:
 * 1. Filters transactions into the selected date range
 * 2. Separates income and expense totals
 * 3. Groups expenses by category
 * 4. Builds a "top categories" list with percentage shares
 * 5. Computes chart-friendly 7-day buckets within that range
 * 6. Selects the most recent 5 transactions in the selected range
 *
 * This function keeps all aggregation logic outside the render body
 * so the screen component remains easier to read and maintain.
 */
function buildDashboardMetrics(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date,
): DashboardMetrics {
  // start/end define the inclusive/exclusive time window:
  // keep transactions where start <= txDate < endExclusive
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const endExclusive = new Date(endDate);
  endExclusive.setHours(0, 0, 0, 0);
  endExclusive.setDate(endExclusive.getDate() + 1);

  // Keep only transactions whose dates are valid and fall within the selected range.
  const periodTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date);

    // Ignore malformed dates so they do not distort dashboard metrics.
    if (Number.isNaN(txDate.getTime())) {
      return false;
    }

    return txDate >= start && txDate < endExclusive;
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

  const rangeInDays = Math.max(
    1,
    Math.ceil((endExclusive.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const weekCount = Math.ceil(rangeInDays / 7);

  spendingTrend = Array.from({ length: weekCount }, (_, index) => {
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() + index * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Sum only expense transactions in this 7-day range.
    const total = periodTransactions.reduce((sum, tx) => {
      if (tx.type === "income") {
        return sum;
      }
    // Sum only expense transactions in this 7-day range.
    const total = periodTransactions.reduce((sum, tx) => {
      if (tx.type === "income") {
        return sum;
      }

      const txDate = new Date(tx.date);
      return txDate >= weekStart && txDate < weekEnd ? sum + Math.abs(tx.amount) : sum;
    }, 0);
      const txDate = new Date(tx.date);
      return txDate >= weekStart && txDate < weekEnd ? sum + Math.abs(tx.amount) : sum;
    }, 0);

    return {
      label: `P${index + 1}`,
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

  const [startDate, setStartDate] = useState(() => {
    const initialDate = new Date();
    initialDate.setDate(1);
    initialDate.setHours(0, 0, 0, 0);
    return initialDate;
  });
  const [endDate, setEndDate] = useState(() => {
    const initialDate = new Date();
    initialDate.setHours(0, 0, 0, 0);
    return initialDate;
  });
  const [selectedQuickRange, setSelectedQuickRange] = useState<QuickRangePreset | null>("this_month");
  const [isRangeModalVisible, setIsRangeModalVisible] = useState(false);
  const [draftStartDate, setDraftStartDate] = useState(() => {
    const initialDate = new Date();
    initialDate.setDate(1);
    initialDate.setHours(0, 0, 0, 0);
    return initialDate;
  });
  const [draftEndDate, setDraftEndDate] = useState(() => {
    const initialDate = new Date();
    initialDate.setHours(0, 0, 0, 0);
    return initialDate;
  });
  const [draftQuickRange, setDraftQuickRange] = useState<QuickRangePreset | null>("this_month");
  const [draftPickerField, setDraftPickerField] = useState<"start" | "end">("start");
  const [isAndroidPickerVisible, setIsAndroidPickerVisible] = useState(false);
  const [breakdownTab, setBreakdownTab] = useState<"categories" | "recent">("categories");

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
  const rangeLabel = formatRangeLabel(startDate, endDate);
  const metrics = buildDashboardMetrics(transactions, startDate, endDate);
  const activePreset = getActivePreset(startDate, endDate);
  const isCustomRange = selectedQuickRange === null && activePreset === "custom";
  const comparisonMax = Math.max(metrics.periodExpenseTotal, metrics.periodIncomeTotal, 1);
  const expenseBarHeight = Math.max(
    (metrics.periodExpenseTotal / comparisonMax) * 88,
    metrics.periodExpenseTotal > 0 ? 26 : 8,
  );
  const incomeBarHeight = Math.max(
    (metrics.periodIncomeTotal / comparisonMax) * 88,
    metrics.periodIncomeTotal > 0 ? 10 : 6,
  );
  const openRangeModal = () => {
    setDraftStartDate(startDate);
    setDraftEndDate(endDate);
    setDraftQuickRange(selectedQuickRange);
    setDraftPickerField("start");
    setIsAndroidPickerVisible(false);
    setIsRangeModalVisible(true);
  };
  const closeRangeModal = () => {
    setIsAndroidPickerVisible(false);
    setIsRangeModalVisible(false);
  };
  const applyQuickRange = (preset: QuickRangePreset) => {
    const nextRange = getQuickPresetRange(preset);
    setDraftStartDate(nextRange.startDate);
    setDraftEndDate(nextRange.endDate);
    setDraftQuickRange(preset);
  };
  const handleDraftDateChange = (
    field: "start" | "end",
    selectedDate?: Date,
    eventType?: "set" | "dismissed" | "neutralButtonPressed",
  ) => {
    if (Platform.OS === "android") {
      setIsAndroidPickerVisible(false);
    }

    if (eventType && eventType !== "set") {
      return;
    }

    if (!selectedDate) {
      return;
    }

    const nextDate = new Date(selectedDate);
    nextDate.setHours(0, 0, 0, 0);
    setDraftQuickRange(null);

    if (field === "start") {
      setDraftStartDate(nextDate);
      if (nextDate > draftEndDate) {
        setDraftEndDate(nextDate);
      }
      return;
    }

    setDraftEndDate(nextDate);
    if (nextDate < draftStartDate) {
      setDraftStartDate(nextDate);
    }
  };
  const handleApplyRange = () => {
    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
    setSelectedQuickRange(draftQuickRange);
    setIsRangeModalVisible(false);
  };
  const openDraftPicker = (field: "start" | "end") => {
    setDraftPickerField(field);
    if (Platform.OS === "android") {
      setIsAndroidPickerVisible(true);
    }
  };
  const handlePeriodShift = (direction: 1 | -1) => {
    const nextRange =
      selectedQuickRange !== null
        ? shiftQuickPresetRange(selectedQuickRange, endDate, direction)
        : shiftRange(startDate, endDate, activePreset, direction);
    setStartDate(nextRange.startDate);
    setEndDate(nextRange.endDate);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.contentContainer}
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
      <View style={styles.overviewSection}>
        <View style={styles.overviewDateRow}>
          <Pressable style={styles.periodArrowButton} onPress={() => handlePeriodShift(-1)}>
            <Ionicons name="chevron-back" size={18} color="#334155" />
          </Pressable>

          <Pressable style={styles.overviewDateCenter} onPress={openRangeModal}>
            <View style={styles.rangeLabelRow}>
              <Ionicons name="calendar-outline" size={16} color="#64748B" />
              <Text style={styles.dateRangeValue}>{rangeLabel}</Text>
              {isCustomRange ? (
                <View style={styles.customBadge}>
                  <Text style={styles.customBadgeText}>Custom</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.overviewHintRow}>
              <Ionicons name="swap-horizontal-outline" size={13} color="#94A3B8" />
              <Text style={styles.overviewHintText}>Swipe charts to browse periods</Text>
            </View>
          </Pressable>

          <Pressable style={styles.periodArrowButton} onPress={() => handlePeriodShift(1)}>
            <Ionicons name="chevron-forward" size={18} color="#334155" />
          </Pressable>
        </View>

        <View style={styles.comparisonCard}>
          <View style={styles.comparisonContentCard}>
            <View style={styles.comparisonContentHeader}>
              <Text style={styles.comparisonTitle}>Expense vs Income</Text>
              <Text style={styles.currencyLabel}>USD</Text>
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
                  <Text style={[styles.comparisonLegendValue, styles.comparisonIncomeValue]}>
                    {metrics.periodIncomeTotal.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>

                <View style={styles.comparisonLegendRow}>
                  <View style={styles.comparisonLegendLabelWrap}>
                    <View style={[styles.comparisonLegendDot, styles.comparisonExpenseDot]} />
                    <Text style={styles.comparisonLegendLabel}>Expense</Text>
                  </View>
                  <Text style={[styles.comparisonLegendValue, styles.comparisonExpenseValue]}>
                    -
                    {metrics.periodExpenseTotal.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>

                <View style={styles.comparisonDivider} />

                <Text
                  style={[
                    styles.comparisonNetValue,
                    metrics.netTotal >= 0 ? styles.comparisonPositiveNetValue : styles.expenseNetValue,
                  ]}
                >
                  {metrics.netTotal.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={isRangeModalVisible}
        onRequestClose={closeRangeModal}
      >
        <View style={styles.modalScrim}>
          <View style={styles.rangeModalCard}>
            <View style={styles.rangeModalHeader}>
              <View style={styles.rangeModalCopy}>
                <Text style={styles.rangeModalTitle}>Choose date range</Text>
                <Text style={styles.rangeModalSubtitle}>Select a preset or set custom start and end dates.</Text>
              </View>

              <Pressable style={styles.rangeModalCloseButton} onPress={closeRangeModal}>
                <Ionicons name="close" size={18} color="#475569" />
              </Pressable>
            </View>

            <View style={styles.quickPresetWrap}>
              {QUICK_RANGE_OPTIONS.map((option) => {
                const isActivePreset = draftQuickRange === option.key;

                return (
                  <Pressable
                    key={option.key}
                    style={[styles.quickPresetChip, isActivePreset && styles.quickPresetChipActive]}
                    onPress={() => applyQuickRange(option.key)}
                  >
                    <Text
                      style={[
                        styles.quickPresetChipText,
                        isActivePreset && styles.quickPresetChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.rangeFieldRow}>
              <Pressable
                style={[styles.rangeFieldCard, draftPickerField === "start" && styles.rangeFieldCardActive]}
                onPress={() => openDraftPicker("start")}
              >
                <Text style={styles.rangeFieldLabel}>Start date</Text>
                <Text style={styles.rangeFieldValue}>{formatRangeDate(draftStartDate)}</Text>
              </Pressable>

              <Pressable
                style={[styles.rangeFieldCard, draftPickerField === "end" && styles.rangeFieldCardActive]}
                onPress={() => openDraftPicker("end")}
              >
                <Text style={styles.rangeFieldLabel}>End date</Text>
                <Text style={styles.rangeFieldValue}>{formatRangeDate(draftEndDate)}</Text>
              </Pressable>
            </View>

            {Platform.OS === "ios" ? (
              <View style={styles.rangePickerSurface}>
                <DateTimePicker
                  value={draftPickerField === "start" ? draftStartDate : draftEndDate}
                  mode="date"
                  display="spinner"
                  maximumDate={draftPickerField === "start" ? draftEndDate : undefined}
                  minimumDate={draftPickerField === "end" ? draftStartDate : undefined}
                  onChange={(event, selectedDate) =>
                    handleDraftDateChange(draftPickerField, selectedDate, event.type)
                  }
                />
              </View>
            ) : (
              <View style={styles.rangePickerHintCard}>
                <Text style={styles.rangePickerHintText}>
                  Tap a date field above to open the calendar picker.
                </Text>
              </View>
            )}

            {Platform.OS === "android" && isAndroidPickerVisible ? (
              <DateTimePicker
                value={draftPickerField === "start" ? draftStartDate : draftEndDate}
                mode="date"
                display="default"
                maximumDate={draftPickerField === "start" ? draftEndDate : undefined}
                minimumDate={draftPickerField === "end" ? draftStartDate : undefined}
                onChange={(event, selectedDate) =>
                  handleDraftDateChange(draftPickerField, selectedDate, event.type)
                }
              />
            ) : null}

            <View style={styles.rangeModalFooter}>
              <Pressable style={styles.rangeModalSecondaryButton} onPress={closeRangeModal}>
                <Text style={styles.rangeModalSecondaryButtonText}>Cancel</Text>
              </Pressable>

              <Pressable style={styles.rangeModalPrimaryButton} onPress={handleApplyRange}>
                <Text style={styles.rangeModalPrimaryButtonText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.sectionGroup}>
        <Text style={styles.breakdownLabel}>Breakdown</Text>

        <View style={styles.breakdownCard}>
          <View style={styles.breakdownTabs}>
            <Pressable
              style={[styles.breakdownTab, breakdownTab === "categories" && styles.breakdownTabActive]}
              onPress={() => setBreakdownTab("categories")}
            >
              <Text
                style={[
                  styles.breakdownTabText,
                  breakdownTab === "categories" && styles.breakdownTabTextActive,
                ]}
              >
                Categories
              </Text>
            </Pressable>
            <Pressable
              style={[styles.breakdownTab, breakdownTab === "recent" && styles.breakdownTabActive]}
              onPress={() => setBreakdownTab("recent")}
            >
              <Text
                style={[
                  styles.breakdownTabText,
                  breakdownTab === "recent" && styles.breakdownTabTextActive,
                ]}
              >
                Recent
              </Text>
            </Pressable>
          </View>

          <View style={styles.breakdownBody}>
            {breakdownTab === "categories" ? (
              metrics.topCategories.length > 0 ? (
                <>
                  <AnimatedDonutChart
                    key={`${startDate.toISOString()}-${endDate.toISOString()}-${metrics.topCategories.map((category) => `${category.name}:${category.total}`).join("|")}`}
                    categories={metrics.topCategories}
                    total={metrics.periodExpenseTotal}
                  />

                  {metrics.topCategories.map((category) => (
                    <View key={category.name} style={styles.categoryRow}>
                      <View style={[styles.categoryIconWrap, { backgroundColor: `${category.color}1A` }]}>
                        <Ionicons
                          name={getCategoryIcon(category.name)}
                          size={18}
                          color={category.color}
                        />
                      </View>

                      <View style={styles.categoryText}>
                        <Text style={styles.categoryName}>{category.name}</Text>
                        <Text style={styles.categoryShare}>{Math.round(category.share * 100)}% of spending</Text>
                      </View>

                      <Text style={styles.categoryAmount}>{formatCurrency(category.total)}</Text>
                    </View>
                  ))}
                </>
              ) : (
                <Text style={styles.emptySectionText}>
                  No expense categories recorded for {rangeLabel}.
                </Text>
              )
            ) : metrics.recentTransactions.length > 0 ? (
              <View style={styles.transactionList}>
                {metrics.recentTransactions.map((tx) => {
                  const isIncome = tx.type === "income";

                  const categoryName = tx.category?.trim() || "Other";

                  return (
                    <View key={tx.id} style={styles.transactionRow}>
                      <View
                        style={[styles.transactionIconWrap, isIncome ? styles.incomeTint : styles.expenseTint]}
                      >
                        <Ionicons
                          name={getCategoryIcon(categoryName)}
                          size={18}
                          color={isIncome ? "#047857" : "#B91C1C"}
                        />
                      </View>

                      <View style={styles.transactionText}>
                        <Text style={styles.transactionTitle}>{tx.description}</Text>
                        <Text style={styles.transactionMeta}>
                          {categoryName + " • " + tx.date}
                        </Text>
                      </View>

                      <Text style={[styles.transactionAmount, isIncome ? styles.incomeAmount : styles.expenseAmount]}>
                        {isIncome ? "+" : "-"}
                        {formatCurrency(Math.abs(tx.amount))}
                      </Text>
                    </View>
                  );
                })}

                <View style={styles.transactionFooter}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.transactionFooterButton,
                      pressed && styles.transactionFooterButtonPressed,
                    ]}
                    onPress={() => router.push("/transactions")}
                  >
                    <Text style={styles.transactionFooterText}>See More</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Text style={styles.emptySectionText}>
                No transactions recorded for {rangeLabel}.
              </Text>
            )}
          </View>
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

  // White-theme spending overview wrapper.
  overviewSection: {
    gap: 14,
  },

  // Row holding the centered range label and arrow controls.
  overviewDateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },

  // Circular previous/next period button.
  periodArrowButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  // Center stack for the selected range and helper copy.
  overviewDateCenter: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },

  // Row for the date label, icon, and custom indicator.
  rangeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  // Main selected date range text.
  dateRangeValue: {
    color: "#0F172A",
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
  },

  // Small helper row under the range text.
  overviewHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  // Muted helper text shown under the date range.
  overviewHintText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },

  // Badge shown when the current range is custom.
  customBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },

  // Text inside the custom badge.
  customBadgeText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Scrim behind the range selection modal.
  modalScrim: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.26)",
    justifyContent: "flex-end",
    padding: 16,
  },

  // Main date range modal card.
  rangeModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    gap: 18,
  },

  // Header row inside the range modal.
  rangeModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  // Copy area inside the modal header.
  rangeModalCopy: {
    flex: 1,
  },

  // Range modal title.
  rangeModalTitle: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "900",
  },

  // Supporting copy inside the range modal.
  rangeModalSubtitle: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 13,
    lineHeight: 18,
  },

  // Close button in the range modal.
  rangeModalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },

  // Wrap for quick preset chips in the modal.
  quickPresetWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  // Quick preset chip.
  quickPresetChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  // Active quick preset chip.
  quickPresetChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#93C5FD",
  },

  // Quick preset chip label.
  quickPresetChipText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
  },

  // Active quick preset chip label.
  quickPresetChipTextActive: {
    color: "#1D4ED8",
  },

  // Row for manual start/end date cards.
  rangeFieldRow: {
    flexDirection: "row",
    gap: 12,
  },

  // Card for a manual date input.
  rangeFieldCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },

  // Active manual date input card.
  rangeFieldCardActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#93C5FD",
  },

  // Manual date field label.
  rangeFieldLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },

  // Manual date field value.
  rangeFieldValue: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
  },

  // Surface for the native date picker.
  rangePickerSurface: {
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    paddingVertical: Platform.OS === "ios" ? 8 : 0,
  },

  // Helper card shown on Android instead of an always-mounted picker.
  rangePickerHintCard: {
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 18,
  },

  // Hint text for opening the Android date picker.
  rangePickerHintText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },

  // Footer row for modal actions.
  rangeModalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },

  // Secondary modal action button.
  rangeModalSecondaryButton: {
    minWidth: 96,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },

  // Secondary modal action text.
  rangeModalSecondaryButtonText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "800",
  },

  // Primary modal action button.
  rangeModalPrimaryButton: {
    minWidth: 96,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },

  // Primary modal action text.
  rangeModalPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  // Groups a heading with its card container.
  sectionGroup: {
    gap: 10,
  },

  // Small uppercase label above the breakdown card.
  breakdownLabel: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  // Main breakdown container with tabs and body content.
  breakdownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    overflow: "hidden",
  },

  // Tabs row inside the breakdown card.
  breakdownTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  // Individual breakdown tab.
  breakdownTab: {
    flex: 1,
    minHeight: 70,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 4,
    borderBottomColor: "transparent",
  },

  // Active breakdown tab.
  breakdownTabActive: {
    borderBottomColor: "#0F172A",
  },

  // Tab label text.
  breakdownTabText: {
    color: "#64748B",
    fontSize: 17,
    fontWeight: "700",
  },

  // Active tab label text.
  breakdownTabTextActive: {
    color: "#0F172A",
  },

  // Body content inside the breakdown card.
  breakdownBody: {
    padding: 18,
    gap: 14,
  },

  // Elevated card for the compact expenses-vs-income comparison.
  comparisonCard: {
    // backgroundColor: "#FFFFFF",
    // borderRadius: 26,
    // padding: 20,
    // gap: 18,
    // borderWidth: 1,
    // borderColor: "#E2E8F0",
    // shadowColor: "#0F172A",
    // shadowOpacity: 0.06,
    // shadowRadius: 16,
    // shadowOffset: { width: 0, height: 8 },
  },

  // Inner container that groups the expense vs income details.
  comparisonContentCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  comparisonContentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 35,
  },

  // Title inside the comparison card.
  comparisonTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  // Currency code shown on the right side of the card header.
  currencyLabel: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
  },

  // Main layout for the screenshot-inspired chart + legend block.
  comparisonChartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },

  // Left chart area that holds the two compact comparison bars.
  comparisonMiniChart: {
    width: 118,
    height: 112,
    justifyContent: "flex-end",
    position: "relative",
    paddingBottom: 2,
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
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 8,
  },

  // Slot that controls each bar's footprint.
  comparisonBarSlot: {
    width: 38,
    alignItems: "center",
    justifyContent: "flex-end",
  },

  // Shared shape for the custom comparison bars.
  comparisonBarStub: {
    width: "100%",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },

  // Small green income bar like the reference card.
  comparisonIncomeBar: {
    backgroundColor: "#22C55E",
    width: "120%", 
    // borderBottomLeftRadius: 6,
    // borderBottomRightRadius: 6,
  },

  // Taller light expense bar like the reference card.
  comparisonExpenseBar: {
    backgroundColor: "#a80909",
    width: "120%", 
    // borderBottomLeftRadius: 8,
    // borderBottomRightRadius: 8,
  },

  // Right column for legend rows and the emphasized net figure.
  comparisonLegend: {
    flex: 1,
    gap: 13,
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
    backgroundColor: "#2e6f46",
  },

  // Light dot for expense.
  comparisonExpenseDot: {
    backgroundColor: "#a80909",
  },

  // Legend label text.
  comparisonLegendLabel: {
    color: "#475569",
    fontSize: 15,
    fontWeight: "700",
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
    fontSize: 24,
    fontWeight: "900",
    textAlign: "right",
  },

  comparisonIncomeValue: {
    color: "#111827",
  },

  comparisonExpenseValue: {
    color: "#111827",
  },

  comparisonPositiveNetValue: {
    color: "#047857",
  },

  // Accent color for a negative net figure.
  expenseNetValue: {
    color: "#B91C1C",
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

  // Stack for recent activity rows and the footer action.
  transactionList: {
    marginTop: -17,
    marginHorizontal: -18,
  },

  // Wrapper for each category item in the spending list.
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    marginHorizontal: -18,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
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

  // Rounded icon badge for each category row.
  categoryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  // Middle text column for category details.
  categoryText: {
  // Middle text column for category details.
  categoryText: {
    flex: 1,
  },

  // Category label text.
  categoryName: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },

  // Category amount text under the label.
  categoryAmount: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "800",
  },

  // Large percentage shown at the far right of each legend row.
  categoryShare: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 4,
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
    paddingTop: 18,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },

  transactionFooterButton: {
    minHeight: 56,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#000000",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  }, 

  transactionFooterButtonPressed: {
    opacity: 0.75,
  },

  transactionFooterText: {
    color: "#111827",
    fontSize: 16,
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
