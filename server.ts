import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Database from 'better-sqlite3';
import { HttpError, object, text, integer, email as normalizeEmail, transactionInput, billInput, settingsInput } from './server/security';

// Global Constants
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('hex');

// Types
interface User {
  uid: string;
  email: string;
  name: string;
  password?: string;
  lastLogin: number;
  provider: string;
  createdAt: number;
  token?: string;
  seeded?: boolean;
}

interface Transaction {
  id: string;
  uid: string;
  type: string;
  amount: number;
  source: string | null;
  category: string | null;
  date: string;
  note: string;
  createdAt: number;
  userEmail: string;
  userName: string;
}

interface Setting {
  uid: string;
  currency: string;
  cycleStart: number;
  sortOrder: string;
  defaultFilter: string;
  defaultCategory: string;
  defaultSource: string;
  showMotivation: number; // 1 or 0
  showCharts: number; // 1 or 0
  autoHome: number; // 1 or 0
  confirmDelete: number; // 1 or 0
  realTimeSync: number; // 1 or 0
  enableSounds: number; // 1 or 0
  language?: string;
  useHijri?: number; // 1 or 0
}

interface RecurringBill {
  id: string;
  uid: string;
  title: string;
  amount: number;
  category: string;
  dayOfMonth: number;
  createdAt: number;
}

