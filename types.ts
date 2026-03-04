export type Expense = {
  id: number | string;
  vendor: string;
  expenseDate: string;
  amount: number;
  notes?: string;
  rawText?: string;
  receiptImageUri?: string;
  createdAt: string;
};

export type NewExpense = {
  vendor: string;
  expenseDate: string;
  amount: number;
  notes?: string;
  rawText?: string;
  receiptImageUri?: string;
};

export type ExpenseDraft = {
  vendor: string;
  expenseDate: string;
  amount: string;
  notes: string;
  rawText: string;
  receiptImageUri?: string;
};

export type ParsedReceipt = {
  vendor?: string;
  expenseDate?: string;
  amount?: number;
  rawText: string;
};