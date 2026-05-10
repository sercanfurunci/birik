import { useState } from "react";
import { useLang } from "./i18n.jsx";
import { useCategories } from "./categories.jsx";
import StatementImportModal from "./StatementImportModal.jsx";
import Recurring from "./Recurring.jsx";

function TransactionForm({ onAdd, onRefresh }) {
  const { t } = useLang();
  const { allCats, addCat, getCatColor } = useCategories();

  const [showImport, setShowImport] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatInput, setNewCatInput] = useState("");

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("food");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount) return;
    onAdd({ description, amount, type, category, date: new Date().toISOString().split("T")[0] });
    setDescription("");
    setAmount("");
    setType("expense");
    setCategory("food");
  };

  function handleAddCat(e) {
    e.preventDefault();
    const ok = addCat(newCatInput);
    if (ok) {
      setCategory(newCatInput.trim());
      setNewCatInput("");
      setShowAddCat(false);
    }
  }

  return (
    <>
      {showImport && (
        <StatementImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); onRefresh?.(); }}
        />
      )}
      {showRecurring && (
        <Recurring onClose={() => setShowRecurring(false)} onChanged={() => onRefresh?.()} />
      )}

      <div className="fin-card rounded-2xl p-5 mb-4 anim-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="fin-label">{t("addTransaction")}</h2>
          <div className="flex items-center gap-1.5 shrink-0">
            <button type="button" onClick={() => setShowRecurring(true)} className="fin-icon-btn" title={t("recurringTitle")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
              </svg>
            </button>
            <button type="button" onClick={() => setShowImport(true)} className="fin-icon-btn" title={t("importStatement")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="fin-label">{t("description")}</label>
            <input
              type="text"
              placeholder={t("descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="fin-input w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="fin-label">{t("amount")}</label>
            <input
              type="number"
              placeholder={t("amountPlaceholder")}
              value={amount}
              min="0.01"
              step="0.01"
              onChange={(e) => setAmount(e.target.value)}
              className="fin-input fin-mono w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="fin-label">{t("type")}</label>
            <div className="type-toggle w-full">
              <button type="button" onClick={() => setType("income")} className={`type-btn flex-1 ${type === "income" ? "active-income" : ""}`}>
                + {t("incomeOption")}
              </button>
              <button type="button" onClick={() => setType("expense")} className={`type-btn flex-1 ${type === "expense" ? "active-expense" : ""}`}>
                − {t("expenseOption")}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="fin-label">{t("category")}</label>
              <button
                type="button"
                onClick={() => { setShowAddCat(v => !v); setNewCatInput(""); }}
                className="text-[11px] font-medium transition-opacity hover:opacity-70"
                style={{ color: "var(--brand)" }}
              >
                {showAddCat ? t("cancelBtn") : `+ ${t("catAddNew")}`}
              </button>
            </div>

            {showAddCat ? (
              <form onSubmit={handleAddCat} className="flex gap-2">
                <input
                  autoFocus
                  value={newCatInput}
                  onChange={e => setNewCatInput(e.target.value)}
                  placeholder={t("catAddPlaceholder")}
                  maxLength={30}
                  className="fin-input flex-1"
                />
                <button
                  type="submit"
                  disabled={!newCatInput.trim()}
                  className="fin-btn-primary px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  {t("addBtn")}
                </button>
              </form>
            ) : (
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="fin-select w-full appearance-none"
                >
                  {allCats.map((cat) => (
                    <option key={cat} value={cat}>
                      {t(cat)}
                    </option>
                  ))}
                </select>
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
                  style={{ backgroundColor: getCatColor(category) }}
                />
              </div>
            )}
          </div>

          <button type="submit" className="fin-btn-primary w-full h-11 rounded-xl mt-2">
            {t("addBtn")}
          </button>
        </form>
      </div>
    </>
  );
}

export default TransactionForm;
