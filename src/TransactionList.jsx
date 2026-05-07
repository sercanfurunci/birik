import { useState } from "react";
import { createPortal } from "react-dom";
import { useLang } from "./i18n.jsx";
import { useCurrency } from "./currency.jsx";

const categories = ["food", "housing", "utilities", "transport", "entertainment", "salary", "other"];

const catDotColor = {
  food:          "#F97316",
  housing:       "#3B82F6",
  utilities:     "#EAB308",
  transport:     "#06B6D4",
  entertainment: "#EC4899",
  salary:        "#10B981",
  other:         "#94A3B8",
};

const fmt = (n) =>
  parseFloat(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function CategoryPill({ cat, label }) {
  return (
    <span className="cat-pill">
      <span className="cat-dot" style={{ backgroundColor: catDotColor[cat] ?? catDotColor.other }} />
      {label}
    </span>
  );
}

function DeleteModal({ transaction, onConfirm, onCancel }) {
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
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </div>
        <h3 className="font-semibold text-center text-base mb-1" style={{ color: "var(--text-1)" }}>Delete Transaction</h3>
        <p className="text-sm text-center mb-1" style={{ color: "var(--text-2)" }}>Are you sure you want to delete</p>
        <p className="text-sm text-center font-medium mb-6" style={{ color: "var(--text-1)" }}>"{transaction.description}"?</p>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-opacity hover:opacity-70"
            style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-opacity hover:opacity-85 text-white"
            style={{ backgroundColor: "var(--red)" }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function csvEscape(val) {
  const s = String(val ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(transactions, t) {
  if (!transactions.length) return;
  const headers = [t("date"), t("description"), t("category"), "Type", t("amount")];
  const rows = transactions.map((tx) => [
    (tx.date || "").split("T")[0],
    tx.description || "",
    t(tx.category) || tx.category,
    tx.type,
    parseFloat(tx.amount).toFixed(2),
  ]);
  const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
  const bom = "\uFEFF"; // Excel-friendly UTF-8 BOM
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `transactions-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function TransactionList({ transactions, onDelete, onEdit }) {
  const { t } = useLang();
  const { symbol } = useCurrency();
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  let filtered = transactions;
  if (filterType !== "all") filtered = filtered.filter((tx) => tx.type === filterType);
  if (filterCategory !== "all") filtered = filtered.filter((tx) => tx.category === filterCategory);

  const startEdit = (tx) => {
    setEditingId(tx.id);
    setEditValues({ description: tx.description, amount: tx.amount, type: tx.type, category: tx.category });
  };
  const saveEdit = (id) => {
    if (!editValues.description || !editValues.amount) return;
    onEdit(id, editValues);
    setEditingId(null);
  };
  const cancelEdit = () => setEditingId(null);

  const filterSelectClass = "fin-select text-xs py-1.5 px-3";

  return (
    <>
      {deleteTarget && (
        <DeleteModal
          transaction={deleteTarget}
          onConfirm={() => { onDelete(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="fin-card rounded-2xl overflow-hidden anim-4">
        {/* Header */}
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="fin-label">{t("transactions")}</h2>
          <div className="flex gap-2 sm:ml-auto flex-wrap">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={filterSelectClass}
              style={{ width: "auto" }}
            >
              <option value="all">{t("allTypes")}</option>
              <option value="income">{t("incomeOption")}</option>
              <option value="expense">{t("expenseOption")}</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={filterSelectClass}
              style={{ width: "auto" }}
            >
              <option value="all">{t("allCategories")}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{t(cat)}</option>
              ))}
            </select>
            <button
              onClick={() => downloadCsv(filtered, t)}
              disabled={filtered.length === 0}
              title={filtered.length === 0 ? t("exportEmpty") : t("exportCsv")}
              className="text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text-2)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {t("exportCsv")}
            </button>
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: "var(--surface-2)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-3)" }}>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: "var(--text-3)" }}>{t("noTransactions")}</p>
          </div>
        )}

        {filtered.length > 0 && (
          <>
            {/* ── Mobile card list ── */}
            <div className="sm:hidden">
              {filtered.map((tx) => {
                const isEditing = editingId === tx.id;

                if (isEditing) {
                  return (
                    <div key={tx.id} className="p-4 space-y-2.5" style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface-2)" }}>
                      <input
                        type="text"
                        value={editValues.description}
                        onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                        className="fin-input"
                        autoFocus
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={editValues.amount}
                          onChange={(e) => setEditValues({ ...editValues, amount: e.target.value })}
                          className="fin-input fin-mono"
                        />
                        <select
                          value={editValues.type}
                          onChange={(e) => setEditValues({ ...editValues, type: e.target.value })}
                          className="fin-select"
                        >
                          <option value="income">+ {t("incomeOption")}</option>
                          <option value="expense">− {t("expenseOption")}</option>
                        </select>
                      </div>
                      <select
                        value={editValues.category}
                        onChange={(e) => setEditValues({ ...editValues, category: e.target.value })}
                        className="fin-select"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{t(cat)}</option>
                        ))}
                      </select>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => saveEdit(tx.id)}
                          className="flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer transition-opacity hover:opacity-80"
                          style={{ backgroundColor: "rgba(16,185,129,0.12)", color: "var(--green)" }}
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer transition-opacity hover:opacity-80"
                          style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={tx.id}
                    className={`tx-card-row flex items-center gap-3 px-5 py-3.5 ${tx.type === "income" ? "tx-income" : "tx-expense"}`}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="fin-mono text-[10px]" style={{ color: "var(--text-3)" }}>
                          {new Date(tx.date).toLocaleDateString()}
                        </span>
                        <CategoryPill cat={tx.category} label={t(tx.category)} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="fin-mono text-sm font-bold"
                        style={{ color: tx.type === "income" ? "var(--green)" : "var(--red)" }}
                      >
                        {tx.type === "income" ? "+" : "−"}{symbol}{fmt(tx.amount)}
                      </span>
                      <button
                        onClick={() => startEdit(tx)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                        style={{ color: "var(--text-3)" }}
                        onMouseEnter={(e) => e.currentTarget.style.color = "var(--brand)"}
                        onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-3)"}
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(tx)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                        style={{ color: "var(--text-3)" }}
                        onMouseEnter={(e) => e.currentTarget.style.color = "var(--red)"}
                        onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-3)"}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop table ── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {[t("date"), t("description"), t("category"), t("amount"), ""].map((h, i) => (
                      <th
                        key={i}
                        className={`px-5 py-3 fin-label ${i === 3 ? "text-right" : "text-left"}`}
                        style={{ width: i === 4 ? "72px" : "auto" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx, i) => {
                    const isEditing = editingId === tx.id;
                    const isLast = i === filtered.length - 1;
                    const borderStyle = { borderBottom: isLast ? "none" : "1px solid var(--border)" };

                    if (isEditing) {
                      return (
                        <tr key={tx.id} style={{ ...borderStyle, backgroundColor: "var(--surface-2)" }}>
                          <td className="px-5 py-3 fin-mono text-xs" style={{ color: "var(--text-3)", whiteSpace: "nowrap" }}>
                            {new Date(tx.date).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              value={editValues.description}
                              onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                              className="fin-input"
                              autoFocus
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              value={editValues.category}
                              onChange={(e) => setEditValues({ ...editValues, category: e.target.value })}
                              className="fin-select"
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>{t(cat)}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2 justify-end">
                              <select
                                value={editValues.type}
                                onChange={(e) => setEditValues({ ...editValues, type: e.target.value })}
                                className="fin-select"
                                style={{ width: "auto" }}
                              >
                                <option value="income">+</option>
                                <option value="expense">−</option>
                              </select>
                              <input
                                type="number"
                                value={editValues.amount}
                                onChange={(e) => setEditValues({ ...editValues, amount: e.target.value })}
                                className="fin-input fin-mono text-right"
                                style={{ width: "96px" }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => saveEdit(tx.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                                style={{ backgroundColor: "rgba(16,185,129,0.12)", color: "var(--green)" }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                                style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={tx.id}
                        className={`tx-row group ${tx.type === "income" ? "tx-income" : "tx-expense"}`}
                        style={borderStyle}
                      >
                        <td className="px-5 py-4 fin-mono text-xs whitespace-nowrap" style={{ color: "var(--text-3)" }}>
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 text-sm font-medium" style={{ color: "var(--text-1)" }}>
                          {tx.description}
                        </td>
                        <td className="px-5 py-4">
                          <CategoryPill cat={tx.category} label={t(tx.category)} />
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <span
                            className="fin-mono text-sm font-bold"
                            style={{ color: tx.type === "income" ? "var(--green)" : "var(--red)" }}
                          >
                            {tx.type === "income" ? "+" : "−"}{symbol}{fmt(tx.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-4" style={{ whiteSpace: "nowrap" }}>
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => startEdit(tx)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                              style={{ color: "var(--text-3)" }}
                              onMouseEnter={(e) => e.currentTarget.style.color = "var(--brand)"}
                              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-3)"}
                            >
                              <EditIcon />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(tx)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                              style={{ color: "var(--text-3)" }}
                              onMouseEnter={(e) => e.currentTarget.style.color = "var(--red)"}
                              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-3)"}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default TransactionList;
