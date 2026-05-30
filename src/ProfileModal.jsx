import { useState, useRef } from "react";
import { CURRENCIES } from "./currency.jsx";
import { useLang } from "./i18n.jsx";
import { auth } from "./firebase.js";
import { signInWithPhoneNumber, RecaptchaVerifier, signOut } from "firebase/auth";

function apiFetch(url, opts = {}) {
  const token = localStorage.getItem("auth_token");
  return fetch(url, {
    ...opts,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...opts.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

async function checkAvailability(endpoint) {
  const res = await apiFetch(`${import.meta.env.VITE_API_URL}${endpoint}`);
  let data;
  try { data = await res.json(); } catch { data = {}; }
  return res.ok ? null : (data.error || "Not available");
}

function ProfileModal({ user, onClose, onSave, onDeleted }) {
  const { t } = useLang();
  const [username, setUsername] = useState(user.username || "");
  const [currency, setCurrency] = useState(user.currency || "USD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Change password flow
  const [pwOpen, setPwOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (pwNew !== pwConfirm) { setPwError(t("passwordMismatch")); return; }
    setPwLoading(true);
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/auth/change-password`, {
        method: "PUT",
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || "";
        if (msg.includes("incorrect")) setPwError(t("changePwWrongCurrent"));
        else if (msg.includes("same")) setPwError(t("changePwSameAsOld"));
        else setPwError(msg || t("serverError"));
        return;
      }
      setPwSuccess(t("changePwSuccess"));
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
      setTimeout(() => { setPwOpen(false); setPwSuccess(""); }, 2000);
    } catch {
      setPwError(t("serverError"));
    } finally {
      setPwLoading(false);
    }
  };

  // Delete account flow
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteAccount = async () => {
    setDeleteError("");
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      setDeleteError(t("deleteAccountTypeWrong"));
      return;
    }
    if (!deletePassword) {
      setDeleteError(t("deleteAccountNeedPassword"));
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/auth/account`, {
        method: "DELETE",
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setDeleteError(data.error || t("deleteAccountFailed")); return; }
      onDeleted?.();
    } catch {
      setDeleteError(t("serverError"));
    } finally {
      setDeleteLoading(false);
    }
  };

  // Link phone states
  const [linkStep, setLinkStep] = useState(null); // null | 'phone-form' | 'phone-otp' | 'email-form' | 'email-sent'
  const [linkPhone, setLinkPhone] = useState("");
  const [linkEmail, setLinkEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [linkSuccess, setLinkSuccess] = useState("");

  const recaptchaVerifierRef = useRef(null);
  const confirmationResultRef = useRef(null);

  const initials = (user.username || user.email || user.phone || "?")
    .split(/[\s@+]/)[0]
    .slice(0, 2)
    .toUpperCase();

  const handleSave = async () => {
    setError("");
    const trimmedUsername = username.trim();
    if (!trimmedUsername) { setError(t("usernameRequired")); return; }
    setLoading(true);
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/auth/profile`, {
        method: "PUT",
        body: JSON.stringify({ username: trimmedUsername, currency }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Update failed"); return; }
      onSave(data);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  // ── Phone linking ──
  const initRecaptcha = () => {
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "profile-recaptcha", { size: "invisible" });
    }
    return recaptchaVerifierRef.current;
  };

  const resetRecaptcha = () => {
    try { recaptchaVerifierRef.current?.clear(); } catch {}
    recaptchaVerifierRef.current = null;
    if (window.grecaptcha) { try { window.grecaptcha.reset(); } catch {} }
  };

  const handleSendLinkOtp = async (e) => {
    e.preventDefault();
    setLinkError("");
    setLinkLoading(true);
    try {
      const phoneErr = await checkAvailability(`/auth/check-phone?phone=${encodeURIComponent(linkPhone)}`);
      if (phoneErr) { setLinkError(phoneErr); return; }
      const appVerifier = initRecaptcha();
      const result = await signInWithPhoneNumber(auth, linkPhone, appVerifier);
      confirmationResultRef.current = result;
      setLinkStep("phone-otp");
    } catch (err) {
      setLinkError(err.message || "Failed to send SMS");
      resetRecaptcha();
    } finally {
      setLinkLoading(false);
    }
  };

  const handleVerifyLinkOtp = async (e) => {
    e.preventDefault();
    setLinkError("");
    setLinkLoading(true);
    let credential;
    try {
      credential = await confirmationResultRef.current.confirm(otp);
    } catch {
      setLinkError(t("invalidOtp"));
      setLinkLoading(false);
      return;
    }

    try {
      const firebaseToken = await credential.user.getIdToken();
      await signOut(auth);

      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/auth/link-phone`, {
        method: "POST",
        body: JSON.stringify({ firebaseToken, phone: linkPhone }),
      });
      const data = await res.json();
      if (!res.ok) { setLinkError(data.error || "Failed to link phone"); return; }

      setLinkStep(null);
      setLinkSuccess(t("linkPhoneSuccess"));
      onSave({ ...user, phone: linkPhone });
    } catch {
      setLinkError(t("serverError"));
    } finally {
      setLinkLoading(false);
    }
  };

  // ── Email linking ──
  const handleSendLinkEmail = async (e) => {
    e.preventDefault();
    setLinkError("");
    setLinkLoading(true);
    try {
      const emailErr = await checkAvailability(`/auth/check-email?email=${encodeURIComponent(linkEmail)}`);
      if (emailErr) { setLinkError(emailErr); return; }
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/auth/link-email`, {
        method: "POST",
        body: JSON.stringify({ email: linkEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setLinkError(data.error || "Failed to send email"); return; }
      setLinkStep("email-sent");
    } catch {
      setLinkError(t("serverError"));
    } finally {
      setLinkLoading(false);
    }
  };

  const resetLink = () => {
    setLinkStep(null);
    setLinkError("");
    setLinkPhone("");
    setLinkEmail("");
    setOtp("");
    resetRecaptcha();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div id="profile-recaptcha" />
      <div
        className="fin-card-elev rounded-2xl w-full max-w-sm p-6 anim-1"
        style={{
          maxHeight: "calc(90vh - env(safe-area-inset-bottom, 0px))",
          overflowY: "auto",
          paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
        }}
      >

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="fin-serif text-xl" style={{ color: "var(--text-1)" }}>{t("profileTitle")}</h2>
          <button onClick={onClose} className="fin-icon-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold mb-2"
            style={{ background: "linear-gradient(135deg, var(--brand) 0%, color-mix(in srgb, var(--brand) 55%, #1a1a2e) 100%)" }}
          >
            {initials}
          </div>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>{user.email || user.phone}</p>
        </div>

        {/* Linked Accounts */}
        <div className="mb-5">
          <p className="fin-label mb-3">{t("linkedAccounts")}</p>
          <div className="space-y-2">
            {/* Email row */}
            <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: user.email ? "var(--green)" : "var(--text-3)" }}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-1)" }}>{t("linkedEmail")}</p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>{user.email || t("notLinked")}</p>
                </div>
              </div>
              {!user.email && (
                <button
                  onClick={() => { setLinkStep("email-form"); setLinkError(""); }}
                  className="text-xs font-semibold cursor-pointer hover:opacity-70"
                  style={{ color: "var(--brand)", background: "none", border: "none" }}
                >
                  {t("linkBtn")}
                </button>
              )}
            </div>

            {/* Phone row */}
            <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: user.phone ? "var(--green)" : "var(--text-3)" }}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 12 19.79 19.79 0 0 1 1.07 3.4 2 2 0 0 1 3.05 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
                </svg>
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-1)" }}>{t("linkedPhone")}</p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>{user.phone || t("notLinked")}</p>
                </div>
              </div>
              {!user.phone && (
                <button
                  onClick={() => { setLinkStep("phone-form"); setLinkError(""); }}
                  className="text-xs font-semibold cursor-pointer hover:opacity-70"
                  style={{ color: "var(--brand)", background: "none", border: "none" }}
                >
                  {t("linkBtn")}
                </button>
              )}
            </div>
          </div>

          {/* Success / error messages — always visible regardless of step */}
          {linkSuccess && (
            <p className="text-xs mt-2 text-center font-medium" style={{ color: "var(--green)" }}>{linkSuccess}</p>
          )}
          {linkError && (
            <div className="mt-2 text-xs rounded-xl px-3 py-2" style={{ color: "var(--red)", backgroundColor: "color-mix(in srgb, var(--red) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 22%, transparent)" }}>
              {linkError}
            </div>
          )}

          {/* Link phone form */}
          {linkStep === "phone-form" && (
            <form onSubmit={handleSendLinkOtp} className="mt-3 space-y-2">
              <input type="tel" placeholder={t("phonePlaceholder")} value={linkPhone} onChange={(e) => setLinkPhone(e.target.value)} className="fin-input" required autoFocus />
              <div className="flex gap-2">
                <button type="button" onClick={resetLink} className="flex-1 py-2 rounded-xl text-xs font-medium cursor-pointer" style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>{t("cancelBtn")}</button>
                <button type="submit" disabled={linkLoading} className="flex-1 fin-btn-primary disabled:opacity-50 text-xs py-2">{linkLoading ? t("sendingCode") : t("sendCode")}</button>
              </div>
            </form>
          )}

          {/* Link phone OTP */}
          {linkStep === "phone-otp" && (
            <form onSubmit={handleVerifyLinkOtp} className="mt-3 space-y-2">
              <p className="text-xs" style={{ color: "var(--text-2)" }}>{t("smsSent")} <span className="font-medium">{linkPhone}</span></p>
              <input type="text" inputMode="numeric" maxLength={6} placeholder={t("otpPlaceholder")} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} className="fin-input text-center fin-mono tracking-widest" required autoFocus />
              <div className="flex gap-2">
                <button type="button" onClick={resetLink} className="flex-1 py-2 rounded-xl text-xs font-medium cursor-pointer" style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>{t("cancelBtn")}</button>
                <button type="submit" disabled={linkLoading || otp.length < 6} className="flex-1 fin-btn-primary disabled:opacity-50 text-xs py-2">{linkLoading ? t("verifyingCode") : t("verifyAndCreate")}</button>
              </div>
            </form>
          )}

          {/* Link email form */}
          {linkStep === "email-form" && (
            <form onSubmit={handleSendLinkEmail} className="mt-3 space-y-2">
              <input type="email" placeholder={t("emailPlaceholder")} value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} className="fin-input" required autoFocus />
              <div className="flex gap-2">
                <button type="button" onClick={resetLink} className="flex-1 py-2 rounded-xl text-xs font-medium cursor-pointer" style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>{t("cancelBtn")}</button>
                <button type="submit" disabled={linkLoading} className="flex-1 fin-btn-primary disabled:opacity-50 text-xs py-2">{linkLoading ? t("sendingResetLink") : t("linkBtn")}</button>
              </div>
            </form>
          )}

          {/* Email sent */}
          {linkStep === "email-sent" && (
            <div className="mt-3 text-center">
              <p className="text-xs mb-2" style={{ color: "var(--green)" }}>{t("linkEmailSent")}</p>
              <button onClick={resetLink} className="text-xs font-medium cursor-pointer hover:underline" style={{ color: "var(--brand)", background: "none", border: "none" }}>{t("cancelBtn")}</button>
            </div>
          )}
        </div>

        {/* Username */}
        <div className="mb-5">
          <label className="fin-label block mb-1.5">{t("displayName")}</label>
          <input type="text" className="fin-input" placeholder={t("displayNamePlaceholder")} value={username} onChange={(e) => setUsername(e.target.value)} maxLength={40} />
        </div>

        {/* Currency */}
        <div className="mb-6">
          <label className="fin-label block mb-2">{t("currencyLabel")}</label>
          <div className="grid grid-cols-4 gap-2">
            {CURRENCIES.map((c) => {
              const isActive = currency === c.code;
              return (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-center transition-all cursor-pointer"
                  title={c.name}
                  style={{
                    backgroundColor: isActive ? "var(--brand-dim)" : "var(--surface-2)",
                    border: `1px solid ${isActive ? "var(--brand)" : "var(--border)"}`,
                    color: isActive ? "var(--brand)" : "var(--text-2)",
                  }}
                >
                  <span className="fin-mono text-base font-bold leading-none">{c.symbol}</span>
                  <span className="text-[10px] font-medium leading-none opacity-75">{c.code}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="text-sm rounded-xl px-4 py-2.5 mb-4" style={{ color: "var(--red)", backgroundColor: "color-mix(in srgb, var(--red) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 22%, transparent)" }}>
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all" style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
            {t("cancelBtn")}
          </button>
          <button onClick={handleSave} disabled={loading} className="flex-1 fin-btn-primary disabled:opacity-50">
            {loading ? t("savingBtn") : t("saveBtn")}
          </button>
        </div>

        {/* ── Change password ── */}
        <div className="mt-6 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
          {!pwOpen ? (
            <button
              onClick={() => { setPwOpen(true); setPwError(""); setPwSuccess(""); }}
              className="w-full py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all"
              style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
            >
              {t("changePasswordBtn")}
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <p className="fin-label">{t("changePasswordTitle")}</p>
              <div>
                <label className="fin-label block mb-1.5">{t("currentPassword")}</label>
                <input
                  type="password"
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  className="fin-input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  autoFocus
                />
              </div>
              <div>
                <label className="fin-label block mb-1.5">{t("newPassword")}</label>
                <input
                  type="password"
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  className="fin-input"
                  placeholder={t("passwordPlaceholder")}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="fin-label block mb-1.5">{t("confirmPassword")}</label>
                <input
                  type="password"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  className="fin-input"
                  placeholder={t("passwordPlaceholder")}
                  autoComplete="new-password"
                />
              </div>
              {pwError && (
                <div className="text-xs rounded-xl px-3 py-2" style={{ color: "var(--red)", backgroundColor: "color-mix(in srgb, var(--red) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 22%, transparent)" }}>
                  {pwError}
                </div>
              )}
              {pwSuccess && (
                <p className="text-xs text-center font-medium" style={{ color: "var(--green)" }}>{pwSuccess}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setPwOpen(false); setPwCurrent(""); setPwNew(""); setPwConfirm(""); setPwError(""); setPwSuccess(""); }}
                  className="flex-1 py-2 rounded-xl text-xs font-medium cursor-pointer"
                  style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                >
                  {t("cancelBtn")}
                </button>
                <button
                  type="submit"
                  disabled={pwLoading || !pwCurrent || !pwNew || !pwConfirm}
                  className="flex-1 fin-btn-primary disabled:opacity-40 text-xs py-2"
                >
                  {pwLoading ? t("changePwSaving") : t("changePasswordBtn")}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Danger zone ── */}
        <div className="mt-8 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="fin-label mb-2" style={{ color: "var(--red)" }}>{t("dangerZone")}</p>
          {!deleteOpen ? (
            <button
              onClick={() => { setDeleteOpen(true); setDeleteError(""); }}
              className="w-full py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all"
              style={{
                backgroundColor: "color-mix(in srgb, var(--red) 8%, transparent)",
                color: "var(--red)",
                border: "1px solid color-mix(in srgb, var(--red) 28%, transparent)",
              }}
            >
              {t("deleteAccountBtn")}
            </button>
          ) : (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{
                backgroundColor: "color-mix(in srgb, var(--red) 6%, transparent)",
                border: "1px solid color-mix(in srgb, var(--red) 28%, transparent)",
              }}
            >
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>
                {t("deleteAccountWarning")}
              </p>

              <div>
                <label className="fin-label block mb-1.5">{t("password")}</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="fin-input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label className="fin-label block mb-1.5">{t("deleteAccountTypeLabel")}</label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="fin-input fin-mono"
                  placeholder="DELETE"
                  autoCapitalize="characters"
                />
              </div>

              {deleteError && (
                <div
                  className="text-xs rounded-lg px-3 py-2"
                  style={{ color: "var(--red)", backgroundColor: "color-mix(in srgb, var(--red) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 22%, transparent)" }}
                >
                  {deleteError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setDeleteOpen(false);
                    setDeletePassword("");
                    setDeleteConfirmText("");
                    setDeleteError("");
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-medium cursor-pointer"
                  style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                >
                  {t("cancelBtn")}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--red)",
                    color: "#fff",
                    border: "1px solid var(--red)",
                  }}
                >
                  {deleteLoading ? t("deletingAccount") : t("deleteAccountConfirmBtn")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;
