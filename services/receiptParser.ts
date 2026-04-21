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
  const normalized = raw.replaceAll(/[$,\s]/g, "");
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

const ADDRESS_KEYWORDS = [
  "street",
  "st",
  "road",
  "rd",
  "avenue",
  "ave",
  "blvd",
  "boulevard",
  "drive",
  "dr",
  "lane",
  "ln",
  "highway",
  "hwy",
  "suite",
  "ste",
  "unit",
  "floor",
  "fl",
  "po box"
];

function isLikelyAddress(line: string): boolean {
  if (/\b\d{1,5}\b/.test(line) && /\b[A-Za-z]{2,}\b/.test(line)) {
    return true;
  }
  if (/\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/.test(line)) {
    return true;
  }
  const normalized = line.toLowerCase();
  return ADDRESS_KEYWORDS.some((keyword) => new RegExp(`\\b${keyword}\\b`, "i").test(normalized));
}

function isLikelyMeta(line: string): boolean {
  return /receipt|invoice|total|subtotal|date|tax|cashier|register|change|balance|thank|survey|code|promo|offer|coupon|owner|manager|attn|attention/i.test(
    line
  );
}

function isLikelyPhone(line: string): boolean {
  return /(\+?1[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(line);
}

function isLikelyCityState(line: string): boolean {
  return /\b[A-Za-z\s.'-]+,\s*[A-Z]{2}\b/.test(line);
}

function scoreVendorLine(line: string, index: number): number {
  const trimmed = line.trim();
  if (trimmed.endsWith(":")) {
    return -1;
  }
  if (trimmed.length < 2 || trimmed.length > 50) {
    return -1;
  }
  if (isLikelyMeta(trimmed) || isLikelyAddress(trimmed) || isLikelyPhone(trimmed)) {
    return -1;
  }

  const alphaCount = (trimmed.match(/[A-Za-z]/g) || []).length;
  const digitCount = (trimmed.match(/\d/g) || []).length;
  if (alphaCount === 0) {
    return -1;
  }

  let score = 0;
  score += Math.max(0, 12 - index * 2);
  score += Math.max(0, 12 - trimmed.length / 2);

  const upperOnly = trimmed.replaceAll(/[^A-Za-z]/g, "");
  const isAllCaps = upperOnly.length > 0 && upperOnly === upperOnly.toUpperCase();
  if (isAllCaps) {
    score += 6;
  }

  if (digitCount > 0) {
    score -= digitCount;
  }

  if (isLikelyCityState(trimmed)) {
    score -= 8;
  }

  if (/store|location|loc\b/i.test(trimmed)) {
    score -= 4;
  }

  if (/#\d+\b/i.test(trimmed)) {
    score -= 2;
  }

  return score;
}

function normalizeVendor(line: string): string {
  const cleaned = line.replaceAll(/\s{2,}/g, " ").trim();
  return cleaned.replaceAll(/\s?#\d+\b/g, "").trim();
}

function findVendor(lines: string[]): string | undefined {
  const candidateLines = lines.slice(0, 12);
  let bestLine: string | undefined;
  let bestScore = -Infinity;

  for (let index = 0; index < candidateLines.length; index += 1) {
    const line = candidateLines[index];
    const score = scoreVendorLine(line, index);
    if (score < 0) {
      continue;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLine = line;
    }
  }

  return bestLine ? normalizeVendor(bestLine) : undefined;
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
