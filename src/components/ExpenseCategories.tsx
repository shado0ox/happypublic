import { useEffect, useState } from "react";
import {
  cached,
  cache,
  enqueue,
  flushWrites,
  writes,
} from "../utils/offlineStore";
import { CAT_EMOJIS } from "../translations";
const names: Record<string, string> = {
  food: "طعام وشراب",
  transport: "مواصلات",
  utilities: "كهرباء ومياه",
  education: "تعليم",
  health: "صحة وطب",
  clothing: "ملابس",
  maintenance: "صيانة المنزل",
  entertainment: "ترفيه",
  other: "أخرى",
};
export default function ExpenseCategories({
  uid,
  token,
  familyId,
  value,
  onChange,
}: {
  uid: string;
  token: string;
  familyId?: string;
  value: string;
  onChange: (name: string) => void;
}) {
  const key = "categories_" + (familyId || "personal"),
    url = familyId ? `/api/families/${familyId}/categories` : "/api/categories";
  const [custom, setCustom] = useState<string[]>(() => cached(uid, key, [])),
    [name, setName] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false,
      active = false,
      timer: ReturnType<typeof setTimeout>;
    setCustom(cached(uid, key, []));
    const refresh = async () => {
      if (!navigator.onLine || document.hidden || active) return;
      active = true;
      try {
        const response = await fetch(url, {
          headers: { "x-user-uid": uid, "x-auth-token": token },
          signal: AbortSignal.timeout(10000),
        });
        if (response.status === 403 || response.status === 404) {
          cache(uid, key, []);
          if (!cancelled) setCustom([]);
          return;
        }
        if (!response.ok) return;
        const result = await response.json();
        const unsent = writes(uid)
          .filter((write) => write.url === url && !write.error)
          .map((write) => write.body.name);
        const merged = [...new Set<string>([...result, ...unsent])];
        cache(uid, key, merged);
        if (!cancelled) setCustom(merged);
      } catch {
      } finally {
        active = false;
      }
    };
    const changed = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void refresh();
      }, 750);
    };
    void refresh();
    window.addEventListener("happy-categories-sync", changed);
    window.addEventListener("online", changed);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("happy-categories-sync", changed);
      window.removeEventListener("online", changed);
    };
  }, [uid, token, familyId]);
  return (
    <div className="space-y-2 col-span-full">
      <label className="block text-xs font-bold">تصنيف المصروف</label>
      <div className="flex flex-wrap gap-2">
        {[...Object.keys(names), ...custom].map((category) => (
          <button
            type="button"
            key={category}
            aria-pressed={value === category}
            onClick={() => onChange(category)}
            className={`max-w-full break-all px-3 py-2 rounded-lg border text-xs ${value === category ? "bg-[#e0f5f2] border-[#0a7c6b]" : "bg-white border-[#ddd0b8]"}`}
          >
            {CAT_EMOJIS[category] || "📦"} {names[category] || category}
          </button>
        ))}
      </div>
      <details>
        <summary className="text-xs cursor-pointer py-2">
          إضافة تصنيف جديد
        </summary>
        <div className="flex gap-2">
          <input
            aria-label="اسم التصنيف الجديد"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded-lg p-2 min-w-0 flex-1"
          />
          <button
            type="button"
            className="px-3 py-2 border rounded-lg"
            disabled={!name.trim()}
            onClick={() => {
              try {
                const label = name.trim();
                if (custom.includes(label)) {
                  onChange(label);
                  setName("");
                  return;
                }
                if (custom.length >= 100) throw Error("الحد الأقصى 100 تصنيف");
                enqueue(uid, { url, body: { name: label }, familyId });
                const next = [...custom, label];
                cache(uid, key, next);
                setCustom(next);
                onChange(label);
                setName("");
                setError("");
                if (navigator.onLine) void flushWrites(uid, token);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            إضافة
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
      </details>
    </div>
  );
}
