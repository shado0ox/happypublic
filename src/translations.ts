// Translations for Albait (البيت السعيد) App
// Supports Arabic and English, and is easily extensible for other languages.

export interface CurrencyConfig {
  code: string;
  symbol: string;
  labelAr: string;
  labelEn: string;
}

export const CURRENCIES: CurrencyConfig[] = [
  { code: 'SAR', symbol: 'ر.س', labelAr: 'ريال سعودي (ر.س)', labelEn: 'Saudi Riyal (SAR)' },
  { code: 'USD', symbol: '$', labelAr: 'دولار أمريكي ($)', labelEn: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', labelAr: 'يورو (€)', labelEn: 'Euro (€)' },
  { code: 'EGP', symbol: 'ج.م', labelAr: 'جنيه مصري (ج.م)', labelEn: 'Egyptian Pound (EGP)' },
  { code: 'AED', symbol: 'د.إ', labelAr: 'درهم إماراتي (د.إ)', labelEn: 'UAE Dirham (AED)' },
  { code: 'KWD', symbol: 'د.ك', labelAr: 'دينار كويتي (د.ك)', labelEn: 'Kuwaiti Dinars (KWD)' },
  { code: 'QAR', symbol: 'ر.ق', labelAr: 'ريال قطري (ر.ق)', labelEn: 'Qatari Riyal (QAR)' },
  { code: 'BHD', symbol: 'د.ب', labelAr: 'دينار بحريني (د.ب)', labelEn: 'Bahraini Dinars (BHD)' },
  { code: 'OMR', symbol: 'ر.ع', labelAr: 'ريال عماني (ر.ع)', labelEn: 'Omani Rial (OMR)' },
  { code: 'GBP', symbol: '£', labelAr: 'جنيه إسترليني (£)', labelEn: 'British Pound (£)' },
];

export const CAT_COLORS: Record<string, string> = {
  "food": "#e74c3c",
  "transport": "#3498db",
  "utilities": "#f39c12",
  "education": "#9b59b6",
  "health": "#27ae60",
  "clothing": "#e91e63",
  "maintenance": "#ff5722",
  "entertainment": "#00bcd4",
  "other": "#95a5a6",
  "income": "#0a7c6b"
};

export const CAT_EMOJIS: Record<string, string> = {
  "food": "🍽️",
  "transport": "🚗",
  "utilities": "⚡",
  "education": "📚",
  "health": "💊",
  "clothing": "👗",
  "maintenance": "🔧",
  "entertainment": "🎮",
  "other": "📦",
  "salary": "💼",
  "bonus": "🎁",
  "rent": "🏠",
  "investment": "📈",
  "gift": "🎀",
  "other_income": "💰"
};

// Backward compatibility: normalize old Arabic database entries to standardized IDs
export const normalizeCategory = (cat: string | null | undefined): string => {
  if (!cat) return 'other';
  const mapping: Record<string, string> = {
    "طعام وشراب": "food",
    "مواصلات": "transport",
    "كهرباء ومياه": "utilities",
    "تعليم": "education",
    "صحة وطب": "health",
    "ملابس": "clothing",
    "صيانة المنزل": "maintenance",
    "ترفيه": "entertainment",
    "أخرى": "other",
    "food": "food",
    "transport": "transport",
    "utilities": "utilities",
    "education": "education",
    "health": "health",
    "clothing": "clothing",
    "maintenance": "maintenance",
    "entertainment": "entertainment",
    "other": "other"
  };
  return mapping[cat] || 'other';
};

export const normalizeSource = (src: string | null | undefined): string => {
  if (!src) return 'other_income';
  const mapping: Record<string, string> = {
    "راتب": "salary",
    "مكافأة": "bonus",
    "إيجار": "rent",
    "استثمار": "investment",
    "هدية": "gift",
    "أخرى": "other_income",
    "أخرى_income": "other_income",
    "salary": "salary",
    "bonus": "bonus",
    "rent": "rent",
    "investment": "investment",
    "gift": "gift",
    "other_income": "other_income"
  };
  return mapping[src] || 'other_income';
};

export const translations: Record<string, Record<string, string>> = {
  ar: {
    // Categories & Sources
    "cat.food": "طعام وشراب",
    "cat.transport": "مواصلات",
    "cat.utilities": "كهرباء ومياه",
    "cat.education": "تعليم",
    "cat.health": "صحة وطب",
    "cat.clothing": "ملابس",
    "cat.maintenance": "صيانة المنزل",
    "cat.entertainment": "ترفيه",
    "cat.other": "أخرى",
    "src.salary": "راتب شهري أساسي",
    "src.bonus": "مكافأة أو حوافز مالية",
    "src.rent": "عائد إيجار عقار أو أصل",
    "src.investment": "أرباح أسهم أو استثمارات",
    "src.gift": "هدية أو وارد عائلي طارئ",
    "src.other_income": "وارد مالي آخر",

    // General Nav
    "nav.home": "الرئيسية",
    "nav.statement": "كشف الحساب",
    "nav.analytics": "التحليلات",
    "nav.recurring": "فواتير دورية",
    "nav.settings": "الإعدادات",
    "nav.admin": "مشرف",

    // Common labels
    "currency": "العملة",
    "total": "الإجمالي",
    "balance": "الرصيد",
    "income": "الوارد المالي",
    "expenses": "المصاريف",
    "add": "إضافة",
    "delete": "حذف",
    "cancel": "إلغاء",
    "save": "حفظ",
    "loading": "جاري التحميل...",
    "error": "خطأ",
    "success": "نجاح",
    "confirm": "تأكيد",
    "notes": "ملاحظات وتفاصيل",
    "date": "التاريخ",
    "category": "الفئة",
    "description": "الوصف",
    "amount": "المبلغ",
    "search": "بحث...",
    "all": "الكل",
    "today": "اليوم",
    "yesterday": "أمس",
    "last7Days": "آخر ٧ أيام",
    "thisMonth": "الشهر الحالي",
    "customDate": "تاريخ مخصص",
    "hijriDate": "التاريخ الهجري",
    "gregorianDate": "التاريخ الميلادي",

    // Home / Dashboard Screen
    "home.welcome": "مرحباً بك،",
    "home.familyAccount": "حساب عائلي مدمج 🏠",
    "home.walletBalance": "الرصيد المتاح بالمحفظة",
    "home.totalIncome": "إجمالي الإيرادات والوارد",
    "home.totalExpense": "إجمالي مصاريف الشهر",
    "home.quickActions": "⚡ إجراءات سريعة فورية",
    "home.newIncome": "توثيق وارد مالي جديد",
    "home.newExpense": "توثيق مصروف مالي جديد",
    "home.addBill": "جدولة فاتورة دورية جديدة",
    "home.recentTxns": "📋 آخر المعاملات والتوثيقات",
    "home.seeAll": "عرض الكل 🧾",
    "home.noTxns": "لا توجد معاملات بعد في هذا الشهر. ابدأ بإضافة معاملتك الأولى!",
    "home.motivationTitle": "💡 حكمة ووعي مالي عائلي",
    "home.anonymous": "ضيف كريم",

    // Transaction form labels
    "form.amountLabel": "المبلغ الإجمالي ({currency})",
    "form.sourceLabel": "مصدر الإيراد المالي",
    "form.catLabel": "تصنيف فئة المصروف",
    "form.dateLabel": "التاريخ المخصص للتوثيق",
    "form.notesLabel": "ملاحظات وتفاصيل إضافية (اختياري)",
    "form.descLabel": "وصف تفصيلي مبسط للمصروف",
    "form.placeholderNotes": "مثال: راتب سدادي لشهر ربيع الأول",
    "form.placeholderDesc": "مثال: فاتورة المياه أو مشاوير الجمعية",
    "form.addIncomeBtn": "تأكيد وتوثيق الوارد 💰",
    "form.addExpenseBtn": "تأكيد وحسم المصروف 💸",

    // Statements Screen
    "stmt.title": "كشف الحساب المالي العائلي",
    "stmt.subtitle": "سجل كامل وتفصيلي لكافة الحركات الواردة والصادرة",
    "stmt.exportImage": "تصدير كشف مصور 🖼️",
    "stmt.exportBackup": "تصدير نسخة احتياطية 📥",
    "stmt.importBackup": "استيراد نسخة احتياطية 📤",
    "stmt.clearAll": "إفراغ كشف الحساب 🗑️",
    "stmt.clearConfirm": "هل أنت متأكد تماماً من رغبتك في مسح كافة الحركات المالية بشكل نهائي؟ لا يمكن تراجع عن هذا الإجراء!",
    "stmt.filterType": "تصفية حسب النوع",
    "stmt.filterCat": "تصفية حسب الفئة",
    "stmt.filterDate": "تصفية حسب المدة",
    "stmt.noTxnsFiltered": "لا توجد حركات مالية مطابقة للفلتر المحدد.",
    "stmt.incomeType": "وارد مالي",
    "stmt.expenseType": "مصروف مالي",

    // Analytics Screen
    "an.title": "تحليل الأداء والوعي المالي",
    "an.subtitle": "مخططات بيانية وتوزيع المصاريف حسب الفئة والشهور",
    "an.byCat": "📊 توزيع النفقات والمصاريف حسب الفئات",
    "an.byMonth": "📈 تطور الدخل والمصاريف عبر الشهور",
    "an.totalSaved": "💰 إجمالي المدخرات المتراكمة",
    "an.saveRatio": "📊 نسبة المدخرات من الدخل الإجمالي",
    "an.noData": "لا تتوفر بيانات كافية لعرض الرسومات البيانية. أضف معاملات أولاً!",

    // Recurring Bills Screen
    "bill.title": "جدولة الفواتير والالتزامات الدورية",
    "bill.subtitle": "إدارة وتتبع المدفوعات الشهرية الثابتة قبل موعدها",
    "bill.addNew": "جدولة التزام شهري جديد",
    "bill.amount": "قيمة الدفع الموثق",
    "bill.dayOfMonth": "يوم الدفع من كل شهر ميلادي",
    "bill.noBills": "لا توجد فواتير دورية مجدولة حالياً.",
    "bill.dueDate": "يستحق يوم {day} من الشهر",
    "bill.payNow": "ادفع الآن ✅",
    "bill.paid": "تم الدفع للشهر الحالي",
    "bill.recurring": "فاتورة دورية شهرياً",

    // Settings Screen
    "set.title": "إعدادات وهندسة النظام المالي",
    "set.subtitle": "تخصيص كامل لواجهة وخصائص التطبيق لتلائم عائلتك",
    "set.currency": "العملة الافتراضية للحساب",
    "set.language": "لغة الواجهة والتطبيق",
    "set.cycleStart": "يوم بداية الدورة المالية الشهرية",
    "set.sortOrder": "ترتيب عرض المعاملات كشف الحساب",
    "set.sortDesc": "الأحدث أولاً ⬇️",
    "set.sortAsc": "الأقدم أولاً ⬆️",
    "set.defaultFilter": "نوع الفلتر الافتراضي عند فتح التطبيق",
    "set.defaultCat": "الفئة التلقائية عند إضافة مصاريف جديدة",
    "set.defaultSrc": "المصدر التلقائي عند إضافة إيرادات جديدة",
    "set.showMotivation": "تفعيل جدار الحكمة والوعي المالي",
    "set.showCharts": "عرض المخططات الدائرية بكشف الحساب",
    "set.autoHome": "توجيهك للرئيسية عند تمام كل توثيق",
    "set.confirmDelete": "السؤال قبل حذف أي حركة مالية",
    "set.realTimeSync": "تحديث فوري وتزامن مع الأجهزة الأخرى",
    "set.enableSounds": "تأثيرات صوتية تفاعلية عند الإضافة",
    "set.reset": "إعادة تهيئة الإعدادات 🔄",
    "set.useHijri": "إظهار التاريخ الهجري الموازي",
    "set.hijriDesc": "عرض التاريخ الهجري بجانب الميلادي في التوثيقات والواجهات",

    // Auth screen
    "auth.welcome": "مرحباً بك في نظام البيت السعيد 🏡",
    "auth.subtitle": "المنصة العائلية الذكية لإدارة الميزانية والمصاريف المشتركة",
    "auth.nameLabel": "اسمك الكريم",
    "auth.emailLabel": "البريد الإلكتروني",
    "auth.passLabel": "كلمة المرور",
    "auth.loginBtn": "سجل دخولك الآمن 🔑",
    "auth.signupBtn": "إنشاء حساب عائلي جديد ✨",
    "auth.switchSignup": "ليس لديك حساب؟ اشترك معنا في ثوانٍ",
    "auth.switchLogin": "لديك حساب بالفعل؟ سجل دخولك الآن",
    "auth.or": "أو",
    "auth.biometricLogin": "تسجيل دخول سريع بالبصمة البيومترية ⚡",
    "auth.enableBioInSettings": "يمكنك تفعيل الدخول البيومتري التلقائي من صفحة الإعدادات",

    // Admin Screen
    "admin.title": "لوحة تحكم وإشراف النظام العائلي 👑",
    "admin.subtitle": "صلاحيات المشرف الفني على الخوادم وقواعد البيانات",
    "admin.usersList": "قائمة مستخدمي المنصة الموثقين",
    "admin.totalUsers": "إجمالي الأعضاء المسجلين",
    "admin.clearUserRecords": "تصفية كافة السجلات",
    "admin.userBalance": "رصيد المستخدم الحالي",
    "admin.provider": "وسيلة التسجيل",

    // Months (ar)
    "month.0": "يناير",
    "month.1": "فبراير",
    "month.2": "مارس",
    "month.3": "أبريل",
    "month.4": "مايو",
    "month.5": "يونيو",
    "month.6": "يوليو",
    "month.7": "أغسطس",
    "month.8": "سبتمبر",
    "month.9": "أكتوبر",
    "month.10": "نوفمبر",
    "month.11": "ديسمبر",

    // Toast and interactive messages
    "msg.welcomeBack": "أهلاً بك مجدداً {name}! 👋",
    "msg.signupSuccess": "🎉 تم إنشاء حسابك بنجاح! مرحباً بك في ميزانية البيت السعيد.",
    "msg.loginExpired": "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً 🔒",
    "msg.addedSuccess": "تم توثيق المعاملة وحفظها بنجاح! 🎉",
    "msg.deletedSuccess": "تم حذف الحركة المالية بنجاح 🗑️",
    "msg.updatedSettings": "تم حفظ التعديلات تلقائياً ⚙️",
    "msg.resetSettings": "تمت إعادة تهيئة الإعدادات 🔄",
    "msg.exportReady": "⬇️ جاري تحميل ملف النسخة الاحتياطية",
    "msg.importSuccess": "✅ تم استيراد بنجاح {count} معاملة مدمجة!",
    "msg.dbCleared": "🗑️ تم إفراغ كشف حسابك بالكامل!",
    "msg.billPaid": "✅ تم دفع الفاتورة الدورية بنجاح!",
    "msg.adminCleared": "👑 مشرف: تم تصفية كافة السجلات",
    "msg.adminDeleted": "👑 مشرف: تم الحذف بنجاح",
    "msg.whatsappTemplate": "*تقرير كشف ميزانية عائلة البيت السعيد* 🏡\n\n📅 *لشهر: {month} {year}*\n💰 *الرصيد المتاح حالياً:* {balance} {currency}\n📈 *إجمالي الإيرادات:* {income} {currency}\n📉 *إجمالي المصاريف:* {expense} {currency}\n\n*سجل المعاملات والتوثيقات التفصيلي:* \n{txns}\n\n_تم إرسالها من تطبيق البيت السعيد للإدارة المالية المشتركة_"
  },
  en: {
    // Categories & Sources
    "cat.food": "Food & Dining",
    "cat.transport": "Transportation",
    "cat.utilities": "Utilities & Bills",
    "cat.education": "Education",
    "cat.health": "Health & Medical",
    "cat.clothing": "Clothing",
    "cat.maintenance": "Home Maintenance",
    "cat.entertainment": "Entertainment",
    "cat.other": "Others",
    "src.salary": "Primary Monthly Salary",
    "src.bonus": "Bonus & Financial Incentives",
    "src.rent": "Rental Income",
    "src.investment": "Dividends & Investments",
    "src.gift": "Gift & Family Income",
    "src.other_income": "Other Income",

    // General Nav
    "nav.home": "Home",
    "nav.statement": "Statement",
    "nav.analytics": "Analytics",
    "nav.recurring": "Recurring Bills",
    "nav.settings": "Settings",
    "nav.admin": "Admin",

    // Common labels
    "currency": "Currency",
    "total": "Total",
    "balance": "Balance",
    "income": "Income",
    "expenses": "Expenses",
    "add": "Add",
    "delete": "Delete",
    "cancel": "Cancel",
    "save": "Save",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "confirm": "Confirm",
    "notes": "Notes & Details",
    "date": "Date",
    "category": "Category",
    "description": "Description",
    "amount": "Amount",
    "search": "Search...",
    "all": "All",
    "today": "Today",
    "yesterday": "Yesterday",
    "last7Days": "Last 7 Days",
    "thisMonth": "This Month",
    "customDate": "Custom Date",
    "hijriDate": "Hijri Date",
    "gregorianDate": "Gregorian Date",

    // Home / Dashboard Screen
    "home.welcome": "Welcome,",
    "home.familyAccount": "Shared Family Account 🏠",
    "home.walletBalance": "Available Wallet Balance",
    "home.totalIncome": "Total Monthly Income",
    "home.totalExpense": "Total Monthly Expenses",
    "home.quickActions": "⚡ Quick Instant Actions",
    "home.newIncome": "Document New Income",
    "home.newExpense": "Document New Expense",
    "home.addBill": "Schedule New Recurring Bill",
    "home.recentTxns": "📋 Recent Transactions & Records",
    "home.seeAll": "View All 🧾",
    "home.noTxns": "No transactions this month yet. Start by adding your first one!",
    "home.motivationTitle": "💡 Wisdom & Financial Awareness",
    "home.anonymous": "Valued Guest",

    // Transaction form labels
    "form.amountLabel": "Total Amount ({currency})",
    "form.sourceLabel": "Income Source",
    "form.catLabel": "Expense Category",
    "form.dateLabel": "Custom Record Date",
    "form.notesLabel": "Additional Details & Notes (Optional)",
    "form.descLabel": "Simple Expense Description",
    "form.placeholderNotes": "Example: Monthly salary for Rabi' al-Awwal",
    "form.placeholderDesc": "Example: Water bill or weekly groceries",
    "form.addIncomeBtn": "Confirm & Record Income 💰",
    "form.addExpenseBtn": "Confirm & Record Expense 💸",

    // Statements Screen
    "stmt.title": "Family Account Statement",
    "stmt.subtitle": "Full detailed transaction history of income and expenses",
    "stmt.exportImage": "Export Image Statement 🖼️",
    "stmt.exportBackup": "Export Backup 📥",
    "stmt.importBackup": "Import Backup 📤",
    "stmt.clearAll": "Clear Account Statement 🗑️",
    "stmt.clearConfirm": "Are you absolutely sure you want to permanently delete all financial records? This action cannot be undone!",
    "stmt.filterType": "Filter by Type",
    "stmt.filterCat": "Filter by Category",
    "stmt.filterDate": "Filter by Duration",
    "stmt.noTxnsFiltered": "No transactions match the selected filter.",
    "stmt.incomeType": "Income",
    "stmt.expenseType": "Expense",

    // Analytics Screen
    "an.title": "Performance & Financial Awareness Analysis",
    "an.subtitle": "Analytical charts and spending distribution by category & months",
    "an.byCat": "📊 Expense Distribution by Category",
    "an.byMonth": "📈 Income vs Expenses Monthly Trend",
    "an.totalSaved": "💰 Cumulative Total Savings",
    "an.saveRatio": "📊 Savings Ratio of Total Income",
    "an.noData": "Not enough data to display graphs. Add transactions first!",

    // Recurring Bills Screen
    "bill.title": "Scheduled Recurring Bills & Commitments",
    "bill.subtitle": "Manage and track fixed monthly payments before their due date",
    "bill.addNew": "Schedule New Monthly Commitment",
    "bill.amount": "Documented Payment Amount",
    "bill.dayOfMonth": "Payment Day of Each Calendar Month",
    "bill.noBills": "No recurring bills scheduled currently.",
    "bill.dueDate": "Due on day {day} of the month",
    "bill.payNow": "Pay Now ✅",
    "bill.paid": "Paid for current month",
    "bill.recurring": "Recurring Monthly",

    // Settings Screen
    "set.title": "System & Settings Engineering",
    "set.subtitle": "Customize interface and capabilities to fit your family budget",
    "set.currency": "Default Account Currency",
    "set.language": "App Interface Language",
    "set.cycleStart": "Cycle Start Day of Each Month",
    "set.sortOrder": "Statement Order of Transactions",
    "set.sortDesc": "Newest First ⬇️",
    "set.sortAsc": "Oldest First ⬆️",
    "set.defaultFilter": "Default Filter on Launch",
    "set.defaultCat": "Default Category for New Expenses",
    "set.defaultSrc": "Default Source for New Income",
    "set.showMotivation": "Enable Wisdom & Financial Wellness Wall",
    "set.showCharts": "Display Statement Pie Charts",
    "set.autoHome": "Auto Redirect to Home After Entry",
    "set.confirmDelete": "Ask Before Deleting Any Record",
    "set.realTimeSync": "Real-time Instant Synchronization",
    "set.enableSounds": "Interactive Sound Effects on Entry",
    "set.reset": "Reset All Settings 🔄",
    "set.useHijri": "Show Parallel Hijri Calendar",
    "set.hijriDesc": "Display Hijri dates alongside Gregorian dates",

    // Auth screen
    "auth.welcome": "Welcome to Albait Alsaeed 🏡",
    "auth.subtitle": "Smart Family Platform for Shared Budget & Expenses",
    "auth.nameLabel": "Your Name",
    "auth.emailLabel": "Email Address",
    "auth.passLabel": "Password",
    "auth.loginBtn": "Secure Login 🔑",
    "auth.signupBtn": "Create New Family Account ✨",
    "auth.switchSignup": "Don't have an account? Sign up in seconds",
    "auth.switchLogin": "Already have an account? Log in now",
    "auth.or": "OR",
    "auth.biometricLogin": "Fast Biometric Fingerprint/Face Login ⚡",
    "auth.enableBioInSettings": "You can enable automatic biometric login from settings page",

    // Admin Screen
    "admin.title": "Family Platform Admin & Oversight 👑",
    "admin.subtitle": "Technical administrator permissions on servers and database",
    "admin.usersList": "Verified Users List",
    "admin.totalUsers": "Total Registered Members",
    "admin.clearUserRecords": "Wipe User Records",
    "admin.userBalance": "Current Member Balance",
    "admin.provider": "Registration Method",

    // Months (en)
    "month.0": "January",
    "month.1": "February",
    "month.2": "March",
    "month.3": "April",
    "month.4": "May",
    "month.5": "June",
    "month.6": "July",
    "month.7": "August",
    "month.8": "September",
    "month.9": "October",
    "month.10": "November",
    "month.11": "December",

    // Toast and interactive messages
    "msg.welcomeBack": "Welcome back, {name}! 👋",
    "msg.signupSuccess": "🎉 Account created successfully! Welcome to Albait Alsaeed.",
    "msg.loginExpired": "Session expired, please log in again 🔒",
    "msg.addedSuccess": "Transaction documented and saved successfully! 🎉",
    "msg.deletedSuccess": "Financial transaction deleted successfully 🗑️",
    "msg.updatedSettings": "Settings saved automatically ⚙️",
    "msg.resetSettings": "Settings reset to defaults 🔄",
    "msg.exportReady": "⬇️ Downloading backup file...",
    "msg.importSuccess": "✅ Imported {count} merged transactions successfully!",
    "msg.dbCleared": "🗑️ Your statement has been completely wiped!",
    "msg.billPaid": "✅ Recurring bill paid successfully!",
    "msg.adminCleared": "👑 Admin: All records cleared successfully",
    "msg.adminDeleted": "👑 Admin: Deleted successfully",
    "msg.whatsappTemplate": "*Family Budget Statement - Albait Alsaeed* 🏡\n\n📅 *Month of: {month} {year}*\n💰 *Current Balance:* {balance} {currency}\n📈 *Total Income:* {income} {currency}\n📉 *Total Expenses:* {expense} {currency}\n\n*Detailed Records History:* \n{txns}\n\n_Sent from Albait Alsaeed Shared Finance App_"
  }
};

// Simple utility function to convert date to Hijri string (for Saudi Arabia / Gulf standard display)
// Use custom calculation or standard Intl API if supported
export const getHijriDateString = (gregorianDateStr: string): string => {
  try {
    const d = new Date(gregorianDateStr);
    if (isNaN(d.getTime())) return '';
    const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return formatter.format(d);
  } catch (e) {
    // Fallback if Intl.DateTimeFormat with islamic calendar is not fully supported
    return '';
  }
};
