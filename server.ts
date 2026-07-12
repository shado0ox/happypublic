import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

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

class JSONDatabase {
  private filePath: string;
  public users: User[] = [];
  public transactions: Transaction[] = [];
  public settings: Setting[] = [];
  public recurring_bills: RecurringBill[] = [];
  private lock: Promise<void> = Promise.resolve();

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async init() {
    console.log(`Initialising JSON database at: ${this.filePath}`);
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
        console.log(`Created database directory: ${dir}`);
      }
    } catch (err) {
      console.error(`Failed to ensure directory exists for database file:`, err);
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const fileContent = await fs.promises.readFile(this.filePath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        this.users = parsed.users || [];
        this.transactions = parsed.transactions || [];
        this.settings = parsed.settings || [];
        this.recurring_bills = parsed.recurring_bills || [];
        console.log(`Successfully loaded JSON database: ${this.users.length} users, ${this.transactions.length} transactions, ${this.settings.length} settings, ${this.recurring_bills.length} recurring_bills`);
      } catch (err) {
        console.error('Failed to parse JSON file, starting fresh:', err);
        await this.save();
      }
    } else {
      await this.save();
    }
  }

  async save() {
    this.lock = this.lock.then(async () => {
      try {
        const payload = JSON.stringify({
          users: this.users,
          transactions: this.transactions,
          settings: this.settings,
          recurring_bills: this.recurring_bills
        }, null, 2);
        const tempPath = this.filePath + '.tmp';
        await fs.promises.writeFile(tempPath, payload, 'utf-8');
        await fs.promises.rename(tempPath, this.filePath);
      } catch (err) {
        console.error('Failed to save JSON Database safely:', err);
      }
    });
    return this.lock;
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

  // Use JSON file (support DATABASE_PATH env var for persistent docker volumes)
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'albait.json');
  const db = new JSONDatabase(dbPath);
  await db.init();

  // Middlewares
  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const uid = (req.headers['x-user-uid'] as string) || (req.query.uid as string);
    const token = (req.headers['x-auth-token'] as string) || (req.query.token as string);

    if (!uid || !token) {
      return res.status(401).json({ error: '⚠️ غير مصرح بالدخول: يرجى تسجيل الدخول مجدداً' });
    }

    const user = db.users.find(u => u.uid === uid && u.token === token);
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

    const user = db.users.find(u => u.uid === uid && u.token === token);
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
      const existingUser = db.users.find(u => u.email === cleanEmail);
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
      db.users.push(newUser);

      // Create settings
      const hasSettings = db.settings.some(s => s.uid === uid);
      if (!hasSettings) {
        db.settings.push(getDefaultSettings(uid));
      }

      await db.save();

      res.status(200).json({
        success: true,
        user: sanitizeUser(newUser),
        settings: db.settings.find(s => s.uid === uid),
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
      const user = db.users.find(u => u.email === cleanEmail);
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

      let userSettings = db.settings.find(s => s.uid === user.uid);
      if (!userSettings) {
        userSettings = getDefaultSettings(user.uid);
        db.settings.push(userSettings);
      }

      await db.save();
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
      const user = db.users.find(u => u.email === cleanEmail && u.token === token);
      if (!user) {
        return res.status(401).json({ error: 'رمز الدخول السريع غير صالح أو منتهي الصلاحية' });
      }

      user.lastLogin = Date.now();
      // Rotate token on successful usage for extra security
      const sessionToken = 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      user.token = sessionToken;

      let userSettings = db.settings.find(s => s.uid === user.uid);
      if (!userSettings) {
        userSettings = getDefaultSettings(user.uid);
        db.settings.push(userSettings);
      }

      await db.save();
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
      const existingUserIdx = db.users.findIndex(u => u.uid === uid);
      let sessionToken = '';
      if (existingUserIdx !== -1) {
        const existingUser = db.users[existingUserIdx];
        if (!existingUser.token) {
          existingUser.token = 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        }
        sessionToken = existingUser.token;
        db.users[existingUserIdx] = {
          ...existingUser,
          email: cleanEmail,
          name: cleanName,
          lastLogin: Date.now(),
          provider: provider || 'email'
        };
      } else {
        sessionToken = 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        db.users.push({
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
      let userSettings = db.settings.find(s => s.uid === uid);
      if (!userSettings) {
        userSettings = getDefaultSettings(uid);
        db.settings.push(userSettings);
      }

      await db.save();

      const userProfile = db.users.find(u => u.uid === uid);
      const finalSettings = db.settings.find(s => s.uid === uid);

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
      const txs = db.transactions
        .filter(tx => tx.uid === uid)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
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

      const existingIdx = db.transactions.findIndex(tx => tx.id === id && tx.uid === uid);
      if (existingIdx !== -1) {
        db.transactions[existingIdx] = {
          ...db.transactions[existingIdx],
          type,
          amount: parsedAmount,
          source: source || null,
          category: category || null,
          date,
          note: note || ''
        };
      } else {
        db.transactions.push({
          id,
          uid,
          type,
          amount: parsedAmount,
          source: source || null,
          category: category || null,
          date,
          note: note || '',
          createdAt: Date.now(),
          userEmail: userEmail || '',
          userName: userName || ''
        });
      }

      await db.save();
      notifySyncClients(uid);
      const saved = db.transactions.find(tx => tx.id === id && tx.uid === uid);
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
        db.transactions = db.transactions.filter(tx => tx.uid !== uid);
      } else {
        db.transactions = db.transactions.filter(tx => !(tx.id === id && tx.uid === uid));
      }
      await db.save();
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
      const bills = db.recurring_bills
        .filter(b => b.uid === uid)
        .sort((a, b) => a.dayOfMonth - b.dayOfMonth || b.createdAt - a.createdAt);
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

      const existingIdx = db.recurring_bills.findIndex(b => b.id === id && b.uid === uid);
      if (existingIdx !== -1) {
        db.recurring_bills[existingIdx] = {
          ...db.recurring_bills[existingIdx],
          title,
          amount: parsedAmount,
          category,
          dayOfMonth: dayOfMonth || 1
        };
      } else {
        db.recurring_bills.push({
          id,
          uid,
          title,
          amount: parsedAmount,
          category,
          dayOfMonth: dayOfMonth || 1,
          createdAt: Date.now()
        });
      }

      await db.save();
      notifySyncClients(uid);
      const saved = db.recurring_bills.find(b => b.id === id && b.uid === uid);
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

      db.recurring_bills = db.recurring_bills.filter(b => !(b.id === id && b.uid === uid));
      await db.save();
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

      let config = db.settings.find(s => s.uid === uid);
      if (!config) {
        config = getDefaultSettings(uid);
        db.settings.push(config);
        await db.save();
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

      const idx = db.settings.findIndex(s => s.uid === uid);
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

      if (idx !== -1) {
        db.settings[idx] = newSettings;
      } else {
        db.settings.push(newSettings);
      }

      await db.save();
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
      const txs = db.transactions.filter(tx => tx.uid === uid);
      const conf = db.settings.find(s => s.uid === uid);

      const bundle = {
        exportedAt: new Date().toISOString(),
        databaseType: 'JSON',
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
        const idx = db.settings.findIndex(s => s.uid === uid);
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

        if (idx !== -1) {
          db.settings[idx] = newSettings;
        } else {
          db.settings.push(newSettings);
        }
      }

      // Restore transactions
      if (Array.isArray(importedTxs)) {
        // Clear current ones first
        db.transactions = db.transactions.filter(tx => tx.uid !== uid);

        for (const tx of importedTxs) {
          const txId = tx.id || `${uid}_import_${Math.random().toString(36).substring(2, 11)}`;
          db.transactions.push({
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

      await db.save();
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
        users: db.users.map(sanitizeUser),
        transactions: db.transactions
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

      db.transactions = db.transactions.filter(tx => tx.uid !== targetUid);
      await db.save();
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

      const txnObj = db.transactions.find(tx => tx.id === txnId);
      const targetUid = txnObj ? txnObj.uid : '';
      db.transactions = db.transactions.filter(tx => tx.id !== txnId);
      await db.save();
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
