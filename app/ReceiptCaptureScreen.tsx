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
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.loadingBannerText}>Running OCR...</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#2563EB" />
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
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },

  header: {
    marginTop: 16,
    marginBottom: 16,
    alignItems: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },

  topActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  primaryButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },

  secondaryButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 16,
  },

  disabledButton: {
    opacity: 0.6,
  },

  loadingBanner: {
    marginBottom: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingBannerText: {
    color: "#2563EB",
    fontWeight: "600",
  },

  loadingText: {
    color: "#111827",
    fontWeight: "500",
  },

  errorText: {
    marginBottom: 12,
    color: "#DC2626",
    fontWeight: "600",
  },

  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },

  listContent: {
    paddingVertical: 12,
    gap: 12,
  },

  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },

  emptyText: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 16,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  vendor: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },

  amount: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 16,
  },

  metaText: {
    color: "#6B7280",
    fontSize: 14,
  },
});
