import { toISO, addDays, addMonths } from '../utils/date.js';

// Starter / demo data, seeded relative to "today" so it always looks
// current on a fresh install. Shown only until the person's own data
// (persisted to localStorage, see state/AppContext.jsx) takes over.
export function buildSampleData() {
  const today = new Date();
  const iso = (offset) => toISO(addDays(today, -offset));
  const tISO = (ts) => new Date(ts).toISOString();

  const sources = [
    { id: 's1', name: 'Main Salary', icon: 'briefcase', createdAt: tISO(Date.now() - 86400000 * 120) },
    { id: 's2', name: 'Freelance', icon: 'laptop', createdAt: tISO(Date.now() - 86400000 * 120) },
    { id: 's3', name: 'Side Hustle', icon: 'store', createdAt: tISO(Date.now() - 86400000 * 40) },
  ];

  const incomes = [
    { id: 'i1', amount: 5400, sourceId: 's1', note: 'November salary', date: iso(12), createdAt: tISO(Date.now() - 86400000 * 12) },
    { id: 'i2', amount: 1200, sourceId: 's2', note: 'Web project', date: iso(15), createdAt: tISO(Date.now() - 86400000 * 15) },
    { id: 'i3', amount: 240, sourceId: 's3', note: 'Etsy sale', date: iso(5), createdAt: tISO(Date.now() - 86400000 * 5) },
    { id: 'i4', amount: 60, sourceId: 's3', note: 'Tips', date: iso(2), createdAt: tISO(Date.now() - 86400000 * 2) },
    { id: 'i5', amount: 5400, sourceId: 's1', note: 'October salary', date: iso(42), createdAt: tISO(Date.now() - 86400000 * 42) },
    { id: 'i6', amount: 950, sourceId: 's2', note: 'Logo design', date: iso(48), createdAt: tISO(Date.now() - 86400000 * 48) },
    { id: 'i7', amount: 5400, sourceId: 's1', note: 'September salary', date: iso(72), createdAt: tISO(Date.now() - 86400000 * 72) },
    { id: 'i8', amount: 5400, sourceId: 's1', note: 'August salary', date: iso(102), createdAt: tISO(Date.now() - 86400000 * 102) },
    { id: 'i9', amount: 1500, sourceId: 's2', note: 'Consulting', date: iso(78), createdAt: tISO(Date.now() - 86400000 * 78) },
    { id: 'i10', amount: 5400, sourceId: 's1', note: 'July salary', date: iso(133), createdAt: tISO(Date.now() - 86400000 * 133) },
    { id: 'i11', amount: 800, sourceId: 's2', note: 'Banner ad', date: iso(138), createdAt: tISO(Date.now() - 86400000 * 138) },
  ];

  const expenses = [
    { id: 'e1', amount: 86.4, categoryId: 'groceries', note: 'Weekly grocery run', date: iso(1), createdAt: tISO(Date.now() - 86400000 * 1) },
    { id: 'e2', amount: 24.5, categoryId: 'food', note: 'Lunch with team', date: iso(1), createdAt: tISO(Date.now() - 86400000 * 1) },
    { id: 'e3', amount: 18, categoryId: 'transport', note: 'Uber to office', date: iso(2), createdAt: tISO(Date.now() - 86400000 * 2) },
    { id: 'e4', amount: 12.99, categoryId: 'subscriptions', note: 'Streaming', date: iso(3), createdAt: tISO(Date.now() - 86400000 * 3) },
    { id: 'e5', amount: 31.2, categoryId: 'food', note: 'Dinner out', date: iso(3), createdAt: tISO(Date.now() - 86400000 * 3) },
    { id: 'e6', amount: 64, categoryId: 'bills', note: 'Internet', date: iso(4), createdAt: tISO(Date.now() - 86400000 * 4) },
    { id: 'e7', amount: 72.9, categoryId: 'groceries', note: 'Weekly grocery run', date: iso(5), createdAt: tISO(Date.now() - 86400000 * 5) },
    { id: 'e8', amount: 22.5, categoryId: 'transport', note: 'Fuel', date: iso(6), createdAt: tISO(Date.now() - 86400000 * 6) },
    { id: 'e9', amount: 119, categoryId: 'shopping', note: 'Jacket', date: iso(6), createdAt: tISO(Date.now() - 86400000 * 6) },
    { id: 'e10', amount: 28, categoryId: 'entertainment', note: 'Cinema', date: iso(7), createdAt: tISO(Date.now() - 86400000 * 7) },
    { id: 'e11', amount: 35, categoryId: 'health', note: 'Pharmacy', date: iso(8), createdAt: tISO(Date.now() - 86400000 * 8) },
    { id: 'e12', amount: 19.75, categoryId: 'food', note: 'Coffee + breakfast', date: iso(9), createdAt: tISO(Date.now() - 86400000 * 9) },
    { id: 'e13', amount: 9.99, categoryId: 'subscriptions', note: 'Music', date: iso(9), createdAt: tISO(Date.now() - 86400000 * 9) },
    { id: 'e14', amount: 140, categoryId: 'bills', note: 'Electricity', date: iso(10), createdAt: tISO(Date.now() - 86400000 * 10) },
    { id: 'e15', amount: 1800, categoryId: 'housing', note: 'Rent', date: iso(1), createdAt: tISO(Date.now() - 86400000 * 1) },
    { id: 'e16', amount: 14, categoryId: 'transport', note: 'Bus pass top-up', date: iso(11), createdAt: tISO(Date.now() - 86400000 * 11) },
    { id: 'e17', amount: 64.3, categoryId: 'groceries', note: 'Weekly grocery run', date: iso(12), createdAt: tISO(Date.now() - 86400000 * 12) },
  ];

  const goals = [
    {
      id: 'g1', name: 'New Laptop', target: 2000, allocated: 1200, icon: 'laptop', deadline: toISO(addMonths(today, 2)), createdAt: tISO(Date.now() - 86400000 * 40),
      history: [
        { id: 'a1', goalId: 'g1', amount: 300, date: iso(40), createdAt: tISO(Date.now() - 86400000 * 40) },
        { id: 'a2', goalId: 'g1', amount: 300, date: iso(28), createdAt: tISO(Date.now() - 86400000 * 28) },
        { id: 'a3', goalId: 'g1', amount: 300, date: iso(16), createdAt: tISO(Date.now() - 86400000 * 16) },
        { id: 'a4', goalId: 'g1', amount: 300, date: iso(6), createdAt: tISO(Date.now() - 86400000 * 6) },
      ],
    },
    {
      id: 'g2', name: 'Trip to Japan', target: 4500, allocated: 900, icon: 'plane', deadline: toISO(addMonths(today, 8)), createdAt: tISO(Date.now() - 86400000 * 20),
      history: [
        { id: 'a5', goalId: 'g2', amount: 500, date: iso(18), createdAt: tISO(Date.now() - 86400000 * 18) },
        { id: 'a6', goalId: 'g2', amount: 400, date: iso(8), createdAt: tISO(Date.now() - 86400000 * 8) },
      ],
    },
    { id: 'g3', name: 'Emergency Fund', target: 6000, allocated: 6000, icon: 'shield', deadline: null, createdAt: tISO(Date.now() - 86400000 * 90), history: [] },
  ];

  return { sources, incomes, expenses, goals };
}
