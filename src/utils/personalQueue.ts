export type PersonalOp = {
  type: string;
  id: string;
  payload: any;
  version?: string;
  error?: string;
  createdAt?: number;
};
const prefix = (uid: string) => `albait_op_${uid.length}_${uid}_`;
const key = (uid: string, op: PersonalOp) =>
  prefix(uid) + encodeURIComponent(op.type + "_" + op.id);
export function personalOps(uid: string): PersonalOp[] {
  const legacy = localStorage.getItem(`albait_pending_${uid}`);
  let unmigrated: PersonalOp[] = [];
  if (legacy) {
    try {
      const operations: PersonalOp[] = JSON.parse(legacy);
      unmigrated = operations;
      for (const op of operations) {
        const slot = key(uid, op);
        if (!localStorage.getItem(slot))
          localStorage.setItem(
            slot,
            JSON.stringify({
              ...op,
              version: crypto.randomUUID(),
              createdAt: Date.now(),
            }),
          );
      }
      localStorage.removeItem(`albait_pending_${uid}`);
      unmigrated = [];
    } catch {
      /* Return legacy drafts too if quota prevents migration. */
    }
  }
  const stored: PersonalOp[] = Object.keys(localStorage)
    .filter((slot) => slot.startsWith(prefix(uid)))
    .map((slot) => {
      try {
        return JSON.parse(localStorage.getItem(slot)!);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  return [
    ...stored,
    ...unmigrated.filter(
      (op) => !stored.some((row) => row.id === op.id && row.type === op.type),
    ),
  ].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}
export function putPersonalOp(uid: string, op: PersonalOp) {
  personalOps(uid);
  localStorage.setItem(
    key(uid, op),
    JSON.stringify({
      ...op,
      version: crypto.randomUUID(),
      createdAt: Date.now(),
    }),
  );
  window.dispatchEvent(new Event("happy-personal-outbox"));
}
export function acknowledgePersonalOp(uid: string, op: PersonalOp) {
  const current = JSON.parse(localStorage.getItem(key(uid, op)) || "null");
  if (
    current &&
    (op.version
      ? current.version === op.version
      : JSON.stringify(current.payload) === JSON.stringify(op.payload))
  )
    localStorage.removeItem(key(uid, op));
  window.dispatchEvent(new Event("happy-personal-outbox"));
}
export function rejectPersonalOp(uid: string, op: PersonalOp, error: string) {
  const current = JSON.parse(localStorage.getItem(key(uid, op)) || "null");
  if (current?.version === op.version)
    localStorage.setItem(key(uid, op), JSON.stringify({ ...current, error }));
  window.dispatchEvent(new Event("happy-personal-outbox"));
}

export function discardPersonalOp(uid: string, op: PersonalOp) {
  acknowledgePersonalOp(uid, op);
  if (op.type === "POST_TX" || op.type === "POST_BILL") {
    const slot =
      op.type === "POST_TX" ? `albait_txs_${uid}` : `albait_bills_${uid}`;
    try {
      const rows = JSON.parse(localStorage.getItem(slot) || "[]");
      localStorage.setItem(
        slot,
        JSON.stringify(rows.filter((row: any) => row.id !== op.id)),
      );
    } catch {}
  }
  window.dispatchEvent(
    new CustomEvent("happy-local-financial-change", { detail: { uid } }),
  );
}
