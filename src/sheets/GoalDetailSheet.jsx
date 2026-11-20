import Sheet from './Sheet.jsx';
import { Icon } from '../icons/index.jsx';
import Ring from '../components/charts/Ring.jsx';
import { GoalBars } from '../components/charts/BarChart.jsx';
import { useApp } from '../state/AppContext.jsx';
import { formatMoney, clampPct } from '../utils/format.js';
import { niceDate, daysUntil } from '../utils/date.js';

export default function GoalDetailSheet({ goalId }) {
  const { state, closeSheet, openSheet, cur } = useApp();
  const g = state.goals.find((x) => x.id === goalId);
  if (!g) return null;

  const pct = clampPct((g.allocated / g.target) * 100);
  const remaining = Math.max(0, g.target - g.allocated);
  const done = g.allocated >= g.target;
  const histAsc = [...(g.history || [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const histDesc = [...(g.history || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
  const dleft = g.deadline ? daysUntil(g.deadline) : null;

  return (
    <Sheet
      title={g.name}
      onClose={closeSheet}
      footer={
        <div className="stack-sm">
          <div className="btn-row">
            <button className="btn ghost" onClick={() => openSheet({ kind: 'add-goal', editing: g })}>
              <Icon name="edit" size={16} stroke={2} />Edit
            </button>
            {!done ? (
              <button className="btn primary" onClick={() => openSheet({ kind: 'allocate', goalId: g.id, mode: 'add' })}>
                <Icon name="plus" size={17} stroke={2.4} />Add money
              </button>
            ) : null}
          </div>
          {g.allocated > 0 ? (
            <button className="btn danger" onClick={() => openSheet({ kind: 'allocate', goalId: g.id, mode: 'withdraw' })}>
              <Icon name="minus" size={17} stroke={2} />Withdraw money
            </button>
          ) : null}
        </div>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <Ring pct={pct} label={`${Math.round(pct)}%`} size={76} stroke={8} />
        <div style={{ flex: 1 }}>
          {done ? (
            <span className="badge-done"><Icon name="check" size={12} stroke={3} />Target reached</span>
          ) : (
            <span className="mu" style={{ fontSize: 13 }}>{formatMoney(remaining, cur())} left to go</span>
          )}
          <div className="num" style={{ marginTop: 6, fontFamily: 'var(--hd)', fontWeight: 800, fontSize: 20, letterSpacing: '-.02em' }}>
            {formatMoney(g.allocated, cur())}{' '}
            <span className="mu" style={{ fontWeight: 600, fontSize: 14 }}>of {formatMoney(g.target, cur())}</span>
          </div>
        </div>
      </div>

      {g.deadline ? (
        <p className="helptext" style={{ marginBottom: 14 }}>
          Target date: {niceDate(g.deadline)}{dleft != null && !done ? ` · ${dleft > 0 ? `${dleft} days left` : 'past due'}` : ''}
        </p>
      ) : null}

      {histAsc.length > 0 ? (
        <>
          <span className="lbl-sm" style={{ display: 'block', marginBottom: 8 }}>Recent contributions</span>
          <GoalBars historyAsc={histAsc} currency={cur()} />
        </>
      ) : null}

      <div className="section-h" style={{ margin: '18px 0 8px' }}><h2 style={{ fontSize: 14.5 }}>Allocation history</h2></div>
      {histDesc.length === 0 ? (
        <p className="mu" style={{ fontSize: 13.5, padding: '8px 0 4px' }}>No money allocated yet.</p>
      ) : (
        <div className="plist">
          {histDesc.map((h) => (
            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--line)' }}>
              <span className="mu" style={{ fontSize: 13.5 }}>{niceDate(h.date)}</span>
              <span className="num" style={{ fontWeight: 700, fontSize: 13.5, color: h.amount < 0 ? 'var(--mu)' : 'var(--ink)' }}>
                {h.amount < 0 ? '−' : '+'} {formatMoney(Math.abs(h.amount), cur())}
              </span>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