class SQLiteDatabase {
  private db: Database.Database;
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    // ensure directory exists
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(this.filePath);
  }

  init() {
    console.log(`Initialising SQLite database at: ${this.filePath}`);
    
    // Enable WAL mode for performance
    this.db.pragma('journal_mode = WAL');
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT,
        lastLogin INTEGER NOT NULL,
        provider TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        token TEXT,
        seeded INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        uid TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        source TEXT,
        category TEXT,
        date TEXT NOT NULL,
        note TEXT,
        createdAt INTEGER NOT NULL,
        userEmail TEXT,
        userName TEXT,
        FOREIGN KEY (uid) REFERENCES users (uid) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        uid TEXT PRIMARY KEY,
        currency TEXT NOT NULL,
        cycleStart INTEGER NOT NULL,
        sortOrder TEXT NOT NULL,
        defaultFilter TEXT NOT NULL,
        defaultCategory TEXT NOT NULL,
        defaultSource TEXT NOT NULL,
        showMotivation INTEGER NOT NULL,
        showCharts INTEGER NOT NULL,
        autoHome INTEGER NOT NULL,
        confirmDelete INTEGER NOT NULL,
        realTimeSync INTEGER NOT NULL,
        enableSounds INTEGER NOT NULL,
        language TEXT NOT NULL,
        useHijri INTEGER NOT NULL,
        FOREIGN KEY (uid) REFERENCES users (uid) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS recurring_bills (
        id TEXT PRIMARY KEY,
        uid TEXT NOT NULL,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        dayOfMonth INTEGER NOT NULL,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (uid) REFERENCES users (uid) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_uid ON sessions(uid);
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at INTEGER NOT NULL
      );
    `);

    // Run Migration from JSON if JSON file exists and has data
    const jsonPath = path.join(path.dirname(this.filePath), 'albait.json');
    if (process.env.ENABLE_LEGACY_JSON_MIGRATION === 'true' && fs.existsSync(jsonPath)) {
      try {
        console.log(`Found legacy albait.json database. Migrating to SQLite...`);
        const fileContent = fs.readFileSync(jsonPath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        
        const users = parsed.users || [];
        const transactions = parsed.transactions || [];
        const settings = parsed.settings || [];
        const recurring_bills = parsed.recurring_bills || [];

        // Insert within a transaction
        const insertUser = this.db.prepare(`
          INSERT OR IGNORE INTO users (uid, email, name, password, lastLogin, provider, createdAt, token, seeded)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertTransaction = this.db.prepare(`
          INSERT OR IGNORE INTO transactions (id, uid, type, amount, source, category, date, note, createdAt, userEmail, userName)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertSetting = this.db.prepare(`
          INSERT OR IGNORE INTO settings (uid, currency, cycleStart, sortOrder, defaultFilter, defaultCategory, defaultSource, showMotivation, showCharts, autoHome, confirmDelete, realTimeSync, enableSounds, language, useHijri)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertBill = this.db.prepare(`
          INSERT OR IGNORE INTO recurring_bills (id, uid, title, amount, category, dayOfMonth, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const runMigration = this.db.transaction(() => {
          for (const u of users) {
            insertUser.run(u.uid, u.email, u.name, u.password || null, u.lastLogin, u.provider, u.createdAt, u.token || null, u.seeded ? 1 : 0);
          }
          for (const tx of transactions) {
            insertTransaction.run(tx.id, tx.uid, tx.type, tx.amount, tx.source || null, tx.category || null, tx.date, tx.note || '', tx.createdAt, tx.userEmail || '', tx.userName || '');
          }
          for (const s of settings) {
            insertSetting.run(
              s.uid,
              s.currency,
              s.cycleStart,
              s.sortOrder,
              s.defaultFilter,
              s.defaultCategory,
              s.defaultSource,
              s.showMotivation ? 1 : 0,
              s.showCharts ? 1 : 0,
              s.autoHome ? 1 : 0,
              s.confirmDelete ? 1 : 0,
              s.realTimeSync ? 1 : 0,
              s.enableSounds ? 1 : 0,
              s.language || 'ar',
              s.useHijri ? 1 : 0
            );
          }
          for (const rb of recurring_bills) {
            insertBill.run(rb.id, rb.uid, rb.title, rb.amount, rb.category, rb.dayOfMonth, rb.createdAt);
          }
        });

        runMigration();
        console.log(`Migration completed successfully!`);

        // Rename the legacy JSON file so we don't run migration again
        const backupPath = jsonPath + '.bak';
        fs.renameSync(jsonPath, backupPath);
        console.log(`Backed up legacy JSON to ${backupPath}`);
      } catch (err) {
        throw new Error('Legacy JSON migration failed; existing database was not replaced', { cause: err });
      }
    }

    // Old tokens were exposed by the unauthenticated profile-sync endpoint.
    // Revoke only once; preserve all users, passwords and financial records.
    this.db.transaction(() => {
      if (!this.db.prepare('SELECT 1 FROM schema_migrations WHERE version = ?').get('secure-sessions-v1')) {
        this.db.prepare('UPDATE users SET token = NULL').run();
        this.db.prepare('INSERT INTO schema_migrations VALUES (?, ?)').run('secure-sessions-v1', Date.now());
      }
    })();
  }

  // User queries
  getUser(uid: string, token: string): User | null {
    const row = this.db.prepare(`
      SELECT users.* FROM users JOIN sessions ON sessions.uid = users.uid
      WHERE users.uid = ? AND sessions.token_hash = ? AND sessions.expires_at > ?
    `).get(uid, hashToken(token), Date.now()) as any;
    if (!row) return null;
    return {
      uid: row.uid,
      email: row.email,
      name: row.name,
      password: row.password || undefined,
      lastLogin: row.lastLogin,
      provider: row.provider,
      createdAt: row.createdAt,
      token: row.token || undefined,
      seeded: !!row.seeded
    };
  }

  getUserByEmail(email: string): User | null {
    const row = this.db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as any;
    if (!row) return null;
    return {
      uid: row.uid,
      email: row.email,
      name: row.name,
      password: row.password || undefined,
      lastLogin: row.lastLogin,
      provider: row.provider,
      createdAt: row.createdAt,
      token: row.token || undefined,
      seeded: !!row.seeded
    };
  }

  getUserByUid(uid: string): User | null {
    const row = this.db.prepare(`SELECT * FROM users WHERE uid = ?`).get(uid) as any;
    if (!row) return null;
    return {
      uid: row.uid,
      email: row.email,
      name: row.name,
      password: row.password || undefined,
      lastLogin: row.lastLogin,
      provider: row.provider,
      createdAt: row.createdAt,
      token: row.token || undefined,
      seeded: !!row.seeded
    };
  }

  createUser(user: User) {
    this.db.prepare(`
      INSERT INTO users (uid, email, name, password, lastLogin, provider, createdAt, token, seeded)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uid) DO UPDATE SET
        email = excluded.email,
        name = excluded.name,
        password = COALESCE(excluded.password, users.password),
        lastLogin = excluded.lastLogin,
        provider = excluded.provider,
        token = COALESCE(excluded.token, users.token),
        seeded = excluded.seeded
    `).run(
      user.uid,
      user.email,
      user.name,
      user.password || null,
      user.lastLogin,
      user.provider,
      user.createdAt,
      user.token || null,
      user.seeded ? 1 : 0
    );
  }

  registerUser(user: User) {
    return this.db.transaction(() => {
      if (this.getUserByEmail(user.email)) throw new HttpError(409, 'البريد الإلكتروني مسجل بالفعل');
      this.createUser(user);
      this.saveSettings(getDefaultSettings(user.uid));
      return this.issueSession(user.uid);
    })();
  }

  issueSession(uid: string): string {
    const token = newToken();
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
      this.db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(hashToken(token), uid, Date.now() + SESSION_TTL_MS);
      this.db.prepare('UPDATE users SET lastLogin = ?, token = NULL WHERE uid = ?').run(Date.now(), uid);
    })();
    return token;
  }

  revokeSession(token: string) {
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  }

  rotateSession(uid: string, oldToken: string): string {
    return this.db.transaction(() => {
      if (!this.getUser(uid, oldToken)) throw new HttpError(401, 'الجلسة منتهية');
      this.revokeSession(oldToken);
      return this.issueSession(uid);
    })();
  }

  restoreUserBundle(uid: string, settings: Setting | undefined, txs: Transaction[] | undefined, bills: RecurringBill[] | undefined, replace: boolean) {
    this.db.transaction(() => {
      // Check collisions before removing anything, including the caller's rows.
      for (const tx of txs ?? []) {
        const owner = this.db.prepare('SELECT uid FROM transactions WHERE id = ?').get(tx.id) as any;
        if (owner && owner.uid !== uid) throw new HttpError(404, 'السجل غير متاح');
      }
      for (const bill of bills ?? []) {
        const owner = this.db.prepare('SELECT uid FROM recurring_bills WHERE id = ?').get(bill.id) as any;
        if (owner && owner.uid !== uid) throw new HttpError(404, 'السجل غير متاح');
      }
      if (settings) this.saveSettings(settings);
      if (replace && txs) this.deleteAllTransactionsForUser(uid);
      if (replace && bills) this.db.prepare('DELETE FROM recurring_bills WHERE uid = ?').run(uid);
      for (const tx of txs ?? []) this.saveTransaction(tx);
      for (const bill of bills ?? []) this.saveRecurringBill(bill);
    })();
  }

  getAggregateStats() {
    return {
      userCount: (this.db.prepare('SELECT COUNT(*) AS count FROM users').get() as any).count,
      transactionCount: (this.db.prepare('SELECT COUNT(*) AS count FROM transactions').get() as any).count,
      recurringBillCount: (this.db.prepare('SELECT COUNT(*) AS count FROM recurring_bills').get() as any).count,
    };
  }

  // Transactions queries
  getTransactions(uid: string): Transaction[] {
    const rows = this.db.prepare(`
      SELECT * FROM transactions WHERE uid = ?
      ORDER BY date DESC, createdAt DESC
    `).all(uid) as any[];
    return rows.map(r => ({
      id: r.id,
      uid: r.uid,
      type: r.type,
      amount: r.amount,
      source: r.source,
      category: r.category,
      date: r.date,
      note: r.note,
      createdAt: r.createdAt,
      userEmail: r.userEmail || '',
      userName: r.userName || ''
    }));
  }

  getTransactionById(id: string, uid: string): Transaction | null {
    const r = this.db.prepare(`SELECT * FROM transactions WHERE id = ? AND uid = ?`).get(id, uid) as any;
    if (!r) return null;
    return {
      id: r.id,
      uid: r.uid,
      type: r.type,
      amount: r.amount,
      source: r.source,
      category: r.category,
      date: r.date,
      note: r.note,
      createdAt: r.createdAt,
      userEmail: r.userEmail || '',
      userName: r.userName || ''
    };
  }

  saveTransaction(tx: Transaction) {
    const result = this.db.prepare(`
      INSERT INTO transactions (id, uid, type, amount, source, category, date, note, createdAt, userEmail, userName)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        amount = excluded.amount,
        source = excluded.source,
        category = excluded.category,
        date = excluded.date,
        note = excluded.note
      WHERE transactions.uid = excluded.uid
    `).run(
      tx.id,
      tx.uid,
      tx.type,
      tx.amount,
      tx.source,
      tx.category,
      tx.date,
      tx.note,
      tx.createdAt,
      tx.userEmail,
      tx.userName
    );
    if (!result.changes) throw new HttpError(404, 'السجل غير متاح');
  }

  deleteTransaction(id: string, uid: string) {
    this.db.prepare(`DELETE FROM transactions WHERE id = ? AND uid = ?`).run(id, uid);
  }

  deleteAllTransactionsForUser(uid: string) {
    this.db.prepare(`DELETE FROM transactions WHERE uid = ?`).run(uid);
  }

  // Recurring bills
  getRecurringBills(uid: string): RecurringBill[] {
    const rows = this.db.prepare(`
      SELECT * FROM recurring_bills WHERE uid = ?
      ORDER BY dayOfMonth ASC, createdAt DESC
    `).all(uid) as any[];
    return rows.map(r => ({
      id: r.id,
      uid: r.uid,
      title: r.title,
      amount: r.amount,
      category: r.category,
      dayOfMonth: r.dayOfMonth,
      createdAt: r.createdAt
    }));
  }

  saveRecurringBill(b: RecurringBill) {
    const result = this.db.prepare(`
      INSERT INTO recurring_bills (id, uid, title, amount, category, dayOfMonth, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        amount = excluded.amount,
        category = excluded.category,
        dayOfMonth = excluded.dayOfMonth
      WHERE recurring_bills.uid = excluded.uid
    `).run(b.id, b.uid, b.title, b.amount, b.category, b.dayOfMonth, b.createdAt);
    if (!result.changes) throw new HttpError(404, 'السجل غير متاح');
  }

  deleteRecurringBill(id: string, uid: string) {
    this.db.prepare(`DELETE FROM recurring_bills WHERE id = ? AND uid = ?`).run(id, uid);
  }

  // Settings
  getSettings(uid: string): Setting | null {
    const row = this.db.prepare(`SELECT * FROM settings WHERE uid = ?`).get(uid) as any;
    if (!row) return null;
    return {
      uid: row.uid,
      currency: row.currency,
      cycleStart: row.cycleStart,
      sortOrder: row.sortOrder,
      defaultFilter: row.defaultFilter,
      defaultCategory: row.defaultCategory,
      defaultSource: row.defaultSource,
      showMotivation: row.showMotivation,
      showCharts: row.showCharts,
      autoHome: row.autoHome,
      confirmDelete: row.confirmDelete,
      realTimeSync: row.realTimeSync,
      enableSounds: row.enableSounds,
      language: row.language,
      useHijri: row.useHijri
    };
  }

  saveSettings(s: Setting) {
    this.db.prepare(`
      INSERT INTO settings (uid, currency, cycleStart, sortOrder, defaultFilter, defaultCategory, defaultSource, showMotivation, showCharts, autoHome, confirmDelete, realTimeSync, enableSounds, language, useHijri)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uid) DO UPDATE SET
        currency = excluded.currency,
        cycleStart = excluded.cycleStart,
        sortOrder = excluded.sortOrder,
        defaultFilter = excluded.defaultFilter,
        defaultCategory = excluded.defaultCategory,
        defaultSource = excluded.defaultSource,
        showMotivation = excluded.showMotivation,
        showCharts = excluded.showCharts,
        autoHome = excluded.autoHome,
        confirmDelete = excluded.confirmDelete,
        realTimeSync = excluded.realTimeSync,
        enableSounds = excluded.enableSounds,
        language = excluded.language,
        useHijri = excluded.useHijri
    `).run(
      s.uid,
      s.currency,
      s.cycleStart,
      s.sortOrder,
      s.defaultFilter,
      s.defaultCategory,
      s.defaultSource,
      s.showMotivation,
      s.showCharts,
      s.autoHome,
      s.confirmDelete,
      s.realTimeSync,
      s.enableSounds,
      s.language || 'ar',
      s.useHijri !== undefined ? s.useHijri : 1
    );
  }
}

// Helpers
function getDefaultSettings(uid: string): Setting {
  return {
    uid,
    currency: 'ر.س',
    cycleStart: 1,
    sortOrder: 'desc',
    defaultFilter: 'all',
    defaultCategory: 'طعام وشراب',
    defaultSource: 'راتب',
    showMotivation: 1,
    showCharts: 1,
    autoHome: 1,
    confirmDelete: 1,
    realTimeSync: 1,
    enableSounds: 1,
    language: 'ar',
    useHijri: 1
  };
}

function sanitizeUser(user: User) {
  return {
    uid: user.uid, email: user.email, name: user.name, provider: user.provider,
    lastLogin: user.lastLogin, createdAt: user.createdAt,
    isPlatformAdmin: !!process.env.PLATFORM_ADMIN_UID && user.uid === process.env.PLATFORM_ADMIN_UID,
  };
}

async function startServer() {
  const app = express();

  // Helmet middleware for basic secure headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled to prevent blocking local scripts/Vite assets
    crossOriginEmbedderPolicy: false
  }));

  // Clean, explicit CORS middleware
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-uid, x-auth-token');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '2mb' }));

  // Connection tracking for Real-time Device-to-Device Sync
  interface SyncClient {
    id: string;
    uid: string;
    token: string;
    res: any;
  }
  let syncClients: SyncClient[] = [];

  function notifySyncClients(uid: string) {
    const clients = syncClients.filter(c => c.uid === uid);
    console.log(`Broadcasting sync event to ${clients.length} clients for user ${uid}`);
    clients.forEach(client => {
      if (!db.getUser(client.uid, client.token)) return client.res.end();
      try {
        client.res.write(`data: ${JSON.stringify({ type: 'sync_required' })}\n\n`);
      } catch (e) {
        // Ignored. Client likely disconnected.
      }
    });
  }

  // Use SQLite database (support DATABASE_PATH env var for persistent docker volumes)
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'albait.db');
  const db = new SQLiteDatabase(dbPath);
  db.init();

  // Middlewares
  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const uid = req.headers['x-user-uid'];
    const token = req.headers['x-auth-token'];

    if (typeof uid !== 'string' || typeof token !== 'string' || !uid || !token) {
      return res.status(401).json({ error: '⚠️ غير مصرح بالدخول: يرجى تسجيل الدخول مجدداً' });
    }

    const user = db.getUser(uid, token);
    if (!user) {
      return res.status(401).json({ error: '⚠️ غير مصرح بالدخول: رمز الحماية غير صالح أو منتهي الصلاحية' });
    }

    res.setHeader('Cache-Control', 'no-store');
    (req as any).authUser = user;
    (req as any).authToken = token;
    next();
  };

  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    requireAuth(req, res, () => {
      const user = (req as any).authUser;
      if (!user || !process.env.PLATFORM_ADMIN_UID || user.uid !== process.env.PLATFORM_ADMIN_UID) {
        return res.status(403).json({ error: 'صلاحيات الأدمن غير متوفرة لهذا الحساب 🔒' });
      }
      next();
    });
  };

  // Login Limiter: 10 attempts every 15 minutes
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'محاولات كثيرة جداً، يرجى المحاولة لاحقاً بعد قليل' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // EventSource cannot send custom headers. Give it a short-lived, one-use
  // ticket instead of exposing the reusable session token in a URL.
  const syncTickets = new Map<string, { uid: string; token: string; expiresAt: number }>();
  app.post('/api/sync/ticket', requireAuth, (req, res) => {
    const now = Date.now();
    for (const [ticket, value] of syncTickets) {
      if (value.expiresAt <= now) syncTickets.delete(ticket);
    }
    const uid = (req as any).authUser.uid;
    for (const [ticket, value] of syncTickets) {
      if (value.token === (req as any).authToken) syncTickets.delete(ticket);
    }
    if (syncTickets.size >= 10000) return res.status(503).json({ error: 'يرجى المحاولة لاحقاً' });
    const ticket = newToken();
    syncTickets.set(hashToken(ticket), { uid, token: (req as any).authToken, expiresAt: now + 30000 });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ticket });
  });

  app.get('/api/sync/stream', (req, res) => {
    const ticket = typeof req.query.ticket === 'string' ? req.query.ticket : '';
    const credentials = syncTickets.get(hashToken(ticket));
    syncTickets.delete(hashToken(ticket));
    if (!credentials || credentials.expiresAt <= Date.now() || !db.getUser(credentials.uid, credentials.token)) {
      return res.status(401).json({ error: 'الجلسة منتهية' });
    }
    const { uid, token } = credentials;
    if (syncClients.filter(c => c.uid === uid).length >= 5) return res.status(429).end();
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Connection', 'keep-alive');
    const clientId = crypto.randomUUID();
    syncClients.push({ id: clientId, uid, token, res });
    const interval = setInterval(() => {
      if (!db.getUser(uid, token)) return res.end();
      res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
    }, 25000);
    req.on('close', () => {
      clearInterval(interval);
      syncClients = syncClients.filter(c => c.id !== clientId);
    });
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  });

  app.post('/api/user/logout', requireAuth, (req, res) => {
    const token = (req as any).authToken;
    db.revokeSession(token);
    for (const client of syncClients.filter(c => c.token === token)) client.res.end();
    res.json({ success: true });
  });

  // API - User Register
  app.post('/api/user/register', loginLimiter, async (req, res) => {
    try {
      const { email, name, password } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'الرجاء ملء جميع الحقول المطلوبة للتسجيل' });
      }

      const cleanEmail = normalizeEmail(email);
      const cleanName = text(name, 128, true).trim();
      text(password, 72, true);
      if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) throw new HttpError(400, 'كلمة المرور من 8 أحرف وحتى 72 بايت');

      // Check if user already exists
      const existingUser = db.getUserByEmail(cleanEmail);
      if (existingUser) {
        return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول بدلاً من ذلك' });
      }

      const uid = crypto.randomUUID(); // Secure generated unique ID
      const hashedPassword = await bcrypt.hash(password, 10);

      // Save user
      const newUser: User = {
        uid,
        email: cleanEmail,
        name: cleanName,
        password: hashedPassword,
        lastLogin: Date.now(),
        provider: 'email',
        createdAt: Date.now()
      };
      const sessionToken = db.registerUser(newUser);
      const userSettings = db.getSettings(uid);

      res.status(200).json({
        success: true,
        user: sanitizeUser(newUser),
        settings: userSettings,
        token: sessionToken,
        sessionToken
      });
    } catch (e: any) {
      console.error(e);
      res.status(e instanceof HttpError ? e.status : 500).json({ error: e instanceof HttpError ? e.message : 'حدث خطأ داخلي في الخادم' });
    }
  });

  // API - User Login
  app.post('/api/user/login', loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور' });
      }

      const cleanEmail = normalizeEmail(email);
      const user = db.getUserByEmail(cleanEmail);
      if (!user || !user.password) {
        return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      }

      text(password, 1024, true);
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      }

      const sessionToken = db.issueSession(user.uid);
      user.lastLogin = Date.now();


      let userSettings = db.getSettings(user.uid);
      if (!userSettings) {
        userSettings = getDefaultSettings(user.uid);
        db.saveSettings(userSettings);
      }

      res.status(200).json({
        success: true,
        user: sanitizeUser(user),
        settings: userSettings,
        token: sessionToken,
        sessionToken
      });
    } catch (e: any) {
      console.error(e);
      res.status(e instanceof HttpError ? e.status : 500).json({ error: e instanceof HttpError ? e.message : 'حدث خطأ داخلي في الخادم' });
    }
  });

  // API - Biometric Login with Token
  app.post('/api/user/login-with-token', loginLimiter, async (req, res) => {
    try {
      const { email, token } = req.body;
      if (!email || !token) {
        return res.status(400).json({ error: 'الرجاء إدخال البريد الإلكتروني والرمز التعريفي' });
      }

      const cleanEmail = normalizeEmail(email);
      const user = db.getUserByEmail(cleanEmail);
      text(token, 128, true);
      if (!user || !db.getUser(user.uid, token)) {
        return res.status(401).json({ error: 'رمز الدخول السريع غير صالح أو منتهي الصلاحية' });
      }

      user.lastLogin = Date.now();
      // Rotate only this device session.
      const sessionToken = db.rotateSession(user.uid, token);


      let userSettings = db.getSettings(user.uid);
      if (!userSettings) {
        userSettings = getDefaultSettings(user.uid);
        db.saveSettings(userSettings);
      }

      res.status(200).json({
        success: true,
        user: sanitizeUser(user),
        settings: userSettings,
        token: sessionToken,
        sessionToken
      });
    } catch (e: any) {
      console.error(e);
      res.status(e instanceof HttpError ? e.status : 500).json({ error: e instanceof HttpError ? e.message : 'حدث خطأ داخلي في الخادم' });
    }
  });

  // Compatibility route for cached clients: identity comes only from auth.
  app.post('/api/user/sync', requireAuth, (req, res) => {
    const user = (req as any).authUser as User;
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, user: sanitizeUser(user), settings: db.getSettings(user.uid) });
  });

  // API - Get User Transactions
  app.get('/api/transactions', requireAuth, async (req, res) => {
    try {
      const uid = (req as any).authUser.uid;
      const txs = db.getTransactions(uid);
      res.status(200).json(txs);
    } catch (e: any) {
      console.error(e);
      res.status(e instanceof HttpError ? e.status : 500).json({ error: e instanceof HttpError ? e.message : 'حدث خطأ داخلي في الخادم' });
    }
  });

  // API - Add/Update Transaction
  app.post('/api/transactions', requireAuth, async (req, res) => {
    try {
      const uid = (req as any).authUser.uid;
      const input = transactionInput(req.body);
      const user = (req as any).authUser as User;
      const existingTx = db.getTransactionById(input.id, uid);
      db.saveTransaction({
        ...input, uid, createdAt: existingTx?.createdAt ?? Date.now(),
        userEmail: user.email, userName: user.name,
      });

      notifySyncClients(uid);
      const saved = db.getTransactionById(input.id, uid);
      res.status(200).json(saved);
    } catch (e: any) {
      console.error(e);
      res.status(e instanceof HttpError ? e.status : 500).json({ error: e instanceof HttpError ? e.message : 'حدث خطأ داخلي في الخادم' });
    }
  });

  // API - Delete Transaction
  app.delete('/api/transactions/:id', requireAuth, async (req, res) => {
    try {
      const uid = (req as any).authUser.uid;
      const { id } = req.params;

      if (id === 'all') {
        db.deleteAllTransactionsForUser(uid);
      } else {
        if (!db.getTransactionById(id, uid)) throw new HttpError(404, 'السجل غير متاح');
        db.deleteTransaction(id, uid);
      }
      notifySyncClients(uid);
      res.status(200).json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(e instanceof HttpError ? e.status : 500).json({ error: e instanceof HttpError ? e.message : 'حدث خطأ داخلي في الخادم' });
    }
  });

  // API - Get Recurring Bills
  app.get('/api/recurring-bills', requireAuth, async (req, res) => {
    try {
      const uid = (req as any).authUser.uid;
      const bills = db.getRecurringBills(uid);
      res.status(200).json(bills);
    } catch (e: any) {
      console.error(e);
      res.status(e instanceof HttpError ? e.status : 500).json({ error: e instanceof HttpError ? e.message : 'حدث خطأ داخلي في الخادم' });
    }
  });

  // API - Add/Update Recurring Bill
  app.post('/api/recurring-bills', requireAuth, async (req, res) => {
    try {
      const uid = (req as any).authUser.uid;
      const input = billInput(req.body);
      const existingBill = db.getRecurringBills(uid).find(b => b.id === input.id);
      db.saveRecurringBill({ ...input, uid, createdAt: existingBill?.createdAt ?? Date.now() });

      notifySyncClients(uid);
      const saved = db.getRecurringBills(uid).find(b => b.id === input.id);
      res.status(200).json(saved);
    } catch (e: any) {
      console.error(e);
      res.status(e instanceof HttpError ? e.status : 500).json({ error: e instanceof HttpError ? e.message : 'حدث خطأ داخلي في الخادم' });
    }
  });

  // API - Delete Recurring Bill
  app.delete('/api/recurring-bills/:id', requireAuth, async (req, res) => {
    try {
      const uid = (req as any).authUser.uid;
      const { id } = req.params;

      if (!db.getRecurringBills(uid).some(b => b.id === id)) throw new HttpError(404, 'السجل غير متاح');
      db.deleteRecurringBill(id, uid);
      notifySyncClients(uid);
      res.status(200).json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(e instanceof HttpError ? e.status : 500).json({ error: e instanceof HttpError ? e.message : 'حدث خطأ داخلي في الخادم' });
    }
  });

  // API - Get Settings
  app.get('/api/settings', requireAuth, async (req, res) => {
    try {
      const uid = (req as any).authUser.uid;

      let config = db.getSettings(uid);
      if (!config) {
        config = getDefaultSettings(uid);
        db.saveSettings(config);
      }
      res.status(200).json(config);
    } catch (e: any) {
      console.error(e);
      res.status(e instanceof HttpError ? e.status : 500).json({ error: e instanceof HttpError ? e.message : 'حدث خطأ داخلي في الخادم' });
    }
  });

  // API - Save Settings
  app.post('/api/settings', requireAuth, async (req, res) => {
    try {
      const uid = (req as any).authUser.uid;
      const newSettings = settingsInput(req.body, uid);

      db.saveSettings(newSettings);
      notifySyncClients(uid);
      res.status(200).json(newSettings);
    } catch (e: any) {
      console.error(e);
      res.status(e instanceof HttpError ? e.status : 500).json({ error: e instanceof HttpError ? e.message : 'حدث خطأ داخلي في الخادم' });
    }
  });

  // API - Export JSON User Bundle
  app.get('/api/export', requireAuth, async (req, res) => {
    try {
      const uid = (req as any).authUser.uid;
      const user = (req as any).authUser;
      const txs = db.getTransactions(uid);
      const conf = db.getSettings(uid);

      const bundle = {
        exportedAt: new Date().toISOString(),
        databaseType: 'SQLite',
        user: sanitizeUser(user),
        settings: conf || {},
        transactions: txs || [],
        recurring_bills: db.getRecurringBills(uid)
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=albait-${uid}-backup.json`);
      res.status(200).json(bundle);
    } catch (e: any) {
      console.error(e);
      res.status(e instanceof HttpError ? e.status : 500).json({ error: e instanceof HttpError ? e.message : 'حدث خطأ داخلي في الخادم' });
    }
  });

  // API - Import JSON back into Database
  app.post('/api/import', requireAuth, async (req, res) => {
    try {
      const uid = (req as any).authUser.uid;
      const body = object(req.body);
      const user = (req as any).authUser as User;
      if (body.mode !== undefined && body.mode !== 'merge' && body.mode !== 'replace') throw new HttpError(400, 'وضع استيراد غير صالح');
      const settings = body.settings === undefined ? undefined : settingsInput(body.settings, uid);
      const validateRows = (rows: unknown) => {
        if (!Array.isArray(rows) || rows.length > 10000) throw new HttpError(400, 'عدد السجلات أو نوعها غير صالح');
        return rows;
      };
      const importedTxs: Transaction[] | undefined = body.transactions === undefined ? undefined : validateRows(body.transactions).map(row => {
        const tx = object(row);
        const input = transactionInput({ ...tx, id: tx.id ?? crypto.randomUUID() });
        return { ...input, uid, createdAt: tx.createdAt === undefined ? Date.now() : integer(tx.createdAt, 0, Number.MAX_SAFE_INTEGER), userEmail: user.email, userName: user.name };
      });
      const importedBills: RecurringBill[] | undefined = body.recurring_bills === undefined ? undefined : validateRows(body.recurring_bills).map(row => {
        const bill = object(row);
        const input = billInput({ ...bill, id: bill.id ?? crypto.randomUUID() });
        return { ...input, uid, createdAt: bill.createdAt === undefined ? Date.now() : integer(bill.createdAt, 0, Number.MAX_SAFE_INTEGER) };
      });
      for (const rows of [importedTxs, importedBills]) {
        if (rows && new Set(rows.map(row => row.id)).size !== rows.length) throw new HttpError(400, 'معرفات مكررة في ملف الاستيراد');
      }
      if (!settings && !importedTxs && !importedBills) throw new HttpError(400, 'ملف استيراد فارغ');
      db.restoreUserBundle(uid, settings, importedTxs, importedBills, body.mode === 'replace');
      notifySyncClients(uid);
      res.json({ success: true, count: importedTxs?.length ?? 0, billCount: importedBills?.length ?? 0 });
    } catch (e: any) {
      console.error(e);
      res.status(e instanceof HttpError ? e.status : 500).json({ error: e instanceof HttpError ? e.message : 'حدث خطأ داخلي في الخادم' });
    }
  });

  // Platform operations receive counts only; family roles will be separate.
  app.get('/api/admin/stats', requireAdmin, (_req, res) => res.json(db.getAggregateStats()));
  app.post(['/api/admin/clear-user', '/api/admin/delete-txn'], requireAdmin, (_req, res) => {
    res.status(410).json({ error: 'إدارة المنصة لا تملك صلاحية حذف المعاملات الشخصية' });
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'المسار غير موجود' }));

  // Integration with Vite inside development mode
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    console.log('Running in DEVELOPMENT mode with Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running in PRODUCTION mode, serving static client files...');
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT ?? 3000);
  const server = app.listen(port, '0.0.0.0', () => {
    const address = server.address();
    console.log(`Server listening at http://0.0.0.0:${typeof address === 'object' && address ? address.port : port}`);
  });
}

startServer().catch(err => {
  console.error('Fatal error during server startup:', err);
  process.exitCode = 1;
});
