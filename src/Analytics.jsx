import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useLang } from "./i18n.jsx";
import { useCurrency } from "./currency.jsx";

const catColors = {
  food:          "#F97316",
  housing:       "#3B82F6",
  utilities:     "#EAB308",
  transport:     "#06B6D4",
  entertainment: "#EC4899",
  salary:        "#10B981",
  other:         "#94A3B8",
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const fmt = (n) =>
  parseFloat(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function StatCard({ label, value, sub }) {
  return (
    <div className="fin-card rounded-xl p-4">
      <p className="fin-label">{label}</p>
      <p
        className="fin-mono text-xl font-bold mt-2"
        style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-1 truncate" style={{ color: "var(--text-3)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function CustomBarTooltip({ active, payload, label, symbol, t }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="fin-card rounded-xl px-3 py-2 text-xs shadow-lg space-y-1">
      <p className="font-medium mb-1" style={{ color: "var(--text-2)" }}>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.fill }} />
          <span style={{ color: "var(--text-1)" }} className="fin-mono font-semibold">
            {symbol}{fmt(p.value)}
          </span>
          <span style={{ color: "var(--text-3)" }}>{p.dataKey === "expenses" ? t("expenses") : t("income")}</span>
        </div>
      ))}
    </div>
  );
}

function Analytics({ transactions }) {
  const { t } = useLang();
  const { symbol } = useCurrency();

  if (transactions.length === 0) {
    return (
      <div className="fin-card rounded-2xl py-16 text-center anim-1">
        <p className="text-sm" style={{ color: "var(--text-3)" }}>
          {t("noTransactionsAnalytics")}
        </p>
      </div>
    );
  }

  const txDate = (date) => (date ? date.split("T")[0] : "");

  const expenses = transactions.filter((tx) => tx.type === "expense");
  const income = transactions.filter((tx) => tx.type === "income");
  const totalExpenses = expenses.reduce((s, tx) => s + parseFloat(tx.amount), 0);
  const avgExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;

  const dayCount = [0, 0, 0, 0, 0, 0, 0];
  transactions.forEach((tx) => { dayCount[new Date(txDate(tx.date)).getDay()]++; });
  const busiestDayIdx = dayCount.indexOf(Math.max(...dayCount));
  const busiestDay = DAYS[busiestDayIdx];

  const biggestExpense = expenses.length > 0
    ? Math.max(...expenses.map((tx) => parseFloat(tx.amount)))
    : 0;

  // Month-over-month spending trends
  const now = new Date();
  const ymKey = (offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const thisYM = ymKey(0);
  const lastYM = ymKey(-1);
  const sumByCatForMonth = (ym) => {
    const acc = {};
    for (const tx of expenses) {
      if (txDate(tx.date).slice(0, 7) !== ym) continue;
      acc[tx.category] = (acc[tx.category] || 0) + parseFloat(tx.amount);
    }
    return acc;
  };
  const thisCat = sumByCatForMonth(thisYM);
  const lastCat = sumByCatForMonth(lastYM);
  const thisTotal = Object.values(thisCat).reduce((s, v) => s + v, 0);
  const lastTotal = Object.values(lastCat).reduce((s, v) => s + v, 0);
  const totalChange = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : null;

  const allCats = new Set([...Object.keys(thisCat), ...Object.keys(lastCat)]);
  const movers = [...allCats]
    .map((cat) => {
      const cur = thisCat[cat] || 0;
      const prev = lastCat[cat] || 0;
      const diff = cur - prev;
      const pct = prev > 0 ? (diff / prev) * 100 : (cur > 0 ? 100 : 0);
      return { cat, cur, prev, diff, pct };
    })
    .filter((m) => m.cur > 0 || m.prev > 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 3);

  const hasTrendData = lastTotal > 0 || thisTotal > 0;

  // Last 30 days bar chart data
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().split("T")[0];
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      expenses: expenses
        .filter((tx) => txDate(tx.date) === key)
        .reduce((s, tx) => s + parseFloat(tx.amount), 0),
      income: income
        .filter((tx) => txDate(tx.date) === key)
        .reduce((s, tx) => s + parseFloat(tx.amount), 0),
    };
  });

  // Category breakdown
  const catData = Object.entries(
    expenses.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + parseFloat(tx.amount);
      return acc;
    }, {})
  )
    .map(([cat, value]) => ({
      cat,
      value,
      pct: totalExpenses > 0 ? (value / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4 anim-1">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={t("avgExpense")}
          value={`${symbol}${fmt(avgExpense)}`}
          sub={`${expenses.length} expenses total`}
        />
        <StatCard
          label={t("busiestDay")}
          value={busiestDay.slice(0, 3)}
          sub={busiestDay}
        />
        <StatCard
          label={t("transactions")}
          value={transactions.length}
          sub={`${income.length} income · ${expenses.length} expenses`}
        />
        <StatCard
          label={t("biggestExpense")}
          value={`${symbol}${fmt(biggestExpense)}`}
          sub={expenses.find((tx) => parseFloat(tx.amount) === biggestExpense)?.description}
        />
      </div>

      {/* Spending Trends */}
      {hasTrendData && (
        <div className="fin-card rounded-2xl p-5">
          <p className="fin-label mb-4">{t("spendingTrends")}</p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--text-3)" }}>{t("thisMonth")}</p>
              <p className="fin-mono text-xl font-bold" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>
                {symbol}{fmt(thisTotal)}
              </p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--text-3)" }}>{t("lastMonth")}</p>
              <p className="fin-mono text-xl font-bold" style={{ color: "var(--text-3)", letterSpacing: "-0.02em" }}>
                {symbol}{fmt(lastTotal)}
              </p>
            </div>
          </div>

          {totalChange !== null && (
            <div className="flex items-center gap-2 mb-4 pb-4" style={{ borderBottom: movers.length > 0 ? "1px solid var(--border)" : "none" }}>
              <div
                className="px-2.5 py-1 rounded-md flex items-center gap-1 text-xs font-semibold"
                style={{
                  backgroundColor: totalChange > 0 ? "rgba(248,113,113,0.12)" : "rgba(16,185,129,0.12)",
                  color: totalChange > 0 ? "var(--red)" : "var(--green)",
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  {totalChange > 0
                    ? <polyline points="6 15 12 9 18 15" />
                    : <polyline points="6 9 12 15 18 9" />}
                </svg>
                {Math.abs(totalChange).toFixed(1)}%
              </div>
              <span className="text-xs" style={{ color: "var(--text-3)" }}>{t("vsLastMonth")}</span>
            </div>
          )}

          {movers.length > 0 && (
            <div>
              <p className="fin-label mb-3">{t("topMovers")}</p>
              <div className="space-y-2.5">
                {movers.map(({ cat, cur, diff, pct }) => {
                  const up = diff > 0;
                  return (
                    <div key={cat} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: catColors[cat] || catColors.other }}
                        />
                        <span className="text-sm capitalize" style={{ color: "var(--text-2)" }}>
                          {t(cat)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="fin-mono text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                          {symbol}{fmt(cur)}
                        </span>
                        <span
                          className="text-xs font-semibold flex items-center gap-0.5"
                          style={{ color: up ? "var(--red)" : "var(--green)", minWidth: 56, justifyContent: "flex-end" }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            {up ? <polyline points="6 15 12 9 18 15" /> : <polyline points="6 9 12 15 18 9" />}
                          </svg>
                          {Math.abs(pct).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bar chart: last 30 days */}
      <div className="fin-card rounded-2xl p-5">
        <p className="fin-label mb-4">{t("last30Days")}</p>
        <div style={{ height: 200, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last30} barGap={1} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "var(--text-3)", fontFamily: "JetBrains Mono" }}
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--text-3)", fontFamily: "JetBrains Mono" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (v === 0 ? "" : `${symbol}${v}`)}
              />
              <Tooltip content={<CustomBarTooltip symbol={symbol} t={t} />} cursor={{ fill: "var(--surface-2)", radius: 4 }} />
              <Bar dataKey="income"   fill="var(--green)" radius={[3, 3, 0, 0]} opacity={0.75} />
              <Bar dataKey="expenses" fill="var(--red)"   radius={[3, 3, 0, 0]} opacity={0.75} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-5 mt-3 justify-center">
          {[[" var(--green)", t("income")], ["var(--red)", t("expenses")]].map(([color, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color, opacity: 0.75 }} />
              <span className="text-xs" style={{ color: "var(--text-2)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category breakdown */}
      {catData.length > 0 && (
        <div className="fin-card rounded-2xl p-5">
          <p className="fin-label mb-4">{t("byCategory")}</p>
          <div className="space-y-4">
            {catData.map(({ cat, value, pct }) => (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: catColors[cat] || catColors.other }}
                    />
                    <span className="text-sm capitalize" style={{ color: "var(--text-2)" }}>
                      {t(cat)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: "var(--text-3)" }}>
                      {pct.toFixed(1)}%
                    </span>
                    <span
                      className="fin-mono text-sm font-semibold"
                      style={{ color: "var(--text-1)", minWidth: 64, textAlign: "right" }}
                    >
                      {symbol}{fmt(value)}
                    </span>
                  </div>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: "var(--surface-2)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: catColors[cat] || catColors.other,
                      transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;
