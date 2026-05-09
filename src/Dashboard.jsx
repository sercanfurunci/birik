import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useLang } from "./i18n.jsx";
import { useCurrency } from "./currency.jsx";
import Summary from "./Summary.jsx";

const API = import.meta.env.VITE_API_URL;

function authFetch(url, opts = {}) {
  const token = localStorage.getItem("auth_token");
  return fetch(url, { ...opts, credentials: "include", headers: { ...opts.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
}

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

function ChartTooltip({ active, payload, t, symbol }) {
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
}

function Dashboard({ transactions, onNavigate }) {
  const { t, formatDate } = useLang();
  const { symbol } = useCurrency();
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    authFetch(`${API}/goals`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setGoals(d); })
      .catch(() => {});
  }, []);

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

  // ── This month stats ──
  const now = new Date();
  const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthPrefix = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const thisMonthExp = transactions.filter(tx => tx.type === "expense" && (tx.date || "").slice(0, 7) === thisMonthPrefix);
  const prevMonthExp = transactions.filter(tx => tx.type === "expense" && (tx.date || "").slice(0, 7) === prevMonthPrefix);
  const thisMonthTotal = thisMonthExp.reduce((s, tx) => s + parseFloat(tx.amount), 0);
  const prevMonthTotal = prevMonthExp.reduce((s, tx) => s + parseFloat(tx.amount), 0);
  const dayElapsed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - dayElapsed;
  const avgDaily = dayElapsed > 0 ? thisMonthTotal / dayElapsed : 0;
  const monthChange = prevMonthTotal > 0 ? ((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : null;
  const topCatThisMonth = Object.entries(
    thisMonthExp.reduce((acc, tx) => { acc[tx.category] = (acc[tx.category] || 0) + parseFloat(tx.amount); return acc; }, {})
  ).sort((a, b) => b[1] - a[1])[0];
  const allTimeIncome = transactions.filter(tx => tx.type === "income").reduce((s, tx) => s + parseFloat(tx.amount), 0);
  const savingsRate = allTimeIncome > 0 ? ((allTimeIncome - totalExpenses) / allTimeIncome) * 100 : null;

  return (
    <div className="anim-1">
      {/* ── Full-width summary row ── */}
      <Summary transactions={transactions} />

      {/* ── Chart + Recent side by side on desktop ── */}
      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[5fr_4fr] lg:gap-5 lg:items-start">
        {/* Category donut */}
        {catData.length > 0 ? (
          <div className="fin-card rounded-2xl p-5">
            <p className="fin-label mb-4">{t("expenseBreakdown")}</p>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div style={{ width: 180, height: 180, flexShrink: 0, minWidth: 0 }}>
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
                    <Tooltip content={<ChartTooltip t={t} symbol={symbol} />} />
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

      {/* ── This month quick stats ── */}
      {thisMonthExp.length > 0 && (
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 anim-5">
          {/* Avg daily spend */}
          <div className="fin-card rounded-2xl p-4">
            <p className="fin-label mb-2">{t("statAvgDaily")}</p>
            <p className="fin-mono font-semibold text-base" style={{ color: "var(--text-1)" }}>
              {symbol}{fmt(avgDaily)}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
              {dayElapsed} {t("statDaysElapsed")}
            </p>
          </div>

          {/* Days left in month */}
          <div className="fin-card rounded-2xl p-4">
            <p className="fin-label mb-2">{t("statDaysLeft")}</p>
            <p className="fin-mono font-semibold text-base" style={{ color: "var(--brand)" }}>
              {daysLeft}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
              {t("statOfMonth")} {daysInMonth}
            </p>
          </div>

          {/* Top category this month */}
          <div className="fin-card rounded-2xl p-4">
            <p className="fin-label mb-2">{t("statTopCat")}</p>
            <p className="text-sm font-semibold capitalize" style={{ color: "var(--text-1)" }}>
              {topCatThisMonth ? t(topCatThisMonth[0]) : "—"}
            </p>
            {topCatThisMonth && (
              <p className="fin-mono text-xs mt-1" style={{ color: "var(--text-3)" }}>
                {symbol}{fmt(topCatThisMonth[1])}
              </p>
            )}
          </div>

          {/* vs last month / savings rate */}
          <div className="fin-card rounded-2xl p-4">
            {savingsRate !== null ? (
              <>
                <p className="fin-label mb-2">{t("statSavingsRate")}</p>
                <p className="fin-mono font-semibold text-base" style={{ color: savingsRate >= 0 ? "var(--green)" : "var(--red)" }}>
                  {savingsRate.toFixed(1)}%
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>{t("statAllTime")}</p>
              </>
            ) : monthChange !== null ? (
              <>
                <p className="fin-label mb-2">{t("statVsLastMonth")}</p>
                <p className="fin-mono font-semibold text-base" style={{ color: monthChange <= 0 ? "var(--green)" : "var(--red)" }}>
                  {monthChange > 0 ? "+" : ""}{monthChange.toFixed(1)}%
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>{t("statSpending")}</p>
              </>
            ) : (
              <>
                <p className="fin-label mb-2">{t("statThisMonth")}</p>
                <p className="fin-mono font-semibold text-base" style={{ color: "var(--red)" }}>
                  {symbol}{fmt(thisMonthTotal)}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Savings goals widget ── */}
      {goals.length > 0 && (
        <div className="mt-4 fin-card rounded-2xl overflow-hidden anim-5">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <p className="fin-label">{t("dashGoals")}</p>
            {onNavigate && (
              <button
                onClick={() => onNavigate("goals")}
                className="text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: "var(--brand)" }}
              >
                {t("dashGoalsSeeAll")} →
              </button>
            )}
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {goals.slice(0, 3).map(g => {
              const pct = Math.min(100, Math.round((parseFloat(g.saved_amount || 0) / parseFloat(g.target_amount)) * 100));
              const done = pct >= 100;
              const barColor = done ? "var(--green)" : "var(--brand)";
              return (
                <div key={g.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="text-lg shrink-0">{g.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>{g.name}</p>
                      <span className="fin-mono text-xs font-bold ml-3 shrink-0" style={{ color: barColor }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
