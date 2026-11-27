// Report-only helpers: day-level aggregation for the spending calendar,
// the daily chart, weekday patterns and the "insights" tiles. Kept out of
// calc.js so the core money maths stays small and these can grow freely.
import { catById } from '../data/categories.js';
import { toISO, monthKey, monthKeyOfISO, parseISO } from './date.js';

export const daysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

// { 'YYYY-MM-DD': { spent, income, count, items: [...] } } for one month.
export const dayTotalsForMonth = (incomes, expenses, key) => {
  const m = {};
  const slot = (iso) => (m[iso] = m[iso] || { spent: 0, income: 0, count: 0, expenses: [], incomes: [] });
  expenses.forEach((x) => {
    if (monthKeyOfISO(x.date) !== key) return;
    const s = slot(x.date); s.spent += x.amount; s.count += 1; s.expenses.push(x);
  });
  incomes.forEach((x) => {
    if (monthKeyOfISO(x.date) !== key) return;
    const s = slot(x.date); s.income += x.amount; s.incomes.push(x);
  });
  return m;
};

// Same idea for a whole year, spend only — feeds the year heatmap.
export const daySpendForYear = (expenses, year) => {
  const m = {};
  const y = String(year);
  expenses.forEach((x) => { if (x.date.slice(0, 4) === y) m[x.date] = (m[x.date] || 0) + x.amount; });
  return m;
};

// 0 = nothing, 1..4 = relative intensity against the busiest day.
export const heatLevel = (v, max) => {
  if (!v || v <= 0 || max <= 0) return 0;
  const r = v / max;
  if (r > 0.75) return 4;
  if (r > 0.45) return 3;
  if (r > 0.2) return 2;
  return 1;
};

// Calendar grid for a month: leading blanks so day 1 lands under the right
// weekday, then every real day (28/29/30/31 handled by daysInMonth, so leap
// years and short months are always correct), then trailing blanks to
// finish the last week. weekStart: 0 = Sunday, 1 = Monday.
export const calendarCells = (cursor, weekStart = 1) => {
  const y = cursor.getFullYear(), mo = cursor.getMonth();
  const first = new Date(y, mo, 1).getDay();
  const lead = (first - weekStart + 7) % 7;
  const n = daysInMonth(cursor);
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= n; d++) {
    const date = new Date(y, mo, d);
    cells.push({ day: d, date, iso: toISO(date), dow: date.getDay() });
  }
  while (cells.length % 7) cells.push(null);
  return cells;
};

// How many days of this month "count" for averages: all of them for a past
// month, up to today for the current month, none for a future month.
export const elapsedDays = (cursor, today = new Date()) => {
  const n = daysInMonth(cursor);
  if (monthKey(cursor) === monthKey(today)) return today.getDate();
  return cursor < today ? n : 0;
};

export const monthInsights = (incomes, expenses, cursor, dayMap, today = new Date()) => {
  const key = monthKey(cursor);
  const n = daysInMonth(cursor);
  const elapsed = elapsedDays(cursor, today);
  const exp = expenses.filter((x) => monthKeyOfISO(x.date) === key);
  const spent = exp.reduce((a, x) => a + x.amount, 0);
  const isCurrent = key === monthKey(today);

  let topDay = null;
  Object.entries(dayMap).forEach(([iso, v]) => { if (v.spent > 0 && (!topDay || v.spent > topDay.spent)) topDay = { iso, spent: v.spent }; });

  let noSpend = 0, spendDays = 0;
  for (let d = 1; d <= elapsed; d++) {
    const iso = toISO(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    if (dayMap[iso]?.spent > 0) spendDays++; else noSpend++;
  }

  // Longest run of consecutive no-spend days within the elapsed part.
  let streak = 0, run = 0;
  for (let d = 1; d <= elapsed; d++) {
    const iso = toISO(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    if (dayMap[iso]?.spent > 0) run = 0; else { run++; streak = Math.max(streak, run); }
  }

  const biggest = exp.reduce((b, x) => (!b || x.amount > b.amount ? x : b), null);
  const avgPerDay = elapsed > 0 ? spent / elapsed : 0;
  return {
    spent,
    days: n,
    elapsed,
    avgPerDay,
    avgPerSpendDay: spendDays > 0 ? spent / spendDays : 0,
    projected: isCurrent && elapsed > 0 ? avgPerDay * n : null,
    topDay,
    noSpend,
    spendDays,
    streak,
    txCount: exp.length,
    avgTx: exp.length ? spent / exp.length : 0,
    biggest,
  };
};

// Average spend for each weekday across the elapsed days of the month.
// Returned in display order starting from weekStart.
export const weekdayPattern = (cursor, dayMap, weekStart = 1, today = new Date()) => {
  const elapsed = elapsedDays(cursor, today);
  const sums = Array(7).fill(0), counts = Array(7).fill(0);
  for (let d = 1; d <= elapsed; d++) {
    const date = new Date(cursor.getFullYear(), cursor.getMonth(), d);
    const w = date.getDay();
    counts[w]++;
    sums[w] += dayMap[toISO(date)]?.spent || 0;
  }
  const out = [];
  for (let i = 0; i < 7; i++) {
    const w = (weekStart + i) % 7;
    out.push({ dow: w, total: sums[w], avg: counts[w] ? sums[w] / counts[w] : 0 });
  }
  return out;
};

// Category totals for this month alongside last month's, for the
// "vs last month" deltas next to each category.
export const categoryCompare = (expenses, key, prevKey) => {
  const cur = {}, prev = {};
  expenses.forEach((x) => {
    const k = monthKeyOfISO(x.date);
    if (k === key) cur[x.categoryId] = (cur[x.categoryId] || 0) + x.amount;
    else if (k === prevKey) prev[x.categoryId] = (prev[x.categoryId] || 0) + x.amount;
  });
  return Object.entries(cur)
    .map(([id, total]) => ({ id, total, prev: prev[id] || 0, cat: catById(id) }))
    .sort((a, b) => b.total - a.total);
};

export const topExpenses = (expenses, key, n = 5) =>
  expenses.filter((x) => monthKeyOfISO(x.date) === key).sort((a, b) => b.amount - a.amount).slice(0, n);

export const yearInsights = (series) => {
  const withData = series.filter((m) => m.income > 0 || m.expense > 0);
  if (!withData.length) return null;
  const top = withData.reduce((b, m) => (m.expense > b.expense ? m : b));
  const best = withData.reduce((b, m) => ((m.income - m.expense) > (b.income - b.expense) ? m : b));
  const avgSpend = withData.reduce((a, m) => a + m.expense, 0) / withData.length;
  return { top, best, avgSpend, months: withData.length };
};

export const isoWeekdayShort = (iso) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseISO(iso).getDay()];
