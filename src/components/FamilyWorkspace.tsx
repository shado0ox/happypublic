import FamilyStatement from './FamilyStatement';
import ExpenseCategories from './ExpenseCategories';
import { cached, cache, enqueue, flushWrites, writes, clearFamilyCache, discardWrite } from '../utils/offlineStore';
import BankMessageInput from './BankMessageInput';
import { normalizeNumericInput } from '../utils/numericInput';
import React, { useEffect, useRef, useState } from "react";
import {
  Users,
  RefreshCw,
  Plus,
  Download,
  Upload,
  Trash2,
  Pencil,
  Copy,
} from "lucide-react";

type Role = "owner" | "admin" | "editor" | "viewer";
type Family = {
  id: string;
  name: string;
  currency: string;
  cycleStart: number;
  role: Role;
};
type Entry = {
  id: string;
  createdBy: string;
  creatorName: string;
  type: "income" | "expense";
  amount: number;
  amountMinor: number;
  date: string;
  source?: string;
  category?: string;
  note: string;
  pending?: boolean;
};
type Bill = {
  id: string;
  createdBy: string;
  creatorName: string;
  title: string;
  amount: number;
  category: string;
  dayOfMonth: number;
};
type Snapshot = Family & {
  transactions: Entry[];
  recurring_bills: Bill[];
  members: { uid: string; name: string; role: Role }[];
  invitations: { id: string; name: string; role: Role; expiresAt: number }[];
  audit: {
    action: string;
    target: string;
    actorName: string;
    createdAt: number;
  }[];
};
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const emptyEntry = () => ({
  id: "",
  type: "expense" as "expense" | "income",
  amount: "",
  date: today(),
  category: "",
  source: "",
  note: "",
});
const emptyBill = () => ({
  id: "",
  title: "",
  amount: "",
  category: "",
  dayOfMonth: 1,
});
const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label className="family-field">
    <span>{label}</span>
    {children}
  </label>
);

