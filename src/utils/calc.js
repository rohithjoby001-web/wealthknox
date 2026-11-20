import { catById } from '../data/categories.js';
import { lastMonths, lastDays, monthKeyOfISO, daysUntil, daysBetween, monthsBetween } from './date.js';

export const inMonth = (list, key) => list.filter((x) => monthKeyOfISO(x.date) === key);
export const sum = (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x.amount), 0);
export const totalAllocatedAll = (goals) => sum(goals, (g) => g.allocated || 0);
export const netBalance = (inc, exp) => sum(inc) - sum(exp);
// startingBalance is a separate, one-time "what I'm starting with" figure
// (set in Settings) — not an Income entry — so it counts toward the
// spendable total here without ever showing up as "income earned" in any
// month/year breakdown (those only ever look at inc/exp, never this).
export const availableBalance = (inc, exp, goals, startingBalance = 0) =>
  startingBalance + netBalance(inc, exp) - totalAllocatedAll(goals);
export const monthIncome = (inc, key) => sum(inMonth(inc, key));
export const monthExpense = (exp, key) => sum(inMonth(exp, key));
export const monthNet = (inc, exp, key) => monthIncome(inc, key) - monthExpense(exp, key);
export const savingsRate = (inc, exp, key) => {
  const i = monthIncome(inc, key);
  if (i <= 0) return 0;
  return Math.max(-100, Math.min(100, Math.round((monthNet(inc, exp, key) / i) * 100)));
};
export const spendRatio = (inc, exp, key) => {
  const i = monthIncome(inc, key);
  if (i <= 0) return null;
  return (monthExpense(exp, key) / i) * 100;
};
export const SPEND_HEALTHY_LIMIT = 80;
export const spendTier = (pct) => {
  if (pct == null) return { tier: 'none', label: 'No income logged yet', icon: 'wallet' };
  if (pct > 100) return { tier: 'over', label: 'Overspending', icon: 'alert' };
  if (pct > 85) return { tier: 'watch', label: 'Cutting it close', icon: 'flag' };
  if (pct > 60) return { tier: 'healthy', label: 'Healthy spend', icon: 'check' };
  return { tier: 'great', label: 'Saving well', icon: 'sparkle' };
};
export const categoryTotals = (exp, key) => {
  const rows = inMonth(exp, key);
  const m = {};
  rows.forEach((x) => { m[x.categoryId] = (m[x.categoryId] || 0) + x.amount; });
  return Object.entries(m).map(([categoryId, total]) => ({ categoryId, total, cat: catById(categoryId) })).sort((a, b) => b.total - a.total);
};
export const sourceTotals = (inc, key, sources) => {
  const rows = inMonth(inc, key);
  const m = {};
  rows.forEach((x) => { m[x.sourceId] = (m[x.sourceId] || 0) + x.amount; });
  return sources.map((s) => ({ source: s, total: m[s.id] || 0 }));
};

// ---------- whole-year equivalents, for the Reports page ----------
export const inYear = (list, year) => list.filter((x) => x.date.slice(0, 4) === String(year));
export const yearIncome = (inc, year) => sum(inYear(inc, year));
export const yearExpense = (exp, year) => sum(inYear(exp, year));
export const yearNet = (inc, exp, year) => yearIncome(inc, year) - yearExpense(exp, year);
export const yearSavingsRate = (inc, exp, year) => {
  const i = yearIncome(inc, year);
  if (i <= 0) return 0;
  return Math.max(-100, Math.min(100, Math.round((yearNet(inc, exp, year) / i) * 100)));
};
export const categoryTotalsYear = (exp, year) => {
  const rows = inYear(exp, year);
  const m = {};
  rows.forEach((x) => { m[x.categoryId] = (m[x.categoryId] || 0) + x.amount; });
  return Object.entries(m).map(([categoryId, total]) => ({ categoryId, total, cat: catById(categoryId) })).sort((a, b) => b.total - a.total);
};
export const sourceTotalsYear = (inc, year, sources) => {
  const rows = inYear(inc, year);
  const m = {};
  rows.forEach((x) => { m[x.sourceId] = (m[x.sourceId] || 0) + x.amount; });
  return sources.map((s) => ({ source: s, total: m[s.id] || 0 }));
};
// Jan-Dec of a specific calendar year (not "trailing N months from today"
// like monthlySeries) — what the Reports page's yearly trend chart needs.
export const yearMonthlySeries = (inc, exp, year) =>
  monthsBetween(new Date(year, 0, 1), new Date(year, 11, 1)).map((m) => ({ ...m, income: monthIncome(inc, m.key), expense: monthExpense(exp, m.key) }));
