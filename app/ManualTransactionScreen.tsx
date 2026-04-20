import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  FlatList,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { createTransaction } from "../lib/transactions";
import { router } from "expo-router/build/exports";

const expenseCategories = [
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
  "Other Expense"
];

const incomeCategories = [
  "Salary",
  "Freelance",
  "Investments",
  "Other Income"
];

export default function ManualTransactionScreen() {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string | null>(null); // null for placeholder
  const [showCategories, setShowCategories] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);  
  const availableCategories =  type === "income" ? incomeCategories : expenseCategories;
    useEffect(() => {
      if (type === "income") {
        setCategory("Salary");
      }
    }, [type]);
    
  // Amount validation
  function handleAmountChange(text: string) {
    const regex = /^\d*(\.\d{0,2})?$/;
    if (regex.test(text)) setAmount(text);
  }

  async function saveTransaction() {
    if (!description || !amount || !category) {
      Alert.alert("Missing fields", "Please fill all required fields");
      return;
    }

    let value = Number.parseFloat(amount);
    if (type === "expense") value = -Math.abs(value);
    else value = Math.abs(value);

    await createTransaction({
      description,
      amount: value,
      date: date.toISOString().slice(0, 10),
      category,
      type,
    });

    setDescription("");
    setAmount("");
    setCategory(null);

    Alert.alert(
  "Success",
  "Transaction added successfully!",
  [
    {
      text: "OK",
      onPress: () => router.replace("/transactions"),
    },
  ],
  { cancelable: false }
);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      

      <View style={styles.iconWrap}>
<Ionicons name="create-outline" size={28} color="#2563EB"/>
</View>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>     Manual Transaction</Text> 
        <Text style={styles.subtitle}>                      Add a new transaction</Text>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ width: "100%", alignItems: "center" }}
        >
          {/* TYPE SELECT */}
          <View style={styles.segment}>
            {["expense", "income"].map((t) => (
              <Pressable
                key={t}
                style={[styles.segmentButton, type === t && styles.segmentActive]}
                onPress={() => setType(t as "expense" | "income")}
              >
                <Text style={[styles.segmentText, type === t && styles.segmentTextActive]}>
                  {t[0].toUpperCase() + t.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* DATE */}
          <Pressable style={styles.dateCard} onPress={() => setShowDate(true)}>
            <Ionicons name="calendar-outline" size={18} color="#2563EB" />
            <Text style={styles.dateText}>{date.toISOString().slice(0, 10)}</Text>
          </Pressable>

          {showDate && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDate(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          {/* DESCRIPTION */}
          <View style={styles.inputCard}>
            <Ionicons name="document-text-outline" size={18} color="#6B7280" />
            <TextInput
              placeholder="Description"
              style={styles.input}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* AMOUNT */}
          <View style={styles.inputCard}>
            <Ionicons name="cash-outline" size={18} color="#6B7280" />
            <Text style={styles.currency}>$</Text>
            <TextInput
              placeholder="0.00"
              keyboardType="decimal-pad"
              style={styles.input}
              value={amount}
              onChangeText={handleAmountChange}
            />
          </View>

          {/* CATEGORY */}
          <Pressable
            style={styles.dropdownCard}
            onPress={() => setShowCategories(true)}
          >
            <Ionicons name="pricetag-outline" size={18} color="#6B7280" />
            <Text style={styles.dropdownLabel}>
              {category || "Category"}
            </Text>
            <View style={{ flex: 1 }} />
            <Ionicons name="chevron-down" size={18} color="#6B7280" />
          </Pressable>

          <Modal
            visible={showCategories}
            transparent
            animationType="fade"
            onRequestClose={() => setShowCategories(false)}
          >
            <TouchableWithoutFeedback onPress={() => setShowCategories(false)}>
              <View style={styles.modalOverlay} />
            </TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <FlatList
                data={availableCategories}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.dropdownItem}
                    onPress={() => {
                      setCategory(item);
                      setShowCategories(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                  </Pressable>
                )}
              />
            </View>
          </Modal>

          {/* SAVE BUTTON */}
          <Pressable style={styles.primaryButton} onPress={saveTransaction}>
            <Text style={styles.primaryButtonText}>Save Transaction</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF", paddingHorizontal: 24 },
  header: { marginTop: 16, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 16, color: "#6B7280", marginTop: 4 },
  iconWrap: { alignItems: "center", marginTop: 10, marginBottom: 10 },
  segment: { flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 12, marginBottom: 20 },
  segmentButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  segmentActive: { backgroundColor: "#2563EB" },
  segmentText: { fontWeight: "600", color: "#6B7280", fontSize: 16 },
  segmentTextActive: { color: "#FFFFFF" },
  dateCard: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, padding: 14, width: "100%", marginBottom: 16 },
  dateText: { marginLeft: 10, fontSize: 16, color: "#111827", fontWeight: "600" },
  inputCard: { flexDirection: "row", alignItems: "center", width: "100%", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, padding: 6, marginBottom: 14 },
  input: { flex: 1, marginLeft: 8, fontSize: 16 },
  currency: { marginLeft: 8, fontWeight: "600", fontSize: 16 },
  dropdownCard: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, padding: 14, marginBottom: 14 },
  dropdownLabel: { marginLeft: 10, fontSize: 16, color: "#111827", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  modalContent: { position: "absolute", top: "30%", left: "10%", right: "10%", backgroundColor: "#FFF", borderRadius: 14, paddingVertical: 10, maxHeight: 300 },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  dropdownItemText: { fontSize: 16, color: "#111827" },
  primaryButton: { backgroundColor: "#2563EB", paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14, width: "100%", alignItems: "center", marginTop: 20 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});