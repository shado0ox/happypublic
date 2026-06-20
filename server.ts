import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface User {
  uid: string;
  email: string;
  name: string;
  password?: string;
  lastLogin: number;
  provider: string;
  createdAt: number;
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

async function startServer() {
  const app = express();
  app.use(express.json());

  // Use JSON file in working directory
  const dbPath = path.join(process.cwd(), 'albait.json');
  const db = new JSONDatabase(dbPath);
  await db.init();

  // Simple seeding helper for any new user (or user with no transactions)
  async function seedUserTransactions(uid: string, email: string, name: string) {
    const hasTransactions = db.transactions.some(tx => tx.uid === uid);
    if (hasTransactions) return; // Already has transactions

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');

    const demoTxns: Transaction[] = [
      { id: `${uid}_s1`, uid, type: 'income', amount: 12000, source: 'راتب', category: null, date: `${y}-${m}-01`, note: 'راتب الشهر الأساسي', createdAt: Date.now() - 864000000, userEmail: email, userName: name },
      { id: `${uid}_e1`, uid, type: 'expense', amount: 850, source: null, category: 'طعام وشراب', date: `${y}-${m}-03`, note: 'مشتريات السوبرماركت الأسبوعية', createdAt: Date.now() - 777600000, userEmail: email, userName: name },
      { id: `${uid}_e2`, uid, type: 'expense', amount: 320, source: null, category: 'مواصلات', date: `${y}-${m}-05`, note: 'تعبئة بنزين السيارة', createdAt: Date.now() - 691200000, userEmail: email, userName: name },
      { id: `${uid}_e3`, uid, type: 'expense', amount: 450, source: null, category: 'كهرباء ومياه', date: `${y}-${m}-07`, note: 'سداد فاتورة الكهرباء', createdAt: Date.now() - 604800000, userEmail: email, userName: name },
      { id: `${uid}_e4`, uid, type: 'expense', amount: 200, source: null, category: 'ترفيه', date: `${y}-${m}-10`, note: 'اشتراكات ترفيهية عائلية', createdAt: Date.now() - 518400000, userEmail: email, userName: name },
      { id: `${uid}_e5`, uid, type: 'expense', amount: 1200, source: null, category: 'تعليم', date: `${y}-${m}-12`, note: 'رسوم ومستلزمات دراسية للأطفال', createdAt: Date.now() - 432000000, userEmail: email, userName: name },
      { id: `${uid}_s2`, uid, type: 'income', amount: 2000, source: 'مكافأة', category: null, date: `${y}-${m}-15`, note: 'مكافأة الإنجاز السنوية', createdAt: Date.now() - 345600000, userEmail: email, userName: name },
      { id: `${uid}_e6`, uid, type: 'expense', amount: 380, source: null, category: 'صحة وطب', date: `${y}-${m}-16`, note: 'فاتورة الصيدلية والاستشارة الطبية', createdAt: Date.now() - 259200000, userEmail: email, userName: name },
      { id: `${uid}_e7`, uid, type: 'expense', amount: 600, source: null, category: 'ملابس', date: `${y}-${m}-18`, note: 'ملابس جديدة للموسم الحالي', createdAt: Date.now() - 172800000, userEmail: email, userName: name },
      { id: `${uid}_e8`, uid, type: 'expense', amount: 250, source: null, category: 'طعام وشراب', date: `${y}-${m}-20`, note: 'عشاء للمنزل من مطعم', createdAt: Date.now() - 864000, userEmail: email, userName: name }
    ];

    db.transactions.push(...demoTxns);
    console.log(`Seeded default transactions for user: ${uid} (${email})`);

    // Seed default recurring bills
    const hasBills = db.recurring_bills.some(b => b.uid === uid);
    if (!hasBills) {
      const defaultBills: RecurringBill[] = [
        { id: `${uid}_rb1`, uid, title: 'فاتورة الكهرباء والماء', amount: 350, category: 'كهرباء ومياه', dayOfMonth: 5, createdAt: Date.now() },
        { id: `${uid}_rb2`, uid, title: 'اشتراك الإنترنت المنزلي', amount: 230, category: 'ترفيه', dayOfMonth: 10, createdAt: Date.now() },
        { id: `${uid}_rb3`, uid, title: 'قسط إيجار البيت الثابت', amount: 3000, category: 'أخرى', dayOfMonth: 1, createdAt: Date.now() }
      ];
      db.recurring_bills.push(...defaultBills);
      console.log(`Seeded default recurring bills for user: ${uid}`);
    }

    await db.save();
  }

  // API - User Register
  app.post('/api/user/register', async (req, res) => {
    try {
      const { email, name, password } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'الرجاء ملء جميع الحقول المطلوبة للتسجيل' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const uid = cleanEmail.replace(/[^a-z0-9]/g, '_');

      // Check if user already exists
      const existingUser = db.users.find(u => u.uid === uid || u.email === cleanEmail);
      if (existingUser) {
        return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول بدلاً من ذلك' });
      }

      // Save user
      const newUser: User = {
        uid,
        email: cleanEmail,
        name: name.trim(),
        password,
        lastLogin: Date.now(),
        provider: 'email',
        createdAt: Date.now()
      };
      db.users.push(newUser);

      // Create settings if not exists
      const hasSettings = db.settings.some(s => s.uid === uid);
      if (!hasSettings) {
        db.settings.push({
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
          confirmDelete: 1
        });
      }

      await db.save();

      // Seed setup transactions of the new user
      await seedUserTransactions(uid, cleanEmail, name.trim());

      const userProfile = db.users.find(u => u.uid === uid);
      const userSettings = db.settings.find(s => s.uid === uid);

      res.status(200).json({ success: true, user: userProfile, settings: userSettings });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'خطأ غير متوقع أثناء تسجيل الحساب' });
    }
  });

  // API - User Login
  app.post('/api/user/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const uid = cleanEmail.replace(/[^a-z0-9]/g, '_');

      let user = db.users.find(u => u.email === cleanEmail && u.password === password);
      if (!user) {
        // Special case for admin login
        if (cleanEmail === 'shady.nasif@gmail.com') {
          const anyAdmin = db.users.find(u => u.email === cleanEmail);
          if (anyAdmin) {
            return res.status(400).json({ error: 'كلمة المرور المدخلة غير صحيحة لحساب الأدمن' });
          } else {
            // Auto register the developer as administrator
            const newAdmin: User = {
              uid,
              email: cleanEmail,
              name: 'Shady Nassef',
              password,
              lastLogin: Date.now(),
              provider: 'email',
              createdAt: Date.now()
            };
            db.users.push(newAdmin);

            const hasSettings = db.settings.some(s => s.uid === uid);
            if (!hasSettings) {
              db.settings.push({
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
                confirmDelete: 1
              });
            }

            await db.save();
            await seedUserTransactions(uid, cleanEmail, 'Shady Nassef');

            const createdAdmin = db.users.find(u => u.uid === uid);
            const userSettings = db.settings.find(s => s.uid === uid);
            return res.status(200).json({ success: true, user: createdAdmin, settings: userSettings });
          }
        }
        return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة الكود' });
      }

      user.lastLogin = Date.now();
      let userSettings = db.settings.find(s => s.uid === user!.uid);
      if (!userSettings) {
        userSettings = {
          uid: user.uid,
          currency: 'ر.س',
          cycleStart: 1,
          sortOrder: 'desc',
          defaultFilter: 'all',
          defaultCategory: 'طعام وشراب',
          defaultSource: 'راتب',
          showMotivation: 1,
          showCharts: 1,
          autoHome: 1,
          confirmDelete: 1
        };
        db.settings.push(userSettings);
      }

      await db.save();
      res.status(200).json({ success: true, user, settings: userSettings });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'خطأ غير متوقع أثناء تسجيل الدخول' });
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
      if (existingUserIdx !== -1) {
        db.users[existingUserIdx] = {
          ...db.users[existingUserIdx],
          email: cleanEmail,
          name: cleanName,
          lastLogin: Date.now(),
          provider: provider || 'email'
        };
      } else {
        db.users.push({
          uid,
          email: cleanEmail,
          name: cleanName,
          lastLogin: Date.now(),
          provider: provider || 'email',
          createdAt: Date.now()
        });
      }

      // Check if user has settings
      let userSettings = db.settings.find(s => s.uid === uid);
      if (!userSettings) {
        userSettings = {
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
          confirmDelete: 1
        };
        db.settings.push(userSettings);
      }

      await db.save();

      // Seed mock transactions the very first time
      await seedUserTransactions(uid, cleanEmail, cleanName);

      const userProfile = db.users.find(u => u.uid === uid);
      const finalSettings = db.settings.find(s => s.uid === uid);

      res.status(200).json({ success: true, user: userProfile, settings: finalSettings });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'Error syncing user' });
    }
  });

  // API - Get User Transactions
  app.get('/api/transactions', async (req, res) => {
    try {
      const uid = req.headers['x-user-uid'] as string || req.query.uid as string;
      if (!uid) {
        return res.status(400).json({ error: 'x-user-uid header or uid query parameter is required' });
      }
      const txs = db.transactions
        .filter(tx => tx.uid === uid)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
      res.status(200).json(txs);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // API - Add/Update Transaction
  app.post('/api/transactions', async (req, res) => {
    try {
      const uid = req.headers['x-user-uid'] as string;
      const { id, type, amount, source, category, date, note, userEmail, userName } = req.body;

      if (!uid) {
        return res.status(400).json({ error: 'x-user-uid header is required' });
      }
      if (!id || !type || !amount || !date) {
        return res.status(400).json({ error: 'Missing required transaction fields' });
      }

      const existingIdx = db.transactions.findIndex(tx => tx.id === id);
      if (existingIdx !== -1) {
        db.transactions[existingIdx] = {
          ...db.transactions[existingIdx],
          type,
          amount: parseFloat(amount),
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
          amount: parseFloat(amount),
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
      const saved = db.transactions.find(tx => tx.id === id);
      res.status(200).json(saved);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // API - Delete Transaction
  app.delete('/api/transactions/:id', async (req, res) => {
    try {
      const uid = req.headers['x-user-uid'] as string;
      const { id } = req.params;

      if (!uid) {
        return res.status(400).json({ error: 'x-user-uid header is required' });
      }

      db.transactions = db.transactions.filter(tx => !(tx.id === id && tx.uid === uid));
      await db.save();
      res.status(200).json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // API - Get Recurring Bills
  app.get('/api/recurring-bills', async (req, res) => {
    try {
      const uid = req.headers['x-user-uid'] as string || req.query.uid as string;
      if (!uid) {
        return res.status(400).json({ error: 'x-user-uid header or uid query parameter is required' });
      }
      const bills = db.recurring_bills
        .filter(b => b.uid === uid)
        .sort((a, b) => a.dayOfMonth - b.dayOfMonth || b.createdAt - a.createdAt);
      res.status(200).json(bills);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // API - Add/Update Recurring Bill
  app.post('/api/recurring-bills', async (req, res) => {
    try {
      const uid = req.headers['x-user-uid'] as string;
      const { id, title, amount, category, dayOfMonth } = req.body;

      if (!uid) {
        return res.status(400).json({ error: 'x-user-uid header is required' });
      }
      if (!id || !title || !amount || !category) {
        return res.status(400).json({ error: 'Missing required recurring bill fields' });
      }

      const existingIdx = db.recurring_bills.findIndex(b => b.id === id);
      if (existingIdx !== -1) {
        db.recurring_bills[existingIdx] = {
          ...db.recurring_bills[existingIdx],
          title,
          amount: parseFloat(amount),
          category,
          dayOfMonth: dayOfMonth || 1
        };
      } else {
        db.recurring_bills.push({
          id,
          uid,
          title,
          amount: parseFloat(amount),
          category,
          dayOfMonth: dayOfMonth || 1,
          createdAt: Date.now()
        });
      }

      await db.save();
      const saved = db.recurring_bills.find(b => b.id === id);
      res.status(200).json(saved);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // API - Delete Recurring Bill
  app.delete('/api/recurring-bills/:id', async (req, res) => {
    try {
      const uid = req.headers['x-user-uid'] as string;
      const { id } = req.params;

      if (!uid) {
        return res.status(400).json({ error: 'x-user-uid header is required' });
      }

      db.recurring_bills = db.recurring_bills.filter(b => !(b.id === id && b.uid === uid));
      await db.save();
      res.status(200).json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // API - Get Settings
  app.get('/api/settings', async (req, res) => {
    try {
      const uid = req.headers['x-user-uid'] as string || req.query.uid as string;
      if (!uid) {
        return res.status(400).json({ error: 'x-user-uid header or uid query is required' });
      }

      let config = db.settings.find(s => s.uid === uid);
      if (!config) {
        config = {
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
          confirmDelete: 1
        };
        db.settings.push(config);
        await db.save();
      }
      res.status(200).json(config);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // API - Save Settings
  app.post('/api/settings', async (req, res) => {
    try {
      const uid = req.headers['x-user-uid'] as string;
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
        confirmDelete
      } = req.body;

      if (!uid) {
        return res.status(400).json({ error: 'x-user-uid header is required' });
      }

      const dbShowMotivation = showMotivation ? 1 : 0;
      const dbShowCharts = showCharts ? 1 : 0;
      const dbAutoHome = autoHome ? 1 : 0;
      const dbConfirmDelete = confirmDelete ? 1 : 0;

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
        confirmDelete: dbConfirmDelete
      };

      if (idx !== -1) {
        db.settings[idx] = newSettings;
      } else {
        db.settings.push(newSettings);
      }

      await db.save();
      res.status(200).json(newSettings);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // API - Export JSON User Bundle
  app.get('/api/export', async (req, res) => {
    try {
      const uid = req.headers['x-user-uid'] as string || req.query.uid as string;
      if (!uid) {
        return res.status(400).json({ error: 'User UID is required' });
      }

      const user = db.users.find(u => u.uid === uid);
      const txs = db.transactions.filter(tx => tx.uid === uid);
      const conf = db.settings.find(s => s.uid === uid);

      const bundle = {
        exportedAt: new Date().toISOString(),
        databaseType: 'JSON',
        user: user || { uid },
        settings: conf || {},
        transactions: txs || []
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=albait-${uid}-backup.json`);
      res.status(200).json(bundle);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // API - Import JSON back into Database
  app.post('/api/import', async (req, res) => {
    try {
      const uid = req.headers['x-user-uid'] as string;
      const { user, settings, transactions: importedTxs } = req.body;

      if (!uid) {
        return res.status(400).json({ error: 'x-user-uid header is required' });
      }

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
          confirmDelete: settings.confirmDelete !== undefined ? (settings.confirmDelete ? 1 : 0) : 1
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
      res.status(500).json({ error: e.message });
    }
  });

  // API - Admin Stats (RESTRICTED to admin email shady.nasif@gmail.com)
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const adminEmail = req.headers['x-admin-email'] as string;
      if (adminEmail !== 'shady.nasif@gmail.com') {
        return res.status(403).json({ error: 'صلاحيات الأدمن غير متوفرة لهذا الحساب' });
      }

      res.status(200).json({
        users: db.users,
        transactions: db.transactions
      });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // API - Admin Clear User
  app.post('/api/admin/clear-user', async (req, res) => {
    try {
      const adminEmail = req.headers['x-admin-email'] as string;
      const { targetUid } = req.body;

      if (adminEmail !== 'shady.nasif@gmail.com') {
        return res.status(403).json({ error: 'صلاحيات الأدمن غير متوفرة' });
      }
      if (!targetUid) {
        return res.status(400).json({ error: 'Target user ID is required' });
      }

      db.transactions = db.transactions.filter(tx => tx.uid !== targetUid);
      await db.save();
      res.status(200).json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // API - Admin Delete Single Txn
  app.post('/api/admin/delete-txn', async (req, res) => {
    try {
      const adminEmail = req.headers['x-admin-email'] as string;
      const { txnId } = req.body;

      if (adminEmail !== 'shady.nasif@gmail.com') {
        return res.status(403).json({ error: 'صلاحيات الأدمن غير متوفرة' });
      }
      if (!txnId) {
        return res.status(400).json({ error: 'Transaction ID is required' });
      }

      db.transactions = db.transactions.filter(tx => tx.id !== txnId);
      await db.save();
      res.status(200).json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
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
    const distPath = path.resolve(__dirname, 'dist');
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
