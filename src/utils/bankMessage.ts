import { normalizeNumericInput } from './numericInput';

export type BankExpense = { amount: string; merchant: string; date?: string };

// Parse locally: never retain the message, card number, account number or balance.
export function parseBankMessage(message: string): BankExpense | null {
  const text = normalizeNumericInput(message).replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '');
  if (!/شراء/.test(text) || /إلغاء|الغاء|استرداد|مرتجع/.test(text)) return null;
  const amounts = [...text.matchAll(/(?:بـ?\s*|مبلغ\s*:?\s*)([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*(?:SAR|SR)\b/gi)];
  if (amounts.length !== 1 || (text.match(/شراء/g) || []).length !== 1) return null;
  const amount = Number(amounts[0][1].replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e9) return null;
  const lines = text.split(/\r?\n/).map(line => line.trim());
  const merchant = lines.map(line => line.match(/^من\s*(.+)$/)?.[1]?.trim())
    .find(value => value && !/\*|مدى|ابل باي|رقم الحساب/.test(value) && !/^\d+$/.test(value)) || '';
  // Merchant descriptors may contain '*', e.g. OPENAI *CHATGPT SUBSCR.
  const descriptor = merchant || lines.map(line => line.match(/^من\s*(.+)$/)?.[1]?.trim())
    .find(value => value && /[A-Za-z]/.test(value)) || '';
  const match = text.match(/\b(\d{2})\/(\d{2})\/(\d{2}|\d{4})\b/);
  let date: string | undefined;
  if (match) {
    const day = Number(match[1]), month = Number(match[2]), year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day) {
      date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return { amount: amount.toFixed(2), merchant: descriptor.slice(0, 200), date };
}
