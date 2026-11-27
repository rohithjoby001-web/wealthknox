import { formatCompact, formatMoney } from '../../utils/format.js';
import { toISO, DAYS_SHORT, MONTHS_SHORT, parseISO } from '../../utils/date.js';
import { daysInMonth, heatLevel } from '../../utils/reportCalc.js';

// ---------------------------------------------------------------------
// Day-by-day spend bars for the month, with a dashed daily-average line.
// Tapping a bar selects that day (kept in sync with the calendar).
// ---------------------------------------------------------------------
export function DailySpendChart({ cursor, dayMap, avgPerDay, selected, onSelect, currency }) {
  const n = daysInMonth(cursor);
  const todayIso = toISO(new Date());
  const days = Array.from({ length: n }, (_, i) => {
    const iso = toISO(new Date(cursor.getFullYear(), cursor.getMonth(), i + 1));
    return { d: i + 1, iso, v: dayMap[iso]?.spent || 0, future: iso > todayIso };
  });
  const max = Math.max(1, avgPerDay, ...days.map((x) => x.v));
  const W = 320, H = 120, top = 14, bottom = 18;
  const plotH = H - top - bottom;
  const slot = W / n;
  const bw = Math.max(3, slot * 0.62);
  const y = (v) => top + plotH - (v / max) * plotH;
  const ticks = [1, 8, 15, 22, n];

  return (
    <div className="dailychart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Daily spending this month">
        <line x1="0" x2={W} y1={top + plotH} y2={top + plotH} className="axis" />
        {days.map((x, i) => {
          const h = x.v > 0 ? Math.max(2, (x.v / max) * plotH) : 0;
          const cx = i * slot + (slot - bw) / 2;
          return (
            <g key={x.iso} onClick={() => !x.future && onSelect(x.iso)} style={{ cursor: x.future ? 'default' : 'pointer' }}>
              <rect x={i * slot} y={top} width={slot} height={plotH} fill="transparent" />
              {h > 0 ? (
                <rect x={cx} y={top + plotH - h} width={bw} height={h} rx={Math.min(3, bw / 2)}
                  className={`b${x.iso === selected ? ' sel' : ''}${x.v > avgPerDay ? ' hi' : ''}`}>
                  <title>{`${x.d} ${MONTHS_SHORT[cursor.getMonth()]}: ${formatMoney(x.v, currency)}`}</title>
                </rect>
              ) : (
                <rect x={cx} y={top + plotH - 2} width={bw} height={2} rx={1} className={`b0${x.future ? ' fut' : ''}${x.iso === selected ? ' sel' : ''}`} />
              )}
            </g>
          );
        })}
        {avgPerDay > 0 ? (
          <>
            <line x1="0" x2={W} y1={y(avgPerDay)} y2={y(avgPerDay)} className="avg" />
            <text x={W - 2} y={y(avgPerDay) - 4} textAnchor="end" className="avg-t">avg {formatCompact(avgPerDay)}</text>
          </>
        ) : null}
        {ticks.map((t) => (
          <text key={t} x={(t - 0.5) * slot} y={H - 4} textAnchor="middle" className="tick">{t}</text>
        ))}
      </svg>
      <div className="chart-legend">
        <span><i className="bar-key hi" />Above average</span>
        <span><i className="bar-key" />Below average</span>
        <span><i className="avg-key" />Daily average</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Average spend per weekday — which days of the week cost the most.
// ---------------------------------------------------------------------
export function WeekdayBars({ data, currency }) {
  const max = Math.max(1, ...data.map((d) => d.avg));
  const topDow = data.reduce((b, d) => (d.avg > (b?.avg || 0) ? d : b), null);
  return (
    <>
      <div className="wkbars">
        {data.map((d) => {
          const h = d.avg > 0 ? Math.max(6, (d.avg / max) * 100) : 3;
          const isTop = topDow && d.dow === topDow.dow && d.avg > 0;
          return (
            <div key={d.dow} className={`wk${isTop ? ' top' : ''}`} title={`${DAYS_SHORT[d.dow]}: avg ${formatMoney(Math.round(d.avg), currency)}`}>
              <span className="wk-v num">{d.avg > 0 ? formatCompact(d.avg) : ''}</span>
              <div className="wk-track"><i style={{ height: `${h}%` }} /></div>
              <span className="wk-l">{DAYS_SHORT[d.dow]}</span>
            </div>
          );
        })}
      </div>
      {topDow && topDow.avg > 0 ? (
        <p className="chart-note">{DAYS_SHORT[topDow.dow]}s are your priciest day — about {formatMoney(Math.round(topDow.avg), currency)} on average.</p>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------
// Category donut. Monochrome ladder of greys, biggest slice brightest.
// ---------------------------------------------------------------------
const SHADES = ['#ffffff', '#c9c9c9', '#9a9a9a', '#727272', '#525252', '#383838'];
export function CategoryDonut({ rows, total, currency }) {
  const top = rows.slice(0, 5);
  const rest = rows.slice(5).reduce((a, r) => a + r.total, 0);
  const segs = [...top.map((r) => ({ id: r.id, name: r.cat.name, total: r.total })), ...(rest > 0 ? [{ id: '_rest', name: 'Everything else', total: rest }] : [])];
  const R = 46, C = 2 * Math.PI * R, GAP = segs.length > 1 ? 2 : 0;
  let acc = 0;
  return (
    <div className="donutwrap">
      <div className="donut">
        <svg viewBox="0 0 120 120" width="128" height="128">
          <circle cx="60" cy="60" r={R} className="donut-bg" />
          {segs.map((s, i) => {
            const len = (s.total / total) * C;
            const dash = Math.max(0, len - GAP);
            const el = (
              <circle key={s.id} cx="60" cy="60" r={R} fill="none" stroke={SHADES[i]} strokeWidth="14"
                strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-acc} transform="rotate(-90 60 60)">
                <title>{`${s.name}: ${formatMoney(s.total, currency)}`}</title>
              </circle>
            );
            acc += len;
            return el;
          })}
        </svg>
        <div className="donut-c">
          <span>Spent</span>
          <b className="num">{formatCompact(total)}</b>
        </div>
      </div>
      <div className="donut-legend">
        {segs.map((s, i) => (
          <div key={s.id} className="dl-row">
            <i style={{ background: SHADES[i] }} />
            <span className="dl-n">{s.name}</span>
            <span className="dl-p num">{Math.round((s.total / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Yearly: income vs spend per month as paired bars. Tap a month to open
// it in the Monthly view.
// ---------------------------------------------------------------------
export function YearMonthBars({ series, currentKey, onPick, currency }) {
  const max = Math.max(1, ...series.flatMap((m) => [m.income, m.expense]));
  return (
    <>
      <div className="ymbars">
        {series.map((m, i) => {
          const hi = m.income > 0 ? Math.max(4, (m.income / max) * 100) : 0;
          const he = m.expense > 0 ? Math.max(4, (m.expense / max) * 100) : 0;
          const has = m.income > 0 || m.expense > 0;
          return (
            <button key={m.key} className={`ym${m.key === currentKey ? ' cur' : ''}`} disabled={!has} onClick={() => onPick(m.date)}
              title={`${m.label}: in ${formatMoney(m.income, currency)} · out ${formatMoney(m.expense, currency)}`}>
              <div className="ym-bars">
                <i className="in" style={{ height: `${hi}%` }} />
                <i className="out" style={{ height: `${he}%` }} />
              </div>
              <span>{MONTHS_SHORT[i].charAt(0)}</span>
            </button>
          );
        })}
      </div>
      <div className="chart-legend">
        <span><i />Income</span>
        <span><i className="out" />Expenses</span>
        <span style={{ marginLeft: 'auto' }}>Tap a month to open it</span>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------
// Whole-year spend heatmap, one square per day, weeks as columns.
// Tap a square to jump to that day in the Monthly calendar.
// ---------------------------------------------------------------------
export function YearHeatmap({ year, daySpend, onPick, currency, weekStart = 1 }) {
  const jan1 = new Date(year, 0, 1);
  const lead = (jan1.getDay() - weekStart + 7) % 7;
  const daysInYear = (new Date(year + 1, 0, 1) - jan1) / 86400000;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let i = 0; i < daysInYear; i++) {
    const d = new Date(year, 0, 1 + i);
    cells.push(toISO(d));
  }
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const max = Math.max(0, ...Object.values(daySpend));
  const todayIso = toISO(new Date());

  // Month labels above the first week that contains the 1st of that month.
  const monthCols = {};
  weeks.forEach((w, wi) => w.forEach((iso) => { if (iso && iso.endsWith('-01')) monthCols[wi] = parseISO(iso).getMonth(); }));

  const spendDays = Object.values(daySpend).filter((v) => v > 0).length;

  return (
    <div className="yearheat">
      <div className="yh-scroll">
        <div className="yh-months">
          {weeks.map((_, wi) => <span key={wi}>{monthCols[wi] != null ? MONTHS_SHORT[monthCols[wi]] : ''}</span>)}
        </div>
        <div className="yh-grid">
          {weeks.map((w, wi) => (
            <div key={wi} className="yh-col">
              {w.map((iso, di) => {
                if (!iso) return <i key={di} className="yh-c blank" />;
                const v = daySpend[iso] || 0;
                const fut = iso > todayIso;
                return (
                  <i key={di} className={`yh-c lv${heatLevel(v, max)}${fut ? ' future' : ''}${iso === todayIso ? ' today' : ''}`}
                    title={`${iso}: ${v > 0 ? formatMoney(v, currency) : 'no spending'}`}
                    onClick={() => !fut && onPick(iso)} />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="spendcal-top" style={{ marginTop: 10 }}>
        <span className="chart-note" style={{ margin: 0 }}>{spendDays} day{spendDays === 1 ? '' : 's'} with spending</span>
        <div className="spendcal-legend" aria-hidden="true">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => <i key={l} className={`lv${l}`} />)}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Small two-up fact tiles used for "Insights".
// ---------------------------------------------------------------------
export function InsightGrid({ items }) {
  return (
    <div className="insights">
      {items.map((it) => (
        <button key={it.k} className={`insight${it.onClick ? ' click' : ''}`} onClick={it.onClick} disabled={!it.onClick}>
          <span className="in-k">{it.k}</span>
          <b className="in-v num">{it.v}</b>
          {it.d ? <span className="in-d">{it.d}</span> : null}
        </button>
      ))}
    </div>
  );
}
