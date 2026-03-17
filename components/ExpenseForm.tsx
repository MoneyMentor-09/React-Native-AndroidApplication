import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { ExpenseDraft } from "../types";

type ExpenseFormProps = {
  draft: ExpenseDraft;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (draft: ExpenseDraft) => Promise<void> | void;
};

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function ExpenseForm({
  draft,
  saving,
  onCancel,
  onSubmit
}: ExpenseFormProps): React.JSX.Element {
  const [localDraft, setLocalDraft] = useState<ExpenseDraft>(draft);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalDraft(draft);
    setError(null);
  }, [draft]);

  async function handleSave(): Promise<void> {
    const amount = Number(localDraft.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setError("Amount must be a number greater than 0.");
      return;
    }
    if (!isIsoDate(localDraft.expenseDate)) {
      setError("Date must be in YYYY-MM-DD format.");
      return;
    }
    setError(null);
    await onSubmit({
      ...localDraft,
      amount: amount.toFixed(2)
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Review Expense</Text>
      <Text style={styles.subtitle}>Edit the fields before saving.</Text>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Vendor</Text>
        <TextInput
          value={localDraft.vendor}
          onChangeText={(vendor) => setLocalDraft((prev) => ({ ...prev, vendor }))}
          style={styles.input}
          placeholder="Store or merchant name"
          placeholderTextColor="#98A2B3"
        />
      </View>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput
          value={localDraft.expenseDate}
          onChangeText={(expenseDate) => setLocalDraft((prev) => ({ ...prev, expenseDate }))}
          style={styles.input}
          placeholder="2026-02-24"
          placeholderTextColor="#98A2B3"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Amount (USD)</Text>
        <TextInput
          value={localDraft.amount}
          onChangeText={(amount) => setLocalDraft((prev) => ({ ...prev, amount }))}
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor="#98A2B3"
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          value={localDraft.notes}
          onChangeText={(notes) => setLocalDraft((prev) => ({ ...prev, notes }))}
          style={[styles.input, styles.multiLineInput]}
          multiline
          placeholder="Category, payment method, or notes..."
          placeholderTextColor="#98A2B3"
        />
      </View>

      {localDraft.rawText ? (
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>OCR Text (Read-only)</Text>
          <View style={styles.ocrBlock}>
            <Text style={styles.ocrText}>{localDraft.rawText}</Text>
          </View>
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={styles.secondaryButton} onPress={onCancel} disabled={saving}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryButton, saving && styles.disabledButton]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.primaryButtonText}>{saving ? "Saving..." : "Save Expense"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 16,
    gap: 12
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827"
  },
  subtitle: {
    color: "#667085",
    marginBottom: 8
  },
  fieldWrap: {
    gap: 6
  },
  label: {
    color: "#111827",
    fontWeight: "600"
  },
  input: {
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    color: "#111827"
  },
  multiLineInput: {
    minHeight: 90,
    textAlignVertical: "top"
  },
  ocrBlock: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 10,
    maxHeight: 170
  },
  ocrText: {
    color: "#667085",
    lineHeight: 18
  },
  errorText: {
    color: "#DC2626",
    fontWeight: "600"
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700"
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: "#111827",
    fontWeight: "700"
  },
  disabledButton: {
    opacity: 0.6
  }
});
