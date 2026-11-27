import { calendarCells, heatLevel } from '../../utils/reportCalc.js';
import { formatCompact, formatMoney } from '../../utils/format.js';
import { toISO, DAYS_SHORT, niceDate } from '../../utils/date.js';

// Month calendar where every day is a tile shaded by how much was spent
// that day (darker = less, brighter = more — same white-on-black ladder the
// rest of the app uses). A small blue dot marks days with income. Tap a
// day to see exactly what went out on it.
export default function SpendCalendar({ cursor, dayMap, weekStart, onWeekStart, selected, onSelect, currency }) {
  const cells = calendarCells(cursor, weekStart);
  const todayIso = toISO(new Date());
  const max = Math.max(0, ...Object.values(dayMap).map((d) => d.spent));
  const heads = Array.from({ length: 7 }, (_, i) => DAYS_SHORT[(weekStart + i) % 7]);

  return (
    <div className="spendcal">
      <div className="spendcal-top">
        <div className="spendcal-legend" aria-hidden="true">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => <i key={l} className={`lv${l}`} />)}
          <span>More</span>
        </div>
        <div className="seg seg-xs" role="group" aria-label="Week starts on">
          <button className={weekStart === 1 ? 'on' : ''} onClick={() => onWeekStart(1)}>Mon</button>
          <button className={weekStart === 0 ? 'on' : ''} onClick={() => onWeekStart(0)}>Sun</button>
        </div>
      </div>

      <div className="spendcal-grid spendcal-heads">
        {heads.map((h) => <span key={h}>{h.slice(0, 2)}</span>)}
      </div>

      <div className="spendcal-grid">
        {cells.map((c, i) => {
          if (!c) return <span key={`b${i}`} className="sc-tile blank" />;
          const d = dayMap[c.iso];
          const spent = d?.spent || 0;
          const income = d?.income || 0;
          const future = c.iso > todayIso;
          const lvl = heatLevel(spent, max);
          const cls = [
            'sc-tile', `lv${lvl}`,
            future ? 'future' : '',
            c.iso === todayIso ? 'today' : '',
            c.iso === selected ? 'sel' : '',
            c.dow === 0 || c.dow === 6 ? 'wknd' : '',
          ].filter(Boolean).join(' ');
          const label = `${niceDate(c.iso)}: ${spent > 0 ? `spent ${formatMoney(spent, currency)}` : 'no spending'}${income > 0 ? `, received ${formatMoney(income, currency)}` : ''}`;
          return (
            <button key={c.iso} className={cls} disabled={future} onClick={() => onSelect(c.iso)} aria-label={label} title={label}>
              <span className="sc-day">{c.day}</span>
              {income > 0 ? <i className="sc-inc" /> : null}
              <span className="sc-amt num">{spent > 0 ? formatCompact(spent) : future ? '' : '–'}</span>
            </button>
          );
        })}
      </div>

      <div className="spendcal-foot">
        <span><i className="sc-inc" /> Income received</span>
        <span><i className="sc-today-key" /> Today</span>
      </div>
    </div>
  );
}
