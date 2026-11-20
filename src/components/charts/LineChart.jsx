import { formatCompact } from '../../utils/format.js';

function smoothPath(pts) {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

// Income-vs-expense trend line — ported 1:1 from the original SVG builder.
export default function LineChart({ data, currentKey, currency = '$' }) {
  const W = 300, H = 132, PAD = { top: 26, right: 6, bottom: 6, left: 6 };
  const n = data.length;
  if (n === 0) return null;

  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const curIdx = data.findIndex((d) => d.key === currentKey);
  const activeIdx = curIdx >= 0 ? curIdx : n - 1;
  const xAt = (i, n) => (n <= 1 ? W / 2 : PAD.left + (i * (W - PAD.left - PAD.right)) / (n - 1));
  const yAt = (v) => { const inner = H - PAD.top - PAD.bottom; return PAD.top + inner - (Math.max(0, v) / max) * inner; };
  const ptsIn = data.map((d, i) => ({ x: xAt(i, n), y: yAt(d.income), d }));
  const ptsOut = data.map((d, i) => ({ x: xAt(i, n), y: yAt(d.expense), d }));
  const base = H - PAD.bottom;
  const area = `${smoothPath(ptsIn)} L${ptsIn[n - 1].x.toFixed(2)},${base} L${ptsIn[0].x.toFixed(2)},${base} Z`;
  const active = ptsIn[activeIdx];
  const activeOut = ptsOut[activeIdx];
  const anchor = activeIdx === 0 ? 'start' : activeIdx === n - 1 ? 'end' : 'middle';
  const dx = anchor === 'start' ? 3 : anchor === 'end' ? -3 : 0;
  // Keep the expense label clear of the chart floor; flip it above its point when there's no room below.
  const outDy = activeOut.y > base - 14 ? -10 : 14;

  return (
    <div className="linechart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} className="grid" x1={PAD.left} x2={W - PAD.right} y1={PAD.top + (H - PAD.top - PAD.bottom) * f} y2={PAD.top + (H - PAD.top - PAD.bottom) * f} />
        ))}
        <line className="tracer" x1={active.x} x2={active.x} y1={active.y} y2={base} />
        <path className="area" fill="url(#lc-fill)" d={area} />
        <path className="line-out" d={smoothPath(ptsOut)} />
        <path className="line-in" d={smoothPath(ptsIn)} />
        <circle className="pt-out-cur" cx={activeOut.x} cy={activeOut.y} r={3} />
        {ptsIn.map((p, i) => (
          <circle key={i} className={`pt${i === activeIdx ? ' pt-cur' : ''}`} cx={p.x} cy={p.y} r={i === activeIdx ? 3.8 : 2.6} />
        ))}
        <text className="tip" x={active.x + dx} y={active.y - 10} textAnchor={anchor}>{currency}{formatCompact(active.d.income)}</text>
        <text className="tip tip-out" x={activeOut.x + dx} y={activeOut.y + outDy} textAnchor={anchor}>{currency}{formatCompact(activeOut.d.expense)}</text>
      </svg>
      <div className="linechart-x">
        {data.map((d) => (
          <span key={d.key} className={d.key === currentKey ? 'cur' : ''}>{d.label}</span>
        ))}
      </div>
      <div className="chart-legend">
        <span><i></i> Income</span>
        <span><i className="out"></i> Expenses</span>
      </div>
    </div>
  );
}
