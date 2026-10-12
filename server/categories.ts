import express from "express";
import Database from "better-sqlite3";
import { HttpError, object, text } from "./security";
export function mountCategories(
  app: express.Express,
  path: string,
  auth: express.RequestHandler,
  notify: (uid: string) => void,
) {
  const db = new Database(path);
  db.pragma("foreign_keys=ON");
  db.exec(
    `CREATE TABLE IF NOT EXISTS ledger_categories (scope TEXT NOT NULL, scopeId TEXT NOT NULL, name TEXT NOT NULL, PRIMARY KEY(scope,scopeId,name));`,
  );
  for (const scope of ["personal", "family"]) {
    const route =
      scope === "personal"
        ? "/api/categories"
        : "/api/families/:familyId/categories";
    const handle = (
      req: express.Request,
      res: express.Response,
      write: boolean,
    ) => {
      try {
        const uid = (req as any).authUser.uid,
          id = scope === "personal" ? uid : req.params.familyId;
        if (scope === "family") {
          const member = db
            .prepare(
              "SELECT role FROM family_members WHERE familyId=? AND uid=?",
            )
            .get(id, uid) as any;
          if (!member) throw new HttpError(404, "الدفتر غير متاح");
          if (write && member.role === "viewer")
            throw new HttpError(403, "غير مسموح بإضافة التصنيفات");
        }
        if (write) {
          const name = text(object(req.body).name, 80, true).trim();
          db.transaction(() => {
            const exists = db
              .prepare(
                "SELECT 1 FROM ledger_categories WHERE scope=? AND scopeId=? AND name=?",
              )
              .get(scope, id, name);
            const count = (
              db
                .prepare(
                  "SELECT count(*) AS n FROM ledger_categories WHERE scope=? AND scopeId=?",
                )
                .get(scope, id) as any
            ).n;
            if (!exists && count >= 100)
              throw new HttpError(409, "الحد الأقصى 100 تصنيف إضافي");
            db.prepare(
              "INSERT OR IGNORE INTO ledger_categories VALUES (?,?,?)",
            ).run(scope, id, name);
          })();
          if (scope === "personal") notify(uid);
          else
            for (const m of db
              .prepare("SELECT uid FROM family_members WHERE familyId=?")
              .all(id) as any[])
              notify(m.uid);
        }
        res.json(
          (
            db
              .prepare(
                "SELECT name FROM ledger_categories WHERE scope=? AND scopeId=? ORDER BY name",
              )
              .all(scope, id) as any[]
          ).map((row) => row.name),
        );
      } catch (e: any) {
        res
          .status(e instanceof HttpError ? e.status : 500)
          .json({
            error: e instanceof HttpError ? e.message : "تعذر حفظ التصنيف",
          });
      }
    };
    app.get(route, auth, (req, res) => handle(req, res, false));
    app.post(route, auth, (req, res) => handle(req, res, true));
  }
}
