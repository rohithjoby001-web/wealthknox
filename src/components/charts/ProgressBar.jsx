export default function ProgressBar({ pct, done }) {
  return (
    <div className={`pbar${done ? ' done' : ''}`}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}
