// Dotted progress ring used in the goal-detail sheet.
export default function Ring({ pct, label, size = 64, stroke = 7, marker }) {
  const r = (size - stroke) / 2, cx = size / 2, cy = size / 2, dotR = stroke * 0.42, spacing = stroke + 2;
  const c = 2 * Math.PI * r;
  const count = Math.max(14, Math.round(c / spacing));
  const step = (2 * Math.PI) / count;
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * count);
  const markerAngle = marker != null ? (marker / 100) * 2 * Math.PI - Math.PI / 2 : null;
  const cutHalf = step * 0.65;

  const dots = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * 2 * Math.PI - Math.PI / 2;
    if (markerAngle != null) {
      let d = Math.abs(a - markerAngle);
      d = Math.min(d, 2 * Math.PI - d);
      if (d < cutHalf) continue;
    }
    const x = Math.cos(a) * r, y = Math.sin(a) * r, on = i < filled;
    dots.push(<circle key={i} className={on ? 'dot on' : 'dot'} cx={x.toFixed(2)} cy={y.toFixed(2)} r={dotR.toFixed(2)} />);
  }

  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(${cx} ${cy})`}>{dots}</g>
      </svg>
      {label ? <b>{label}</b> : null}
    </div>
  );
}
