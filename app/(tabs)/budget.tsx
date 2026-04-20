import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  ScrollView,
} from "react-native";
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

type Budget = {
  id: string;
  category: string;
  amount: number;
  spent: number;
  user_id: string;
  purpose?: string;
  month: string; // "YYYY-MM"
};

type Transaction = {
  category: string;
  amount: number;
  type: "income" | "expense";
  created_at: string;
};

/* PREDEFINED CATEGORY LIST */
const CATEGORIES = [
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
  "Rent",
  "Insurance",
  "Salary",
  "Freelance",
  "Investment",
  "Other",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

export default function BudgetScreen() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [autoBudgetModalVisible, setAutoBudgetModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [category, setCategory] = useState("");
  const [autoBudgetCategory, setAutoBudgetCategory] = useState("");
  const [categoryPopupVisible, setCategoryPopupVisible] = useState(false);
  const [autoBudgetCategoryPopupVisible, setAutoBudgetCategoryPopupVisible] =
    useState(false);
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);

  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // For Month/Year dropdowns
  const [monthPopupVisible, setMonthPopupVisible] = useState(false);
  const [yearPopupVisible, setYearPopupVisible] = useState(false);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;

  /* FETCH DATA */
  const fetchData = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return;

      const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`; // "YYYY-MM"
      const startOfMonth = `${monthStr}-01`;
      const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0)
      .toISOString()
      .split("T")[0];

      const { data: budgetsData } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", monthStr)
        .order("category", { ascending: true });

      const { data: txData } = await supabase
        .from("transactions")
        .select("category, amount, type, created_at")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth);

      setBudgets(budgetsData || []);
      setTransactions(txData || []);
    } catch (err) {
      console.log("Fetch error:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [selectedMonth, selectedYear])
  );

  /* CALCULATE SPENT */
  const getSpent = (cat: string) =>
    transactions
      .filter((t) => t.category === cat)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  const resetAutoBudgetForm = () => {
    setAutoBudgetModalVisible(false);
    setAutoBudgetCategory("");
    setAutoBudgetCategoryPopupVisible(false);
  };

  const createAutoBudget = async () => {
    if (!autoBudgetCategory) {
      setErrorMessage("Please select a category to auto create a budget.");
      setErrorModalVisible(true);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return;

      const { data: existingBudget, error: existingBudgetError } = await supabase
        .from("budgets")
        .select("id")
        .eq("user_id", user.id)
        .eq("category", autoBudgetCategory)
        .eq("month", monthStr)
        .maybeSingle();

      if (existingBudgetError) {
        console.log("Existing budget check error:", existingBudgetError);
        setErrorMessage(existingBudgetError.message);
        setErrorModalVisible(true);
        return;
      }

      if (existingBudget) {
        setErrorMessage(
          "A budget for this category already exists in the selected month."
        );
        setErrorModalVisible(true);
        return;
      }

      const { data: previousBudgets, error: historyError } = await supabase
        .from("budgets")
        .select("amount, month")
        .eq("user_id", user.id)
        .eq("category", autoBudgetCategory)
        .lt("month", monthStr)
        .order("month", { ascending: false })
        .limit(6);

      if (historyError) {
        console.log("Budget history error:", historyError);
        setErrorMessage(historyError.message);
        setErrorModalVisible(true);
        return;
      }

      if (!previousBudgets || previousBudgets.length === 0) {
        setErrorMessage(
          "No previous budgets were found for this category. Create one manually first."
        );
        setErrorModalVisible(true);
        return;
      }

      const totalAmount = previousBudgets.reduce(
        (sum, budget) => sum + (Number(budget.amount) || 0),
        0
      );
      const predictedAmount = Number(
        (totalAmount / previousBudgets.length).toFixed(2)
      );

      const { error: insertError } = await supabase.from("budgets").insert({
        user_id: user.id,
        category: autoBudgetCategory,
        amount: predictedAmount,
        spent: getSpent(autoBudgetCategory),
        purpose: `Auto-created from ${previousBudgets.length} previous budget${
          previousBudgets.length === 1 ? "" : "s"
        }`,
        month: monthStr,
      });

      if (insertError) {
        console.log("Auto budget insert error:", insertError);
        setErrorMessage(insertError.message);
        setErrorModalVisible(true);
        return;
      }

      resetAutoBudgetForm();
      fetchData();
    } catch (err) {
      console.log("Auto budget error:", err);
      setErrorMessage("Something went wrong while auto creating the budget.");
      setErrorModalVisible(true);
    }
  };

 /* SAVE BUDGET */
const saveBudget = async () => {
  if (!category || !amount) {
    setErrorMessage("Category and Amount are required.");
    setErrorModalVisible(true);
    return;
  }

  try {
    const supabase = getSupabaseBrowserClient();

    // ✅ Get user FIRST
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return;

    const parsedAmount = Number.parseFloat(amount) || 0;
    const spent = getSpent(category);

    // ✅ CHECK DUPLICATE FROM DATABASE (NOT STATE)
    const { data: existingBudget, error: checkError } = await supabase
      .from("budgets")
      .select("id")
      .eq("user_id", user.id)
      .eq("category", category)
      .eq("month", monthStr)
      .maybeSingle();

    if (checkError) {
      console.log("Check error:", checkError);
    }

    if (
      existingBudget &&
      (!editingBudget || existingBudget.id !== editingBudget.id)
    ) {
      setErrorMessage(
        "You already have a budget for this category in this month."
      );
      setErrorModalVisible(true);
      return;
    }

    // ✅ INSERT OR UPDATE
    if (editingBudget) {
      const { error } = await supabase
        .from("budgets")
        .update({
          category,
          amount: parsedAmount,
          spent,
          purpose,
          month: monthStr,
        })
        .eq("id", editingBudget.id);

      if (error) {
        console.log("Update error:", error);
        setErrorMessage(error.message);
        setErrorModalVisible(true);
        return;
      }
    } else {
      const { error } = await supabase.from("budgets").insert({
        user_id: user.id,
        category,
        amount: parsedAmount,
        spent,
        purpose,
        month: monthStr,
      });

      if (error) {
        console.log("Insert error:", error);
        setErrorMessage(error.message);
        setErrorModalVisible(true);
        return;
      }
    }

    // ✅ Success
    resetForm();
    fetchData();
  } catch (err) {
    console.log("Save error:", err);
    setErrorMessage("Something went wrong. Please try again.");
    setErrorModalVisible(true);
  }
};

  /* CONFIRM DELETE */
  const confirmDelete = (budget: Budget) => {
    setBudgetToDelete(budget);
    setDeleteModalVisible(true);
  };

  /* DELETE BUDGET */
  const deleteBudget = async () => {
    if (!budgetToDelete) return;
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.from("budgets").delete().eq("id", budgetToDelete.id);
      setDeleteModalVisible(false);
      setBudgetToDelete(null);
      fetchData();
    } catch (err) {
      console.log("Delete error:", err);
    }
  };

  /* RESET FORM */
  const resetForm = () => {
    setModalVisible(false);
    setEditingBudget(null);
    setCategory("");
    setAmount("");
    setPurpose("");
    setCategoryPopupVisible(false);
  };

  /* RENDER BUDGET CARD */
  const renderBudget = ({ item }: { item: Budget }) => {
    const spent = getSpent(item.category);
    const percentage = item.amount ? Math.min((spent / item.amount) * 100, 100) : 0;

    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{item.category}</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => {
                setEditingBudget(item);
                setCategory(item.category);
                setAmount(item.amount.toString());
                setPurpose(item.purpose || "");
                
                const [year, month] = item.month.split("-");
                  setSelectedYear(Number(year));
                  setSelectedMonth(Number(month) - 1);
                setModalVisible(true);
              }}
            >
              <Ionicons name="pencil" size={18} color="#2563EB" />
            </Pressable>
            <Pressable onPress={() => confirmDelete(item)}>
              <Ionicons name="trash" size={18} color="#DC2626" />
            </Pressable>
          </View>
        </View>

        <Text style={styles.meta}>
          ${spent.toFixed(2)} / ${item.amount.toFixed(2)}
        </Text>

        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${percentage}%`,
                backgroundColor:
                  percentage >= 100
                    ? "#DC2626"
                    : percentage >= 90
                    ? "#F59E0B"
                    : "#16A34A",
              },
            ]}
          />
        </View>

        <Text style={styles.meta}>
          Remaining: ${(item.amount - spent).toFixed(2)}
        </Text>

        {item.purpose && <Text style={styles.purpose}>Purpose: {item.purpose}</Text>}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Month / Year Dropdowns */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
        <Pressable
          style={styles.dropdownInput}
          onPress={() => setMonthPopupVisible(true)}
        >
          <Text>{MONTHS[selectedMonth]}</Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </Pressable>

        <Pressable
          style={styles.dropdownInput}
          onPress={() => setYearPopupVisible(true)}
        >
          <Text>{selectedYear}</Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </Pressable>
      </View>

      {/* Month Popup */}
      {monthPopupVisible && (
        <View style={styles.modal}>
          <View style={[styles.modalContent, { maxHeight: "70%" }]}>
            <Text style={styles.modalTitle}>Select Month</Text>
            <ScrollView>
              {MONTHS.map((m, idx) => (
                <Pressable
                  key={m}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedMonth(idx);
                    setMonthPopupVisible(false);
                  }}
                >
                  <Text>{m}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.secondaryButton, { marginTop: 12 }]}
              onPress={() => setMonthPopupVisible(false)}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Year Popup */}
      {yearPopupVisible && (
        <View style={styles.modal}>
          <View style={[styles.modalContent, { maxHeight: "70%" }]}>
            <Text style={styles.modalTitle}>Select Year</Text>
            <ScrollView>
              {YEARS.map((y) => (
                <Pressable
                  key={y}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedYear(y);
                    setYearPopupVisible(false);
                  }}
                >
                  <Text>{y}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.secondaryButton, { marginTop: 12 }]}
              onPress={() => setYearPopupVisible(false)}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* BUDGET LIST */}
      <FlatList
        data={budgets}
        keyExtractor={(i) => i.id}
        renderItem={renderBudget}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            No budgets found
          </Text>
        }
      />

      {/* ADD BUDGET BUTTON */}
      <Pressable
        style={styles.primaryButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.primaryButtonText}>Add Budget</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => setAutoBudgetModalVisible(true)}
      >
        <Text style={styles.secondaryButtonText}>Auto Create Budget</Text>
      </Pressable>

      {/* Add/Edit Budget Modal */}
      {modalVisible && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingBudget ? "Edit Budget" : "Add Budget"}
            </Text>

            <Pressable
              style={styles.dropdownInput}
              onPress={() => setCategoryPopupVisible(true)}
            >
              <Text style={{ color: category ? "#000" : "#6B7280" }}>
                {category || "Select Category"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </Pressable>

            <TextInput
              placeholder="Amount ($)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <TextInput
              placeholder="Purpose"
              value={purpose}
              onChangeText={setPurpose}
              style={styles.input}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.secondaryButton, { flex: 1 }]}
                onPress={resetForm}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.primaryButton, { flex: 1 }]}
                onPress={saveBudget}
              >
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Auto Create Budget Modal */}
      {autoBudgetModalVisible && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Auto Create Budget</Text>
            <Text style={styles.helperText}>
              Pick a category and we will use up to the 6 most recent budgets in
              that category to predict this month's amount.
            </Text>

            <Pressable
              style={styles.dropdownInput}
              onPress={() => setAutoBudgetCategoryPopupVisible(true)}
            >
              <Text style={{ color: autoBudgetCategory ? "#000" : "#6B7280" }}>
                {autoBudgetCategory || "Select Category"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </Pressable>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.secondaryButton, { flex: 1 }]}
                onPress={resetAutoBudgetForm}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.primaryButton, { flex: 1 }]}
                onPress={createAutoBudget}
              >
                <Text style={styles.primaryButtonText}>Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Category Popup */}
      {categoryPopupVisible && (
        <View style={styles.modal}>
          <View style={[styles.modalContent, { maxHeight: "70%" }]}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <ScrollView>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setCategory(cat);
                    setCategoryPopupVisible(false);
                  }}
                >
                  <Text>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.secondaryButton, { marginTop: 12 }]}
              onPress={() => setCategoryPopupVisible(false)}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Auto Budget Category Popup */}
      {autoBudgetCategoryPopupVisible && (
        <View style={styles.modal}>
          <View style={[styles.modalContent, { maxHeight: "70%" }]}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <ScrollView>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setAutoBudgetCategory(cat);
                    setAutoBudgetCategoryPopupVisible(false);
                  }}
                >
                  <Text>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.secondaryButton, { marginTop: 12 }]}
              onPress={() => setAutoBudgetCategoryPopupVisible(false)}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Error Modal */}
      {errorModalVisible && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Error</Text>
            <Text style={{ marginBottom: 16, textAlign: "center" }}>
              {errorMessage}
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={styles.primaryButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Delete Modal */}
      {deleteModalVisible && budgetToDelete && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Budget</Text>
            <Text style={{ marginBottom: 16 }}>
              Are you sure you want to delete "{budgetToDelete.category}"?
            </Text>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.secondaryButton, { flex: 1 }]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.primaryButton, { flex: 1 }]}
                onPress={deleteBudget}
              >
                <Text style={styles.primaryButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

/* STYLES */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 10,
  },
  card: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  meta: {
    color: "#6B7280",
    marginTop: 4,
  },
  purpose: {
    marginTop: 6,
    fontStyle: "italic",
    color: "#6B7280",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressBg: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    marginTop: 8,
  },
  progressFill: {
    height: 8,
    borderRadius: 6,
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  primaryButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: "#2563EB",
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  secondaryButtonText: {
    textAlign: "center",
    color: "#2563EB",
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  helperText: {
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  dropdownInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modal: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.3)",
  justifyContent: "center",
  alignItems: "center",

  zIndex: 9999,      
  elevation: 9999,    
},
  modalContent: {
  backgroundColor: "#FFFFFF",
  borderRadius: 14,
  padding: 24,
  width: "90%",

  zIndex: 10000,
  elevation: 10000,
},
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
});
