export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function object(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'بيانات الطلب غير صالحة');
  }
  return value as Record<string, any>;
}

export function text(value: unknown, max: number, required = false): string {
  if (value === undefined || value === null) {
    if (required) throw new HttpError(400, 'حقل مطلوب غير موجود');
    return '';
  }
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
    throw new HttpError(400, 'قيمة نصية غير صالحة');
  }
  return value;
}

export function amount(value: unknown): number {
  if (typeof value !== 'number' && typeof value !== 'string') throw new HttpError(400, 'مبلغ غير صالح');
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1e12) throw new HttpError(400, 'مبلغ غير صالح');
  return parsed;
}

export function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new HttpError(400, 'عدد غير صالح');
  }
  return value;
}

export function transactionInput(input: unknown) {
  const v = object(input);
  const id = text(v.id, 200, true);
  if (id === 'all') throw new HttpError(400, 'معرف محجوز');
  if (v.type !== 'income' && v.type !== 'expense') throw new HttpError(400, 'نوع المعاملة غير صالح');
  const date = text(v.date, 10, true);
  const parsedDate = new Date(date + 'T00:00:00.000Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw new HttpError(400, 'تاريخ غير صالح');
  }
  return {
    id, type: v.type as 'income' | 'expense', amount: amount(v.amount), date,
    source: text(v.source, 128) || null, category: text(v.category, 128) || null,
    note: text(v.note, 4000),
  };
}

export function billInput(input: unknown) {
  const v = object(input);
  return {
    id: text(v.id, 200, true), title: text(v.title, 256, true), amount: amount(v.amount),
    category: text(v.category, 128, true), dayOfMonth: integer(v.dayOfMonth ?? 1, 1, 31),
  };
}

export function settingsInput(input: unknown, uid: string) {
  const v = object(input);
  const flag = (key: string, fallback = 1) => {
    if (v[key] === undefined) return fallback;
    if (![true, false, 0, 1].includes(v[key])) throw new HttpError(400, 'إعداد غير صالح');
    return v[key] ? 1 : 0;
  };
  if (v.sortOrder !== undefined && !['asc', 'desc'].includes(v.sortOrder)) throw new HttpError(400, 'ترتيب غير صالح');
  if (v.language !== undefined && !['ar', 'en'].includes(v.language)) throw new HttpError(400, 'لغة غير صالحة');
  return {
    uid, currency: text(v.currency ?? 'ر.س', 16, true), cycleStart: integer(v.cycleStart ?? 1, 1, 31),
    sortOrder: v.sortOrder ?? 'desc', defaultFilter: text(v.defaultFilter ?? 'all', 128, true),
    defaultCategory: text(v.defaultCategory ?? 'طعام وشراب', 128, true), defaultSource: text(v.defaultSource ?? 'راتب', 128, true),
    showMotivation: flag('showMotivation'), showCharts: flag('showCharts'), autoHome: flag('autoHome'),
    confirmDelete: flag('confirmDelete'), realTimeSync: flag('realTimeSync'), enableSounds: flag('enableSounds'),
    language: v.language ?? 'ar', useHijri: flag('useHijri'),
  };
}

export function email(input: unknown): string {
  const value = text(input, 254, true).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new HttpError(400, 'بريد إلكتروني غير صالح');
  return value;
}
