import { useLang } from "./i18n.jsx";

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function AppPreview({ sym, t }) {
  const mockTx = [
    { label: t("landingMonthlySalary"), income: true,  amt: `+${sym}3,500`, dot: "#37C978" },
    { label: t("landingGrocery"),       income: false, amt: `−${sym}124`,   dot: "#F5C451" },
    { label: t("landingElectricity"),   income: false, amt: `−${sym}89`,    dot: "#FB923C" },
    { label: "Netflix",                 income: false, amt: `−${sym}15.99`, dot: "#E04F4F" },
  ];
  const cats = [
    { label: t("food"),          pct: 38, color: "#F5C451" },
    { label: t("entertainment"), pct: 22, color: "#E04F4F" },
    { label: t("transport"),     pct: 18, color: "#38BDF8" },
    { label: t("housing"),       pct: 14, color: "#4B82F1" },
    { label: t("utilities"),     pct: 8,  color: "#FB923C" },
  ];

  return (
    <div className="fin-card rounded-2xl overflow-hidden" style={{ maxWidth: 300, width: "100%" }}>
      {/* Title bar */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="fin-serif text-sm" style={{ color: "var(--text-1)" }}>Birik</span>
        <div className="flex gap-1">
          {["#FF5F57","#FEBC2E","#28C840"].map(c => (
            <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: c, opacity: 0.7 }} />
          ))}
        </div>
      </div>

      {/* Balance */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="fin-label mb-1">{t("landingNetBalance")}</p>
        <p className="fin-mono font-bold" style={{ fontSize: "1.5rem", color: "var(--text-1)", letterSpacing: "-0.03em" }}>
          {sym}2,271.01
        </p>
        <div className="flex gap-4 mt-2">
          <div>
            <p className="fin-label" style={{ fontSize: 9 }}>{t("income")}</p>
            <p className="fin-mono text-xs font-semibold" style={{ color: "var(--green)" }}>+{sym}3,500</p>
          </div>
          <div>
            <p className="fin-label" style={{ fontSize: 9 }}>{t("expenses")}</p>
            <p className="fin-mono text-xs font-semibold" style={{ color: "var(--red)" }}>−{sym}1,228.99</p>
          </div>
        </div>
      </div>

      {/* Recent */}
      <div className="px-4 pt-3 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="fin-label mb-2.5">{t("recentActivity")}</p>
        <div className="space-y-2.5">
          {mockTx.map(tx => (
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
      <div className="px-4 pt-3 pb-4">
        <p className="fin-label mb-2.5">{t("expenseBreakdown")}</p>
        <div className="space-y-2">
          {cats.map(c => (
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

const FEATURES = (t) => [
  {
    title: t("landingFeature1Title"),
    desc: t("landingFeature1Desc"),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
  },
  {
    title: t("landingFeature2Title"),
    desc: t("landingFeature2Desc"),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    title: t("landingFeature3Title"),
    desc: t("landingFeature3Desc"),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20A14.5 14.5 0 0 0 12 2"/><line x1="2" y1="12" x2="22" y2="12"/>
      </svg>
    ),
  },
  {
    title: t("landingFeature4Title"),
    desc: t("landingFeature4Desc"),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
      </svg>
    ),
  },
  {
    title: t("landingFeature5Title"),
    desc: t("landingFeature5Desc"),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
  {
    title: t("landingFeature6Title"),
    desc: t("landingFeature6Desc"),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
      </svg>
    ),
  },
];

function LandingPage({ onGetStarted, onSignIn, isDark, toggleDark }) {
  const { t, lang, toggleLang } = useLang();
  const sym = lang === "tr" ? "₺" : "$";

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh" }}>

      {/* ── Nav ── */}
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/birik.png" className="birik-logo shrink-0" width="34" height="34" style={{ borderRadius: 9 }} alt="Birik" />
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
              style={{ width: "auto", paddingLeft: 14, paddingRight: 14, minWidth: 88 }}
            >
              {t("landingSignIn")}
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-5xl mx-auto px-6 py-16 sm:py-24">
        <div className="flex flex-col lg:flex-row items-start gap-14">
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
            <p style={{ color: "var(--text-2)", fontSize: "1.05rem", lineHeight: 1.65, maxWidth: 400, marginBottom: "2rem" }}>
              {t("landingSubtitle")}
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={onGetStarted} className="fin-btn-primary" style={{ padding: "11px 24px", fontSize: 14 }}>
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
          <div className="w-full lg:w-auto lg:shrink-0">
            <AppPreview sym={sym} t={t} />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--surface)" }}>
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
          <p className="fin-label mb-3">{t("landingFeaturesLabel")}</p>
          <h2 className="fin-serif mb-12" style={{
            color: "var(--text-1)",
            fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}>
            {t("landingFeaturesTitle")}<br />{t("landingFeaturesTitle2")}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES(t).map(({ title, desc, icon }) => (
              <div key={title} className="flex gap-4 items-start">
                <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--brand-dim)", color: "var(--brand)" }}>
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
      <section className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
        <p className="fin-label mb-4">{t("landingCtaLabel")}</p>
        <h2 className="fin-serif mb-6" style={{
          color: "var(--text-1)",
          fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
          letterSpacing: "-0.02em",
        }}>
          {t("landingCtaTitle")}
        </h2>
        <button onClick={onGetStarted} className="fin-btn-primary" style={{ padding: "12px 28px", fontSize: 14 }}>
          {t("landingCtaBtn")}
        </button>
        <p className="text-xs mt-4" style={{ color: "var(--text-3)" }}>{t("landingCtaSub")}</p>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src="/birik.png" width="20" height="20" style={{ borderRadius: 5 }} alt="Birik" />
            <span className="fin-serif text-sm" style={{ color: "var(--text-2)" }}>{t("appName")}</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <a href="/terms" className="text-xs font-medium hover:underline cursor-pointer" style={{ color: "var(--text-2)" }}>
              {t("termsOfService")}
            </a>
            <span style={{ color: "var(--border-2)" }}>·</span>
            <a href="/privacy" className="text-xs font-medium hover:underline cursor-pointer" style={{ color: "var(--text-2)" }}>
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
