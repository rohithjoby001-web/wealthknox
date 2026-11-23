import { catById } from '../data/categories.js';
import { toISO, lastMonths, lastDays, monthKeyOfISO, daysUntil, daysBetween, monthsBetween } from './date.js';

export const inMonth = (list, key) => list.filter((x) => monthKeyOfISO(x.date) === key);
export const sum = (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x.amount), 0);
export const netBalance = (inc, exp) => sum(inc) - sum(exp);
// startingBalance is a separate, one-time "what I'm starting with" figure
// (set in Settings) — not an Income entry — so it counts toward the
// spendable total here without ever showing up as "income earned" in any
// month/year breakdown (those only ever look at inc/exp, never this).
//
// Reminders (replacing the old goals concept) are NOT earmarked money —
// they're a checklist of recurring bills. Marking a reminder as paid
// doesn't deduct from available balance; the actual cash movement is
// recorded separately as an expense when the bill is paid. So the formula
// here is now just starting balance + net of all income/expense entries.
export const availableBalance = (inc, exp, _reminders = null, startingBalance = 0) =>
  startingBalance + netBalance(inc, exp);
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

// ---------- expense display title ----------
// "Other" is a fallback category — when the user picks it in AddExpenseSheet,
// they're prompted to give the expense its own name (customName). Everywhere
// that shows an expense's title should call this helper so a customName on
// an Other-category expense wins over the generic "Other" label.
export const expenseTitle = (x) =>
  x && x.categoryId === 'other' && x.customName
    ? x.customName
    : (x ? catById(x.categoryId).name : '');

export const recentTransactions = (inc, exp, sources, n = 6) => {
  const all = [
    ...inc.map((x) => ({ ...x, kind: 'income', title: sources.find((s) => s.id === x.sourceId)?.name || 'Income' })),
    ...exp.map((x) => ({ ...x, kind: 'expense', title: expenseTitle(x) })),
  ];
  all.sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  return all.slice(0, n);
};
export const findTx = (incomes, expenses, id) =>
  [...incomes.map((x) => ({ ...x, kind: 'income' })), ...expenses.map((x) => ({ ...x, kind: 'expense' }))].find((x) => x.id === id);

// ---------- reminder helpers (replacing goal helpers) ----------
// Whether a reminder is marked paid for a given 'YYYY-MM' monthKey.
export const reminderPaidFor = (r, key) => Array.isArray(r?.paidMonths) && r.paidMonths.includes(key);
// Stats for a set of reminders in a given monthKey — total monthly amount,
// how much has been marked paid, how many reminders are paid vs pending.
export const reminderMonthStats = (reminders, key) => {
  const list = Array.isArray(reminders) ? reminders : [];
  const total = sum(list, (r) => r.amount || 0);
  const paidList = list.filter((r) => reminderPaidFor(r, key));
  const paid = sum(paidList, (r) => r.amount || 0);
  return {
    total,
    paid,
    pending: Math.max(0, total - paid),
    totalCount: list.length,
    paidCount: paidList.length,
    pendingCount: list.length - paidList.length,
  };
};

// Returns the effective due date as an ISO 'YYYY-MM-DD' string.
// Prefers the new `dueDate` field; falls back to constructing a date from
// the legacy `dueDay` field (day-of-month in the current month) for
// backward compat with reminders created before the dueDate migration.
// Returns null if the reminder has no due date set at all.
export const reminderDueDate = (r, today = new Date()) => {
  if (!r) return null;
  if (r.dueDate) return r.dueDate;
  if (r.dueDay) {
    const dayNum = Math.min(r.dueDay, 28);
    return toISO(new Date(today.getFullYear(), today.getMonth(), dayNum));
  }
  return null;
};

// Days until a reminder's due date. Returns null if no due date is set.
// Returns a signed integer: 0 = due today, positive = N days until due,
// negative = N days past due (overdue).
export const reminderDueIn = (r, today = new Date()) => {
  const iso = reminderDueDate(r, today);
  if (!iso) return null;
  return daysUntil(iso);
};

// Real, actionable flags for the bell icon in the header — replacing what
// used to be a button that always said "No new notifications" no matter
// what was going on with the person's money.
export const getAlerts = (inc, exp, reminders, key, _startingBalance = 0) => {
  const out = [];
  const ratio = spendRatio(inc, exp, key);
  if (ratio != null && ratio > 100) {
    out.push({ id: 'overspend', icon: 'alert', tone: 'warn', text: "You've spent more than you've earned this month." });
  }
  // Bill overdue alerts: any reminder for the current month that's past
  // its due date and not yet marked paid.
  const today = new Date();
  if (Array.isArray(reminders) && key === monthKeyOfISO(toISO(today))) {
    const overdue = reminders.filter((r) => {
      if (reminderPaidFor(r, key)) return false;
      const d = reminderDueIn(r, today);
      return d != null && d < 0;
    });
    if (overdue.length === 1) {
      const days = -reminderDueIn(overdue[0], today);
      out.push({ id: `reminder-overdue-${overdue[0].id}`, icon: 'flag', tone: 'warn', text: `"${overdue[0].name}" was due ${days} day${days === 1 ? '' : 's'} ago and isn't marked paid.` });
    } else if (overdue.length > 1) {
      out.push({ id: 'reminder-overdue-many', icon: 'flag', tone: 'warn', text: `${overdue.length} bills are past their due date and not marked paid.` });
    }
  }
  return out;
};

export const groupByDay = (list) => {
  const m = {};
  list.forEach((x) => { (m[x.date] = m[x.date] || []).push(x); });
  return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0])).map(([date, items]) => ({ date, items: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }));
};
