import { useState } from "react";
import { useLang } from "./i18n.jsx";

function ForgotPasswordPage({ onBack }) {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); return; }
      setSent(true);
    } catch {
      setError(t("serverError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm anim-1">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4"
            style={{ backgroundColor: "var(--brand)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h1 className="fin-serif text-2xl" style={{ color: "var(--text-1)" }}>{t("appName")}</h1>
        </div>

        <div className="fin-card-elev rounded-2xl p-6 sm:p-8">
          <h2 className="font-semibold text-base mb-1" style={{ color: "var(--text-1)" }}>{t("forgotPasswordTitle")}</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-2)" }}>{t("forgotPasswordDesc")}</p>

          {sent ? (
            <div className="text-center">
              <div className="text-sm rounded-xl px-4 py-3 mb-6" style={{ color: "var(--green)", backgroundColor: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                {t("resetEmailSent")}
              </div>
              <button onClick={onBack} className="text-sm font-medium cursor-pointer hover:underline" style={{ color: "var(--brand)" }}>
                {t("backToSignIn")}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

              {error && (
                <div className="text-sm rounded-xl px-4 py-2.5" style={{ color: "var(--red)", backgroundColor: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="fin-btn-primary w-full mt-1 disabled:opacity-50">
                {loading ? t("sendingResetLink") : t("sendResetLink")}
              </button>

              <button type="button" onClick={onBack} className="text-sm text-center cursor-pointer hover:underline" style={{ color: "var(--text-2)" }}>
                {t("backToSignIn")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
