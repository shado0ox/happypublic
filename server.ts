import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Database from 'better-sqlite3';

// Global Constants
const ADMIN_EMAIL = 'shady.nasif@gmail.com';

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
    `);

    // Run Migration from JSON if JSON file exists and has data
    const jsonPath = path.join(path.dirname(this.filePath), 'albait.json');
    if (fs.existsSync(jsonPath)) {
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
        console.error(`Migration from JSON database failed:`, err);
      }
    }
  }

  // User queries
  getUser(uid: string, token: string): User | null {
    const row = this.db.prepare(`SELECT * FROM users WHERE uid = ? AND token = ?`).get(uid, token) as any;
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

  getAllUsers(): User[] {
    const rows = this.db.prepare(`SELECT * FROM users`).all() as any[];
    return rows.map(row => ({
      uid: row.uid,
      email: row.email,
      name: row.name,
      password: row.password || undefined,
      lastLogin: row.lastLogin,
      provider: row.provider,
      createdAt: row.createdAt,
      token: row.token || undefined,
      seeded: !!row.seeded
    }));
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

  updateUserTokenAndLogin(uid: string, token: string, lastLogin: number) {
    this.db.prepare(`UPDATE users SET token = ?, lastLogin = ? WHERE uid = ?`).run(token, lastLogin, uid);
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

  getAllTransactions(): Transaction[] {
    const rows = this.db.prepare(`SELECT * FROM transactions`).all() as any[];
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

  getTransactionById(id: string): Transaction | null {
    const r = this.db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(id) as any;
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
    this.db.prepare(`
      INSERT INTO transactions (id, uid, type, amount, source, category, date, note, createdAt, userEmail, userName)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        amount = excluded.amount,
        source = excluded.source,
        category = excluded.category,
        date = excluded.date,
        note = excluded.note
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
  }

  deleteTransaction(id: string, uid: string) {
    this.db.prepare(`DELETE FROM transactions WHERE id = ? AND uid = ?`).run(id, uid);
  }

  deleteAllTransactionsForUser(uid: string) {
    this.db.prepare(`DELETE FROM transactions WHERE uid = ?`).run(uid);
  }

  deleteTransactionAdmin(id: string) {
    this.db.prepare(`DELETE FROM transactions WHERE id = ?`).run(id);
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
    this.db.prepare(`
      INSERT INTO recurring_bills (id, uid, title, amount, category, dayOfMonth, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        amount = excluded.amount,
        category = excluded.category,
        dayOfMonth = excluded.dayOfMonth
    `).run(b.id, b.uid, b.title, b.amount, b.category, b.dayOfMonth, b.createdAt);
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
  const { password, ...safeUser } = user;
  return safeUser;
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-uid, x-auth-token, x-admin-email');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // Connection tracking for Real-time Device-to-Device Sync
  interface SyncClient {
    id: string;
    uid: string;
    res: any;
  }
  let syncClients: SyncClient[] = [];

  function notifySyncClients(uid: string) {
    const clients = syncClients.filter(c => c.uid === uid);
    console.log(`Broadcasting sync event to ${clients.length} clients for user ${uid}`);
    clients.forEach(client => {
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
    const uid = (req.headers['x-user-uid'] as string) || (req.query.uid as string);
    const token = (req.headers['x-auth-token'] as string) || (req.query.token as string);

    if (!uid || !token) {
      return res.status(401).json({ error: '⚠️ غير مصرح بالدخول: يرجى تسجيل الدخول مجدداً' });
    }

    const user = db.getUser(uid, token);
    if (!user) {
      return res.status(401).json({ error: '⚠️ غير مصرح بالدخول: رمز الحماية غير صالح أو منتهي الصلاحية' });
    }

    (req as any).authUser = user;
    next();
  };

  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    requireAuth(req, res, () => {
      const user = (req as any).authUser;
      if (!user || user.email !== ADMIN_EMAIL) {
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

  // API - Real-time Device Sync subscription
  app.get('/api/sync/stream', (req, res) => {
    const uid = req.query.uid as string;
    const token = req.query.token as string;

    if (!uid || !token) {
      res.status(401).send('Authentication credentials are required');
      return;
    }

    const user = db.getUser(uid, token);
    if (!user) {
      res.status(401).send('Invalid credentials');
      return;
    }

    // Connections limit: Max 5 concurrent connections per user
    const existingConnectionsCount = syncClients.filter(c => c.uid === uid).length;
    if (existingConnectionsCount >= 5) {
      res.status(429).send('Too many active connections for this account');
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const clientId = Math.random().toString(36).substring(2);
    const newClient = { id: clientId, uid, res };
    syncClients.push(newClient);

    // Write periodic ping to keep the link alive (e.g. proxy connections)
    const keepAliveInterval = setInterval(() => {
      try {
        res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
      } catch (err) {
        // Ignored.
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAliveInterval);
      syncClients = syncClients.filter(c => c.id !== clientId);
    });

    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  });

  // API - User Register
  app.post('/api/user/register', async (req, res) => {
    try {
      const { email, name, password } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'الرجاء ملء جميع الحقول المطلوبة للتسجيل' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const cleanName = name.trim();

      // Check if user already exists
      const existingUser = db.getUserByEmail(cleanEmail);
      if (existingUser) {
        return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول بدلاً من ذلك' });
      }

      const uid = crypto.randomUUID(); // Secure generated unique ID
      const sessionToken = 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      const hashedPassword = await bcrypt.hash(password, 10);

      // Save user
      const newUser: User = {
        uid,
        email: cleanEmail,
        name: cleanName,
        password: hashedPassword,
        lastLogin: Date.now(),
        provider: 'email',
        createdAt: Date.now(),
        token: sessionToken
      };
      db.createUser(newUser);

      // Create settings
      let userSettings = db.getSettings(uid);
      if (!userSettings) {
        userSettings = getDefaultSettings(uid);
        db.saveSettings(userSettings);
      }

      res.status(200).json({
        success: true,
        user: sanitizeUser(newUser),
        settings: userSettings,
        token: sessionToken,
        sessionToken
      });
    } catch (e: any) {
      console.error(e);
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: isProd ? 'حدث خطأ داخلي في الخادم' : e.message });
    }
  });

  // API - User Login
  app.post('/api/user/login', loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const user = db.getUserByEmail(cleanEmail);
      if (!user || !user.password) {
        return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      }

      const sessionToken = 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      user.lastLogin = Date.now();
      user.token = sessionToken;
      db.updateUserTokenAndLogin(user.uid, sessionToken, user.lastLogin);

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
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: isProd ? 'حدث خطأ داخلي في الخادم' : e.message });
    }
  });

  // API - Biometric Login with Token
  app.post('/api/user/login-with-token', async (req, res) => {
    try {
      const { email, token } = req.body;
      if (!email || !token) {
        return res.status(400).json({ error: 'الرجاء إدخال البريد الإلكتروني والرمز التعريفي' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const user = db.getUserByEmail(cleanEmail);
      if (!user || user.token !== token) {
        return res.status(401).json({ error: 'رمز الدخول السريع غير صالح أو منتهي الصلاحية' });
      }

      user.lastLogin = Date.now();
      // Rotate token on successful usage for extra security
      const sessionToken = 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      user.token = sessionToken;
      db.updateUserTokenAndLogin(user.uid, sessionToken, user.lastLogin);

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
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: isProd ? 'حدث خطأ داخلي في الخادم' : e.message });
    }
  });

  // API - User Sync & Profile Store
  app.post('/api/user/sync', async (req, res) => {
    try {
      const { uid, email, name, provider } = req.body;
      if (!uid) {
        return res.status(400).json({ error: 'UID is required' });
      }

      const cleanEmail = email || `${uid}@albait.local`;
      const cleanName = name || cleanEmail.split('@')[0] || 'مستخدم البيت';

      // Insert or update user
      const existingUser = db.getUserByUid(uid);
      let sessionToken = '';
      if (existingUser) {
        if (!existingUser.token) {
          existingUser.token = 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        }
        sessionToken = existingUser.token;
        const updatedUser: User = {
          ...existingUser,
          email: cleanEmail,
          name: cleanName,
          lastLogin: Date.now(),
          provider: provider || 'email',
          token: sessionToken
        };
        db.createUser(updatedUser);
      } else {
        sessionToken = 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        db.createUser({
          uid,
          email: cleanEmail,
          name: cleanName,
          lastLogin: Date.now(),
          provider: provider || 'email',
          createdAt: Date.now(),
          token: sessionToken
        });
      }

      // Check if user has settings
      let userSettings = db.getSettings(uid);
      if (!userSettings) {
        userSettings = getDefaultSettings(uid);
        db.saveSettings(userSettings);
      }

      const userProfile = db.getUserByUid(uid);
      const finalSettings = db.getSettings(uid);

      res.status(200).json({
        success: true,
        user: userProfile ? sanitizeUser(userProfile) : null,
        settings: finalSettings,
        token: sessionToken,
        sessionToken
      });
    } catch (e: any) {
      console.error(e);
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: isProd ? 'حدث خطأ داخلي في الخادم' : e.message });
    }
  });

  // API - Get User Transactions
  app.get('/api/transactions', requireAuth, async (req, res) => {
    try {
      const uid = (req as any).authUser.uid;
      const txs = db.getTransactions(uid);
      res.status(200).json(txs);
    } catch (e: any) {
      console.error(e);
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: isProd ? 'حدث خطأ داخلي في الخادم' : e.message });
    }
  });

  // API - Add/Update Transaction
  app.post('/api/transactions', requireAuth, async (req, res) => {
    try {
      const uid = (req as any).authUser.uid;
      const { id, type, amount, source, category, date, note, userEmail, userName } = req.body;

      if (!id || !type || amount === undefined || !date) {
        return res.status(400).json({ error: 'Missing required transaction fields' });
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'المبلغ المدخل غير صالح' });
      }

      const existingTx = db.getTransactionById(id);
      const newTx: Transaction = {
        id,
        uid,
        type,
        amount: parsedAmount,
        source: source || null,
        category: category || null,
        date,
        note: note || '',
        createdAt: existingTx ? existingTx.createdAt : Date.now(),
        userEmail: userEmail || '',
        userName: userName || ''
      };
      db.saveTransaction(newTx);

      notifySyncClients(uid);
      const saved = db.getTransactionById(id);
      res.status(200).json(saved);
    } catch (e: any) {
      console.error(e);
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: isProd ? 'حدث خطأ داخلي في الخادم' : e.message });
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
        db.deleteTransaction(id, uid);
      }
      notifySyncClients(uid);
      res.status(200).json({ success: true });
    } catch (e: any) {
      console.error(e);
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: isProd ? 'حدث خطأ داخلي في الخادم' : e.message });
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
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: isProd ? 'حدث خطأ داخلي في الخادم' : e.message });
    }
  });

  // API - Add/Update Recurring Bill
  app.post('/api/recurring-bills', requireAuth, async (req, res) => {
    try {
      const uid = (req as any).authUser.uid;
      const { id, title, amount, category, dayOfMonth } = req.body;

      if (!id || !title || amount === undefined || !category) {
        return res.status(400).json({ error: 'Missing required recurring bill fields' });
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'المبلغ المدخل غير صالح' });
      }

      const existingBills = db.getRecurringBills(uid);
      const existingBill = existingBills.find(b => b.id === id);
      const newBill: RecurringBill = {
        id,
        uid,
        title,
        amount: parsedAmount,
        category,
        dayOfMonth: dayOfMonth || 1,
        createdAt: existingBill ? existingBill.createdAt : Date.now()
      };
      db.saveRecurringBill(newBill);

      notifySyncClients(uid);
      const saved = db.getRecurringBills(uid).find(b => b.id === id);
      res.status(200).json(saved);
    } catch (e: any) {
      console.error(e);
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: isProd ? 'حدث خطأ داخلي في الخادم' : e.message });
    }
  });

  // API - Delete Recurring Bill
  app.delete('/api/recurring-bills/:id', requireAuth, async (req, res) => {
    try {
      const uid = (req as any).authUser.uid;
      const { id } = req.params;

      db.deleteRecurringBill(id, uid);
      notifySyncClients(uid);
      res.status(200).json({ success: true });
    } catch (e: any) {
      console.error(e);
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: isProd ? 'حدث خطأ داخلي في الخادم' : e.message });
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
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: isProd ? 'حدث خطأ داخلي في الخادم' : e.message });
    }
  });

  // API - Save Settings
  app.post('/api/settings', requireAuth, async (req, res) => {
    try {
      const uid = (req as any).authUser.uid;
      const {
        currency,
        cycleStart,
        sortOrder,
        defaultFilter,
        defaultCategory,
        defaultSource,
        showMotivation,
        showCharts,
        autoHome,
        confirmDelete,
        realTimeSync,
        enableSounds,
        language,
        useHijri
      } = req.body;

      const dbShowMotivation = showMotivation ? 1 : 0;
      const dbShowCharts = showCharts ? 1 : 0;
      const dbAutoHome = autoHome ? 1 : 0;
      const dbConfirmDelete = confirmDelete ? 1 : 0;
      const dbRealTimeSync = realTimeSync !== undefined ? (realTimeSync ? 1 : 0) : 1;
      const dbEnableSounds = enableSounds !== undefined ? (enableSounds ? 1 : 0) : 1;
      const dbUseHijri = useHijri !== undefined ? (useHijri ? 1 : 0) : 1;

      const newSettings: Setting = {
        uid,
        currency: currency || 'ر.س',
        cycleStart: parseInt(cycleStart) || 1,
        sortOrder: sortOrder || 'desc',
        defaultFilter: defaultFilter || 'all',
        defaultCategory: defaultCategory || 'طعام وشراب',
        defaultSource: defaultSource || 'راتب',
        showMotivation: dbShowMotivation,
        showCharts: dbShowCharts,
        autoHome: dbAutoHome,
        confirmDelete: dbConfirmDelete,
        realTimeSync: dbRealTimeSync,
        enableSounds: dbEnableSounds,
        language: language || 'ar',
        useHijri: dbUseHijri
      };

      db.saveSettings(newSettings);
      notifySyncClients(uid);
      res.status(200).json(newSettings);
    } catch (e: any) {
      console.error(e);
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: isProd ? 'حدث خطأ داخلي في الخادم' : e.message });
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
        transactions: txs || []
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=albait-${uid}-backup.json`);
      res.status(200).json(bundle);
    } catch (e: any) {
      console.error(e);
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: isProd ? 'حدث خطأ داخلي في الخادم' : e.message });
    }
  });

  // API - Import JSON back into Database
  app.post('/api/import', requireAuth, async (req, res) => {
    try {
      const uid = (req as any).authUser.uid;
      const { settings, transactions: importedTxs } = req.body;

      // Restore settings
      if (settings) {
        const newSettings: Setting = {
          uid,
          currency: settings.currency || 'ر.س',
          cycleStart: settings.cycleStart || 1,
          sortOrder: settings.sortOrder || 'desc',
          defaultFilter: settings.defaultFilter || 'all',
          defaultCategory: settings.defaultCategory || 'طعام وشراب',
          defaultSource: settings.defaultSource || 'راتب',
          showMotivation: settings.showMotivation !== undefined ? (settings.showMotivation ? 1 : 0) : 1,
          showCharts: settings.showCharts !== undefined ? (settings.showCharts ? 1 : 0) : 1,
          autoHome: settings.autoHome !== undefined ? (settings.autoHome ? 1 : 0) : 1,
          confirmDelete: settings.confirmDelete !== undefined ? (settings.confirmDelete ? 1 : 0) : 1,
          realTimeSync: settings.realTimeSync !== undefined ? (settings.realTimeSync ? 1 : 0) : 1,
          enableSounds: settings.enableSounds !== undefined ? (settings.enableSounds ? 1 : 0) : 1,
          language: settings.language || 'ar',
          useHijri: settings.useHijri !== undefined ? (settings.useHijri ? 1 : 0) : 1
        };
        db.saveSettings(newSettings);
      }

      // Restore transactions
      if (Array.isArray(importedTxs)) {
        // Clear current ones first
        db.deleteAllTransactionsForUser(uid);

        for (const tx of importedTxs) {
          const txId = tx.id || `${uid}_import_${Math.random().toString(36).substring(2, 11)}`;
          db.saveTransaction({
            id: txId,
            uid,
            type: tx.type || 'expense',
            amount: parseFloat(tx.amount || 0),
            source: tx.source || null,
            category: tx.category || null,
            date: tx.date || new Date().toISOString().split('T')[0],
            note: tx.note || '',
            createdAt: tx.createdAt || Date.now(),
            userEmail: tx.userEmail || '',
            userName: tx.userName || ''
          });
        }
      }

      res.status(200).json({ success: true, count: Array.isArray(importedTxs) ? importedTxs.length : 0 });
    } catch (e: any) {
      console.error(e);
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: isProd ? 'حدث خطأ داخلي في الخادم' : e.message });
    }
  });

  // API - Admin Stats (RESTRICTED to requireAdmin)
  app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
      res.status(200).json({
        users: db.getAllUsers().map(sanitizeUser),
        transactions: db.getAllTransactions()
      });
    } catch (e: any) {
      console.error(e);
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: isProd ? 'حدث خطأ داخلي في الخادم' : e.message });
    }
  });

  // API - Admin Clear User
  app.post('/api/admin/clear-user', requireAdmin, async (req, res) => {
    try {
      const { targetUid } = req.body;
      if (!targetUid) {
        return res.status(400).json({ error: 'Target user ID is required' });
      }

      db.deleteAllTransactionsForUser(targetUid);
      notifySyncClients(targetUid);
      res.status(200).json({ success: true });
    } catch (e: any) {
      console.error(e);
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: isProd ? 'حدث خطأ داخلي في الخادم' : e.message });
    }
  });

  // API - Admin Delete Single Txn
  app.post('/api/admin/delete-txn', requireAdmin, async (req, res) => {
    try {
      const { txnId } = req.body;
      if (!txnId) {
        return res.status(400).json({ error: 'Transaction ID is required' });
      }

      const txnObj = db.getTransactionById(txnId);
      const targetUid = txnObj ? txnObj.uid : '';
      db.deleteTransactionAdmin(txnId);
      if (targetUid) {
        notifySyncClients(targetUid);
      }
      res.status(200).json({ success: true });
    } catch (e: any) {
      console.error(e);
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: isProd ? 'حدث خطأ داخلي في الخادم' : e.message });
    }
  });

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

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server listening at http://0.0.0.0:${port}`);
  });
}

startServer().catch(err => {
  console.error('Fatal error during server startup:', err);
});
