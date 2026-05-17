import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { useLang } from "./i18n.jsx";
import { useCurrency } from "./currency.jsx";
import { useCategories } from "./categories.jsx";
import { parseLocalDate } from "./dateUtils.js";

function isoFromLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 1970-01-04 (UTC) = Sunday → indices 0..6 align with Date.prototype.getDay()
const DAY_REFERENCE_DATES = [0, 1, 2, 3, 4, 5, 6].map((i) => new Date(Date.UTC(1970, 0, 4 + i)));
function formatDayName(dayIdx, locale, weekday) {
  return new Intl.DateTimeFormat(locale, { weekday, timeZone: "UTC" }).format(DAY_REFERENCE_DATES[dayIdx]);
}

const fmt = (n) =>
  parseFloat(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const txDate = (date) => (date ? date.split("T")[0] : "");

function StatCard({ label, value, sub }) {
  return (
    <div className="fin-card rounded-2xl p-4">
      <p className="fin-label">{label}</p>
      <p className="fin-mono text-xl font-bold mt-2" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-1 truncate" style={{ color: "var(--text-3)" }}>{sub}</p>}
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

// Build bar chart data based on selected range
function buildChartData(transactions, range) {
  const expenses = transactions.filter(tx => tx.type === "expense");
  const income = transactions.filter(tx => tx.type === "income");
  const now = new Date();

  if (range === "all") {
    // Monthly grouping
    const months = {};
    transactions.forEach(tx => {
      const m = txDate(tx.date).slice(0, 7);
      if (!months[m]) months[m] = { date: m, expenses: 0, income: 0 };
      if (tx.type === "expense") months[m].expenses += parseFloat(tx.amount);
      else months[m].income += parseFloat(tx.amount);
    });
    const sorted = Object.values(months).sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map(d => ({
      ...d,
      date: parseLocalDate(d.date + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    }));
  }

  let startDate = new Date(now);
  let days;

  if (range === "thisMonth") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    days = now.getDate();
  } else if (range === "lastMonth") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    days = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  } else if (range === "90d") {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 89);
    days = 90;
  } else {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 29);
    days = 30;
  }

  startDate.setHours(0, 0, 0, 0);
  const interval = days > 60 ? 13 : days > 30 ? 9 : 6;

  return { data: Array.from({ length: days }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = isoFromLocalDate(d);
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      expenses: expenses.filter(tx => txDate(tx.date) === key).reduce((s, tx) => s + (parseFloat(tx.amount) || 0), 0),
      income: income.filter(tx => txDate(tx.date) === key).reduce((s, tx) => s + (parseFloat(tx.amount) || 0), 0),
    };
  }), interval };
}

// Filter transactions by selected range
function filterByRange(transactions, range) {
  const now = new Date();
  let from, to;

  if (range === "all") return transactions;

  if (range === "30d") {
    from = new Date(now); from.setDate(from.getDate() - 29); from.setHours(0, 0, 0, 0);
    to = new Date(now); to.setHours(23, 59, 59, 999);
  } else if (range === "90d") {
    from = new Date(now); from.setDate(from.getDate() - 89); from.setHours(0, 0, 0, 0);
    to = new Date(now); to.setHours(23, 59, 59, 999);
  } else if (range === "thisMonth") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else if (range === "lastMonth") {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  }

  return transactions.filter(tx => {
    const d = parseLocalDate(txDate(tx.date));
    return d && (!from || d >= from) && (!to || d <= to);
  });
}

const RANGE_LABELS = {
  "30d":       { en: "30 Days",    tr: "30 Gün" },
  "90d":       { en: "90 Days",    tr: "90 Gün" },
  "thisMonth": { en: "This Month", tr: "Bu Ay" },
  "lastMonth": { en: "Last Month", tr: "Geç. Ay" },
  "all":       { en: "All Time",   tr: "Tümü" },
};

