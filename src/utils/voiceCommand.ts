import { normalizeNumericInput } from './numericInput';
export interface VoiceParsedResult {
  amount?: number;
  categoryOrSource?: string; // e.g., "food" or "راتب"
  note?: string;
  type?: 'income' | 'expense';
}

const ARABIC_NUMERALS_MAP: Record<string, number> = {
  "واحد": 1, "واحدة": 1, "اثنين": 2, "إثنين": 2, "ثلاثة": 3, "ثلاث": 3, "أربعة": 4, "أربع": 4,
  "خمسة": 5, "خمس": 5, "ستة": 6, "ست": 6, "سبعة": 7, "سبع": 7, "ثمانية": 8, "ثمان": 8, "تسعة": 9, "تسع": 9,
  "عشرة": 10, "عشر": 10, "أحد عشر": 11, "إثنا عشر": 12, "ثلاثة عشر": 13, "أربعة عشر": 14, "خمسة عشر": 15,
  "ستة عشر": 16, "سبعة عشر": 17, "ثمانية عشر": 18, "تسعة عشر": 19, "عشرون": 20, "عشرين": 20,
  "ثلاثون": 30, "ثلاثين": 30, "أربعون": 40, "أربعين": 40, "خمسون": 50, "خمسين": 50, "ستون": 60, "ستين": 60,
  "سبعون": 70, "سبعين": 70, "ثمانون": 80, "ثمانين": 80, "تسعون": 90, "تسعين": 90, "مائة": 100, "مية": 100, "ميه": 100, "مئة": 100,
  "مائتان": 200, "مئتان": 200, "ميتين": 200, "ألف": 1000, "الف": 1000, "ألفين": 2000, "الفين": 2000, "آلاف": 1000, "الاف": 1000, "اثنا": 2, "اثني": 2
};

// Word-by-word number parser for Arabic if no digits are returned
export function parseArabicWordsToNumber(text: string): number | null {
  const words = text.replace(/(^|\s)و(?=عشر|خمس|ست|سبع|ثمان|تسع|مئ|مي|ألف|الف|أرب|اربع|اثن|ثلا|واحد)/g, "$1").split(/\s+/);
  let total = 0;
  let temp = 0;
  for (const word of words) {
    if (ARABIC_NUMERALS_MAP[word] !== undefined) {
      const val = ARABIC_NUMERALS_MAP[word];
      if (val === 100 || val === 1000) {
        if (temp === 0) temp = 1;
        total += temp * val;
        temp = 0;
      } else if (val === 200 || val === 2000) {
        total += val;
        temp = 0;
      } else {
        temp += val;
      }
    }
  }
  total += temp;
  return total > 0 ? total : null;
}

export function extractDigits(text: string): number | null {
  // Convert Eastern Arabic numerals (٠-٩) to Western (0-9)
  const normalized = normalizeNumericInput(text);
  // Match any digits with optional decimal point
  const match = normalized.match(/\d+(\.\d+)?/);
  if (match) {
    const value = Number(match[0]);
    if (normalized[match.index! - 1] === '-' || !Number.isFinite(value) || value <= 0 || value > 1e9 || (match[0].split('.')[1]?.length || 0) > 2) return null;
    return value;
  }
  return null;
}

export const EXPENSE_KEYWORDS = [
  { id: "food", name: "طعام وشراب", keys: ["طعام", "شراب", "أكل", "اكل", "شرب", "مطعم", "مطاعم", "سوبرماركت", "سوبر ماركت", "غداء", "عشاء", "فطور", "بقالة", "تموينات", "لحم", "خضار", "فواكه", "دجاج", "حلويات", "قهوة", "مقهى", "كافيه", "بندة", "العثيم", "grocery", "food", "eat", "restaurant", "cafe", "coffee", "dinner", "lunch", "breakfast"] },
  { id: "transport", name: "مواصلات", keys: ["بنزين", "سيارة", "تاكسي", "مواصلات", "اوبر", "كريم", "سفر", "تذكرة", "باص", "مترو", "شحن", "تعبئة", "كفرات", "روغ", "car", "gas", "petrol", "taxi", "uber", "transport", "flight"] },
  { id: "utilities", name: "كهرباء ومياه", keys: ["كهرباء", "مياه", "فاتورة", "نت", "انترنت", "اتصالات", "جوال", "هاتف", "غاز", "كهربا", "بيل", "اس تي سي", "stc", "موبايلي", "زين", "زين", "bill", "internet", "electricity", "water", "phone"] },
  { id: "education", name: "تعليم", keys: ["دراسة", "مدرسة", "جامعة", "كتب", "دفاتر", "تعليم", "كورسات", "دورة", "قسط", "حقيبة", "رسوم", "روضة", "حضانه", "حضانة", "school", "education", "books", "university", "course", "fees"] },
  { id: "health", name: "صحة وطب", keys: ["دواء", "علاج", "صيدلية", "دكتور", "طبيب", "مستشفى", "تحليل", "عيادة", "نظارة", "صحي", "أسنان", "اسنان", "عملية", "مرض", "فحص", "medical", "pharmacy", "doctor", "health", "medicine", "hospital"] },
  { id: "clothing", name: "ملابس", keys: ["ملابس", "ثوب", "بدلة", "قميص", "فستان", "حذاء", "شوز", "ملبس", "كسوة", "جاكيت", "أحذية", "احذيه", "طرحه", "عبايه", "عباية", "جزمة", "clothes", "clothing", "dress", "shoes"] },
  { id: "maintenance", name: "صيانة المنزل", keys: ["صيانة", "صيانه", "تصليح", "سباكة", "سباكه", "كهربائي", "ترميم", "منزل", "بيت", "مكيف", "ثلاجة", "ثلاجه", "غسالة", "غساله", "حديقة", "عفش", "أثاث", "اثاث", "تسريب", "maintenance", "repair", "plumbing"] },
  { id: "entertainment", name: "ترفيه", keys: ["ترفيه", "العاب", "لعبة", "سينما", "فيلم", "نزهة", "نزهه", "رحلة", "رحلة", "ملاهي", "اشتراك", "نتفلكس", "شاهد", "شاشه", "سياحة", "شاليه", "مزرعة", "العاب", "play", "game", "cinema", "netflix", "entertainment", "fun"] },
  { id: "other", name: "أخرى", keys: ["أخرى", "اخرى", "أشياء", "اشياء", "نثرية", "نثريه", "متنوعة", "متنوعه", "other", "misc"] }
];

