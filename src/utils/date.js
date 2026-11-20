export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export const toISO = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
};
export const parseISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export const monthKeyOfISO = (iso) => iso.slice(0, 7);
export const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const monthLabel = (d, short = false) => `${(short ? MONTHS_SHORT : MONTHS)[d.getMonth()]} ${d.getFullYear()}`;
export const isCurrentMonth = (d) => { const n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth(); };
export const lastMonths = (n) => {
  const base = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const out = [];
  for (let i = n - 1; i >= 0; i--) { const d = addMonths(base, -i); out.push({ date: d, key: monthKey(d), label: monthLabel(d, true) }); }
  return out;
};
// Every calendar day from `from` to `to`, inclusive, for a custom
// date-range chart view short enough to want daily detail.
export const daysBetween = (from, to) => {
  const out = [];
  let d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (d <= end) {
    out.push({ date: new Date(d), iso: toISO(d), label: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}` });
    d = addDays(d, 1);
  }
  return out;
};
// Every whole month touched by `from`..`to`, for a custom date-range
// chart view long enough that daily points would be unreadable.
export const monthsBetween = (from, to) => {
  const out = [];
  let d = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (d <= end) {
    out.push({ date: new Date(d), key: monthKey(d), label: monthLabel(d, true) });
    d = addMonths(d, 1);
  }
  return out;
};
export const lastDays = (n) => {
  const from = new Date();
  const out = [];
  for (let i = n - 1; i >= 0; i--) { const d = addDays(from, -i); out.push({ date: d, iso: toISO(d), label: String(d.getDate()), dow: DAYS_SHORT[d.getDay()] }); }
  return out;
};
export const dayLabel = (iso) => {
  const d = parseISO(iso), n = new Date(), y = new Date(n); y.setDate(n.getDate() - 1);
  if (iso === toISO(n)) return 'Today';
  if (iso === toISO(y)) return 'Yesterday';
  const sameYear = d.getFullYear() === n.getFullYear();
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${sameYear ? '' : ' ' + d.getFullYear()}`;
};
export const niceDate = (iso) => { const d = parseISO(iso); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`; };
export const daysUntil = (iso) => { const d = parseISO(iso), n = new Date(); n.setHours(0, 0, 0, 0); return Math.round((d.getTime() - n.getTime()) / 86400000); };
