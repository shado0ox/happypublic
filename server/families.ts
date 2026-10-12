import express from "express";
import Database from "better-sqlite3";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import {
  HttpError,
  object,
  text,
  integer,
  email,
  transactionInput,
  billInput,
} from "./security";

type Role = "owner" | "admin" | "editor" | "viewer";
const roles = ["admin", "editor", "viewer"];
const digest = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");
const minor = (value: number) => {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value)) || value > 1e9)
    throw new HttpError(
      400,
      "استخدم مبلغًا حتى مليار وبحد أقصى منزلتين عشريتين",
    );
  return Math.round(value * 100);
};

// Additive shared ledgers. The four deployed personal tables stay untouched.
export function mountFamilies(
  app: express.Express,
  dbPath: string,
  requireAuth: express.RequestHandler,
  notify: (uid: string) => void,
) {
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS families (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, currency TEXT NOT NULL, cycleStart INTEGER NOT NULL DEFAULT 1,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS family_members (
      familyId TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('owner','admin','editor','viewer')),
      joinedAt INTEGER NOT NULL, PRIMARY KEY(familyId,uid)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS family_single_owner ON family_members(familyId) WHERE role = 'owner';
    CREATE INDEX IF NOT EXISTS family_member_uid ON family_members(uid);
    CREATE TABLE IF NOT EXISTS family_invitations (
      id TEXT PRIMARY KEY, familyId TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      invitedUid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('admin','editor','viewer')), tokenHash TEXT UNIQUE NOT NULL,
      expiresAt INTEGER NOT NULL, createdBy TEXT NOT NULL REFERENCES users(uid), createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS family_transactions (
      familyId TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE, id TEXT NOT NULL,
      createdBy TEXT NOT NULL REFERENCES users(uid), type TEXT NOT NULL CHECK(type IN ('income','expense')),
      amountMinor INTEGER NOT NULL CHECK(amountMinor > 0), source TEXT, category TEXT,
      date TEXT NOT NULL, note TEXT NOT NULL, createdAt INTEGER NOT NULL, PRIMARY KEY(familyId,id)
    );
    CREATE TABLE IF NOT EXISTS family_bills (
      familyId TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE, id TEXT NOT NULL,
      createdBy TEXT NOT NULL REFERENCES users(uid), title TEXT NOT NULL, amountMinor INTEGER NOT NULL CHECK(amountMinor > 0),
      category TEXT NOT NULL, dayOfMonth INTEGER NOT NULL, createdAt INTEGER NOT NULL, PRIMARY KEY(familyId,id)
    );
    CREATE TABLE IF NOT EXISTS family_audit (
      id INTEGER PRIMARY KEY, familyId TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      actorUid TEXT NOT NULL REFERENCES users(uid), action TEXT NOT NULL, target TEXT NOT NULL, createdAt INTEGER NOT NULL
    );
  `);
  const router = express.Router();
  router.use(requireAuth);
  router.use(
    rateLimit({
      windowMs: 60000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "طلبات كثيرة، حاول بعد دقيقة" },
    }),
  );
  const actor = (req: express.Request): { uid: string; name: string } =>
    (req as any).authUser;
  const membership = (familyId: string, uid: string) => {
    const row = db
      .prepare("SELECT * FROM family_members WHERE familyId = ? AND uid = ?")
      .get(familyId, uid) as any;
    if (!row) throw new HttpError(404, "العائلة غير متاحة لهذا الحساب");
    return row as { role: Role; uid: string };
  };
  const managed = (role: Role) => role === "owner" || role === "admin";
  const manager = (role: Role) => {
    if (!managed(role))
      throw new HttpError(403, "إدارة العائلة متاحة للمالك والمدير فقط");
  };
  const writable = (role: Role, creator?: string, uid?: string) => {
    if (role === "viewer" || (role === "editor" && creator && creator !== uid))
      throw new HttpError(
        403,
        "يمكن للمحرر تعديل سجلاته فقط، والمشاهد للقراءة فقط",
      );
  };
  const audit = (
    familyId: string,
    uid: string,
    action: string,
    target = "",
  ) => {
    db.prepare(
      "INSERT INTO family_audit (familyId,actorUid,action,target,createdAt) VALUES (?,?,?,?,?)",
    ).run(familyId, uid, action, target, Date.now());
  };
  const broadcast = (id: string, extra?: string) => {
    const members = db
      .prepare("SELECT uid FROM family_members WHERE familyId = ?")
      .all(id) as any[];
    for (const uid of new Set([
      ...members.map((m) => m.uid),
      ...(extra ? [extra] : []),
    ]))
      notify(uid);
  };
  const handle =
    (
      fn: (req: express.Request, res: express.Response) => void,
    ): express.RequestHandler =>
    (req, res) => {
      try {
        fn(req, res);
      } catch (error) {
        if (!(error instanceof HttpError))
          console.error("Family request failed", error);
        res
          .status(error instanceof HttpError ? error.status : 500)
          .json({
            error:
              error instanceof HttpError
                ? error.message
                : "تعذر حفظ التغييرات، حاول مجددًا",
          });
      }
    };
  const transactionDTO = (r: any) => ({ ...r, amount: r.amountMinor / 100 });
  const rows = (familyId: string, kind: "transactions" | "bills") =>
    db
      .prepare(
        `SELECT r.*, u.name AS creatorName FROM family_${kind} r JOIN users u ON u.uid = r.createdBy WHERE r.familyId = ? ORDER BY r.createdAt DESC`,
      )
      .all(familyId)
      .map(transactionDTO);
  const settings = (body: unknown) => {
    const v = object(body);
    return {
      name: text(v.name, 80, true).trim(),
      currency: text(v.currency ?? "ر.س", 16, true),
      cycleStart: integer(v.cycleStart ?? 1, 1, 31),
    };
  };
  const saveRow = (
    familyId: string,
    uid: string,
    role: Role,
    kind: "transactions" | "bills",
    input: unknown,
  ) => {
    writable(role);
    const v =
      kind === "transactions" ? transactionInput(input) : billInput(input);
    const amountMinor = minor(v.amount);
    const existing = db
      .prepare(
        `SELECT createdBy FROM family_${kind} WHERE familyId = ? AND id = ?`,
      )
      .get(familyId, v.id) as any;
    writable(role, existing?.createdBy, uid);
    if (
      !existing &&
      (
        db
          .prepare(
            `SELECT COUNT(*) AS n FROM family_${kind} WHERE familyId = ?`,
          )
          .get(familyId) as any
      ).n >= 10000
    )
      throw new HttpError(409, "وصل الدفتر إلى الحد الأقصى من السجلات");
    if (kind === "transactions") {
      const tx = v as ReturnType<typeof transactionInput>;
      db.prepare(
        `INSERT INTO family_transactions VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(familyId,id) DO UPDATE SET type=excluded.type, amountMinor=excluded.amountMinor, source=excluded.source, category=excluded.category, date=excluded.date, note=excluded.note`,
      ).run(
        familyId,
        tx.id,
        uid,
        tx.type,
        amountMinor,
        tx.source,
        tx.category,
        tx.date,
        tx.note,
        Date.now(),
      );
    } else {
      const bill = v as ReturnType<typeof billInput>;
      db.prepare(
        `INSERT INTO family_bills VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(familyId,id) DO UPDATE SET title=excluded.title,amountMinor=excluded.amountMinor,category=excluded.category,dayOfMonth=excluded.dayOfMonth`,
      ).run(
        familyId,
        bill.id,
        uid,
        bill.title,
        amountMinor,
        bill.category,
        bill.dayOfMonth,
        Date.now(),
      );
    }
    return v.id;
  };

  router.get(
    "/",
    handle((req, res) => {
      res.json(
        db
          .prepare(
            "SELECT f.*, m.role FROM families f JOIN family_members m ON m.familyId=f.id WHERE m.uid=? ORDER BY f.createdAt",
          )
          .all(actor(req).uid),
      );
    }),
  );
  router.post(
    "/",
    handle((req, res) => {
      const uid = actor(req).uid,
        v = settings(req.body),
        id = crypto.randomUUID();
      db.transaction(() => {
        if (
          (
            db
              .prepare(
                "SELECT COUNT(*) AS n FROM family_members WHERE uid=? AND role='owner'",
              )
              .get(uid) as any
          ).n >= 20
        )
          throw new HttpError(409, "يمكن إنشاء حتى 20 عائلة");
        db.prepare("INSERT INTO families VALUES (?,?,?,?,?)").run(
          id,
          v.name,
          v.currency,
          v.cycleStart,
          Date.now(),
        );
        db.prepare("INSERT INTO family_members VALUES (?,?,?,?)").run(
          id,
          uid,
          "owner",
          Date.now(),
        );
        audit(id, uid, "family_created");
      })();
      broadcast(id);
      res.status(201).json({ id, ...v, role: "owner" });
    }),
  );
  // The secret is delivered by the inviter, never exposed in family snapshots or persisted in plain text.
  router.post(
    "/accept",
    handle((req, res) => {
      const uid = actor(req).uid,
        token = text(object(req.body).token, 64, true);
      const id = db.transaction(() => {
        const invite = db
          .prepare(
            "SELECT * FROM family_invitations WHERE tokenHash=? AND invitedUid=? AND expiresAt>?",
          )
          .get(digest(token), uid, Date.now()) as any;
        if (!invite)
          throw new HttpError(
            404,
            "الدعوة غير متاحة أو انتهت؛ اطلب دعوة جديدة للحساب الحالي",
          );
        const issuer = db
          .prepare("SELECT role FROM family_members WHERE familyId=? AND uid=?")
          .get(invite.familyId, invite.createdBy) as any;
        if (
          !issuer ||
          !managed(issuer.role) ||
          (invite.role === "admin" && issuer.role !== "owner")
        )
          throw new HttpError(403, "لم تعد الدعوة صالحة، اطلب دعوة جديدة");
        if (
          db
            .prepare("SELECT 1 FROM family_members WHERE familyId=? AND uid=?")
            .get(invite.familyId, uid)
        )
          throw new HttpError(409, "أنت عضو بالفعل");
        if (
          (
            db
              .prepare(
                "SELECT COUNT(*) AS n FROM family_members WHERE familyId=?",
              )
              .get(invite.familyId) as any
          ).n >= 100
        )
          throw new HttpError(409, "وصلت العائلة إلى الحد الأقصى من الأعضاء");
        db.prepare("INSERT INTO family_members VALUES (?,?,?,?)").run(
          invite.familyId,
          uid,
          invite.role,
          Date.now(),
        );
        db.prepare(
          "DELETE FROM family_invitations WHERE familyId=? AND invitedUid=?",
        ).run(invite.familyId, uid);
        audit(invite.familyId, uid, "invitation_accepted");
        return invite.familyId as string;
      })();
      broadcast(id);
      res.json({ id });
    }),
  );
  router.get(
    "/:familyId",
    handle((req, res) => {
      const id = req.params.familyId,
        m = membership(id, actor(req).uid);
      const family = db
        .prepare("SELECT * FROM families WHERE id=?")
        .get(id) as any;
      res.json({
        ...family,
        role: m.role,
        transactions: rows(id, "transactions"),
        recurring_bills: rows(id, "bills"),
        categories: (db.prepare("SELECT name FROM ledger_categories WHERE scope='family' AND scopeId=? ORDER BY name").all(id) as any[]).map(row=>row.name),
        members: db
          .prepare(
            "SELECT m.uid,m.role,m.joinedAt,u.name FROM family_members m JOIN users u ON u.uid=m.uid WHERE familyId=? ORDER BY joinedAt",
          )
          .all(id),
        invitations: managed(m.role)
          ? db
              .prepare(
                "SELECT i.id,i.role,i.expiresAt,u.name AS name FROM family_invitations i JOIN users u ON u.uid=i.invitedUid WHERE familyId=? AND expiresAt>?",
              )
              .all(id, Date.now())
          : [],
        audit: managed(m.role)
          ? db
              .prepare(
                "SELECT a.action,a.target,a.createdAt,u.name AS actorName FROM family_audit a JOIN users u ON u.uid=a.actorUid WHERE familyId=? ORDER BY a.id DESC LIMIT 100",
              )
              .all(id)
          : [],
      });
    }),
  );
  router.post(
    "/:familyId/settings",
    handle((req, res) => {
      const id = req.params.familyId,
        uid = actor(req).uid,
        m = membership(id, uid);
      manager(m.role);
      const v = settings(req.body),
        old = db
          .prepare("SELECT currency FROM families WHERE id=?")
          .get(id) as any;
      if (
        v.currency !== old.currency &&
        (db
          .prepare("SELECT 1 FROM family_transactions WHERE familyId=? LIMIT 1")
          .get(id) ||
          db
            .prepare("SELECT 1 FROM family_bills WHERE familyId=? LIMIT 1")
            .get(id))
      )
        throw new HttpError(
          409,
          "لا يمكن تغيير عملة دفتر يحتوي سجلات؛ أنشئ دفترًا جديدًا للعملة الأخرى",
        );
      db.transaction(() => {
        db.prepare(
          "UPDATE families SET name=?,currency=?,cycleStart=? WHERE id=?",
        ).run(v.name, v.currency, v.cycleStart, id);
        audit(id, uid, "settings_updated");
      })();
      broadcast(id);
      res.json({ success: true });
    }),
  );
  router.post(
    "/:familyId/invitations",
    handle((req, res) => {
      const id = req.params.familyId,
        uid = actor(req).uid,
        m = membership(id, uid);
      manager(m.role);
      const v = object(req.body),
        role = v.role ?? "editor";
      if (!roles.includes(role) || (role === "admin" && m.role !== "owner"))
        throw new HttpError(403, "المالك فقط يمكنه دعوة مدير");
      const target = db
        .prepare("SELECT uid FROM users WHERE email=?")
        .get(email(v.email)) as any;
      if (!target) throw new HttpError(400, "يلزم إنشاء حساب للعضو قبل دعوته");
      if (
        db
          .prepare("SELECT 1 FROM family_members WHERE familyId=? AND uid=?")
          .get(id, target.uid)
      )
        throw new HttpError(409, "الحساب عضو بالفعل");
      const token = crypto.randomBytes(32).toString("hex"),
        inviteId = crypto.randomUUID(),
        expiresAt = Date.now() + 7 * 86400000;
      db.transaction(() => {
        db.prepare(
          "DELETE FROM family_invitations WHERE familyId=? AND (invitedUid=? OR expiresAt<=?)",
        ).run(id, target.uid, Date.now());
        if (
          (
            db
              .prepare(
                "SELECT COUNT(*) AS n FROM family_invitations WHERE familyId=?",
              )
              .get(id) as any
          ).n >= 100
        )
          throw new HttpError(409, "يوجد عدد كبير من الدعوات المعلقة");
        db.prepare(
          "INSERT INTO family_invitations VALUES (?,?,?,?,?,?,?,?)",
        ).run(
          inviteId,
          id,
          target.uid,
          role,
          digest(token),
          expiresAt,
          uid,
          Date.now(),
        );
        audit(id, uid, "invitation_created", inviteId);
      })();
      broadcast(id);
      res.status(201).json({ id: inviteId, token, expiresAt });
    }),
  );
  router.delete(
    "/:familyId/invitations/:inviteId",
    handle((req, res) => {
      const id = req.params.familyId,
        uid = actor(req).uid,
        m = membership(id, uid);
      manager(m.role);
      const invite = db
        .prepare(
          "SELECT role FROM family_invitations WHERE familyId=? AND id=?",
        )
        .get(id, req.params.inviteId) as any;
      if (!invite) throw new HttpError(404, "الدعوة غير متاحة");
      if (invite.role === "admin" && m.role !== "owner")
        throw new HttpError(403, "المالك فقط يمكنه إلغاء دعوة مدير");
      db.transaction(() => {
        db.prepare(
          "DELETE FROM family_invitations WHERE familyId=? AND id=?",
        ).run(id, req.params.inviteId);
        audit(id, uid, "invitation_revoked", req.params.inviteId);
      })();
      broadcast(id);
      res.json({ success: true });
    }),
  );
  router.post(
    "/:familyId/members/:uid",
    handle((req, res) => {
      const id = req.params.familyId,
        uid = actor(req).uid,
        m = membership(id, uid);
      manager(m.role);
      const target = membership(id, req.params.uid),
        role = object(req.body).role;
      if (
        !roles.includes(role) ||
        target.role === "owner" ||
        (m.role !== "owner" && (target.role === "admin" || role === "admin"))
      )
        throw new HttpError(403, "لا تملك صلاحية تغيير هذا الدور");
      db.transaction(() => {
        db.prepare(
          "UPDATE family_members SET role=? WHERE familyId=? AND uid=?",
        ).run(role, id, target.uid);
        db.prepare(
          "DELETE FROM family_invitations WHERE familyId=? AND createdBy=?",
        ).run(id, target.uid);
        audit(id, uid, "member_role_updated", target.uid);
      })();
      broadcast(id);
      res.json({ success: true });
    }),
  );
  router.delete(
    "/:familyId/members/:uid",
    handle((req, res) => {
      const id = req.params.familyId,
        uid = actor(req).uid,
        m = membership(id, uid),
        target = membership(id, req.params.uid);
      if (target.role === "owner")
        throw new HttpError(409, "انقل الملكية قبل مغادرة العائلة");
      if (
        uid !== target.uid &&
        (!managed(m.role) || (m.role !== "owner" && target.role === "admin"))
      )
        throw new HttpError(403, "لا تملك صلاحية إزالة هذا العضو");
      db.transaction(() => {
        db.prepare("DELETE FROM family_members WHERE familyId=? AND uid=?").run(
          id,
          target.uid,
        );
        db.prepare(
          "DELETE FROM family_invitations WHERE familyId=? AND (createdBy=? OR invitedUid=?)",
        ).run(id, target.uid, target.uid);
        audit(
          id,
          uid,
          uid === target.uid ? "member_left" : "member_removed",
          target.uid,
        );
      })();
      broadcast(id, target.uid);
      res.json({ success: true });
    }),
  );
  router.post(
    "/:familyId/transfer",
    handle((req, res) => {
      const id = req.params.familyId,
        uid = actor(req).uid,
        m = membership(id, uid);
      if (m.role !== "owner")
        throw new HttpError(403, "المالك فقط يمكنه نقل الملكية");
      const targetUid = text(object(req.body).uid, 200, true);
      membership(id, targetUid);
      if (targetUid === uid) throw new HttpError(400, "اختر عضوًا آخر");
      db.transaction(() => {
        db.prepare(
          "UPDATE family_members SET role='admin' WHERE familyId=? AND uid=?",
        ).run(id, uid);
        db.prepare(
          "UPDATE family_members SET role='owner' WHERE familyId=? AND uid=?",
        ).run(id, targetUid);
        db.prepare(
          "DELETE FROM family_invitations WHERE familyId=? AND role=?",
        ).run(id, "admin");
        audit(id, uid, "ownership_transferred", targetUid);
      })();
      broadcast(id);
      res.json({ success: true });
    }),
  );
  for (const kind of ["transactions", "bills"] as const) {
    router.post(
      `/:familyId/${kind}`,
      handle((req, res) => {
        const id = req.params.familyId,
          uid = actor(req).uid,
          m = membership(id, uid);
        db.transaction(() => {
          const target = saveRow(id, uid, m.role, kind, req.body);
          audit(id, uid, `${kind}_saved`, target);
        })();
        broadcast(id);
        res.json({ success: true });
      }),
    );
    router.delete(
      `/:familyId/${kind}/:id`,
      handle((req, res) => {
        const id = req.params.familyId,
          uid = actor(req).uid,
          m = membership(id, uid);
        const row = db
          .prepare(
            `SELECT createdBy FROM family_${kind} WHERE familyId=? AND id=?`,
          )
          .get(id, req.params.id) as any;
        if (!row) throw new HttpError(404, "السجل غير متاح");
        writable(m.role, row.createdBy, uid);
        db.transaction(() => {
          db.prepare(
            `DELETE FROM family_${kind} WHERE familyId=? AND id=?`,
          ).run(id, req.params.id);
          audit(id, uid, `${kind}_deleted`, req.params.id);
        })();
        broadcast(id);
        res.json({ success: true });
      }),
    );
  }
  router.get(
    "/:familyId/export",
    handle((req, res) => {
      const id = req.params.familyId;
      membership(id, actor(req).uid);
      res.json({
        format: "happy-home-family-v1",
        exportedAt: new Date().toISOString(),
        family: db
          .prepare("SELECT name,currency,cycleStart FROM families WHERE id=?")
          .get(id),
        transactions: rows(id, "transactions"),
        recurring_bills: rows(id, "bills"),
        categories: (db.prepare("SELECT name FROM ledger_categories WHERE scope='family' AND scopeId=? ORDER BY name").all(id) as any[]).map(row=>row.name),
      });
    }),
  );
  router.post(
    "/:familyId/import",
    handle((req, res) => {
      const id = req.params.familyId,
        uid = actor(req).uid,
        m = membership(id, uid);
      manager(m.role);
      const v = object(req.body);
      if (v.mode !== undefined && v.mode !== "merge")
        throw new HttpError(400, "الاستيراد العائلي يدعم الدمج فقط");
      const current = db
        .prepare("SELECT currency FROM families WHERE id=?")
        .get(id) as any;
      if (!v.family || object(v.family).currency !== current.currency)
        throw new HttpError(400, "عملة ملف الاستيراد يجب أن تطابق عملة الدفتر");
      const validate = (value: unknown, kind: "transactions" | "bills") => {
        if (value === undefined) return [];
        if (!Array.isArray(value) || value.length > 10000)
          throw new HttpError(400, "ملف سجلات غير صالح");
        const input = value.map((row) =>
          kind === "transactions" ? transactionInput(row) : billInput(row),
        );
        for (const row of input) minor(row.amount);
        if (new Set(input.map((row) => row.id)).size !== input.length)
          throw new HttpError(400, "معرفات مكررة في ملف الاستيراد");
        return input;
      };
      const categories=v.categories===undefined?[]:(Array.isArray(v.categories) && v.categories.length<=100?v.categories.map(name=>text(name,80,true).trim()):(()=>{throw new HttpError(400,'تصنيفات غير صالحة');})());
      const txs = validate(v.transactions, "transactions"),
        bills = validate(v.recurring_bills, "bills");
      if (!txs.length && !bills.length && !categories.length)
        throw new HttpError(400, "ملف الاستيراد فارغ");
      db.transaction(() => {
        for(const name of categories)db.prepare("INSERT OR IGNORE INTO ledger_categories VALUES ('family',?,?)").run(id,name);
        if((db.prepare("SELECT count(*) AS n FROM ledger_categories WHERE scope='family' AND scopeId=?").get(id) as any).n>100)throw new HttpError(400,'تصنيفات كثيرة');
        for (const tx of txs) saveRow(id, uid, m.role, "transactions", tx);
        for (const bill of bills) saveRow(id, uid, m.role, "bills", bill);
        audit(id, uid, "bundle_imported");
      })();
      broadcast(id);
      res.json({ success: true, count: txs.length, billCount: bills.length });
    }),
  );
  app.use("/api/families", router);
}
