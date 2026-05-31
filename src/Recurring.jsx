import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLang } from "./i18n.jsx";
import { useCurrency } from "./currency.jsx";
import { useCategories } from "./categories.jsx";
import { todayLocalISO } from "./dateUtils.js";

const API = import.meta.env.VITE_API_URL;
const FREQUENCIES = ["weekly", "monthly", "yearly"];

function authFetch(url, opts = {}) {
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

const todayISO = todayLocalISO;

function fmtAmount(n, symbol) {
  return symbol + parseFloat(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Styled confirm dialog ───────────────────────────────────────────────────
function ConfirmModal({ message, confirmLabel, cancelLabel, onConfirm, onCancel }) {
  return createPortal(
    <div
      className="modal-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div
        className="w-full max-w-sm p-5 anim-1"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-2)" }}>{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-xl font-medium transition-colors"
            style={{
              backgroundColor: "var(--surface-2)",
              color: "var(--text-2)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--border)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--surface-2)")}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-xl font-medium transition-colors"
            style={{ backgroundColor: "var(--red)", color: "white" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── List item ──────────────────────────────────────────────────────────────
function RecurringRow({ rule, symbol, t, formatDate, onEdit, onDeleteRequest, onToggle }) {
  const isActive = rule.is_active;
  const accent = rule.type === "income" ? "var(--green)" : "var(--red)";
  const sign   = rule.type === "income" ? "+" : "−";
  return (
    <div
      className="tx-card-row flex items-center gap-3 px-4 py-3.5"
      style={{
        borderBottom: "1px solid var(--border)",
        opacity: isActive ? 1 : 0.55,
        borderLeft: `2.5px solid ${accent}`,
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>
            {rule.description || t(rule.category)}
          </p>
          {!isActive && (
            <span className="cat-pill" style={{ fontSize: 9 }}>{t("recurringPaused")}</span>
          )}
        </div>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
          {t("recurring" + rule.frequency.charAt(0).toUpperCase() + rule.frequency.slice(1))}
          {" · "}{t(rule.category)}
          {" · "}{t("recurringNextRun")}: {formatDate(rule.next_run_date)}
        </p>
      </div>
      <span className="fin-mono text-sm font-bold shrink-0" style={{ color: accent }}>
        {sign}{fmtAmount(rule.amount, symbol)}
      </span>
      <div className="flex gap-1 shrink-0">
        <button
          className="fin-icon-btn"
          title={isActive ? t("recurringPause") : t("recurringResume")}
          onClick={() => onToggle(rule)}
        >
          {isActive ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="6 4 20 12 6 20 6 4"/>
            </svg>
          )}
        </button>
        <button className="fin-icon-btn" title={t("editLabel") || "Edit"} onClick={() => onEdit(rule)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button
          className="fin-icon-btn"
          title="Delete"
          onClick={() => onDeleteRequest(rule)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Form ───────────────────────────────────────────────────────────────────
function RecurringForm({ initial, onCancel, onSubmit, saving, t }) {
  const { expenseCats, incomeCats, getCatColor } = useCategories();
  const startToday = todayISO();
  const [description, setDescription] = useState(initial?.description || "");
  const [amount,      setAmount]      = useState(initial ? String(initial.amount) : "");
  const [type,        setType]        = useState(initial?.type || "expense");
  const [category,    setCategory]    = useState(initial?.category || (initial?.type === "income" ? "salary" : "food"));
  const [frequency,   setFrequency]   = useState(initial?.frequency || "monthly");
  const [startDate,   setStartDate]   = useState(initial?.start_date ? String(initial.start_date).split("T")[0] : startToday);
  const [endDate,     setEndDate]     = useState(initial?.end_date ? String(initial.end_date).split("T")[0] : "");
  const [dayOfMonth,  setDayOfMonth]  = useState(
    initial?.day_of_period ?? new Date(startToday).getUTCDate()
  );
  const [reminderDays, setReminderDays] = useState(
    initial?.reminder_days == null ? null : Number(initial.reminder_days)
  );

  const categoryOptions = type === "income" ? incomeCats : expenseCats;

  function switchType(nextType) {
    if (nextType === type) return;
    setType(nextType);
    setCategory(nextType === "income" ? "salary" : "food");
  }

  const submit = (e) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return;
    onSubmit({
      description: description.trim(),
      amount: parseFloat(amount),
      type,
      category,
      frequency,
      start_date: startDate,
      end_date: endDate || null,
      day_of_period: frequency === "monthly" ? Number(dayOfMonth) : null,
      reminder_days: reminderDays === "" || reminderDays === null ? null : Number(reminderDays),
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {/* Description + Amount */}
      <div className="flex gap-2.5">
        <input
          type="text"
          placeholder={t("descriptionPlaceholder")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="fin-input flex-[2] min-w-0"
        />
        <input
          type="number"
          step="0.01"
          placeholder={t("amountPlaceholder")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="fin-input fin-mono flex-1 min-w-0 text-right"
          required
        />
      </div>

      {/* Type + Category */}
      <div className="flex gap-2.5 flex-wrap sm:flex-nowrap">
        <div className="type-toggle shrink-0">
          <button type="button" onClick={() => switchType("income")}  className={`type-btn ${type === "income" ? "active-income" : ""}`}>
            + {t("incomeOption")}
          </button>
          <button type="button" onClick={() => switchType("expense")} className={`type-btn ${type === "expense" ? "active-expense" : ""}`}>
            − {t("expenseOption")}
          </button>
        </div>
        <div className="relative flex-1 min-w-0">
          <select
            className="fin-select w-full appearance-none"
            style={{ paddingLeft: "2rem" }}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categoryOptions.map((c) => (<option key={c} value={c}>{t(c)}</option>))}
          </select>
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
            style={{ backgroundColor: getCatColor(category, type) }}
          />
        </div>
      </div>

      {/* Frequency */}
      <div>
        <label className="fin-label block mb-1.5">{t("recurringFrequency")}</label>
        <div className="type-toggle">
          {FREQUENCIES.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFrequency(f)}
              className="type-btn"
              style={{
                background: frequency === f ? "var(--surface)" : "transparent",
                color:      frequency === f ? "var(--brand)"   : "var(--text-2)",
                borderColor: frequency === f ? "var(--border)" : "transparent",
                boxShadow: frequency === f ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {t("recurring" + f.charAt(0).toUpperCase() + f.slice(1))}
            </button>
          ))}
        </div>
      </div>

      {frequency === "monthly" && (
        <div>
          <label className="fin-label block mb-1.5">{t("recurringDayOfMonth")}</label>
          <input
            type="number"
            min="1"
            max="31"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            className="fin-input fin-mono"
          />
        </div>
      )}

      {/* Dates — labels in row 1, inputs in row 2 so inputs stay aligned even if labels wrap differently */}
      <div className="grid grid-cols-2 grid-rows-[auto_auto] gap-x-2.5 gap-y-1.5 items-end">
        <label className="fin-label self-end">{t("recurringStartDate")}</label>
        <label className="fin-label self-end">{t("recurringEndDate")}</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="fin-input fin-mono w-full" required />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="fin-input fin-mono w-full" />
      </div>

      {/* Reminder */}
      <div>
        <label className="fin-label block mb-1.5">{t("recurringReminder")}</label>
        <select
          className="fin-select w-full appearance-none"
          value={reminderDays === null ? "" : String(reminderDays)}
          onChange={(e) => setReminderDays(e.target.value === "" ? null : Number(e.target.value))}
        >
          <option value="">{t("recurringReminderNone")}</option>
          <option value="0">{t("recurringReminderSameDay")}</option>
          <option value="1">{t("recurringReminder1Day")}</option>
          <option value="3">{t("recurringReminder3Days")}</option>
        </select>
        <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>{t("recurringReminderHelp")}</p>
      </div>

      <div className="flex gap-2 mt-2">
        <button type="button" onClick={onCancel} className="fin-icon-btn flex-1" style={{ width: "auto", paddingLeft: 14, paddingRight: 14, fontSize: 13, fontWeight: 500 }}>
          {t("cancelBtn")}
        </button>
        <button type="submit" className="fin-btn-primary flex-1" disabled={saving}>
          {saving ? (t("savingBtn") || "Saving…") : (t("saveBtn") || "Save")}
        </button>
      </div>
    </form>
  );
}

// ─── Modal ──────────────────────────────────────────────────────────────────
function Recurring({ onClose, onChanged }) {
  const { t, formatDate } = useLang();
  const { symbol } = useCurrency();
  const [rules, setRules]   = useState([]);
  const [subNames, setSubNames] = useState([]); // lowercased subscription names
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = list; "new" = new form; obj = edit
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null); // rule pending delete confirm
  const [dupPayload, setDupPayload]     = useState(null); // { payload, name } pending dup warn

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([
        authFetch(`${API}/recurring`),
        authFetch(`${API}/subscriptions`),
      ]);
      const rData = await rRes.json().catch(() => []);
      const sData = await sRes.json().catch(() => []);
      if (Array.isArray(rData)) setRules(rData);
      if (Array.isArray(sData)) setSubNames(sData.map((s) => (s.name || "").trim().toLowerCase()).filter(Boolean));
    } catch {
      setError(t("serverError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const doSubmit = async (payload) => {
    setSaving(true);
    setError("");
    try {
      const url = editing && editing !== "new"
        ? `${API}/recurring/${editing.id}`
        : `${API}/recurring`;
      const method = editing && editing !== "new" ? "PUT" : "POST";
      const body = editing && editing !== "new"
        ? { ...payload, is_active: editing.is_active }
        : payload;
      const res = await authFetch(url, { method, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Save failed"); return; }
      setEditing(null);
      await load();
      onChanged?.();
    } catch {
      setError(t("serverError"));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (payload) => {
    const isNew = !editing || editing === "new";
    if (isNew && payload.type === "expense" && payload.description) {
      const desc = payload.description.trim().toLowerCase();
      const match = subNames.find((n) => n === desc || n.includes(desc) || desc.includes(n));
      if (match) {
        setDupPayload({ payload, name: payload.description.trim() });
        return;
      }
    }
    await doSubmit(payload);
  };

  const handleDelete = async (rule) => {
    try {
      const res = await authFetch(`${API}/recurring/${rule.id}`, { method: "DELETE" });
      if (!res.ok) return;
      await load();
      onChanged?.();
    } catch { /* ignore */ }
  };

  const handleToggle = async (rule) => {
    try {
      const res = await authFetch(`${API}/recurring/${rule.id}`, {
        method: "PUT",
        body: JSON.stringify({
          description: rule.description,
          amount: rule.amount,
          type: rule.type,
          category: rule.category,
          frequency: rule.frequency,
          day_of_period: rule.day_of_period,
          start_date: String(rule.start_date).split("T")[0],
          end_date: rule.end_date ? String(rule.end_date).split("T")[0] : null,
          reminder_days: rule.reminder_days ?? null,
          is_active: !rule.is_active,
        }),
      });
      if (!res.ok) return;
      await load();
      onChanged?.();
    } catch { /* ignore */ }
  };

  const modal = createPortal(
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="fin-card-elev rounded-2xl w-full max-w-md anim-1"
        style={{
          maxHeight: "calc(90vh - env(safe-area-inset-bottom, 0px))",
          overflowY: "auto",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h2 className="fin-serif text-xl truncate" style={{ color: "var(--text-1)" }}>
              {editing === "new" ? t("recurringAdd")
                : editing ? t("recurringEdit")
                : t("recurringTitle")}
            </h2>
            {!editing && (
              <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{t("recurringSubtitle")}</p>
            )}
          </div>
          <button onClick={onClose} className="fin-icon-btn shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && (
          <div
            className="mx-5 mb-3 text-sm rounded-xl px-4 py-2.5"
            style={{ color: "var(--red)", backgroundColor: "color-mix(in srgb, var(--red) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 22%, transparent)" }}
          >
            {error}
          </div>
        )}

        {editing ? (
          <div className="px-5 pb-2">
            <RecurringForm
              initial={editing === "new" ? null : editing}
              onCancel={() => setEditing(null)}
              onSubmit={handleSubmit}
              saving={saving}
              t={t}
            />
          </div>
        ) : (
          <>
            <hr className="fin-hairline" />
            {loading ? (
              <p className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-3)" }}>…</p>
            ) : rules.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{t("recurringEmpty")}</p>
                <p className="text-xs mt-1.5" style={{ color: "var(--text-3)" }}>{t("recurringEmptyHint")}</p>
              </div>
            ) : (
              <div>
                {rules.map((rule) => (
                  <RecurringRow
                    key={rule.id}
                    rule={rule}
                    symbol={symbol}
                    t={t}
                    formatDate={formatDate}
                    onEdit={(r) => setEditing(r)}
                    onDeleteRequest={(r) => setDeleteTarget(r)}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            )}
            <div className="px-5 pt-4 pb-1">
              <button
                onClick={() => setEditing("new")}
                className="fin-btn-primary w-full"
              >
                + {t("recurringAdd")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {modal}
      {deleteTarget && (
        <ConfirmModal
          message={t("recurringDeleteConfirm")}
          confirmLabel={t("deleteBtn")}
          cancelLabel={t("cancelBtn")}
          onConfirm={() => { handleDelete(deleteTarget); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {dupPayload && (
        <ConfirmModal
          message={t("recurringDuplicateWarn", { name: dupPayload.name })}
          confirmLabel={t("recurringAddAnyway")}
          cancelLabel={t("cancelBtn")}
          onConfirm={() => { const p = dupPayload.payload; setDupPayload(null); doSubmit(p); }}
          onCancel={() => setDupPayload(null)}
        />
      )}
    </>
  );
}

export default Recurring;
