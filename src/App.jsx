import { useState, useEffect, useCallback } from "react";
import "./App.css";
import Dashboard from "./Dashboard";
import Analytics from "./Analytics";
import TransactionForm from "./TransactionForm";
import TransactionList from "./TransactionList";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import ForgotPasswordPage from "./ForgotPasswordPage";
import ResetPasswordPage from "./ResetPasswordPage";
import ProfileModal from "./ProfileModal";
import LandingPage from "./LandingPage";
import PrivacyPage from "./PrivacyPage";
import TermsPage from "./TermsPage";
import { CurrencyProvider } from "./currency.jsx";
import { CategoriesProvider } from "./categories.jsx";
import { useLang } from "./i18n.jsx";
import Subscriptions from "./Subscriptions";
import Budgets from "./Budgets";
import Goals from "./Goals";

const API = import.meta.env.VITE_API_URL;

// ── Nav icons ──────────────────────────────────────────────
function IconDashboard({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function IconTransactions({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}
function IconAnalytics({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6"  y1="20" x2="6"  y2="14" />
    </svg>
  );
}
function IconSubscriptions({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
function IconBudgets({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function IconGoals({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  );
}

const TABS = [
  { id: "dashboard",     labelKey: "navOverview",       Icon: IconDashboard },
  { id: "transactions",  labelKey: "navTransactions",   Icon: IconTransactions },
  { id: "analytics",     labelKey: "navAnalytics",      Icon: IconAnalytics },
  { id: "budgets",       labelKey: "navBudgets",        Icon: IconBudgets },
  { id: "goals",         labelKey: "navGoals",          Icon: IconGoals },
  { id: "subscriptions", labelKey: "navSubscriptions",  Icon: IconSubscriptions },
];

function authFetch(url, opts = {}) {
  const token = localStorage.getItem("auth_token");
  return fetch(url, {
    ...opts,
    credentials: "include",
    headers: {
      ...opts.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

function App() {
  const { t, lang, toggleLang } = useLang();
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((msg, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type, exiting: false }]);
    setTimeout(() => {
      setToasts(p => p.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 220);
    }, 2600);
  }, []);
  // false = still checking auth on mount; true = check complete
  const [authChecked, setAuthChecked] = useState(false);
  const [resetToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("reset_token") || null;
  });
  const [authPage, setAuthPage] = useState(() => {
    if (window.location.pathname === "/privacy") return "privacy";
    if (window.location.pathname === "/terms") return "terms";
    if (new URLSearchParams(window.location.search).get("reset_token")) return "reset-password";
    return "landing";
  });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showProfile, setShowProfile] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved !== null ? saved === "dark" : true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // On mount: restore session from localStorage token
  useEffect(() => {
    if (resetToken) { setAuthChecked(true); return; }
    if (!localStorage.getItem("auth_token")) { setAuthChecked(true); return; }
    authFetch(`${API}/auth/me`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.id) {
          setCurrentUser({
            id: data.id,
            email: data.email || null,
            phone: data.phone || null,
            username: data.username || null,
            currency: data.currency || "USD",
            custom_categories: data.custom_categories || [],
          });
        }
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const refreshTransactions = () => {
    authFetch(`${API}/transactions`)
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setTransactions(data))
      .catch((err) => console.log(err));
  };

  const refreshBudgets = () => {
    authFetch(`${API}/budgets`)
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setBudgets(data))
      .catch(() => {});
  };

  // Fetch transactions whenever the user logs in
  useEffect(() => {
    if (!currentUser) return;
    refreshTransactions();
    refreshBudgets();
  }, [currentUser?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleAuthSuccess = (user, token) => {
    if (token) localStorage.setItem("auth_token", token);
    setCurrentUser(user);
  };

  const handleProfileSave = (updated) => {
    setCurrentUser((prev) => ({
      ...prev,
      username: updated.username,
      currency: updated.currency,
      email:    updated.email  ?? prev.email,
      phone:    updated.phone  ?? prev.phone,
      custom_categories: updated.custom_categories ?? prev.custom_categories,
    }));
    setShowProfile(false);
  };

  const handleSaveCategories = async (cats) => {
    try {
      const res = await authFetch(`${API}/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_categories: cats }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(prev => ({ ...prev, custom_categories: data.custom_categories || [] }));
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("custom_categories save failed:", res.status, err);
      }
    } catch (e) {
      console.error("custom_categories save error:", e);
    }
  };

  const handleLogout = async () => {
    try {
      await authFetch(`${API}/auth/logout`, { method: "POST" });
    } catch {}
    localStorage.removeItem("auth_token");
    setCurrentUser(null);
    setTransactions([]);
    setAuthPage("landing");
  };

  const handleAdd = async (transaction) => {
    try {
      const res = await authFetch(`${API}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transaction),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.id) return;
      setTransactions((prev) => {
        const next = [data, ...prev];
        // Budget check for expense transactions
        if (data.type === "expense" && budgets.length > 0) {
          const budget = budgets.find(b => b.category === data.category);
          if (budget) {
            const ym = new Date().toISOString().slice(0, 7);
            const spent = next
              .filter(tx => tx.type === "expense" && tx.category === data.category && (tx.date || "").slice(0, 7) === ym)
              .reduce((s, tx) => s + (parseFloat(tx.amount) || 0), 0);
            const pct = Math.round((spent / parseFloat(budget.amount)) * 100);
            const cat = t(data.category);
            if (pct >= 100) showToast(t("budgetExceeded")({ cat, pct }), "warning");
            else if (pct >= 80) showToast(t("budgetWarning")({ cat, pct }), "warning");
          }
        }
        return next;
      });
      showToast(t("toastTxAdded"));
    } catch (err) {
      console.log("POST error:", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await authFetch(`${API}/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setTransactions((prev) => prev.filter((tx) => tx.id !== id));
      showToast(t("toastTxDeleted"));
    } catch (err) {
      console.log("DELETE error:", err);
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      const res = await authFetch(`${API}/transactions/bulk`, {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) return;
      setTransactions((prev) => prev.filter((tx) => !ids.includes(tx.id)));
    } catch (err) {
      console.log("BULK DELETE error:", err);
    }
  };

  const handleEdit = async (id, updated) => {
    try {
      const res = await authFetch(`${API}/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.id) return;
      setTransactions((prev) => prev.map((tx) => (tx.id === id ? data : tx)));
      showToast(t("toastTxUpdated"));
    } catch (err) {
      console.log("PUT error:", err);
    }
  };

  // ── Loading state while cookie auth check runs ──
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  // ── Privacy policy (public, no auth required) ──
  if (authPage === "privacy") {
    return (
      <PrivacyPage
        isDark={isDark}
        toggleDark={() => setIsDark((d) => !d)}
        onBack={() => {
          window.history.replaceState(null, "", "/");
          setAuthPage("landing");
        }}
      />
    );
  }

  if (authPage === "terms") {
    return (
      <TermsPage
        isDark={isDark}
        toggleDark={() => setIsDark((d) => !d)}
        onBack={() => {
          window.history.replaceState(null, "", "/");
          setAuthPage("landing");
        }}
      />
    );
  }

  // ── Auth screens ──
  if (!currentUser) {
    if (authPage === "landing") {
      return (
        <LandingPage
          onGetStarted={() => setAuthPage("register")}
          onSignIn={() => setAuthPage("login")}
          isDark={isDark}
          toggleDark={() => setIsDark((d) => !d)}
        />
      );
    }
    return (
      <div className="min-h-screen login-bg transition-colors duration-300">
        {authPage === "reset-password" ? (
          <ResetPasswordPage resetToken={resetToken} onBack={() => setAuthPage("landing")} />
        ) : authPage === "forgot-password" ? (
          <ForgotPasswordPage onBack={() => setAuthPage("login")} />
        ) : authPage === "login" ? (
          <LoginPage
            onSuccess={handleAuthSuccess}
            onSwitch={() => setAuthPage("register")}
            onForgotPassword={() => setAuthPage("forgot-password")}
            onBack={() => setAuthPage("landing")}
            isDark={isDark}
            toggleDark={() => setIsDark((d) => !d)}
          />
        ) : (
          <RegisterPage
            onSwitch={() => setAuthPage("login")}
            onBack={() => setAuthPage("landing")}
            isDark={isDark}
            toggleDark={() => setIsDark((d) => !d)}
            onShowTerms={() => setAuthPage("terms")}
            onShowPrivacy={() => setAuthPage("privacy")}
          />
        )}
      </div>
    );
  }

  // ── Main app ──
  return (
    <CurrencyProvider code={currentUser?.currency || "USD"}>
    <CategoriesProvider initialCats={currentUser?.custom_categories || []} onSave={handleSaveCategories}>
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: "var(--bg)" }}>
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-24 sm:pb-6">

        {/* ── Header ── */}
        <header className="mb-6 anim-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/birik.png" className="birik-logo shrink-0" width="36" height="36" style={{ borderRadius: 10 }} alt="Birik" />
              <div className="min-w-0">
                <h1 className="fin-serif text-xl sm:text-2xl leading-tight truncate" style={{ color: "var(--text-1)" }}>
                  {t("appName")}
                </h1>
                {(currentUser?.username || currentUser?.email) && (
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-3)" }}>
                    {currentUser.username || currentUser.email}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button onClick={() => setShowProfile(true)} className="fin-icon-btn" title={t("navProfile")}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
              <button onClick={toggleLang} className="fin-icon-btn" title="Switch language">
                <span className="text-xs font-semibold">{lang === "en" ? "TR" : "EN"}</span>
              </button>
              <button onClick={() => setIsDark((d) => !d)} className="fin-icon-btn" title="Toggle theme">
                {isDark ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>
              <button onClick={handleLogout} className="fin-icon-btn" title={t("signOut")}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* ── Desktop tab bar ── */}
        <div className="hidden sm:flex gap-1 mb-6 p-1 rounded-xl anim-2" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
          {TABS.map(({ id, labelKey, Icon: TabIcon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
                style={{
                  backgroundColor: isActive ? "var(--bg)" : "transparent",
                  color: isActive ? "var(--brand)" : "var(--text-3)",
                  border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                  boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                <TabIcon active={isActive} />
                {t(labelKey)}
              </button>
            );
          })}
        </div>

        {/* ── Page content ── */}
        {activeTab === "dashboard" && <Dashboard transactions={transactions} onNavigate={setActiveTab} />}

        {activeTab === "transactions" && (
          <div className="anim-1 lg:grid lg:grid-cols-[340px_1fr] lg:gap-6 lg:items-start">
            <div className="lg:sticky lg:top-6">
              <TransactionForm onAdd={handleAdd} onRefresh={refreshTransactions} />
            </div>
            <TransactionList transactions={transactions} onDelete={handleDelete} onEdit={handleEdit} onBulkDelete={handleBulkDelete} />
          </div>
        )}

        {activeTab === "analytics" && <Analytics transactions={transactions} />}

        {activeTab === "budgets" && <Budgets transactions={transactions} showToast={showToast} onBudgetChange={refreshBudgets} />}

        {activeTab === "goals" && <Goals showToast={showToast} />}

        {activeTab === "subscriptions" && <Subscriptions onExpenseAdded={refreshTransactions} />}

      </div>

      {/* ── Footer ── */}
      <footer className="hidden sm:flex items-center justify-between max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 text-xs mt-auto" style={{ borderTop: "1px solid var(--border)", color: "var(--text-3)" }}>
        <span>© {new Date().getFullYear()} Birik</span>
        <div className="flex items-center gap-4">
          <button onClick={() => setAuthPage("terms")} className="hover:opacity-70 transition-opacity">{t("termsOfService")}</button>
          <span style={{ color: "var(--border-2)" }}>·</span>
          <button onClick={() => setAuthPage("privacy")} className="hover:opacity-70 transition-opacity">{t("privacyPolicy")}</button>
          <span style={{ color: "var(--border-2)" }}>·</span>
          <span>v1.0</span>
        </div>
      </footer>

      {showProfile && (
        <ProfileModal
          user={currentUser}
          onClose={() => setShowProfile(false)}
          onSave={handleProfileSave}
          onDeleted={() => { setShowProfile(false); handleLogout(); }}
        />
      )}

      {/* ── Mobile bottom nav ── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center px-1 py-2"
        style={{
          backgroundColor: "var(--surface)",
          borderTop: "1px solid var(--border)",
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        }}
      >
        {TABS.map(({ id, labelKey, Icon: NavIcon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 flex flex-col items-center gap-1 py-1 cursor-pointer transition-all"
              style={{ color: isActive ? "var(--brand)" : "var(--text-3)" }}
            >
              <NavIcon active={isActive} />
              <span className="text-[10px] font-medium">{t(labelKey)}</span>
              {isActive && (
                <div
                  className="absolute bottom-0 w-6 h-0.5 rounded-full"
                  style={{ backgroundColor: "var(--brand)" }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Toast container ── */}
      {toasts.length > 0 && (
        <div className="toast-container fixed sm:bottom-6 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`toast-item${toast.exiting ? " exiting" : ""} flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg pointer-events-auto`}
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-1)",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <span style={{ color: toast.type === "error" ? "var(--red)" : toast.type === "warning" ? "#F59E0B" : "var(--green)" }}>
                {toast.type === "error" ? "✕" : toast.type === "warning" ? "⚠" : "✓"}
              </span>
              {toast.msg}
            </div>
          ))}
        </div>
      )}
    </div>
    </CategoriesProvider>
    </CurrencyProvider>
  );
}

export default App;
