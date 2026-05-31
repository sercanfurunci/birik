import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLang } from "./i18n.jsx";
import { useCurrency } from "./currency.jsx";
import { useCategories } from "./categories.jsx";
import { exportPDF } from "./pdfReport.js";
import { todayLocalISO } from "./dateUtils.js";

const fmt = (n) =>
  parseFloat(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function CategoryPill({ cat, label, getCatColor, kind }) {
  return (
    <span className="cat-pill shrink-0">
      <span className="cat-dot" style={{ backgroundColor: getCatColor(cat, kind) }} />
      {label}
    </span>
  );
}

function DeleteModal({ transaction, onConfirm, onCancel }) {
  const { t, formatDate } = useLang();
  const { symbol } = useCurrency();
  const { getCatColor } = useCategories();
  const isIncome = transaction.type === "income";
  const accent = isIncome ? "var(--green)" : "var(--red)";
  const sign = isIncome ? "+" : "−";
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
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </div>
        <h3 className="font-semibold text-center text-base mb-1" style={{ color: "var(--text-1)" }}>{t("deleteTransaction")}</h3>
        <p className="text-sm text-center mb-4" style={{ color: "var(--text-2)" }}>{t("deleteConfirmLine1")}</p>

        <div
          className="rounded-xl px-4 py-3 mb-5"
          style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", borderLeft: `3px solid ${accent}` }}
        >
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>
              {transaction.description?.trim() || t(transaction.category)}
            </p>
            <span className="fin-mono text-sm font-bold shrink-0" style={{ color: accent }}>
              {sign}{symbol}{fmt(transaction.amount)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-3)" }}>
            <CategoryPill cat={transaction.category} label={t(transaction.category)} getCatColor={getCatColor} kind={transaction.type} />
            <span>·</span>
            <span>{formatDate(transaction.date)}</span>
          </div>
        </div>

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

function downloadCsv(transactions, t, symbol) {
  if (!transactions.length) return;

  const stamp = todayLocalISO();
  const dates = transactions.map((tx) => (tx.date || "").slice(0, 10)).filter(Boolean).sort();
  const dateRange = dates.length ? `${dates[0]} → ${dates[dates.length - 1]}` : stamp;

  const totalIncome  = transactions.filter(tx => tx.type === "income").reduce((s, tx) => s + parseFloat(tx.amount), 0);
  const totalExpense = transactions.filter(tx => tx.type === "expense").reduce((s, tx) => s + parseFloat(tx.amount), 0);
  const net = totalIncome - totalExpense;
  const fmt2 = (n) => n.toFixed(2);

  const summary = [
    ["Birik Export", stamp],
    ["Date Range", dateRange],
    ["Currency", symbol],
    [""],
    [`Total Income`,  `${symbol}${fmt2(totalIncome)}`],
    [`Total Expenses`, `${symbol}${fmt2(totalExpense)}`],
    [`Net Balance`,   `${net >= 0 ? "+" : ""}${symbol}${fmt2(Math.abs(net))}`],
    [""],
    [""],
    [t("date"), t("description"), t("category"), `Income (${symbol})`, `Expense (${symbol})`],
  ];

  const rows = transactions.map((tx) => {
    const amt = parseFloat(tx.amount).toFixed(2);
    return [
      (tx.date || "").slice(0, 10),
      tx.description || "",
      t(tx.category) || tx.category,
      tx.type === "income"  ? amt : "",
      tx.type === "expense" ? amt : "",
    ];
  });

  const csv = [...summary, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `birik-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const PAGE_SIZE = 15;

function TransactionList({ transactions, onDelete, onEdit, onBulkDelete }) {
  const { t, formatDate, lang } = useLang();
  const { symbol } = useCurrency();
  const { allCats, getCatColor } = useCategories();
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState("date_desc");
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const isAllPageSelected = paginated => paginated.length > 0 && paginated.every(tx => selectedIds.has(tx.id));
  const toggleSelectAll = (paginated) => {
    if (isAllPageSelected(paginated)) {
      setSelectedIds(prev => { const next = new Set(prev); paginated.forEach(tx => next.delete(tx.id)); return next; });
    } else {
      setSelectedIds(prev => { const next = new Set(prev); paginated.forEach(tx => next.add(tx.id)); return next; });
    }
  };
  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (!confirm(t("bulkDeleteConfirm")(ids.length))) return;
    setBulkDeleting(true);
    try {
      await onBulkDelete(ids);
      exitSelectMode();
    } finally {
      setBulkDeleting(false);
    }
  };

  const sorted = [...transactions].sort((a, b) => {
    if (sortKey === "amount_desc" || sortKey === "amount_asc") {
      const diff = parseFloat(a.amount) - parseFloat(b.amount);
      if (diff !== 0) return sortKey === "amount_desc" ? -diff : diff;
      // tie-break by date desc
      return new Date(b.date) - new Date(a.date);
    }
    const dateDiff = new Date(b.date) - new Date(a.date);
    const primary = sortKey === "date_asc" ? -dateDiff : dateDiff;
    if (primary !== 0) return primary;
    return (b.id || 0) - (a.id || 0);
  });

  const searchLower = search.trim().toLowerCase();
  let filtered = sorted;
  if (filterType !== "all") filtered = filtered.filter((tx) => tx.type === filterType);
  if (filterCategory !== "all") filtered = filtered.filter((tx) => tx.category === filterCategory);
  if (searchLower) filtered = filtered.filter((tx) => (tx.description || "").toLowerCase().includes(searchLower));
  if (dateFrom) filtered = filtered.filter((tx) => (tx.date || "").slice(0, 10) >= dateFrom);
  if (dateTo)   filtered = filtered.filter((tx) => (tx.date || "").slice(0, 10) <= dateTo);

  const hasActiveFilter =
    filterType !== "all" || filterCategory !== "all" || searchLower ||
    dateFrom || dateTo || sortKey !== "date_desc";
  const clearAll = () => {
    setFilterType("all");
    setFilterCategory("all");
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setSortKey("date_desc");
    setPage(0);
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const runningBalanceMap = {};
  let runningBal = 0;
  [...transactions]
    .sort((a, b) => { const d = new Date(a.date) - new Date(b.date); return d !== 0 ? d : a.id - b.id; })
    .forEach(tx => {
      runningBal += tx.type === "income" ? parseFloat(tx.amount) : -parseFloat(tx.amount);
      runningBalanceMap[tx.id] = runningBal;
    });

  // Reset to page 0 whenever any filter changes
  useEffect(() => { setPage(0); }, [filterType, filterCategory, searchLower, dateFrom, dateTo, sortKey]);

  const startEdit = (tx) => {
    setEditingId(tx.id);
    setEditValues({ description: tx.description, amount: tx.amount, type: tx.type, category: tx.category, notes: tx.notes || "" });
  };
  const saveEdit = (id) => {
    if (!editValues.amount) return;
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
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="fin-label">{t("transactions")}</h2>
            <div className="ml-auto flex items-center gap-1.5">
              {!selectMode ? (
                <>
                  <button
                    onClick={() => setSelectMode(true)}
                    className="text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-80"
                    style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
                  >
                    {t("selectModeBtn")}
                  </button>
                  <button
                    onClick={() => downloadCsv(filtered, t, symbol)}
                    disabled={filtered.length === 0}
                    title={filtered.length === 0 ? t("exportEmpty") : t("exportCsv")}
                    className="text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {t("exportCsv")}
                  </button>
                  <button
                    onClick={() => exportPDF({ transactions: filtered, symbol, t, lang })}
                    disabled={filtered.length === 0}
                    title={filtered.length === 0 ? t("exportEmpty") : t("exportPdf")}
                    className="text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    PDF
                  </button>
                </>
              ) : (
                <button
                  onClick={exitSelectMode}
                  className="text-xs py-1.5 px-3 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
                >
                  {t("exitSelectMode")}
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--text-3)" }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="fin-input w-full"
              style={{ paddingLeft: "34px" }}
            />
          </div>

          {/* Row 1: Type + Category + Sort */}
          <div className="grid grid-cols-2 sm:flex gap-2 mb-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={filterSelectClass}
            >
              <option value="all">{t("allTypes")}</option>
              <option value="income">{t("incomeOption")}</option>
              <option value="expense">{t("expenseOption")}</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={filterSelectClass}
            >
              <option value="all">{t("allCategories")}</option>
              {allCats.map((cat) => (
                <option key={cat} value={cat}>{t(cat)}</option>
              ))}
            </select>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className={`${filterSelectClass} col-span-2 sm:col-span-1 sm:ml-auto`}
            >
              <option value="date_desc">{t("sortDateDesc")}</option>
              <option value="date_asc">{t("sortDateAsc")}</option>
              <option value="amount_desc">{t("sortAmountDesc")}</option>
              <option value="amount_asc">{t("sortAmountAsc")}</option>
            </select>
          </div>

          {/* Row 2: Date range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="fin-label mb-1" style={{ fontSize: 10 }}>{t("dateFrom")}</p>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="fin-input w-full text-xs"
                style={{ colorScheme: "light dark" }}
              />
            </div>
            <div>
              <p className="fin-label mb-1" style={{ fontSize: 10 }}>{t("dateTo")}</p>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="fin-input w-full text-xs"
                style={{ colorScheme: "light dark" }}
              />
            </div>
          </div>
          {hasActiveFilter && (
            <button
              onClick={clearAll}
              className="text-xs py-2 px-3 rounded-lg cursor-pointer transition-opacity hover:opacity-80 w-full"
              style={{
                backgroundColor: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-3)",
              }}
            >
              {t("clearFilters")}
            </button>
          )}
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
              {paginated.map((tx) => {
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
                          step="0.01"
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
                        {allCats.map((cat) => (
                          <option key={cat} value={cat}>{t(cat)}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={editValues.notes || ""}
                        onChange={(e) => setEditValues({ ...editValues, notes: e.target.value })}
                        placeholder={t("notesPlaceholder")}
                        maxLength={1000}
                        className="fin-input"
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => saveEdit(tx.id)}
                          className="flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer transition-opacity hover:opacity-80"
                          style={{ backgroundColor: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--green)" }}
                        >
                          {t("saveBtn")}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer transition-opacity hover:opacity-80"
                          style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                        >
                          {t("cancelBtn")}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={tx.id}
                    className={`tx-card-row flex items-center gap-3 px-5 py-3.5 ${tx.type === "income" ? "tx-income" : "tx-expense"}`}
                    style={{ borderBottom: "1px solid var(--border)", backgroundColor: selectMode && selectedIds.has(tx.id) ? "var(--surface-2)" : undefined }}
                    onClick={selectMode ? () => toggleSelect(tx.id) : undefined}
                  >
                    {selectMode && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(tx.id)}
                        onChange={() => toggleSelect(tx.id)}
                        onClick={e => e.stopPropagation()}
                        className="w-4 h-4 shrink-0 cursor-pointer accent-[var(--brand)]"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>
                          {tx.description}
                        </p>
                        <CategoryPill cat={tx.category} label={t(tx.category)} getCatColor={getCatColor} kind={tx.type} />
                      </div>
                      {tx.notes && (
                        <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-3)" }}>
                          {tx.notes}
                        </p>
                      )}
                      <span className="fin-mono text-[10px] mt-0.5 block" style={{ color: "var(--text-3)" }}>
                        {formatDate(tx.date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="text-right">
                        <span
                          className="fin-mono text-sm font-bold block"
                          style={{ color: tx.type === "income" ? "var(--green)" : "var(--red)" }}
                        >
                          {tx.type === "income" ? "+" : "−"}{symbol}{fmt(tx.amount)}
                        </span>
                        {runningBalanceMap[tx.id] !== undefined && (
                          <span className="fin-mono text-[10px]" style={{ color: "var(--text-3)" }}>
                            {runningBalanceMap[tx.id] < 0 ? "−" : ""}{symbol}{fmt(Math.abs(runningBalanceMap[tx.id]))}
                          </span>
                        )}
                      </div>
                      {!selectMode && (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop table ── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  {selectMode && <col style={{ width: "40px" }} />}
                  <col style={{ width: "110px" }} />  {/* date */}
                  <col />                              {/* description — takes remaining */}
                  <col style={{ width: "140px" }} />  {/* category */}
                  <col style={{ width: "180px" }} />  {/* type + amount */}
                  <col style={{ width: "72px" }} />   {/* actions */}
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {selectMode && (
                      <th className="px-3 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={isAllPageSelected(paginated)}
                          onChange={() => toggleSelectAll(paginated)}
                          className="w-4 h-4 cursor-pointer accent-[var(--brand)]"
                        />
                      </th>
                    )}
                    {[t("date"), t("description"), t("category"), t("amount"), ""].map((h, i) => (
                      <th
                        key={i}
                        className={`px-5 py-3 fin-label ${i === 3 ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((tx, i) => {
                    const isEditing = editingId === tx.id;
                    const isLast = i === paginated.length - 1;
                    const borderStyle = { borderBottom: isLast ? "none" : "1px solid var(--border)" };

                    if (isEditing) {
                      return (
                        <tr key={tx.id} style={{ ...borderStyle, backgroundColor: "var(--surface-2)" }}>
                          <td className="px-5 py-3 fin-mono text-xs" style={{ color: "var(--text-3)", whiteSpace: "nowrap" }}>
                            {formatDate(tx.date)}
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
                              {allCats.map((cat) => (
                                <option key={cat} value={cat}>{t(cat)}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={editValues.type}
                                onChange={(e) => setEditValues({ ...editValues, type: e.target.value })}
                                className="fin-select shrink-0"
                                style={{ width: "52px", paddingLeft: "6px", paddingRight: "4px" }}
                              >
                                <option value="income">+</option>
                                <option value="expense">−</option>
                              </select>
                              <input
                                type="number"
                                step="0.01"
                                value={editValues.amount}
                                onChange={(e) => setEditValues({ ...editValues, amount: e.target.value })}
                                className="fin-input fin-mono text-right flex-1"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => saveEdit(tx.id)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
                                style={{ backgroundColor: "color-mix(in srgb, var(--brand) 14%, transparent)", color: "var(--green)" }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
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
                        style={{ ...borderStyle, backgroundColor: selectMode && selectedIds.has(tx.id) ? "var(--surface-2)" : undefined, cursor: selectMode ? "pointer" : undefined }}
                        onClick={selectMode ? () => toggleSelect(tx.id) : undefined}
                      >
                        {selectMode && (
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(tx.id)}
                              onChange={() => toggleSelect(tx.id)}
                              onClick={e => e.stopPropagation()}
                              className="w-4 h-4 cursor-pointer accent-[var(--brand)]"
                            />
                          </td>
                        )}
                        <td className="px-5 py-2.5 fin-mono text-xs whitespace-nowrap" style={{ color: "var(--text-3)" }}>
                          {formatDate(tx.date)}
                        </td>
                        <td className="px-5 py-2.5 text-sm font-medium" style={{ color: "var(--text-1)", overflow: "hidden" }}>
                          <span className="block truncate" title={tx.description}>{tx.description}</span>
                          {tx.notes && (
                            <span className="block truncate text-[11px] mt-0.5" style={{ color: "var(--text-3)" }} title={tx.notes}>{tx.notes}</span>
                          )}
                        </td>
                        <td className="px-5 py-2.5">
                          <CategoryPill cat={tx.category} label={t(tx.category)} getCatColor={getCatColor} kind={tx.type} />
                        </td>
                        <td className="px-5 py-2.5 text-right whitespace-nowrap">
                          <span
                            className="fin-mono text-sm font-bold"
                            style={{ color: tx.type === "income" ? "var(--green)" : "var(--red)" }}
                          >
                            {tx.type === "income" ? "+" : "−"}{symbol}{fmt(tx.amount)}
                          </span>
                          {runningBalanceMap[tx.id] !== undefined && (
                            <div className="fin-mono text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                              {runningBalanceMap[tx.id] < 0 ? "−" : ""}{symbol}{fmt(Math.abs(runningBalanceMap[tx.id]))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5" style={{ whiteSpace: "nowrap" }}>
                          {!selectMode && (
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
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div
                className="flex items-center justify-between px-5 py-3 gap-3"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <span className="text-xs fin-mono" style={{ color: "var(--text-3)" }}>
                  {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)}{" "}
                  / {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                    className="fin-icon-btn disabled:opacity-30"
                    aria-label="Previous page"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  {totalPages <= 7
                    ? Array.from({ length: totalPages }, (_, i) => i).map(i => (
                        <button
                          key={i}
                          onClick={() => setPage(i)}
                          className="w-7 h-7 rounded-lg text-xs font-medium transition-colors"
                          style={{
                            backgroundColor: i === safePage ? "var(--brand)" : "transparent",
                            color: i === safePage ? "white" : "var(--text-3)",
                          }}
                          onMouseEnter={e => { if (i !== safePage) e.currentTarget.style.backgroundColor = "var(--surface-2)"; }}
                          onMouseLeave={e => { if (i !== safePage) e.currentTarget.style.backgroundColor = "transparent"; }}
                        >
                          {i + 1}
                        </button>
                      ))
                    : (
                        <span className="text-xs px-2" style={{ color: "var(--text-2)" }}>
                          {safePage + 1} / {totalPages}
                        </span>
                      )
                  }
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={safePage === totalPages - 1}
                    className="fin-icon-btn disabled:opacity-30"
                    aria-label="Next page"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating bulk delete bar */}
      {selectMode && selectedIds.size > 0 && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)", backgroundColor: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
        >
          <span className="text-sm font-medium" style={{ color: "var(--text-2)" }}>
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: "var(--red)", color: "#fff" }}
          >
            {bulkDeleting ? "…" : t("bulkDeleteBtn")(selectedIds.size)}
          </button>
        </div>
      )}
    </>
  );
}

export default TransactionList;
