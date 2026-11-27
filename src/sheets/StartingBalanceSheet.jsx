import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';
import { toISO, niceDate } from '../utils/date.js';
import { formatMoney } from '../utils/format.js';

// Sets the dated starting point: "I had X at the start of DATE".
// Opened from Settings, and automatically on first launch (onboarding),
// where it also offers "Skip for now".
export default function StartingBalanceSheet({ onboarding = false }) {
  const { state, closeSheet, setStartingPoint, dismissOnboarding, showToast, cur } = useApp();
  const s = state.settings;
  const [amount, setAmount] = useState(s.startingBalance ? String(s.startingBalance) : '');
  const [date, setDate] = useState(s.startingDate || toISO(new Date()));

  const earlier = [...state.incomes, ...state.expenses].filter((x) => x.date < date).length;

  const save = () => {
    const n = parseFloat(amount);
    if (amount.trim() === '' || !isFinite(n) || n < 0) { showToast('Enter an amount (0 is fine)'); return; }
    if (!date) { showToast('Pick a date'); return; }
    setStartingPoint({ amount: n, date });
    closeSheet();
  };
  const skip = () => { dismissOnboarding(); closeSheet(); };
  const close = onboarding ? skip : closeSheet;

  return (
    <Sheet
      title={onboarding ? 'Welcome — set your balance' : 'Starting balance'}
      onClose={close}
      footer={
        <>
          <button className="btn primary" onClick={save}><Icon name="check" size={18} stroke={2.4} />Save starting balance</button>
          {onboarding ? <button className="btn ghost" onClick={skip}>Skip for now</button> : null}
        </>
      }
    >
      {onboarding ? (
        <p className="mu" style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 18 }}>
          How much money do you have right now across your bank and cash? WealthKnox starts from this figure, then adds every income and subtracts every expense you log after it.
        </p>
      ) : null}

      <div className="field">
        <label>Amount you had</label>
        <div className="amtfield">
          <span className="cur">{cur()}</span>
          <input inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </div>
      </div>

      <div className="field">
        <label>At the start of</label>
        <input className="input" type="date" value={date} max={toISO(new Date())} onChange={(e) => setDate(e.target.value)} />
        <p className="helptext">
          Entries dated on or after this day are added to or taken from this amount. Anything earlier is treated as already included, so it's never counted twice.
          {earlier > 0 ? ` ${earlier} existing entr${earlier === 1 ? 'y is' : 'ies are'} dated before this and won't affect Available (they still show in Reports).` : ''}
        </p>
      </div>

      {!onboarding && (s.adjustments || []).length > 0 ? (
        <div className="note" style={{ alignItems: 'flex-start', gap: 10 }}>
          <span style={{ lineHeight: 1.45 }}>Saving a new starting balance clears your {s.adjustments.length} balance adjustment{s.adjustments.length === 1 ? '' : 's'}, since they were corrections to the old figure.</span>
        </div>
      ) : null}

      {!onboarding && s.startingBalance > 0 && !s.startingDate ? (
        <p className="helptext" style={{ marginTop: -6 }}>
          Your current {formatMoney(s.startingBalance, cur())} has no date, so every entry ever logged counts against it. Saving with a date fixes that.
        </p>
      ) : null}
      {!onboarding && s.startingDate ? (
        <p className="helptext" style={{ marginTop: -6 }}>Currently {formatMoney(s.startingBalance, cur())} from {niceDate(s.startingDate)}.</p>
      ) : null}
    </Sheet>
  );
}
