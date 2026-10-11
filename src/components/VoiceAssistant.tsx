import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Mic, MicOff, Check, X, AlertTriangle, Play, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CAT_EMOJIS } from '../translations';

import { VoiceParsedResult, parseVoiceCommand, EXPENSE_KEYWORDS, INCOME_KEYWORDS } from '../utils/voiceCommand';
export type { VoiceParsedResult } from '../utils/voiceCommand';
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
  const [voiceError, setVoiceError] = useState('');
  const [typedCommand, setTypedCommand] = useState('');
  const toastRef = useRef(triggerToast);
  toastRef.current = triggerToast;
  const busyRef = useRef(false);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || !window.isSecureContext) {
      setBrowserSupported(false);
      return;
    }

    setBrowserSupported(true);
    let disposed = false;
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'ar-SA'; // Default to Saudi Arabic speech recognition

    rec.onstart = () => {
      if (disposed) return;
      setIsListening(true);
      setVoiceError('');
      setPermissionError(false);
      setTranscript('جاري الاستماع... تحدّث الآن 🎙️');
      setResult(null);
    };

    rec.onresult = (event: any) => {
      if (disposed) return;
      const text = Array.from(event.results as any[]).map((item: any) => item[0]?.transcript || '').join(' ');
      setTranscript(text);
      
      const parsed = parseVoiceCommand(text, mode);
      setResult(parsed);
    };

    rec.onerror = (event: any) => {
      if (disposed) return;
      busyRef.current = false;
      setIsListening(false);
      if (event.error === 'aborted') return;
      const denied = event.error === 'not-allowed' || event.error === 'service-not-allowed';
      setPermissionError(denied);
      const message = denied ? 'اسمح بالميكروفون من إعدادات الموقع، أو استخدم ميكروفون لوحة المفاتيح في الخانة أدناه.'
        : event.error === 'network' ? 'تعذر الاتصال بخدمة التعرف الصوتي. تحقق من الإنترنت أو استخدم ميكروفون لوحة المفاتيح.'
        : event.error === 'audio-capture' ? 'لم يتوفر ميكروفون. تحقق من توصيله وصلاحياته.'
        : event.error === 'no-speech' ? 'لم أسمع كلامًا. حاول مجددًا وتحدث بعد بدء الاستماع.'
        : 'تعذر تشغيل التعرف الصوتي في هذا المتصفح. استخدم خانة الإملاء أدناه.';
      setVoiceError(message);
      setTranscript('');
      toastRef.current(message, true);
    };
    rec.onend = () => {
      busyRef.current = false;
      if (!disposed) setIsListening(false);
    };
    recognitionRef.current = rec;
    return () => {
      disposed = true;
      rec.onstart = rec.onresult = rec.onerror = rec.onend = null;
      rec.abort();
      if (recognitionRef.current === rec) recognitionRef.current = null;
      busyRef.current = false;
    };
  }, [mode]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (busyRef.current) { recognitionRef.current.stop(); return; }
    try {
      busyRef.current = true;
      setPermissionError(false);
      setVoiceError('');
      recognitionRef.current.start();
    } catch {
      busyRef.current = false;
      setIsListening(false);
      setVoiceError('تعذر بدء التسجيل. أعد المحاولة أو استخدم ميكروفون لوحة المفاتيح.');
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
          التعرف حسب دعم المتصفح والإنترنت
        </div>
      </div>

      {voiceError && <p role="alert" className="text-xs text-red-700">{voiceError}</p>}
      {!browserSupported ? (
        <div className="text-right text-[10px] text-amber-800 bg-amber-50 border border-amber-200/50 p-2.5 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            التعرف الصوتي غير متاح هنا. افتح رابط HTTPS في متصفح يدعم التعرف، أو استخدم ميكروفون لوحة المفاتيح في الخانة أدناه.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={isListening ? 'إيقاف الاستماع' : 'بدء الإدخال الصوتي'}
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
      <details className="border-t border-[#e8dcc8] pt-2">
        <summary className="cursor-pointer text-xs font-bold py-2">الإملاء من لوحة المفاتيح أو كتابة الجملة</summary>
        <label htmlFor={`voice-command-${mode}`} className="block text-xs mb-2">اضغط الخانة ثم ميكروفون لوحة مفاتيح الهاتف، وقل المبلغ والتصنيف.</label>
        <textarea id={`voice-command-${mode}`} rows={2} value={typedCommand} onChange={e => setTypedCommand(e.target.value)} className="w-full p-3 border rounded-lg bg-white text-sm" placeholder="صرفت 25.50 ريال على بنزين" />
        <button type="button" disabled={!typedCommand.trim()} onClick={() => {
          recognitionRef.current?.abort();
          const parsed = parseVoiceCommand(typedCommand, mode);
          setTranscript(typedCommand); setResult(parsed);
        }} className="mt-2 rounded-lg bg-[#0a7c6b] text-white px-4 py-2 text-xs disabled:opacity-50">تحليل الجملة</button>
      </details>
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

      <p className="text-[10px] text-[#7a6a52]">قد يرسل المتصفح الصوت إلى خدمة التعرف الخاصة به. التطبيق لا يسجل الصوت أو يخزنه.</p>
    </div>
  );
}
