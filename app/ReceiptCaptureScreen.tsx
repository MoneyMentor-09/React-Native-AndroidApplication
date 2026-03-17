import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ExpenseForm } from "../components/ExpenseForm";
import { ReceiptScanner } from "../components/ReceiptScanner";
import { createTransaction, fetchTransactions } from "../lib/transactions";
import { extractReceiptText } from "../services/ocr";
import { parseReceiptText } from "../services/receiptParser";

type TransactionRow = {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  date: string;
  type: "expense" | "income";
  created_at: string;
};

type ExpenseDraft = {
  vendor: string;
  expenseDate: string;
  amount: string;
  notes: string;
  rawText: string;
  receiptImageUri?: string;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyDraft(): ExpenseDraft {
  return {
    vendor: "",
    expenseDate: todayIsoDate(),
    amount: "",
    notes: "",
    rawText: ""
  };
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export default function ReceiptCaptureScreen(): React.JSX.Element {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ExpenseDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshTransactions();
  }, []);

  async function refreshTransactions(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const rows = await fetchTransactions();
      setTransactions(rows as TransactionRow[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImageSelected(imageUri: string): Promise<void> {
    setError(null);
    setOcrLoading(true);
    try {
      const rawText = await extractReceiptText(imageUri);
      const parsed = parseReceiptText(rawText);

      setDraft({
        vendor: parsed.vendor || "",
        expenseDate: parsed.expenseDate || todayIsoDate(),
        amount: parsed.amount !== undefined ? parsed.amount.toFixed(2) : "",
        notes: "",
        rawText: parsed.rawText,
        receiptImageUri: imageUri
      });
      setScannerVisible(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcrLoading(false);
    }
  }

  async function handleSaveDraft(nextDraft: ExpenseDraft): Promise<void> {
    setError(null);
    setSaving(true);
    try {
      await createTransaction({
        description: nextDraft.vendor.trim() || "Unknown Merchant",
        amount: Number(nextDraft.amount),
        date: nextDraft.expenseDate,
        type: "expense"
      });
      setDraft(null);
      await refreshTransactions();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const totalSpent = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Receipt Capture</Text>
        <Text style={styles.subtitle}>Total tracked: {formatCurrency(totalSpent)}</Text>
      </View>

      <View style={styles.topActions}>
        <Pressable
          style={[styles.primaryButton, (ocrLoading || loading) && styles.disabledButton]}
          onPress={() => setScannerVisible(true)}
          disabled={ocrLoading || loading}
        >
          <Text style={styles.primaryButtonText}>Scan Receipt</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => setDraft(createEmptyDraft())}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>Add Manually</Text>
        </Pressable>
      </View>

      {ocrLoading ? (
        <View style={styles.loadingBanner}>
          <ActivityIndicator color="#0f766e" />
          <Text style={styles.loadingText}>Running OCR...</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : draft ? (
        <ExpenseForm
          draft={draft}
          saving={saving}
          onCancel={() => setDraft(null)}
          onSubmit={handleSaveDraft}
        />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, transactions.length === 0 && styles.emptyList]}
          ListEmptyComponent={<Text style={styles.emptyText}>No transactions yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.vendor}>{item.description}</Text>
                <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
              </View>
              <Text style={styles.metaText}>Date: {item.date}</Text>
              <Text style={styles.metaText}>Category: {item.category ?? "Uncategorized"}</Text>
            </View>
          )}
        />
      )}

      <ReceiptScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onImageSelected={handleImageSelected}
        busy={ocrLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f1f5f9" },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: "800", color: "#0f172a" },
  subtitle: { marginTop: 2, fontSize: 16, color: "#334155" },
  topActions: { paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", gap: 10 },
  primaryButton: { flex: 1, backgroundColor: "#0f766e", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  secondaryButton: { flex: 1, backgroundColor: "#e2e8f0", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  secondaryButtonText: { color: "#0f172a", fontWeight: "700" },
  disabledButton: { opacity: 0.6 },
  loadingBanner: { marginHorizontal: 16, marginBottom: 10, backgroundColor: "#ccfbf1", borderRadius: 10, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  loadingText: { color: "#0f172a" },
  errorText: { marginHorizontal: 16, marginBottom: 8, color: "#b91c1c", fontWeight: "600" },
  centerState: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  listContent: { padding: 16, gap: 10 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  emptyText: { textAlign: "center", color: "#475569" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e2e8f0", gap: 4 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  vendor: { color: "#0f172a", fontWeight: "700", fontSize: 16, flex: 1, marginRight: 8 },
  amount: { color: "#115e59", fontWeight: "700", fontSize: 16 },
  metaText: { color: "#334155" }
});
