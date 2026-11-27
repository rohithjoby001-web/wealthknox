import TxRow from '../TxRow.jsx';
import { Icon } from '../../icons/index.jsx';
import { catById } from '../../data/categories.js';
import { formatMoney, clampPct } from '../../utils/format.js';
import { parseISO, MONTHS, DAYS_SHORT, toISO } from '../../utils/date.js';

const longDate = (iso) => {
  const d = parseISO(iso);
  return `${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

// The panel under the calendar: what was spent (and earned) on the chosen
// day, how that compares with the month's daily average, a category split
// and the actual entries — each tappable to open/edit it.
export default function DayDetail({ iso, day, avgPerDay, sources, currency, onOpenTx, onStep, canPrev, canNext }) {
  const spent = day?.spent || 0;
  const income = day?.income || 0;
  const exps = day?.expenses || [];
  const incs = day?.incomes || [];

  const cats = {};
  exps.forEach((x) => { cats[x.categoryId] = (cats[x.categoryId] || 0) + x.amount; });
  const catRows = Object.entries(cats).map(([id, total]) => ({ id, total, cat: catById(id) })).sort((a, b) => b.total - a.total);

  let vsAvg = null;
  if (avgPerDay > 0 && spent > 0) {
    const r = Math.round(((spent - avgPerDay) / avgPerDay) * 100);
    vsAvg = r === 0 ? 'Right on your daily average' : `${Math.abs(r)}% ${r > 0 ? 'above' : 'below'} your daily average`;
  } else if (spent === 0) {
    vsAvg = 'A no-spend day';
  }

  const txs = [
    ...exps.map((x) => ({ ...x, kind: 'expense' })),
    ...incs.map((x) => ({ ...x, kind: 'income' })),
  ].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const isToday = iso === toISO(new Date());

  return (
    <div className="daydetail">
      <div className="daydetail-head">
        <button className="dd-arrow" disabled={!canPrev} onClick={() => onStep(-1)} aria-label="Previous day"><Icon name="chevLeft" size={16} stroke={2.3} /></button>
        <div className="dd-title">
          <strong>{isToday ? 'Today' : longDate(iso)}</strong>
          <span>{vsAvg}</span>
        </div>
        <button className="dd-arrow" disabled={!canNext} onClick={() => onStep(1)} aria-label="Next day"><Icon name="chevRight" size={16} stroke={2.3} /></button>
      </div>

      <div className="dd-stats">
        <div><span>Spent</span><b className="num">{formatMoney(spent, currency)}</b></div>
        <div><span>Received</span><b className="num">{formatMoney(income, currency)}</b></div>
        <div><span>Net</span><b className="num">{income - spent < 0 ? '−' : ''}{formatMoney(Math.abs(income - spent), currency)}</b></div>
      </div>

      {avgPerDay > 0 ? (
        <div className="dd-avgbar" aria-hidden="true">
          <div className="track">
            <i style={{ width: `${clampPct((spent / Math.max(spent, avgPerDay * 2)) * 100)}%` }} className={spent > avgPerDay ? 'over' : ''} />
            <em style={{ left: `${clampPct((avgPerDay / Math.max(spent, avgPerDay * 2)) * 100)}%` }} />
          </div>
          <div className="dd-avgbar-lbl"><span>Daily avg {formatMoney(Math.round(avgPerDay), currency)}</span></div>
        </div>
      ) : null}

      {catRows.length > 1 ? (
        <div className="dd-cats">
          {catRows.map((c) => (
            <span key={c.id} className="dd-cat"><Icon name={c.cat.icon} size={12} stroke={2.1} />{c.cat.name}<b className="num">{formatMoney(c.total, currency)}</b></span>
          ))}
        </div>
      ) : null}

      {txs.length ? (
        <div className="rowlist" style={{ marginTop: 12 }}>
          {txs.map((tx) => (
            <TxRow key={tx.id} tx={tx} sources={sources} currency={currency} onClick={() => onOpenTx(tx.id)} />
          ))}
        </div>
      ) : (
        <p className="dd-empty">Nothing was logged on this day.</p>
      )}
    </div>
  );
}
