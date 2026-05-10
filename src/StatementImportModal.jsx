import { useState } from "react";
import { createPortal } from "react-dom";
import { useLang } from "./i18n.jsx";
import { useCurrency } from "./currency.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

function authHeader() {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function StatementImportModal({ onClose, onImported }) {
  const { t } = useLang();
  const { symbol } = useCurrency();
  const [step, setStep] = useState("pick"); // pick | preview | done
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importedCount, setImportedCount] = useState(0);
  const [recurringCount, setRecurringCount] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [installmentFlags, setInstallmentFlags] = useState(new Set());
  const CATEGORIES = ["food","housing","utilities","transport","entertainment","salary","other"];

  function toggleInstallment(i) {
    setInstallmentFlags(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  function addMonths(dateStr, months) {
    const d = new Date(dateStr + "T00:00:00");
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split("T")[0];
  }

  function deleteTx(i) {
    setPreview(prev => prev.filter((_, idx) => idx !== i));
  }

  async function processFile(file) {
    if (!file) return;
    setSelectedFile(file);
    setError(null);
    setLoading(true);

    try {
      const form = new FormData();
      form.append("statement", file);
      const res = await fetch(`${API}/transactions/import?preview=true`, {
        method: "POST",
        headers: authHeader(),
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse PDF");

      setPreview(data.transactions);
      setStep("preview");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFileInput(e) {
    processFile(e.target.files?.[0]);
  }

  function handleDragOver(e) {
    e.preventDefault();
    if (!loading) setIsDragging(true);
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (loading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    try {
      const regularTxs  = preview.filter((_, i) => !installmentFlags.has(i));
      const recurringTxs = preview.filter((_, i) => installmentFlags.has(i));

      let txImported = 0;
      let recCreated = 0;

      if (regularTxs.length > 0) {
        const res = await fetch(`${API}/transactions/import/bulk`, {
          method: "POST",
          headers: { ...authHeader(), "Content-Type": "application/json" },
          body: JSON.stringify({ transactions: regularTxs }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Import failed");
        txImported = data.imported;
      }

      for (const tx of recurringTxs) {
        const remaining  = (tx.installment_total ?? 1) - (tx.installment_index ?? 1);
        const end_date   = addMonths(tx.date, remaining);
        const day_of_period = parseInt(tx.date.split("-")[2], 10);
        const res = await fetch(`${API}/recurring`, {
          method: "POST",
          headers: { ...authHeader(), "Content-Type": "application/json" },
          body: JSON.stringify({
            description: tx.description,
            amount: parseFloat(tx.amount),
            type: tx.type,
            category: tx.category,
            frequency: "monthly",
            start_date: tx.date,
            end_date,
            day_of_period,
          }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Recurring failed"); }
        recCreated++;
      }

      setImportedCount(txImported);
      setRecurringCount(recCreated);
      setStep("done");
      onImported();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatAmount(amount, type) {
    const sign = type === "income" ? "+" : "−";
    return `${sign}${symbol}${Number(amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="fin-card w-full max-w-lg rounded-2xl flex flex-col"
        style={{
          maxHeight: "90vh",
          background: "var(--surface)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.45), 0 0 0 1px var(--border)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 pt-5 pb-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              style={{
                width: 32, height: 32,
                borderRadius: 9,
                background: "var(--brand-dim)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <span className="fin-label" style={{ color: "var(--text-1)" }}>
              {t("importStatement")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="fin-icon-btn"
            style={{ width: 28, height: 28, borderRadius: 7, fontSize: 13 }}
          >
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col gap-4 px-6 py-5 overflow-y-auto flex-1">

          {/* Step: pick file */}
          {step === "pick" && (
            <div className="flex flex-col gap-4">
              <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.55, margin: 0 }}>
                {t("importStatementDesc")}
              </p>

              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={handleFileInput}
                className="hidden"
                id="statement-file"
              />

              {/* Drop zone / upload button */}
              <label
                htmlFor="statement-file"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  padding: "28px 20px",
                  borderRadius: 12,
                  border: isDragging ? "1.5px dashed var(--brand)" : "1.5px dashed var(--border-2)",
                  background: isDragging ? "var(--brand-dim)" : "var(--surface-2)",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "border-color 0.15s, background 0.15s",
                  opacity: loading ? 0.7 : 1,
                }}
                onMouseEnter={e => {
                  if (!loading && !isDragging) {
                    e.currentTarget.style.borderColor = "var(--brand)";
                    e.currentTarget.style.background = "var(--brand-dim)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isDragging) {
                    e.currentTarget.style.borderColor = "var(--border-2)";
                    e.currentTarget.style.background = "var(--surface-2)";
                  }
                }}
              >
                {loading ? (
                  <>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>{t("importParsing")}</span>
                  </>
                ) : (
                  <>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: "var(--brand-dim)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="12" y1="18" x2="12" y2="12"/>
                        <line x1="9" y1="15" x2="15" y2="15"/>
                      </svg>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-1)", marginBottom: 2 }}>
                        {isDragging ? t("importDropNow") : t("importChooseFile")}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                        {isDragging ? "" : t("importDragDrop")}
                      </div>
                    </div>
                  </>
                )}
              </label>

              {error && (
                <p style={{ fontSize: 13, color: "var(--red)", margin: 0 }}>{error}</p>
              )}
            </div>
          )}

          {/* Step: preview */}
          {step === "preview" && (
            <>
              <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>
                {t("importPreviewDesc", { count: preview.length })}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 400, overflowY: "auto" }}>
                {preview.map((tx, i) => (
                  <div key={i} style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 7,
                  }}>
                    {/* description */}
                    <input
                      className="fin-input"
                      style={{ fontSize: 13 }}
                      value={tx.description}
                      onChange={e => setPreview(p => p.map((r, idx) => idx === i ? { ...r, description: e.target.value } : r))}
                    />
                    {/* amount + date */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        className="fin-input fin-mono"
                        type="number"
                        style={{ flex: 1, fontSize: 13, textAlign: "right" }}
                        value={tx.amount}
                        onChange={e => setPreview(p => p.map((r, idx) => idx === i ? { ...r, amount: e.target.value } : r))}
                      />
                      <input
                        className="fin-input"
                        type="date"
                        style={{ flex: 1, fontSize: 13 }}
                        value={tx.date}
                        onChange={e => setPreview(p => p.map((r, idx) => idx === i ? { ...r, date: e.target.value } : r))}
                      />
                    </div>
                    {/* installment badge + recurring toggle */}
                    {tx.installment_total && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 5,
                          color: "var(--brand)", background: "var(--brand-dim)",
                        }}>
                          {tx.installment_index}/{tx.installment_total} Taksit
                          {tx.installment_total - tx.installment_index > 0 && ` · ${tx.installment_total - tx.installment_index} kalan`}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleInstallment(i)}
                          style={{
                            fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 5,
                            cursor: "pointer", transition: "all 0.15s",
                            border: installmentFlags.has(i) ? "1px solid var(--brand)" : "1px solid var(--border)",
                            background: installmentFlags.has(i) ? "var(--brand-dim)" : "transparent",
                            color: installmentFlags.has(i) ? "var(--brand)" : "var(--text-3)",
                          }}
                        >
                          {installmentFlags.has(i) ? "✓ Tekrarlayan" : "↻ Tekrarlayan yap"}
                        </button>
                      </div>
                    )}

                    {/* type + category + delete */}
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <div className="type-toggle" style={{ flexShrink: 0 }}>
                        <button type="button" className={`type-btn ${tx.type === "income" ? "active-income" : ""}`}
                          onClick={() => setPreview(p => p.map((r, idx) => idx === i ? { ...r, type: "income" } : r))}>
                          + {t("incomeOption")}
                        </button>
                        <button type="button" className={`type-btn ${tx.type === "expense" ? "active-expense" : ""}`}
                          onClick={() => setPreview(p => p.map((r, idx) => idx === i ? { ...r, type: "expense" } : r))}>
                          − {t("expenseOption")}
                        </button>
                      </div>
                      <select className="fin-select" style={{ flex: 1, fontSize: 13 }}
                        value={tx.category}
                        onChange={e => setPreview(p => p.map((r, idx) => idx === i ? { ...r, category: e.target.value } : r))}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{t(c)}</option>)}
                      </select>
                      <button onClick={() => deleteTx(i)} title={t("importDeleteTx")} style={{
                        width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)",
                        background: "transparent", color: "var(--red)", fontSize: 15,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <p style={{ fontSize: 13, color: "var(--red)", margin: 0 }}>{error}</p>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { setStep("pick"); setPreview([]); setError(null); setSelectedFile(null); setInstallmentFlags(new Set()); }}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--surface-2)",
                    color: "var(--text-2)",
                    fontSize: 13.5,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    flexShrink: 0,
                    transition: "background 0.13s",
                  }}
                >
                  {t("cancelBtn")}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="fin-btn-primary"
                  style={{ flex: 1, opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? t("importImporting") : t("importConfirm", { count: preview.filter((_, i) => !installmentFlags.has(i)).length }) + (installmentFlags.size > 0 ? ` + ${installmentFlags.size} tekrarlayan` : "")}
                </button>
              </div>
            </>
          )}

          {/* Step: done */}
          {step === "done" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "12px 0 8px" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(16,185,129,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", textAlign: "center", margin: 0 }}>
                {t("importSuccess", { count: importedCount })}
              </p>
              {recurringCount > 0 && (
                <p style={{ fontSize: 13, color: "var(--text-2)", textAlign: "center", margin: 0 }}>
                  {recurringCount} taksitli işlem tekrarlayan kurala dönüştürüldü.
                </p>
              )}
              <button onClick={onClose} className="fin-btn-primary">
                {t("importDoneBtn")}
              </button>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body
  );
}
