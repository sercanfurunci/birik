import { useState } from "react";
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

function EyeIcon({ open }) {
  return open ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function LoginPage({ onSuccess, onSwitch, onForgotPassword, onBack, isDark, toggleDark }) {
  const { t, lang, toggleLang } = useLang();
  const [loginMethod, setLoginMethod] = useState("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = loginMethod === "email"
        ? { email, password }
        : { phone, password };
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 401 ? t("loginInvalidCredentials") : t("serverError"));
        return;
      }
      if (!data?.user) { setError(t("serverError")); return; }
      onSuccess(data.user, data.token);
    } catch {
      setError(t("serverError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Top controls */}
      <div className="fixed top-4 left-4 right-4 flex items-center justify-between z-10">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-opacity hover:opacity-70"
          style={{ color: "var(--text-3)", background: "none", border: "none" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          {t("backToLanding")}
        </button>
        <div className="flex items-center gap-2">
          <button onClick={toggleLang} className="fin-icon-btn" title="Switch language">
            <span className="text-xs font-semibold">{lang === "en" ? "TR" : "EN"}</span>
          </button>
          <button onClick={toggleDark} className="fin-icon-btn" title="Toggle theme">
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>

      <div className="w-full max-w-sm anim-1">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <img src="/birik.svg" className="birik-logo mb-4" width="48" height="48" alt="Birik" />
          <h1 className="fin-serif text-2xl" style={{ color: "var(--text-1)" }}>{t("appName")}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>{t("appSubtitle")}</p>
        </div>

        {/* Card */}
        <div className="fin-card-elev rounded-2xl p-6 sm:p-8">
          <h2 className="font-semibold text-base mb-5" style={{ color: "var(--text-1)" }}>{t("signInTitle")}</h2>

          {/* Method toggle */}
          <div className="flex rounded-xl p-1 mb-5" style={{ backgroundColor: "var(--surface-2, var(--bg))", border: "1px solid var(--border)" }}>
            {["email", "sms"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setLoginMethod(m); setError(""); }}
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                style={{
                  background: loginMethod === m ? "var(--brand)" : "transparent",
                  color: loginMethod === m ? "#fff" : "var(--text-3)",
                  border: "none",
                }}
              >
                {m === "email" ? t("verifyMethodEmail") : t("verifyMethodSms")}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {loginMethod === "email" ? (
              <div>
                <label className="fin-label block mb-1.5">{t("email")}</label>
                <input
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="fin-input"
                  required
                  autoFocus
                />
              </div>
            ) : (
              <div>
                <label className="fin-label block mb-1.5">{t("phoneNumber")}</label>
                <input
                  type="tel"
                  placeholder={t("phonePlaceholder")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="fin-input"
                  required
                  autoFocus
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="fin-label">{t("password")}</label>
                {loginMethod === "email" && (
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-xs font-medium cursor-pointer hover:underline"
                    style={{ color: "var(--brand)" }}
                  >
                    {t("forgotPassword")}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="fin-input"
                  style={{ paddingRight: "40px" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-opacity hover:opacity-60"
                  style={{ color: "var(--text-3)" }}
                  tabIndex={-1}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {error && (
              <div
                className="text-sm rounded-xl px-4 py-2.5"
                style={{ color: "var(--red)", backgroundColor: "color-mix(in srgb, var(--red) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 22%, transparent)" }}
              >
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="fin-btn-primary w-full mt-1 disabled:opacity-50">
              {loading ? t("signingIn") : t("signInBtn")}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--text-2)" }}>
            {t("noAccount")}{" "}
            <button onClick={onSwitch} className="font-medium cursor-pointer hover:underline" style={{ color: "var(--brand)" }}>
              {t("registerLink")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