export default function FamilyWorkspace({
  uid,
  token,
  isRTL,
  onExpired,
}: {
  key?: string;
  uid: string;
  token: string;
  isRTL: boolean;
  onExpired: () => void;
}) {
  const tr = (ar: string, en: string) => (isRTL ? ar : en);
  const [families, setFamilies] = useState<Family[]>(()=>cached(uid,'families',[])),
    [selected, setSelected] = useState(()=>cached(uid,'selectedFamily',''));
  const [data, setData] = useState<Snapshot | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [refresh, setRefresh] = useState(0);
  const [createName, setCreateName] = useState(""),
    [createCurrency, setCreateCurrency] = useState("ر.س"),
    [acceptToken, setAcceptToken] = useState("");
  const [inviteEmail, setInviteEmail] = useState(""),
    [inviteRole, setInviteRole] = useState<Role>("editor"),
    [inviteToken, setInviteToken] = useState("");
  const [entry, setEntry] = useState(emptyEntry),
    [bill, setBill] = useState(emptyBill);
  const [month, setMonth] = useState(today().slice(0, 7));
  const upload = useRef<HTMLInputElement>(null);
  const scope = useRef(0),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [online,setOnline]=useState(navigator.onLine);
  const [,setOutboxVersion]=useState(0);
  const pending = writes(uid).filter(write=>write.familyId && write.url.endsWith('/transactions'));
  const overlay=(snapshot:Snapshot):Snapshot=>({...snapshot,transactions:[...snapshot.transactions,...writes(uid).filter(write=>write.url.endsWith('/transactions')).filter(write=>write.familyId===snapshot.id && !write.error && !snapshot.transactions.some(row=>row.id===write.body.id)).map(write=>({...write.body,amountMinor:Math.round(Number(write.body.amount)*100),createdBy:uid,creatorName:'أنت — بانتظار المزامنة',pending:true}))]});
  const api = async (
    url: string,
    body?: unknown,
    method = body === undefined ? "GET" : "POST",
    signal?: AbortSignal,
  ) => {
    if (!alive.current) throw new DOMException("Screen closed", "AbortError");
    if (!navigator.onLine) throw new Error('هذا الإجراء يحتاج اتصالًا؛ يمكنك تسجيل مصروف جديد محليًا');
    const response = await fetch(`/api/families${url}`, {
      method,
      signal,
      headers: {
        "x-user-uid": uid,
        "x-auth-token": token,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    if (!alive.current) throw new DOMException("Screen closed", "AbortError");
    if (response.status === 401) onExpired();
    if (!response.ok) {
      const e = new Error(
        result.error ||
          tr(
            "تعذر إكمال الطلب، حاول مجددًا",
            "Unable to complete request. Try again.",
          ),
      );
      (e as any).status = response.status;
      throw e;
    }
    return result;
  };
  useEffect(() => {
    const controller = new AbortController(),
      version = ++scope.current;
    const saved = selected ? cached<Snapshot|null>(uid,`family_${selected}`,null) : null;
    setLoading(!saved && navigator.onLine);
    setData(saved ? overlay(saved) : null);
    setError("");
    if(!navigator.onLine){setFamilies(cached(uid,'families',[]));setLoading(false);return;}
    void (async () => {
      try {
        const list: Family[] = await api(
          "",
          undefined,
          "GET",
          controller.signal,
        );
        if (scope.current !== version) return;
        const previous=cached<Family[]>(uid,'families',[]);
        for(const old of previous)if(!list.some(item=>item.id===old.id))clearFamilyCache(uid,old.id);
        cache(uid,'families',list);
        setFamilies(list);
        if (!selected) return;
        if (!list.some((f) => f.id === selected)) {
          setSelected("");
          setInviteToken("");
          return;
        }
        const snapshot = await api(
          `/${selected}`,
          undefined,
          "GET",
          controller.signal,
        );
        if (scope.current === version) { setData(overlay(snapshot));try{cache(uid,`family_${selected}`,snapshot);}catch{setError('لا توجد مساحة كافية لتحديث نسخة الجهاز؛ البيانات الحالية من السيرفر');} }
      } catch (e) {
        if (!controller.signal.aborted && scope.current === version) {
          setError((e as Error).message);
          if ([403,404].includes((e as any).status)) {clearFamilyCache(uid,selected);setData(null);setSelected("");}
        }
      } finally {
        if (scope.current === version) setLoading(false);
      }
    })();
    return () => {
      controller.abort();
      scope.current++;
    };
  }, [uid, token, selected, refresh, online]);
  useEffect(() => {
    cache(uid,'selectedFamily',selected);
    setEntry(emptyEntry());
    setBill(emptyBill());
    setInviteToken("");
    setNotice("");
  }, [selected]);
  useEffect(() => {
    let timer:ReturnType<typeof setTimeout>;
    const reload=()=>{clearTimeout(timer);if(navigator.onLine && !document.hidden)timer=setTimeout(()=>setRefresh(v=>v+1),750);};
    const connection=()=>{setOnline(navigator.onLine);reload();};
    const outbox=()=>{setOutboxVersion(v=>v+1);const saved=selected?cached<Snapshot|null>(uid,`family_${selected}`,null):null;if(saved)setData(overlay(saved));};
    window.addEventListener('happy-home-family-sync',reload);window.addEventListener('online',connection);window.addEventListener('offline',connection);window.addEventListener('happy-outbox',outbox);
    return()=>{clearTimeout(timer);window.removeEventListener('happy-home-family-sync',reload);window.removeEventListener('online',connection);window.removeEventListener('offline',connection);window.removeEventListener('happy-outbox',outbox);};
  },[uid,selected]);
  const act = async (work: () => Promise<void | string>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const message = await work();
      setRefresh((v) => v + 1);
      setNotice(message || tr("تم حفظ التغييرات", "Changes saved"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (data && data.role !== "owner") setInviteRole("editor");
  }, [data?.role]);
  const roleName = (r: Role) =>
    ({
      owner: tr("مالك", "Owner"),
      admin: tr("مدير", "Admin"),
      editor: tr("محرر", "Editor"),
      viewer: tr("مشاهد", "Viewer"),
    })[r];
  const manager = data?.role === "owner" || data?.role === "admin";
  const canEdit = (creator: string) =>
    manager || (data?.role === "editor" && creator === uid);
  const amount = (value: number) =>
    `${value.toLocaleString(isRTL ? "ar-SA-u-nu-latn" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${data?.currency || ""}`;
  const monthStart = (() => {
    const [y, m] = month.split("-").map(Number),
      day = Math.min(data?.cycleStart || 1, new Date(y, m, 0).getDate());
    return `${month}-${String(day).padStart(2, "0")}`;
  })();
  const monthEnd = (() => {
    const [y, m] = month.split("-").map(Number),
      next = new Date(y, m, 1),
      day = Math.min(data?.cycleStart || 1, new Date(y, m + 1, 0).getDate());
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  })();
  const visible =
    data?.transactions.filter(
      (t) => t.date >= monthStart && t.date < monthEnd,
    ) || [];
  const income =
    visible
      .filter((t) => t.type === "income")
      .reduce((n, t) => n + t.amountMinor, 0) / 100;
  const expense =
    visible
      .filter((t) => t.type === "expense")
      .reduce((n, t) => n + t.amountMinor, 0) / 100;
  const balance =
    (data?.transactions.reduce(
      (n, t) => n + (t.type === "income" ? t.amountMinor : -t.amountMinor),
      0,
    ) || 0) / 100;
  const auditNames: Record<string, string> = {
    family_created: tr("إنشاء العائلة", "Family created"),
    settings_updated: tr("تعديل الإعدادات", "Settings updated"),
    invitation_created: tr("إنشاء دعوة", "Invitation created"),
    invitation_accepted: tr("قبول دعوة", "Invitation accepted"),
    invitation_revoked: tr("إلغاء دعوة", "Invitation revoked"),
    member_role_updated: tr("تغيير صلاحية عضو", "Member role changed"),
    member_removed: tr("إزالة عضو", "Member removed"),
    member_left: tr("مغادرة عضو", "Member left"),
    ownership_transferred: tr("نقل الملكية", "Ownership transferred"),
    transactions_saved: tr("حفظ معاملة", "Transaction saved"),
    transactions_deleted: tr("حذف معاملة", "Transaction deleted"),
    bills_saved: tr("حفظ فاتورة متكررة", "Recurring bill saved"),
    bills_deleted: tr("حذف فاتورة متكررة", "Recurring bill deleted"),
    bundle_imported: tr("استيراد سجلات", "Records imported"),
  };
  return (
    <section className="family-workspace" aria-busy={busy || loading}>
      <div className="family-heading">
        <div>
          <h2>
            <Users size={22} />
            {tr("دفاتر العائلة", "Family ledgers")}
          </h2>
          <p>
            {tr(
              "المشاركة هنا فقط؛ دفتر كل عضو الشخصي يظل خاصًا به.",
              "Only these ledgers are shared. Each member’s personal ledger stays private.",
            )}
          </p>
        </div>
        <button
          type="button"
          disabled={busy || loading}
          onClick={() => setRefresh((v) => v + 1)}
          aria-label={tr("تحديث دفاتر العائلة", "Refresh family ledgers")}
        >
          <RefreshCw size={18} />
        </button>
      </div>
      {!online && <p role="status">بدون إنترنت — آخر نسخة محفوظة؛ تغييرات الصلاحيات تتأكد عند الاتصال.</p>}
      {pending.length>0 && <details className="family-panel"><summary>مسودات العائلة على هذا الجهاز ({pending.length})</summary>{pending.map(write=><div key={write.key}><p>{write.body.date} · {write.body.amount} · {write.body.note || write.body.category} · {write.error || 'بانتظار المزامنة'}</p><button type="button" onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(write.body,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='family-expense-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>تنزيل المسودة</button>{write.error && <button type="button" onClick={()=>{if(confirm('حذف هذه المسودة من الجهاز؟'))discardWrite(uid,write.key);}}>حذف المسودة</button>}</div>)}</details>}
      {error && (
        <p role="alert" className="family-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="family-notice">
          {notice}
        </p>
      )}
      {loading && (
        <p role="status">{tr("جاري تحميل الدفتر…", "Loading ledger…")}</p>
      )}
      <Field label={tr("اختر دفتر العائلة", "Choose a family ledger")}>
        <select
          value={selected}
          disabled={busy}
          onChange={(e) => {
            setData(null);
            setSelected(e.target.value);
          }}
        >
          <option value="">
            {tr(
              "إنشاء عائلة أو قبول دعوة",
              "Create a family or accept an invitation",
            )}
          </option>
          {families.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} — {roleName(f.role)}
            </option>
          ))}
        </select>
      </Field>
      {!selected && (
        <>
          <form
            className="family-panel"
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                const f = await api("", {
                  name: createName,
                  currency: createCurrency,
                });
                setCreateName("");
                setSelected(f.id);
              });
            }}
          >
            <h3>{tr("إنشاء عائلة", "Create a family")}</h3>
            <p>
              {tr(
                "يبدأ الدفتر فارغًا دون نقل سجلاتك الشخصية.",
                "The ledger starts empty. Your personal records stay where they are.",
              )}
            </p>
            <Field label={tr("اسم العائلة", "Family name")}>
              <input
                required
                maxLength={80}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </Field>
            <Field label={tr("العملة", "Currency")}>
              <select
                value={createCurrency}
                onChange={(e) => setCreateCurrency(e.target.value)}
              >
                <option value="ر.س">{tr("ريال سعودي", "Saudi riyal")}</option>
                <option value="ج.م">{tr("جنيه مصري", "Egyptian pound")}</option>
                <option value="$">{tr("دولار أمريكي", "US dollar")}</option>
                <option value="د.إ">{tr("درهم إماراتي", "UAE dirham")}</option>
              </select>
            </Field>
            <button className="family-primary" disabled={busy || loading}>
              <Plus size={16} />
              {tr("إنشاء العائلة", "Create family")}
            </button>
          </form>
          <form
            className="family-panel"
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                const f = await api("/accept", { token: acceptToken.trim() });
                setAcceptToken("");
                setSelected(f.id);
              });
            }}
          >
            <h3>{tr("قبول دعوة", "Accept invitation")}</h3>
            <p>
              {tr(
                "اطلب رمز الدعوة من المالك أو المدير. الرمز يعمل مع الحساب الذي دُعي فقط.",
                "Ask the owner or admin for an invitation code. It works only for the invited account.",
              )}
            </p>
            <Field label={tr("رمز الدعوة", "Invitation code")}>
              <input
                required
                autoComplete="off"
                maxLength={64}
                value={acceptToken}
                onChange={(e) => setAcceptToken(e.target.value)}
                dir="ltr"
              />
            </Field>
            <button className="family-primary" disabled={busy || loading}>
              {tr("قبول الدعوة", "Accept invitation")}
            </button>
          </form>
        </>
      )}
      {data && (
        <>
          <div className="home-balance family-summary">
            <h3>{data.name}</h3>
            <p>{tr("رصيد الدفتر بالكامل", "Full ledger balance")}</p>
            <strong>{amount(balance)}</strong>
            <p>
              {roleName(data.role)} ·{" "}
              {tr("لا يشمل الدفاتر الشخصية", "Personal ledgers are excluded")}
            </p>
          </div>
          <div className="family-panel">
            <Field label={tr("شهر الدورة المالية", "Financial cycle month")}>
              <input
                required
                type="month"
                value={month}
                onChange={(e) => {
                  if (e.target.value) setMonth(e.target.value);
                }}
              />
            </Field>
            <p>
              {monthStart} — {monthEnd}{" "}
              {tr("(حتى قبل هذا اليوم)", "(excluding this day)")}
            </p>
            <div className="family-totals">
              <div>
                {tr("الوارد", "Income")}
                <strong>{amount(income)}</strong>
              </div>
              <div>
                {tr("المصروف", "Expenses")}
                <strong>{amount(expense)}</strong>
              </div>
            </div>
          </div>
          <FamilyStatement rows={data.transactions} start={monthStart} end={monthEnd} name={data.name} currency={data.currency} />
          {data.role !== "viewer" && (
            <form
              className="family-panel"
              onSubmit={(e) => {
                e.preventDefault();
                void act(async () => {
                  const value=Number(entry.amount);
                  if(!Number.isFinite(value) || value<=0 || value>1e9 || !/^\d+(?:\.\d{1,2})?$/.test(entry.amount))throw Error('أدخل مبلغًا صحيحًا حتى منزلتين عشريتين');
                  if(entry.id) await api(`/${data.id}/transactions`,{...entry,amount:value});
                  else {
                    const payload={...entry,id:crypto.randomUUID(),amount:value};
                    enqueue(uid,{url:`/api/families/${data.id}/transactions`,body:payload,familyId:data.id});
                    setData(overlay(cached<Snapshot>(uid,`family_${data.id}`,data)));
                    if(navigator.onLine)void flushWrites(uid,token);
                  }
                  setEntry(emptyEntry());
                  return 'تم الحفظ على الجهاز؛ تتم المزامنة عند الاتصال';
                });
              }}
            >
              <h3>
                {entry.id
                  ? tr("تعديل المعاملة", "Edit transaction")
                  : tr("تسجيل معاملة مشتركة", "Record a shared transaction")}
              </h3>
              <div className="family-fields">
                <Field label={tr("نوع المعاملة", "Type")}>
                  <select
                    value={entry.type}
                    onChange={(e) =>
                      setEntry({
                        ...entry,
                        type: e.target.value as Entry["type"],
                      })
                    }
                  >
                    <option value="expense">{tr("مصروف", "Expense")}</option>
                    <option value="income">{tr("وارد", "Income")}</option>
                  </select>
                </Field>
                {entry.type === 'expense' && <BankMessageInput onApply={result => setEntry({ ...entry, amount: result.amount, note: result.merchant, date: result.date || entry.date })} />}
                <Field label={tr("المبلغ", "Amount")}>
                  <input
                    required
                    type="text"
                    lang="en"
                    dir="ltr"
                    inputMode="decimal"
                    pattern="[0-9]+([.][0-9]{1,2})?"
                    value={entry.amount}
                    onChange={(e) =>
                      setEntry({ ...entry, amount: normalizeNumericInput(e.target.value) })
                    }
                  />
                </Field>
                {entry.type === 'expense' && <ExpenseCategories uid={uid} token={token} familyId={data.id} value={entry.category} onChange={category=>setEntry({...entry,category})} />}
                <Field label={tr("التاريخ", "Date")}>
                  <input
                    required
                    type="date"
                    value={entry.date}
                    onChange={(e) =>
                      setEntry({ ...entry, date: e.target.value })
                    }
                  />
                </Field>
                <Field
                  label={
                    entry.type === "expense"
                      ? tr("التصنيف", "Category")
                      : tr("مصدر الوارد", "Income source")
                  }
                >
                  <input
                    maxLength={128}
                    value={
                      entry.type === "expense" ? entry.category : entry.source
                    }
                    onChange={(e) =>
                      setEntry({
                        ...entry,
                        [entry.type === "expense" ? "category" : "source"]:
                          e.target.value,
                      })
                    }
                  />
                </Field>
              </div>
              <Field label={tr("ملاحظة", "Note")}>
                <textarea
                  maxLength={4000}
                  value={entry.note}
                  onChange={(e) => setEntry({ ...entry, note: e.target.value })}
                />
              </Field>
              <div className="family-actions">
                <button className="family-primary" disabled={busy}>
                  {tr("حفظ المعاملة", "Save transaction")}
                </button>
                {entry.id && (
                  <button type="button" onClick={() => setEntry(emptyEntry())}>
                    {tr("إلغاء التعديل", "Cancel edit")}
                  </button>
                )}
              </div>
            </form>
          )}
          <div className="family-panel">
            <h3>{tr("معاملات الدورة", "Cycle transactions")}</h3>
            {!visible.length && (
              <p>
                {tr(
                  "لا توجد معاملات في هذه الدورة. اختر دورة أخرى أو سجّل أول معاملة.",
                  "No transactions in this cycle. Choose another cycle or record your first transaction.",
                )}
              </p>
            )}
            {visible
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((t) => (
                <article className="family-record" key={t.id}>
                  <div>
                    <strong>{amount(t.amount)}</strong>
                    <span>
                      {t.type === "income"
                        ? tr("وارد", "Income")
                        : tr("مصروف", "Expense")}{" "}
                      · {t.category || t.source}
                    </span>
                    <span>
                      {t.date} · {t.creatorName}
                    </span>
                    {t.note && <p>{t.note}</p>}
                  </div>
                  {t.pending && <span>بانتظار المزامنة</span>}
                  {!t.pending && online && canEdit(t.createdBy) && (
                    <div className="family-actions">
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={tr("تعديل المعاملة", "Edit transaction")}
                        onClick={() =>
                          setEntry({
                            id: t.id,
                            type: t.type,
                            amount: String(t.amount),
                            date: t.date,
                            category: t.category || "",
                            source: t.source || "",
                            note: t.note,
                          })
                        }
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={tr("حذف المعاملة", "Delete transaction")}
                        onClick={() => {
                          if (
                            confirm(
                              tr(
                                "حذف هذه المعاملة المشتركة؟",
                                "Delete this shared transaction?",
                              ),
                            )
                          )
                            void act(async () => {
                              await api(
                                `/${data.id}/transactions/${encodeURIComponent(t.id)}`,
                                undefined,
                                "DELETE",
                              );
                              if (entry.id === t.id) setEntry(emptyEntry());
                            });
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </article>
              ))}
          </div>
          <details className="family-panel">
            <summary>
              {tr("الفواتير المتكررة", "Recurring bills")} (
              {data.recurring_bills.length})
            </summary>
            {data.role !== "viewer" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(async () => {
                    await api(`/${data.id}/bills`, {
                      ...bill,
                      id: bill.id || crypto.randomUUID(),
                      amount: Number(bill.amount),
                    });
                    setBill(emptyBill());
                  });
                }}
              >
                <Field label={tr("اسم الفاتورة", "Bill title")}>
                  <input
                    required
                    maxLength={256}
                    value={bill.title}
                    onChange={(e) =>
                      setBill({ ...bill, title: e.target.value })
                    }
                  />
                </Field>
                <div className="family-fields">
                  <Field label={tr("المبلغ", "Amount")}>
                    <input
                      required
                      type="text"
                      lang="en"
                      dir="ltr"
                      inputMode="decimal"
                      pattern="[0-9]+([.][0-9]{1,2})?"
                      value={bill.amount}
                      onChange={(e) =>
                        setBill({ ...bill, amount: normalizeNumericInput(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label={tr("يوم الاستحقاق", "Due day")}>
                    <input
                      required
                      type="text"
                      lang="en"
                      dir="ltr"
                      inputMode="numeric"
                      pattern="[0-9]{1,2}"
                      min={1}
                      max={31}
                      value={bill.dayOfMonth}
                      onChange={(e) =>
                        setBill({ ...bill, dayOfMonth: Number(normalizeNumericInput(e.target.value)) })
                      }
                    />
                  </Field>
                </div>
                <Field label={tr("التصنيف", "Category")}>
                  <input
                    required
                    maxLength={128}
                    value={bill.category}
                    onChange={(e) =>
                      setBill({ ...bill, category: e.target.value })
                    }
                  />
                </Field>
                <div className="family-actions">
                  <button disabled={busy} className="family-primary">
                    {tr("حفظ الفاتورة", "Save bill")}
                  </button>
                  {bill.id && (
                    <button type="button" onClick={() => setBill(emptyBill())}>
                      {tr("إلغاء التعديل", "Cancel edit")}
                    </button>
                  )}
                </div>
              </form>
            )}
            {data.recurring_bills.map((b) => (
              <article className="family-record" key={b.id}>
                <div>
                  <strong>
                    {b.title} — {amount(b.amount)}
                  </strong>
                  <span>
                    {tr("يوم", "Day")} {b.dayOfMonth} · {b.creatorName}
                  </span>
                </div>
                {canEdit(b.createdBy) && (
                  <div className="family-actions">
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={tr("تعديل الفاتورة", "Edit bill")}
                      onClick={() =>
                        setBill({
                          id: b.id,
                          title: b.title,
                          amount: String(b.amount),
                          category: b.category,
                          dayOfMonth: b.dayOfMonth,
                        })
                      }
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={tr("حذف الفاتورة", "Delete bill")}
                      onClick={() => {
                        if (
                          confirm(
                            tr(
                              "حذف الفاتورة المتكررة؟",
                              "Delete this recurring bill?",
                            ),
                          )
                        )
                          void act(async () => {
                            await api(
                              `/${data.id}/bills/${encodeURIComponent(b.id)}`,
                              undefined,
                              "DELETE",
                            );
                            if (bill.id === b.id) setBill(emptyBill());
                          });
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </article>
            ))}
            <p>
              {tr(
                "الفواتير تذكيرات فقط؛ سجّل دفعها كمعاملة مصروف عند السداد.",
                "Bills are reminders. Record an expense when you pay one.",
              )}
            </p>
          </details>
          <details className="family-panel">
            <summary>
              {tr("أعضاء العائلة والصلاحيات", "Family members and permissions")}
            </summary>
            <p>
              {tr(
                "المدير يدير الدفتر والأعضاء؛ المحرر يضيف ويعدّل سجلاته فقط؛ المشاهد يقرأ ويصدّر. الدفاتر الشخصية لا تظهر لأي دور.",
                "Admins manage this ledger and members. Editors add and edit their own records. Viewers read and export. No role can access personal ledgers.",
              )}
            </p>
            {data.members.map((m) => (
              <div className="family-record" key={m.uid}>
                <div>
                  <strong>
                    {m.name}
                    {m.uid === uid ? tr(" (أنت)", " (you)") : ""}
                  </strong>
                  <span>{roleName(m.role)}</span>
                </div>
                {manager &&
                  m.role !== "owner" &&
                  (data.role === "owner" || m.role !== "admin") && (
                    <div className="family-actions">
                      <select
                        aria-label={`${tr("صلاحية", "Role for")} ${m.name}`}
                        disabled={busy}
                        value={m.role}
                        onChange={(e) => {
                          const role = e.target.value;
                          void act(async () => {
                            await api(
                              `/${data.id}/members/${encodeURIComponent(m.uid)}`,
                              { role },
                            );
                          });
                        }}
                      >
                        {data.role === "owner" && (
                          <option value="admin">{roleName("admin")}</option>
                        )}
                        <option value="editor">{roleName("editor")}</option>
                        <option value="viewer">{roleName("viewer")}</option>
                      </select>
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`${tr("إزالة", "Remove")} ${m.name}`}
                        onClick={() => {
                          if (
                            confirm(
                              tr(
                                "إزالة العضو مع الاحتفاظ بسجلاته في الدفتر؟",
                                "Remove this member and retain their ledger records?",
                              ),
                            )
                          )
                            void act(async () => {
                              await api(
                                `/${data.id}/members/${encodeURIComponent(m.uid)}`,
                                undefined,
                                "DELETE",
                              );
                            });
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                {data.role === "owner" && m.uid !== uid && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        confirm(
                          tr(
                            `نقل ملكية العائلة إلى ${m.name}؟ ستصبح مديرًا.`,
                            `Transfer ownership to ${m.name}? You will become an admin.`,
                          ),
                        )
                      )
                        void act(async () => {
                          await api(`/${data.id}/transfer`, { uid: m.uid });
                        });
                    }}
                  >
                    {tr("نقل الملكية", "Transfer ownership")}
                  </button>
                )}
              </div>
            ))}
            {data.role !== "owner" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (
                    confirm(
                      tr(
                        "مغادرة العائلة؟ ستظل سجلاتك في دفتر العائلة.",
                        "Leave this family? Your shared records will remain.",
                      ),
                    )
                  )
                    void act(async () => {
                      await api(
                        `/${data.id}/members/${encodeURIComponent(uid)}`,
                        undefined,
                        "DELETE",
                      );
                      setSelected("");
                    });
                }}
              >
                {tr("مغادرة العائلة", "Leave family")}
              </button>
            )}
            {manager && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(async () => {
                    const result = await api(`/${data.id}/invitations`, {
                      email: inviteEmail,
                      role: inviteRole,
                    });
                    setInviteToken(result.token);
                    setInviteEmail("");
                  });
                }}
              >
                <h3>{tr("دعوة عضو", "Invite a member")}</h3>
                <Field
                  label={tr(
                    "بريد حساب العضو المسجل",
                    "Registered member’s email",
                  )}
                >
                  <input
                    required
                    type="email"
                    maxLength={254}
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    dir="ltr"
                  />
                </Field>
                <Field label={tr("الصلاحية", "Permission")}>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as Role)}
                  >
                    {data.role === "owner" && (
                      <option value="admin">{roleName("admin")}</option>
                    )}
                    <option value="editor">{roleName("editor")}</option>
                    <option value="viewer">{roleName("viewer")}</option>
                  </select>
                </Field>
                <button className="family-primary" disabled={busy}>
                  {tr("إنشاء رمز الدعوة", "Create invitation code")}
                </button>
              </form>
            )}
            {inviteToken && manager && (
              <div className="family-invite">
                <p>
                  {tr(
                    "شارك الرمز مع العضو المقصود فقط. ينتهي خلال 7 أيام.",
                    "Share this code only with the invited member. It expires in 7 days.",
                  )}
                </p>
                <code dir="ltr">{inviteToken}</code>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(inviteToken)
                      .then(() =>
                        setNotice(
                          tr("تم نسخ رمز الدعوة", "Invitation code copied"),
                        ),
                      )
                      .catch(() =>
                        setError(
                          tr(
                            "تعذر النسخ؛ حدد الرمز وانسخه يدويًا",
                            "Select and copy the code manually.",
                          ),
                        ),
                      );
                  }}
                >
                  <Copy size={16} />
                  {tr("نسخ رمز الدعوة", "Copy invitation code")}
                </button>
              </div>
            )}
            {manager &&
              data.invitations.map((i) => (
                <div className="family-record" key={i.id}>
                  <span>
                    {i.name} — {roleName(i.role)}
                  </span>
                  <button
                    type="button"
                    disabled={
                      busy || (i.role === "admin" && data.role !== "owner")
                    }
                    onClick={() =>
                      void act(async () => {
                        await api(
                          `/${data.id}/invitations/${i.id}`,
                          undefined,
                          "DELETE",
                        );
                        setInviteToken("");
                      })
                    }
                  >
                    {tr("إلغاء الدعوة", "Revoke invitation")}
                  </button>
                </div>
              ))}
          </details>
          {manager && (
            <details className="family-panel">
              <summary>
                {tr("إعدادات دفتر العائلة", "Family ledger settings")}
              </summary>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const values = new FormData(e.currentTarget);
                  void act(async () => {
                    await api(`/${data.id}/settings`, {
                      name: values.get("name"),
                      currency: values.get("currency"),
                      cycleStart: Number(values.get("cycleStart")),
                    });
                  });
                }}
              >
                <Field label={tr("اسم العائلة", "Family name")}>
                  <input
                    name="name"
                    required
                    maxLength={80}
                    defaultValue={data.name}
                  />
                </Field>
                <Field label={tr("العملة", "Currency")}>
                  <input
                    name="currency"
                    required
                    maxLength={16}
                    defaultValue={data.currency}
                  />
                </Field>
                <p>
                  {tr(
                    "لا يمكن تغيير العملة بعد إضافة سجلات.",
                    "Currency cannot change after records are added.",
                  )}
                </p>
                <Field label={tr("يوم بداية الدورة", "Cycle start day")}>
                  <input
                    name="cycleStart"
                    required
                    type="text"
                    lang="en"
                    dir="ltr"
                    inputMode="numeric"
                    pattern="[0-9]{1,2}"
                    onInput={e => { e.currentTarget.value = normalizeNumericInput(e.currentTarget.value); }}
                    min={1}
                    max={31}
                    defaultValue={data.cycleStart}
                  />
                </Field>
                <button className="family-primary" disabled={busy}>
                  {tr("حفظ الإعدادات", "Save settings")}
                </button>
              </form>
            </details>
          )}
          <div className="family-panel">
            <h3>{tr("نسخة من الدفتر", "Ledger backup")}</h3>
            <p>
              {tr(
                "ملف JSON مقروء يشمل الدفتر المشترك فقط. احفظه في مكان خاص. الاستيراد يدمج حسب المعرف دون حذف سجلات أخرى.",
                "The readable JSON file contains only this shared ledger. Keep it private. Import merges matching IDs without deleting other records.",
              )}
            </p>
            <div className="family-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    const bundle = navigator.onLine ? await api(`/${data.id}/export`) : {format:'happy-home-family-v1',exportedAt:new Date().toISOString(),offline:true,family:{name:data.name,currency:data.currency,cycleStart:data.cycleStart},transactions:data.transactions,recurring_bills:data.recurring_bills,categories:cached(uid,`categories_${data.id}`,[])};
                    const url = URL.createObjectURL(
                      new Blob([JSON.stringify(bundle, null, 2)], {
                        type: "application/json",
                      }),
                    );
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `family-${data.id}.json`;
                    link.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                    return tr("تم تصدير الدفتر", "Ledger exported");
                  })
                }
              >
                <Download size={16} />
                {tr("تصدير الدفتر", "Export ledger")}
              </button>
              {manager && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => upload.current?.click()}
                  >
                    <Upload size={16} />
                    {tr("استيراد سجلات", "Import records")}
                  </button>
                  <input
                    ref={upload}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    aria-label={tr("ملف الاستيراد", "Import file")}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      void act(async () => {
                        if (file.size > 2 * 1024 * 1024)
                          throw new Error(
                            tr(
                              "حجم الملف يجب ألا يتجاوز 2 ميجابايت",
                              "File must be 2 MB or smaller",
                            ),
                          );
                        const bundle = JSON.parse(await file.text());
                        if (
                          !confirm(
                            tr(
                              "دمج السجلات مع هذا الدفتر؟ المعرفات المطابقة ستُحدّث.",
                              "Merge records into this ledger? Matching IDs will be updated.",
                            ),
                          )
                        )
                          return tr("تم إلغاء الاستيراد", "Import cancelled");
                        await api(`/${data.id}/import`, {
                          ...bundle,
                          mode: "merge",
                        });
                      });
                    }}
                  />
                </>
              )}
            </div>
          </div>
          {manager && (
            <details className="family-panel">
              <summary>{tr("سجل النشاط", "Activity log")}</summary>
              {data.audit.map((a, i) => (
                <div key={i} className="family-record">
                  <span>
                    {a.actorName} — {auditNames[a.action] || a.action}
                  </span>
                  <time>
                    {new Date(a.createdAt).toLocaleString(
                      isRTL ? "ar-SA-u-nu-latn" : "en-US",
                      { calendar: "gregory" },
                    )}
                  </time>
                </div>
              ))}
            </details>
          )}
        </>
      )}
    </section>
  );
}
