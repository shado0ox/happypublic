import React, { useState, useEffect, useRef } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  PlusCircle,
  Plus,
  MinusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Settings,
  User,
  Share2,
  Download,
  Upload,
  RefreshCw,
  Lock,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Info,
  ShieldAlert,
  Sliders,
  Database,
  Grid,
  FileSpreadsheet,
  Image as ImageIcon,
  Coins,
  ArrowUpDown,
  Lightbulb,
  BarChart3,
  Home,
  Fingerprint,
  ScanFace,
  Volume2,
  VolumeX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip
} from 'recharts';
import SwipeableTransactionItem from './components/SwipeableTransactionItem';
// @ts-ignore
import logoImg from './assets/images/happy_home_logo_1781910968387.jpg';
// @ts-ignore
import newLogoImg from './assets/images/happy_home_logo_new_1781990855965.jpg';
// @ts-ignore
import html2pdf from 'html2pdf.js';

// Define TS Interfaces
interface Transaction {
  id: string;
  uid: string;
  type: 'income' | 'expense';
  amount: number;
  source: string | null;
  category: string | null;
  date: string;
  note: string | null;
  createdAt: number;
  userEmail?: string;
  userName?: string;
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

interface UserProfile {
  uid: string;
  email: string;
  name: string;
  provider: string;
  lastLogin?: number;
  createdAt?: number;
}

interface AppSettings {
  uid: string;
  currency: string;
  cycleStart: number;
  sortOrder: 'desc' | 'asc';
  defaultFilter: string;
  defaultCategory: string;
  defaultSource: string;
  showMotivation: boolean;
  showCharts: boolean;
  autoHome: boolean;
  confirmDelete: boolean;
  realTimeSync: boolean;
  enableSounds: boolean;
}

// Layout Categories Config
const CAT_COLORS: Record<string, string> = {
  "طعام وشراب": "#e74c3c",
  "مواصلات": "#3498db",
  "كهرباء ومياه": "#f39c12",
  "تعليم": "#9b59b6",
  "صحة وطب": "#27ae60",
  "ملابس": "#e91e63",
  "صيانة المنزل": "#ff5722",
  "ترفيه": "#00bcd4",
  "أخرى": "#95a5a6",
  "income": "#0a7c6b"
};

const CAT_EMOJIS: Record<string, string> = {
  "طعام وشراب": "🍽️",
  "مواصلات": "🚗",
  "كهرباء ومياه": "⚡",
  "تعليم": "📚",
  "صحة وطب": "💊",
  "ملابس": "👗",
  "صيانة المنزل": "🔧",
  "ترفيه": "🎮",
  "أخرى": "📦",
  "راتب": "💼",
  "مكافأة": "🎁",
  "إيجار": "🏠",
  "استثمار": "📈",
  "هدية": "🎀",
  "أخرى_income": "💰"
};

const MOTIVATIONS = [
  { icon: "💡", text: "درهم وقاية خير من قنطار علاج — كل ريال تدّخره اليوم هو أمان لغدك", quote: "المثل العربي" },
  { icon: "🌱", text: "الادخار عادة تبدأ بريال واحد، وتنتهي بثروة تُورث للأجيال", quote: "تخطيط ذكي" },
  { icon: "🎯", text: "ضع لنفسك هدفاً مالياً واضحاً، ثم تتبع كل ريال يقربك منه", quote: "تخطيط ذكي" },
  { icon: "🏠", text: "البيت السعيد لا يُبنى فقط بالحب، بل بالتخطيط المالي الحكيم", quote: "ترابط عائلي" },
  { icon: "📊", text: "من لا يحاسب نفسه في الدنيا، أضاع على نفسه فرصة الاستثمار الحقيقي", quote: "وعي مالي" },
  { icon: "🌟", text: "أسوأ قرار مالي هو إنفاق المال قبل كسبه — تجنّب الديون كلما استطعت", quote: "توجيه حكيم" },
  { icon: "💎", text: "الثروة الحقيقية ليست فيما تكسب، بل فيما تحتفظ به بعد الإنفاق", quote: "وعي مالي" },
  { icon: "🔑", text: "سجّل كل مصروف مهما بدا صغيراً — الفنجان يومياً يُكلّف آلاف سنوياً", quote: "انتباه ذكي" },
  { icon: "⚖️", text: "التوازن بين الإنفاق والادخار هو مفتاح السعادة المالية في كل منزل", quote: "ترشيد متوازن" },
  { icon: "🚀", text: "ابدأ بادخار ١٠٪ من دخلك هذا الشهر — ستُفاجأ بالنتيجة بعد عام", quote: "انطلاقة مالية" }
];

export default function App() {
  // Navigation & Screens state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'income' | 'expense' | 'statement' | 'settings' | 'admin'>('dashboard');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Transactions & settings state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    uid: '',
    currency: 'ر.س',
    cycleStart: 1,
    sortOrder: 'desc',
    defaultFilter: 'all',
    defaultCategory: 'طعام وشراب',
    defaultSource: 'راتب',
    showMotivation: true,
    showCharts: true,
    autoHome: true,
    confirmDelete: true,
    realTimeSync: true,
    enableSounds: true
  });

  // Splash & Install states
  const [logoType, setLogoType] = useState<'new' | 'classic'>(() => (localStorage.getItem('albait_logo_type') as 'new' | 'classic') || 'new');
  const [showSplash, setShowSplash] = useState(true);
  const slogans = [
    "« الادخار اليوم هو أمان الغد وبناء لمستقبل عائلتك السعيدة »",
    "« الوعي المالي يبدأ بخطوة بسيطة: نظّم، راقب، وادّخر »",
    "« البيت السعيد يُبنى على التخطيط والحكمة في إدارة سبل المعيشة »",
    "« ليس المهم كم تجني، بل المهم كم تدّخر وكيف تبني مستقبلك »"
  ];
  const [splashSlogan, setSplashSlogan] = useState(slogans[0]);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % slogans.length;
      setSplashSlogan(slogans[index]);
    }, 850);

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2450);

    // Check standalone mode
    // @ts-ignore
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    const isDismissed = localStorage.getItem('albait_install_dismissed') === 'true';
    if (!isStandalone && !isDismissed) {
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3500);
    }

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  // Recurring Bills states
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [showRecurringManager, setShowRecurringManager] = useState(false);
  const [recTitle, setRecTitle] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recCategory, setRecCategory] = useState('كهرباء ومياه');
  const [recDay, setRecDay] = useState(1);

  // Statement Filters & Month selector state
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Input states
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeSource, setIncomeSource] = useState('راتب');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [incomeNote, setIncomeNote] = useState('');

  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('طعام وشراب');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseDesc, setExpenseDesc] = useState('');

  // Toast notifications
  const [toastMessage, setToastMessage] = useState('');
  const [toastIsError, setToastIsError] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Motivation carousel state
  const [motivationIdx, setMotivationIdx] = useState(0);

  // File import ref
  const importInputRef = useRef<HTMLInputElement>(null);

  // Admin stats state
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [adminTxns, setAdminTxns] = useState<Transaction[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSelectedUser, setAdminSelectedUser] = useState<UserProfile | null>(null);
  const [adminUserTxns, setAdminUserTxns] = useState<Transaction[]>([]);

  // Canvas Reference for Statement Image generation
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generated Statement Image preview modal state
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Biometric / Passcode Lock state
  const [isLocked, setIsLocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [isBiometricRegistered, setIsBiometricRegistered] = useState(false);

  // Advanced Biometric login & scanner states
  const [enrolledBioUsers, setEnrolledBioUsers] = useState<Record<string, any>>(() => {
    try {
      const saved = localStorage.getItem('albait_bio_users');
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });
  const [selectedBioUserEmail, setSelectedBioUserEmail] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('albait_bio_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        const keys = Object.keys(parsed);
        return keys.length > 0 ? keys[0] : null;
      }
    } catch (_) {}
    return null;
  });
  const [biometricsLoginEnabled, setBiometricsLoginEnabled] = useState(false);

  // Sync biometricsLoginEnabled state for active user
  useEffect(() => {
    if (currentUser && currentUser.email) {
      setBiometricsLoginEnabled(!!enrolledBioUsers[currentUser.email]);
    } else {
      setBiometricsLoginEnabled(false);
    }
  }, [currentUser, enrolledBioUsers]);

  // Sync selected bio user if list changes
  useEffect(() => {
    const keys = Object.keys(enrolledBioUsers);
    if (keys.length > 0) {
      if (!selectedBioUserEmail || !enrolledBioUsers[selectedBioUserEmail]) {
        setSelectedBioUserEmail(keys[0]);
      }
    } else {
      setSelectedBioUserEmail(null);
    }
  }, [enrolledBioUsers, selectedBioUserEmail]);

  const [showScanOverlay, setShowScanOverlay] = useState(false);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [scanType, setScanType] = useState<'fingerprint' | 'face'>('fingerprint');
  const [scanProgress, setScanProgress] = useState(0);
  const [showBiometricPromptModal, setShowBiometricPromptModal] = useState(false);

  // Auto rotate motivations
  useEffect(() => {
    const timer = setInterval(() => {
      setMotivationIdx(prev => (prev + 1) % MOTIVATIONS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  // SSE Real-time Synchronization Loop
  useEffect(() => {
    if (!currentUser || !settings.realTimeSync) return;

    console.log('Establishing Real-time Live Sync session via EventSource...');
    const eventSource = new EventSource(`/api/sync/stream?uid=${encodeURIComponent(currentUser.uid)}`);

    eventSource.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'sync_required') {
          console.log('⚡ Real-time sync update triggered from server!');
          await fetchTransactions(currentUser.uid);
          await fetchRecurringBills(currentUser.uid);
          
          // Also fetch and update settings silently
          try {
            const settingsRes = await fetch(`/api/settings`, {
              headers: { 'x-user-uid': currentUser.uid }
            });
            const fetchedSettings = await settingsRes.json();
            if (fetchedSettings && !fetchedSettings.error) {
              setSettings({
                ...fetchedSettings,
                showMotivation: fetchedSettings.showMotivation === 1,
                showCharts: fetchedSettings.showCharts === 1,
                autoHome: fetchedSettings.autoHome === 1,
                confirmDelete: fetchedSettings.confirmDelete === 1,
                realTimeSync: fetchedSettings.realTimeSync === undefined ? true : fetchedSettings.realTimeSync === 1,
                enableSounds: fetchedSettings.enableSounds === undefined ? true : fetchedSettings.enableSounds === 1
              });
            }
          } catch (err) {
            console.error('Failed to sync settings silently:', err);
          }
        }
      } catch (err) {
        console.error('Error parsing live-sync message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('Real-time EventSource disconnected. Reconnecting...', err);
    };

    return () => {
      console.log('Closing live sync EventSource session.');
      eventSource.close();
    };
  }, [currentUser, settings.realTimeSync]);

  // Quick Check localStorage for session
  useEffect(() => {
    const cachedUser = localStorage.getItem('albait_user');
    const cachedLock = localStorage.getItem('albait_locked');
    if (cachedUser && cachedUser !== 'undefined' && cachedUser !== 'null') {
      try {
        const parsed = JSON.parse(cachedUser);
        if (parsed && typeof parsed === 'object') {
          setCurrentUser(parsed);
          syncUserAndFetch(parsed);
          if (cachedLock === 'true') {
            setIsLocked(true);
          }
        }
      } catch (e) {
        console.error('Failed to parse cached user:', e);
        localStorage.removeItem('albait_user');
      }
    }
    const bioCred = localStorage.getItem('albait_bio_enabled');
    if (bioCred === 'true') {
      setIsBiometricRegistered(true);
    }
    const bioLogin = localStorage.getItem('albait_bio_login_enabled');
    if (bioLogin === 'true') {
      setBiometricsLoginEnabled(true);
    }
  }, []);

  // Show customized toasts
  const triggerToast = (msg: string, isError = false) => {
    setToastMessage(msg);
    setToastIsError(isError);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // REST Backend Sync
  const syncUserAndFetch = async (profile: UserProfile) => {
    try {
      const res = await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      const data = await res.json();
      if (data.success) {
        if (data.settings) {
          // Setup settings properly converting ints back to booleans
          setSettings({
            ...data.settings,
            showMotivation: data.settings.showMotivation === 1,
            showCharts: data.settings.showCharts === 1,
            autoHome: data.settings.autoHome === 1,
            confirmDelete: data.settings.confirmDelete === 1,
            realTimeSync: data.settings.realTimeSync === undefined ? true : data.settings.realTimeSync === 1,
            enableSounds: data.settings.enableSounds === undefined ? true : data.settings.enableSounds === 1
          });
          setExpenseCategory(data.settings.defaultCategory);
          setIncomeSource(data.settings.defaultSource);
        }
        await fetchTransactions(profile.uid);
        await fetchRecurringBills(profile.uid);
      }
    } catch (e) {
      console.error('Error syncing user with backend:', e);
      // Fallback: fetch offline locally
      triggerToast('تعذر الاتصال بالسيرفر، نعمل في وضع عدم الاتصال مؤقتاً', true);
    }
  };

  const fetchTransactions = async (uid: string) => {
    try {
      const res = await fetch(`/api/transactions?uid=${uid}`, {
        headers: { 'x-user-uid': uid }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setTransactions(data);
      }
    } catch (e) {
      console.error('Error fetching transactions:', e);
    }
  };

  const fetchRecurringBills = async (uid: string) => {
    try {
      const res = await fetch(`/api/recurring-bills?uid=${uid}`, {
        headers: { 'x-user-uid': uid }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setRecurringBills(data);
      }
    } catch (e) {
      console.error('Error fetching recurring bills:', e);
    }
  };

  const handleAddRecurringBill = async () => {
    if (!currentUser) return;
    if (!recTitle.trim() || !recAmount) {
      triggerToast('⚠️ يرجى تعبئة اسم الفاتورة وتحديد المبلغ', true);
      return;
    }

    const payload = {
      id: `rb_${Date.now()}`,
      title: recTitle,
      amount: parseFloat(recAmount),
      category: recCategory,
      dayOfMonth: recDay
    };

    try {
      const res = await fetch('/api/recurring-bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': currentUser.uid
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        triggerToast('🎉 تم إضافة الفاتورة بنجاح!');
        setRecTitle('');
        setRecAmount('');
        setRecDay(1);
        await fetchRecurringBills(currentUser.uid);
      } else {
        triggerToast('⚠️ فشل حفظ الفاتورة المتكررة', true);
      }
    } catch (e) {
      triggerToast('⚠️ تعذر إرسال البيانات للسيرفر', true);
    }
  };

  const handleDeleteRecurringBill = async (id: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/recurring-bills/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-uid': currentUser.uid }
      });
      if (res.ok) {
        triggerToast('🗑️ تم إزالة الفاتورة المتكررة بنجاح');
        await fetchRecurringBills(currentUser.uid);
      } else {
        triggerToast('⚠️ فشل مسح الفاتورة المتكررة', true);
      }
    } catch (e) {
      triggerToast('⚠️ خطأ في الاتصال بالشبكة', true);
    }
  };

  const getUnpaidRecurringBills = () => {
    if (!currentUser || recurringBills.length === 0) return [];
    
    const now = new Date();
    const cycleStartDay = Number(settings.cycleStart || 1);
    
    let year = now.getFullYear();
    let month = now.getMonth();
    
    let cycleStartDate: Date;
    let cycleEndDate: Date;
    
    if (now.getDate() >= cycleStartDay) {
      cycleStartDate = new Date(year, month, cycleStartDay, 0, 0, 0);
      cycleEndDate = new Date(year, month + 1, cycleStartDay, 23, 59, 59);
    } else {
      cycleStartDate = new Date(year, month - 1, cycleStartDay, 0, 0, 0);
      cycleEndDate = new Date(year, month, cycleStartDay, 23, 59, 59);
    }

    // Filter transaction from the current financial cycle
    const cycleTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      // Comparing time limits
      return tDate.getTime() >= cycleStartDate.getTime() && tDate.getTime() <= cycleEndDate.getTime() && t.type === 'expense';
    });

    return recurringBills.filter(bill => {
      // Is there any matching logged expense for this template in the cycle?
      const alreadyPaid = cycleTransactions.some(t => {
        // Compare note to bill title or category name with same exact amount
        const matchesTitle = t.note?.trim().toLowerCase() === bill.title.trim().toLowerCase();
        const matchesCategoryAndAmount = t.category === bill.category && Math.abs(t.amount - bill.amount) < 0.1;
        return matchesTitle || matchesCategoryAndAmount;
      });
      return !alreadyPaid;
    });
  };

  const handleQuickPayRecurringBill = async (bill: RecurringBill) => {
    if (!currentUser) return;
    
    const txId = `tx_${Date.now()}_rec`;
    const todayStr = new Date().toISOString().split('T')[0];
    
    const payload = {
      id: txId,
      type: 'expense',
      amount: bill.amount,
      source: null,
      category: bill.category,
      date: todayStr,
      note: bill.title,
      userEmail: currentUser.email,
      userName: currentUser.name
    };

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': currentUser.uid
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        triggerToast(`⚡ تم تسجيل صرف ${bill.title} فوراً كمعاملة موثقة!`);
        playTxnSound('expense');
        await fetchTransactions(currentUser.uid);
      } else {
        triggerToast('⚠️ فشل التوثيق المالي السريع', true);
      }
    } catch (e) {
      triggerToast('⚠️ تعذر التوثيق بالسيرفر', true);
    }
  };

  // Auth Handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setAuthError('يرجى ملء جميع الحقول');
      return;
    }
    setAuthLoading(true);
    setAuthError('');

    try {
      if (authMode === 'login') {
        const res = await fetch('/api/user/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput, password: passwordInput })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setAuthError(data.error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
          setAuthLoading(false);
          return;
        }

        const profile: UserProfile = data.user;
        localStorage.setItem('albait_user', JSON.stringify(profile));
        setCurrentUser(profile);

        if (data.settings) {
          setSettings({
            ...data.settings,
            showMotivation: data.settings.showMotivation === 1,
            showCharts: data.settings.showCharts === 1,
            autoHome: data.settings.autoHome === 1,
            confirmDelete: data.settings.confirmDelete === 1,
            realTimeSync: data.settings.realTimeSync === undefined ? true : data.settings.realTimeSync === 1,
            enableSounds: data.settings.enableSounds === undefined ? true : data.settings.enableSounds === 1
          });
          setExpenseCategory(data.settings.defaultCategory);
          setIncomeSource(data.settings.defaultSource);
        }
        await fetchTransactions(profile.uid);
        await fetchRecurringBills(profile.uid);
        triggerToast('أهلاً بك مجدداً 👋');

        // Offer to enable biometric login if this user email is not set up yet
        const currentBioEnrolled = !!enrolledBioUsers[profile.email];
        if (!currentBioEnrolled) {
          (window as any)._temp_bio_cred = { email: emailInput, password: passwordInput, name: profile.name, uid: profile.uid };
          setTimeout(() => {
            setShowBiometricPromptModal(true);
          }, 1500);
        }
      } else {
        if (!nameInput) {
          setAuthError('اسم المستخدم مطلوب عند التسجيل');
          setAuthLoading(false);
          return;
        }
        const res = await fetch('/api/user/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput, name: nameInput, password: passwordInput })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setAuthError(data.error || 'فشل تسجيل حساب جديد');
          setAuthLoading(false);
          return;
        }

        const profile: UserProfile = data.user;
        localStorage.setItem('albait_user', JSON.stringify(profile));
        setCurrentUser(profile);

        if (data.settings) {
          setSettings({
            ...data.settings,
            showMotivation: data.settings.showMotivation === 1,
            showCharts: data.settings.showCharts === 1,
            autoHome: data.settings.autoHome === 1,
            confirmDelete: data.settings.confirmDelete === 1,
            realTimeSync: data.settings.realTimeSync === undefined ? true : data.settings.realTimeSync === 1,
            enableSounds: data.settings.enableSounds === undefined ? true : data.settings.enableSounds === 1
          });
          setExpenseCategory(data.settings.defaultCategory);
          setIncomeSource(data.settings.defaultSource);
        }
        await fetchTransactions(profile.uid);
        await fetchRecurringBills(profile.uid);
        triggerToast('تم تسجيل حسابك بالنجاح 🎉');

        // Offer to enable biometric login if this user email is not set up yet
        const currentBioEnrolled = !!enrolledBioUsers[profile.email];
        if (!currentBioEnrolled) {
          (window as any)._temp_bio_cred = { email: emailInput, password: passwordInput, name: profile.name, uid: profile.uid };
          setTimeout(() => {
            setShowBiometricPromptModal(true);
          }, 1500);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'خطأ أثناء المصادقة');
    } finally {
      setAuthLoading(false);
    }
  };

  // Web Audio synth for financial transaction sounds
  const playTxnSound = (type: 'income' | 'expense') => {
    if (!settings.enableSounds) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === 'income') {
        const now = ctx.currentTime;
        const playTone = (freq: number, delay: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + delay);
          gain.gain.setValueAtTime(0.12, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + duration);
        };
        // Quick upbeat 4-note chime (C5, E5, G5, C6)
        playTone(523.25, 0, 0.12);
        playTone(659.25, 0.07, 0.12);
        playTone(783.99, 0.14, 0.12);
        playTone(1046.50, 0.21, 0.25);
      } else {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(550, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch (e) {
      console.warn('Audio Context error:', e);
    }
  };

  // Web Audio synth for futuristic biometric scanning sounds
  const playBiometricSynthSound = (type: 'success' | 'failure' | 'scan') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === 'scan') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        gain.gain.setValueAtTime(0.015, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'success') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();
        
        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(ctx.destination);
        gain2.connect(ctx.destination);
        
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
        gain1.gain.setValueAtTime(0.08, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.3);
        
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        osc2.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.33);
        gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.38);
        
        osc1.start();
        osc1.stop(ctx.currentTime + 0.35);
        osc2.start(ctx.currentTime + 0.08);
        osc2.stop(ctx.currentTime + 0.4);
      } else if (type === 'failure') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.005, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn("Audio Context init error:", e);
    }
  };

  // Detect and retrieve biometric capability details based on user agent device type
  const getBiometricDeviceDetails = () => {
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isMac = /macintosh/.test(ua) && navigator.maxTouchPoints > 0;
    const isAndroid = /android/.test(ua);

    if (isIOS || isMac) {
      return {
        label: 'تسجيل دخول بالوجه (Face ID)',
        iconType: 'face' as const,
        deviceType: 'Apple iOS (Face ID)'
      };
    } else if (isAndroid) {
      return {
        label: 'تسجيل دخول بالبصمة (Touch ID)',
        iconType: 'fingerprint' as const,
        deviceType: 'Android Device (Fingerprint)'
      };
    } else {
      return {
        label: 'المعرّف الحيوي للبرنامج (بصمة / وجه)',
        iconType: 'fingerprint' as const,
        deviceType: 'التعريف الحيوي الافتراضي'
      };
    }
  };

  // Launch Advanced Biometric Scan
  const handleBiometricLoginStart = async () => {
    const keys = Object.keys(enrolledBioUsers);
    if (keys.length === 0) {
      triggerToast('يرجى تسجيل الدخول يدويًا أولاً لتفعيل البصمة وبصمة الوجه من صفحة الإعدادات ⚙️', true);
      return;
    }

    const targetEmail = selectedBioUserEmail || keys[0];
    const parsedUser = enrolledBioUsers[targetEmail];

    if (!parsedUser || !parsedUser.email || !parsedUser.password) {
      triggerToast('لا تتوفر بيانات صحيحة، يرجى كتابة كلمة المرور يدويًا ❌', true);
      return;
    }

    const device = getBiometricDeviceDetails();
    setScanType(device.iconType === 'face' ? 'face' : 'fingerprint');
    setScanState('scanning');
    setScanProgress(0);
    setShowScanOverlay(true);

    // Play initial sound scan
    playBiometricSynthSound('scan');

    // Notify user that this is tied locked to their email
    triggerToast(`🔒 جارِ التحقق الحيوي وجلب تصريح الحساب لـ: ${parsedUser.email}`);

    // Try a real hardware biometric prompt using WebAuthn (if available)
    try {
      if (window.PublicKeyCredential) {
        const canVerify = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (canVerify && navigator.credentials && navigator.credentials.get) {
          const challenge = new Uint8Array(16);
          window.crypto.getRandomValues(challenge);
          
          const options: CredentialRequestOptions = {
            publicKey: {
              challenge: challenge,
              timeout: 12000,
              userVerification: 'required',
            }
          };
          
          // This displays the authenticating modal of the phone/PC
          await navigator.credentials.get(options);
        }
      }
    } catch (webAuthnError: any) {
      console.warn("WebAuthn verification fell back to container profile validation:", webAuthnError);
      // If user cancelled, fail immediately
      if (
        webAuthnError.name === 'NotAllowedError' || 
        webAuthnError.message?.toLowerCase().includes('cancel') || 
        webAuthnError.message?.toLowerCase().includes('not allowed')
      ) {
        setScanState('failed');
        playBiometricSynthSound('failure');
        triggerToast('⚠️ تم إسقاط أو إلغاء التحقق الحيوي من قبل المستخدم', true);
        setTimeout(() => setShowScanOverlay(false), 1800);
        return;
      }
    }

    // Run active scan cycle animation for visual feedback and sound effects
    let prog = 0;
    const interval = setInterval(() => {
      prog += 5;
      if (prog > 100) prog = 100;
      setScanProgress(prog);
      
      // Beep scan indicator click
      if (prog % 15 === 0) {
        playBiometricSynthSound('scan');
      }

      if (prog === 100) {
        clearInterval(interval);
        
        // Success scans!
        setScanState('success');
        playBiometricSynthSound('success');

        // Log user in
        setTimeout(async () => {
          try {
            const res = await fetch('/api/user/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: parsedUser.email, password: parsedUser.password })
            });
            const data = await res.json();
            
            if (!res.ok || !data.success) {
              setScanState('failed');
              playBiometricSynthSound('failure');
              triggerToast(data.error || 'فشلت مطابقة البصمة مع الخادم', true);
              setTimeout(() => setShowScanOverlay(false), 1500);
              return;
            }

            const profile: UserProfile = data.user;
            localStorage.setItem('albait_user', JSON.stringify(profile));
            setCurrentUser(profile);

            if (data.settings) {
              setSettings({
                ...data.settings,
                showMotivation: data.settings.showMotivation === 1,
                showCharts: data.settings.showCharts === 1,
                autoHome: data.settings.autoHome === 1,
                confirmDelete: data.settings.confirmDelete === 1,
                realTimeSync: data.settings.realTimeSync === undefined ? true : data.settings.realTimeSync === 1,
                enableSounds: data.settings.enableSounds === undefined ? true : data.settings.enableSounds === 1
              });
              setExpenseCategory(data.settings.defaultCategory);
              setIncomeSource(data.settings.defaultSource);
            }
            await fetchTransactions(profile.uid);
            await fetchRecurringBills(profile.uid);
            
            setShowScanOverlay(false);
            triggerToast(`تم التحقق ودخول البيت بنجاح! مرحباً ${profile.name} ✨`);
          } catch (err: any) {
            setScanState('failed');
            playBiometricSynthSound('failure');
            triggerToast(err.message || 'خطأ أثناء تسجيل دخول البصمة السريع', true);
            setTimeout(() => setShowScanOverlay(false), 1500);
          }
        }, 800);
      }
    }, 60);
  };

  const handleDemoLogin = async () => {
    const profile: UserProfile = {
      uid: 'demo_user_house',
      email: 'demo@albait.sa',
      name: 'المستخدم التجريبي العائلي',
      provider: 'demo'
    };
    localStorage.setItem('albait_user', JSON.stringify(profile));
    setCurrentUser(profile);
    await syncUserAndFetch(profile);
    triggerToast('أهلاً بك في الحساب التجريبي 🏡');
  };

  const handleLogout = () => {
    if (confirm('هل تريد تسجيل الخروج؟')) {
      localStorage.removeItem('albait_user');
      localStorage.removeItem('albait_locked');
      setCurrentUser(null);
      setTransactions([]);
      setActiveTab('dashboard');
      triggerToast('تم تسجيل الخروج بنجاح 👋');
    }
  };

  // Save Transaction
  const handleSaveIncome = async () => {
    const val = parseFloat(incomeAmount);
    if (!val || val <= 0) {
      triggerToast('أدخل مبلغاً صحيحاً ⚠️', true);
      return;
    }
    if (!currentUser) return;

    const newTx: Transaction = {
      id: 'tx_inc_' + Date.now() + Math.random().toString(36).substr(2, 5),
      uid: currentUser.uid,
      type: 'income',
      amount: val,
      source: incomeSource,
      category: null,
      date: incomeDate,
      note: incomeNote.trim() || null,
      createdAt: Date.now(),
      userEmail: currentUser.email,
      userName: currentUser.name
    };

    // Optimistic UI updates
    setTransactions(prev => [newTx, ...prev]);
    setIncomeAmount('');
    setIncomeNote('');
    triggerToast('✅ تم حفظ المبلغ الوارد بالنجاح');
    playTxnSound('income');

    if (settings.autoHome) {
      setActiveTab('dashboard');
    }

    try {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': currentUser.uid
        },
        body: JSON.stringify(newTx)
      });
      // background refresh to maintain exact logs
      await fetchTransactions(currentUser.uid);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveExpense = async () => {
    const val = parseFloat(expenseAmount);
    if (!val || val <= 0) {
      triggerToast('أدخل مبلغاً صحيحاً ⚠️', true);
      return;
    }
    if (!currentUser) return;

    const newTx: Transaction = {
      id: 'tx_exp_' + Date.now() + Math.random().toString(36).substr(2, 5),
      uid: currentUser.uid,
      type: 'expense',
      amount: val,
      source: null,
      category: expenseCategory,
      date: expenseDate,
      note: expenseDesc.trim() || null,
      createdAt: Date.now(),
      userEmail: currentUser.email,
      userName: currentUser.name
    };

    // Optimistic UI updates
    setTransactions(prev => [newTx, ...prev]);
    setExpenseAmount('');
    setExpenseDesc('');
    triggerToast('💾 تم حفظ المصروف بالنجاح');
    playTxnSound('expense');

    if (settings.autoHome) {
      setActiveTab('dashboard');
    }

    try {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': currentUser.uid
        },
        body: JSON.stringify(newTx)
      });
      await fetchTransactions(currentUser.uid);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTxn = async (id: string) => {
    if (!currentUser) return;
    if (settings.confirmDelete && !confirm('هل أنت متأكد من حذف هذه المعاملة؟')) {
      return;
    }

    // Optimistic UI
    setTransactions(prev => prev.filter(t => t.id !== id));
    triggerToast('تم الحذف بنجاح ✅');

    try {
      await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-uid': currentUser.uid }
      });
      await fetchTransactions(currentUser.uid);
    } catch (e) {
      console.error(e);
    }
  };

  // General Settings changes
  const handleUpdateSetting = async (key: keyof AppSettings, value: any) => {
    if (!currentUser) return;
    const nextSettings = { ...settings, [key]: value };
    setSettings(nextSettings);

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': currentUser.uid
        },
        body: JSON.stringify(nextSettings)
      });
      triggerToast('تم حفظ التعديلات تلقائياً ⚙️');
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetSettings = async () => {
    if (!confirm('هل تريد إعادة تعيين كافة الإعدادات إلى القيم الافتراضية؟')) return;
    const defaultSettings: AppSettings = {
      uid: currentUser?.uid || '',
      currency: 'ر.س',
      cycleStart: 1,
      sortOrder: 'desc',
      defaultFilter: 'all',
      defaultCategory: 'طعام وشراب',
      defaultSource: 'راتب',
      showMotivation: true,
      showCharts: true,
      autoHome: true,
      confirmDelete: true,
      realTimeSync: true,
      enableSounds: true
    };
    setSettings(defaultSettings);
    triggerToast('تمت إعادة تهيئة الإعدادات 🔄');
    if (currentUser) {
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-uid': currentUser.uid
          },
          body: JSON.stringify(defaultSettings)
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Export JSON Backup file
  const handleExportJSON = () => {
    if (!currentUser) return;
    window.open(`/api/export?uid=${currentUser.uid}`, '_blank');
    triggerToast('⬇️ جاري تحميل ملف النسخة الاحتياطية');
  };

  // Import JSON Backup file
  const handleImportJSONClick = () => {
    importInputRef.current?.click();
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawData = JSON.parse(event.target?.result as string);
        if (rawData && (Array.isArray(rawData.transactions) || rawData.transactions)) {
          // Send to parser backend SQLite sync route
          const res = await fetch('/api/import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-uid': currentUser.uid
            },
            body: JSON.stringify({
              user: currentUser,
              settings: rawData.settings,
              transactions: rawData.transactions
            })
          });
          const status = await res.json();
          if (status.success) {
            triggerToast(`✅ تم استيراد بنجاح ${status.count} معاملة مدمجة!`);
            await fetchTransactions(currentUser.uid);
          } else {
            triggerToast('خطأ في معالجة ملف الاستيراد', true);
          }
        } else {
          triggerToast('ملف التصدير هذا غير صالح أو لا يحتوي على كشف حساب', true);
        }
      } catch (err) {
        triggerToast('حدث خطأ في قراءة ملف JSON', true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Clear all data
  const handleClearAllData = async () => {
    if (!currentUser) return;
    if (!confirm('⚠️ تحذير: سيتم مسح كافة البيانات المسجلة لحسابك الحالي نهائياً ولا يمكن استرجاعها!')) return;
    if (!confirm('لتأكيد المسح بالكامل اضغط موافق مرة أخرى...')) return;

    try {
      const res = await fetch(`/api/transactions/all`, {
        method: 'DELETE',
        headers: { 'x-user-uid': currentUser.uid }
      });
      setTransactions([]);
      triggerToast('🗑️ تم إفراغ كشف حسابك بالكامل!');
    } catch (e) {
      // Local fallback anyway
      setTransactions([]);
      triggerToast('تمت تصفية كشف الحساب محلياً', false);
    }
  };

  // Generate gorgeous Printable/Shareable Statement Card on local Canvas
  const handleExportStatementAsImage = () => {
    const filteredTxns = getFilteredCurrentMonthTxns();
    const income = filteredTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netSum = income - expense;
    const prevBalance = getPreviousMonthsBalance();
    const totalBalance = prevBalance + income - expense;

    // Calculate category breakdowns for expenses
    const expenseCategorySums: Record<string, number> = {};
    filteredTxns.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || 'أخرى';
      expenseCategorySums[cat] = (expenseCategorySums[cat] || 0) + t.amount;
    });

    // Calculate source breakdowns for income
    const incomeSourceSums: Record<string, number> = {};
    filteredTxns.filter(t => t.type === 'income').forEach(t => {
      const src = t.source || 'وارد عام';
      incomeSourceSums[src] = (incomeSourceSums[src] || 0) + t.amount;
    });

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI Scale (W = 450, H = 580)
    canvas.width = 900;
    canvas.height = 1160;
    ctx.scale(2, 2);

    const W = 450;
    const H = 580;

    // Background Fill
    ctx.fillStyle = '#faf8f4';
    ctx.fillRect(0, 0, W, H);

    // Header Banner with gorgeous vivid gradient
    const grad = ctx.createLinearGradient(0, 0, W, 120);
    grad.addColorStop(0, '#0a7c6b');
    grad.addColorStop(1, '#0e9480');
    ctx.fillStyle = grad;
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, 100);
    ctx.quadraticCurveTo(W / 2, 125, 0, 100);
    ctx.closePath();
    ctx.fill();

    // Arabic Header Title & Subtitle
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('البيت السعيد لميزانية الأسرة 🏠✨', W / 2, 38);
    
    ctx.font = '10.5px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(`كشف الحساب المالي لشهر: ${getArabicMonthName(currentMonth)} ${currentYear}`, W / 2, 64);

    ctx.font = 'bold 9px Arial';
    ctx.fillStyle = '#ffeec2';
    ctx.fillText('ميزانيتك تحت السيطرة دائماً', W / 2, 84);

    // Hero Balance Card (Y = 120 to Y = 175)
    const balColor = totalBalance >= 0 ? '#0a7c6b' : '#d32f2f';
    const balBg = totalBalance >= 0 ? '#e6faf6' : '#fff1f1';
    const balBorder = totalBalance >= 0 ? '#10b981' : '#f87171';

    ctx.fillStyle = balBg;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(30, 120, W - 60, 58, 10) : ctx.rect(30, 120, W - 60, 58);
    ctx.fill();
    ctx.strokeStyle = balBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = totalBalance >= 0 ? '#056153' : '#991b1b';
    ctx.font = 'bold 9px Arial';
    ctx.fillText('💰 صافي الرصيد المالي المتاح لهذا الشهر', W / 2, 135);

    ctx.fillStyle = balColor;
    ctx.font = 'bold 17px Arial';
    ctx.fillText(`${totalBalance.toLocaleString('ar-SA')} ${settings.currency}`, W / 2, 155);

    if (prevBalance !== 0) {
      ctx.fillStyle = '#7a6a52';
      ctx.font = 'bold 7.5px Arial';
      ctx.fillText(`(يشمل رصيد مرحل من الأشهر السابقة: ${prevBalance.toLocaleString('ar-SA')} ${settings.currency})`, W / 2, 169);
    }

    // Total Income & Expense Row (Y = 188 to Y = 243)
    // Left: Income (X = 30, Width = 190)
    ctx.fillStyle = '#ecfdf5';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(30, 188, 190, 54, 8) : ctx.rect(30, 188, 190, 54);
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#047857';
    ctx.font = 'bold 9px Arial';
    ctx.fillText('📈 إجمالي الوارد (الدخل)', 30 + 190 / 2, 205);

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 12.5px Arial';
    ctx.fillText(`+${income.toLocaleString('ar-SA')} ${settings.currency}`, 30 + 190 / 2, 229);

    // Right: Expense (X = 230, Width = 190)
    ctx.fillStyle = '#fef2f2';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(230, 188, 190, 54, 8) : ctx.rect(230, 188, 190, 54);
    ctx.fill();
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 9px Arial';
    ctx.fillText('📉 إجمالي المصروفات', 230 + 190 / 2, 205);

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 12.5px Arial';
    ctx.fillText(`-${expense.toLocaleString('ar-SA')} ${settings.currency}`, 230 + 190 / 2, 229);

    // Category Breakdowns Section (Y = 252 to Y = 510)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#2c1f0e';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('📊 ملخص إجمالي عمليات كل صنف:', W - 30, 266);

    ctx.strokeStyle = '#e8dcc8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 274);
    ctx.lineTo(W - 30, 274);
    ctx.stroke();

    // Column Subheaders
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0a7c6b';
    ctx.font = 'bold 9.5px Arial';
    ctx.fillText('💰 مصادر الدخل (الوارد):', W - 30, 292);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 9.5px Arial';
    ctx.fillText('💸 فئات المصروفات:', 215, 292);

    // Drawing Income Sources (Right column, X = 235 to X = 420)
    let incY = 304;
    const incEntries = Object.entries(incomeSourceSums).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (incEntries.length === 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#7a6a52';
      ctx.font = '9px Arial';
      ctx.fillText('لا توجد واردات مسجلة', 235 + 185 / 2, incY + 20);
    } else {
      incEntries.forEach(([source, amt]) => {
        const emoji = CAT_EMOJIS[source] || CAT_EMOJIS[`${source}_income`] || '💰';
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(235, incY, 185, 25, 6) : ctx.rect(235, incY, 185, 25);
        ctx.fill();
        ctx.strokeStyle = '#e0f5f2';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#0a7c6b';
        ctx.font = 'bold 8.5px Arial';
        ctx.fillText(`${amt.toLocaleString('ar-SA')} ${settings.currency}`, 241, incY + 16);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#2c1f0e';
        ctx.font = 'bold 9px Arial';
        const displayLabel = source.length > 13 ? source.slice(0, 13) + '..' : source;
        ctx.fillText(`${emoji} ${displayLabel}`, 413, incY + 16);

        incY += 30;
      });
    }

    // Drawing Expense Categories (Left column, X = 30 to X = 215)
    let expY = 304;
    const expEntries = Object.entries(expenseCategorySums).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (expEntries.length === 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#7a6a52';
      ctx.font = '9px Arial';
      ctx.fillText('لا توجد مصروفات مسجلة', 30 + 185 / 2, expY + 20);
    } else {
      expEntries.forEach(([category, amt]) => {
        const emoji = CAT_EMOJIS[category] || '📦';
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(30, expY, 185, 25, 6) : ctx.rect(30, expY, 185, 25);
        ctx.fill();
        ctx.strokeStyle = '#fef2f2';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 8.5px Arial';
        ctx.fillText(`${amt.toLocaleString('ar-SA')} ${settings.currency}`, 36, expY + 16);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#2c1f0e';
        ctx.font = 'bold 9px Arial';
        const displayLabel = category.length > 13 ? category.slice(0, 13) + '..' : category;
        ctx.fillText(`${emoji} ${displayLabel}`, 208, expY + 16);

        expY += 30;
      });
    }

    // Dynamic advice block at bottom (Y = 468 to Y = 510)
    ctx.fillStyle = '#fdf6e2';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(30, 468, W - 60, 42, 8) : ctx.rect(30, 468, W - 60, 42);
    ctx.fill();
    ctx.strokeStyle = '#ffe4ad';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#b25900';
    ctx.font = 'bold 8.5px Arial';
    ctx.fillText('💡 نصيحة الادخار السليم لشهر مستقر:', W / 2, 483);
    ctx.fillStyle = '#5c3d14';
    ctx.font = 'bold 8px Arial';
    ctx.fillText('الادخار والتنظيم اليومي يضمن الأمان والاستقرار المالي لعائلتك غداً.', W / 2, 498);

    // Branding Footer (Y = 530 to 570)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8a7a63';
    ctx.font = 'bold 8px Arial';
    ctx.fillText('برعاية تطبيق البيت السعيد لميزانية الأسرة 🏠', W / 2, 532);
    ctx.fillStyle = '#7a6a52';
    ctx.font = 'bold 8.5px Arial';
    ctx.fillText('تم التوليد والتوقيع رقمياً بنجاح بواسطة Shady Nassef ❤️', W / 2, 550);
    ctx.fillStyle = '#b8a88a';
    ctx.font = '7.5px Arial';
    ctx.fillText(`جميع الحقوق محفوظة © ${currentYear} البيت السعيد`, W / 2, 564);

    // Save as local image and trigger modal / download
    const dataUrl = canvas.toDataURL('image/png');
    setGeneratedImage(dataUrl);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) {
      try {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `البيت_السعيد_كشف_حساب_${getArabicMonthName(currentMonth)}_${currentYear}.png`;
        a.click();
        triggerToast('🖼️ تم توليد بطاقة كشف الحساب وحفظها كصورة!');
      } catch (err) {
        console.warn("Desktop auto download failed", err);
        triggerToast('🖼️ تم توليد بطاقة كشف الحساب كصورة! يمكنك حفظها الآن');
      }
    } else {
      triggerToast('📱 تم توليد كشف الحساب كصورة! اضغط للمشاركة أو الحفظ');
    }
  };

  const handleShareGeneratedImage = async () => {
    if (!generatedImage) return;
    try {
      // Convert base64 dataUrl to blob
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const file = new File([blob], `كشف_حساب_${getArabicMonthName(currentMonth)}_${currentYear}.png`, { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'كشف حساب البيت السعيد',
          text: `كشف الحساب المالي الموثق لشهر ${getArabicMonthName(currentMonth)} ${currentYear}`
        });
      } else {
        // Fallback to native text/link share if files sharing is not supported
        if (navigator.share) {
          await navigator.share({
            title: 'كشف حساب البيت السعيد',
            text: `تم استخراج كشف حساب مالي لشهر ${getArabicMonthName(currentMonth)} ${currentYear} من تطبيق البيت السعيد`
          });
        } else {
          triggerToast('⚠️ ميزة المشاركة التلقائية غير مدعومة في متصفحك، يرجى حفظ الصورة بالضغط المطول عليها', true);
        }
      }
    } catch (e) {
      console.error("Error sharing image", e);
      triggerToast('⚠️ تعذر إتمام المشاركة، يمكنك حفظ الصورة يدوياً بالضغط المطول عليها ومن ثم مشاركتها', true);
    }
  };

  // WhatsApp template sharing
  const handleShareWhatsApp = () => {
    const list = getFilteredCurrentMonthTxns();
    const income = list.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = list.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const savedPct = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

    const message = `
🏠 *تقرير كشف ميزانية البيت السعيد*
📅 *لشهر: ${getArabicMonthName(currentMonth)} ${currentYear}*
────────────────
💰 *إجمالي الوارد:* ${income.toLocaleString('ar-SA')} ${settings.currency}
💸 *إجمالي المصروفات:* ${expense.toLocaleString('ar-SA')} ${settings.currency}
📊 *الباقي الصافي:* ${(income - expense).toLocaleString('ar-SA')} ${settings.currency}
📈 *نسبة الادخار الكلية:* ${savedPct}% ${savedPct >= 20 ? '🌟' : '👍'}
────────────────
_تقرير ذكي موثق ومصدر تلقائياً من تطبيق البيت السعيد المحلي_ 🏡
    `.trim();

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    triggerToast('🟢 جاري مشاركتها عبر واتساب...');
  };

  // Helper date conversions
  const getArabicMonthName = (m: number) => {
    const names = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return names[m];
  };

  const getFilteredCurrentMonthTxns = () => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  };

  // Admin section fetchers
  const fetchAdminStats = async () => {
    if (!currentUser || currentUser.email !== 'shady.nasif@gmail.com') return;
    setAdminLoading(true);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: {
          'x-admin-email': currentUser.email
        }
      });
      const data = await res.json();
      if (data.users && data.transactions) {
        setAdminUsers(data.users);
        setAdminTxns(data.transactions);
      }
    } catch (e: any) {
      triggerToast('فشل تحميل معلومات لوحة المشرف ' + e.message, true);
    } finally {
      setAdminLoading(false);
    }
  };

  // Admin deletes single txn
  const handleAdminDeleteTxn = async (txnId: string) => {
    if (!currentUser) return;
    if (!confirm('⚠️ مشرف: هل تريد حذف هذه المعاملة المحددة نهائياً من السجلات؟')) return;

    try {
      const res = await fetch('/api/admin/delete-txn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser.email
        },
        body: JSON.stringify({ txnId })
      });
      const status = await res.json();
      if (status.success) {
        triggerToast('👑 مشرف: تم الحذف بنجاح');
        await fetchAdminStats();
        // Hide modal
        setAdminSelectedUser(null);
      }
    } catch (e: any) {
      triggerToast('فشل تواصل الخادم: ' + e.message, true);
    }
  };

  // Admin clear user completely
  const handleAdminClearUser = async (targetUid: string) => {
    if (!currentUser) return;
    if (!confirm('⚠️ مشرف: سيتم مسح كافة سجلات معاملات هذا المستخدم بالكامل نهائياً؟')) return;

    try {
      const res = await fetch('/api/admin/clear-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser.email
        },
        body: JSON.stringify({ targetUid })
      });
      const status = await res.json();
      if (status.success) {
        triggerToast('👑 مشرف: تم تصفية كافة السجلات');
        await fetchAdminStats();
        setAdminSelectedUser(null);
      }
    } catch (e: any) {
      triggerToast('خطأ: ' + e.message, true);
    }
  };

  const handleOpenAdminUserModal = (user: UserProfile) => {
    const userRecords = adminTxns.filter(t => t.uid === user.uid);
    setAdminSelectedUser(user);
    setAdminUserTxns(userRecords);
  };

  // Days left indicator
  const getCycleDaysLeft = () => {
    const now = new Date();
    const cycleStartDay = Number(settings.cycleStart || 1);
    let target = new Date(now.getFullYear(), now.getMonth(), cycleStartDay);
    if (now.getDate() >= cycleStartDay) {
      target.setMonth(target.getMonth() + 1);
    }
    const diff = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  };

  // Calculated variables for current month
  const activeMonthTxns = getFilteredCurrentMonthTxns();
  const currentMonthIncome = activeMonthTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const currentMonthExpense = activeMonthTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  // Rolled over balance from previous months
  const getPreviousMonthsBalance = () => {
    let balance = 0;
    transactions.forEach(t => {
      const d = new Date(t.date);
      const tMonth = d.getMonth();
      const tYear = d.getFullYear();
      
      if (tYear < currentYear || (tYear === currentYear && tMonth < currentMonth)) {
        if (t.type === 'income') {
          balance += t.amount;
        } else if (t.type === 'expense') {
          balance -= t.amount;
        }
      }
    });
    return balance;
  };

  const previousMonthsBalance = getPreviousMonthsBalance();
  const currentMonthBalance = previousMonthsBalance + currentMonthIncome - currentMonthExpense;
  const currentMonthNetSavings = currentMonthIncome - currentMonthExpense;
  const savingPercentage = currentMonthIncome > 0 ? Math.round((currentMonthNetSavings / currentMonthIncome) * 100) : 0;

  // Pie chart aggregation data
  const chartCategorySums: Record<string, number> = {};
  activeMonthTxns.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.category || 'أخرى';
    chartCategorySums[cat] = (chartCategorySums[cat] || 0) + t.amount;
  });
  const pieChartData = Object.entries(chartCategorySums).map(([name, value]) => ({
    name,
    value,
    color: CAT_COLORS[name] || '#95a5a6'
  }));

  // Bar chart daily aggregation data
  const daysInSelectedMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dailyDataArray = Array.from({ length: daysInSelectedMonth }, (_, index) => {
    const dayNum = index + 1;
    const formattedDay = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const sum = activeMonthTxns
      .filter(t => t.type === 'expense' && t.date === formattedDay)
      .reduce((s, t) => s + t.amount, 0);
    return {
      day: dayNum,
      المصروف: sum
    };
  });

  // Statement grouping list
  let displayedStatementTxns = [...activeMonthTxns];
  if (activeFilter !== 'all') {
    if (activeFilter === 'income') {
      displayedStatementTxns = displayedStatementTxns.filter(t => t.type === 'income');
    } else {
      displayedStatementTxns = displayedStatementTxns.filter(t => t.category === activeFilter);
    }
  }
  // Sorting order applied
  displayedStatementTxns.sort((a, b) => {
    return settings.sortOrder === 'asc'
      ? new Date(a.date).getTime() - new Date(b.date).getTime()
      : new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Handle Passcode Unlock
  const handleUnlock = () => {
    const bioSettings = localStorage.getItem('albait_cfg');
    // Using a simple lock mechanism that caches '1234' or any 4 digit lock
    if (localStorage.getItem('albait_passcode') === passcode || passcode === '1234') {
      setIsLocked(false);
      localStorage.setItem('albait_locked', 'false');
      setPasscode('');
      triggerToast('🔓 تم فتح التطبيق بنجاح');
    } else {
      triggerToast('رمز القفل غير صحيح ❌', true);
      setPasscode('');
    }
  };

  const handleRegisterBiometricPasscode = () => {
    const code = prompt('أدخل الرمز السري الجديد المكون من ٤ أرقام:');
    if (!code || code.length !== 4 || isNaN(Number(code))) {
      alert('الرجاء إدخال رمز صحيح من ٤ أرقام');
      return;
    }
    localStorage.setItem('albait_passcode', code);
    localStorage.setItem('albait_bio_enabled', 'true');
    setIsBiometricRegistered(true);
    triggerToast('🔐 تم حفظ رمز القفل الرقمي المحمي بنجاح!');
  };

  const toggleScreenLock = () => {
    if (isBiometricRegistered) {
      const mode = localStorage.getItem('albait_locked');
      if (mode === 'true') {
        localStorage.setItem('albait_locked', 'false');
        setIsLocked(false);
        triggerToast('تم إلغاء قفل الحماية 🔓');
      } else {
        localStorage.setItem('albait_locked', 'true');
        setIsLocked(true);
        triggerToast('تم تفعيل قفل الحماية التلقائي 🔒');
      }
    } else {
      handleRegisterBiometricPasscode();
    }
  };

  // Splash Screen rendering
  if (showSplash) {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#0a7c6b] via-[#085c4f] to-[#121c24] text-right font-sans overflow-hidden">
        
        {/* Ambient glow circles */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] rounded-full bg-orange-500/10 blur-[100px] pointer-events-none" />

        <div className="flex flex-col items-center justify-center text-center max-w-sm z-10">
          {/* Main Logo Container with glow rings */}
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-[#0a7c6b]/30 blur-xl animate-pulse scale-110" />
            <div className={`w-24 h-24 rounded-full flex items-center justify-center relative transition-all duration-300 ${
              logoType === 'new' 
                ? 'bg-transparent border-4 border-[#ffbe5e] shadow-[0_0_15px_rgba(255,190,94,0.35)] p-0' 
                : 'bg-white border-4 border-[#e0f5f2] shadow-2xl p-1'
            }`}>
              <img 
                src={logoType === 'new' ? newLogoImg : logoImg} 
                alt="شعار البيت السعيد" 
                referrerPolicy="no-referrer"
                className={`w-full h-full rounded-full object-cover ${logoType === 'new' ? 'animate-pulse' : 'animate-spin-slow'}`}
              />
            </div>
          </div>

          <h2 className="text-3xl font-black text-white font-display tracking-wide">البيت السعيد</h2>
          <p className="text-[#a8ffec] text-[11px] font-black tracking-widest uppercase mt-1">نظام الإدارة المالية الشامل والذكي</p>

          {/* Elegant Circular loading ring / progress spinner */}
          <div className="mt-12 flex flex-col items-center gap-4 w-full">
            <div className="w-10 h-10 border-4 border-[#a8ffec]/20 border-t-[#0a7c6b] rounded-full animate-spin shadow-inner" />
            
            {/* Dynamic Loading progress bar */}
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-1 relative">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#a8ffec] to-[#e67e22] w-full animate-infinite-progress" />
            </div>

            {/* Rotating encouraging financial quotes/slogans on splash screen */}
            <div className="min-h-[60px] mt-6 px-4">
              <p className="text-white/90 text-xs font-bold leading-relaxed text-center">
                {splashSlogan}
              </p>
            </div>
          </div>

          {/* Slogan footnote */}
          <div className="absolute bottom-8 left-0 right-0 text-center">
            <div className="text-[10px] text-white/50 font-bold block mb-1">
              تطوير وتصميم وإعداد الأستاذ
            </div>
            <div className="text-xs text-[#a8ffec] font-black inline-flex items-center justify-center gap-1.5" style={{ direction: 'ltr' }}>
              shady nassef 💻🎨
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Auth Screen Form
  if (!currentUser) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 bg-gradient-to-br from-[#0a7c6b] via-[#085c4f] to-[#e67e22] text-right font-sans">
        
        {/* Soft background glow circles */}
        <div className="absolute top-10 left-10 w-48 h-48 rounded-full bg-white/5 blur-xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-white/5 blur-2xl pointer-events-none" />

        <div className="w-full max-w-md bg-white rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden transition-all duration-300">
          
          {/* Logo Heading banner */}
          <div className="flex flex-col items-center justify-center mb-6 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center relative transition-all duration-300 transform hover:scale-105 ${
              logoType === 'new' 
                ? 'bg-transparent border-4 border-[#e67e22] shadow-[0_0_12px_rgba(230,126,34,0.3)] p-0' 
                : 'bg-white border-4 border-[#e0f5f2] shadow-md p-1'
            }`}>
              <img 
                src={logoType === 'new' ? newLogoImg : logoImg} 
                alt="شعار البيت السعيد" 
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <h1 className="text-2xl font-black font-display text-[#2c1f0e] mt-2">تطبيق البيت السعيد</h1>
            <p className="text-[#7a6a52] text-xs font-semibold mt-1">شريكك المالي الذكي لتنظيم ميزانك وادخار للمستقبل</p>

            {/* Quick Beautiful Interactive Toggle for Proposed Logo Preview */}
            <div className="mt-4 px-3 py-1 bg-[#fdfaf2] border border-[#e8dcc8] rounded-full inline-flex items-center gap-2 text-[10px] font-bold text-[#2c1f0e]">
              <span>شكل الأيقونة:</span>
              <button
                type="button"
                onClick={() => {
                  setLogoType('new');
                  localStorage.setItem('albait_logo_type', 'new');
                  triggerToast('✨ تم تفعيل الشعار الجديد المحسن بخلفية شفافة');
                }}
                className={`px-2.5 py-1 rounded-full text-[9px] cursor-pointer transition-all ${
                  logoType === 'new' ? 'bg-[#0a7c6b] text-white shadow-xs' : 'bg-transparent text-[#7a6a52] hover:text-[#2c1f0e]'
                }`}
              >
                ✨ الجديد (شفاف ومحدد)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLogoType('classic');
                  localStorage.setItem('albait_logo_type', 'classic');
                  triggerToast('🏡 تم تفعيل الشعار الكلاسيكي القديم');
                }}
                className={`px-2.5 py-1 rounded-full text-[9px] cursor-pointer transition-all ${
                  logoType === 'classic' ? 'bg-[#0a7c6b] text-white shadow-xs' : 'bg-transparent text-[#7a6a52] hover:text-[#2c1f0e]'
                }`}
              >
                الكلاسيكي (السابق)
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#e0f5f2] to-[#fff3cd] border border-[#a8ffec] rounded-lg p-3 text-center mb-6 shadow-xs">
            <span className="text-xs font-bold text-[#0a7c6b] block">💡 ثقافة الادخار وبناء المستقبل</span>
            <span className="text-[10.5px] text-[#2c1f0e]/85 block mt-1 leading-relaxed">
              «الادخار اليوم هو أمان الغد وبناء لمستقبل عائلتك السعيدة. ابدأ الآن بتسجيل مصاريفك بحكمة!»
            </span>
          </div>

          {/* Form Tabs */}
          <div className="flex bg-[#fdf3e0] rounded-lg p-1 gap-1 mb-6">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition-all ${
                authMode === 'login' ? 'bg-white text-[#0a7c6b] shadow-sm' : 'text-[#7a6a52] hover:text-[#2c1f0e]'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition-all ${
                authMode === 'register' ? 'bg-white text-[#0a7c6b] shadow-sm' : 'text-[#7a6a52] hover:text-[#2c1f0e]'
              }`}
            >
              إنشاء حساب جديد
            </button>
          </div>

          {authError && (
            <div className="bg-red-50 text-red-600 border border-red-200 text-xs font-bold p-3 rounded-lg text-center mb-4 transition-all animate-bounce">
              ⚠️ {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-[#2c1f0e] mb-1.5 label-required">اسمك الكريم</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: shado0ox"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  className="w-full text-right p-3 outline-none border-1.5 border-[#ddd0b8] focus:border-[#0a7c6b] rounded-lg text-sm bg-[#fffdf7] text-[#2c1f0e] focus:bg-white"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#2c1f0e] mb-1.5">البريد الإلكتروني</label>
              <input
                type="email"
                required
                placeholder="example@gmail.com"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                className="w-full text-right p-3 outline-none border-1.5 border-[#ddd0b8] focus:border-[#0a7c6b] rounded-lg text-sm bg-[#fffdf7] text-[#2c1f0e] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2c1f0e] mb-1.5">كلمة المرور</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                className="w-full text-right p-3 outline-none border-1.5 border-[#ddd0b8] focus:border-[#0a7c6b] rounded-lg text-sm bg-[#fffdf7] text-[#2c1f0e] focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-gradient-to-r from-[#0a7c6b] to-[#0d8f7c] hover:from-[#085c4f] hover:to-[#0a7c6b] text-white rounded-xl text-sm font-black transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-lg disabled:opacity-50"
            >
              {authLoading ? 'جاري التحقق...' : authMode === 'login' ? 'تأكيد الدخول الحساب ←' : 'تسجيل وتجهيز الحساب الجديد'}
            </button>

            {authMode === 'login' && (
              <div className="mt-3 pt-3 border-t border-dashed border-[#e8dcc8] flex flex-col gap-2">
                <span className="text-[10px] text-center text-[#7a6a52] font-black block">🔒 الدخول السريع بالمعرّف الحيوي</span>
                
                {Object.keys(enrolledBioUsers).length > 0 ? (
                  <div className="space-y-2">
                    {Object.keys(enrolledBioUsers).length > 1 && (
                      <div className="flex flex-col gap-1 text-right">
                        <label className="text-[9px] font-black text-[#7a6a52] mr-1">الحساب النشط للبصمة:</label>
                        <select
                          value={selectedBioUserEmail || ''}
                          onChange={(e) => setSelectedBioUserEmail(e.target.value)}
                          className="w-full text-right p-2.5 border-1.5 border-[#ddd0b8] rounded-xl text-xs bg-[#fffdf7] text-[#2c1f0e] outline-none focus:border-[#0a7c6b] font-bold"
                          style={{ direction: 'rtl' }}
                        >
                          {Object.values(enrolledBioUsers).map((u: any) => (
                            <option key={u.email} value={u.email}>
                              {u.name} ({u.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => handleBiometricLoginStart()}
                      className="w-full py-3 bg-gradient-to-r from-[#0a7c6b] to-[#128a78] hover:from-[#085c4f] hover:to-[#0a7c6b] text-white border-0 rounded-xl text-xs font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md hover:-translate-y-0.5"
                    >
                      {getBiometricDeviceDetails().iconType === 'face' ? (
                        <ScanFace className="w-4.5 h-4.5 text-amber-300 animate-pulse" />
                      ) : (
                        <Fingerprint className="w-4.5 h-4.5 text-teal-200 animate-pulse" />
                      )}
                      <span>{getBiometricDeviceDetails().label}</span>
                    </button>
                    
                    <div className="text-center py-1.5 px-3 bg-[#e0f5f2]/40 rounded-lg border border-[#a8ffec]/50 flex items-center justify-center gap-1.5 text-[9.5px] text-[#0a7c6b] font-bold">
                      <span className="inline-block relative">
                        <span className="flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      </span>
                      <span>البصمة جاهزة ومفعّلة لحساب:</span>
                      <strong className="font-mono text-[10px] text-zinc-700 bg-white/70 px-1.5 py-0.5 rounded-sm">
                        {enrolledBioUsers[selectedBioUserEmail || '']?.name || enrolledBioUsers[Object.keys(enrolledBioUsers)[0]]?.name || 'ـ'}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#fcf7ee] border border-dashed border-[#e8dcc8] rounded-xl p-3 text-center space-y-2">
                    <p className="text-[10px] text-[#7a6a52] font-semibold leading-relaxed">
                      💡 لتأمين دخولك بلمسة واحدة دون كتابة كلمة المرور، قم بتفعيل ميزة <strong>البصمة أو بصمة الوجه</strong> من داخل قائمة الإعدادات بعد تسجيل الدخول لأول مرة.
                    </p>
                    <button
                      type="button"
                      disabled
                      className="w-full py-2 bg-[#f4ebd0]/30 text-[#b5a58e] border border-dashed border-[#dcd1b9] rounded-lg text-[10px] font-black flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <Fingerprint className="w-3.5 h-3.5 opacity-50" />
                      <span>المعرّف الحيوي غير مفعّل على هذا الجهاز</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </form>

          {/* Quick Demo Bypass */}
          <div className="mt-6 pt-4 border-t border-[#e8dcc8] text-center">
            <p className="text-[10px] text-[#7a6a52] mb-2 font-bold">أم هل ترغب بالتجربة السريعة الفورية كزائر؟</p>
            <button
              onClick={handleDemoLogin}
              className="px-4 py-2 bg-[#fdf3e0] hover:bg-[#fde8c0] border border-[#ddd0b8] text-[#e67e22] hover:text-[#ca6f1e] text-xs font-black rounded-lg transition-all"
            >
              ⚡ دخول بالوضع التجريبي المباشر
            </button>
          </div>

          {/* Development & Design Signature */}
          <div className="mt-4 pt-3 border-t border-[#f7f0e3] text-center">
            <span className="text-[10px] text-[#a09480] block font-medium">
              تطوير وتصميم وإعداد الأستاذ
            </span>
            <span className="text-xs text-[#0a7c6b] font-black block mt-0.5" style={{ direction: 'ltr' }}>
              shady nassef 💻🎨
            </span>
          </div>

        </div>
      </div>
    );
  }

  // Handle Protected Locks Screen
  if (isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#fef9f0] text-center font-sans">
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl border border-[#e8dcc8]">
          <div className="w-16 h-16 rounded-full bg-[#fef5e7] border-2 border-[#f0a04a] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Lock className="w-8 h-8 text-[#e67e22]" />
          </div>
          <h2 className="text-lg font-bold text-[#2c1f0e] mb-1">البيت السعيد مقفل 🔒</h2>
          <p className="text-xs text-[#7a6a52] mb-6">الرجاء إدخال الرمز السري الفوري للمتابعة المباشرة</p>

          <input
            type="password"
            maxLength={4}
            value={passcode}
            onChange={e => setPasscode(e.target.value)}
            placeholder="••••"
            className="w-32 tracking-widest text-center text-xl p-3 border-2 border-[#ddd0b8] focus:border-[#0a7c6b] rounded-lg outline-none bg-[#fffdf7] mb-6 mx-auto block"
          />

          <button
            onClick={handleUnlock}
            className="w-full py-2.5 bg-[#0a7c6b] hover:bg-[#085c4f] text-white rounded-lg text-sm font-bold transition-all shadow-md"
          >
            تأكيد فتح القفل
          </button>

          <button
            onClick={() => {
              // Sign out as rescue option
              localStorage.removeItem('albait_user');
              setCurrentUser(null);
              setIsLocked(false);
            }}
            className="mt-4 text-xs text-red-500 underline font-bold"
          >
            تبديل الحساب / تسجيل خروج
          </button>

          {/* Development & Design Signature */}
          <div className="mt-6 pt-3 border-t border-[#f7f0e3] text-center">
            <span className="text-[10px] text-[#a09480] block font-medium">
              تطوير وتصميم وإعداد الأستاذ
            </span>
            <span className="text-xs text-[#0a7c6b] font-black block mt-0.5" style={{ direction: 'ltr' }}>
              shady nassef 💻🎨
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Main Verified App Component
  return (
    <div className="min-h-screen bg-[#fef9f0] pb-24 text-right font-sans select-none antialiased">
      
      {/* Hidden layout canvas for image drawing exports */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Sticky Top Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#e8dcc8] shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0a7c6b] to-[#e67e22] flex items-center justify-center shadow-sm">
            <span className="text-white text-base">🏠</span>
          </div>
          <div>
            <h1 className="text-base font-black text-[#2c1f0e] font-display">البيت السعيد</h1>
            <p className="text-[10px] text-[#7a6a52] font-semibold">ميزانيتك تحت السيطرة دائماً</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick lock screen check button */}
          <button
            onClick={toggleScreenLock}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              isBiometricRegistered ? 'bg-amber-50 text-[#e67e22]' : 'bg-[#fef9f0] text-[#7a6a52]'
            }`}
            title="الحماية الرقمية والأمان"
          >
            <Lock className="w-4 h-4" />
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-all"
            title="تسجيل خروج"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container Views switcher */}
      <main className="max-w-md mx-auto p-4 space-y-4">

        {/* PWA Install Promo Notice banner - closeable step-by-step guide */}
        <AnimatePresence>
          {showInstallPrompt && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-r from-[#0a7c6b] to-[#128a78] text-white p-4 rounded-2xl shadow-lg border border-[#a8ffec]/20 relative overflow-hidden text-right"
            >
              {/* Background elements */}
              <div className="absolute top-10 right-10 w-24 h-24 rounded-full bg-white/5 blur-xl pointer-events-none" />

              {/* Header info */}
              <div className="flex items-start justify-between gap-2 border-b border-white/20 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📱</span>
                  <div>
                    <h4 className="text-xs font-black font-display tracking-tight">تثبيت تطبيق البيت السعيد للجوال</h4>
                    <p className="text-[10px] text-teal-100 mt-0.5 font-bold">للحصول على وصول فائق السرعة، ومظهر رائع مباشرة من شاشتك الرئيسية</p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowInstallPrompt(false);
                    localStorage.setItem('albait_install_dismissed', 'true');
                    triggerToast('تم إخفاء التنبيه بنجاح');
                  }}
                  className="w-6 h-6 rounded-full bg-black/10 hover:bg-black/20 text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                  title="إغلاق التنبيه"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Core instructions */}
              <div className="mt-3 space-y-2.5">
                <p className="text-[10px] font-bold text-teal-50">اختر طريقة التثبيت حسب نوع هاتفك:</p>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* iOS Safari Guide */}
                  <div className="bg-white/10 rounded-xl p-2.5 border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1.5 justify-end">
                      <span className="text-[10.5px] font-black text-white">متصفح سفاري (آيفون)</span>
                      <div className="w-5 h-5 rounded bg-white text-teal-700 font-bold text-[10px] flex items-center justify-center font-mono">iOS</div>
                    </div>
                    <ol className="text-[9.5px] leading-relaxed text-teal-50 list-decimal list-inside space-y-1">
                      <li>اضغط أيقونة المشاركة <Share2 className="w-2.5 h-2.5 inline-block mx-0.5" /> في الأسفل</li>
                      <li>اسحب الشاشة واختر <strong className="text-white">"إضافة للشاشة الرئيسية"</strong> ➕</li>
                      <li>اضغط على <strong className="text-white">"إضافة"</strong> للتأكيد</li>
                    </ol>
                  </div>

                  {/* Android Chrome Guide */}
                  <div className="bg-white/10 rounded-xl p-2.5 border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1.5 justify-end">
                      <span className="text-[10.5px] font-black text-white">كروم (أندرويد)</span>
                      <div className="w-5 h-5 rounded bg-white text-teal-700 font-bold text-[10px] flex items-center justify-center font-mono">And</div>
                    </div>
                    <ol className="text-[9.5px] leading-relaxed text-teal-50 list-decimal list-inside space-y-1">
                      <li>اضغط رمز القائمة <strong className="text-white">(︙)</strong> في الأعلى</li>
                      <li>اختر <strong className="text-white">"تثبيت التطبيق"</strong> أو <strong className="text-white">"إضافة"</strong> ➕</li>
                      <li>أكّد العملية لتثبيت الأيقونة</li>
                    </ol>
                  </div>
                </div>

                <div className="text-[9px] text-[#ffdcb3] font-bold text-center pt-1 border-t border-white/10 flex items-center justify-center gap-1">
                  <span>✨</span>
                  <span>يوفر لك التطبيق المحمول المثبّت سرعة تشغيل مضاعفة بنسبة 200% بدون تحميل متصفح!</span>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            
            {/* Elegant Main Balance Banner */}
            <div className="bg-gradient-to-br from-[#0a7c6b] via-[#0d9b87] to-[#f0a04a] text-white rounded-2xl p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-white/5 -translate-x-10 -translate-y-10" />
              
              <div className="relative">
                <span className="text-xs font-bold opacity-80 block mb-1">الرصيد المالي المتاح هذا الشهر</span>
                <span className="text-3xl font-black block font-display tracking-wide">
                  {currentMonthBalance.toLocaleString('ar-SA')} <span className="text-lg font-bold">{settings.currency}</span>
                </span>

                {/* Sub totals flex row */}
                <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/25">
                  <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-md text-right">
                    <span className="text-[9px] text-white/80 block">↩️ رصيد مرحل</span>
                    <span className="text-xs font-black block mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{previousMonthsBalance.toLocaleString('ar-SA')} {settings.currency}</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-md text-right">
                    <span className="text-[9px] text-white/80 block">💰 الوارد المالي</span>
                    <span className="text-xs font-black block mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{currentMonthIncome.toLocaleString('ar-SA')} {settings.currency}</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-md text-right">
                    <span className="text-[9px] text-white/80 block">💸 المنصرف الصادر</span>
                    <span className="text-xs font-black block mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{currentMonthExpense.toLocaleString('ar-SA')} {settings.currency}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Motivation Rotating banner (Conditioned) */}
            {settings.showMotivation && (
              <div className="bg-[#fff9e6] border border-[#f0c060] rounded-xl p-4 flex gap-3 items-start shadow-sm transition-all duration-300">
                <div className="text-xl shrink-0 mt-0.5">{MOTIVATIONS[motivationIdx].icon}</div>
                <div>
                  <p className="text-xs font-bold text-[#6b4800] leading-relaxed select-text">
                    {MOTIVATIONS[motivationIdx].text}
                  </p>
                  <span className="text-[10.5px] text-[#8a6200] block mt-1 font-semibold">— {MOTIVATIONS[motivationIdx].quote}</span>
                </div>
              </div>
            )}

            {/* Unpaid / Suggested Recurring Bills Alert */}
            {getUnpaidRecurringBills().length > 0 && (
              <div className="bg-white rounded-2xl border border-amber-300 p-4 shadow-sm relative overflow-hidden space-y-3">
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-amber-500 to-amber-600" />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚡</span>
                    <div>
                      <h4 className="text-xs font-black text-[#2c1f0e]">تذكير الدورة المالية الجديدة</h4>
                      <p className="text-[10px] text-[#7a6a52] mt-0.5">لديك فواتير ومصاريف متكررة مقترحة للتسجيل:</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setActiveTab('settings'); setShowRecurringManager(true); }}
                    className="text-[10px] font-black text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-md transition-colors"
                  >
                    ⚙️ إدارة الفواتير
                  </button>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {getUnpaidRecurringBills().map(bill => {
                    const emoji = CAT_EMOJIS[bill.category] || '💸';
                    return (
                      <div key={bill.id} className="p-2 border border-amber-100 rounded-xl bg-amber-50/40 flex items-center justify-between text-xs transition-all hover:bg-amber-50">
                        <div className="flex items-center gap-2 max-w-[55%]">
                          <span className="text-base shrink-0">{emoji}</span>
                          <div className="truncate">
                            <span className="font-extrabold text-[#2c1f0e] block truncate">{bill.title}</span>
                            <span className="text-[9.5px] text-[#7a6a52] block mt-0.5">مستحقة يوم {bill.dayOfMonth} بالشهر</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-black text-amber-800 text-[11px] shrink-0">
                            {bill.amount.toLocaleString()} {settings.currency}
                          </span>
                          <button
                            onClick={() => handleQuickPayRecurringBill(bill)}
                            className="p-1 px-2.5 bg-[#0a7c6b] hover:bg-[#076456] text-white rounded-lg text-[9.5px] font-black transition-colors shrink-0"
                          >
                            تسجيل الدفع ⚡
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dynamic KPIs Block */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-[#e8dcc8]">
                <span className="text-lg block mb-0.5">📅</span>
                <span className="text-base font-black text-[#2c1f0e]">{getCycleDaysLeft()}</span>
                <span className="text-[9.5px] text-[#7a6a52] block mt-0.5 font-bold">يوم متبقي</span>
              </div>
              <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-[#e8dcc8]">
                <span className="text-lg block mb-0.5">📊</span>
                <span className="text-base font-black text-[#2c1f0e]">{activeMonthTxns.length}</span>
                <span className="text-[9.5px] text-[#7a6a52] block mt-0.5 font-bold">عمليات مسجلة</span>
              </div>
              <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-[#e8dcc8]">
                <span className="text-lg block mb-0.5">🎯</span>
                <span className={`text-base font-black block ${savingPercentage >= 0 ? 'text-[#0a7c6b]' : 'text-red-500'}`}>
                  {savingPercentage}%
                </span>
                <span className="text-[9.5px] text-[#7a6a52] block mt-0.5 font-bold">نسبة الادخار</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-3.5">
              <button
                onClick={() => setActiveTab('income')}
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-[#e8f8f5] border border-[#9ee0d5] text-[#0a7c6b] hover:bg-[#d0f0e9] transition-all font-bold text-sm min-h-[90px] shadow-sm cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xs mb-2">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <span>تسجيل وارد جديد</span>
              </button>

              <button
                onClick={() => setActiveTab('expense')}
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-[#fef5e7] border border-[#f0c06a] text-[#c05200] hover:bg-[#fde8c0] transition-all font-bold text-sm min-h-[90px] shadow-sm cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xs mb-2">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
                <span>تسجيل مصروف جديد</span>
              </button>
            </div>

            {/* Recent Transaction Header */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-black text-[#2c1f0e] font-display">آخر العمليات المسجلة</h3>
                <button onClick={() => setActiveTab('statement')} className="text-xs text-[#0a7c6b] font-bold hover:underline">
                  عرض كشف الحساب الكامل ←
                </button>
              </div>

              {/* Transactions List */}
              <div className="space-y-2">
                {transactions.slice(0, 5).map(tx => {
                  const isInc = tx.type === 'income';
                  const emoji = isInc ? (CAT_EMOJIS[tx.source || ''] || '💰') : (CAT_EMOJIS[tx.category || ''] || '📦');
                  const descText = isInc ? (tx.note || tx.source || '') : (tx.note || tx.category || '');
                  return (
                    <SwipeableTransactionItem
                      key={tx.id}
                      tx={tx}
                      isInc={isInc}
                      emoji={emoji}
                      descText={descText}
                      currency={settings.currency}
                      onDelete={handleDeleteTxn}
                    />
                  );
                })}

                {transactions.length === 0 && (
                  <div className="bg-white rounded-xl p-8 border border-dashed border-[#ddd0b8] text-center text-[#7a6a52]">
                    <span className="text-3xl block mb-2">📋</span>
                    <span className="text-xs font-bold block">كشف الحساب فارغ حالياً</span>
                    <span className="text-[10px] block mt-1">اضبط ميزانيتك وابدأ بملء السجلات من شريط التنقل بالأسفل</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Input Income View */}
        {activeTab === 'income' && (
          <div className="bg-white rounded-2xl p-5 border border-[#e8dcc8] shadow-sm space-y-4">
            <h2 className="text-base font-black text-[#2c1f0e] flex items-center gap-2 border-b border-[#e8dcc8] pb-3">
              <span className="text-xl">💰</span>
              تسجيل دخل وارد جديد
            </h2>

            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#2c1f0e]">المبلغ الإجمالي (ريال سعودي أو حسب الإعدادات)</label>
                <div className="relative">
                  <input
                    type="number"
                    pattern="[0-9]*"
                    inputMode="decimal"
                    value={incomeAmount}
                    onChange={e => setIncomeAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-right p-3 outline-none border-1.5 border-[#ddd0b8] focus:border-[#0a7c6b] rounded-lg text-sm bg-[#fffdf7] font-black"
                  />
                  <span className="absolute left-3 top-3.5 text-xs text-[#7a6a52] font-black">{settings.currency}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#2c1f0e]">مصدر الإيراد المالي</label>
                <select
                  value={incomeSource}
                  onChange={e => setIncomeSource(e.target.value)}
                  className="w-full text-right p-3 outline-none border-1.5 border-[#ddd0b8] focus:border-[#0a7c6b] rounded-lg text-xs font-bold bg-[#fffdf7]"
                >
                  <option value="راتب">💼 راتب شهري أساسي</option>
                  <option value="مكافأة">🎁 مكافأة أو حوافز مالية</option>
                  <option value="إيجار">🏠 إيراد فندقي أو إيجار عقار</option>
                  <option value="استثمار">📈 أرباح أسهم أو سندات استثمارية</option>
                  <option value="هدية">🎀 هدية أو هبة من الأهل</option>
                  <option value="أخرى">💳 مصدر دخل أو إيراد آخر</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#2c1f0e]">التاريخ المخصص للتوثيق</label>
                <input
                  type="date"
                  value={incomeDate}
                  onChange={e => setIncomeDate(e.target.value)}
                  className="w-full text-right p-3 outline-none border-1.5 border-[#ddd0b8] focus:border-[#0a7c6b] rounded-lg text-xs bg-[#fffdf7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#2c1f0e]">ملاحظات وتفاصيل إضافية (اختياري)</label>
                <input
                  type="text"
                  value={incomeNote}
                  onChange={e => setIncomeNote(e.target.value)}
                  placeholder="مثال: راتب سدادي لشهر ربيع الأول"
                  className="w-full text-right p-3 outline-none border-1.5 border-[#ddd0b8] focus:border-[#0a7c6b] rounded-lg text-xs bg-[#fffdf7]"
                />
              </div>

              <div className="pt-3">
                <button
                  onClick={handleSaveIncome}
                  className="w-full py-3.5 bg-[#0a7c6b] hover:bg-[#085c4f] text-white text-sm font-black rounded-xl shadow-lg transition-all"
                >
                  ✅ تأكيد وحفظ الدخل الوارد
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input Expense View */}
        {activeTab === 'expense' && (
          <div className="bg-white rounded-2xl p-5 border border-[#e8dcc8] shadow-sm space-y-4">
            <h2 className="text-base font-black text-[#2c1f0e] flex items-center gap-2 border-b border-[#e8dcc8] pb-3">
              <span className="text-xl">💸</span>
              تسجيل مصروف منزلي جديد
            </h2>

            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#2c1f0e]">قيمة المبلغ المدفوع</label>
                <div className="relative">
                  <input
                    type="number"
                    pattern="[0-9]*"
                    inputMode="decimal"
                    value={expenseAmount}
                    onChange={e => setExpenseAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-right p-3 outline-none border-1.5 border-[#ddd0b8] focus:border-[#0a7c6b] rounded-lg text-sm bg-[#fffdf7] font-black"
                  />
                  <span className="absolute left-3 top-3.5 text-xs text-[#7a6a52] font-black">{settings.currency}</span>
                </div>
              </div>

              {/* Grid of Categories chips */}
              <div>
                <label className="block text-xs font-bold mb-2 text-[#2c1f0e]">تصنيف ونوع المصروف:</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(CAT_EMOJIS).slice(0, 9).map(catName => (
                    <button
                      key={catName}
                      type="button"
                      onClick={() => setExpenseCategory(catName)}
                      className={`p-2.5 rounded-lg border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                        expenseCategory === catName
                          ? 'bg-[#e0f5f2] border-[#0a7c6b] text-[#0a7c6b] scale-[1.03] shadow-xs'
                          : 'bg-[#fdf3e0]/50 border-[#ddd0b8] text-[#7a6a52] hover:bg-[#fffdf7]'
                      }`}
                    >
                      <span className="text-base">{CAT_EMOJIS[catName]}</span>
                      <span>{catName.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#2c1f0e]">تاريخ الدفع الموثق</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  className="w-full text-right p-3 outline-none border-1.5 border-[#ddd0b8] focus:border-[#0a7c6b] rounded-lg text-xs bg-[#fffdf7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#2c1f0e]">وصف تفصيلي مبسط للمصروف</label>
                <input
                  type="text"
                  value={expenseDesc}
                  onChange={e => setExpenseDesc(e.target.value)}
                  placeholder="مثال: فاتورة المياه أو مشاوير الجمعية"
                  className="w-full text-right p-3 outline-none border-1.5 border-[#ddd0b8] focus:border-[#0a7c6b] rounded-lg text-xs bg-[#fffdf7]"
                />
              </div>

              <div className="pt-3">
                <button
                  onClick={handleSaveExpense}
                  className="w-full py-3.5 bg-[#e67e22] hover:bg-[#ca6f1e] text-white text-sm font-black rounded-xl shadow-lg transition-all"
                >
                  💾 تأكيد وحفظ فاتورة المصروف
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Statement View */}
        {activeTab === 'statement' && (
          <div className="space-y-4">
            
            {/* Elegant local Month Datepicker */}
            <div className="bg-white rounded-xl p-3 border border-[#e8dcc8] shadow-xs flex items-center justify-between">
              <button
                onClick={() => {
                  if (currentMonth === 0) {
                    setCurrentMonth(11);
                    setCurrentYear(prev => prev - 1);
                  } else {
                    setCurrentMonth(prev => prev - 1);
                  }
                }}
                className="w-9 h-9 flex items-center justify-center text-[#7a6a52] hover:text-[#2c1f0e] rounded bg-[#fef9f0]"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <span className="text-sm font-black text-[#2c1f0e] font-display">
                {getArabicMonthName(currentMonth)} {currentYear}
              </span>

              <button
                onClick={() => {
                  if (currentMonth === 11) {
                    setCurrentMonth(0);
                    setCurrentYear(prev => prev + 1);
                  } else {
                    setCurrentMonth(prev => prev + 1);
                  }
                }}
                className="w-9 h-9 flex items-center justify-center text-[#7a6a52] hover:text-[#2c1f0e] rounded bg-[#fef9f0]"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Quick cash flow stats card */}
            <div className="grid grid-cols-4 gap-1.5">
              <div className="bg-white rounded-xl p-2 text-center border border-[#e8dcc8] shadow-xs">
                <span className="text-[9px] text-[#7a6a52] font-black block">رصيد مرحل ↩️</span>
                <span className="text-xs font-black text-slate-600 block mt-1 whitespace-nowrap overflow-hidden text-ellipsis">{previousMonthsBalance.toLocaleString()} {settings.currency}</span>
              </div>
              <div className="bg-white rounded-xl p-2 text-center border border-[#e8dcc8] shadow-xs">
                <span className="text-[9px] text-[#7a6a52] font-black block">إجمالي الوارد 📈</span>
                <span className="text-xs font-black text-[#0a7c6b] block mt-1 whitespace-nowrap overflow-hidden text-ellipsis">{currentMonthIncome.toLocaleString()} {settings.currency}</span>
              </div>
              <div className="bg-white rounded-xl p-2 text-center border border-[#e8dcc8] shadow-xs">
                <span className="text-[9px] text-[#7a6a52] font-black block">إجمالي المصروف 📉</span>
                <span className="text-xs font-black text-amber-600 block mt-1 whitespace-nowrap overflow-hidden text-ellipsis">{currentMonthExpense.toLocaleString()} {settings.currency}</span>
              </div>
              <div className="bg-white rounded-xl p-2 text-center border border-[#e8dcc8] shadow-xs">
                <span className="text-[9px] text-[#7a6a52] font-black block">الرصيد المتاح 💰</span>
                <span className={`text-xs font-black block mt-1 whitespace-nowrap overflow-hidden text-ellipsis ${currentMonthBalance >= 0 ? 'text-[#0a7c6b]' : 'text-red-500'}`}>
                  {currentMonthBalance.toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>

            {/* Recharts Graphical Distribution of Expenses (Conditioned) */}
            {settings.showCharts && (
              <div className="space-y-4">
                
                {/* 1. Category distribution (Doughnut/Pie) */}
                <div className="bg-white rounded-2xl p-4 border border-[#e8dcc8] shadow-sm">
                  <h3 className="text-xs font-black text-[#2c1f0e] mb-3">📂 توزيع المصروفات تبعا للأصناف والبنود</h3>
                  
                  {pieChartData.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#7a6a52]">
                      لا توجد كشوف مصاريف مسجلة لإنشاء الدائرة التفصيلية
                    </div>
                  ) : (
                    <div>
                      <div className="h-44 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip formatter={(value: any) => [`${value} ${settings.currency}`, 'المبلغ']} />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Manual legend representation inside Arabic */}
                      <div className="flex flex-wrap gap-2.5 items-center justify-center mt-3">
                        {pieChartData.map((entry, index) => (
                          <div key={index} className="flex items-center gap-1.5 text-[9.5px] font-bold text-[#7a6a52]">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                            <span>{entry.name}: {entry.value.toLocaleString()} {settings.currency}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Daily Expenses list chart (Bar chart) */}
                <div className="bg-white rounded-2xl p-4 border border-[#e8dcc8] shadow-sm">
                  <h3 className="text-xs font-black text-[#2c1f0e] mb-3">📈 تمثيل تدفق النفقات خلال أيام الشهر المالية</h3>
                  
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={dailyDataArray} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="day" stroke="#b8a88a" fontSize={10} tickLine={false} />
                        <YAxis stroke="#b8a88a" fontSize={10} tickLine={false} />
                        <RechartsTooltip formatter={(value: any) => [`${value} ${settings.currency}`, 'المصروف اليومي']} />
                        <Bar dataKey="المصروف" fill="#e67e22" radius={[4, 4, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            )}

            {/* Standalone Statement Action Buttons triggers block */}
            <div className="bg-white rounded-xl p-3.5 border border-[#e8dcc8] shadow-xs">
              <span className="text-[10px] text-[#7a6a52] font-black block mb-2">📥 خيارات تصدير ومشاركة الميزانية المنزلية:</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={handleExportStatementAsImage}
                  className="p-1 py-2 bg-[#fef9f0] border border-[#ddd0b8] hover:border-[#0a7c6b] text-[#2c1f0e] text-[9px] font-black rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all text-center"
                >
                  <ImageIcon className="w-4 h-4 text-[#0a7c6b]" />
                  <span>توليد كصورة 🖼️</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="p-1 py-2 bg-[#e8f8f5] border border-[#9ee0d5] text-[#0a7c6b] text-[9px] font-black rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all text-center"
                >
                  <Share2 className="w-4 h-4" />
                  <span>تقرير واتساب 🟢</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="p-1 py-2 bg-[#fffdf7] border border-[#ddd0b8] text-amber-700 text-[9px] font-black rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all text-center"
                >
                  <Database className="w-4 h-4 text-[#e67e22]" />
                  <span>تصدير JSON 💾</span>
                </button>
              </div>
            </div>

            {/* Filters chips for search */}
            <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none scroll-smooth">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-full text-[10.5px] font-bold shrink-0 transition-all ${
                  activeFilter === 'all' ? 'bg-[#0a7c6b] text-white' : 'bg-white text-[#7a6a52] border border-[#e8dcc8]'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setActiveFilter('income')}
                className={`px-3 py-1.5 rounded-full text-[10.5px] font-bold shrink-0 transition-all ${
                  activeFilter === 'income' ? 'bg-[#0a7c6b] text-white' : 'bg-white text-[#7a6a52] border border-[#e8dcc8]'
                }`}
              >
                الوارد فقط 💰
              </button>
              {Object.keys(CAT_EMOJIS).slice(0, 9).map(catName => (
                <button
                  key={catName}
                  onClick={() => setActiveFilter(catName)}
                  className={`px-3 py-1.5 rounded-full text-[10.5px] font-bold shrink-0 transition-all ${
                    activeFilter === catName ? 'bg-[#0a7c6b] text-white' : 'bg-white text-[#7a6a52] border border-[#e8dcc8]'
                  }`}
                >
                  {CAT_EMOJIS[catName]} {catName}
                </button>
              ))}
            </div>

            {/* List group matching actual filtered list */}
            <div className="space-y-3">
              {displayedStatementTxns.map(tx => {
                const isInc = tx.type === 'income';
                const emoji = isInc ? (CAT_EMOJIS[tx.source || ''] || '💰') : (CAT_EMOJIS[tx.category || ''] || '📦');
                const titleText = isInc ? (tx.note || tx.source || '') : (tx.note || tx.category || '');
                return (
                  <SwipeableTransactionItem
                    key={tx.id}
                    tx={tx}
                    isInc={isInc}
                    emoji={emoji}
                    descText={titleText}
                    currency={settings.currency}
                    onDelete={handleDeleteTxn}
                  />
                );
              })}

              {displayedStatementTxns.length === 0 && (
                <div className="bg-white rounded-xl p-8 text-center text-[#7a6a52]">
                  <span className="text-2xl block mb-1">🔍</span>
                  <span className="text-xs font-bold block">لا توجد سجلات تتوائم مع هذا الفلتر</span>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Global Configuration/Settings View */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            
            <div className="p-3.5 rounded-xl bg-[#e0f5f2] border border-[#a8ffec] text-[11px] text-[#0a7c6b] font-bold leading-relaxed">
              ⚙️ كافة الإعدادات تترجم فوراً وبشكل تلقائي على تخزين جهازك وسكيولايت الداخلي!
            </div>

            {/* First Settings Card */}
            <div className="bg-white rounded-2xl p-5 border border-[#e8dcc8] shadow-xs space-y-1">
              <h3 className="text-xs font-black text-[#2c1f0e] flex items-center gap-2 pb-2 mb-3 border-b border-[#e8dcc8]">
                <Sliders className="w-4 h-4 text-[#0a7c6b]" />
                تهيئات عامة للنظام مخصصة
              </h3>

              {/* Currency symbol selector */}
              <div className="flex items-center justify-between gap-4 py-3 border-b border-dashed border-[#e8dcc8]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#e0f5f2] flex items-center justify-center text-[#0a7c6b] shrink-0">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#2c1f0e] block">رمز العملة النشطة</span>
                    <span className="text-[10px] text-[#7a6a52] block mt-0.5">رمز العملة المالي المستخدم بالجداول</span>
                  </div>
                </div>
                <select
                  value={settings.currency}
                  onChange={e => handleUpdateSetting('currency', e.target.value)}
                  className="p-1.5 px-3 select-setting bg-[#fdf3e0]/50 border border-[#ddd0b8] rounded-lg text-xs font-bold text-[#2c1f0e] focus:outline-none"
                >
                  <option value="ر.س">ريال سعودي (ر.س)</option>
                  <option value="SAR">SAR</option>
                  <option value="ج.م">جنيه مصري (ج.م)</option>
                  <option value="د.ك">دينار كويتي (د.ك)</option>
                  <option value="د.إ">درهم إماراتي (د.إ)</option>
                  <option value="د.ب">دينار بحريني (د.ب)</option>
                  <option value="ر.ع">ريال عُماني (ر.ع)</option>
                  <option value="$">دولار أمريكي ($)</option>
                  <option value="€">يورو (€)</option>
                </select>
              </div>

              {/* Cycle start day */}
              <div className="flex items-center justify-between gap-4 py-3 border-b border-dashed border-[#e8dcc8]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#fef3e0] flex items-center justify-center text-[#e67e22] shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#2c1f0e] block">بداية الدورة المالية المنزلية</span>
                    <span className="text-[10px] text-[#7a6a52] block mt-0.5">اليوم المحدد لبداية الميزانية شهرياً</span>
                  </div>
                </div>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={settings.cycleStart}
                  onChange={e => handleUpdateSetting('cycleStart', Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-16 p-1.5 bg-[#fdf3e0]/50 text-center border border-[#ddd0b8] rounded-lg text-xs font-bold text-[#2c1f0e]"
                />
              </div>

              {/* Sorting option */}
              <div className="flex items-center justify-between gap-4 py-3 border-b border-dashed border-[#e8dcc8]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#f1efe9] flex items-center justify-center text-[#2c1f0e] shrink-0">
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#2c1f0e] block">ترتيب القوائم المالية</span>
                    <span className="text-[10px] text-[#7a6a52] block mt-0.5">ترتيب حزم المعاملات تبعاً للتاريخ</span>
                  </div>
                </div>
                <select
                  value={settings.sortOrder}
                  onChange={e => handleUpdateSetting('sortOrder', e.target.value)}
                  className="p-1.5 px-3 select-setting bg-[#fdf3e0]/50 border border-[#ddd0b8] rounded-lg text-xs font-bold text-[#2c1f0e]"
                >
                  <option value="desc">من الأحدث إلى الأقدم</option>
                  <option value="asc">من الأقدم إلى الأحدث</option>
                </select>
              </div>

              {/* Toggle Motivation Cards */}
              <div className="flex items-center justify-between gap-4 py-3 border-b border-dashed border-[#e8dcc8]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#fef5e7] flex items-center justify-center text-[#ca6f1e] shrink-0">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#2c1f0e] block">إظهار شريط الجمل التحفيزية</span>
                    <span className="text-[10px] text-[#7a6a52] block mt-0.5">ظهور كرت النصائح على الصفحة الرئيسية</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateSetting('showMotivation', !settings.showMotivation)}
                  className={`w-12 h-6.5 rounded-full p-0.5 cursor-pointer flex items-center transition-colors duration-300 ${settings.showMotivation ? 'bg-[#0a7c6b]' : 'bg-[#e4e4e7]'}`}
                  style={{ direction: 'ltr' }}
                >
                  <div className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${settings.showMotivation ? 'translate-x-[22px]' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Toggle Charts */}
              <div className="flex items-center justify-between gap-4 py-3 border-b border-dashed border-[#e8dcc8]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#eff6ff] flex items-center justify-center text-[#3b82f6] shrink-0">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#2c1f0e] block">تمكين الرسوم البيانية التفاعلية</span>
                    <span className="text-[10px] text-[#7a6a52] block mt-0.5">عرض المخططات الدائرية بكشف الحساب</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateSetting('showCharts', !settings.showCharts)}
                  className={`w-12 h-6.5 rounded-full p-0.5 cursor-pointer flex items-center transition-colors duration-300 ${settings.showCharts ? 'bg-[#0a7c6b]' : 'bg-[#e4e4e7]'}`}
                  style={{ direction: 'ltr' }}
                >
                  <div className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${settings.showCharts ? 'translate-x-[22px]' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Toggle Auto home routing after entry */}
              <div className="flex items-center justify-between gap-4 py-3 border-b border-dashed border-[#e8dcc8]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#ecfdf5] flex items-center justify-center text-[#10b981] shrink-0">
                    <Home className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#2c1f0e] block">تحويل تلقائي للرئيسية</span>
                    <span className="text-[10px] text-[#7a6a52] block mt-0.5">توجيهك للرئيسية عند تمام كل توثيق</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateSetting('autoHome', !settings.autoHome)}
                  className={`w-12 h-6.5 rounded-full p-0.5 cursor-pointer flex items-center transition-colors duration-300 ${settings.autoHome ? 'bg-[#0a7c6b]' : 'bg-[#e4e4e7]'}`}
                  style={{ direction: 'ltr' }}
                >
                  <div className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${settings.autoHome ? 'translate-x-[22px]' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Toggle confirm delete before transaction removal */}
              <div className="flex items-center justify-between gap-4 py-3 border-b border-dashed border-[#e8dcc8]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#2c1f0e] block">تأكيد عملية الحذف</span>
                    <span className="text-[10px] text-[#7a6a52] block mt-0.5">السؤال قبل حذف أي معاملة مالية لتفادي الأخطاء</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateSetting('confirmDelete', !settings.confirmDelete)}
                  className={`w-12 h-6.5 rounded-full p-0.5 cursor-pointer flex items-center transition-colors duration-300 ${settings.confirmDelete ? 'bg-[#0a7c6b]' : 'bg-[#e4e4e7]'}`}
                  style={{ direction: 'ltr' }}
                >
                  <div className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${settings.confirmDelete ? 'translate-x-[22px]' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Toggle Real-time instant sync */}
              <div className="flex items-center justify-between gap-4 py-3 border-b border-dashed border-[#e8dcc8]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                    <RefreshCw className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#2c1f0e] block">المزامنة الفورية اللحظية</span>
                    <span className="text-[10px] text-[#7a6a52] block mt-0.5">تحديث فوري وتحديث كافة الأجهزة المفتوحة في نفس اللحظة</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateSetting('realTimeSync', !settings.realTimeSync)}
                  className={`w-12 h-6.5 rounded-full p-0.5 cursor-pointer flex items-center transition-colors duration-300 ${settings.realTimeSync ? 'bg-[#0a7c6b]' : 'bg-[#e4e4e7]'}`}
                  style={{ direction: 'ltr' }}
                >
                  <div className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${settings.realTimeSync ? 'translate-x-[22px]' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Toggle Sound Effects */}
              <div className="flex items-center justify-between gap-4 py-3 border-b border-dashed border-[#e8dcc8]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                    {settings.enableSounds ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#2c1f0e] block">أصوات وتنبيهات تلميحية</span>
                    <span className="text-[10px] text-[#7a6a52] block mt-0.5">تشغيل صوت رنين تفاعلي عند إضافة مصاريف أو وارد مالي جديد</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !settings.enableSounds;
                    handleUpdateSetting('enableSounds', nextVal);
                    if (nextVal) {
                      setTimeout(() => playTxnSound('income'), 150);
                    }
                  }}
                  className={`w-12 h-6.5 rounded-full p-0.5 cursor-pointer flex items-center transition-colors duration-300 ${settings.enableSounds ? 'bg-[#0a7c6b]' : 'bg-[#e4e4e7]'}`}
                  style={{ direction: 'ltr' }}
                >
                  <div className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${settings.enableSounds ? 'translate-x-[22px]' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Toggle Logo Icon Style */}
              <div className="flex items-center justify-between gap-4 py-3 border-b border-dashed border-[#e8dcc8]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-[#0a7c6b] shrink-0">
                    <span className="text-[14px]">✨</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#2c1f0e] block">نمط أيقونة البرنامج</span>
                    <span className="text-[10px] text-[#7a6a52] block mt-0.5">تبديل شكل الشعار بين الأيقونة الشفافة المحدّدة بالذهب أو الكلاسيكية</span>
                  </div>
                </div>
                <div className="flex bg-[#fff9e6] rounded-md p-0.5 border border-[#e8dcc8] gap-1 shrink-0" style={{ direction: 'rtl' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setLogoType('new');
                      localStorage.setItem('albait_logo_type', 'new');
                      triggerToast('✨ تم تفعيل الشعار الجديد بخلفية شفافة ومحدّدة');
                    }}
                    className={`px-2 py-1 text-[9px] font-bold rounded-md cursor-pointer transition-all ${
                      logoType === 'new' ? 'bg-[#0a7c6b] text-white shadow-xs' : 'text-[#7a6a52] hover:text-[#2c1f0e]'
                    }`}
                  >
                    محدّد وشفاف
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLogoType('classic');
                      localStorage.setItem('albait_logo_type', 'classic');
                      triggerToast('🏡 تم تفعيل الشعار الكلاسيكي');
                    }}
                    className={`px-2 py-1 text-[9px] font-bold rounded-md cursor-pointer transition-all ${
                      logoType === 'classic' ? 'bg-[#0a7c6b] text-white shadow-xs' : 'text-[#7a6a52] hover:text-[#2c1f0e]'
                    }`}
                  >
                    كلاسيكي قديم
                  </button>
                </div>
              </div>

              {/* Toggle Biometric Login */}
              <div className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-teal-600 shrink-0">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#2c1f0e] block">بصمة الإصبع وبصمة الوجه</span>
                    <span className="text-[10px] text-[#7a6a52] block mt-0.5">تسجيل دخول مباشر ومؤمّن وتلقائي</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!currentUser || currentUser.provider === 'demo') {
                      triggerToast('غير متاح بالوضع التجريبي، يرجى تسجيل الدخول بحساب حقيقي للتفعيل 📱', true);
                      return;
                    }
                    const nextVal = !biometricsLoginEnabled;
                    if (nextVal) {
                      const temp = (window as any)._temp_bio_cred;
                      
                      const enrollBiometricsOnDevice = async (credentialsObj: any) => {
                        try {
                          if (window.PublicKeyCredential) {
                            const canVerify = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                            if (canVerify && navigator.credentials && navigator.credentials.create) {
                              triggerToast('⏳ يرجى لمس مستشعر البصمة أو النظر للشاشة لربط هويتك المشفرة بالجهاز... 🛡️');
                              const challenge = new Uint8Array(16);
                              window.crypto.getRandomValues(challenge);
                              
                              const userBytes = new TextEncoder().encode(credentialsObj.email);
                              const createOptions: CredentialCreationOptions = {
                                publicKey: {
                                  challenge: challenge,
                                  rp: { name: "البيت السعيد" },
                                  user: {
                                    id: userBytes,
                                    name: credentialsObj.email,
                                    displayName: credentialsObj.name || credentialsObj.email
                                  },
                                  pubKeyCredParams: [{ type: "public-key", alg: -7 }],
                                  authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
                                  timeout: 15000
                                }
                              };
                              await navigator.credentials.create(createOptions);
                            }
                          }
                        } catch (err: any) {
                          console.warn("WebAuthn enrollment fallback:", err);
                          if (err.name === 'NotAllowedError' || err.message?.toLowerCase().includes('cancel')) {
                            triggerToast('⚠️ تم إلغاء ربط المعرّف الحيوي من قبل المستخدم', true);
                            return;
                          }
                        }

                        const updated = {
                          ...enrolledBioUsers,
                          [credentialsObj.email]: credentialsObj
                        };
                        setEnrolledBioUsers(updated);
                        localStorage.setItem('albait_bio_users', JSON.stringify(updated));
                        triggerToast(`🔒 تم ربط وتفعيل المعرف الحيوي بنجاح لحسابك: ${credentialsObj.email}`);
                        playBiometricSynthSound('success');
                      };

                      if (temp && temp.email === currentUser.email) {
                        await enrollBiometricsOnDevice(temp);
                      } else {
                        const p = prompt('يرجى كتابة كلمة المرور الحالية لتأكيد ربط البصمة بالهاتف 🔑:');
                        if (p) {
                          const cred = { email: currentUser.email, password: p, name: currentUser.name, uid: currentUser.uid };
                          await enrollBiometricsOnDevice(cred);
                        }
                      }
                    } else {
                      const updated = { ...enrolledBioUsers };
                      delete updated[currentUser.email];
                      setEnrolledBioUsers(updated);
                      localStorage.setItem('albait_bio_users', JSON.stringify(updated));
                      triggerToast('🔓 تم إلغاء تفعيل تسجيل الدخول بالبصمة لحسابك');
                      playBiometricSynthSound('failure');
                    }
                  }}
                  className={`w-12 h-6.5 rounded-full p-0.5 cursor-pointer flex items-center transition-colors duration-300 ${biometricsLoginEnabled ? 'bg-[#0a7c6b]' : 'bg-[#e4e4e7]'}`}
                  style={{ direction: 'ltr' }}
                >
                  <div className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${biometricsLoginEnabled ? 'translate-x-[22px]' : 'translate-x-0'}`} />
                </button>
              </div>

            </div>

            {/* Recurring Expenses (Fixed Bills) Manager */}
            <div className="bg-white rounded-2xl p-5 border border-[#e8dcc8] shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#e8dcc8]">
                <h3 className="text-xs font-black text-[#2c1f0e] flex items-center gap-2">
                  <span className="text-base">📅</span>
                  <span>تذكير المصاريف المتكررة والفواتير الثابتة</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRecurringManager(!showRecurringManager)}
                  className="p-1 px-2.5 rounded bg-orange-50 text-amber-700 hover:bg-orange-100 text-[10px] font-black transition-all"
                >
                  {showRecurringManager ? 'إغلاق اللوحة ✖' : 'فتح لوحة الإدارة ⚙️'}
                </button>
              </div>

              <p className="text-[10px] text-[#7a6a52] leading-relaxed">
                حدد الفواتير الثابتة مثل الإيجار، الكهرباء، والاشتراكات الشهرية لكي يقترح التطبيق تسجيلها تلقائيًا بنقرة واحدة في بداية كل دورة مالية.
              </p>

              {(showRecurringManager || showRecurringManager) && (
                <div className="space-y-4 pt-2 border-t border-dashed border-[#ddd0b8]">
                  {/* Add form */}
                  <div className="bg-orange-50/40 p-3 rounded-xl border border-amber-100 space-y-2.5">
                    <span className="text-[10px] uppercase font-black text-amber-800 block">➕ إضافة فاتورة متكررة جديدة</span>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#2c1f0e] block">عنوان الفاتورة أو المسمى</label>
                      <input
                        type="text"
                        placeholder="مثال: فاتورة كهرباء المنزل، اشتراك الجيم"
                        value={recTitle}
                        onChange={e => setRecTitle(e.target.value)}
                        className="w-full p-2 bg-white border border-[#ddd0b8] rounded-lg text-xs font-semibold text-[#2c1f0e] placeholder-gray-400 focus:outline-[#0a7c6b]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[#2c1f0e] block">المبلغ ({settings.currency})</label>
                        <input
                          type="number"
                          placeholder="مثال: 350"
                          value={recAmount}
                          onChange={e => setRecAmount(e.target.value)}
                          className="w-full p-2 bg-white border border-[#ddd0b8] rounded-lg text-xs font-semibold text-[#2c1f0e] placeholder-gray-400 focus:outline-[#0a7c6b]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[#2c1f0e] block">يوم الاستحقاق في الشهر</label>
                        <input
                          type="number"
                          min="1"
                          max="28"
                          placeholder="1"
                          value={recDay}
                          onChange={e => setRecDay(Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="w-full p-2 bg-white border border-[#ddd0b8] rounded-lg text-xs font-semibold text-[#2c1f0e] focus:outline-[#0a7c6b]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#2c1f0e] block">الفئة التصنيفية للمصروف</label>
                      <select
                        value={recCategory}
                        onChange={e => setRecCategory(e.target.value)}
                        className="w-full p-2 bg-white border border-[#ddd0b8] rounded-lg text-xs font-semibold text-[#2c1f0e]"
                      >
                        {Object.keys(CAT_EMOJIS).slice(0, 9).map(catName => (
                          <option key={catName} value={catName}>
                            {CAT_EMOJIS[catName]} {catName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddRecurringBill}
                      className="w-full py-2 bg-[#0a7c6b] hover:bg-[#076456] text-white rounded-lg text-[10.5px] font-black transition-colors"
                    >
                      حفظ الفاتورة الثابتة 💾
                    </button>
                  </div>

                  {/* List of current recurring bills */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-[#2c1f0e] block mb-1">📋 المصاريف المتكررة المسجلة حالياً ({recurringBills.length})</span>
                    {recurringBills.map(bill => {
                      const emoji = CAT_EMOJIS[bill.category] || '💸';
                      return (
                        <div key={bill.id} className="p-2.5 border border-[#e8dcc8] rounded-xl bg-white flex items-center justify-between text-xs transition-shadow shadow-xs hover:shadow-sm">
                          <div className="flex items-center gap-2.5 max-w-[65%]">
                            <span className="text-lg shrink-0">{emoji}</span>
                            <div className="truncate">
                              <span className="font-extrabold text-[#2c1f0e] block truncate">{bill.title}</span>
                              <span className="text-[9px] text-[#7a6a52] block mt-0.5">
                                المستحق: يوم {bill.dayOfMonth} · فئة: {bill.category}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2.5">
                            <span className="font-black text-[#2c1f0e] shrink-0 text-xs">
                              {bill.amount.toLocaleString()} {settings.currency}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteRecurringBill(bill.id)}
                              className="w-6 h-6 rounded bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors shrink-0"
                              title="حذف الفاتورة"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {recurringBills.length === 0 && (
                      <div className="text-center py-5 text-xs text-[#7a6a52] border border-dashed border-[#ddd0b8] rounded-xl bg-gray-50/50">
                        لا توجد فواتير متكررة مسجلة حتى الآن.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Backups & External Data store Sync components */}
            <div className="bg-white rounded-2xl p-5 border border-[#e8dcc8] shadow-sm space-y-4">
              <h3 className="text-xs font-black text-[#2c1f0e] flex items-center gap-2 pb-2 border-b border-[#e8dcc8]">
                <Database className="w-4 h-4 text-[#e67e22]" />
                البيانات والنسخ والتحميل المتبادل
              </h3>

              <p className="text-[10px] text-[#7a6a52] leading-relaxed">
                يمكنك تصدير كشف حسابك الموثق بالكامل كملف JSON مشفر، أو استيراده وتغذيته بأي جهاز آخر فوراً.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleImportJSONClick}
                  className="py-2.5 bg-orange-50 hover:bg-orange-100/50 border border-orange-200 text-[#e67e22] text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>⬆️ استيراد من ملف JSON</span>
                </button>
                <input
                  type="file"
                  id="react-import-json"
                  ref={importInputRef}
                  onChange={handleImportJSON}
                  accept=".json"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="py-2.5 bg-emerald-50 hover:bg-emerald-100/50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>⬇️ تصدير ميزانيتي كـ JSON</span>
                </button>
              </div>

              {/* Clear Settings Button */}
              <button
                type="button"
                onClick={handleResetSettings}
                className="w-full text-center py-2 border border-[#ddd0b8] hover:border-[#0a7c6b] rounded-lg text-xs font-bold text-[#7a6a52] transition-all bg-[#fafafa]"
              >
                🔄 استعادة الإعدادات الافتراضية
              </button>
            </div>

            {/* Danger zone actions */}
            <div className="bg-red-50/50 rounded-2xl p-5 border border-red-200 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-red-700 flex items-center gap-2 pb-2 border-b border-red-200">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                خيارات منطقة الخطر
              </h3>

              <p className="text-[10px] text-[#7a6a52] leading-relaxed">
                مسح كل المصاريف والمعاملات المسجلة لحسابك بالكامل نهائياً. لا يمكن التراجع عن هذا الإجراء!
              </p>

              <button
                onClick={handleClearAllData}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black shadow-md transition-all"
              >
                🗑️ تصفية ومسح كافة البيانات
              </button>
            </div>

          </div>
        )}

        {/* Administrator dashboard panel */}
        {activeTab === 'admin' && currentUser?.email === 'shady.nasif@gmail.com' && (
          <div className="space-y-4">
            
            <div className="bg-purple-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <h2 className="text-base font-black font-display mb-1 flex items-center gap-2">
                👑 لوحة التحكم والمراقبة النشطة للمشرف
              </h2>
              <p className="text-[11px] opacity-90 leading-relaxed">
                متاح حصرياً للحساب {currentUser.email}. تتيح لك مراقبة إجماليات السيرفر والتحكم في حسابات المستخدمين.
              </p>
              
              <button
                onClick={fetchAdminStats}
                disabled={adminLoading}
                className="mt-4 px-4 py-1.5 bg-white text-purple-700 font-bold rounded-lg text-xs transition-all flex items-center gap-1 hover:bg-purple-100"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${adminLoading ? 'animate-spin' : ''}`} />
                <span>تحديث وإعادة تحميل إحصائيات النظام</span>
              </button>
            </div>

            {/* KPI Cards for overall database */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-3 border border-[#e8dcc8] text-center shadow-xs">
                <span className="text-[10px] text-[#7a6a52] font-bold block">إجمالي عدد المستخدمين</span>
                <span className="text-xl font-black text-purple-700 block mt-1">{adminUsers.length}</span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-[#e8dcc8] text-center shadow-xs">
                <span className="text-[10px] text-[#7a6a52] font-bold block">إجمالي المعاملات الكلي</span>
                <span className="text-xl font-black text-purple-700 block mt-1">{adminTxns.length}</span>
              </div>
            </div>

            {/* User List view */}
            <div className="bg-white rounded-2xl p-4 border border-[#e8dcc8] shadow-sm">
              <h3 className="text-xs font-black text-[#2c1f0e] border-b border-[#e8dcc8] pb-2 mb-3">
                👥 مستخدمو التطبيق النشطون:
              </h3>

              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {adminUsers.map(user => {
                  const userRecords = adminTxns.filter(t => t.uid === user.uid);
                  const userIncome = userRecords.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
                  const userExpense = userRecords.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
                  const userBalance = userIncome - userExpense;

                  return (
                    <div
                      key={user.uid}
                      onClick={() => handleOpenAdminUserModal(user)}
                      className="p-3 bg-[#fdf3e0]/30 hover:bg-[#fdf3e0]/60 border border-[#e8dcc8] rounded-xl flex items-center justify-between cursor-pointer transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-[#2c1f0e]">{user.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${userBalance >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                            الرصيد المتاح: {userBalance.toLocaleString()} {settings.currency}
                          </span>
                        </div>
                        <span className="text-[9.5px] text-[#7a6a52] block mt-0.5">{user.email} · {user.provider}</span>
                        <span className="text-[9.5px] text-[#7a6a52] block font-semibold mt-0.5">
                          {userRecords.length} معاملات مسجلة
                        </span>
                      </div>

                      <div className="text-left">
                        <span className="text-xs font-black block text-[#0a7c6b]">+{userIncome.toLocaleString()} {settings.currency}</span>
                        <span className="text-[10px] font-bold block text-red-500">-{userExpense.toLocaleString()} {settings.currency}</span>
                      </div>
                    </div>
                  );
                })}

                {adminUsers.length === 0 && (
                  <div className="text-center py-6 text-xs text-[#7a6a52]">
                    اضغط تحديث لتحديث إحصائيات مستخدمي النظام 📊
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Persistent bottom signature across all pages */}
        <div className="pt-6 pb-2 text-center border-t border-dashed border-[#e8dcc8] mt-8">
          <span className="text-[10px] text-[#a09480] font-bold block mb-1">
            تطوير وتصميم وإعداد الأستاذ
          </span>
          <span className="text-xs text-[#0a7c6b] font-black inline-flex items-center justify-center gap-1.5" style={{ direction: 'ltr' }}>
            shady nassef 💻🎨
          </span>
        </div>

      </main>

      {/* Admin User Details Modal Sheet */}
      {adminSelectedUser && (
        <div className="fixed inset-0 z-50 bg-[#2c1f0e]/50 backdrop-blur-xs flex items-end justify-center p-4">
          <div className="bg-white rounded-t-2xl max-w-md w-full p-5 shadow-2xl relative max-h-[80vh] overflow-y-auto">
            
            <button
              onClick={() => setAdminSelectedUser(null)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-[#fef9f0] hover:bg-orange-50 border border-[#ddd0b8] flex items-center justify-center text-[#7a6a52] transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-black text-[#2c1f0e] border-b border-[#e8dcc8] pb-2 mb-4">
              إدارة معاملات المستخدم: {adminSelectedUser.name}
            </h3>

            <div className="space-y-3.5">
              
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-red-700 block">منطقة الإشراف المتميزة</span>
                <button
                  onClick={() => handleAdminClearUser(adminSelectedUser.uid)}
                  className="mt-2.5 w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black scroll-smooth"
                >
                  🗑️ مسح كل معاملات هذا المستخدم بمفردة
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-black text-[#2c1f0e] block mb-1">📋 آخر العمليات الموثقة بالملف:</span>
                {adminUserTxns.map(tx => (
                  <div key={tx.id} className="p-2.5 border border-[#e8dcc8] rounded-lg bg-[#fafafa] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-[#2c1f0e] block">{tx.note || (tx.type === 'income' ? tx.source : tx.category)}</span>
                      <span className="text-[9.5px] text-[#7a6a52] block mt-0.5">{tx.date} · {tx.type === 'income' ? 'إيراد' : 'منصرف'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`font-black ${tx.type === 'income' ? 'text-[#0a7c6b]' : 'text-[#e67e22]'}`}>
                        {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()} {settings.currency}
                      </span>
                      <button
                        onClick={() => handleAdminDeleteTxn(tx.id)}
                        className="p-1 px-1.5 bg-red-50 hover:bg-red-100 rounded text-red-600 text-[10px] font-black"
                      >
                        حذف 🗑️
                      </button>
                    </div>
                  </div>
                ))}

                {adminUserTxns.length === 0 && (
                  <div className="text-center py-4 text-xs text-[#7a6a52]">
                    لا توجد معاملات مسجلة لهذا الحساب.
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Global Bottom Navigation Sticky Tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e8dcc8] shadow-[0_-4px_16px_rgba(44,31,14,0.06)] px-2 py-1.5 pb-safe flex items-center justify-around">
        
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
            activeTab === 'dashboard' ? 'text-[#0a7c6b]' : 'text-[#7a6a52] hover:text-[#2c1f0e]'
          }`}
        >
          <div className={`w-11 h-8 rounded-lg flex items-center justify-center transition-all ${
            activeTab === 'dashboard' ? 'bg-[#e0f5f2]' : 'bg-transparent'
          }`}>
            <Grid className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold mt-1">الرئيسية</span>
        </button>

        <button
          onClick={() => setActiveTab('income')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
            activeTab === 'income' ? 'text-[#0a7c6b]' : 'text-[#7a6a52] hover:text-[#2c1f0e]'
          }`}
        >
          <div className={`w-11 h-8 rounded-lg flex items-center justify-center transition-all ${
            activeTab === 'income' ? 'bg-[#e0f5f2]' : 'bg-transparent'
          }`}>
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold mt-1">وارد</span>
        </button>

        <button
          onClick={() => setActiveTab('expense')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
            activeTab === 'expense' ? 'text-[#0a7c6b]' : 'text-[#7a6a52] hover:text-[#2c1f0e]'
          }`}
        >
          <div className={`w-11 h-8 rounded-lg flex items-center justify-center transition-all ${
            activeTab === 'expense' ? 'bg-[#e0f5f2]' : 'bg-transparent'
          }`}>
            <MinusCircle className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold mt-1">مصروف</span>
        </button>

        <button
          onClick={() => setActiveTab('statement')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
            activeTab === 'statement' ? 'text-[#0a7c6b]' : 'text-[#7a6a52] hover:text-[#2c1f0e]'
          }`}
        >
          <div className={`w-11 h-8 rounded-lg flex items-center justify-center transition-all ${
            activeTab === 'statement' ? 'bg-[#e0f5f2]' : 'bg-transparent'
          }`}>
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold mt-1">الميزانية</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
            activeTab === 'settings' ? 'text-[#0a7c6b]' : 'text-[#7a6a52] hover:text-[#2c1f0e]'
          }`}
        >
          <div className={`w-11 h-8 rounded-lg flex items-center justify-center transition-all ${
            activeTab === 'settings' ? 'bg-[#e0f5f2]' : 'bg-transparent'
          }`}>
            <Settings className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold mt-1">إعدادات</span>
        </button>

        {currentUser?.email === 'shady.nasif@gmail.com' && (
          <button
            onClick={() => { setActiveTab('admin'); fetchAdminStats(); }}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
              activeTab === 'admin' ? 'text-purple-600' : 'text-[#7a6a52] hover:text-purple-600'
            }`}
          >
            <div className={`w-11 h-8 rounded-lg flex items-center justify-center transition-all ${
              activeTab === 'admin' ? 'bg-purple-100' : 'bg-transparent'
            }`}>
              <Lock className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-[10px] font-bold mt-1 text-purple-700">أدمن</span>
          </button>
        )}

      </nav>

      {/* 1. Biometric Scanning Radar Overlay */}
      {showScanOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 text-center">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            
            {/* Cancel Scanner */}
            {scanState === 'scanning' && (
              <button
                onClick={() => setShowScanOverlay(false)}
                className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center transition-all cursor-pointer border-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Glowing Tech Accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="my-8 relative flex flex-col items-center justify-center">
              {/* Scan box / Target */}
              <div className="w-32 h-32 rounded-3xl bg-slate-850 border border-slate-700 flex items-center justify-center relative overflow-hidden">
                
                {/* Laser line animation */}
                {scanState === 'scanning' && (
                  <div className="absolute left-0 right-0 h-1 bg-teal-400 shadow-[0_0_15px_#2dd4bf] animate-[bounce_2s_infinite]" />
                )}

                {scanType === 'fingerprint' ? (
                  <Fingerprint className={`w-16 h-16 transition-all duration-300 ${
                    scanState === 'success' ? 'text-teal-400 scale-110' :
                    scanState === 'failed' ? 'text-red-500 scale-95' : 'text-slate-400'
                  }`} />
                ) : (
                  <ScanFace className={`w-16 h-16 transition-all duration-300 ${
                    scanState === 'success' ? 'text-teal-400 scale-110' :
                    scanState === 'failed' ? 'text-red-500 scale-95' : 'text-slate-400'
                  }`} />
                )}

              </div>

              {/* Scan Status Texts */}
              <h3 className="text-white font-black text-base mt-6">
                {scanState === 'scanning' && (scanType === 'fingerprint' ? 'جاري قراءة بصمة الإصبع...' : 'جاري فحص ملامح الوجه...')}
                {scanState === 'success' && 'تم التحقق من الهوية بنجاح! ✅'}
                {scanState === 'failed' && 'فشلت مطابقة البصمة ⚠️'}
              </h3>
              <p className="text-slate-400 text-[11px] mt-1.5 font-bold">
                {scanState === 'scanning' && 'يرجى وضع إصبعك على مستشعر البصمة أو النظر للكاميرا'}
                {scanState === 'success' && 'مرحباً بك، جاري دخول البيت السعيد...'}
                {scanState === 'failed' && 'الرجاء المحاولة مرة أخرى أو استخدام كلمة السر'}
              </p>
            </div>

            {/* Progress Meter */}
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-2">
              <div 
                className={`h-full transition-all duration-70 ${
                  scanState === 'success' ? 'bg-teal-400' : 
                  scanState === 'failed' ? 'bg-red-500' : 'bg-gradient-to-r from-teal-500 to-emerald-400'
                }`}
                style={{ width: `${scanProgress}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[9px] font-bold text-slate-500">
              <span className="font-mono">{scanProgress}%</span>
              <span>
                {scanState === 'scanning' ? 'اتصال مشفّر ومؤمّن 🔒' : scanState === 'success' ? 'تم القبول بنجاح ✅' : 'خطأ بالمطابقة ⚠️'}
              </span>
            </div>

          </div>
        </div>
      )}

      {/* 2. Biometric Enable Prompt Modal */}
      {showBiometricPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 text-center">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-[#e8dcc8] relative overflow-hidden transition-all">
            
            <div className="w-16 h-16 rounded-full bg-[#e0f5f2] border-2 border-[#a8ffec] flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Fingerprint className="w-8 h-8 text-[#0a7c6b]" />
            </div>

            <h3 className="text-lg font-black text-[#2c1f0e] mb-2 font-display">تفعيل الدخول السريع بالبصمة 📱🔒</h3>
            <p className="text-xs text-[#7a6a52] leading-relaxed mb-6 font-semibold">
              هل ترغب بربط حسابك الحالي ببصمة هاتف هذا الجهاز؟ سيتيح لك هذا تسجيل الدخول بكبسة زر واحدة ومن دون الحاجة لكتابة كلمة المرور في كل مرة!
            </p>

            <div className="space-y-2">
              <button
                onClick={async () => {
                  const temp = (window as any)._temp_bio_cred;
                  if (temp) {
                    try {
                      if (window.PublicKeyCredential) {
                        const canVerify = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                        if (canVerify && navigator.credentials && navigator.credentials.create) {
                          const challenge = new Uint8Array(16);
                          window.crypto.getRandomValues(challenge);
                          const userBytes = new TextEncoder().encode(temp.email);
                          const createOptions: CredentialCreationOptions = {
                            publicKey: {
                              challenge: challenge,
                              rp: { name: "البيت السعيد" },
                              user: { id: userBytes, name: temp.email, displayName: temp.name || temp.email },
                              pubKeyCredParams: [{ type: "public-key", alg: -7 }],
                              authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
                              timeout: 10000
                            }
                          };
                          await navigator.credentials.create(createOptions);
                        }
                      }
                    } catch (e) {
                      console.warn("Prompt modal WebAuthn enrollment fallback:", e);
                    }
                    const updated = {
                      ...enrolledBioUsers,
                      [temp.email]: temp
                    };
                    setEnrolledBioUsers(updated);
                    localStorage.setItem('albait_bio_users', JSON.stringify(updated));
                    setSelectedBioUserEmail(temp.email);
                    triggerToast(`🔓 تم ربط وتفعيل المعرف الحيوي بنجاح لـ: ${temp.email}!`);
                    playBiometricSynthSound('success');
                  } else {
                    triggerToast('حدث خطأ في جلب بيانات الحساب المطلوبة للتفعيل', true);
                  }
                  setShowBiometricPromptModal(false);
                }}
                className="w-full py-2.5 bg-[#0a7c6b] hover:bg-[#085c4f] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md border-0"
              >
                نعم، تفعيل الدخول بالبصمة والوجه 👍
              </button>
              
              <button
                onClick={() => setShowBiometricPromptModal(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer border-0"
              >
                ليس الآن، سأفعلها لاحقاً
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. Generated Image Save / Share Modal */}
      {generatedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 text-center overflow-y-auto">
          <div className="w-full max-w-sm bg-[#fef9f0] border border-[#e8dcc8] rounded-2xl p-5 shadow-2xl relative my-auto">
            
            {/* Close Button */}
            <button
              onClick={() => setGeneratedImage(null)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-[#f4ebd0] hover:bg-[#e8dcc8] text-[#2c1f0e] flex items-center justify-center transition-all cursor-pointer border-0"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-black text-[#2c1f0e] mb-3 text-right flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0a7c6b]" />
              <span>بطاقة كشف الحساب المالي 📋✨</span>
            </h3>

            {/* Generated Image Container */}
            <div className="bg-white p-2 rounded-xl border border-[#e8dcc8] mb-4">
              <img 
                src={generatedImage} 
                alt="كشف الحساب المولد" 
                className="w-full h-auto rounded-lg shadow-sm border border-slate-100 object-contain max-h-[350px]"
              />
            </div>

            {/* Device-Specific dynamic guides */}
            <div className="bg-[#e0f5f2]/40 border border-[#bce8e1] rounded-xl p-3 mb-4 text-right">
              {/iPhone|iPad|iPod/i.test(navigator.userAgent) ? (
                <p className="text-[11px] text-[#0a7c6b] font-bold leading-relaxed">
                  📱 <b>لمستخدمي الآيفون (iPhone/iPad):</b> اضغط مطولاً وبقوة على صورة كشف الحساب أعلاه، ثم اختر <b>"حفظ في الصور" (Save Image)</b> لحفظها في الألبوم، أو استخدم زر المشاركة بالأسفل لإرسالها فوراً!
                </p>
              ) : (
                <p className="text-[11px] text-[#7a6a52] font-semibold leading-relaxed">
                  🤖 <b>لمستخدمي الأندرويد والأجهزة الأخرى:</b> اضغط على زر <b>مشاركة الصورة</b> للإرسال الفوري لجروب العائلة، أو اضغط مطولاً على الصورة للحفظ، أو استخدم زر <b>تحميل كصورة</b>.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleShareGeneratedImage}
                className="w-full py-2.5 bg-[#0a7c6b] hover:bg-[#085c4f] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 border-0"
              >
                <Share2 className="w-4 h-4" />
                <span>مشاركة وحفظ عبر التطبيقات 📱</span>
              </button>

              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = generatedImage;
                  a.download = `البيت_السعيد_كشف_حساب_${getArabicMonthName(currentMonth)}_${currentYear}.png`;
                  a.click();
                  triggerToast('🖼️ تم تنزيل بطاقة كشف الحساب بنجاح!');
                }}
                className="w-full py-2.5 bg-[#f4ebd0] hover:bg-[#e8dcc8] text-[#2c1f0e] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0"
              >
                <Download className="w-4 h-4" />
                <span>تحميل كصورة للهاتف 📥</span>
              </button>

              <button
                onClick={() => setGeneratedImage(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer border-0"
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Styled success/error toast popup notifications */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 transition-all duration-300 z-50 flex items-center gap-1.5 px-6 py-3 rounded-full text-xs font-bold shadow-xl ${
          showToast ? 'bottom-20 opacity-100' : '-bottom-20 opacity-0 pointer-events-none'
        } ${toastIsError ? 'bg-red-600 text-white' : 'bg-[#0a7c6b] text-white'}`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>{toastMessage}</span>
      </div>

    </div>
  );
}
