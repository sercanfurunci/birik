import { useLang } from "./i18n.jsx";
import { useCurrency } from "./currency.jsx";

const fmt = (n) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Summary({ transactions }) {
  const { t } = useLang();
  const { symbol } = useCurrency();

  const incomeTxs = transactions.filter((tx) => tx.type === "income");
  const expenseTxs = transactions.filter((tx) => tx.type === "expense");

  const totalIncome = incomeTxs.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
  const totalExpenses = expenseTxs.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

  const balance = totalIncome - totalExpenses;
  const isPositive = balance >= 0;

  return (
    <div className="mb-5 sm:mb-6 anim-1 lg:grid lg:grid-cols-[2fr_1fr_1fr] lg:gap-3">
      {/* Balance — hero card */}
      <div className="fin-card-elev relative overflow-hidden rounded-2xl p-6 sm:p-7 mb-3 lg:mb-0">
        <p className="fin-label">{t("balance")}</p>
        <p
          className="fin-display mt-2"
          style={{
            color: isPositive ? "var(--gold)" : "var(--red)",
            fontSize: "clamp(1.75rem, 2.8vw, 2.6rem)",
            lineHeight: 1.05,
          }}
        >
          {!isPositive && "−"}{symbol}{fmt(Math.abs(balance))}
        </p>
        <p className="text-xs mt-2" style={{ color: "var(--text-3)" }}>
          {t("transactionsRecorded", { count: transactions.length })}
        </p>
        <div className="fin-bar" style={{ background: isPositive ? "var(--gold)" : "var(--red)" }} />
      </div>

      {/* Income */}
      <div className="fin-card relative overflow-hidden rounded-2xl p-4 sm:p-5 mb-3 lg:mb-0">
        <p className="fin-label">{t("income")}</p>
        <p
          className="fin-display mt-2"
          style={{ color: "var(--green)", fontSize: "clamp(1.1rem, 1.6vw, 1.45rem)", lineHeight: 1.1 }}
        >
          +{symbol}{fmt(totalIncome)}
        </p>
        <p className="text-xs mt-2" style={{ color: "var(--text-3)" }}>
          {incomeTxs.length} {t("statTransactions")}
        </p>
        <div className="fin-bar" style={{ background: "var(--green)" }} />
      </div>

      {/* Expenses */}
      <div className="fin-card relative overflow-hidden rounded-2xl p-4 sm:p-5">
        <p className="fin-label">{t("expenses")}</p>
        <p
          className="fin-display mt-2"
          style={{ color: "var(--red)", fontSize: "clamp(1.1rem, 1.6vw, 1.45rem)", lineHeight: 1.1 }}
        >
          −{symbol}{fmt(totalExpenses)}
        </p>
        <p className="text-xs mt-2" style={{ color: "var(--text-3)" }}>
          {expenseTxs.length} {t("statTransactions")}
        </p>
        <div className="fin-bar" style={{ background: "var(--red)" }} />
      </div>
    </div>
  );
}

export default Summary;
