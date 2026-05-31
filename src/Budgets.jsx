import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLang } from "./i18n.jsx";
import { useCurrency } from "./currency.jsx";
import { useCategories } from "./categories.jsx";

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

const fmt = (n) =>
  parseFloat(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function BudgetForm({ initial, allExpenseCats, customExpenseCats, existingCategories, onSave, onCancel }) {
  const { t } = useLang();
  const isEdit = !!initial?.id;

  // Custom cats first, then base cats, filtered out already-budgeted ones on add
  const orderedCats = [...customExpenseCats, ...allExpenseCats.filter(c => !customExpenseCats.includes(c))];
  const available = isEdit
    ? orderedCats
    : orderedCats.filter((c) => !existingCategories.includes(c));

  const [category, setCategory] = useState(initial?.category || available[0] || "food");
  const [amount, setAmount] = useState(initial?.amount || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) return;
    setSaving(true);
    await onSave({ category, amount: n, notes: notes.trim() || null });
    setSaving(false);
  };

  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <form onSubmit={submit} className="modal-panel fin-card relative rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-base mb-4" style={{ color: "var(--text-1)" }}>
          {isEdit ? t("budgetEdit") : t("budgetAdd")}
        </h3>

        <div className="space-y-3">
          <div>
            <label className="fin-label block mb-1.5">{t("budgetSelectCategory")}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isEdit}
              className="fin-select w-full"
            >
              {available.map((c) => (
                <option key={c} value={c}>{t(c)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="fin-label block mb-1.5">{t("budgetMonthlyLimit")}</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="fin-input fin-mono w-full"
              placeholder="0.00"
              autoFocus
            />
          </div>
          <div>
            <label className="fin-label block mb-1.5">{t("budgetNotes")}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="fin-input w-full resize-none"
              rows={2}
              placeholder={t("budgetNotesPlaceholder")}
              maxLength={500}
            />
          </div>
        </div>

        <div className="flex gap-2.5 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-opacity hover:opacity-70"
            style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
          >
            {t("cancelBtn")}
          </button>
          <button
            type="submit"
            disabled={saving || !amount}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-opacity hover:opacity-85 text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--brand)" }}
          >
            {saving ? t("savingBtn") : t("saveBtn")}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

function DeleteConfirm({ budget, onConfirm, onCancel }) {
  const { t } = useLang();
  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="modal-panel fin-card relative rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "color-mix(in srgb, var(--red) 14%, transparent)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--red)" }}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </div>
        <h3 className="font-semibold text-center text-base mb-1" style={{ color: "var(--text-1)" }}>{t("budgetDeleteTitle")}</h3>
        <p className="text-sm text-center mb-6" style={{ color: "var(--text-2)" }}>
          "{t(budget.category)}"
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

function Budgets({ transactions, showToast, onBudgetChange }) {
  const { t } = useLang();
  const { symbol } = useCurrency();
  const { expenseCats, customCats, getCatColor } = useCategories();
  const customExpenseCats = customCats.filter(c => c.kind !== "income").map(c => c.id);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const refresh = async () => {
    try {
      const res = await authFetch(`${API}/budgets`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setBudgets(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  // Compute current month spending per category
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthSpend = {};
  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    const txYm = (tx.date || "").slice(0, 7);
    if (txYm !== ym) continue;
    monthSpend[tx.category] = (monthSpend[tx.category] || 0) + parseFloat(tx.amount);
  }

  const handleSave = async ({ category, amount, notes }) => {
    try {
      const res = await authFetch(`${API}/budgets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, amount, notes }),
      });
      if (res.ok) {
        await refresh();
        onBudgetChange?.();
        setShowForm(false);
        setEditing(null);
        showToast?.(t("toastBudgetSaved"));
      }
    } catch (err) { console.log(err); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await authFetch(`${API}/budgets/${deleteTarget.id}`, { method: "DELETE" });
      setBudgets((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      onBudgetChange?.();
      setDeleteTarget(null);
      showToast?.(t("toastBudgetDeleted"));
    } catch (err) { console.log(err); }
  };

  const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.amount), 0);
  const totalSpent = budgets.reduce((s, b) => s + (monthSpend[b.category] || 0), 0);
  const existingCategories = budgets.map((b) => b.category);
  const canAddMore = existingCategories.length < expenseCats.length;

  if (loading) {
    return (
      <div className="space-y-4 anim-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="fin-card rounded-xl p-4 flex flex-col gap-3">
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="skeleton h-6 w-3/4 rounded" />
          </div>
          <div className="fin-card rounded-xl p-4 flex flex-col gap-3">
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="skeleton h-6 w-3/4 rounded" />
          </div>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="fin-card rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="skeleton h-4 w-24 rounded" />
              <div className="skeleton h-4 w-12 rounded" />
            </div>
            <div className="skeleton h-2 rounded-full w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 anim-1">
      {showForm && (
        <BudgetForm
          initial={editing}
          allExpenseCats={expenseCats}
          customExpenseCats={customExpenseCats}
          existingCategories={existingCategories}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          budget={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Summary card */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="fin-card rounded-xl p-4">
            <p className="fin-label">{t("budgetTotal")}</p>
            <p className="fin-mono text-xl font-bold mt-2" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>
              {symbol}{fmt(totalBudget)}
            </p>
          </div>
          <div className="fin-card rounded-xl p-4">
            <p className="fin-label">{t("budgetTotalSpent")}</p>
            <p
              className="fin-mono text-xl font-bold mt-2"
              style={{
                color: totalSpent > totalBudget ? "var(--red)" : "var(--text-1)",
                letterSpacing: "-0.02em"
              }}
            >
              {symbol}{fmt(totalSpent)}
            </p>
          </div>
        </div>
      )}

      {/* Add button */}
      {canAddMore && (
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="w-full fin-btn-primary py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t("budgetAdd")}
        </button>
      )}

      {/* Empty state */}
      {budgets.length === 0 && (
        <div className="fin-card rounded-2xl py-16 px-6 text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: "var(--surface-2)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-3)" }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: "var(--text-3)" }}>{t("budgetEmpty")}</p>
        </div>
      )}

      {/* Budget cards */}
      {budgets.map((b) => {
        const spent = monthSpend[b.category] || 0;
        const limit = parseFloat(b.amount);
        const pct = limit > 0 ? (spent / limit) * 100 : 0;
        const remaining = limit - spent;
        const over = spent > limit;
        const warning = pct >= 80 && !over;
        const barColor = over ? "var(--red)" : warning ? "var(--gold)" : "var(--green)";
        const status = over ? t("budgetExceeded") : warning ? t("budgetWarning") : t("budgetOnTrack");

        return (
          <div key={b.id} className="fin-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getCatColor(b.category, "expense") }} />
                <span className="text-sm font-semibold truncate max-w-[120px]" style={{ color: "var(--text-1)" }}>
                  {t(b.category)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setEditing(b); setShowForm(true); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "var(--brand)"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-3)"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => setDeleteTarget(b)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "var(--red)"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-3)"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <span className="fin-mono text-lg font-bold" style={{ color: "var(--text-1)" }}>
                {symbol}{fmt(spent)}
              </span>
              <span className="fin-mono text-xs" style={{ color: "var(--text-3)" }}>
                / {symbol}{fmt(limit)}
              </span>
            </div>

            <div className="h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: "var(--surface-2)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(pct, 100)}%`,
                  backgroundColor: barColor,
                  transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span style={{ color: barColor }} className="font-medium">{status}</span>
              <span style={{ color: "var(--text-3)" }}>
                {over
                  ? `${t("budgetOverBy")} ${symbol}${fmt(spent - limit)}`
                  : `${symbol}${fmt(remaining)} ${t("budgetRemaining").toLowerCase()}`}
              </span>
            </div>
            {b.notes && (
              <p className="text-xs mt-2 truncate" style={{ color: "var(--text-3)" }}>
                {b.notes}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default Budgets;
