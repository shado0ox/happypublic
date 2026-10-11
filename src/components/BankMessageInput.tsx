import { useState } from 'react';
import { BankExpense, parseBankMessage } from '../utils/bankMessage';

export default function BankMessageInput({ onApply }: { onApply: (expense: BankExpense) => void }) {
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);
  return <details className="col-span-full rounded-xl border border-[#ddd0b8] bg-[#fffdf7] p-3">
    <summary className="cursor-pointer text-sm font-bold text-[#0a7c6b] py-1">لصق رسالة البنك</summary>
    <label htmlFor="bank-message" className="block text-xs text-[#7a6a52] mt-3 mb-2">الصق رسالة شراء واحدة، ثم اختر التصنيف واحفظ.</label>
    <textarea id="bank-message" rows={4} maxLength={4000} autoComplete="off" spellCheck={false}
      className="w-full rounded-lg border border-[#ddd0b8] bg-white p-3 text-sm outline-none focus:border-[#0a7c6b]"
      placeholder="شراء-POS… بـ23.75 SAR"
      onChange={event => {
        const value = event.currentTarget.value;
        if (!value.trim()) { setStatus(''); return; }
        const result = parseBankMessage(value);
        setFailed(!result);
        if (result) {
          onApply(result);
          setStatus(`تم استخراج ${result.amount} SAR${result.merchant ? ` — ${result.merchant}` : ''}. راجع المبلغ والتاريخ ثم احفظ.`);
          event.currentTarget.value = '';
        } else setStatus('لم أتعرف على مبلغ شراء واحد بـ SAR أو SR. لم تتغير الحقول؛ أدخل المبلغ يدويًا أو الصق رسالة واحدة كاملة.');
      }} />
    {status && <p role="status" className={`mt-2 text-xs ${failed ? 'text-red-700' : 'text-[#0a7c6b]'}`}>{status}</p>}
    <p className="mt-2 text-[11px] text-[#7a6a52]">تُقرأ على جهازك فقط؛ لا تُحفظ الرسالة أو أرقام البطاقة والحساب. العملة المستخرجة SAR؛ لا يحدث تحويل عملات.</p>
  </details>;
}