export const INCOME_KEYWORDS = [
  { id: "راتب", name: "راتب شهري أساسي", keys: ["راتب", "معاش", "شهري", "سدادي", "العمل", "دوام", "الوظيفة", "الوظيفه", "salary", "job", "payroll"] },
  { id: "مكافأة", name: "مكافأة أو حوافز مالية", keys: ["مكافأة", "حافز", "بونص", "حوافز", "ارباح اضافية", "أرباح إضافية", "زيادة", "زياده", "مكافأه", "bonus", "reward", "incentive"] },
  { id: "إيجار", name: "عائد إيجار عقار أو أصل", keys: ["إيجار", "ايجار", "عقار", "شقة", "شقه", "محل", "فندق", "دكان", "rent", "property", "tenant"] },
  { id: "استثمار", name: "أرباح أسهم أو استثمارات", keys: ["استثمار", "أسهم", "اسهم", "تداول", "أرباح", "ارباح", "تجارة", "بيعة", "بيعه", "سهم", "سندات", "محفظة", "crypto", "investment", "dividend", "shares", "stock"] },
  { id: "هدية", name: "هدية أو وارد عائلي طارئ", keys: ["هدية", "هديه", "هبة", "عيدية", "عيديه", "تبرع", "مساعدة", "مسعده", "صدقة", "صدقه", "gift", "donation", "present", "eidiya"] },
  { id: "أخرى", name: "وارد مالي آخر", keys: ["أخرى", "اخرى", "دبرة", "دبره", "شغل جانبي", "عمل حر", "مستقل", "freelance", "other"] }
];

export function cleanDescription(text: string, amount: number | null, matchedKeys: string[]): string {
  let cleaned = text;

  if (amount !== null) {
    cleaned = cleaned.replace(new RegExp(String(amount), 'g'), '');
    cleaned = cleaned.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    cleaned = cleaned.replace(new RegExp(String(amount), 'g'), '');
    
    const arabicWords = ["ريال", "ريالاً", "ريال سعودي", "دولار", "جنيه", "درهم", "دينار", "ريالات", "قرش", "هللة", "sar", "usd", "egp", "aed"];
    arabicWords.forEach(w => {
      cleaned = cleaned.replace(new RegExp(w, 'gi'), '');
    });
  }

  const filterWords = [
    "صرفت", "دفعت", "سجلت", "سجل", "أضف", "اضف", "أدخل", "ادخل", "قيمة", "بقيمة", "بمبلغ", "مبلغ", "تم دفع", "تم صرف",
    "وارد", "إيراد", "ايراد", "دخل", "جاني", "حصلت على", "جاءني", "على", "من", "في", "إلى", "الى", "لـ", "عن طريق",
    "spent", "paid", "add", "record", "income", "expense", "amount", "of", "for", "on", "from"
  ];

  matchedKeys.forEach(k => {
    cleaned = cleaned.replace(new RegExp(k, 'gi'), '');
  });

  filterWords.forEach(w => {
    cleaned = cleaned.replace(new RegExp(`\\b${w}\\b`, 'gi'), '');
    cleaned = cleaned.replace(new RegExp(`\\s${w}\\s`, 'g'), ' ');
    cleaned = cleaned.replace(new RegExp(`^${w}\\s`, 'g'), '');
    cleaned = cleaned.replace(new RegExp(`\\s${w}$`, 'g'), '');
  });

  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

export function parseVoiceCommand(text: string, mode: 'income' | 'expense'): VoiceParsedResult {
  const normalized = text.toLowerCase().trim();
  if (/ناقص|سالب|[-−]\s*[0-9٠-٩۰-۹]/.test(normalized)) return { type: mode };
  const amount = extractDigits(normalized) || parseArabicWordsToNumber(normalized);

  let categoryOrSource: string | undefined = undefined;
  let matchedKeys: string[] = [];

  if (mode === 'expense') {
    for (const cat of EXPENSE_KEYWORDS) {
      const match = cat.keys.find(k => normalized.includes(k));
      if (match) {
        categoryOrSource = cat.id;
        matchedKeys.push(match);
        break;
      }
    }
    if (!categoryOrSource && amount) {
      categoryOrSource = "other";
    }
  } else {
    for (const src of INCOME_KEYWORDS) {
      const match = src.keys.find(k => normalized.includes(k));
      if (match) {
        categoryOrSource = src.id;
        matchedKeys.push(match);
        break;
      }
    }
    if (!categoryOrSource && amount) {
      categoryOrSource = "أخرى";
    }
  }

  const note = cleanDescription(text, amount, matchedKeys);

  return {
    amount: amount || undefined,
    categoryOrSource,
    note: note || undefined,
    type: mode
  };
}

