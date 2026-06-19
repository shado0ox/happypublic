import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());

  // Use a relative path for the SQLite database so it stays persistently inside the sandbox
  const dbPath = path.join(process.cwd(), 'albait.db');
  console.log(`Initialising SQLite database at: ${dbPath}`);

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await db.run('PRAGMA foreign_keys = ON');

  // Create tables with correct structures
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      uid TEXT PRIMARY KEY,
      email TEXT,
      name TEXT,
      password TEXT,
      lastLogin INTEGER,
      provider TEXT,
      createdAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      uid TEXT,
      type TEXT, -- 'income' or 'expense'
      amount REAL,
      source TEXT, -- for income
      category TEXT, -- for expense
      date TEXT,
      note TEXT,
      createdAt INTEGER,
      userEmail TEXT,
      userName TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      uid TEXT PRIMARY KEY,
      currency TEXT DEFAULT 'ر.س',
      cycleStart INTEGER DEFAULT 1,
      sortOrder TEXT DEFAULT 'desc',
      defaultFilter TEXT DEFAULT 'all',
      defaultCategory TEXT DEFAULT 'طعام وشراب',
      defaultSource TEXT DEFAULT 'راتب',
      showMotivation INTEGER DEFAULT 1, -- 1 = true, 0 = false
      showCharts INTEGER DEFAULT 1,
      autoHome INTEGER DEFAULT 1,
      confirmDelete INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS recurring_bills (
      id TEXT PRIMARY KEY,
      uid TEXT,
      title TEXT,
      amount REAL,
      category TEXT,
      dayOfMonth INTEGER DEFAULT 1,
      createdAt INTEGER
    );
  `);

  try {
    await db.run('ALTER TABLE users ADD COLUMN password TEXT');
  } catch (err) {
    // Column already exists, ignore
  }

  // Simple seeding helper for any new user (or user with no transactions)
  async function seedUserTransactions(uid: string, email: string, name: string) {
    const existing = await db.all('SELECT id FROM transactions WHERE uid = ? LIMIT 1', [uid]);
    if (existing && existing.length > 0) return; // Already has transactions

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');

    const demoTxns = [
      { id: `${uid}_s1`, uid, type: 'income', amount: 12000, source: 'راتب', category: null, date: `${y}-${m}-01`, note: 'راتب الشهر الأساسي', createdAt: Date.now() - 864000000 },
      { id: `${uid}_e1`, uid, type: 'expense', amount: 850, source: null, category: 'طعام وشراب', date: `${y}-${m}-03`, note: 'مشتريات السوبرماركت الأسبوعية', createdAt: Date.now() - 777600000 },
      { id: `${uid}_e2`, uid, type: 'expense', amount: 320, source: null, category: 'مواصلات', date: `${y}-${m}-05`, note: 'تعبئة بنزين السيارة', createdAt: Date.now() - 691200000 },
      { id: `${uid}_e3`, uid, type: 'expense', amount: 450, source: null, category: 'كهرباء ومياه', date: `${y}-${m}-07`, note: 'سداد فاتورة الكهرباء', createdAt: Date.now() - 604800000 },
      { id: `${uid}_e4`, uid, type: 'expense', amount: 200, source: null, category: 'ترفيه', date: `${y}-${m}-10`, note: 'اشتراكات ترفيهية عائلية', createdAt: Date.now() - 518400000 },
      { id: `${uid}_e5`, uid, type: 'expense', amount: 1200, source: null, category: 'تعليم', date: `${y}-${m}-12`, note: 'رسوم ومستلزمات دراسية للأطفال', createdAt: Date.now() - 432000000 },
      { id: `${uid}_s2`, uid, type: 'income', amount: 2000, source: 'مكافأة', category: null, date: `${y}-${m}-15`, note: 'مكافأة الإنجاز السنوية', createdAt: Date.now() - 345600000 },
      { id: `${uid}_e6`, uid, type: 'expense', amount: 380, source: null, category: 'صحة وطب', date: `${y}-${m}-16`, note: 'فاتورة الصيدلية والاستشارة الطبية', createdAt: Date.now() - 259200000 },
      { id: `${uid}_e7`, uid, type: 'expense', amount: 600, source: null, category: 'ملابس', date: `${y}-${m}-18`, note: 'ملابس جديدة للموسم الحالي', createdAt: Date.now() - 172800000 },
      { id: `${uid}_e8`, uid, type: 'expense', amount: 250, source: null, category: 'طعام وشراب', date: `${y}-${m}-20`, note: 'عشاء للمنزل من مطعم', createdAt: Date.now() - 864000 }
    ];

    for (const tx of demoTxns) {
      await db.run(
        `INSERT INTO transactions (id, uid, type, amount, source, category, date, note, createdAt, userEmail, userName) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tx.id, tx.uid, tx.type, tx.amount, tx.source, tx.category, tx.date, tx.note, tx.createdAt, email, name]
      );
    }
    console.log(`Seeded default transactions for user: ${uid} (${email})`);

    // Seed default recurring bills
    const rxExisting = await db.all('SELECT id FROM recurring_bills WHERE uid = ? LIMIT 1', [uid]);
    if (!rxExisting || rxExisting.length === 0) {
      const defaultBills = [
        { id: `${uid}_rb1`, uid, title: 'فاتورة الكهرباء والماء', amount: 350, category: 'كهرباء ومياه', dayOfMonth: 5, createdAt: Date.now() },
        { id: `${uid}_rb2`, uid, title: 'اشتراك الإنترنت المنزلي', amount: 230, category: 'ترفيه', dayOfMonth: 10, createdAt: Date.now() },
        { id: `${uid}_rb3`, uid, title: 'قسط إيجار البيت الثابت', amount: 3000, category: 'أخرى', dayOfMonth: 1, createdAt: Date.now() }
      ];
      for (const bill of defaultBills) {
        await db.run(
          `INSERT INTO recurring_bills (id, uid, title, amount, category, dayOfMonth, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [bill.id, bill.uid, bill.title, bill.amount, bill.category, bill.dayOfMonth, bill.createdAt]
        );
      }
      console.log(`Seeded default recurring bills for user: ${uid}`);
    }
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
      const existingUser = await db.get('SELECT uid FROM users WHERE uid = ? OR email = ?', [uid, cleanEmail]);
      if (existingUser) {
        return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول بدلاً من ذلك' });
      }

      // Save user with password
      await db.run(
        `INSERT INTO users (uid, email, name, password, lastLogin, provider, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uid, cleanEmail, name.trim(), password, Date.now(), 'email', Date.now()]
      );

      // Create default settings if not exists
      await db.run(
        `INSERT OR IGNORE INTO settings (uid, currency, cycleStart, sortOrder, defaultFilter, defaultCategory, defaultSource, showMotivation, showCharts, autoHome, confirmDelete)
         VALUES (?, 'ر.س', 1, 'desc', 'all', 'طعام وشراب', 'راتب', 1, 1, 1, 1)`,
        [uid]
      );

      // Seed setup transactions of the new user
      await seedUserTransactions(uid, cleanEmail, name.trim());

      const userProfile = await db.get('SELECT uid, email, name, provider, lastLogin FROM users WHERE uid = ?', [uid]);
      const userSettings = await db.get('SELECT * FROM settings WHERE uid = ?', [uid]);

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

      const user = await db.get('SELECT * FROM users WHERE email = ? AND password = ?', [cleanEmail, password]);
      if (!user) {
        // Special case: if it is the admin and no such user exists, auto-register him for a seamless developer experience!
        if (cleanEmail === 'shady.nasif@gmail.com') {
          // Check if admin exists but password was wrong
          const anyAdmin = await db.get('SELECT * FROM users WHERE email = ?', [cleanEmail]);
          if (anyAdmin) {
            return res.status(400).json({ error: 'كلمة المرور المدخلة غير صحيحة لحساب الأدمن' });
          } else {
            // Auto register the developer as administrator
            await db.run(
              `INSERT INTO users (uid, email, name, password, lastLogin, provider, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [uid, cleanEmail, 'Shady Nassef', password, Date.now(), 'email', Date.now()]
            );
            await db.run(
              `INSERT OR IGNORE INTO settings (uid, currency, cycleStart, sortOrder, defaultFilter, defaultCategory, defaultSource, showMotivation, showCharts, autoHome, confirmDelete)
               VALUES (?, 'ر.س', 1, 'desc', 'all', 'طعام وشراب', 'راتب', 1, 1, 1, 1)`,
              [uid]
            );
            await seedUserTransactions(uid, cleanEmail, 'Shady Nassef');
            
            const createdAdmin = await db.get('SELECT * FROM users WHERE uid = ?', [uid]);
            const userSettings = await db.get('SELECT * FROM settings WHERE uid = ?', [uid]);
            return res.status(200).json({ success: true, user: createdAdmin, settings: userSettings });
          }
        }
        return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة الكود' });
      }

      await db.run('UPDATE users SET lastLogin = ? WHERE uid = ?', [Date.now(), user.uid]);
      const userSettings = await db.get('SELECT * FROM settings WHERE uid = ?', [user.uid]);

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
      await db.run(
        `INSERT INTO users (uid, email, name, lastLogin, provider, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(uid) DO UPDATE SET
           email = excluded.email,
           name = excluded.name,
           lastLogin = excluded.lastLogin,
           provider = excluded.provider`,
        [uid, cleanEmail, cleanName, Date.now(), provider || 'email', Date.now()]
      );

      // Check if user has settings, if not insert default settings
      const settings = await db.get('SELECT uid FROM settings WHERE uid = ?', [uid]);
      if (!settings) {
        await db.run(
          `INSERT INTO settings (uid, currency, cycleStart, sortOrder, defaultFilter, defaultCategory, defaultSource, showMotivation, showCharts, autoHome, confirmDelete)
           VALUES (?, 'ر.س', 1, 'desc', 'all', 'طعام وشراب', 'راتب', 1, 1, 1, 1)`,
          [uid]
        );
      }

      // Seed mock transactions the very first time
      await seedUserTransactions(uid, cleanEmail, cleanName);

      const userProfile = await db.get('SELECT * FROM users WHERE uid = ?', [uid]);
      const userSettings = await db.get('SELECT * FROM settings WHERE uid = ?', [uid]);

      res.status(200).json({ success: true, user: userProfile, settings: userSettings });
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
      const txs = await db.all('SELECT * FROM transactions WHERE uid = ? ORDER BY date DESC, createdAt DESC', [uid]);
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

      // Check if transaction exists
      const existing = await db.get('SELECT id FROM transactions WHERE id = ?', [id]);
      if (existing) {
        await db.run(
          `UPDATE transactions SET 
             type = ?, amount = ?, source = ?, category = ?, date = ?, note = ?
           WHERE id = ? AND uid = ?`,
          [type, amount, source, category, date, note, id, uid]
        );
      } else {
        await db.run(
          `INSERT INTO transactions (id, uid, type, amount, source, category, date, note, createdAt, userEmail, userName)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, uid, type, amount, source, category, date, note, Date.now(), userEmail || '', userName || '']
        );
      }

      const saved = await db.get('SELECT * FROM transactions WHERE id = ?', [id]);
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

      await db.run('DELETE FROM transactions WHERE id = ? AND uid = ?', [id, uid]);
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
      const bills = await db.all('SELECT * FROM recurring_bills WHERE uid = ? ORDER BY dayOfMonth ASC, createdAt DESC', [uid]);
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

      const existing = await db.get('SELECT id FROM recurring_bills WHERE id = ?', [id]);
      if (existing) {
        await db.run(
          `UPDATE recurring_bills SET 
             title = ?, amount = ?, category = ?, dayOfMonth = ?
           WHERE id = ? AND uid = ?`,
          [title, amount, category, dayOfMonth || 1, id, uid]
        );
      } else {
        await db.run(
          `INSERT INTO recurring_bills (id, uid, title, amount, category, dayOfMonth, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, uid, title, amount, category, dayOfMonth || 1, Date.now()]
        );
      }

      const saved = await db.get('SELECT * FROM recurring_bills WHERE id = ?', [id]);
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

      await db.run('DELETE FROM recurring_bills WHERE id = ? AND uid = ?', [id, uid]);
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

      let config = await db.get('SELECT * FROM settings WHERE uid = ?', [uid]);
      if (!config) {
        // Create matching defaults
        await db.run(
          `INSERT INTO settings (uid, currency, cycleStart, sortOrder, defaultFilter, defaultCategory, defaultSource, showMotivation, showCharts, autoHome, confirmDelete)
           VALUES (?, 'ر.س', 1, 'desc', 'all', 'طعام وشراب', 'راتب', 1, 1, 1, 1)`,
          [uid]
        );
        config = await db.get('SELECT * FROM settings WHERE uid = ?', [uid]);
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

      // SQLite lacks boolean type, we store as 1 or 0
      const dbShowMotivation = showMotivation ? 1 : 0;
      const dbShowCharts = showCharts ? 1 : 0;
      const dbAutoHome = autoHome ? 1 : 0;
      const dbConfirmDelete = confirmDelete ? 1 : 0;

      await db.run(
        `INSERT INTO settings (uid, currency, cycleStart, sortOrder, defaultFilter, defaultCategory, defaultSource, showMotivation, showCharts, autoHome, confirmDelete)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
           confirmDelete = excluded.confirmDelete`,
        [
          uid,
          currency || 'ر.س',
          cycleStart || 1,
          sortOrder || 'desc',
          defaultFilter || 'all',
          defaultCategory || 'طعام وشراب',
          defaultSource || 'راتب',
          dbShowMotivation,
          dbShowCharts,
          dbAutoHome,
          dbConfirmDelete
        ]
      );

      const updated = await db.get('SELECT * FROM settings WHERE uid = ?', [uid]);
      res.status(200).json(updated);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // API - Export SQLite User Bundle to JSON
  app.get('/api/export', async (req, res) => {
    try {
      const uid = req.headers['x-user-uid'] as string || req.query.uid as string;
      if (!uid) {
        return res.status(400).json({ error: 'User UID is required' });
      }

      const user = await db.get('SELECT * FROM users WHERE uid = ?', [uid]);
      const txs = await db.all('SELECT * FROM transactions WHERE uid = ?', [uid]);
      const conf = await db.get('SELECT * FROM settings WHERE uid = ?', [uid]);

      const bundle = {
        exportedAt: new Date().toISOString(),
        databaseType: 'SQLite',
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

  // API - Import JSON back into SQLite database
  app.post('/api/import', async (req, res) => {
    try {
      const uid = req.headers['x-user-uid'] as string;
      const { user, settings, transactions: importedTxs } = req.body;

      if (!uid) {
        return res.status(400).json({ error: 'x-user-uid header is required' });
      }

      // 1. Restore settings if present
      if (settings) {
        await db.run(
          `INSERT INTO settings (uid, currency, cycleStart, sortOrder, defaultFilter, defaultCategory, defaultSource, showMotivation, showCharts, autoHome, confirmDelete)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
             confirmDelete = excluded.confirmDelete`,
          [
            uid,
            settings.currency || 'ر.س',
            settings.cycleStart || 1,
            settings.sortOrder || 'desc',
            settings.defaultFilter || 'all',
            settings.defaultCategory || 'طعام وشراب',
            settings.defaultSource || 'راتب',
            settings.showMotivation !== undefined ? settings.showMotivation : 1,
            settings.showCharts !== undefined ? settings.showCharts : 1,
            settings.autoHome !== undefined ? settings.autoHome : 1,
            settings.confirmDelete !== undefined ? settings.confirmDelete : 1
          ]
        );
      }

      // 2. Restore transactions
      if (Array.isArray(importedTxs)) {
        // Clear current ones first to replace cleanly
        await db.run('DELETE FROM transactions WHERE uid = ?', [uid]);

        for (const tx of importedTxs) {
          // Verify ID or build unique one
          const txId = tx.id || `${uid}_import_${Math.random().toString(36).substr(2, 9)}`;
          await db.run(
            `INSERT OR REPLACE INTO transactions (id, uid, type, amount, source, category, date, note, createdAt, userEmail, userName)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              txId,
              uid,
              tx.type || 'expense',
              tx.amount || 0,
              tx.source || null,
              tx.category || null,
              tx.date || new Date().toISOString().split('T')[0],
              tx.note || '',
              tx.createdAt || Date.now(),
              tx.userEmail || '',
              tx.userName || ''
            ]
          );
        }
      }

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

      // Grab user records
      const users = await db.all('SELECT * FROM users');
      // Grab all transaction aggregates
      const txs = await db.all('SELECT * FROM transactions');

      // Create stats object
      res.status(200).json({
        users,
        transactions: txs
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

      await db.run('DELETE FROM transactions WHERE uid = ?', [targetUid]);
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

      await db.run('DELETE FROM transactions WHERE id = ?', [txnId]);
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
    // Serve production assets from the built /dist folder
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
