import { createContext, useContext, useState } from "react";

const translations = {
  en: {
    appName: "Moneto",
    appSubtitle: "Keep tabs on your income and expenses",
    signOut: "Sign out",
    dateLocale: "en-US",

    // Nav tabs
    navOverview: "Overview",
    navTransactions: "Transactions",
    navAnalytics: "Analytics",
    navBudgets: "Budgets",
    navSubscriptions: "Subscriptions",

    // Profile
    usernameRequired: "Username cannot be empty",

    // Danger zone
    dangerZone: "Danger Zone",
    deleteAccountBtn: "Delete Account",
    deleteAccountWarning: "This permanently deletes your account along with all transactions, budgets, and subscriptions. This cannot be undone.",
    deleteAccountTypeLabel: "Type DELETE to confirm",
    deleteAccountTypeWrong: "Please type DELETE to confirm",
    deleteAccountNeedPassword: "Password required",
    deleteAccountConfirmBtn: "Delete forever",
    deletingAccount: "Deleting…",
    deleteAccountFailed: "Failed to delete account",

    // Privacy
    privacyPolicy: "Privacy Policy",

    // Auth
    signInTitle: "Sign in to your account",
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Password",
    confirmPassword: "Confirm Password",
    passwordPlaceholder: "Min. 8 characters",
    signingIn: "Signing in…",
    signInBtn: "Sign in",
    noAccount: "Don't have an account?",
    registerLink: "Register",
    createAccountTitle: "Create an account",
    creatingAccount: "Creating account…",
    createAccountBtn: "Create account",
    alreadyHaveAccount: "Already have an account?",
    signInLink: "Sign in",
    passwordMismatch: "Passwords do not match",
    passwordTooShort: "Password must be at least 8 characters",
    passwordNeedsUpper: "Password must contain at least one uppercase letter",
    passwordNeedsNumber: "Password must contain at least one number",
    pwRuleLength: "At least 8 characters",
    pwRuleUpper: "One uppercase letter",
    pwRuleNumber: "One number",
    pwStrengthWeak: "Weak",
    pwStrengthFair: "Fair",
    pwStrengthStrong: "Strong",
    serverError: "Could not connect to server",
    checkYourEmail: "Check your email",
    verificationSent: "We sent a verification link to",
    backToSignIn: "Back to sign in",

    // SMS verification
    verifyMethodLabel: "Verification method",
    verifyMethodEmail: "Email",
    verifyMethodSms: "SMS",
    phoneNumber: "Phone Number",
    phonePlaceholder: "+1 234 567 8900",
    sendCode: "Send Code",
    sendingCode: "Sending…",
    otpCode: "Verification Code",
    otpPlaceholder: "6-digit code",
    verifyAndCreate: "Verify & Create Account",
    verifyingCode: "Verifying…",
    checkYourPhone: "Check your phone",
    smsSent: "We sent a 6-digit code to",
    invalidOtp: "Invalid code. Please try again.",
    phoneAlreadyRegistered: "Phone number already registered",
    accountCreated: "Account created! You can now sign in.",
    phoneLabel: "Phone",
    loginWithPhone: "Sign in with phone",

    // Linked accounts
    linkedAccounts: "Linked Accounts",
    linkedEmail: "Email",
    linkedPhone: "Phone",
    notLinked: "Not linked",
    linkBtn: "Link",
    unlinkBtn: "Unlink",
    linkPhone: "Link Phone Number",
    linkEmail: "Link Email Address",
    linkPhoneSuccess: "Phone number linked successfully!",
    linkEmailSent: "Verification email sent. Click the link to confirm.",
    linkEmailSuccess: "Email linked successfully!",
    alreadyLinked: "Already linked to another account",
    backToLanding: "Back to home",
    forgotPassword: "Forgot password?",
    forgotPasswordTitle: "Reset your password",
    forgotPasswordDesc: "Enter your email and we'll send you a reset link.",
    sendResetLink: "Send reset link",
    sendingResetLink: "Sending…",
    resetEmailSent: "Reset link sent! Check your inbox.",
    resetPasswordTitle: "Choose a new password",
    newPassword: "New Password",
    resetPassword: "Reset Password",
    resettingPassword: "Resetting…",
    passwordSameAsOld: "Your new password cannot be the same as your old password",
    resetSuccess: "Password updated! You can now sign in.",

    // Summary
    income: "Income",
    expenses: "Expenses",
    balance: "Balance",

    // Form
    addTransaction: "Add Transaction",
    description: "Description",
    descriptionPlaceholder: "Description",
    amount: "Amount",
    amountPlaceholder: "Amount",
    incomeOption: "Income",
    expenseOption: "Expense",
    addBtn: "Add",

    // List
    transactions: "Transactions",
    allTypes: "All Types",
    allCategories: "All Categories",
    date: "Date",
    category: "Category",
    noTransactions: "No transactions found",
    plusIncome: "+ Income",
    minusExpense: "− Expense",
    searchPlaceholder: "Search description…",
    dateFrom: "From",
    dateTo: "To",
    clearFilters: "Clear",
    sortBy: "Sort",
    sortDateDesc: "Newest first",
    sortDateAsc: "Oldest first",
    sortAmountDesc: "Amount: high → low",
    sortAmountAsc: "Amount: low → high",

    // Delete modal
    deleteTransaction: "Delete Transaction",
    deleteConfirmLine1: "Are you sure you want to delete",
    cancelBtn: "Cancel",
    deleteBtn: "Delete",

    // Categories
    food: "Food",
    housing: "Housing",
    utilities: "Utilities",
    transport: "Transport",
    entertainment: "Entertainment",
    salary: "Salary",
    other: "Other",

    // Dashboard
    expenseBreakdown: "Expense Breakdown",
    recentActivity: "Recent Activity",
    noTransactionsDash: "Add your first transaction to see insights",

    // Analytics
    noTransactionsAnalytics: "Add transactions to see analytics",
    avgExpense: "Avg Expense",
    busiestDay: "Busiest Day",
    biggestExpense: "Biggest Expense",
    last30Days: "Last 30 Days",
    byCategory: "By Category",
    spendingTrends: "Spending Trends",
    thisMonth: "This Month",
    lastMonth: "Last Month",
    vsLastMonth: "vs last month",
    topMovers: "Top Category Changes",
    noTrendData: "Need at least one full month of data",

    // Budgets
    budgets: "Budgets",
    budgetsTab: "Budgets",
    budgetEmpty: "No budgets yet. Set monthly limits to track your spending.",
    budgetAdd: "Set Budget",
    budgetEdit: "Edit Budget",
    budgetMonthlyLimit: "Monthly Limit",
    budgetSpent: "Spent",
    budgetRemaining: "Remaining",
    budgetOverBy: "Over by",
    budgetOnTrack: "On track",
    budgetWarning: "Close to limit",
    budgetExceeded: "Over budget",
    budgetTotal: "Total Budget",
    budgetTotalSpent: "Total Spent",
    budgetDeleteTitle: "Remove Budget",
    budgetSelectCategory: "Category",

    // Export
    exportCsv: "Export CSV",
    exportEmpty: "Nothing to export",

    // Statement import
    importStatement: "Import Statement",
    importStatementDesc: "Upload any bank statement or a photo of your statement — AI will automatically extract all transactions.",
    importChooseFile: "Choose file",
    importDragDrop: "Drag & drop or click · PDF, JPG, PNG, WEBP",
    importDropNow: "Drop it…",
    importParsing: "Analyzing with AI…",
    importPreviewDesc: ({ count }) => `Found ${count} transactions. Review and confirm to import.`,
    importConfirm: ({ count }) => `Import ${count} transactions`,
    importImporting: "Importing…",
    importSuccess: ({ count }) => `Successfully imported ${count} transactions!`,
    importDoneBtn: "Done",
    importSave: "Save",
    importDeleteTx: "Remove",

    // Profile modal
    profileTitle: "Profile",
    displayName: "Display Name",
    displayNamePlaceholder: "Your name",
    currencyLabel: "Currency",
    saveBtn: "Save",
    savingBtn: "Saving…",

    // Landing
    landingTagline: "Free · No credit card needed",
    landingHeadline1: "Know where your",
    landingHeadline2: "money goes.",
    landingSubtitle: "Log income and expenses, track subscriptions, and import bank statements with AI. Understand your money at a glance.",
    landingGetStarted: "Create free account",
    landingSignIn: "Sign in",
    landingFeaturesLabel: "How it works",
    landingFeaturesTitle: "Everything you need,",
    landingFeaturesTitle2: "done right.",
    landingFeature1Title: "Add a transaction in seconds",
    landingFeature1Desc: "Type a description, enter the amount, pick a category. That's it. No setup, no forms, no friction.",
    landingFeature2Title: "See your spending at a glance",
    landingFeature2Desc: "Your dashboard shows your balance, recent activity, and a 30-day breakdown the moment you open the app.",
    landingFeature3Title: "Works in your currency",
    landingFeature3Desc: "Choose from USD, EUR, GBP, TRY, JPY, and more. Your currency preference sticks across every screen.",
    landingFeature4Title: "Upload anything — AI reads it",
    landingFeature4Desc: "Drop a bank statement PDF or snap a photo. AI extracts every transaction automatically, so you don't have to type a thing.",
    landingFeature5Title: "Never lose track of subscriptions",
    landingFeature5Desc: "See all your recurring services in one place. Monthly totals, next billing dates, and how much you've spent over time.",
    landingCtaLabel: "Ready?",
    landingCtaTitle: "Start tracking today.",
    landingCtaBtn: "Create free account",
    landingCtaSub: "Free forever · No credit card",
    landingBuiltWith: "Built with care.",
    landingNetBalance: "Net Balance",
    landingMonthlySalary: "Monthly salary",
    landingGrocery: "Grocery run",
    landingElectricity: "Electricity bill",

    // Subscriptions
    subscriptions: "Subscriptions",
    subMonthlyTotal: "Monthly Total",
    subActive: "active",
    subEmpty: "No subscriptions yet. Tap + to add one.",
    subAdd: "Add Subscription",
    subEdit: "Edit",
    subName: "Service Name",
    subBillingCycle: "Billing Cycle",
    subStartedAt: "Started",
    subNextBilling: "Next Billing",
    subNotes: "Notes",
    subNotesPlaceholder: "Optional notes",
    subToday: "Today",
    subOverdue: "Overdue",
    subDays: "days",
    subMonthsActive: "Months Active",
    subTotalSpent: "Total Spent",
    subStatusActive: "active",
    subStatusInactive: "inactive",
    subAddAsExpense: "Add as Expense",
    subExpenseAdded: "Added",
    subDeleteTitle: "Delete Subscription",
    subCycle_weekly: "Weekly",
    subCycle_monthly: "Monthly",
    subCycle_yearly: "Yearly",
    subCat_ai: "AI",
    subCat_entertainment: "Entertainment",
    subCat_music: "Music",
    subCat_finance: "Finance",
    subCat_productivity: "Productivity",
    subCat_health: "Health",
    subCat_news: "News",
    subCat_other: "Other",
  },

  tr: {
    appName: "Moneto",
    appSubtitle: "Gelir ve giderlerinizi takip edin",
    signOut: "Çıkış yap",
    dateLocale: "tr-TR",

    // Nav tabs
    navOverview: "Özet",
    navTransactions: "İşlemler",
    navAnalytics: "Analiz",
    navBudgets: "Bütçeler",
    navSubscriptions: "Abonelikler",

    // Profile
    usernameRequired: "Kullanıcı adı boş olamaz",

    // Danger zone
    dangerZone: "Tehlikeli Bölge",
    deleteAccountBtn: "Hesabı Sil",
    deleteAccountWarning: "Bu işlem hesabınızı, tüm işlemlerinizi, bütçelerinizi ve aboneliklerinizi kalıcı olarak siler. Geri alınamaz.",
    deleteAccountTypeLabel: "Onaylamak için DELETE yazın",
    deleteAccountTypeWrong: "Lütfen onaylamak için DELETE yazın",
    deleteAccountNeedPassword: "Şifre gerekli",
    deleteAccountConfirmBtn: "Kalıcı olarak sil",
    deletingAccount: "Siliniyor…",
    deleteAccountFailed: "Hesap silinemedi",

    // Privacy
    privacyPolicy: "Gizlilik Politikası",

    // Auth
    signInTitle: "Hesabınıza giriş yapın",
    email: "E-posta",
    emailPlaceholder: "siz@ornek.com",
    password: "Şifre",
    confirmPassword: "Şifreyi Onayla",
    passwordPlaceholder: "En az 8 karakter",
    signingIn: "Giriş yapılıyor…",
    signInBtn: "Giriş yap",
    noAccount: "Hesabınız yok mu?",
    registerLink: "Kayıt ol",
    createAccountTitle: "Hesap oluştur",
    creatingAccount: "Hesap oluşturuluyor…",
    createAccountBtn: "Hesap oluştur",
    alreadyHaveAccount: "Zaten hesabınız var mı?",
    signInLink: "Giriş yap",
    passwordMismatch: "Şifreler eşleşmiyor",
    passwordTooShort: "Şifre en az 8 karakter olmalı",
    passwordNeedsUpper: "Şifre en az bir büyük harf içermeli",
    passwordNeedsNumber: "Şifre en az bir rakam içermeli",
    pwRuleLength: "En az 8 karakter",
    pwRuleUpper: "Bir büyük harf",
    pwRuleNumber: "Bir rakam",
    pwStrengthWeak: "Zayıf",
    pwStrengthFair: "Orta",
    pwStrengthStrong: "Güçlü",
    serverError: "Sunucuya bağlanılamadı",
    checkYourEmail: "E-postanızı kontrol edin",
    verificationSent: "Doğrulama bağlantısı gönderildi:",
    backToSignIn: "Girişe dön",

    // SMS verification
    verifyMethodLabel: "Doğrulama yöntemi",
    verifyMethodEmail: "E-posta",
    verifyMethodSms: "SMS",
    phoneNumber: "Telefon Numarası",
    phonePlaceholder: "+90 555 123 4567",
    sendCode: "Kod Gönder",
    sendingCode: "Gönderiliyor…",
    otpCode: "Doğrulama Kodu",
    otpPlaceholder: "6 haneli kod",
    verifyAndCreate: "Doğrula ve Hesap Oluştur",
    verifyingCode: "Doğrulanıyor…",
    checkYourPhone: "Telefonunuzu kontrol edin",
    smsSent: "6 haneli kod gönderildi:",
    invalidOtp: "Geçersiz kod. Lütfen tekrar deneyin.",
    phoneAlreadyRegistered: "Bu telefon numarası zaten kayıtlı",
    accountCreated: "Hesap oluşturuldu! Şimdi giriş yapabilirsiniz.",
    phoneLabel: "Telefon",
    loginWithPhone: "Telefonla giriş yap",

    // Linked accounts
    linkedAccounts: "Bağlı Hesaplar",
    linkedEmail: "E-posta",
    linkedPhone: "Telefon",
    notLinked: "Bağlı değil",
    linkBtn: "Bağla",
    unlinkBtn: "Kaldır",
    linkPhone: "Telefon Numarası Bağla",
    linkEmail: "E-posta Adresi Bağla",
    linkPhoneSuccess: "Telefon numarası başarıyla bağlandı!",
    linkEmailSent: "Doğrulama e-postası gönderildi. Bağlantıya tıklayın.",
    linkEmailSuccess: "E-posta başarıyla bağlandı!",
    alreadyLinked: "Başka bir hesaba zaten bağlı",
    backToLanding: "Ana sayfaya dön",
    forgotPassword: "Şifremi unuttum?",
    forgotPasswordTitle: "Şifrenizi sıfırlayın",
    forgotPasswordDesc: "E-postanızı girin, size sıfırlama bağlantısı gönderelim.",
    sendResetLink: "Sıfırlama bağlantısı gönder",
    sendingResetLink: "Gönderiliyor…",
    resetEmailSent: "Sıfırlama bağlantısı gönderildi! Gelen kutunuzu kontrol edin.",
    resetPasswordTitle: "Yeni şifrenizi belirleyin",
    newPassword: "Yeni Şifre",
    resetPassword: "Şifreyi Sıfırla",
    resettingPassword: "Sıfırlanıyor…",
    passwordSameAsOld: "Yeni şifreniz eski şifrenizle aynı olamaz",
    resetSuccess: "Şifre güncellendi! Artık giriş yapabilirsiniz.",

    // Summary
    income: "Gelir",
    expenses: "Giderler",
    balance: "Bakiye",

    // Form
    addTransaction: "İşlem Ekle",
    description: "Açıklama",
    descriptionPlaceholder: "Açıklama",
    amount: "Tutar",
    amountPlaceholder: "Tutar",
    incomeOption: "Gelir",
    expenseOption: "Gider",
    addBtn: "Ekle",

    // List
    transactions: "İşlemler",
    allTypes: "Tüm Türler",
    allCategories: "Tüm Kategoriler",
    date: "Tarih",
    category: "Kategori",
    noTransactions: "İşlem bulunamadı",
    plusIncome: "+ Gelir",
    minusExpense: "− Gider",
    searchPlaceholder: "Açıklama ara…",
    dateFrom: "Başlangıç",
    dateTo: "Bitiş",
    clearFilters: "Temizle",
    sortBy: "Sıralama",
    sortDateDesc: "En yeni önce",
    sortDateAsc: "En eski önce",
    sortAmountDesc: "Tutar: yüksek → düşük",
    sortAmountAsc: "Tutar: düşük → yüksek",

    // Delete modal
    deleteTransaction: "İşlemi Sil",
    deleteConfirmLine1: "Silmek istediğinizden emin misiniz?",
    cancelBtn: "İptal",
    deleteBtn: "Sil",

    // Categories
    food: "Yemek",
    housing: "Konut",
    utilities: "Faturalar",
    transport: "Ulaşım",
    entertainment: "Eğlence",
    salary: "Maaş",
    other: "Diğer",

    // Dashboard
    expenseBreakdown: "Gider Dağılımı",
    recentActivity: "Son Hareketler",
    noTransactionsDash: "Analiz görmek için ilk işleminizi ekleyin",

    // Analytics
    noTransactionsAnalytics: "Analiz görmek için işlem ekleyin",
    avgExpense: "Ort. Gider",
    busiestDay: "En Yoğun Gün",
    biggestExpense: "En Büyük Gider",
    last30Days: "Son 30 Gün",
    byCategory: "Kategoriye Göre",
    spendingTrends: "Harcama Trendi",
    thisMonth: "Bu Ay",
    lastMonth: "Geçen Ay",
    vsLastMonth: "geçen aya göre",
    topMovers: "Öne Çıkan Değişimler",
    noTrendData: "En az bir tam aylık veri gerekli",

    // Budgets
    budgets: "Bütçeler",
    budgetsTab: "Bütçe",
    budgetEmpty: "Henüz bütçe yok. Harcamanızı takip etmek için aylık limit belirleyin.",
    budgetAdd: "Bütçe Belirle",
    budgetEdit: "Bütçeyi Düzenle",
    budgetMonthlyLimit: "Aylık Limit",
    budgetSpent: "Harcanan",
    budgetRemaining: "Kalan",
    budgetOverBy: "Aşım",
    budgetOnTrack: "Yolunda",
    budgetWarning: "Limite yakın",
    budgetExceeded: "Bütçe aşıldı",
    budgetTotal: "Toplam Bütçe",
    budgetTotalSpent: "Toplam Harcama",
    budgetDeleteTitle: "Bütçeyi Kaldır",
    budgetSelectCategory: "Kategori",

    // Export
    exportCsv: "CSV İndir",
    exportEmpty: "Dışa aktarılacak işlem yok",

    // Statement import
    importStatement: "Ekstre İçe Aktar",
    importStatementDesc: "Herhangi bir banka ekstresini veya fotoğrafını yükleyin — yapay zeka işlemleri otomatik çıkarsın.",
    importChooseFile: "Dosya seç",
    importDragDrop: "Sürükleyip bırakın veya tıklayın · PDF, JPG, PNG, WEBP",
    importDropNow: "Bırakın…",
    importParsing: "Yapay zeka analiz ediyor…",
    importPreviewDesc: ({ count }) => `${count} işlem bulundu. İnceleyip onaylayın.`,
    importConfirm: ({ count }) => `${count} işlemi içe aktar`,
    importImporting: "Aktarılıyor…",
    importSuccess: ({ count }) => `${count} işlem başarıyla içe aktarıldı!`,
    importDoneBtn: "Tamam",
    importSave: "Kaydet",
    importDeleteTx: "Kaldır",

    // Profile modal
    profileTitle: "Profil",
    displayName: "Görünen Ad",
    displayNamePlaceholder: "Adınız",
    currencyLabel: "Para Birimi",
    saveBtn: "Kaydet",
    savingBtn: "Kaydediliyor…",

    // Landing
    landingTagline: "Ücretsiz · Kredi kartı gerekmez",
    landingHeadline1: "Paranızın nereye",
    landingHeadline2: "gittiğini bilin.",
    landingSubtitle: "Gelir ve gider ekleyin, abonelikleri takip edin, banka ekstrelerinizi yapay zeka ile içe aktarın. Paranızı tek bakışta anlayın.",
    landingGetStarted: "Ücretsiz hesap oluştur",
    landingSignIn: "Giriş yap",
    landingFeaturesLabel: "Nasıl çalışır",
    landingFeaturesTitle: "İhtiyacınız olan her şey,",
    landingFeaturesTitle2: "doğru yapılmış.",
    landingFeature1Title: "Saniyeler içinde işlem ekleyin",
    landingFeature1Desc: "Açıklama yazın, tutarı girin, kategori seçin. Hepsi bu. Kurulum yok, form yok, zorluk yok.",
    landingFeature2Title: "Harcamalarınıza tek bakışta hakim olun",
    landingFeature2Desc: "Kontrol paneliniz uygulamayı açar açmaz bakiyenizi, son işlemleri ve 30 günlük dökümü gösterir.",
    landingFeature3Title: "Kendi para biriminizde çalışır",
    landingFeature3Desc: "USD, EUR, GBP, TRY, JPY ve daha fazlası arasından seçin. Tercihleriniz her ekranda senkronize olur.",
    landingFeature4Title: "Dosya yükle — yapay zeka okusun",
    landingFeature4Desc: "Banka ekstresi PDF'i veya fotoğraf yükleyin. Yapay zeka tüm işlemleri otomatik çıkarır, siz hiçbir şey yazmak zorunda kalmazsınız.",
    landingFeature5Title: "Aboneliklerinizi kaçırmayın",
    landingFeature5Desc: "Tüm tekrar eden hizmetlerinizi tek bir yerde görün. Aylık toplam, sonraki fatura tarihleri ve zaman içinde ne kadar harcadığınız.",
    landingCtaLabel: "Hazır mısınız?",
    landingCtaTitle: "Bugün takibe başlayın.",
    landingCtaBtn: "Ücretsiz hesap oluştur",
    landingCtaSub: "Sonsuza kadar ücretsiz · Kredi kartı gerekmez",
    landingBuiltWith: "Özenle yapıldı.",
    landingNetBalance: "Net Bakiye",
    landingMonthlySalary: "Aylık maaş",
    landingGrocery: "Market alışverişi",
    landingElectricity: "Elektrik faturası",

    // Subscriptions
    subscriptions: "Abonelikler",
    subMonthlyTotal: "Aylık Toplam",
    subActive: "aktif",
    subEmpty: "Henüz abonelik yok. + ile ekleyin.",
    subAdd: "Abonelik Ekle",
    subEdit: "Düzenle",
    subName: "Hizmet Adı",
    subBillingCycle: "Fatura Döngüsü",
    subStartedAt: "Başladı",
    subNextBilling: "Sonraki Fatura",
    subNotes: "Notlar",
    subNotesPlaceholder: "İsteğe bağlı not",
    subToday: "Bugün",
    subOverdue: "Gecikmiş",
    subDays: "gün",
    subMonthsActive: "Aktif Ay",
    subTotalSpent: "Toplam Harcama",
    subStatusActive: "aktif",
    subStatusInactive: "pasif",
    subAddAsExpense: "Gider Olarak Ekle",
    subExpenseAdded: "Eklendi",
    subDeleteTitle: "Aboneliği Sil",
    subCycle_weekly: "Haftalık",
    subCycle_monthly: "Aylık",
    subCycle_yearly: "Yıllık",
    subCat_ai: "Yapay Zeka",
    subCat_entertainment: "Eğlence",
    subCat_music: "Müzik",
    subCat_finance: "Finans",
    subCat_productivity: "Üretkenlik",
    subCat_health: "Sağlık",
    subCat_news: "Haber",
    subCat_other: "Diğer",
  },
};

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");

  const t = (key, params) => {
    const val = translations[lang][key] ?? key;
    return typeof val === "function" ? val(params) : val;
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return lang === "tr" ? `${dd}/${mm}/${yyyy}` : `${mm}/${dd}/${yyyy}`;
  };

  const toggleLang = () => {
    const next = lang === "en" ? "tr" : "en";
    localStorage.setItem("lang", next);
    setLang(next);
  };

  return (
    <LangContext.Provider value={{ lang, t, toggleLang, formatDate }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
