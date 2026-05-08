import { useLang } from "./i18n.jsx";
import { useCurrency } from "./currency.jsx";

const fmt = (n) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Summary({ transactions }) {
  const { t } = useLang();
  const { symbol } = useCurrency();

  const totalIncome = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

  const totalExpenses = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

  const balance = totalIncome - totalExpenses;
  const isPositive = balance >= 0;

  return (
    <div className="mb-5 sm:mb-7 anim-1">
      {/* Balance — hero card */}
      <div
        className="fin-card-elev relative overflow-hidden rounded-2xl p-6 sm:p-8 mb-3"
      >
        <p className="fin-label">{t("balance")}</p>
        <p
          className="fin-display mt-2"
          style={{
            color: isPositive ? "var(--gold)" : "var(--red)",
            fontSize: "clamp(1.9rem, 4vw, 2.9rem)",
            lineHeight: 1.05,
          }}
        >
          {!isPositive && "−"}{symbol}{fmt(Math.abs(balance))}
        </p>
        <p className="text-xs mt-2" style={{ color: "var(--text-3)" }}>
          {transactions.length} {transactions.length === 1 ? "transaction" : "transactions"} recorded
        </p>

        {/* Bottom accent bar */}
        <div
          className="fin-bar"
          style={{ background: isPositive ? "var(--gold)" : "var(--red)" }}
        />
      </div>

      {/* Income + Expenses */}
      <div className="grid grid-cols-2 gap-3">
        <div className="fin-card relative overflow-hidden rounded-2xl p-4 sm:p-5">
          <p className="fin-label">{t("income")}</p>
          <p
            className="fin-display mt-2"
            style={{ color: "var(--green)", fontSize: "clamp(1.15rem, 2.5vw, 1.55rem)", lineHeight: 1.1 }}
          >
            +{symbol}{fmt(totalIncome)}
          </p>
          <div className="fin-bar" style={{ background: "var(--green)" }} />
        </div>

        <div className="fin-card relative overflow-hidden rounded-2xl p-4 sm:p-5">
          <p className="fin-label">{t("expenses")}</p>
          <p
            className="fin-display mt-2"
            style={{ color: "var(--red)", fontSize: "clamp(1.15rem, 2.5vw, 1.55rem)", lineHeight: 1.1 }}
          >
            −{symbol}{fmt(totalExpenses)}
          </p>
          <div className="fin-bar" style={{ background: "var(--red)" }} />
        </div>
      </div>
    </div>
  );
}

export default Summary;
