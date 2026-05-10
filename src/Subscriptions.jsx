import { useState, useEffect, useCallback } from "react";
import { useLang } from "./i18n.jsx";
import { useCurrency, CURRENCIES } from "./currency.jsx";

// ── Exchange rate ─────────────────────────────────────────────────────────────
const _rateCache = {};
async function getRate(from, to) {
  if (from === to) return 1;
  const key = `${from}_${to}`;
  const cached = _rateCache[key];
  if (cached && Date.now() - cached.ts < 86_400_000) return cached.rate;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/rates?from=${from}&to=${to}`);
    const data = await res.json();
    const rate = data.rate;
    if (rate) _rateCache[key] = { rate, ts: Date.now() };
    return rate || null;
  } catch {
    return null;
  }
}

const SUB_TO_TX_CATEGORY = {
  ai: "other", entertainment: "entertainment", music: "entertainment",
  finance: "other", productivity: "other", health: "other",
  news: "other", other: "other",
};

const API = import.meta.env.VITE_API_URL;

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

const SERVICE_DOMAIN = {
  "chatgpt": "chat.openai.com",
  "openai": "openai.com",
  "claude": "claude.ai",
  "anthropic": "anthropic.com",
  "spotify": "spotify.com",
  "netflix": "netflix.com",
  "apple music": "music.apple.com",
  "apple tv": "tv.apple.com",
  "youtube": "youtube.com",
  "discord": "discord.com",
  "github": "github.com",
  "notion": "notion.so",
  "figma": "figma.com",
  "adobe": "adobe.com",
  "dropbox": "dropbox.com",
  "google one": "one.google.com",
  "google": "google.com",
  "microsoft": "microsoft.com",
  "office": "office.com",
  "zoom": "zoom.us",
  "slack": "slack.com",
  "amazon prime": "primevideo.com",
  "amazon": "amazon.com",
  "prime video": "primevideo.com",
  "hbo": "hbomax.com",
  "disney": "disneyplus.com",
  "hulu": "hulu.com",
  "icloud": "icloud.com",
  "duolingo": "duolingo.com",
  "canva": "canva.com",
  "cursor": "cursor.sh",
  "perplexity": "perplexity.ai",
  "midjourney": "midjourney.com",
  "linear": "linear.app",
  "vercel": "vercel.com",
  "1password": "1password.com",
  "lastpass": "lastpass.com",
  "bitwarden": "bitwarden.com",
  "grammarly": "grammarly.com",
  "todoist": "todoist.com",
  "evernote": "evernote.com",
  "dropbox": "dropbox.com",
  "twitch": "twitch.tv",
  "steam": "store.steampowered.com",
  "playstation": "playstation.com",
  "xbox": "xbox.com",
  "apple": "apple.com",
};

const SERVICE_EMOJI = {
  chatgpt: "🤖", openai: "🤖",
  claude: "✳️", anthropic: "✳️",
  spotify: "🎵", netflix: "🎬",
  "apple music": "🎵", "apple tv": "🎬",
  youtube: "▶️", discord: "💬",
  github: "⌨️", notion: "📝",
  figma: "🎨", adobe: "🎨",
  dropbox: "☁️", google: "🔍",
  microsoft: "💼", office: "💼",
  zoom: "📹", slack: "💬",
  amazon: "📦", prime: "📦",
  hbo: "🎬", disney: "🎬", hulu: "🎬",
  icloud: "☁️", duolingo: "🦜",
  canva: "🖌️", cursor: "⌨️",
  perplexity: "🔍", midjourney: "🎨",
  linear: "📋", vercel: "▲",
};

const CATEGORY_EMOJI = {
  ai: "✨", entertainment: "🎬",
  music: "🎵", finance: "🏦",
  productivity: "⚡", health: "❤️",
  news: "📰", other: "📦",
};

function getServiceDomain(name) {
  const lower = name.toLowerCase();
  // Sort by key length desc so "amazon prime" matches before "amazon"
  const entries = Object.entries(SERVICE_DOMAIN).sort((a, b) => b[0].length - a[0].length);
  for (const [key, domain] of entries) {
    if (lower.includes(key)) return domain;
  }
  return null;
}

function getEmoji(name, category) {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(SERVICE_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return CATEGORY_EMOJI[category] || "📦";
}

function ServiceIcon({ name, category, size = 40 }) {
  const [failed, setFailed] = useState(false);
  const domain = getServiceDomain(name);
  const emoji = getEmoji(name, category);

  if (!domain || failed) {
    return (
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          width: size, height: size,
          backgroundColor: "var(--surface-2)",
          borderRadius: "50%",
          fontSize: size * 0.45,
        }}
      >
        {emoji}
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center shrink-0 overflow-hidden"
      style={{
        width: size, height: size,
        backgroundColor: "var(--surface-2)",
        borderRadius: "50%",
      }}
    >
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt={name}
        width={size * 0.6}
        height={size * 0.6}
        onError={() => setFailed(true)}
        style={{ objectFit: "contain", borderRadius: 4 }}
      />
    </div>
  );
}

function daysUntil(dateStr) {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function monthlyEquivalent(amount, cycle) {
  if (cycle === "weekly") return (amount * 52) / 12;
  if (cycle === "yearly") return amount / 12;
  return amount;
}

function monthsActive(startedAt) {
  const start = new Date(startedAt);
  const now = new Date();
  const m = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return Math.max(1, m);
}

const CATEGORIES = ["ai", "entertainment", "music", "finance", "productivity", "health", "news", "other"];
const BILLING_CYCLES = ["weekly", "monthly", "yearly"];

const EMPTY_FORM = {
  name: "",
  amount: "",
  currency: "USD",
  billing_cycle: "monthly",
  next_billing_date: "",
  category: "other",
  started_at: new Date().toISOString().split("T")[0],
  is_active: true,
  auto_charge: false,
  notes: "",
  reminder_days: null,
};

// ── Delete confirmation modal ──────────────────────────────────────────────────
function DeleteConfirm({ sub, onConfirm, onCancel }) {
  const { t } = useLang();
  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-sm p-5" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10 }}>
        <h3 className="font-semibold mb-2" style={{ color: "var(--text-1)" }}>{t("subDeleteTitle")}</h3>
        <p className="text-sm mb-5" style={{ color: "var(--text-2)" }}>
          {t("deleteConfirmLine1")} <strong>{sub.name}</strong>?
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-medium cursor-pointer transition-all"
            style={{ backgroundColor: "var(--surface-2)", color: "var(--text-1)", border: "1px solid var(--border)", borderRadius: 7 }}
          >
            {t("cancelBtn")}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-medium cursor-pointer"
            style={{ backgroundColor: "var(--red)", color: "white", borderRadius: 7 }}
          >
            {t("deleteBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Subscription detail modal ─────────────────────────────────────────────────
function SubDetail({ sub, onEdit, onDelete, onClose, onAddExpense, userCurrency, preloadedRate }) {
  const { t, lang } = useLang();
  const subCurrency = CURRENCIES.find(c => c.code === sub.currency) || CURRENCIES[0];
  const userCurrencyObj = CURRENCIES.find(c => c.code === userCurrency) || subCurrency;
  const days = daysUntil(sub.next_billing_date);
  const months = monthsActive(sub.started_at);
  const totalSpent = parseFloat(sub.amount) * months;
  const dateLocale = lang === "tr" ? "tr-TR" : "en-US";
  const [rate, setRate] = useState(preloadedRate);
  const [addingExpense, setAddingExpense] = useState(false);
  const [expenseAdded, setExpenseAdded] = useState(false);
  const needsConversion = sub.currency !== userCurrency;

  useEffect(() => {
    if (needsConversion && !preloadedRate) {
      getRate(sub.currency, userCurrency).then(setRate);
    }
  }, [sub.currency, userCurrency, needsConversion, preloadedRate]);

  async function handleAddExpense() {
    setAddingExpense(true);
    const convertedAmount = rate ? parseFloat(sub.amount) * rate : parseFloat(sub.amount);
    await onAddExpense(sub, convertedAmount, needsConversion ? userCurrency : sub.currency);
    setAddingExpense(false);
    setExpenseAdded(true);
    setTimeout(() => setExpenseAdded(false), 2500);
  }

  const startDate = new Date(sub.started_at).toLocaleDateString(dateLocale, {
    day: "numeric", month: "short", year: "numeric",
  });

  const daysLabel =
    days === 0 ? t("subToday") :
    days < 0   ? t("subOverdue") :
    `${days} ${t("subDays")}`;

  const stats = [
    [t("subMonthsActive"), String(months)],
    [t("subTotalSpent"), `${subCurrency.symbol}${totalSpent.toLocaleString(dateLocale, { maximumFractionDigits: 2 })}`],
    [t("subStartedAt"), startDate],
    [t("subNextBilling"), daysLabel],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md overflow-hidden" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10 }}>
        {/* Header */}
        <div className="flex items-center gap-3 p-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <ServiceIcon name={sub.name} category={sub.category} size={48} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base truncate" style={{ color: "var(--text-1)" }}>{sub.name}</p>
            <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-3)" }}>
              <span
                className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                style={{ backgroundColor: sub.is_active ? "var(--green)" : "var(--text-3)" }}
              />
              {sub.is_active ? t("subStatusActive") : t("subStatusInactive")} · {subCurrency.symbol}{parseFloat(sub.amount).toLocaleString(dateLocale)}
              {needsConversion && rate && (
                <span style={{ color: "var(--brand)" }}>
                  {" "}≈ {userCurrencyObj.symbol}{(parseFloat(sub.amount) * rate).toLocaleString(dateLocale, { maximumFractionDigits: 2 })}
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="fin-icon-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-px m-5 mb-0 overflow-hidden" style={{ border: "1px solid var(--border)", borderRadius: 10 }}>
          {stats.map(([label, value]) => (
            <div key={label} className="p-3" style={{ backgroundColor: "var(--surface-2)" }}>
              <p className="fin-label text-[10px] mb-1" style={{ color: "var(--text-3)" }}>{label}</p>
              <p className="font-semibold text-sm fin-mono" style={{ color: "var(--text-1)" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 p-5 pt-4">
          <button
            onClick={handleAddExpense}
            disabled={addingExpense || expenseAdded || (needsConversion && rate === null)}
            className="w-full py-2.5 text-sm font-medium cursor-pointer fin-btn-primary"
            style={{ opacity: (addingExpense || (needsConversion && rate === null)) ? 0.6 : 1 }}
          >
            {expenseAdded ? `✓ ${t("subExpenseAdded")}` : addingExpense ? "…" : t("subAddAsExpense")}
            {needsConversion && rate && !expenseAdded && !addingExpense && (
              <span style={{ opacity: 0.75, marginLeft: 6 }}>
                ({userCurrencyObj.symbol}{(parseFloat(sub.amount) * rate).toLocaleString(dateLocale, { maximumFractionDigits: 2 })})
              </span>
            )}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex-1 py-2.5 text-sm font-medium cursor-pointer transition-all"
              style={{ backgroundColor: "var(--surface-2)", color: "var(--text-1)", border: "1px solid var(--border)", borderRadius: 7 }}
            >
              {t("subEdit")}
            </button>
            <button
              onClick={onDelete}
              className="flex-1 py-2.5 text-sm font-medium cursor-pointer"
              style={{ backgroundColor: "rgba(220,38,38,0.08)", color: "var(--red)", border: "1px solid rgba(220,38,38,0.15)", borderRadius: 7 }}
            >
              {t("deleteBtn")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add / Edit form modal ─────────────────────────────────────────────────────
function SubForm({ initial, onSave, onClose }) {
  const { t } = useLang();
  const [form, setForm] = useState(() =>
    initial
      ? {
          name: initial.name,
          amount: String(initial.amount),
          currency: initial.currency,
          billing_cycle: initial.billing_cycle,
          next_billing_date: initial.next_billing_date?.split("T")[0] || "",
          category: initial.category,
          started_at: initial.started_at?.split("T")[0] || new Date().toISOString().split("T")[0],
          is_active: initial.is_active,
          auto_charge: initial.auto_charge ?? false,
          notes: initial.notes || "",
          reminder_days: initial.reminder_days ?? null,
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const ok = await onSave({ ...form, amount: parseFloat(form.amount) }, initial?.id);
    setSaving(false);
    if (ok) onClose();
    else setError(t("serverError"));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10 }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-base" style={{ color: "var(--text-1)" }}>
            {initial ? t("subEdit") : t("subAdd")}
          </h2>
          <button onClick={onClose} className="fin-icon-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="fin-label mb-1 block">{t("subName")}</label>
            <input
              className="fin-input w-full"
              placeholder="Netflix, Spotify, Claude…"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              required
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-[1fr_6.5rem] gap-2">
            <div>
              <label className="fin-label mb-1 block">{t("amount")}</label>
              <input
                className="fin-input w-full fin-mono"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="9.99"
                value={form.amount}
                onChange={e => set("amount", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="fin-label mb-1 block">{t("currencyLabel")}</label>
              <select className="fin-select w-full" value={form.currency} onChange={e => set("currency", e.target.value)}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="fin-label mb-1 block">{t("subBillingCycle")}</label>
            <select className="fin-select w-full" value={form.billing_cycle} onChange={e => set("billing_cycle", e.target.value)}>
              {BILLING_CYCLES.map(c => (
                <option key={c} value={c}>{t(`subCycle_${c}`)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="fin-label mb-1 block">{t("category")}</label>
            <select className="fin-select w-full" value={form.category} onChange={e => set("category", e.target.value)}>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{CATEGORY_EMOJI[c]} {t(`subCat_${c}`)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="fin-label mb-1 block">{t("subStartedAt")}</label>
              <input
                className="fin-input w-full"
                type="date"
                value={form.started_at}
                onChange={e => set("started_at", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="fin-label mb-1 block">{t("subNextBilling")}</label>
              <input
                className="fin-input w-full"
                type="date"
                value={form.next_billing_date}
                onChange={e => set("next_billing_date", e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="fin-label mb-1 block">{t("subNotes")}</label>
            <input
              className="fin-input w-full"
              placeholder={t("subNotesPlaceholder")}
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              maxLength={500}
            />
          </div>

          <div>
            <label className="fin-label mb-1 block">{t("subReminder")}</label>
            <select
              className="fin-select w-full"
              value={form.reminder_days ?? ""}
              onChange={e => set("reminder_days", e.target.value === "" ? null : Number(e.target.value))}
            >
              <option value="">{t("subReminderNone")}</option>
              <option value="3">{t("subReminder3")}</option>
              <option value="7">{t("subReminder7")}</option>
              <option value="14">{t("subReminder14")}</option>
            </select>
          </div>

          <div
            className="flex items-start gap-3 p-3"
            style={{
              backgroundColor: form.auto_charge ? "color-mix(in srgb, var(--brand) 8%, transparent)" : "var(--surface-2)",
              border: `1px solid ${form.auto_charge ? "color-mix(in srgb, var(--brand) 35%, var(--border))" : "var(--border)"}`,
              borderRadius: 10,
              transition: "all 0.15s",
            }}
          >
            <div
              onClick={() => set("auto_charge", !form.auto_charge)}
              className="relative transition-colors shrink-0 mt-0.5"
              style={{
                backgroundColor: form.auto_charge ? "var(--brand)" : "var(--border-2)",
                cursor: "pointer",
                width: "2.5rem",
                height: "1.375rem",
                borderRadius: 99,
              }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                style={{
                  left: form.auto_charge ? "calc(100% - 1.125rem)" : "0.125rem",
                  backgroundColor: "white",
                }}
              />
            </div>
            <div
              className="flex-1 min-w-0 cursor-pointer select-none"
              onClick={() => set("auto_charge", !form.auto_charge)}
            >
              <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                {t("subAutoCharge")}
              </p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-3)" }}>
                {t("subAutoChargeDesc")}
              </p>
            </div>
          </div>

          {initial && (
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => set("is_active", !form.is_active)}
                className="relative transition-colors shrink-0"
                style={{
                  backgroundColor: form.is_active ? "var(--brand)" : "var(--border-2)",
                  cursor: "pointer",
                  width: "2.5rem",
                  height: "1.375rem",
                  borderRadius: 99,
                }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                  style={{
                    left: form.is_active ? "calc(100% - 1.125rem)" : "0.125rem",
                    backgroundColor: "white",
                  }}
                />
              </div>
              <span className="text-sm" style={{ color: "var(--text-2)" }}>
                {form.is_active ? t("subStatusActive") : t("subStatusInactive")}
              </span>
            </label>
          )}

          {error && <p className="text-xs" style={{ color: "var(--red)" }}>{error}</p>}

          <button type="submit" disabled={saving} className="fin-btn-primary w-full mt-1">
            {saving ? t("savingBtn") : t("saveBtn")}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Subscription list row with optional currency conversion ───────────────────
function SubRow({ sub, subCurr, needsConv, userCurrency, daysLabel, billingCycleLabel, dateLocale, borderTop, onClick }) {
  const [rate, setRate] = useState(null);
  useEffect(() => {
    if (needsConv) getRate(sub.currency, userCurrency.code).then(setRate);
  }, [sub.currency, userCurrency.code, needsConv]);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 transition-all cursor-pointer text-left"
      style={{
        borderTop: borderTop ? "1px solid var(--border)" : "none",
        backgroundColor: "transparent",
        opacity: sub.is_active ? 1 : 0.5,
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--surface-2)")}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      <ServiceIcon name={sub.name} category={sub.category} size={40} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-medium text-sm truncate" style={{ color: "var(--text-1)" }}>{sub.name}</p>
          {sub.auto_charge && (
            <span
              title="Auto-charge"
              className="inline-flex items-center justify-center shrink-0"
              style={{
                width: 14,
                height: 14,
                borderRadius: 99,
                backgroundColor: "color-mix(in srgb, var(--brand) 20%, transparent)",
                color: "var(--brand)",
              }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </span>
          )}
          {sub.reminder_days && (
            <span
              title={`Reminder ${sub.reminder_days} days before`}
              className="inline-flex items-center justify-center shrink-0"
              style={{
                width: 14,
                height: 14,
                borderRadius: 99,
                backgroundColor: "color-mix(in srgb, var(--green) 20%, transparent)",
                color: "var(--green)",
              }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </span>
          )}
        </div>
        <p className="text-xs" style={{ color: "var(--text-3)" }}>
          {billingCycleLabel} · {daysLabel}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="fin-mono text-sm font-semibold" style={{ color: "var(--text-1)" }}>
          {needsConv && rate
            ? `${userCurrency.symbol}${(parseFloat(sub.amount) * rate).toLocaleString(dateLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `${subCurr.symbol}${parseFloat(sub.amount).toLocaleString(dateLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          }
        </p>
        {needsConv && (
          <p className="text-[10px] fin-mono" style={{ color: "var(--text-3)" }}>
            {subCurr.symbol}{parseFloat(sub.amount).toLocaleString(dateLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        )}
      </div>
    </button>
  );
}

// ── Main Subscriptions component ──────────────────────────────────────────────
export default function Subscriptions({ onExpenseAdded }) {
  const { t, lang } = useLang();
  const currency = useCurrency();

  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [rates, setRates] = useState({});

  useEffect(() => { loadSubs(); }, []);

  useEffect(() => {
    if (!subs.length || !currency.code) return;
    const pairs = [...new Set(
      subs.filter(s => s.currency !== currency.code).map(s => `${s.currency}|${currency.code}`)
    )];
    pairs.forEach(pair => {
      const [from, to] = pair.split("|");
      getRate(from, to).then(r => {
        if (r) setRates(prev => ({ ...prev, [pair]: r }));
      });
    });
  }, [subs, currency.code]);

  async function loadSubs() {
    setLoading(true);
    try {
      const res = await authFetch(`${API}/subscriptions`);
      if (res.ok) setSubs(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(data, id) {
    const method = id ? "PUT" : "POST";
    const url = id ? `${API}/subscriptions/${id}` : `${API}/subscriptions`;
    const res = await authFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) return false;
    const saved = await res.json();
    setSubs(prev => {
      const list = id ? prev.map(s => s.id === id ? saved : s) : [...prev, saved];
      return list.sort((a, b) => new Date(a.next_billing_date) - new Date(b.next_billing_date));
    });
    return true;
  }

  async function handleDelete(id) {
    await authFetch(`${API}/subscriptions/${id}`, { method: "DELETE" });
    setSubs(prev => prev.filter(s => s.id !== id));
    setDeleteTarget(null);
    setDetailTarget(null);
  }

  async function handleAddAsExpense(sub, convertedAmount, usedCurrency) {
    await authFetch(`${API}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: sub.name,
        amount: convertedAmount,
        type: "expense",
        category: SUB_TO_TX_CATEGORY[sub.category] || "other",
        date: new Date().toISOString().split("T")[0],
        currency: usedCurrency,
      }),
    });
    onExpenseAdded?.();
  }

  function openEdit(sub) {
    setDetailTarget(null);
    setEditTarget(sub);
    setShowForm(true);
  }

  const dateLocale = lang === "tr" ? "tr-TR" : "en-US";
  const activeSubs = subs.filter(s => s.is_active);
  const monthlyTotal = activeSubs.reduce((sum, s) => {
    const r = s.currency === currency.code ? 1 : (rates[`${s.currency}|${currency.code}`] ?? null);
    if (r === null) return sum;
    return sum + monthlyEquivalent(parseFloat(s.amount) * r, s.billing_cycle);
  }, 0);

  // Categories that actually have subscriptions
  const usedCategories = CATEGORIES.filter(cat => subs.some(s => s.category === cat));

  // Filtered + grouped list
  const filteredSubs = activeFilter === "all" ? subs : subs.filter(s => s.category === activeFilter);
  const groups = (activeFilter === "all" ? usedCategories : [activeFilter])
    .map(cat => ({ cat, items: filteredSubs.filter(s => s.category === cat) }))
    .filter(g => g.items.length > 0);

  return (
    <>
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="fin-label" style={{ color: "var(--text-3)" }}>{t("subMonthlyTotal")}</p>
          <p className="fin-serif text-3xl leading-tight mt-0.5" style={{ color: "var(--text-1)" }}>
            {currency.symbol}{monthlyTotal.toLocaleString(dateLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        {/* Desktop add button */}
        <button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          className="hidden sm:flex fin-btn-primary items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t("subAdd")}
        </button>
      </div>

      {/* Tracking-only info note */}
      <div
        className="flex items-start gap-2.5 px-3.5 py-2.5 mb-4 rounded-xl"
        style={{
          backgroundColor: "var(--brand-dim)",
          border: "1px solid rgba(var(--brand-rgb), 0.18)",
        }}
      >
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ color: "var(--brand)", flexShrink: 0, marginTop: 2 }}
        >
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>
          {t("subsTrackingOnly")}
        </p>
      </div>

      {/* Category filter pills */}
      {usedCategories.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setActiveFilter("all")}
            className="shrink-0 px-3 py-1.5 text-xs font-medium cursor-pointer transition-all"
            style={{
              borderRadius: 7,
              backgroundColor: activeFilter === "all" ? "var(--text-1)" : "var(--surface)",
              color: activeFilter === "all" ? "var(--bg)" : "var(--text-2)",
              border: `1px solid ${activeFilter === "all" ? "var(--text-1)" : "var(--border)"}`,
            }}
          >
            {t("allCategories")}
          </button>
          {usedCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className="shrink-0 px-3 py-1.5 text-xs font-medium cursor-pointer transition-all"
              style={{
                borderRadius: 7,
                backgroundColor: activeFilter === cat ? "var(--text-1)" : "var(--surface)",
                color: activeFilter === cat ? "var(--bg)" : "var(--text-2)",
                border: `1px solid ${activeFilter === cat ? "var(--text-1)" : "var(--border)"}`,
              }}
            >
              {CATEGORY_EMOJI[cat]} {t(`subCat_${cat}`)}
            </button>
          ))}
        </div>
      )}

      {/* Subscription list */}
      {loading ? (
        <div className="fin-card p-10 text-center" style={{ color: "var(--text-3)" }}>…</div>
      ) : subs.length === 0 ? (
        <div className="fin-card p-10 text-center">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-sm" style={{ color: "var(--text-3)" }}>{t("subEmpty")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(({ cat, items }) => (
            <div key={cat}>
              <p className="fin-label mb-2 px-1" style={{ color: "var(--text-3)" }}>
                {CATEGORY_EMOJI[cat]} {t(`subCat_${cat}`)} · {items.length}
              </p>
              <div className="fin-card overflow-hidden rounded-xl">
                {items.map((sub, i) => {
                  const days = daysUntil(sub.next_billing_date);
                  const subCurr = CURRENCIES.find(c => c.code === sub.currency) || CURRENCIES[0];
                  const needsConv = sub.currency !== currency.code;
                  const daysLabel =
                    days === 0 ? t("subToday") :
                    days < 0  ? t("subOverdue") :
                    `${days} ${t("subDays")}`;

                  return (
                    <SubRow
                      key={sub.id}
                      sub={sub}
                      subCurr={subCurr}
                      needsConv={needsConv}
                      userCurrency={currency}
                      daysLabel={daysLabel}
                      billingCycleLabel={t(`subCycle_${sub.billing_cycle}`)}
                      dateLocale={dateLocale}
                      borderTop={i > 0}
                      onClick={() => setDetailTarget(sub)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Mobile FAB */}
    <button
      onClick={() => { setEditTarget(null); setShowForm(true); }}
      className="sm:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer z-30"
      style={{ backgroundColor: "var(--brand)", color: "white" }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>

    {showForm && (
      <SubForm
        initial={editTarget}
        onSave={handleSave}
        onClose={() => { setShowForm(false); setEditTarget(null); }}
      />
    )}

    {detailTarget && (
      <SubDetail
        sub={detailTarget}
        onEdit={() => openEdit(detailTarget)}
        onDelete={() => setDeleteTarget(detailTarget)}
        onClose={() => setDetailTarget(null)}
        onAddExpense={handleAddAsExpense}
        userCurrency={currency.code}
        preloadedRate={rates[`${detailTarget.currency}|${currency.code}`] ?? null}
      />
    )}

    {deleteTarget && (
      <DeleteConfirm
        sub={deleteTarget}
        onConfirm={() => handleDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    )}
    </>
  );
}
