import { useState } from "react";
import { useLang } from "./i18n.jsx";
import StatementImportModal from "./StatementImportModal.jsx";
import Recurring from "./Recurring.jsx";

const categories = [
  "food",
  "housing",
  "utilities",
  "transport",
  "entertainment",
  "salary",
  "other",
];

function TransactionForm({ onAdd, onRefresh }) {
  const { t } = useLang();

  const [showImport, setShowImport] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("food");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!amount) return;

    onAdd({
      description,
      amount,
      type,
      category,
      date: new Date().toISOString().split("T")[0],
    });

    setDescription("");
    setAmount("");
    setType("expense");
    setCategory("food");
  };

  return (
    <>
      {/* Import Modal */}
      {showImport && (
        <StatementImportModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            onRefresh?.();
          }}
        />
      )}

      {/* Recurring Modal */}
      {showRecurring && (
        <Recurring
          onClose={() => setShowRecurring(false)}
          onChanged={() => onRefresh?.()}
        />
      )}

      <div className="fin-card rounded-2xl p-5 mb-4 anim-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="fin-label">{t("addTransaction")}</h2>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowRecurring(true)}
                className="fin-icon-btn"
                title={t("recurringTitle")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                  <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setShowImport(true)}
                className="fin-icon-btn"
                title={t("importStatement")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Description */}
            <div className="space-y-1.5">
              <label className="fin-label">
                {t("description")}
              </label>

              <input
                type="text"
                placeholder={t("descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="fin-input w-full"
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="fin-label">
                {t("amount")}
              </label>

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

            {/* Type */}
            <div className="space-y-1.5">
              <label className="fin-label">
                {t("type")}
              </label>

              <div className="type-toggle w-full">
                <button
                  type="button"
                  onClick={() => setType("income")}
                  className={`type-btn flex-1 ${
                    type === "income" ? "active-income" : ""
                  }`}
                >
                  + {t("incomeOption")}
                </button>

                <button
                  type="button"
                  onClick={() => setType("expense")}
                  className={`type-btn flex-1 ${
                    type === "expense" ? "active-expense" : ""
                  }`}
                >
                  − {t("expenseOption")}
                </button>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="fin-label">
                {t("category")}
              </label>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="fin-select w-full appearance-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(cat)}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="fin-btn-primary w-full h-11 rounded-xl mt-2"
            >
              {t("addBtn")}
            </button>
          </form>
      </div>
    </>
  );
}

export default TransactionForm;
