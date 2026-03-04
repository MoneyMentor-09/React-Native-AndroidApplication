import type { ParsedReceipt } from "../types";

function toIsoDate(year: number, month: number, day: number): string | undefined {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return undefined;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

function parseDate(text: string): string | undefined {
  const isoMatch = text.match(/\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
  if (isoMatch) {
    return toIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const usMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (usMatch) {
    const month = Number(usMatch[1]);
    const day = Number(usMatch[2]);
    const yearRaw = Number(usMatch[3]);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    return toIsoDate(year, month, day);
  }

  return undefined;
}

function parseMoneyValue(raw: string): number | undefined {
  const normalized = raw.replace(/[$,\s]/g, "");
  const amount = Number(normalized);
  if (Number.isNaN(amount) || amount <= 0) {
    return undefined;
  }
  return amount;
}

function findAmount(lines: string[], rawText: string): number | undefined {
  for (const line of lines) {
    if (/total/i.test(line) && !/subtotal/i.test(line)) {
      const amountMatch = line.match(/([$]?\d{1,3}(?:,\d{3})*(?:\.\d{2})|[$]?\d+(?:\.\d{2}))/i);
      if (amountMatch) {
        const value = parseMoneyValue(amountMatch[1]);
        if (value !== undefined) {
          return value;
        }
      }
    }
  }

  const allMatches = rawText.match(/\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})|\$?\d+(?:\.\d{2})/g);
  if (!allMatches || allMatches.length === 0) {
    return undefined;
  }

  const values = allMatches
    .map((token) => parseMoneyValue(token))
    .filter((value): value is number => value !== undefined);

  if (values.length === 0) {
    return undefined;
  }

  return Math.max(...values);
}

function findVendor(lines: string[]): string | undefined {
  for (const line of lines.slice(0, 5)) {
    if (line.length < 2 || line.length > 50) {
      continue;
    }
    if (/\d/.test(line)) {
      continue;
    }
    if (/receipt|invoice|total|date|tax|cashier/i.test(line)) {
      continue;
    }
    return line;
  }
  return undefined;
}

export function parseReceiptText(rawText: string): ParsedReceipt {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let expenseDate: string | undefined;
  for (const line of lines.slice(0, 15)) {
    const parsed = parseDate(line);
    if (parsed) {
      expenseDate = parsed;
      break;
    }
  }

  return {
    vendor: findVendor(lines),
    expenseDate,
    amount: findAmount(lines, rawText),
    rawText
  };
}
