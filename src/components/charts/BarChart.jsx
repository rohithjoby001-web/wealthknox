import { formatMoney, formatCompact } from '../../utils/format.js';
import { parseISO, MONTHS_SHORT, niceDate } from '../../utils/date.js';

// "Last 7 days" bars, used on the Overview page. Each bar is the day's
// NET (income minus expense), not just whichever side was bigger — so
// the bar's color tells you in or out at a glance (matching the
// income/expense shades used everywhere else), and its height matches
// the "Net this week" total below instead of a value that can't be
// read off the bar without a hover, which doesn't work on a touchscreen.
export function WeekBarChart({ data }) {
  const max = Math.max(1, ...data.map((d) => Math.abs(d.net)));
  const todayIso = data.length ? data[data.length - 1].iso : '';
  const totalNet = data.reduce((a, d) => a + d.net, 0);
  return (
    <>
      <div className="barchart">
        {data.map((d) => {
          const isToday = d.iso === todayIso;
          const has = d.income > 0 || d.expense > 0;
          const dir = !has ? '' : d.net > 0 ? 'pos' : d.net < 0 ? 'neg' : 'flat';
          const h = has ? Math.max(8, (Math.abs(d.net) / max) * 100) : 4;
          const netLabel = `${d.net < 0 ? '-' : '+'}${formatMoney(Math.abs(d.net), '$')}`;
          return (
            <div
              key={d.iso}
              className={`col${has ? ' has' : ''}${dir ? ` ${dir}` : ''}`}
              title={`${formatMoney(d.income, '$')} in · ${formatMoney(d.expense, '$')} out · net ${netLabel}`}
            >
              <div className="bar" style={{ height: `${h}%` }} />
              <span className={`lbl${isToday ? ' lbl-cur' : ''}`}>{d.label}</span>
            </div>
          );
        })}
      </div>
      <div className="barchart-foot">
        <span>Net this week</span>
        <b>{totalNet < 0 ? '-' : ''}${formatCompact(Math.abs(totalNet))}</b>
      </div>
    </>
  );
}

// One bar per goal contribution (most recent last) — replaces the old
// near-flat line sparkline, which had little to say with 2-4 points on a
// value that only ever goes up. Reuses the same bar styling as the week
// view above so "a short history of discrete amounts" looks the same
// everywhere in the app.
export function GoalBars({ historyAsc, currency }) {
  const hist = (historyAsc || []).slice(-8);
  if (hist.length === 0) return null;
  const max = Math.max(1, ...hist.map((h) => Math.abs(h.amount)));
  return (
    <div className="barchart" style={{ height: 52 }}>
      {hist.map((h, i) => {
        const d = parseISO(h.date);
        const lbl = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
        const isWithdraw = h.amount < 0;
        const hh = Math.max(10, Math.round((Math.abs(h.amount) / max) * 100));
        const sign = isWithdraw ? '-' : '+';
        return (
          <div
            key={h.id}
            className={`col has${isWithdraw ? ' neg' : i === hist.length - 1 ? ' today' : ''}`}
            title={`${sign}${formatMoney(Math.abs(h.amount), currency)} on ${niceDate(h.date)}`}
          >
            <div className="bar" style={{ height: `${hh}%` }} />
            <span className="lbl">{lbl}</span>
          </div>
        );
      })}
    </div>
  );
}
