import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';
import { availableFor, adjustmentsTotal, countsTowardBalance, netBalance } from '../utils/calc.js';
import { niceDate } from '../utils/date.js';
import { formatMoney } from '../utils/format.js';

const signed = (n, cur) => `${n < 0 ? '−' : '+'}${formatMoney(Math.abs(n), cur)}`;

// "Reconcile": type what your bank + cash actually add up to, and the
// difference is recorded as an adjustment — Available then matches real
// life without a made-up income/expense skewing Reports. Also shows how
// Available is built up, and the adjustment history (deletable).
export default function AdjustBalanceSheet() {
  const { state, closeSheet, adjustBalanceTo, deleteAdjustment, openSheet, showToast, cur } = useApp();
  const s = state.settings;
  const current = availableFor(state.incomes, state.expenses, s);
  const [actual, setActual] = useState('');
  const [note, setNote] = useState('');

  const n = parseFloat(actual);
  const diff = actual.trim() !== '' && isFinite(n) ? Math.round((n - current) * 100) / 100 : null;

  const inc = state.incomes.filter((x) => countsTowardBalance(x.date, s));
  const exp = state.expenses.filter((x) => countsTowardBalance(x.date, s));
  const incTotal = netBalance(inc, []);
  const expTotal = netBalance([], exp);
  const adjTotal = adjustmentsTotal(s);
  const adjs = [...(s.adjustments || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const save = () => {
    if (diff == null) { showToast('Enter the balance your bank shows'); return; }
    if (adjustBalanceTo(n, note.trim())) closeSheet();
  };

  const breakdown = [
    [s.startingDate ? `Starting balance (${niceDate(s.startingDate)})` : 'Starting balance', formatMoney(s.startingBalance || 0, cur())],
    ['Income since', `+${formatMoney(incTotal, cur())}`],
    ['Expenses since', `−${formatMoney(expTotal, cur())}`],
    ...(adjTotal !== 0 ? [['Adjustments', signed(adjTotal, cur())]] : []),
  ];

  return (
    <Sheet
      title="Available balance"
      onClose={closeSheet}
      footer={
        <button className="btn primary" onClick={save} disabled={diff == null || diff === 0}>
          <Icon name="check" size={18} stroke={2.4} />Adjust balance
        </button>
      }
    >
      <div style={{ textAlign: 'center', padding: '4px 0 16px' }}>
        <div className="mu" style={{ fontSize: 12.5, fontWeight: 600 }}>WealthKnox shows</div>
        <div className="num" style={{ fontFamily: 'var(--hd)', fontWeight: 800, fontSize: 30, letterSpacing: '-.02em', marginTop: 4 }}>
          {current < 0 ? '−' : ''}{formatMoney(Math.abs(current), cur())}
        </div>
      </div>

      <div className="plist" style={{ background: 'var(--surface-2)', borderRadius: 16, padding: '2px 16px', marginBottom: 18 }}>
        {breakdown.map(([l, v], i) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <span className="mu" style={{ fontSize: 13 }}>{l}</span>
            <span className="num" style={{ fontSize: 13, fontWeight: 700 }}>{v}</span>
          </div>
        ))}
      </div>

      <div className="field">
        <label>What your bank + cash actually add up to</label>
        <div className="amtfield">
          <span className="cur">{cur()}</span>
          <input inputMode="decimal" placeholder={String(Math.round(current))} value={actual} onChange={(e) => setActual(e.target.value)} />
        </div>
        <p className="helptext">
          {diff == null
            ? "If it doesn't match, enter the real figure — the difference is saved as an adjustment. It won't count as income or spending in your reports."
            : diff === 0
              ? 'That already matches — nothing to adjust.'
              : `An adjustment of ${signed(diff, cur())} will be recorded today.`}
        </p>
      </div>
      <div className="field">
        <label>Note (optional)</label>
        <input className="input" placeholder="e.g. Forgot to log cash spends" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      {adjs.length ? (
        <div className="field">
          <label>Past adjustments</label>
          <div className="rowlist">
            {adjs.map((a) => (
              <div key={a.id} className="txrow" style={{ cursor: 'default' }}>
                <i className="th"><Icon name="repeat" size={16} stroke={2} /></i>
                <span className="mid">
                  <strong>{a.note || 'Balance adjustment'}</strong>
                  <span>{niceDate(a.date)}</span>
                </span>
                <b className="amt num">{signed(a.amount, cur())}</b>
                <button className="icon-btn" style={{ width: 34, height: 34, minWidth: 34 }} aria-label="Remove adjustment" onClick={() => deleteAdjustment(a.id)}>
                  <Icon name="trash" size={15} stroke={2} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <button className="btn ghost sm" style={{ width: '100%', marginBottom: 8 }} onClick={() => openSheet({ kind: 'starting-balance' })}>
        <Icon name="edit" size={14} stroke={2} />Change starting balance
      </button>
    </Sheet>
  );
}
