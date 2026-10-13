export type QueuedWrite = {
  key: string;
  url: string;
  body: any;
  familyId?: string;
  error?: string;
};
export function cached<T>(uid: string, name: string, fallback: T): T {
  try {
    return (
      JSON.parse(localStorage.getItem(`happy_${uid.length}_${uid}_${name}`) || "null") ??
      fallback
    );
  } catch {
    return fallback;
  }
}
export function cache(uid: string, name: string, value: unknown) {
  // A failed local write must reach the caller before a form is cleared.
  localStorage.setItem(`happy_${uid.length}_${uid}_${name}`, JSON.stringify(value));
}
export function writes(uid: string): QueuedWrite[] {
  const prefix = `happy_${uid.length}_${uid}_write_`;
  return Object.keys(localStorage)
    .filter((key) => key.startsWith(prefix))
    .map((key) => {
      try {
        return JSON.parse(localStorage.getItem(key)!);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}
const writeKey = (uid: string, key: string) => `happy_${uid.length}_${uid}_write_${key}`;
export function discardWrite(uid: string, key: string) {
  localStorage.removeItem(writeKey(uid, key));
  window.dispatchEvent(new Event("happy-outbox"));
}
export function enqueue(uid: string, write: Omit<QueuedWrite, "key">) {
  const key = crypto.randomUUID();
  localStorage.setItem(writeKey(uid, key), JSON.stringify({ ...write, key }));
  window.dispatchEvent(new Event("happy-outbox"));
  return key;
}
const flights = new Map<string, Promise<void>>();
export async function flushWrites(uid: string, token: string) {
  if (!navigator.onLine) return;
  if (flights.has(uid)) return flights.get(uid);
  const run = async () => {
    for (const write of writes(uid)
      .filter((item) => !item.error)
      .slice(0, 50)) {
      if (!navigator.onLine) break;
      try {
        const response = await fetch(write.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-uid": uid,
            "x-auth-token": token,
          },
          body: JSON.stringify(write.body),
          signal: AbortSignal.timeout(10000),
        });
        if (response.status === 401) {
          window.dispatchEvent(
            new CustomEvent("happy-session-expired", { detail: { uid, token } }),
          );
          break;
        }
        if (response.ok) localStorage.removeItem(writeKey(uid, write.key));
        else if ([400, 403, 404, 409].includes(response.status)) {
          const result = await response.json().catch(() => ({}));
          localStorage.setItem(
            writeKey(uid, write.key),
            JSON.stringify({
              ...write,
              error: result.error || "لم يقبل السيرفر هذه المسودة",
            }),
          );
        } else break;
        window.dispatchEvent(new Event("happy-outbox"));
      } catch {
        break;
      }
    }
    window.dispatchEvent(new Event("happy-home-family-sync"));
  };
  const task = (
    navigator.locks
      ? navigator.locks.request(`happy-outbox-${uid}`, run)
      : run()
  ).finally(() => flights.delete(uid));
  flights.set(uid, task);
  return task;
}
export function clearFamilyCache(uid: string, familyId: string) {
  localStorage.removeItem(`happy_${uid.length}_${uid}_family_${familyId}`);
}
export function mergePending<T extends { id: string }>(
  rows: T[],
  pending: { type: string; id: string; payload: any }[],
  kind: "TX" | "BILL",
): T[] {
  const rejected = new Set(
    pending
      .filter((op) => (op as any).error && op.type === `POST_${kind}`)
      .map((op) => op.id),
  );
  const result = new Map(
    rows.filter((row) => !rejected.has(row.id)).map((row) => [row.id, row]),
  );
  for (const op of pending) {
    if ((op as any).error) continue;
    if (op.type === `POST_${kind}`) result.set(op.id, op.payload);
    if (op.type === `DELETE_${kind}`) result.delete(op.id);
  }
  return [...result.values()];
}
