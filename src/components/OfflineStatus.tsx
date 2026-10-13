import { personalOps, discardPersonalOp } from "../utils/personalQueue";
import { useEffect, useState, useRef } from "react";
import { flushWrites, writes, discardWrite } from "../utils/offlineStore";
export default function OfflineStatus({
  uid,
  token,
  blocked,
}: {
  uid?: string;
  token?: string;
  blocked: boolean;
}) {
  const [online, setOnline] = useState(navigator.onLine),
    [count, setCount] = useState(0),
    [waiting, setWaiting] = useState<ServiceWorkerRegistration | null>(null);
  const requestedRef = useRef(false),
    blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  useEffect(() => {
    let cancelled = false,
      last = 0;
    let reg: ServiceWorkerRegistration | undefined;
    const check = async () => {
      if (!navigator.onLine || document.hidden || Date.now() - last < 60000)
        return;
      last = Date.now();
      try {
        reg = await navigator.serviceWorker.register("/sw.js", {
          updateViaCache: "none",
        });
        reg.onupdatefound = () => {
          const worker = reg?.installing;
          if (worker)
            worker.onstatechange = () => {
              if (!cancelled && reg?.waiting) setWaiting(reg);
            };
        };
        await reg.update();
        if (reg.waiting && !cancelled) setWaiting(reg);
      } catch {
        /* Online-only fallback if storage/SW is unavailable. */
      }
    };
    const refresh = () => {
      setOnline(navigator.onLine);
      if (uid) {
        setCount(writes(uid).length + personalOps(uid).length);
        if (token && navigator.onLine && !document.hidden)
          void flushWrites(uid, token);
      }
      void check();
    };
    const control = () => {
      if (requestedRef.current && !blockedRef.current) location.reload();
    };
    if (
      import.meta.env.PROD &&
      "serviceWorker" in navigator &&
      window.isSecureContext
    ) {
      void check();
      navigator.serviceWorker.addEventListener("controllerchange", control);
    }
    const interval = setInterval(refresh, 300000);
    for (const event of [
      "online",
      "offline",
      "focus",
      "happy-outbox",
      "happy-personal-outbox",
      "happy-force-sync",
    ])
      window.addEventListener(event, refresh);
    document.addEventListener("visibilitychange", refresh);
    refresh();
    return () => {
      cancelled = true;
      clearInterval(interval);
      for (const event of [
        "online",
        "offline",
        "focus",
        "happy-outbox",
        "happy-personal-outbox",
        "happy-force-sync",
      ])
        window.removeEventListener(event, refresh);
      document.removeEventListener("visibilitychange", refresh);
      if ("serviceWorker" in navigator)
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          control,
        );
    };
  }, [uid, token]);
  return (
    <div
      className="break-words text-xs px-3 py-2 bg-[#e0f5f2] text-[#085c4f] flex flex-wrap justify-between gap-2"
      role="status"
    >
      <span>
        {online ? "الشبكة متاحة" : "بدون إنترنت — الحفظ على هذا الجهاز"}
        {count ? ` · ${count} عملية بانتظار المزامنة أو المراجعة` : ""}
      </span>
      {uid && count > 0 && online && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("happy-force-sync"))}
        >
          مزامنة الآن
        </button>
      )}
      {uid && count > 0 && (
        <details className="w-full">
          <summary className="cursor-pointer">
            العمليات المحفوظة على الجهاز
          </summary>
          {[
            ...writes(uid),
            ...personalOps(uid).map((op) => ({
              ...op,
              key: "personal_" + op.type + "_" + op.id,
              body: op.payload,
            })),
          ].map((write) => (
            <div key={write.key} className="py-2">
              <span>
                {write.body?.amount ||
                  write.body?.name ||
                  write.body?.title ||
                  write.key}{" "}
                · {write.error || "بانتظار المزامنة"}
              </span>
              <button
                type="button"
                className="px-3"
                onClick={() => {
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(write, null, 2)], {
                      type: "application/json",
                    }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "offline-draft.json";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                تنزيل
              </button>
              {write.error && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("حذف المسودة المحلية؟")) {
                      if (write.key.startsWith("personal_"))
                        discardPersonalOp(uid, write as any);
                      else discardWrite(uid, write.key);
                    }
                  }}
                >
                  حذف المسودة
                </button>
              )}
            </div>
          ))}
        </details>
      )}
      {waiting && (
        <button
          type="button"
          disabled={blocked || count > 0}
          onClick={() => {
            if (!confirm("تحديث البرنامج؟ تأكد من حفظ بياناتك أولًا.")) return;
            requestedRef.current = true;
            if (waiting.waiting)
              waiting.waiting.postMessage({ type: "APPLY_UPDATE" });
            else if (!blockedRef.current) location.reload();
          }}
        >
          نسخة جديدة — تحديث بعد حفظ التعديلات
        </button>
      )}
    </div>
  );
}
