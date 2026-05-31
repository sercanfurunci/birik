import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, ReferenceLine } from "recharts";
import { useLang } from "./i18n.jsx";
import { useCurrency } from "./currency.jsx";
import { useCategories } from "./categories.jsx";
import Summary from "./Summary.jsx";

const API = import.meta.env.VITE_API_URL;

function authFetch(url, opts = {}) {
  const token = localStorage.getItem("auth_token");
  return fetch(url, { ...opts, credentials: "include", headers: { ...opts.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
}

const fmt = (n) =>
  parseFloat(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function ChartTooltip({ active, payload, t, symbol, getCatColor }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div className="fin-card rounded-xl px-3 py-2 text-sm shadow-lg">
      <p className="font-medium capitalize" style={{ color: "var(--text-1)" }}>{t(name)}</p>
      <p className="fin-mono font-bold" style={{ color: getCatColor(name, "expense") }}>
        {symbol}{fmt(value)}
      </p>
    </div>
  );
}

function DailyTooltip({ active, payload, symbol, t, transactions, getCatColor, thisMonthPrefix }) {
  if (!active || !payload?.length) return null;
  const { day, net } = payload[0].payload;
  if (net === 0) return null;
  const dayStr = `${thisMonthPrefix}-${String(day).padStart(2, "0")}`;
  const dayTxs = transactions
    .filter(tx => (tx.date || "").slice(0, 10) === dayStr)
    .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
  const isPos = net >= 0;
  return (
    <div className="fin-card rounded-xl p-3 shadow-lg" style={{ maxWidth: 240, minWidth: 180 }}>
      <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-3)" }}>
        {t("dailyDistDay")} {day}
      </p>
      <div className="space-y-1.5">
        {dayTxs.map(tx => (
          <div key={tx.id} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getCatColor(tx.category, tx.type) }} />
            <span className="text-xs flex-1 truncate" style={{ color: "var(--text-2)" }}>
              {tx.description || t(tx.category)}
            </span>
            <span className="fin-mono text-xs font-semibold shrink-0" style={{ color: tx.type === "income" ? "var(--green)" : "var(--red)" }}>
              {tx.type === "income" ? "+" : "−"}{symbol}{fmt(tx.amount)}
            </span>
          </div>
        ))}
      </div>
      {dayTxs.length > 1 && (
        <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
          <span className="text-xs" style={{ color: "var(--text-3)" }}>Net</span>
          <span className="fin-mono text-xs font-bold" style={{ color: isPos ? "var(--green)" : "var(--red)" }}>
            {isPos ? "+" : "−"}{symbol}{fmt(Math.abs(net))}
          </span>
        </div>
      )}
    </div>
  );
}

