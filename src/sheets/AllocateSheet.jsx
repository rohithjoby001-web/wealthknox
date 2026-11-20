import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';
import { formatMoney } from '../utils/format.js';

export default function AllocateSheet({ goalId, mode = 'add' }) {
  const { state, closeSheet, allocateToGoal, withdrawFromGoal, allocationCap, cur } = useApp();
  const g = state.goals.find((x) => x.id === goalId);
  const [amount, setAmount] = useState('');
  if (!g) return null;

  const isWithdraw = mode === 'withdraw';
  const { avail, remaining, cap: addCap } = allocationCap(goalId);
  const cap = isWithdraw ? g.allocated : addCap;

  const quick = (frac) => {
    const v = frac === 'max' ? Math.floor(cap) : Math.floor(cap * Number(frac));
    setAmount(v > 0 ? String(v) : '');
  };

  const save = () => {
    const amt = Number(String(amount).replace(/[^0-9.]/g, ''));
    const ok = isWithdraw ? withdrawFromGoal(goalId, amt) : allocateToGoal(goalId, amt);
    if (ok) closeSheet();
  };

  return (
    <Sheet
      title={isWithdraw ? `Withdraw from “${g.name}”` : `Add to “${g.name}”`}
      onClose={closeSheet}
      footer={
        <button className="btn primary" onClick={save}>
          <Icon name={isWithdraw ? 'minus' : 'check'} size={18} stroke={2.4} />{isWithdraw ? 'Withdraw' : 'Allocate'}
        </button>
      }
    >
      <div className="note">
        <span>{isWithdraw ? 'Currently saved toward this target' : 'Available to allocate'}</span>
        <b className="num">{formatMoney(isWithdraw ? g.allocated : avail, cur())}</b>
      </div>
      <div className="field">
        <label>Amount</label>
        <div className="amtfield">
          <span className="cur">{cur()}</span>
          <input inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </div>
        <p className="helptext">
          {isWithdraw
            ? (cap <= 0 ? "Nothing saved toward this target yet." : `Up to ${formatMoney(cap, cur())} — it goes back to your available balance.`)
            : (cap <= 0
              ? (remaining <= 0 ? 'This target is already fully funded.' : 'No available balance right now — add income or reduce spending first.')
              : `Up to ${formatMoney(cap, cur())} — limited by ${avail < remaining ? 'your available balance' : "what's left on this target"}.`)}
        </p>
      </div>
      {cap > 0 ? (
        <div className="pillselect">
          <button type="button" onClick={() => quick('0.25')}>25%</button>
          <button type="button" onClick={() => quick('0.5')}>50%</button>
          <button type="button" onClick={() => quick('max')}>Max</button>
        </div>
      ) : null}
    </Sheet>
  );
}
