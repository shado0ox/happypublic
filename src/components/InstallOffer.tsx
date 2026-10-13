import { useEffect, useRef, useState } from "react";
import {
  Share,
  PlusSquare,
  MoreVertical,
  Check,
  Download,
  X,
} from "lucide-react";
import {
  installPlatform,
  storeLink,
  InstallPlatform,
} from "../utils/installOffer";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
function StepPicture({ kind }: { kind: "share" | "menu" | "add" | "confirm" }) {
  const Icon =
    kind === "share"
      ? Share
      : kind === "menu"
        ? MoreVertical
        : kind === "add"
          ? PlusSquare
          : Check;
  return (
    <div className="install-mini" aria-hidden="true">
      <div className="install-mini-screen">
        <span />
        <span />
        <div className="install-mini-target">
          <Icon size={19} />
        </div>
      </div>
      <div className="install-mini-bottom" />
    </div>
  );
}
export default function InstallOffer() {
  const device = installPlatform(
    navigator.userAgent,
    navigator.platform,
    navigator.maxTouchPoints,
  );
  const [platform, setPlatform] = useState<InstallPlatform>(device);
  const nativeStore = storeLink(
    device,
    import.meta.env.VITE_APP_STORE_URL,
    import.meta.env.VITE_PLAY_STORE_URL,
  );
  const dismissKey = `happy_install_offer_v1_${nativeStore || "web"}`;
  const standalone = () =>
    Boolean(
      (navigator as any).standalone ||
      matchMedia("(display-mode: standalone)").matches ||
      matchMedia("(display-mode: fullscreen)").matches,
    );
  const [hidden, setHidden] = useState(() => {
    try {
      return standalone() || localStorage.getItem(dismissKey) === "true";
    } catch {
      return standalone();
    }
  });
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null),
    [installing, setInstalling] = useState(false),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    get = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const installed = () => {
      setHidden(true);
      try {
        localStorage.setItem(dismissKey, "true");
      } catch {}
      dialog.current?.close();
    };
    const offer = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    const display = matchMedia("(display-mode: standalone)");
    const changed = () => {
      if (standalone()) installed();
    };
    window.addEventListener("beforeinstallprompt", offer);
    window.addEventListener("appinstalled", installed);
    display.addEventListener("change", changed);
    return () => {
      window.removeEventListener("beforeinstallprompt", offer);
      window.removeEventListener("appinstalled", installed);
      display.removeEventListener("change", changed);
    };
  }, []);
  const close = () => {
    dialog.current?.close();
    get.current?.focus();
  };
  if (hidden) return null;
  const steps =
    platform === "ios"
      ? [
          ["share", "اضغط مشاركة", "افتح الموقع في Safari ثم زر المشاركة."],
          ["add", "أضف للشاشة الرئيسية", "اختر «إضافة إلى الشاشة الرئيسية»."],
          ["confirm", "اضغط إضافة", "فعّل «فتح كتطبيق ويب» إن ظهر، ثم أضف."],
        ]
      : platform === "android"
        ? [
            ["menu", "افتح القائمة", "في Chrome اضغط القائمة ⋮."],
            [
              "add",
              "اختر التثبيت",
              "اختر «تثبيت التطبيق» أو «إضافة للشاشة الرئيسية».",
            ],
            [
              "confirm",
              "أكّد الإضافة",
              "اضغط تثبيت أو إضافة، ثم افتحه من الأيقونة.",
            ],
          ]
        : [
            ["menu", "افتح الموقع", "استخدم Chrome أو Edge."],
            [
              "add",
              "اختر تثبيت",
              "اضغط رمز التثبيت في شريط العنوان أو قائمة المتصفح.",
            ],
            ["confirm", "أكّد التثبيت", "افتح Happy Home من قائمة التطبيقات."],
          ];
  return (
    <>
      <aside
        className="install-offer"
        dir="rtl"
        aria-label="الحصول على تطبيق Happy Home"
      >
        <button
          className="install-offer-dismiss"
          type="button"
          aria-label="إخفاء اقتراح التطبيق"
          onClick={() => {
            setHidden(true);
            try {
              localStorage.setItem(dismissKey, "true");
            } catch {}
          }}
        >
          <X size={16} />
        </button>
        <img src="/favicon.png" width="38" height="38" alt="" />
        <div className="install-offer-copy">
          <strong>Happy Home</strong>
          <span>
            {nativeStore
              ? "احصل على التطبيق من المتجر"
              : "احصل على التطبيق على هاتفك"}
          </span>
        </div>
        <button
          ref={get}
          type="button"
          className="install-get"
          onClick={() => {
            if (nativeStore) {
              window.open(nativeStore, "_blank", "noopener,noreferrer");
              return;
            }
            setError("");
            dialog.current?.showModal();
          }}
        >
          Get
        </button>
      </aside>
      <dialog
        ref={dialog}
        className="install-guide"
        dir="rtl"
        aria-labelledby="install-guide-title"
        onCancel={close}
        onClick={(event) => {
          if (event.target === dialog.current) {
            const rect = dialog.current.getBoundingClientRect();
            if (
              event.clientX < rect.left ||
              event.clientX > rect.right ||
              event.clientY < rect.top ||
              event.clientY > rect.bottom
            )
              close();
          }
        }}
      >
        <div className="install-guide-head">
          <div>
            <span>على شاشتك الرئيسية</span>
            <h2 id="install-guide-title">أضف Happy Home</h2>
          </div>
          <button
            type="button"
            autoFocus
            aria-label="إغلاق طريقة التثبيت"
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        <p className="install-guide-intro">
          افتحه كالتطبيق، بدون كتابة الرابط كل مرة.
        </p>
        <div className="install-platforms" role="group" aria-label="نوع الجهاز">
          {(
            [
              ["ios", "iPhone / iPad"],
              ["android", "Android"],
              ["desktop", "كمبيوتر"],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={platform === value}
              onClick={() => setPlatform(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <ol className="install-steps">
          {steps.map(([kind, title, detail], index) => (
            <li key={kind}>
              <StepPicture kind={kind as any} />
              <div>
                <span className="install-step-number">{index + 1}</span>
                <strong>{title}</strong>
                <p>{detail}</p>
              </div>
            </li>
          ))}
        </ol>
        {installEvent && platform !== "ios" && (
          <button
            className="install-direct"
            type="button"
            disabled={installing}
            onClick={async () => {
              setInstalling(true);
              setError("");
              try {
                await installEvent.prompt();
                const choice = await installEvent.userChoice;
                setInstallEvent(null);
                if (choice.outcome === "accepted") {
                  setHidden(true);
                  close();
                }
              } catch {
                setError("استخدم الخطوات الموضحة للتثبيت من قائمة المتصفح.");
                setInstallEvent(null);
              } finally {
                setInstalling(false);
              }
            }}
          >
            <Download size={16} />
            {installing ? "جارٍ فتح نافذة التثبيت…" : "تثبيت الآن"}
          </button>
        )}
        {error && <p role="alert">{error}</p>}
        <details className="install-guide-foot">
          <summary>الرابط داخل تطبيق آخر؟</summary>
          <p>
            افتح الرابط في Safari أو Chrome أولًا. الرسوم توضيحية؛ قد تختلف
            أسماء الخيارات حسب المتصفح.
          </p>
        </details>
      </dialog>
    </>
  );
}
