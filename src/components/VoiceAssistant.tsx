import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Mic, MicOff, Check, X, AlertTriangle, Play, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CAT_EMOJIS } from '../translations';

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
  "سبعون": 70, "سبعين": 70, "ثمانون": 80, "ثمانين": 80, "تسعون": 90, "تسعين": 90, "مائة": 100, "ميه": 100, "مئة": 100,
  "مائتان": 200, "مئتان": 200, "ميتين": 200, "ألف": 1000, "الف": 1000, "ألفين": 2000, "الفين": 2000
};

// Word-by-word number parser for Arabic if no digits are returned
export function parseArabicWordsToNumber(text: string): number | null {
  const words = text.split(/\s+/);
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
  const normalized = text.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  // Match any digits with optional decimal point
  const match = normalized.match(/\d+(\.\d+)?/);
  if (match) {
    return parseFloat(match[0]);
  }
  return null;
}

const EXPENSE_KEYWORDS = [
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

const INCOME_KEYWORDS = [
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

interface VoiceAssistantProps {
  mode: 'income' | 'expense';
  currency: string;
  onApply: (result: VoiceParsedResult) => void;
  triggerToast: (msg: string, isError?: boolean) => void;
}

export default function VoiceAssistant({ mode, currency, onApply, triggerToast }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<VoiceParsedResult | null>(null);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setBrowserSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'ar-SA'; // Default to Saudi Arabic speech recognition

    rec.onstart = () => {
      setIsListening(true);
      setPermissionError(false);
      setTranscript('جاري الاستماع... تحدّث الآن 🎙️');
      setResult(null);
    };

    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      
      const parsed = parseVoiceCommand(text, mode);
      setResult(parsed);
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error', event);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setPermissionError(true);
        triggerToast('⚠️ يرجى تفعيل صلاحية الميكروفون للتعرف الصوتي', true);
      } else {
        triggerToast('❌ لم نتمكن من فهم الصوت، يرجى المحاولة مجدداً', true);
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
  }, [mode, triggerToast]);

  const toggleListening = () => {
    if (!browserSupported) {
      triggerToast('⚠️ التعرف الصوتي غير مدعوم في متصفحك الحالي، يرجى تجربة متصفح كروم أو سفاري', true);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error(e);
        // Force recreation of speech instance if state got locked
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const freshRec = new SpeechRecognition();
          freshRec.continuous = false;
          freshRec.interimResults = false;
          freshRec.lang = 'ar-SA';
          freshRec.onstart = () => {
            setIsListening(true);
            setTranscript('جاري الاستماع... تحدّث الآن 🎙️');
            setResult(null);
          };
          freshRec.onresult = (event: any) => {
            const text = event.results[0][0].transcript;
            setTranscript(text);
            const parsed = parseVoiceCommand(text, mode);
            setResult(parsed);
          };
          freshRec.onerror = (event: any) => {
            setIsListening(false);
            if (event.error === 'not-allowed') setPermissionError(true);
          };
          freshRec.onend = () => setIsListening(false);
          recognitionRef.current = freshRec;
          freshRec.start();
        }
      }
    }
  };

  const handleApplyResult = () => {
    if (result) {
      onApply(result);
      setResult(null);
      setTranscript('');
      triggerToast('✍️ تم تعبئة البيانات من الصوت بنجاح');
    }
  };

  const getCategoryLabel = (catId?: string) => {
    if (!catId) return 'غير محدد';
    if (mode === 'expense') {
      const match = EXPENSE_KEYWORDS.find(c => c.id === catId);
      return match ? match.name : catId;
    } else {
      const match = INCOME_KEYWORDS.find(s => s.id === catId);
      return match ? match.name : catId;
    }
  };

  const getEmojiForCategory = (catId?: string) => {
    if (!catId) return '❓';
    return CAT_EMOJIS[catId] || CAT_EMOJIS[`${catId}_income`] || '📦';
  };

  const accentColor = mode === 'income' ? '#0a7c6b' : '#e67e22';

  return (
    <div className="bg-[#fdf3e0]/30 border border-[#e8dcc8] rounded-xl p-4 space-y-3 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🎙️</span>
          <span className="text-[11.5px] font-black text-[#2c1f0e]">الإدخال السريع بالصوت</span>
        </div>
        <div className="text-[9.5px] text-[#7a6a52] font-semibold flex items-center gap-1">
          <HelpCircle className="w-3 h-3" />
          بدون ذكاء اصطناعي (أوفلاين)
        </div>
      </div>

      {!browserSupported ? (
        <div className="text-right text-[10px] text-amber-800 bg-amber-50 border border-amber-200/50 p-2.5 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            التعرف الصوتي غير مدعوم في متصفحك أو يحتاج إلى تشغيل التطبيق في تبويب مستقل (خارج نافذة المعاينة المدمجة). جرّب متصفح <strong>جوجل كروم</strong> أو <strong>سفاري</strong>.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-3.5 rounded-full transition-all shrink-0 shadow-sm relative ${
                isListening ? 'animate-pulse text-white' : 'text-white'
              }`}
              style={{
                backgroundColor: accentColor,
                boxShadow: isListening ? `0 0 12px ${accentColor}` : undefined
              }}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span className="absolute -inset-1 rounded-full border border-dashed animate-spin" style={{ borderColor: accentColor }} />
                </>
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            <div className="flex-1 bg-white/80 border border-[#e8dcc8]/60 rounded-xl p-2.5 min-h-[44px] flex items-center justify-end text-right">
              <span className={`text-[10.5px] font-bold ${isListening ? 'text-teal-600 animate-pulse' : 'text-[#2c1f0e]'}`}>
                {transcript || (mode === 'income' ? 'اضغط الميكروفون وقل مثلاً: "راتب خمسة آلاف لشهر يوليو"' : 'اضغط الميكروفون وقل مثلاً: "صرفت خمسين ريال على طعام الغداء"')}
              </span>
            </div>
          </div>

          {permissionError && (
            <div className="text-[9.5px] text-red-600 text-right font-bold bg-red-50 p-2 rounded-lg">
              🔒 يرجى منح الإذن للوصول للميكروفون في إعدادات المتصفح.
            </div>
          )}

          {/* Micro animation waveform */}
          {isListening && (
            <div className="flex items-center justify-center gap-0.5 py-1.5">
              {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-0.5 rounded-full"
                  style={{ backgroundColor: accentColor }}
                  animate={{ height: [4, h * 4, 4] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.05 }}
                />
              ))}
            </div>
          )}

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border-2 border-dashed border-[#ddd0b8] p-3 rounded-xl space-y-2.5 text-right"
              >
                <div className="text-[10px] font-black text-[#7a6a52] border-b border-dashed border-[#ddd0b8] pb-1.5 flex items-center justify-between">
                  <span>✨ تفاصيل المعاملة المستخلصة:</span>
                  <button type="button" onClick={() => setResult(null)} className="text-red-500 hover:bg-red-50 p-1 rounded-md">
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                  <div className="bg-[#fdf3e0]/40 p-1.5 rounded-md">
                    <span className="text-[#7a6a52] block text-[9px]">المبلغ المستخلص:</span>
                    <span className="font-black text-[#2c1f0e]" style={{ color: accentColor }}>
                      {result.amount ? `${result.amount} ${currency}` : '❌ غير مكتشف'}
                    </span>
                  </div>

                  <div className="bg-[#fdf3e0]/40 p-1.5 rounded-md">
                    <span className="text-[#7a6a52] block text-[9px]">
                      {mode === 'income' ? 'مصدر الإيراد:' : 'فئة المصروف:'}
                    </span>
                    <span className="font-bold text-[#2c1f0e] flex items-center gap-1 justify-end">
                      {getEmojiForCategory(result.categoryOrSource)} {getCategoryLabel(result.categoryOrSource)}
                    </span>
                  </div>

                  <div className="col-span-2 bg-[#fdf3e0]/40 p-1.5 rounded-md">
                    <span className="text-[#7a6a52] block text-[9px]">الوصف / التفاصيل المستخلصة:</span>
                    <span className="font-bold text-[#2c1f0e]">{result.note || '✏️ بدون تفاصيل إضافية'}</span>
                  </div>
                </div>

                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={handleApplyResult}
                    disabled={!result.amount}
                    className="flex-1 py-1.5 rounded-lg text-white font-black text-[10px] flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    style={{ backgroundColor: accentColor, opacity: !result.amount ? 0.6 : 1 }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    تعبئة الحقول وحفظ المعاملة 💾
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-[9px] text-[#7a6a52] bg-white/40 border border-[#e8dcc8]/40 p-2 rounded-lg text-right space-y-1">
            <p className="font-bold text-[#2c1f0e]">💡 أمثلة يمكنك تجربتها:</p>
            {mode === 'income' ? (
              <ul className="list-disc pr-3.5 space-y-0.5">
                <li>"راتب شهري أساسي بقيمة ٥٠٠٠ ريال لشهر يوليو"</li>
                <li>"جاني هدية خمسين ريال من الوالد"</li>
                <li>"مكافأة بمبلغ ميتين وخمسين ريال من الشغل"</li>
              </ul>
            ) : (
              <ul className="list-disc pr-3.5 space-y-0.5">
                <li>"صرفت مية وعشرين ريال فاتورة مياه"</li>
                <li>"دفعت ستين ريال على طعام الغداء"</li>
                <li>"بنزين سيارة بمبلغ خمسين ريال"</li>
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
