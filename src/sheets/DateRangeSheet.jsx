import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';
import { toISO } from '../utils/date.js';

export default function DateRangeSheet({ initialFrom, initialTo, onApply }) {
  const { closeSheet, showToast } = useApp();
  const today = toISO(new Date());
  const [from, setFrom] = useState(initialFrom || today);
  const [to, setTo] = useState(initialTo || today);

  const apply = () => {
    if (!from || !to) { showToast('Pick both dates'); return; }
    if (from > to) { showToast('Start date has to be before the end date'); return; }
    onApply(from, to);
    closeSheet();
  };

  return (
    <Sheet
      title="Custom date range"
      onClose={closeSheet}
      footer={
        <button className="btn primary" onClick={apply}>
          <Icon name="check" size={18} stroke={2.4} />Show this range
        </button>
      }
    >
      <div className="field">
        <label>From</label>
        <input className="input" type="date" value={from} max={to || today} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div className="field" style={{ marginBottom: 4 }}>
        <label>To</label>
        <input className="input" type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />
      </div>
    </Sheet>
  );
}