function Analytics({ transactions }) {
  const { t, lang } = useLang();
  const { symbol } = useCurrency();
  const { getCatColor } = useCategories();
  const [range, setRange] = useState("30d");

  const filtered = useMemo(() => filterByRange(transactions, range), [transactions, range]);

  if (transactions.length === 0) {
    return (
      <div className="fin-card rounded-2xl py-16 text-center anim-1">
        <p className="text-sm" style={{ color: "var(--text-3)" }}>{t("noTransactionsAnalytics")}</p>
      </div>
    );
  }

  const expenses = filtered.filter(tx => tx.type === "expense");
  const income = filtered.filter(tx => tx.type === "income");
  const totalExpenses = expenses.reduce((s, tx) => s + (parseFloat(tx.amount) || 0), 0);
  const avgExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;

  const dayCount = [0, 0, 0, 0, 0, 0, 0];
  filtered.forEach(tx => {
    const d = parseLocalDate(txDate(tx.date));
    if (d) dayCount[d.getDay()]++;
  });
  const maxDayCount = Math.max(...dayCount);
  const busiestDayIdx = maxDayCount > 0 ? dayCount.indexOf(maxDayCount) : null;
  const intlLocale = lang === "tr" ? "tr-TR" : "en-US";
  const busiestDayShort = busiestDayIdx != null ? formatDayName(busiestDayIdx, intlLocale, "short") : "—";
  const busiestDayLong  = busiestDayIdx != null ? formatDayName(busiestDayIdx, intlLocale, "long")  : "";

  const biggestExpense = expenses.length > 0 ? Math.max(...expenses.map(tx => parseFloat(tx.amount))) : 0;

  // Month-over-month (always uses all transactions for context)
  const now = new Date();
  const ymKey = (offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const thisYM = ymKey(0);
  const lastYM = ymKey(-1);
  const sumByCatForMonth = (ym) => {
    const acc = {};
    for (const tx of transactions.filter(tx => tx.type === "expense")) {
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

  const allMoverCats = new Set([...Object.keys(thisCat), ...Object.keys(lastCat)]);
  const movers = [...allMoverCats]
    .map(cat => {
      const cur = thisCat[cat] || 0;
      const prev = lastCat[cat] || 0;
      const diff = cur - prev;
      const pct = prev > 0 ? (diff / prev) * 100 : (cur > 0 ? 100 : 0);
      return { cat, cur, prev, diff, pct };
    })
    .filter(m => m.cur > 0 || m.prev > 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 3);

  const hasTrendData = lastTotal > 0 || thisTotal > 0;

  // Chart data
  const chartResult = buildChartData(filtered, range);
  const chartData = Array.isArray(chartResult) ? chartResult : chartResult.data;
  const chartInterval = Array.isArray(chartResult) ? 3 : chartResult.interval;

  // Category breakdown (based on filtered)
  const catData = Object.entries(
    expenses.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + parseFloat(tx.amount);
      return acc;
    }, {})
  )
    .map(([cat, value]) => ({ cat, value, pct: totalExpenses > 0 ? (value / totalExpenses) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);

  const rangeLabel = RANGE_LABELS[range]?.[lang] ?? range;

  return (
    <div className="space-y-4 anim-1">
      {/* Range selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {Object.entries(RANGE_LABELS).map(([key, labels]) => {
          const active = range === key;
          return (
            <button
              key={key}
              onClick={() => setRange(key)}
              className="shrink-0 px-3 py-1.5 text-xs font-medium cursor-pointer transition-all rounded-lg"
              style={{
                backgroundColor: active ? "var(--brand)" : "var(--surface)",
                color: active ? "white" : "var(--text-2)",
                border: `1px solid ${active ? "var(--brand)" : "var(--border)"}`,
              }}
            >
              {labels[lang] ?? labels.en}
            </button>
          );
        })}
      </div>

      {/* Stats grid — 2 cols on mobile, 4 on sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label={t("avgExpense")}
          value={`${symbol}${fmt(avgExpense)}`}
          sub={t("expensesTotal", { count: expenses.length })}
        />
        <StatCard
          label={t("busiestDay")}
          value={busiestDayShort}
          sub={busiestDayLong}
        />
        <StatCard
          label={t("transactions")}
          value={filtered.length}
          sub={t("incomeExpensesCount", { income: income.length, expenses: expenses.length })}
        />
        <StatCard
          label={t("biggestExpense")}
          value={`${symbol}${fmt(biggestExpense)}`}
          sub={expenses.find(tx => parseFloat(tx.amount) === biggestExpense)?.description}
        />
      </div>

      {/* Spending Trends (always this month vs last) */}
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
                  backgroundColor: totalChange > 0 ? "color-mix(in srgb, var(--red) 14%, transparent)" : "color-mix(in srgb, var(--brand) 14%, transparent)",
                  color: totalChange > 0 ? "var(--red)" : "var(--green)",
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  {totalChange > 0 ? <polyline points="6 15 12 9 18 15" /> : <polyline points="6 9 12 15 18 9" />}
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
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCatColor(cat) }} />
                        <span className="text-sm capitalize truncate max-w-[120px]" style={{ color: "var(--text-2)" }}>{t(cat)}</span>
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

      {/* Bar chart */}
      <div className="fin-card rounded-2xl p-5">
        <p className="fin-label mb-4">{rangeLabel}</p>
        <div className="h-[200px] sm:h-56" style={{ minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={chartData} barGap={1} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "var(--text-3)", fontFamily: "JetBrains Mono" }}
                tickLine={false}
                axisLine={false}
                interval={chartInterval}
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
          {[["var(--green)", t("income")], ["var(--red)", t("expenses")]].map(([color, label]) => (
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
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCatColor(cat) }} />
                    <span className="text-sm capitalize truncate max-w-[120px]" style={{ color: "var(--text-2)" }}>{t(cat)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: "var(--text-3)" }}>{pct.toFixed(1)}%</span>
                    <span className="fin-mono text-sm font-semibold" style={{ color: "var(--text-1)", minWidth: 64, textAlign: "right" }}>
                      {symbol}{fmt(value)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: getCatColor(cat),
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
