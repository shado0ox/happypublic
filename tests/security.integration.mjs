import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const hash = token => crypto.createHash('sha256').update(token).digest('hex');
const password = 'Example-test-password-42';
const legacyUid = 'existing-user';

test('production API isolation, sessions, imports and existing SQLite preservation', { timeout: 60000 }, async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'happy-home-security-'));
  const dbPath = path.join(directory, 'albait.db');
  const db = new Database(dbPath);
  let child;
  let base;
  let startupLogs = '';
  const stop = async () => {
    if (child && child.exitCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      await exited;
    }
  };
  t.after(async () => { await stop(); db.close(); await rm(directory, { recursive: true, force: true }); });

  // The pre-session schema deployed on the Orange Pi, with all four tables.
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE users (uid TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      password TEXT, lastLogin INTEGER NOT NULL, provider TEXT NOT NULL, createdAt INTEGER NOT NULL, token TEXT, seeded INTEGER DEFAULT 0);
    CREATE TABLE transactions (id TEXT PRIMARY KEY, uid TEXT NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL,
      source TEXT, category TEXT, date TEXT NOT NULL, note TEXT, createdAt INTEGER NOT NULL, userEmail TEXT, userName TEXT,
      FOREIGN KEY(uid) REFERENCES users(uid) ON DELETE CASCADE);
    CREATE TABLE recurring_bills (id TEXT PRIMARY KEY, uid TEXT NOT NULL, title TEXT NOT NULL, amount REAL NOT NULL,
      category TEXT NOT NULL, dayOfMonth INTEGER NOT NULL, createdAt INTEGER NOT NULL,
      FOREIGN KEY(uid) REFERENCES users(uid) ON DELETE CASCADE);
    CREATE TABLE settings (uid TEXT PRIMARY KEY, currency TEXT NOT NULL, cycleStart INTEGER NOT NULL, sortOrder TEXT NOT NULL,
      defaultFilter TEXT NOT NULL, defaultCategory TEXT NOT NULL, defaultSource TEXT NOT NULL,
      showMotivation INTEGER NOT NULL, showCharts INTEGER NOT NULL, autoHome INTEGER NOT NULL, confirmDelete INTEGER NOT NULL,
      realTimeSync INTEGER NOT NULL, enableSounds INTEGER NOT NULL, language TEXT NOT NULL, useHijri INTEGER NOT NULL,
      FOREIGN KEY(uid) REFERENCES users(uid) ON DELETE CASCADE);
  `);
  const passwordHash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(legacyUid, 'existing@example.test', 'Existing', passwordHash, 1000, 'email', 1000, 'old-exposed-token', 0);
  db.prepare('INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('old-income', legacyUid, 'income', 6500.25, 'Salary', null, '2026-09-01', 'Existing record', 1000, 'existing@example.test', 'Existing');
  db.prepare('INSERT INTO recurring_bills VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('old-bill', legacyUid, 'Rent', 1000.75, 'housing', 31, 1000);
  db.prepare('INSERT INTO settings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(legacyUid, 'ر.س', 25, 'asc', 'all', 'food', 'salary', 1, 1, 0, 1, 1, 0, 'en', 0);
  const snapshot = uid => ({
    transactions: db.prepare('SELECT * FROM transactions WHERE uid = ? ORDER BY id').all(uid),
    recurring_bills: db.prepare('SELECT * FROM recurring_bills WHERE uid = ? ORDER BY id').all(uid),
    settings: db.prepare('SELECT * FROM settings WHERE uid = ?').get(uid),
  });
  const legacySnapshot = snapshot(legacyUid);
  // A stale JSON file must not silently overwrite/reimport a deployed SQLite DB.
  await writeFile(path.join(directory, 'albait.json'), JSON.stringify({ users: [{ uid: 'stale-json-user' }] }));

  const start = async () => {
    startupLogs = '';
    child = spawn(process.execPath, ['dist/server.cjs'], {
      cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production', PORT: '0', DATABASE_PATH: dbPath, PLATFORM_ADMIN_UID: legacyUid, ENABLE_LEGACY_JSON_MIGRATION: 'false' },
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Startup timeout: ${startupLogs}`)), 10000);
      const collect = chunk => {
        startupLogs += chunk.toString();
        const match = startupLogs.match(/Server listening at http:\/\/0\.0\.0\.0:(\d+)/);
        if (match) { base = `http://127.0.0.1:${match[1]}`; clearTimeout(timer); resolve(); }
      };
      child.stdout.on('data', collect);
      child.stderr.on('data', collect);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); if (!base) reject(new Error(`Server exited ${code}: ${startupLogs}`)); });
    });
  };
  const headers = session => session ? { 'x-user-uid': session.user.uid, 'x-auth-token': session.token } : {};
  const request = async (url, session, body, method = body === undefined ? 'GET' : 'POST') => {
    const response = await fetch(base + url, {
      method, headers: { ...headers(session), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(5000),
    });
    return { status: response.status, data: await response.json(), headers: response.headers };
  };
  const tx = (id, note = 'Private') => ({ id, type: 'expense', amount: 50.25, date: '2026-10-10', category: 'food', note });
  const bill = id => ({ id, title: 'Rent', amount: 1500, category: 'housing', dayOfMonth: 31 });
  await start();
  let alice, bob, admin, aliceDevice, rotated;

  await t.test('upgrade preserves every legacy financial row and password, invalidates exposed token once', async () => {
    assert.deepEqual(snapshot(legacyUid), legacySnapshot);
    assert.equal(db.prepare('SELECT password FROM users WHERE uid = ?').get(legacyUid).password, passwordHash);
    assert.equal(db.prepare('SELECT token FROM users WHERE uid = ?').get(legacyUid).token, null);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users').get().count, 1);
    const old = { user: { uid: legacyUid }, token: 'old-exposed-token' };
    assert.equal((await request('/api/user/sync', old, { uid: legacyUid })).status, 401);
    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
    assert.deepEqual(db.pragma('foreign_key_check'), []);
  });

  await t.test('register and login issue hashed per-device credentials; no password/token in user DTO', async () => {
    alice = (await request('/api/user/register', null, { name: 'Alice', email: 'alice@example.test', password })).data;
    // The previous hard-coded admin address must not grant privileges.
    bob = (await request('/api/user/register', null, { name: 'Bob', email: 'shady.nasif@gmail.com', password })).data;
    admin = (await request('/api/user/login', null, { email: 'existing@example.test', password })).data;
    for (const session of [alice, bob, admin]) {
      assert.equal(session.success, true);
      assert.match(session.token, /^[a-f0-9]{64}$/);
      assert.equal(session.user.token, undefined);
      assert.equal(session.user.password, undefined);
      assert.ok(db.prepare('SELECT 1 FROM sessions WHERE token_hash = ? AND uid = ?').get(hash(session.token), session.user.uid));
      assert.equal(db.prepare('SELECT token FROM users WHERE uid = ?').get(session.user.uid).token, null);
    }
    assert.equal(bob.user.isPlatformAdmin, false);
    assert.equal(admin.user.isPlatformAdmin, true);
  });

  await t.test('sync is authenticated and cannot mint tokens or overwrite another identity', async () => {
    assert.equal((await request('/api/user/sync', null, { uid: alice.user.uid })).status, 401);
    const response = await request('/api/user/sync', alice, { uid: bob.user.uid, email: 'override@example.test', name: 'Override' });
    assert.equal(response.status, 200);
    assert.equal(response.data.user.uid, alice.user.uid);
    assert.equal(response.data.user.token, undefined);
    assert.equal(response.data.token, undefined);
    assert.equal(db.prepare('SELECT email FROM users WHERE uid = ?').get(bob.user.uid).email, bob.user.email);
    assert.equal((await request(`/api/export?uid=${alice.user.uid}&token=${alice.token}`)).status, 401);
  });

  await t.test('transaction and bill ID collisions cannot read, overwrite or delete another account', async () => {
    const result = await request('/api/transactions', alice, { ...tx('alice-private'), userName: 'Forged', userEmail: bob.user.email, uid: bob.user.uid });
    assert.equal(result.status, 200);
    assert.equal(result.data.userName, alice.user.name);
    assert.equal(result.data.userEmail, alice.user.email);
    const before = snapshot(alice.user.uid);
    assert.equal((await request('/api/transactions', bob, { ...tx('alice-private'), amount: 1 })).status, 404);
    assert.equal((await request('/api/transactions/alice-private', bob, undefined, 'DELETE')).status, 404);
    assert.deepEqual((await request('/api/transactions', bob)).data, []);
    assert.deepEqual(snapshot(alice.user.uid), before);
    assert.equal((await request('/api/recurring-bills', alice, bill('alice-bill'))).status, 200);
    const billsBefore = snapshot(alice.user.uid);
    assert.equal((await request('/api/recurring-bills', bob, { ...bill('alice-bill'), amount: 1 })).status, 404);
    assert.equal((await request('/api/recurring-bills/alice-bill', bob, undefined, 'DELETE')).status, 404);
    assert.deepEqual(snapshot(alice.user.uid), billsBefore);
    assert.equal((await request('/api/transactions', alice, { ...tx('alice-private'), amount: 75.75 })).status, 200);
    assert.equal((await request('/api/transactions', alice)).data[0].amount, 75.75);
  });

  await t.test('bad dates, types, amounts and bill days fail without partial data', async () => {
    const before = snapshot(bob.user.uid);
    for (const input of [ { ...tx('bad'), amount: '10bad' }, { ...tx('bad'), date: '2026-02-30' }, { ...tx('bad'), type: 'other' }, { ...tx('bad'), amount: -1 }, { ...tx('bad'), note: {} } ]) {
      assert.equal((await request('/api/transactions', bob, input)).status, 400);
    }
    assert.equal((await request('/api/recurring-bills', bob, { ...bill('bad-bill'), dayOfMonth: 32 })).status, 400);
    assert.deepEqual(snapshot(bob.user.uid), before);
  });

  await t.test('import validates every row and foreign IDs before touching settings or records', async () => {
    await request('/api/transactions', bob, tx('bob-original'));
    const before = snapshot(bob.user.uid);
    const foreignAttempt = await request('/api/import', bob, { mode: 'replace', settings: { currency: 'USD' }, transactions: [tx('alice-private')] });
    assert.equal(foreignAttempt.status, 404);
    assert.deepEqual(snapshot(bob.user.uid), before);
    assert.equal((await request('/api/import', bob, { mode: 'replace', settings: { currency: 'USD' }, transactions: [tx('valid-row'), { ...tx('invalid-row'), amount: 0 }] })).status, 400);
    assert.deepEqual(snapshot(bob.user.uid), before);
    assert.equal((await request('/api/import', bob, { recurring_bills: [bill('alice-bill')] })).status, 404);
    assert.deepEqual(snapshot(bob.user.uid), before);
    assert.equal((await request('/api/import', bob, { transactions: [tx('duplicate'), tx('duplicate')] })).status, 400);
  });

  await t.test('database failure rolls back deletion, settings and all imported rows together', async () => {
    const before = snapshot(bob.user.uid);
    db.exec("CREATE TRIGGER fail_import BEFORE INSERT ON transactions WHEN NEW.note = 'force rollback' BEGIN SELECT RAISE(ABORT, 'simulated write failure'); END;");
    const result = await request('/api/import', bob, { mode: 'replace', settings: { currency: 'USD' }, transactions: [tx('first-write'), tx('second-write', 'force rollback')] });
    assert.equal(result.status, 500);
    assert.deepEqual(snapshot(bob.user.uid), before);
    db.exec('DROP TRIGGER fail_import;');
  });

  await t.test('default import merges; export/restoration includes bills and contains no credentials', async () => {
    assert.equal((await request('/api/import', bob, { transactions: [tx('bob-added')], recurring_bills: [bill('bob-bill')] })).status, 200);
    assert.equal((await request('/api/transactions', bob)).data.length, 2);
    const exported = await request('/api/export', bob);
    assert.equal(exported.status, 200);
    assert.equal(exported.headers.get('cache-control'), 'no-store');
    assert.equal(exported.data.user.token, undefined);
    assert.equal(exported.data.user.password, undefined);
    assert.equal(exported.data.recurring_bills.length, 1);
    const before = snapshot(bob.user.uid);
    await request('/api/transactions/all', bob, undefined, 'DELETE');
    await request('/api/recurring-bills/bob-bill', bob, undefined, 'DELETE');
    assert.equal((await request('/api/import', bob, { ...exported.data, mode: 'replace' })).status, 200);
    assert.deepEqual(snapshot(bob.user.uid), before);
    assert.equal((await request('/api/transactions', alice)).data.length, 1);
  });

  await t.test('platform admin has aggregate counts only and cannot delete personal transactions', async () => {
    assert.equal((await request('/api/admin/stats', bob)).status, 403);
    const stats = await request('/api/admin/stats', admin);
    assert.deepEqual(Object.keys(stats.data).sort(), ['recurringBillCount', 'transactionCount', 'userCount']);
    assert.equal(stats.data.userCount, 3);
    const before = snapshot(alice.user.uid);
    assert.equal((await request('/api/admin/clear-user', admin, { targetUid: alice.user.uid })).status, 410);
    assert.equal((await request('/api/admin/delete-txn', admin, { txnId: 'alice-private' })).status, 410);
    assert.deepEqual(snapshot(alice.user.uid), before);
  });

  await t.test('SSE uses one-use tickets; reusable session-token URLs are rejected', async () => {
    assert.equal((await request(`/api/sync/stream?uid=${alice.user.uid}&token=${alice.token}`)).status, 401);
    const ticket = (await request('/api/sync/ticket', alice, {})).data.ticket;
    const controller = new AbortController();
    const stream = await fetch(`${base}/api/sync/stream?ticket=${ticket}`, { signal: controller.signal });
    assert.equal(stream.status, 200);
    const reader = stream.body.getReader();
    const { value } = await reader.read();
    assert.match(new TextDecoder().decode(value), /connected/);
    assert.equal((await request(`/api/sync/stream?ticket=${ticket}`)).status, 401);
    controller.abort();
    await reader.cancel().catch(() => {});
  });

  await t.test('rotation, logout and expiry affect only the intended device session', async () => {
    aliceDevice = (await request('/api/user/login', null, { email: alice.user.email, password })).data;
    assert.equal((await request('/api/transactions', alice)).status, 200);
    const ticket = (await request('/api/sync/ticket', alice, {})).data.ticket;
    rotated = (await request('/api/user/login-with-token', null, { email: alice.user.email, token: alice.token })).data;
    assert.equal(rotated.success, true);
    assert.equal((await request('/api/transactions', alice)).status, 401);
    assert.equal((await request(`/api/sync/stream?ticket=${ticket}`)).status, 401);
    assert.equal((await request('/api/transactions', aliceDevice)).status, 200);
    assert.equal((await request('/api/user/logout', aliceDevice, {})).status, 200);
    assert.equal((await request('/api/transactions', aliceDevice)).status, 401);
    assert.equal((await request('/api/transactions', rotated)).status, 200);
    db.prepare('UPDATE sessions SET expires_at = 0 WHERE token_hash = ?').run(hash(bob.token));
    assert.equal((await request('/api/transactions', bob)).status, 401);
    assert.equal((await request('/api/transactions', rotated)).status, 200);
  });

  await t.test('restart does not repeat revocation or change any financial data', async () => {
    const before = [snapshot(alice.user.uid), snapshot(bob.user.uid), snapshot(legacyUid)];
    await stop();
    base = undefined;
    await start();
    assert.equal((await request('/api/transactions', rotated)).status, 200);
    assert.deepEqual([snapshot(alice.user.uid), snapshot(bob.user.uid), snapshot(legacyUid)], before);
    assert.deepEqual(snapshot(legacyUid), legacySnapshot);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count, 1);
    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
    assert.deepEqual(db.pragma('foreign_key_check'), []);
  });
});
