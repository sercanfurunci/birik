import { useState, useRef } from "react";
import { useLang } from "./i18n.jsx";
import { auth } from "./firebase.js";
import { signInWithPhoneNumber, RecaptchaVerifier, signOut } from "firebase/auth";
import { PasswordStrength, validatePassword } from "./PasswordStrength.jsx";

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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function RegisterPage({ onSwitch, onBack, isDark, toggleDark, onShowTerms, onShowPrivacy }) {
  const { t, lang, toggleLang } = useLang();

  const [verifyMethod, setVerifyMethod] = useState("email");
  const [agreed, setAgreed] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // 'form' → 'otp' (SMS only) → 'done'
  const [step, setStep] = useState("form");
  const [otp, setOtp] = useState("");

  const recaptchaVerifierRef = useRef(null);
  const confirmationResultRef = useRef(null);

  const initRecaptcha = () => {
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
    return recaptchaVerifierRef.current;
  };

  const resetRecaptcha = () => {
    try {
      recaptchaVerifierRef.current?.clear();
    } catch {}
    recaptchaVerifierRef.current = null;
    // Also reset the global grecaptcha widget if it exists
    if (window.grecaptcha) {
      try { window.grecaptcha.reset(); } catch {}
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const pwError = validatePassword(password, t);
    if (pwError) { setError(pwError); return; }
    if (password !== confirm) { setError(t("passwordMismatch")); return; }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); return; }
      setStep("done");
    } catch {
      setError(t("serverError"));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    const pwError = validatePassword(password, t);
    if (pwError) { setError(pwError); return; }
    if (password !== confirm) { setError(t("passwordMismatch")); return; }
    if (!phone.trim()) { setError(t("phoneNumber") + " required"); return; }
    setLoading(true);
    try {
      const appVerifier = initRecaptcha();
      const result = await signInWithPhoneNumber(auth, phone, appVerifier);
      confirmationResultRef.current = result;
      setStep("otp");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to send SMS. Check the phone number format.");
      resetRecaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const credential = await confirmationResultRef.current.confirm(otp);
      const firebaseToken = await credential.user.getIdToken();
      await signOut(auth);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/register-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebaseToken, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); return; }
      setStep("done");
    } catch (err) {
      console.error(err);
      setError(t("invalidOtp"));
    } finally {
      setLoading(false);
    }
  };

  const TopControls = () => (
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
  );

  const BrandMark = () => (
    <div className="flex flex-col items-center mb-8">
      <img src="/birik.png" className="birik-logo mb-4" width="48" height="48" style={{ borderRadius: 14 }} alt="Birik" />
      <h1 className="fin-serif text-2xl" style={{ color: "var(--text-1)" }}>{t("appName")}</h1>
      <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>{t("appSubtitle")}</p>
    </div>
  );

  // Done screen (email: check email / sms: account created)
  if (step === "done") {
    const isSms = verifyMethod === "sms";
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <TopControls />
        <div className="w-full max-w-sm anim-1">
          <BrandMark />
          <div className="fin-card rounded-2xl p-8 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: isSms ? "rgba(99,102,241,0.12)" : "color-mix(in srgb, var(--brand) 14%, transparent)" }}
            >
              {isSms ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--brand)" }}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 12 19.79 19.79 0 0 1 1.07 3.4 2 2 0 0 1 3.05 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--green)" }}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              )}
            </div>
            <h2 className="font-semibold text-base mb-2" style={{ color: "var(--text-1)" }}>
              {isSms ? t("accountCreated") : t("checkYourEmail")}
            </h2>
            {!isSms && (
              <>
                <p className="text-sm mb-1" style={{ color: "var(--text-2)" }}>{t("verificationSent")}</p>
                <p className="text-sm font-medium mb-6" style={{ color: "var(--text-1)" }}>{email}</p>
              </>
            )}
            {isSms && <div className="mb-6" />}
            <button onClick={onSwitch} className="text-sm font-medium cursor-pointer hover:underline" style={{ color: "var(--brand)" }}>
              {t("backToSignIn")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // OTP entry screen (SMS only)
  if (step === "otp") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <TopControls />
        <div className="w-full max-w-sm anim-1">
          <BrandMark />
          <div className="fin-card-elev rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => { setStep("form"); setOtp(""); setError(""); resetRecaptcha(); }}
                className="flex items-center gap-1 text-xs font-medium cursor-pointer transition-opacity hover:opacity-70"
                style={{ color: "var(--text-3)", background: "none", border: "none" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                </svg>
              </button>
              <h2 className="font-semibold text-base" style={{ color: "var(--text-1)" }}>{t("otpCode")}</h2>
            </div>
            <p className="text-sm mb-6" style={{ color: "var(--text-2)" }}>
              {t("smsSent")} <span className="font-medium" style={{ color: "var(--text-1)" }}>{phone}</span>
            </p>
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <div>
                <label className="fin-label block mb-1.5">{t("otpCode")}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder={t("otpPlaceholder")}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="fin-input text-center fin-mono tracking-widest text-lg"
                  required
                  autoFocus
                />
              </div>
              {error && (
                <div className="text-sm rounded-xl px-4 py-2.5" style={{ color: "var(--red)", backgroundColor: "color-mix(in srgb, var(--red) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 22%, transparent)" }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading || otp.length < 6} className="fin-btn-primary w-full mt-1 disabled:opacity-50">
                {loading ? t("verifyingCode") : t("verifyAndCreate")}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <TopControls />
      {/* invisible reCAPTCHA anchor */}
      <div id="recaptcha-container" />
      <div className="w-full max-w-sm anim-1">
        <BrandMark />
        <div className="fin-card rounded-2xl p-6 sm:p-8">
          <h2 className="font-semibold text-base mb-5" style={{ color: "var(--text-1)" }}>{t("createAccountTitle")}</h2>

          {/* Method toggle */}
          <div className="flex rounded-xl p-1 mb-5" style={{ backgroundColor: "var(--surface-2, var(--bg))", border: "1px solid var(--border)" }}>
            {["email", "sms"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setVerifyMethod(m); setError(""); }}
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                style={{
                  background: verifyMethod === m ? "var(--brand)" : "transparent",
                  color: verifyMethod === m ? "#fff" : "var(--text-3)",
                  border: "none",
                }}
              >
                {m === "email" ? t("verifyMethodEmail") : t("verifyMethodSms")}
              </button>
            ))}
          </div>

          <form onSubmit={verifyMethod === "email" ? handleEmailSubmit : handleSendOtp} className="flex flex-col gap-4">
            {verifyMethod === "email" ? (
              <div>
                <label className="fin-label block mb-1.5">{t("email")}</label>
                <input type="email" placeholder={t("emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} className="fin-input" required autoFocus />
              </div>
            ) : (
              <div>
                <label className="fin-label block mb-1.5">{t("phoneNumber")}</label>
                <input type="tel" placeholder={t("phonePlaceholder")} value={phone} onChange={(e) => setPhone(e.target.value)} className="fin-input" required autoFocus />
              </div>
            )}

            <div>
              <label className="fin-label block mb-1.5">{t("password")}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="fin-input"
                  style={{ paddingRight: "40px" }}
                  required
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-opacity hover:opacity-60" style={{ color: "var(--text-3)" }} tabIndex={-1}>
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            <div>
              <label className="fin-label block mb-1.5">{t("confirmPassword")}</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="fin-input"
                  style={{ paddingRight: "40px" }}
                  required
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-opacity hover:opacity-60" style={{ color: "var(--text-3)" }} tabIndex={-1}>
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm rounded-xl px-4 py-2.5" style={{ color: "var(--red)", backgroundColor: "color-mix(in srgb, var(--red) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 22%, transparent)" }}>
                {error}
              </div>
            )}

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 shrink-0 accent-[var(--brand)] w-4 h-4 cursor-pointer"
              />
              <span className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>
                {t("registerAgreeTerms")}{" "}
                <button type="button" onClick={onShowTerms} className="font-medium hover:underline" style={{ color: "var(--brand)" }}>
                  {t("termsOfService")}
                </button>
                {" "}{t("registerAnd")}{" "}
                <button type="button" onClick={onShowPrivacy} className="font-medium hover:underline" style={{ color: "var(--brand)" }}>
                  {t("privacyPolicy")}
                </button>
              </span>
            </label>

            <button type="submit" disabled={loading || !agreed} className="fin-btn-primary w-full mt-1 disabled:opacity-50">
              {verifyMethod === "email"
                ? (loading ? t("creatingAccount") : t("createAccountBtn"))
                : (loading ? t("sendingCode") : t("sendCode"))}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--text-2)" }}>
            {t("alreadyHaveAccount")}{" "}
            <button onClick={onSwitch} className="font-medium cursor-pointer hover:underline" style={{ color: "var(--brand)" }}>
              {t("signInLink")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
