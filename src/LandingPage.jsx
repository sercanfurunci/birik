import { useLang } from "./i18n.jsx";

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

const MOCK_TX = [
  { label: "Monthly salary",    income: true,  amt: "+$3,500", dot: "#10B981" },
  { label: "Grocery run",       income: false, amt: "−$124",   dot: "#F97316" },
  { label: "Electricity bill",  income: false, amt: "−$89",    dot: "#EAB308" },
  { label: "Netflix",           income: false, amt: "−$15.99", dot: "#EC4899" },
];

const CATEGORIES = [
  { label: "Food",          pct: 38, color: "#F97316" },
  { label: "Housing",       pct: 28, color: "#3B82F6" },
  { label: "Transport",     pct: 18, color: "#06B6D4" },
  { label: "Entertainment", pct: 10, color: "#EC4899" },
  { label: "Utilities",     pct: 6,  color: "#EAB308" },
];

function AppPreview() {
  return (
    <div className="fin-card rounded-2xl overflow-hidden" style={{ maxWidth: 320, width: "100%" }}>
      {/* Fake title bar */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="fin-serif text-sm" style={{ color: "var(--text-1)" }}>Finance Tracker</span>
        <div className="flex gap-1">
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--border)" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--border)" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--border)" }} />
        </div>
      </div>

      {/* Balance */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="fin-label mb-1">Net Balance</p>
        <p className="fin-mono font-bold" style={{ fontSize: "1.6rem", color: "var(--text-1)", letterSpacing: "-0.03em" }}>
          $2,271.01
        </p>
        <div className="flex gap-3 mt-2">
          <div>
            <p className="fin-label" style={{ fontSize: 9 }}>Income</p>
            <p className="fin-mono text-xs font-semibold" style={{ color: "var(--green)" }}>+$3,500</p>
          </div>
          <div>
            <p className="fin-label" style={{ fontSize: 9 }}>Expenses</p>
            <p className="fin-mono text-xs font-semibold" style={{ color: "var(--red)" }}>−$1,228.99</p>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="px-4 pt-3 pb-2">
        <p className="fin-label mb-2.5">Recent</p>
        <div className="space-y-2.5">
          {MOCK_TX.map((tx) => (
            <div key={tx.label} className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center" style={{ backgroundColor: tx.dot + "22" }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tx.dot }} />
              </div>
              <span className="text-xs flex-1 truncate" style={{ color: "var(--text-2)" }}>{tx.label}</span>
              <span className="fin-mono text-xs font-semibold" style={{ color: tx.income ? "var(--green)" : "var(--red)" }}>{tx.amt}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="px-4 pt-3 pb-4" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="fin-label mb-2.5">By Category</p>
        <div className="space-y-2">
          {CATEGORIES.map((c) => (
            <div key={c.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-xs" style={{ color: "var(--text-2)" }}>{c.label}</span>
                </div>
                <span className="fin-mono text-xs" style={{ color: "var(--text-3)" }}>{c.pct}%</span>
              </div>
              <div className="rounded-full overflow-hidden" style={{ height: 3, backgroundColor: "var(--surface-2)" }}>
                <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LandingPage({ onGetStarted, onSignIn, isDark, toggleDark }) {
  const { t, lang, toggleLang } = useLang();

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh" }}>

      {/* ── Nav ── */}
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="moneto-logo shrink-0" width="28" height="28" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 7 }}>
              <rect width="128" height="128" rx="28" fill="#111111"/>
              <path d="M32 88V40L64 72L96 40V88" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="fin-serif text-base" style={{ color: "var(--text-1)" }}>{t("appName")}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleLang} className="fin-icon-btn" title="Switch language">
              <span className="text-xs font-semibold">{lang === "en" ? "TR" : "EN"}</span>
            </button>
            <button onClick={toggleDark} className="fin-icon-btn" title="Toggle theme">
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              onClick={onSignIn}
              className="fin-icon-btn text-sm font-medium"
              style={{ width: "auto", paddingLeft: 14, paddingRight: 14 }}
            >
              {t("landingSignIn")}
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
        <div className="flex flex-col lg:flex-row items-start gap-14">

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="fin-label mb-5">{t("landingTagline")}</p>
            <h1 className="fin-serif mb-6" style={{
              color: "var(--text-1)",
              fontSize: "clamp(2.2rem, 6vw, 3.6rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}>
              {t("landingHeadline1")}<br />
              <span style={{ color: "var(--brand)" }}>{t("landingHeadline2")}</span>
            </h1>
            <p style={{
              color: "var(--text-2)",
              fontSize: "1.05rem",
              lineHeight: 1.6,
              maxWidth: 400,
              marginBottom: "2rem",
            }}>
              {t("landingSubtitle")}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onGetStarted}
                className="fin-btn-primary"
                style={{ padding: "11px 24px", fontSize: 14 }}
              >
                {t("landingGetStarted")}
              </button>
              <button
                onClick={onSignIn}
                className="text-sm font-medium cursor-pointer transition-opacity hover:opacity-70"
                style={{ color: "var(--text-2)", background: "none", border: "none", padding: "11px 0" }}
              >
                {t("landingSignIn")} →
              </button>
            </div>
          </div>

          {/* App preview */}
          <div className="w-full lg:w-auto lg:shrink-0">
            <AppPreview />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--surface)" }}>
        <div className="max-w-4xl mx-auto px-6 py-16 sm:py-20">
          <p className="fin-label mb-3">{t("landingFeaturesLabel")}</p>
          <h2 className="fin-serif mb-12" style={{
            color: "var(--text-1)",
            fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}>
            {t("landingFeaturesTitle")}<br />{t("landingFeaturesTitle2")}
          </h2>

          <div className="grid sm:grid-cols-2 gap-8">
            {[
              { n: "1", title: t("landingFeature1Title"), desc: t("landingFeature1Desc"), icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              )},
              { n: "2", title: t("landingFeature2Title"), desc: t("landingFeature2Desc"), icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              )},
              { n: "3", title: t("landingFeature3Title"), desc: t("landingFeature3Desc"), icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20A14.5 14.5 0 0 0 12 2"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
              )},
              { n: "4", title: t("landingFeature4Title"), desc: t("landingFeature4Desc"), icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M20 2v6h-6"/><path d="M14 10l6-8"/></svg>
              )},
              { n: "5", title: t("landingFeature5Title"), desc: t("landingFeature5Desc"), icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              )},
            ].map(({ n, title, desc, icon }) => (
              <div key={n} className="flex gap-4 items-start">
                <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{
                  backgroundColor: "var(--brand-dim)",
                  color: "var(--brand)",
                }}>
                  {icon}
                </div>
                <div>
                  <p className="font-semibold mb-1.5" style={{ color: "var(--text-1)", fontSize: "0.95rem" }}>{title}</p>
                  <p style={{ color: "var(--text-2)", fontSize: "0.875rem", lineHeight: 1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-4xl mx-auto px-6 py-16 sm:py-20">
        <p className="fin-label mb-4">{t("landingCtaLabel")}</p>
        <h2 className="fin-serif mb-6" style={{
          color: "var(--text-1)",
          fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
          letterSpacing: "-0.02em",
        }}>
          {t("landingCtaTitle")}
        </h2>
        <button
          onClick={onGetStarted}
          className="fin-btn-primary"
          style={{ padding: "12px 28px", fontSize: 14 }}
        >
          {t("landingCtaBtn")}
        </button>
        <p className="text-xs mt-4" style={{ color: "var(--text-3)" }}>{t("landingCtaSub")}</p>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 5 }}>
              <rect width="128" height="128" rx="28" fill="#111111"/>
              <path d="M32 88V40L64 72L96 40V88" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="fin-serif text-sm" style={{ color: "var(--text-2)" }}>{t("appName")}</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <a
              href="/privacy"
              className="text-xs font-medium hover:underline cursor-pointer"
              style={{ color: "var(--text-2)" }}
            >
              {t("privacyPolicy")}
            </a>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>
              © {new Date().getFullYear()} {t("appName")}. {t("landingBuiltWith")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
