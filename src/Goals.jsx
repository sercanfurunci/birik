import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLang } from "./i18n.jsx";
import { useCurrency } from "./currency.jsx";

const API = import.meta.env.VITE_API_URL;

const GOAL_EMOJIS = ["🎯", "✈️", "🏠", "🚗", "💍", "📱", "🎓", "💰", "🏖️", "🎮", "🏋️", "🎸"];

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

const EMPTY_FORM = { name: "", emoji: "🎯", target_amount: "", saved_amount: "0", target_date: "" };

function GoalForm({ initial, onSave, onCancel }) {
  const { t } = useLang();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState(() =>
    initial
      ? {
          name: initial.name,
          emoji: initial.emoji || "🎯",
          target_amount: String(initial.target_amount),
          saved_amount: String(initial.saved_amount || 0),
          target_date: initial.target_date?.split("T")[0] || "",
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(
      { ...form, target_amount: parseFloat(form.target_amount), saved_amount: parseFloat(form.saved_amount) || 0 },
      initial?.id
    );
    setSaving(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div
        className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10 }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-base" style={{ color: "var(--text-1)" }}>
            {isEdit ? t("goalEdit") : t("goalAdd")}
          </h2>
          <button onClick={onCancel} className="fin-icon-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="fin-label mb-2 block">{t("goalEmoji")}</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_EMOJIS.map(em => (
                <button
                  key={em}
                  type="button"
                  onClick={() => set("emoji", em)}
                  className="w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: form.emoji === em ? "color-mix(in srgb, var(--brand) 15%, transparent)" : "var(--surface-2)",
                    border: `1px solid ${form.emoji === em ? "var(--brand)" : "var(--border)"}`,
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="fin-label mb-1 block">{t("goalName")}</label>
            <input
              className="fin-input w-full"
              placeholder={t("goalNamePlaceholder")}
              value={form.name}
              onChange={e => set("name", e.target.value)}
              required
              maxLength={100}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="fin-label mb-1 block">{t("goalTarget")}</label>
              <input
                className="fin-input w-full fin-mono"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={form.target_amount}
                onChange={e => set("target_amount", e.target.value)}
                required
              />
            </div>
            <div className="flex-1">
              <label className="fin-label mb-1 block">{t("goalSaved")}</label>
              <input
                className="fin-input w-full fin-mono"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.saved_amount}
                onChange={e => set("saved_amount", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="fin-label mb-1 block">
              {t("goalTargetDate")}{" "}
              <span style={{ color: "var(--text-3)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>({t("goalOptional")})</span>
            </label>
            <input
              className="fin-input w-full"
              type="date"
              value={form.target_date}
              onChange={e => set("target_date", e.target.value)}
            />
          </div>

          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-opacity hover:opacity-70"
              style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
            >
              {t("cancelBtn")}
            </button>
            <button type="submit" disabled={saving} className="fin-btn-primary flex-1">
              {saving ? t("savingBtn") : t("saveBtn")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function DeleteConfirm({ goal, onConfirm, onCancel }) {
  const { t } = useLang();
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="fin-card relative rounded-2xl shadow-2xl w-full max-w-sm p-6 anim-1">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "rgba(248,113,113,0.12)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--red)" }}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </div>
        <h3 className="font-semibold text-center text-base mb-1" style={{ color: "var(--text-1)" }}>{t("goalDeleteTitle")}</h3>
        <p className="text-sm text-center mb-6" style={{ color: "var(--text-2)" }}>
          <strong>{goal.name}</strong>
        </p>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-opacity hover:opacity-70"
            style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
          >
            {t("cancelBtn")}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-opacity hover:opacity-85 text-white"
            style={{ backgroundColor: "var(--red)" }}
          >
            {t("deleteBtn")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function GoalCard({ goal, currency, lang, onEdit, onDelete }) {
  const { t } = useLang();
  const saved = parseFloat(goal.saved_amount || 0);
  const target = parseFloat(goal.target_amount);
  const pct = Math.min(100, Math.round((saved / target) * 100));
  const done = pct >= 100;
  const remaining = Math.max(0, target - saved);
  const locale = lang === "tr" ? "tr-TR" : "en-US";
  const fmt = n => parseFloat(n).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let daysLeft = null;
  if (goal.target_date) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(goal.target_date); due.setHours(0, 0, 0, 0);
    daysLeft = Math.round((due - today) / 86400000);
  }

  const barColor = done ? "var(--green)" : "var(--brand)";

  return (
    <div className="fin-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl shrink-0">{goal.emoji}</span>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: "var(--text-1)" }}>{goal.name}</p>
            {goal.target_date && (
              <p className="text-xs mt-0.5" style={{ color: daysLeft < 0 ? "var(--red)" : "var(--text-3)" }}>
                {daysLeft < 0
                  ? t("goalOverdue")
                  : daysLeft === 0
                  ? t("goalToday")
                  : `${daysLeft} ${t("goalDaysLeft")}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onEdit} className="fin-icon-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button onClick={onDelete} className="fin-icon-btn" style={{ color: "var(--red)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="fin-mono text-xs" style={{ color: "var(--text-2)" }}>
            {currency.symbol}{fmt(saved)}
          </span>
          <span className="fin-mono text-xs font-bold" style={{ color: barColor }}>
            {pct}%
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
        <div className="flex justify-between items-baseline mt-1.5">
          {done ? (
            <span className="text-xs font-medium" style={{ color: "var(--green)" }}>
              {t("goalComplete")} 🎉
            </span>
          ) : (
            <span className="text-xs" style={{ color: "var(--text-3)" }}>
              {currency.symbol}{fmt(remaining)} {t("goalRemaining")}
            </span>
          )}
          <span className="fin-mono text-xs" style={{ color: "var(--text-3)" }}>
            {currency.symbol}{fmt(target)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Goals() {
  const { t, lang } = useLang();
  const currency = useCurrency();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    try {
      const res = await authFetch(`${API}/goals`);
      const data = await res.json();
      if (Array.isArray(data)) setGoals(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form, id) => {
    try {
      const res = await authFetch(`${API}/goals${id ? `/${id}` : ""}`, {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) return false;
      await load();
      setShowForm(false);
      setEditTarget(null);
      return true;
    } catch (e) { return false; }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await authFetch(`${API}/goals/${deleteTarget.id}`, { method: "DELETE" });
    setGoals(prev => prev.filter(g => g.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const totalTarget = goals.reduce((s, g) => s + parseFloat(g.target_amount), 0);
  const totalSaved = goals.reduce((s, g) => s + parseFloat(g.saved_amount || 0), 0);
  const locale = lang === "tr" ? "tr-TR" : "en-US";

  return (
    <div className="anim-1">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-lg" style={{ color: "var(--text-1)" }}>{t("navGoals")}</h2>
          {goals.length > 0 && (
            <p className="text-sm mt-0.5 fin-mono" style={{ color: "var(--text-3)" }}>
              {currency.symbol}{totalSaved.toLocaleString(locale, { minimumFractionDigits: 2 })}
              {" / "}
              {currency.symbol}{totalTarget.toLocaleString(locale, { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
        <button onClick={() => setShowForm(true)} className="fin-btn-primary flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t("goalAdd")}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16" style={{ color: "var(--text-3)" }}>
          <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity=".25" /><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
        </div>
      ) : goals.length === 0 ? (
        <div className="fin-card flex flex-col items-center justify-center py-16 text-center gap-3">
          <span className="text-4xl">🎯</span>
          <p className="text-sm" style={{ color: "var(--text-3)" }}>{t("goalEmpty")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map(g => (
            <GoalCard
              key={g.id}
              goal={g}
              currency={currency}
              lang={lang}
              onEdit={() => setEditTarget(g)}
              onDelete={() => setDeleteTarget(g)}
            />
          ))}
        </div>
      )}

      {(showForm || editTarget) && (
        <GoalForm
          initial={editTarget}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          goal={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
