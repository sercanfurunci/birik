import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useLang } from "./i18n.jsx";
import { useCurrency } from "./currency.jsx";
import Summary from "./Summary.jsx";

const catColors = {
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

function Dashboard({ transactions }) {
  const { t, formatDate } = useLang();
  const { symbol } = useCurrency();

  const expenses = transactions.filter((tx) => tx.type === "expense");
  const totalExpenses = expenses.reduce((s, tx) => s + parseFloat(tx.amount), 0);

  const catData = Object.entries(
    expenses.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + parseFloat(tx.amount);
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const recent = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0].payload;
    return (
      <div className="fin-card rounded-xl px-3 py-2 text-sm shadow-lg">
        <p className="font-medium capitalize" style={{ color: "var(--text-1)" }}>{t(name)}</p>
        <p className="fin-mono font-bold" style={{ color: catColors[name] || catColors.other }}>
          {symbol}{fmt(value)}
        </p>
      </div>
    );
  };

  return (
    <div className="anim-1 lg:grid lg:grid-cols-[5fr_7fr] lg:gap-5 lg:items-start">

      {/* ── Left col: Summary ── */}
      <div className="lg:sticky lg:top-6">
        <Summary transactions={transactions} />
      </div>

      {/* ── Right col: chart + recent ── */}
      <div className="space-y-4">
        {/* Category donut */}
        {catData.length > 0 ? (
          <div className="fin-card rounded-2xl p-5">
            <p className="fin-label mb-4">{t("expenseBreakdown")}</p>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div style={{ width: 180, height: 180, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={catData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {catData.map((entry) => (
                        <Cell key={entry.name} fill={catColors[entry.name] || catColors.other} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 w-full space-y-2.5">
                {catData.map(({ name, value }) => (
                  <div key={name} className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: catColors[name] || catColors.other }}
                    />
                    <span className="text-sm capitalize flex-1 truncate" style={{ color: "var(--text-2)" }}>
                      {t(name)}
                    </span>
                    <div
                      className="h-1 rounded-full overflow-hidden"
                      style={{ width: 64, backgroundColor: "var(--surface-2)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${totalExpenses > 0 ? (value / totalExpenses) * 100 : 0}%`,
                          backgroundColor: catColors[name] || catColors.other,
                        }}
                      />
                    </div>
                    <span
                      className="fin-mono text-xs font-semibold shrink-0"
                      style={{ color: "var(--text-1)", minWidth: 60, textAlign: "right" }}
                    >
                      {symbol}{fmt(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          transactions.length === 0 && (
            <div className="fin-card rounded-2xl py-14 text-center">
              <p className="text-sm" style={{ color: "var(--text-3)" }}>
                {t("noTransactionsDash")}
              </p>
            </div>
          )
        )}

        {/* Recent activity */}
        {recent.length > 0 && (
          <div className="fin-card rounded-2xl overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <p className="fin-label">{t("recentActivity")}</p>
            </div>
            {recent.map((tx, i) => (
              <div
                key={tx.id}
                className={`tx-card-row flex items-center gap-3 px-5 py-3.5 ${tx.type === "income" ? "tx-income" : "tx-expense"}`}
                style={{ borderBottom: i < recent.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${catColors[tx.category] || catColors.other}18` }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: catColors[tx.category] || catColors.other }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>
                    {tx.description}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                    {formatDate(tx.date)} · {t(tx.category)}
                  </p>
                </div>
                <span
                  className="fin-mono text-sm font-bold shrink-0"
                  style={{ color: tx.type === "income" ? "var(--green)" : "var(--red)" }}
                >
                  {tx.type === "income" ? "+" : "−"}{symbol}{fmt(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