export const monthlySeries = (inc, exp, n = 6) => lastMonths(n).map((m) => ({ ...m, income: monthIncome(inc, m.key), expense: monthExpense(exp, m.key) }));
export const dailySeries = (inc, exp, n = 7) => lastDays(n).map((d) => {
  const i = inc.filter((x) => x.date === d.iso).reduce((a, x) => a + x.amount, 0);
  const e = exp.filter((x) => x.date === d.iso).reduce((a, x) => a + x.amount, 0);
  return { ...d, income: i, expense: e, net: i - e };
});
// Backs the Overview chart's custom date-range option. A short window
// (about two months or less) gets a daily point per day so a specific
// week or pay period still shows real shape; anything longer falls back
// to one point per month, same as the preset 3M/6M/1Y ranges, so a
// multi-year range doesn't try to plot hundreds of unreadable points.
export const rangeSeries = (inc, exp, fromDate, toDate) => {
  const spanDays = Math.round((toDate - fromDate) / 86400000) + 1;
  if (spanDays <= 62) {
    return daysBetween(fromDate, toDate).map((d) => ({
      ...d,
      key: d.iso,
      income: inc.filter((x) => x.date === d.iso).reduce((a, x) => a + x.amount, 0),
      expense: exp.filter((x) => x.date === d.iso).reduce((a, x) => a + x.amount, 0),
    }));
  }
  return monthsBetween(fromDate, toDate).map((m) => ({ ...m, income: monthIncome(inc, m.key), expense: monthExpense(exp, m.key) }));
};
export const recentTransactions = (inc, exp, sources, n = 6) => {
  const all = [
    ...inc.map((x) => ({ ...x, kind: 'income', title: sources.find((s) => s.id === x.sourceId)?.name || 'Income' })),
    ...exp.map((x) => ({ ...x, kind: 'expense', title: catById(x.categoryId).name })),
  ];
  all.sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  return all.slice(0, n);
};
export const findTx = (incomes, expenses, id) =>
  [...incomes.map((x) => ({ ...x, kind: 'income' })), ...expenses.map((x) => ({ ...x, kind: 'expense' }))].find((x) => x.id === id);

// Real, actionable flags for the bell icon in the header — replacing what
// used to be a button that always said "No new notifications" no matter
// what was going on with the person's money.
export const getAlerts = (inc, exp, goals, key, startingBalance = 0) => {
  const out = [];
  const ratio = spendRatio(inc, exp, key);
  if (ratio != null && ratio > 100) {
    out.push({ id: 'overspend', icon: 'alert', tone: 'warn', text: "You've spent more than you've earned this month." });
  }
  if (availableBalance(inc, exp, goals, startingBalance) < 0) {
    out.push({ id: 'negative-available', icon: 'wallet', tone: 'warn', text: 'Spending has dipped into money already saved toward targets.' });
  }
  goals.forEach((g) => {
    if (g.allocated >= g.target || !g.deadline) return;
    const d = daysUntil(g.deadline);
    if (d == null) return;
    if (d < 0) out.push({ id: `deadline-${g.id}`, icon: 'flag', tone: 'warn', text: `"${g.name}" target date has passed.` });
    else if (d <= 7) out.push({ id: `deadline-${g.id}`, icon: 'flag', tone: 'info', text: `${d === 0 ? 'Today' : `${d} day${d === 1 ? '' : 's'} left`} to reach "${g.name}".` });
  });
  return out;
};

export const groupByDay = (list) => {
  const m = {};
  list.forEach((x) => { (m[x.date] = m[x.date] || []).push(x); });
  return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0])).map(([date, items]) => ({ date, items: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }));
};
