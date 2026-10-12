import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import Database from "better-sqlite3";
import crypto from "node:crypto";

const password = "Family-example-password-42";
test(
  "shared families: roles, invitations, privacy, atomic imports and restart",
  { timeout: 60000 },
  async (t) => {
    const dir = await mkdtemp(path.join(tmpdir(), "happy-family-")),
      dbPath = path.join(dir, "albait.db");
    let child, base, db;
    const stop = async () => {
      if (child?.exitCode === null) {
        const exited = once(child, "exit");
        child.kill("SIGTERM");
        await exited;
      }
    };
    t.after(async () => {
      await stop();
      db?.close();
      await rm(dir, { recursive: true, force: true });
    });
    const start = async () => {
      base = undefined;
      child = spawn(process.execPath, ["dist/server.cjs"], {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          NODE_ENV: "production",
          PORT: "0",
          DATABASE_PATH: dbPath,
          PLATFORM_ADMIN_UID: "platform-only",
          ENABLE_LEGACY_JSON_MIGRATION: "false",
        },
      });
      await new Promise((resolve, reject) => {
        let log = "";
        const timer = setTimeout(() => reject(new Error(log)), 10000);
        const collect = (chunk) => {
          log += chunk;
          const m = log.match(/Server listening at http:\/\/0\.0\.0\.0:(\d+)/);
          if (m) {
            base = `http://127.0.0.1:${m[1]}`;
            clearTimeout(timer);
            resolve();
          }
        };
        child.stdout.on("data", collect);
        child.stderr.on("data", collect);
        child.once("error", (e) => {
          clearTimeout(timer);
          reject(e);
        });
        child.once("exit", (code) => {
          clearTimeout(timer);
          if (!base) reject(new Error(`Exit ${code}: ${log}`));
        });
      });
    };
    const req = async (
      url,
      session,
      body,
      method = body === undefined ? "GET" : "POST",
    ) => {
      const r = await fetch(base + url, {
        method,
        headers: {
          ...(session
            ? { "x-user-uid": session.user.uid, "x-auth-token": session.token }
            : {}),
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      return { status: r.status, data: await r.json() };
    };
    await start();
    db = new Database(dbPath);
    db.pragma("foreign_keys = ON");
    const register = async (name) => {
      const r = await req("/api/user/register", null, {
        name,
        email: `${name}@example.test`,
        password,
      });
      assert.equal(r.status, 200);
      return r.data;
    };
    const owner = await register("owner"),
      admin = await register("admin"),
      editor = await register("editor"),
      viewer = await register("viewer"),
      stranger = await register("stranger");
    const tx = (id, amount = 10.25) => ({
      id,
      type: "expense",
      amount,
      date: "2026-10-11",
      category: "food",
      note: "Shared only",
    });
    const bill = (id) => ({
      id,
      title: "Rent",
      amount: 500.25,
      category: "housing",
      dayOfMonth: 31,
    });
    let family, other, invite, personal;
    const snapshot = async (session) =>
      (await req(`/api/families/${family}`, session)).data;
    const addMember = async (session, role) => {
      const i = await req(`/api/families/${family}/invitations`, owner, {
        email: session.user.email,
        role,
      });
      assert.equal(i.status, 201);
      const accepted = await req("/api/families/accept", session, {
        token: i.data.token,
      });
      assert.equal(accepted.status, 200);
      return i.data;
    };
    await t.test(
      "existing personal books remain private and family creation starts empty",
      async () => {
        assert.equal(
          (await req("/api/transactions", owner, tx("personal-only", 6500.25)))
            .status,
          200,
        );
        personal = (await req("/api/export", owner)).data;
        assert.equal((await req("/api/families")).status, 401);
        const created = await req("/api/families", owner, {
          name: "Home",
          currency: "ر.س",
          cycleStart: 25,
        });
        assert.equal(created.status, 201);
        family = created.data.id;
        other = (
          await req("/api/families", stranger, {
            name: "Other",
            currency: "ر.س",
          })
        ).data.id;
        const s = await snapshot(owner);
        assert.equal(s.role, "owner");
        assert.deepEqual(s.transactions, []);
        assert.deepEqual(s.recurring_bills, []);
        assert.deepEqual(
          (await req("/api/export", owner)).data.transactions,
          personal.transactions,
        );
        assert.equal(
          (await req(`/api/families/${family}`, stranger)).status,
          404,
        );
        assert.equal(
          (await req(`/api/families/${family}/export`, stranger)).status,
          404,
        );
      },
    );
    await t.test(
      "invitations are account-bound, one-use, hashed and expiring",
      async () => {
        invite = (
          await req(`/api/families/${family}/invitations`, owner, {
            email: editor.user.email,
            role: "editor",
          })
        ).data;
        assert.ok(
          db
            .prepare("SELECT 1 FROM family_invitations WHERE tokenHash=?")
            .get(
              crypto.createHash("sha256").update(invite.token).digest("hex"),
            ),
        );
        assert.equal(
          (await req("/api/families/accept", stranger, { token: invite.token }))
            .status,
          404,
        );
        assert.equal(
          (await req("/api/families/accept", editor, { token: invite.token }))
            .status,
          200,
        );
        assert.equal(
          (await req("/api/families/accept", editor, { token: invite.token }))
            .status,
          404,
        );
        await addMember(admin, "admin");
        await addMember(viewer, "viewer");
        const pending = (
          await req(`/api/families/${family}/invitations`, owner, {
            email: stranger.user.email,
            role: "viewer",
          })
        ).data;
        const serialized = JSON.stringify(await snapshot(owner));
        assert.ok(!serialized.includes(pending.token));
        assert.ok(!serialized.includes("tokenHash"));
        assert.ok(!serialized.includes(stranger.user.email));
        db.prepare("UPDATE family_invitations SET expiresAt=0 WHERE id=?").run(
          pending.id,
        );
        assert.equal(
          (
            await req("/api/families/accept", stranger, {
              token: pending.token,
            })
          ).status,
          404,
        );
      },
    );
    await t.test('custom expense categories are scoped, idempotent and enforce membership roles', async()=>{
      assert.equal((await req('/api/categories',owner,{name:'حيوانات أليفة'})).status,200);
      assert.deepEqual((await req('/api/categories',stranger)).data,[]);
      assert.deepEqual((await req('/api/categories',owner,{name:'حيوانات أليفة'})).data,['حيوانات أليفة']);
      const endpoint=`/api/families/${family}/categories`;
      assert.equal((await req(endpoint,editor,{name:'سكن'})).status,200);
      assert.deepEqual((await req(endpoint,viewer)).data,['سكن']);
      assert.equal((await req(endpoint,viewer,{name:'ممنوع'})).status,403);
      assert.equal((await req(endpoint,stranger)).status,404);
      assert.equal((await req('/api/categories',owner,{name:''})).status,400);
      assert.deepEqual((await req('/api/export',owner)).data.categories,['حيوانات أليفة']);
      assert.equal((await req('/api/import',owner,{categories:['هوايات']})).status,200);
      assert.deepEqual((await req('/api/categories',owner)).data,['حيوانات أليفة','هوايات']);
      const backup=(await req(`/api/families/${family}/export`,owner)).data;
      assert.deepEqual(backup.categories,['سكن']);
      assert.equal((await req(`/api/families/${family}/import`,owner,{family:{currency:backup.family.currency},categories:['هوايات']})).status,200);
      assert.deepEqual((await req(endpoint,viewer)).data,['سكن','هوايات']);
      assert.equal((await req(`/api/families/${family}/import`,owner,{family:{currency:backup.family.currency},categories:['invalid merge'],transactions:[{id:'invalid',amount:-1,type:'expense',date:'2026-10-01'}]})).status,400);
      assert.deepEqual((await req(endpoint,viewer)).data,['سكن','هوايات']);

    });
    await t.test(
      "viewers cannot write, import, invite or change settings; editors edit only their records",
      async () => {
        assert.equal(
          (
            await req(
              `/api/families/${family}/transactions`,
              owner,
              tx("owner-row"),
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await req(`/api/families/${family}/transactions`, editor, {
              ...tx("editor-row"),
              createdBy: owner.user.uid,
            })
          ).status,
          200,
        );
        const own = (await snapshot(editor)).transactions.find(
          (r) => r.id === "editor-row",
        );
        assert.equal(own.createdBy, editor.user.uid);
        assert.equal(own.creatorName, "editor");
        assert.equal(own.amountMinor, 1025);
        for (const route of [
          "transactions",
          "bills",
          "settings",
          "invitations",
          "import",
        ])
          assert.equal(
            (await req(`/api/families/${family}/${route}`, viewer, {})).status,
            403,
          );
        assert.equal(
          (
            await req(
              `/api/families/${family}/transactions`,
              editor,
              tx("owner-row", 99),
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await req(
              `/api/families/${family}/transactions/owner-row`,
              editor,
              undefined,
              "DELETE",
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await req(
              `/api/families/${family}/transactions`,
              editor,
              tx("editor-row", 12.5),
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await req(
              `/api/families/${family}/transactions`,
              admin,
              tx("editor-row", 20.25),
            )
          ).status,
          200,
        );
        assert.equal(
          (await snapshot(owner)).transactions.find(
            (r) => r.id === "editor-row",
          ).createdBy,
          editor.user.uid,
        );
        assert.deepEqual((await req("/api/transactions", viewer)).data, []);
        assert.deepEqual(
          (await req("/api/export", owner)).data.transactions,
          personal.transactions,
        );
        assert.equal(
          (
            await req(
              `/api/families/${family}/transactions`,
              owner,
              tx("invalid", 0.001),
            )
          ).status,
          400,
        );
      },
    );
    await t.test(
      "bills have matching ownership rules and separate ledgers accept the same record ID",
      async () => {
        assert.equal(
          (await req(`/api/families/${family}/bills`, owner, bill("rent")))
            .status,
          200,
        );
        assert.equal(
          (await req(`/api/families/${family}/bills`, editor, bill("rent")))
            .status,
          403,
        );
        assert.equal(
          (
            await req(
              `/api/families/${family}/bills/rent`,
              editor,
              undefined,
              "DELETE",
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await req(
              `/api/families/${other}/transactions`,
              stranger,
              tx("owner-row", 77),
            )
          ).status,
          200,
        );
        assert.equal(
          (await snapshot(owner)).transactions.find((r) => r.id === "owner-row")
            .amount,
          10.25,
        );
        assert.equal(
          (
            await req(
              `/api/families/${other}/transactions/owner-row`,
              owner,
              undefined,
              "DELETE",
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await req(`/api/families/${family}/settings`, owner, {
              name: "Home",
              currency: "$",
              cycleStart: 25,
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await req(`/api/families/${family}/settings`, admin, {
              name: "Shared Home",
              currency: "ر.س",
              cycleStart: 31,
            })
          ).status,
          200,
        );
      },
    );
    await t.test(
      "administrators cannot appoint themselves owner or alter owner/peer admins",
      async () => {
        assert.equal(
          (
            await req(
              `/api/families/${family}/members/${owner.user.uid}`,
              admin,
              { role: "viewer" },
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await req(
              `/api/families/${family}/members/${admin.user.uid}`,
              admin,
              { role: "owner" },
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await req(
              `/api/families/${family}/members/${viewer.user.uid}`,
              admin,
              { role: "admin" },
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await req(`/api/families/${family}/invitations`, admin, {
              email: stranger.user.email,
              role: "admin",
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await req(
              `/api/families/${family}/members/${owner.user.uid}`,
              owner,
              undefined,
              "DELETE",
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await req(`/api/families/${family}/transfer`, admin, {
              uid: viewer.user.uid,
            })
          ).status,
          403,
        );
      },
    );
    await t.test(
      "imports validate currency and all rows and rollback on a real SQLite error",
      async () => {
        const before = await snapshot(owner);
        const bundle = {
          family: { currency: "ر.س" },
          transactions: [tx("import-ok"), { ...tx("bad"), date: "2026-02-30" }],
        };
        assert.equal(
          (await req(`/api/families/${family}/import`, owner, bundle)).status,
          400,
        );
        assert.deepEqual(
          (await snapshot(owner)).transactions,
          before.transactions,
        );
        assert.equal(
          (
            await req(`/api/families/${family}/import`, owner, {
              family: { currency: "$" },
              transactions: [tx("import-ok")],
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await req(`/api/families/${family}/import`, editor, {
              family: { currency: "ر.س" },
              transactions: [tx("import-ok")],
            })
          ).status,
          403,
        );
        db.exec(
          `CREATE TRIGGER fail_family_import BEFORE INSERT ON family_transactions WHEN NEW.id='fail-write' BEGIN SELECT RAISE(ABORT,'forced failure'); END;`,
        );
        assert.equal(
          (
            await req(`/api/families/${family}/import`, owner, {
              family: { currency: "ر.س" },
              transactions: [tx("import-ok"), tx("fail-write")],
            })
          ).status,
          500,
        );
        db.exec("DROP TRIGGER fail_family_import");
        assert.deepEqual(
          (await snapshot(owner)).transactions,
          before.transactions,
        );
        assert.equal(
          (
            await req(`/api/families/${family}/import`, admin, {
              family: { currency: "ر.س" },
              transactions: [tx("import-ok")],
              recurring_bills: [bill("import-bill")],
            })
          ).status,
          200,
        );
        const exported = (await req(`/api/families/${family}/export`, viewer))
          .data;
        assert.equal(exported.format, "happy-home-family-v1");
        assert.equal(exported.recurring_bills.length, 2);
        assert.ok(!JSON.stringify(exported).includes("personal-only"));
        assert.ok(!JSON.stringify(exported).includes("token"));
        assert.ok(!JSON.stringify(exported).includes("password"));
        assert.equal(
          (
            await req(`/api/families/${family}/import`, owner, {
              ...exported,
              mode: "replace",
            })
          ).status,
          400,
        );
        assert.deepEqual(
          (await req("/api/export", owner)).data.transactions,
          personal.transactions,
        );
      },
    );
    await t.test(
      "demotion immediately revokes write rights and outstanding invitations",
      async () => {
        const pending = (
          await req(`/api/families/${family}/invitations`, admin, {
            email: stranger.user.email,
            role: "editor",
          })
        ).data;
        assert.equal(
          (
            await req(
              `/api/families/${family}/members/${admin.user.uid}`,
              owner,
              { role: "viewer" },
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await req(
              `/api/families/${family}/transactions`,
              admin,
              tx("after-demotion"),
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await req("/api/families/accept", stranger, {
              token: pending.token,
            })
          ).status,
          404,
        );
      },
    );
    await t.test(
      "ownership transfer leaves exactly one owner; leaving retains shared financial records",
      async () => {
        assert.equal(
          (
            await req(`/api/families/${family}/transfer`, owner, {
              uid: viewer.user.uid,
            })
          ).status,
          200,
        );
        assert.equal(
          db
            .prepare(
              "SELECT COUNT(*) AS n FROM family_members WHERE familyId=? AND role='owner'",
            )
            .get(family).n,
          1,
        );
        assert.equal((await snapshot(viewer)).role, "owner");
        assert.equal((await snapshot(owner)).role, "admin");
        assert.equal(
          (
            await req(
              `/api/families/${family}/members/${owner.user.uid}`,
              owner,
              undefined,
              "DELETE",
            )
          ).status,
          200,
        );
        assert.equal((await req(`/api/families/${family}`, owner)).status, 404);
        assert.equal(
          (await req(`/api/families/${family}/export`, owner)).status,
          404,
        );
        assert.equal(
          (
            await req(
              `/api/families/${family}/transactions`,
              owner,
              tx("removed"),
            )
          ).status,
          404,
        );
        assert.ok(
          (await snapshot(viewer)).transactions.some(
            (r) => r.id === "owner-row",
          ),
        );
        assert.deepEqual(
          (await req("/api/export", owner)).data.transactions,
          personal.transactions,
        );
        assert.equal(
          (
            await req(
              `/api/families/${family}/members/${editor.user.uid}`,
              viewer,
              undefined,
              "DELETE",
            )
          ).status,
          200,
        );
        assert.equal(
          (await req(`/api/families/${family}`, editor)).status,
          404,
        );
        assert.ok(
          (await snapshot(viewer)).transactions.some(
            (r) => r.id === "editor-row",
          ),
        );
      },
    );
    await t.test(
      "platform administration grants no membership and audit includes no amounts or secrets",
      async () => {
        // Give a dedicated ordinary session the configured platform UID without touching other users.
        db.prepare(
          "INSERT INTO users (uid,email,name,lastLogin,provider,createdAt) VALUES (?,?,?,?,?,?)",
        ).run(
          "platform-only",
          "platform@example.test",
          "Platform",
          Date.now(),
          "email",
          Date.now(),
        );
        const token = crypto.randomBytes(32).toString("hex");
        db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(
          crypto.createHash("sha256").update(token).digest("hex"),
          "platform-only",
          Date.now() + 60000,
        );
        const platform = { user: { uid: "platform-only" }, token };
        assert.equal((await req("/api/admin/stats", platform)).status, 200);
        assert.equal(
          (await req(`/api/families/${family}`, platform)).status,
          404,
        );
        const s = await snapshot(viewer);
        assert.ok(s.audit.length > 0);
        assert.ok(!JSON.stringify(s.audit).includes("amount"));
        assert.ok(!JSON.stringify(s.audit).includes("token"));
      },
    );
    await t.test(
      "restart preserves roles, all shared rows and personal records",
      async () => {
        const before = await snapshot(viewer);
        await stop();
        await start();
        const after = await snapshot(viewer);
        assert.deepEqual(after, before);
        assert.deepEqual(
          (await req("/api/export", owner)).data.transactions,
          personal.transactions,
        );
        assert.equal(db.pragma("integrity_check", { simple: true }), "ok");
        assert.deepEqual(db.pragma("foreign_key_check"), []);
      },
    );
  },
);