function Dashboard({ transactions, onNavigate }) {
  const { t, formatDate } = useLang();
  const { symbol } = useCurrency();
  const { getCatColor } = useCategories();
  const [goals, setGoals] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [budgets, setBudgets] = useState([]);

  useEffect(() => {
    authFetch(`${API}/goals`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setGoals(d); })
      .catch(() => {});
    authFetch(`${API}/recurring`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setRecurring(d); })
      .catch(() => {});
    authFetch(`${API}/subscriptions`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSubscriptions(d); })
      .catch(() => {});
    authFetch(`${API}/budgets`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setBudgets(d); })
      .catch(() => {});
  }, []);

  const expenses = transactions.filter((tx) => tx.type === "expense");
  const totalExpenses = expenses.reduce((s, tx) => s + (parseFloat(tx.amount) || 0), 0);

  const catData = Object.entries(
    expenses.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + parseFloat(tx.amount);
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const sortByDateDesc = (a, b) => {
    const d = new Date(b.date) - new Date(a.date);
    return d !== 0 ? d : b.id - a.id;
  };

  const recent = [...transactions].sort(sortByDateDesc).slice(0, 5);

  // Running balance per transaction (oldest→newest, id as tiebreaker for same-day)
  const runningBalanceMap = {};
  let runningBal = 0;
  [...transactions]
    .sort((a, b) => {
      const d = new Date(a.date) - new Date(b.date);
      return d !== 0 ? d : a.id - b.id;
    })
    .forEach(tx => {
      runningBal += tx.type === "income" ? parseFloat(tx.amount) : -parseFloat(tx.amount);
      runningBalanceMap[tx.id] = runningBal;
    });

  // ── This month stats ──
  const now = new Date();
  const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthPrefix = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const thisMonthExp = transactions.filter(tx => tx.type === "expense" && (tx.date || "").slice(0, 7) === thisMonthPrefix);
  const prevMonthExp = transactions.filter(tx => tx.type === "expense" && (tx.date || "").slice(0, 7) === prevMonthPrefix);
  const thisMonthTotal = thisMonthExp.reduce((s, tx) => s + (parseFloat(tx.amount) || 0), 0);
  const prevMonthTotal = prevMonthExp.reduce((s, tx) => s + (parseFloat(tx.amount) || 0), 0);
  const dayElapsed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - dayElapsed;
  const avgDaily = dayElapsed > 0 ? thisMonthTotal / dayElapsed : 0;
  const monthChange = prevMonthTotal > 0 ? ((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : null;

  // Median of per-day expense totals across elapsed days — robust to one-off spikes
  const dailyExpenseTotals = Array.from({ length: dayElapsed }, () => 0);
  thisMonthExp.forEach(tx => {
    const d = parseInt((tx.date || "").slice(8, 10), 10);
    if (d >= 1 && d <= dayElapsed) dailyExpenseTotals[d - 1] += parseFloat(tx.amount) || 0;
  });
  const sortedDaily = [...dailyExpenseTotals].sort((a, b) => a - b);
  const medianDaily = sortedDaily.length
    ? (sortedDaily.length % 2
        ? sortedDaily[(sortedDaily.length - 1) / 2]
        : (sortedDaily[sortedDaily.length / 2 - 1] + sortedDaily[sortedDaily.length / 2]) / 2)
    : 0;
  const variableRate = (dayElapsed >= 5 && medianDaily > 0) ? medianDaily : avgDaily;

  // Known upcoming charges this month: active expense recurring rules + auto-charge subscriptions
  const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const parseLocalDate = (s) => {
    if (!s) return null;
    const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };
  const sumFutureCharges = (nextDateStr, frequency, amount, ruleEndStr, dayOfPeriod) => {
    const cursor = parseLocalDate(nextDateStr);
    if (!cursor) return 0;
    const ruleEnd = parseLocalDate(ruleEndStr);
    let total = 0;
    let safety = 0;
    while (cursor <= monthEndDate && (!ruleEnd || cursor <= ruleEnd) && safety < 60) {
      total += parseFloat(amount) || 0;
      if (frequency === "weekly") cursor.setDate(cursor.getDate() + 7);
      else if (frequency === "monthly") {
        cursor.setMonth(cursor.getMonth() + 1);
        if (dayOfPeriod) {
          const dim = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
          cursor.setDate(Math.min(dayOfPeriod, dim));
        }
      } else if (frequency === "yearly") cursor.setFullYear(cursor.getFullYear() + 1);
      else break;
      safety++;
    }
    return total;
  };
  const fixedFromRecurring = recurring
    .filter(r => r.is_active && r.type === "expense")
    .reduce((s, r) => s + sumFutureCharges(r.next_run_date, r.frequency, r.amount, r.end_date, r.day_of_period), 0);
  const fixedFromSubs = subscriptions
    .filter(s => s.is_active && s.auto_charge)
    .reduce((s, sub) => s + sumFutureCharges(sub.next_billing_date, sub.billing_cycle, sub.amount, null, null), 0);
  const fixedUpcoming = fixedFromRecurring + fixedFromSubs;

  // End-of-month projection — needs at least 3 days of data and 2 transactions to be meaningful
  const variableRemaining = variableRate * daysLeft;
  const projectedMonthTotal = thisMonthTotal + variableRemaining + fixedUpcoming;
  const showProjection = thisMonthExp.length >= 2 && dayElapsed >= 3 && daysLeft > 0;
  const projVsLast = prevMonthTotal > 0
    ? ((projectedMonthTotal - prevMonthTotal) / prevMonthTotal) * 100
    : null;
  const monthProgressPct = (dayElapsed / daysInMonth) * 100;
  const topCatThisMonth = Object.entries(
    thisMonthExp.reduce((acc, tx) => { acc[tx.category] = (acc[tx.category] || 0) + parseFloat(tx.amount); return acc; }, {})
  ).sort((a, b) => b[1] - a[1])[0];

  // ── Daily net data for current month ──
  const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dayStr = `${thisMonthPrefix}-${String(day).padStart(2, "0")}`;
    const dayTxs = transactions.filter(tx => (tx.date || "").slice(0, 10) === dayStr);
    const net = dayTxs.reduce((s, tx) => s + (tx.type === "income" ? 1 : -1) * (parseFloat(tx.amount) || 0), 0);
    return { day, net };
  });
  const hasAnyDailyData = dailyData.some(d => d.net !== 0);

  const largestExpense = expenses.length > 0
    ? expenses.reduce((max, tx) => parseFloat(tx.amount) > parseFloat(max.amount) ? tx : max, expenses[0])
    : null;

  // Budget alerts: categories at 80%+ of monthly budget
  const thisMonthSpendByCat = thisMonthExp.reduce((acc, tx) => {
    acc[tx.category] = (acc[tx.category] || 0) + (parseFloat(tx.amount) || 0);
    return acc;
  }, {});
  const budgetAlerts = budgets
    .map(b => ({
      ...b,
      spent: thisMonthSpendByCat[b.category] || 0,
      pct: (thisMonthSpendByCat[b.category] || 0) / parseFloat(b.amount) * 100,
    }))
    .filter(b => b.pct >= 80)
    .sort((a, b) => b.pct - a.pct);
  const allTimeIncome = transactions.filter(tx => tx.type === "income").reduce((s, tx) => s + (parseFloat(tx.amount) || 0), 0);
  const savingsRate = allTimeIncome > 0 ? ((allTimeIncome - totalExpenses) / allTimeIncome) * 100 : null;

  if (transactions.length === 0) {
    return (
      <div className="anim-1">
        <Summary transactions={transactions} />
        <div className="fin-card rounded-2xl py-14 px-6 text-center mt-4 anim-2">
          <div
            className="mx-auto mb-4 flex items-center justify-center"
            style={{
              width: 56, height: 56, borderRadius: 14,
              backgroundColor: "var(--brand-dim)",
              color: "var(--brand)",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <p className="font-semibold text-base mb-1.5" style={{ color: "var(--text-1)" }}>{t("noTransactionsDash")}</p>
          <p className="text-sm mb-5 max-w-xs mx-auto" style={{ color: "var(--text-3)" }}>{t("addFirstTransaction")}</p>
          {onNavigate && (
            <button onClick={() => onNavigate("transactions")} className="fin-btn-primary">
              {t("navAdd")}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="anim-1">
      {/* ── Full-width summary row ── */}
      <Summary transactions={transactions} />

      {/* ── Chart + Recent side by side on desktop ── */}
      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[5fr_4fr] lg:gap-5 lg:items-stretch">
        {/* Category donut */}
        {catData.length > 0 ? (
          <div className="fin-card rounded-2xl p-5 flex flex-col">
            <p className="fin-label mb-4">{t("expenseBreakdown")}</p>
            <div className="flex flex-col sm:flex-row items-center gap-6 flex-1">
              <div style={{ width: 220, height: 220, flexShrink: 0, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={catData}
                      cx="50%"
                      cy="50%"
                      innerRadius={66}
                      outerRadius={96}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {catData.map((entry) => (
                        <Cell key={entry.name} fill={getCatColor(entry.name, "expense")} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip t={t} symbol={symbol} getCatColor={getCatColor} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 w-full space-y-3">
                {catData.map(({ name, value }) => (
                  <div key={name} className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: getCatColor(name, "expense") }}
                    />
                    <span className="text-sm capitalize flex-1 truncate" style={{ color: "var(--text-2)" }}>
                      {t(name)}
                    </span>
                    <div
                      className="h-1 rounded-full overflow-hidden shrink-0"
                      style={{ width: 64, backgroundColor: "var(--surface-2)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${totalExpenses > 0 ? (value / totalExpenses) * 100 : 0}%`,
                          backgroundColor: getCatColor(name, "expense"),
                        }}
                      />
                    </div>
                    <div className="shrink-0 text-right" style={{ minWidth: 88 }}>
                      <div className="fin-mono text-xs font-semibold" style={{ color: "var(--text-1)" }}>
                        {symbol}{fmt(value)}
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-3)" }}>
                        {totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
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
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base"
                  style={{ backgroundColor: `${getCatColor(tx.category, tx.type)}18` }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCatColor(tx.category, tx.type) }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>
                    {tx.description}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                    {formatDate(tx.date)} · {t(tx.category)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="fin-mono text-sm font-bold" style={{ color: tx.type === "income" ? "var(--green)" : "var(--red)" }}>
                    {tx.type === "income" ? "+" : "−"}{symbol}{fmt(tx.amount)}
                  </div>
                  {runningBalanceMap[tx.id] !== undefined && (
                    <div className="fin-mono text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                      {runningBalanceMap[tx.id] >= 0 ? "" : "−"}{symbol}{fmt(Math.abs(runningBalanceMap[tx.id]))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Daily balance chart ── */}
      {hasAnyDailyData && (
        <div className="mt-4 fin-card rounded-2xl p-5 anim-3">
          <p className="fin-label mb-4">{t("dailyDist")}</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dailyData} barCategoryGap="20%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "var(--text-3)", fontFamily: "inherit" }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis hide />
              <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 2" />
              <Tooltip content={<DailyTooltip symbol={symbol} t={t} transactions={transactions} getCatColor={getCatColor} thisMonthPrefix={thisMonthPrefix} />} cursor={{ fill: "var(--surface-2)", radius: 4 }} />
              <Bar dataKey="net" radius={[3, 3, 0, 0]} maxBarSize={18}>
                {dailyData.map((entry) => (
                  <Cell
                    key={entry.day}
                    fill={entry.net >= 0 ? "var(--green)" : "var(--red)"}
                    fillOpacity={entry.net === 0 ? 0 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── End-of-month projection ── */}
      {showProjection && (
        <div className="fin-card rounded-2xl p-5 mt-4 anim-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="fin-label mb-2">{t("projTitle")}</p>
              <p
                className="fin-mono font-bold"
                style={{
                  color: "var(--text-1)",
                  fontSize: "clamp(1.5rem, 2.2vw, 2rem)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                {symbol}{fmt(projectedMonthTotal)}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
                {t("projSubtitle")}
              </p>
            </div>
            {projVsLast !== null && (
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0"
                style={{
                  backgroundColor: projVsLast <= 0 ? "color-mix(in srgb, var(--green) 12%, transparent)" : "color-mix(in srgb, var(--red) 12%, transparent)",
                  color: projVsLast <= 0 ? "var(--green)" : "var(--red)",
                }}
              >
                {projVsLast > 0 ? "+" : ""}{projVsLast.toFixed(1)}% {t("projVsLast")}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-4 text-xs flex-wrap" style={{ color: "var(--text-3)" }}>
            <span>
              <span className="fin-mono font-semibold" style={{ color: "var(--text-2)" }}>{symbol}{fmt(thisMonthTotal)}</span> {t("projSpentSoFar")}
            </span>
            <span style={{ color: "var(--border)" }}>·</span>
            <span>
              <span className="fin-mono font-semibold" style={{ color: "var(--text-2)" }}>{daysLeft}</span> {t("projDaysLeft")}
            </span>
            {fixedUpcoming > 0 && (
              <>
                <span style={{ color: "var(--border)" }}>·</span>
                <span title={t("projScheduledTooltip")}>
                  <span className="fin-mono font-semibold" style={{ color: "var(--text-2)" }}>+{symbol}{fmt(fixedUpcoming)}</span> {t("projScheduled")}
                </span>
              </>
            )}
          </div>

          <div className="mt-3">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${monthProgressPct}%`,
                  backgroundColor: "var(--brand)",
                  transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
                }}
              />
            </div>
            <p className="text-xs mt-1.5" style={{ color: "var(--text-3)" }}>
              {t("projMonthProgress", { done: dayElapsed, total: daysInMonth })}
            </p>
          </div>
        </div>
      )}

      {/* ── This month quick stats ── */}
      {thisMonthExp.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 anim-5">
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

          {/* Largest single expense */}
          <div className="fin-card rounded-2xl p-4">
            <p className="fin-label mb-2">{t("statLargestExp")}</p>
            {largestExpense ? (
              <>
                <p className="fin-mono font-semibold text-base" style={{ color: "var(--red)" }}>
                  −{symbol}{fmt(largestExpense.amount)}
                </p>
                <p className="text-xs mt-1 truncate" style={{ color: "var(--text-3)" }}>
                  {largestExpense.description || t(largestExpense.category)}
                </p>
              </>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-3)" }}>—</p>
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

      {/* ── Budget alerts widget ── */}
      {budgetAlerts.length > 0 && (
        <div className="mt-4 fin-card rounded-2xl overflow-hidden anim-5">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <p className="fin-label">{t("dashBudgetAlerts")}</p>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate("budgets")}
                className="text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: "var(--brand)" }}
              >
                {t("dashBudgetSeeAll")}
              </button>
            )}
          </div>
          <div>
            {budgetAlerts.map((b, i) => {
              const over = b.pct >= 100;
              const barColor = over ? "var(--red)" : "var(--yellow, #F59E0B)";
              return (
                <div key={b.id} className="px-5 py-3.5" style={i > 0 ? { borderTop: "1px solid var(--border)" } : {}}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize" style={{ color: "var(--text-1)" }}>{t(b.category)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="fin-mono text-xs font-semibold" style={{ color: "var(--text-2)" }}>
                        {symbol}{fmt(b.spent)} / {symbol}{fmt(parseFloat(b.amount))}
                      </span>
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                        style={{ backgroundColor: over ? "color-mix(in srgb, var(--red) 14%, transparent)" : "color-mix(in srgb, #F59E0B 14%, transparent)", color: over ? "var(--red)" : "#B45309" }}
                      >
                        {b.pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, b.pct)}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              );
            })}
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
          <div>
            {goals.slice(0, 3).map((g, i) => {
              const target = parseFloat(g.target_amount) || 0;
              const saved = parseFloat(g.saved_amount || 0);
              const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
              const done = pct >= 100;
              const barColor = done ? "var(--green)" : "var(--brand)";
              return (
                <div key={g.id} className="flex items-center gap-3 px-5 py-3.5" style={i > 0 ? { borderTop: "1px solid var(--border)" } : {}}>
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
