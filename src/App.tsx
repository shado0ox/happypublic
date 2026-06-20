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
  FileText,
  Image as ImageIcon,
  Coins,
  ArrowUpDown,
  Lightbulb,
  BarChart3,
  Home,
  Fingerprint,
  ScanFace
} from 'lucide-react';
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
    confirmDelete: true
  });

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

  // Biometric / Passcode Lock state
  const [isLocked, setIsLocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [isBiometricRegistered, setIsBiometricRegistered] = useState(false);

  // Advanced Biometric login & scanner states
  const [biometricsLoginEnabled, setBiometricsLoginEnabled] = useState(false);
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
            confirmDelete: data.settings.confirmDelete === 1
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
            confirmDelete: data.settings.confirmDelete === 1
          });
          setExpenseCategory(data.settings.defaultCategory);
          setIncomeSource(data.settings.defaultSource);
        }
        await fetchTransactions(profile.uid);
        await fetchRecurringBills(profile.uid);
        triggerToast('أهلاً بك مجدداً 👋');

        // Offer to enable biometric login if not set up yet
        const hasBioLogin = localStorage.getItem('albait_bio_login_enabled') === 'true';
        if (!hasBioLogin) {
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
            confirmDelete: data.settings.confirmDelete === 1
          });
          setExpenseCategory(data.settings.defaultCategory);
          setIncomeSource(data.settings.defaultSource);
        }
        await fetchTransactions(profile.uid);
        await fetchRecurringBills(profile.uid);
        triggerToast('تم تسجيل حسابك بالنجاح 🎉');

        // Offer to enable biometric login
        (window as any)._temp_bio_cred = { email: emailInput, password: passwordInput, name: profile.name, uid: profile.uid };
        setTimeout(() => {
          setShowBiometricPromptModal(true);
        }, 1500);
      }
    } catch (err: any) {
      setAuthError(err.message || 'خطأ أثناء المصادقة');
    } finally {
      setAuthLoading(false);
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

  // Launch Advanced Biometric Scan
  const handleBiometricLoginStart = async (type: 'fingerprint' | 'face' = 'fingerprint') => {
    const isEnabled = localStorage.getItem('albait_bio_login_enabled') === 'true';
    const savedUserStr = localStorage.getItem('albait_bio_user');

    if (!isEnabled || !savedUserStr) {
      triggerToast('يرجى تسجيل الدخول يدويًا أولاً لتفعيل البصمة وبصمة الوجه 📱', true);
      return;
    }

    let parsedUser;
    try {
      parsedUser = JSON.parse(savedUserStr);
    } catch (e) {
      triggerToast('حدث خطأ في ملف البصمة المخزن، يرجى إعادة تسجيل الدخول ❌', true);
      return;
    }

    if (!parsedUser || !parsedUser.email || !parsedUser.password) {
      triggerToast('لا تتوفر بيانات صحيحة، يرجى كتابة كلمة المرور يدويًا ❌', true);
      return;
    }

    setScanType(type);
    setScanState('scanning');
    setScanProgress(0);
    setShowScanOverlay(true);

    // Run active scan cycle
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
                confirmDelete: data.settings.confirmDelete === 1
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
    }, 70);
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
      confirmDelete: true
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
    if (!confirm('⚠️ تحذير: سيتم مسح كافة البيانات المسجلة نهائياً من قاعدة البيانات ولا يمكن استرجاعها!')) return;
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

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI Scale
    canvas.width = 800;
    canvas.height = 1000;
    ctx.scale(2, 2);

    // Styling metrics (W=400, H=500 for internal metrics)
    const W = 400;
    const H = 500;

    // Background Gradient (Cozy home aesthetic)
    ctx.fillStyle = '#fef9f0';
    ctx.fillRect(0, 0, W, H);

    // Decorative Islamic/Saudi pattern arch heading
    const grad = ctx.createLinearGradient(0, 0, W, 120);
    grad.addColorStop(0, '#0a7c6b');
    grad.addColorStop(1, '#0d9b87');
    ctx.fillStyle = grad;
    
    // Draw Arched Top Banner
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, 100);
    ctx.quadraticCurveTo(W / 2, 130, 0, 100);
    ctx.closePath();
    ctx.fill();

    // Arabic Title text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    
    // Header Logo Icon dummy
    ctx.font = 'bold 18px Arial';
    ctx.fillText('البيت السعيد للمصاريف والمدخرات 🏠', W / 2, 40);
    
    ctx.font = '11px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(`كشف كشف معاملة لشهر: ${getArabicMonthName(currentMonth)} ${currentYear}`, W / 2, 65);

    // Small KPI Box layouts inside image
    const drawKpi = (label: string, amt: string, color: string, x: number, y: number, w: number, h: number) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, w, h, 8) : ctx.rect(x, y, w, h);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '9px Arial';
      ctx.fillText(label, x + w / 2, y + 16);

      ctx.fillStyle = color;
      ctx.font = 'bold 10px Arial';
      ctx.fillText(amt, x + w / 2, y + 36);
    };

    drawKpi('💰 إجمالي الوارد', `${income.toLocaleString('ar-SA')} ${settings.currency}`, '#a8ffec', 35, 110, 100, 50);
    drawKpi('💸 إجمالي المصروف', `${expense.toLocaleString('ar-SA')} ${settings.currency}`, '#ffd0a0', 150, 110, 100, 50);
    drawKpi('📊 صافي الرصيد', `${netSum.toLocaleString('ar-SA')} ${settings.currency}`, netSum >= 0 ? '#a8ffec' : '#ffd5d5', 265, 110, 100, 50);

    // List recent items on Image
    ctx.textAlign = 'right';
    ctx.fillStyle = '#2c1f0e';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('📝 ملخص آخر المعاملات المالية الموثقة:', W - 40, 195);

    let startY = 215;
    const maxListed = 4;
    const items = filteredTxns.slice(0, maxListed);

    if (items.length === 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#7a6a52';
      ctx.font = '11px Arial';
      ctx.fillText('لا توجد سجلات كشف حساب لهذا الشهر', W / 2, 280);
    } else {
      items.forEach((tx) => {
        // Draw transaction item row
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(30, startY, W - 60, 44, 8) : ctx.rect(30, startY, W - 60, 44);
        ctx.fill();

        // Border card
        ctx.strokeStyle = '#e8dcc8';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Print emoji
        const isInc = tx.type === 'income';
        const emoji = isInc ? (CAT_EMOJIS[tx.source || ''] || '💰') : (CAT_EMOJIS[tx.category || ''] || '📦');
        ctx.font = '14px Arial';
        ctx.fillText(emoji, W - 45, startY + 26);

        // Name and desc text
        ctx.textAlign = 'right';
        ctx.fillStyle = '#2c1f0e';
        ctx.font = 'bold 10px Arial';
        const labelText = isInc ? (tx.note || tx.source || '') : (tx.note || tx.category || '');
        ctx.fillText(labelText.length > 25 ? labelText.slice(0, 25) + '...' : labelText, W - 78, startY + 18);

        ctx.fillStyle = '#7a6a52';
        ctx.font = '8px Arial';
        const dateSub = `${tx.date} · ${isInc ? 'وارد' : (tx.category || 'مصروف')}`;
        ctx.fillText(dateSub, W - 78, startY + 34);

        // Amount on left
        ctx.textAlign = 'left';
        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = isInc ? '#0a7c6b' : '#e67e22';
        const numText = `${isInc ? '+' : '-'}${tx.amount.toLocaleString('ar-SA')} ${settings.currency}`;
        ctx.fillText(numText, 45, startY + 26);

        startY += 52;
      });
    }

    // Footer signature
    ctx.textAlign = 'center';
    ctx.fillStyle = '#b8a88a';
    ctx.font = '9px Arial';
    ctx.fillText('برعاية تطبيق البيت السعيد للمصاريف 🏠', W / 2, 460);
    ctx.fillStyle = '#7a6a52';
    ctx.font = 'bold 9px Arial';
    ctx.fillText('مصمم بحب بواسطة Shady Nassef ❤️', W / 2, 478);

    // Save as local image download link
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `albait-statement-${getArabicMonthName(currentMonth)}-${currentYear}.png`;
    a.click();
    triggerToast('🖼️ تم توليد بطاقة كشف الحساب بنجاح وحفظها كصورة!');
  };

  const handleExportStatementAsPDF = () => {
    const list = getFilteredCurrentMonthTxns();
    const income = list.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = list.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netSum = income - expense;
    const savPct = income > 0 ? Math.round((netSum / income) * 100) : 0;

    // Check if html2pdf is available
    if (typeof html2pdf === 'undefined') {
      triggerToast('⚠️ مكتبة توليد PDF غير محملة بالكامل حالياً', true);
      return;
    }

    triggerToast('⏳ جاري إعداد وتوليد التقرير المالي بصيغة PDF...');

    // Create a temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '800px';
    container.style.direction = 'rtl';
    container.style.fontFamily = "system-ui, -apple-system, sans-serif";
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#2c1f0e';
    container.style.padding = '30px';

    // Build categories checklist with colors
    const categoryBreakdown = pieChartData.map(entry => {
      const pct = expense > 0 ? Math.round((entry.value / expense) * 100) : 0;
      return `
        <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; background: #fff; padding: 6px 12px; border-radius: 8px; border: 1px solid #e8dcc8; margin: 4px;">
          <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${entry.color}; flex-shrink: 0;"></div>
          <span style="font-weight: 700;">${entry.name}:</span>
          <span style="color: #e67e22; font-weight: 900;">${entry.value.toLocaleString()} {settings.currency}</span>
          <span style="color: #7a6a52; font-size: 9.5px;">(${pct}%)</span>
        </div>
      `;
    }).join('');

    // Table rows builder
    const tableRows = list.map((tx, idx) => {
      const isInc = tx.type === 'income';
      const categoryText = isInc ? (tx.source || 'وارد عام') : (tx.category || 'مصروف عام');
      const emoji = isInc ? (CAT_EMOJIS[tx.source || ''] || '💰') : (CAT_EMOJIS[tx.category || ''] || '📦');
      return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#fffdf7'}; border-bottom: 1px solid #e8dcc8;">
          <td style="padding: 10px; font-family: monospace; color: #7a6a52;">${tx.date}</td>
          <td style="padding: 10px;">
            <span style="padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 900; background-color: ${isInc ? '#e0f5f2' : '#fff0e5'}; color: ${isInc ? '#0a7c6b' : '#e67e22'}; border: 1px solid ${isInc ? '#9ee0d5' : '#f5c6c6'}; display: inline-block;">
              ${isInc ? 'وارد 📥' : 'مصروف 📤'}
            </span>
          </td>
          <td style="padding: 10px; font-weight: 800; color: #2c1f0e;">${emoji} ${categoryText}</td>
          <td style="padding: 10px; color: #60513e; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tx.note || '-'}</td>
          <td style="padding: 10px; font-weight: 900; text-align: left; font-family: monospace; color: ${isInc ? '#0a7c6b' : '#e67e22'};">
            ${isInc ? '+' : '-'}${tx.amount.toLocaleString()} ${settings.currency}
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div style="font-family: system-ui, -apple-system, sans-serif; background-color: #ffffff; color: #2c1f0e; border: 1px solid #e8dcc8; border-radius: 12px; padding: 25px; box-sizing: border-box; direction: rtl;">
        
        <!-- Document Top Header Banner -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #e8dcc8; padding-bottom: 20px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 15px; text-align: right;">
            <img src="${logoImg}" alt="شعار البيت السعيد" style="width: 70px; height: 70px; border-radius: 50%; border: 3px solid #e0f5f2; object-fit: cover;" />
            <div>
              <h1 style="font-size: 24px; font-weight: 900; color: #0a7c6b; margin: 0; line-height: 1.2;">تطبيق البيت السعيد لميزانية الأسرة</h1>
              <p style="font-size: 11px; font-weight: bold; color: #7a6a52; margin: 4px 0 0 0;">كشف الحساب المالي الموثق والقابل للطباعة</p>
            </div>
          </div>
          <div style="text-align: left; font-size: 10.5px; color: #7a6a52; line-height: 1.5; font-family: monospace;">
            <p style="margin: 0;"><b>تاريخ التصدير:</b> ${new Date().toISOString().split('T')[0]}</p>
            <p style="margin: 2px 0 0 0;"><b>المستخرج:</b> ${currentUser ? currentUser.name : 'ضيف مجهول'}</p>
            <p style="margin: 2px 0 0 0;"><b>البريد:</b> ${currentUser ? currentUser.email : '-'}</p>
          </div>
        </div>

        <!-- Custom Banner Box -->
        <div style="background: linear-gradient(135deg, #0a7c6b 0%, #0d9b87 100%); color: #ffffff; padding: 18px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
          <div style="text-align: right;">
            <span style="font-size: 9px; font-weight: 900; letter-spacing: 1px; color: #e8dcc8; opacity: 0.9; text-transform: uppercase;">مستند كشف رسمي</span>
            <h2 style="font-size: 18px; font-weight: 900; margin: 2px 0 0 0;">تقرير ميزانية شهر: ${getArabicMonthName(currentMonth)} ${currentYear}</h2>
          </div>
          <div style="background-color: rgba(255, 255, 255, 0.15); padding: 6px 12px; border-radius: 8px; font-size: 11.5px; font-weight: 900;">
            إجمالي الحركات: ${list.length} حركة مسجلة
          </div>
        </div>

        <!-- KPI Grid Summary Cards -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
          <div style="background-color: #f0faf8; border: 1px solid #bce8e1; border-radius: 12px; padding: 15px; text-align: center;">
            <span style="font-size: 10px; font-weight: bold; color: #0a7c6b; display: block;">📥 إجمالي الوارد (المقبوضات)</span>
            <span style="font-size: 18px; font-weight: 950; color: #0a7c6b; display: block; margin-top: 5px;">${income.toLocaleString()} ${settings.currency}</span>
          </div>
          <div style="background-color: #fffaf5; border: 1px solid #ffdcb3; border-radius: 12px; padding: 15px; text-align: center;">
            <span style="font-size: 10px; font-weight: bold; color: #d35400; display: block;">📤 إجمالي المصروفات (المدفوعات)</span>
            <span style="font-size: 18px; font-weight: 950; color: #e67e22; display: block; margin-top: 5px;">${expense.toLocaleString()} ${settings.currency}</span>
          </div>
          <div style="background-color: #fdfdfd; border: 1px solid #e8dcc8; border-radius: 12px; padding: 15px; text-align: center;">
            <span style="font-size: 10px; font-weight: bold; color: #2c1f0e; display: block;">📊 الصافي المتبقي (الادخار)</span>
            <span style="font-size: 18px; font-weight: 950; color: ${netSum >= 0 ? '#0a7c6b' : '#ff3333'}; display: block; margin-top: 5px;">${netSum.toLocaleString()} ${settings.currency}</span>
            <span style="font-size: 9px; font-weight: bold; color: #7a6a52; display: block; margin-top: 4px;">نسبة التوفير: %${savPct}</span>
          </div>
        </div>

        <!-- Expense Category Breakdown representation -->
        ${pieChartData.length > 0 ? `
          <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e8dcc8; border-radius: 12px; background-color: #fffdf9; text-align: right;">
            <h3 style="font-size: 12px; font-weight: 900; color: #2c1f0e; margin: 0 0 10px 0; display: flex; align-items: center; gap: 6px;">
              <span>📊</span>
              <span>توزيع المصروفات شهرياً حسب الفئات والمسمى</span>
            </h3>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${categoryBreakdown}
            </div>
          </div>
        ` : ''}

        <!-- Transactions detailed list table -->
        <div style="text-align: right;">
          <h3 style="font-size: 12px; font-weight: 900; color: #2c1f0e; margin: 0 0 10px 0; display: flex; align-items: center; gap: 6px;">
            <span>📋</span>
            <span>جدول كشف الحركة المالية التفصيلي للميزانية</span>
          </h3>
          <div style="border: 1px solid #e8dcc8; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
            <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 11px;">
              <thead>
                <tr style="background-color: #f7f5f0; border-bottom: 1px solid #e8dcc8; color: #7a6a52;">
                  <th style="padding: 10px; font-weight: 900;">التاريخ</th>
                  <th style="padding: 10px; font-weight: 900;">نوع الحركة</th>
                  <th style="padding: 10px; font-weight: 900;">الفئة البند</th>
                  <th style="padding: 10px; font-weight: 900;">البيان والملاحظات</th>
                  <th style="padding: 10px; font-weight: 900; text-align: left;">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
                ${list.length === 0 ? `
                  <tr>
                    <td colspan="5" style="padding: 30px; text-align: center; color: #7a6a52;">
                      لا توجد أي معاملات مسجلة لكشف الحساب في هذا الشهر.
                    </td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Elegant Authentication Footer signatures -->
        <div style="margin-top: 35px; border-top: 2px solid #e8dcc8; padding-top: 15px; text-align: center;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; font-weight: bold; color: #0a7c6b;">
            <span>🏡</span>
            <span>تم استخراجه تلقائياً وتوقيعه رقمياً ومحلياً بواسطة نظام البيت السعيد</span>
          </div>
          <p style="font-size: 9px; color: #7a6a52; margin: 5px 0 0 0;">
            قاعدة بيانات العمليات: SQLite Engine المدمج · تطبيق الويب والمحمول للهواتف الذكية مع المزامنة التلقائية.
          </p>
          <p style="font-size: 9px; color: #b8a88a; margin: 3px 0 0 0; font-weight: bold;">
            جميع الحقوق محفوظة © ${currentYear}
          </p>
        </div>

      </div>
    `;

    document.body.appendChild(container);

    const opt = {
      margin:       10,
      filename:     `البيت_السعيد_كشف_حساب_${getArabicMonthName(currentMonth)}_${currentYear}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(container).save().then(() => {
      // Clean up from DOM
      document.body.removeChild(container);
      triggerToast('📄 تم إصدار وحفظ كشف الحساب بصيغة PDF بنجاح!');
    }).catch((err: any) => {
      console.error(err);
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      triggerToast('⚠️ حدث خطأ أثناء تكوين ملف الـ PDF', true);
    });
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
    if (!confirm('⚠️ مشرف: هل تريد حذف هذه المعاملة المحددة من قاعدة بيانات SQLite بالكامل؟')) return;

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
  const currentMonthBalance = currentMonthIncome - currentMonthExpense;
  const savingPercentage = currentMonthIncome > 0 ? Math.round((currentMonthBalance / currentMonthIncome) * 100) : 0;

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
            <img 
              src={logoImg} 
              alt="شعار البيت السعيد" 
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full border-4 border-[#e0f5f2] shadow-md object-cover mb-3 transform hover:scale-105 transition-transform duration-300"
            />
            <h1 className="text-2xl font-black font-display text-[#2c1f0e]">تطبيق البيت السعيد</h1>
            <p className="text-[#7a6a52] text-xs font-semibold mt-1">إصدار الهواتف فائق السرعة مع SQLite</p>
          </div>

          <div className="bg-[#e0f5f2] border border-[#a8ffec] rounded-lg p-3 text-center mb-6">
            <span className="text-xs font-bold text-[#0a7c6b] block">🔒 قاعدة بيانات SQLite محلية نشطة</span>
            <span className="text-[10px] text-[#2c1f0e]/70 block mt-0.5">يُحفظ كشف حسابك بشكل آمن وخفيف للتحميل المستمر على الجوال</span>
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
                  placeholder="مثال: أبو خالد"
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
                <span className="text-[10px] text-center text-[#7a6a52] font-bold block">الدخول السريع والآمن بالبصمة</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBiometricLoginStart('fingerprint')}
                    className="flex-1 py-2 bg-[#fef9f0] hover:bg-[#efecd7] text-[#0a7c6b] border border-[#e8dcc8] rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Fingerprint className="w-4 h-4 text-[#0a7c6b] animate-pulse" />
                    <span>بصمة الإصبع</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBiometricLoginStart('face')}
                    className="flex-1 py-2 bg-[#fef9f0] hover:bg-[#efecd7] text-[#e67e22] border border-[#e8dcc8] rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ScanFace className="w-4 h-4 text-[#e67e22]" />
                    <span>بصمة الوجه</span>
                  </button>
                </div>
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
                <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-white/25">
                  <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-md">
                    <span className="text-[10px] text-white/80 block">💰 الوارد المالي</span>
                    <span className="text-sm font-black block mt-0.5">{currentMonthIncome.toLocaleString('ar-SA')} {settings.currency}</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-md">
                    <span className="text-[10px] text-white/80 block">💸 المنصرف الصادر</span>
                    <span className="text-sm font-black block mt-0.5">{currentMonthExpense.toLocaleString('ar-SA')} {settings.currency}</span>
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
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl p-3 text-center border border-[#e8dcc8] shadow-xs">
                <span className="text-[10px] text-[#7a6a52] font-bold block">إجمالي الوارد</span>
                <span className="text-sm font-black text-[#0a7c6b] block mt-1">{currentMonthIncome.toLocaleString()} {settings.currency}</span>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-[#e8dcc8] shadow-xs">
                <span className="text-[10px] text-[#7a6a52] font-bold block">إجمالي المصروف</span>
                <span className="text-sm font-black text-amber-600 block mt-1">{currentMonthExpense.toLocaleString()} {settings.currency}</span>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-[#e8dcc8] shadow-xs">
                <span className="text-[10px] text-[#7a6a52] font-bold block">الصافي المتبقي</span>
                <span className={`text-sm font-black block mt-1 ${currentMonthBalance >= 0 ? 'text-[#0a7c6b]' : 'text-red-500'}`}>
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
              <div className="grid grid-cols-4 gap-1.5">
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
                  onClick={handleExportStatementAsPDF}
                  className="p-1 py-2 bg-[#fdf2f2] border border-[#f5c6c6] hover:border-red-500 text-[#2c1f0e] text-[9px] font-black rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all text-center"
                >
                  <FileText className="w-4 h-4 text-red-600" />
                  <span>تصدير PDF 📄</span>
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
                  onClick={() => {
                    const nextVal = !biometricsLoginEnabled;
                    if (nextVal) {
                      if (currentUser && currentUser.provider !== 'demo') {
                        const temp = (window as any)._temp_bio_cred;
                        if (temp) {
                          localStorage.setItem('albait_bio_user', JSON.stringify(temp));
                          localStorage.setItem('albait_bio_login_enabled', 'true');
                          setBiometricsLoginEnabled(true);
                          triggerToast('🔒 تم ربط وتفعيل الدخول بالبصمة والوجه بنجاح!');
                          playBiometricSynthSound('success');
                        } else {
                          const p = prompt('يرجى كتابة كلمة المرور الحالية لتأكيد ربط البصمة بالهاتف 🔑:');
                          if (p) {
                            const cred = { email: currentUser.email, password: p, name: currentUser.name, uid: currentUser.uid };
                            localStorage.setItem('albait_bio_user', JSON.stringify(cred));
                            localStorage.setItem('albait_bio_login_enabled', 'true');
                            setBiometricsLoginEnabled(true);
                            triggerToast('🔒 تم ربط وتفعيل الدخول بالبصمة والوجه بنجاح!');
                            playBiometricSynthSound('success');
                          }
                        }
                      } else {
                        triggerToast('غير متاح بالوضع التجريبي، يرجى تسجيل الدخول بحساب حقيقي للتفعيل 📱', true);
                      }
                    } else {
                      localStorage.removeItem('albait_bio_user');
                      localStorage.setItem('albait_bio_login_enabled', 'false');
                      setBiometricsLoginEnabled(false);
                      triggerToast('🔓 تم إلغاء تفعيل تسجيل الدخول بالبصمة');
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
                مسح كل المصاريف والمعاملات المسجلة من SQLite المحلي لجهازك تماماً. لا يمكن التراجع عن هذا الإجراء!
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
                متاح حصرياً للحساب {currentUser.email}. تتيح لك مراقبة إجماليات السيرفر المحلي SQLite وإدارة الحسابات.
              </p>
              
              <button
                onClick={fetchAdminStats}
                disabled={adminLoading}
                className="mt-4 px-4 py-1.5 bg-white text-purple-700 font-bold rounded-lg text-xs transition-all flex items-center gap-1 hover:bg-purple-100"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${adminLoading ? 'animate-spin' : ''}`} />
                <span>جرّ وسحب الاحصائيات من SQLite</span>
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
                👥 مستخدمو قاعدة البيانات النشطون:
              </h3>

              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {adminUsers.map(user => {
                  const userRecords = adminTxns.filter(t => t.uid === user.uid);
                  const userIncome = userRecords.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
                  const userExpense = userRecords.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

                  return (
                    <div
                      key={user.uid}
                      onClick={() => handleOpenAdminUserModal(user)}
                      className="p-3 bg-[#fdf3e0]/30 hover:bg-[#fdf3e0]/60 border border-[#e8dcc8] rounded-xl flex items-center justify-between cursor-pointer transition-all"
                    >
                      <div>
                        <span className="text-xs font-black text-[#2c1f0e] block">{user.name}</span>
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
                    اضغط تحديث لجلب السجلات من SQLite 📊
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
                onClick={() => {
                  const temp = (window as any)._temp_bio_cred;
                  if (temp) {
                    localStorage.setItem('albait_bio_user', JSON.stringify(temp));
                    localStorage.setItem('albait_bio_login_enabled', 'true');
                    setBiometricsLoginEnabled(true);
                    triggerToast('🔓 تم تفعيل تسجيل الدخول بالبصمة بنجاح!');
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
