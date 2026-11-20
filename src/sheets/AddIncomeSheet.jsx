import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';
import { toISO } from '../utils/date.js';

export default function AddIncomeSheet({ editing }) {
  const { state, closeSheet, openSheet, addIncome, updateIncome, showToast, cur } = useApp();
  const { sources } = state;

  if (sources.length === 0) {
    return (
      <Sheet title="Add income" onClose={closeSheet}>
        <p className="mu" style={{ fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
          Add an income source first — like your main job or a side hustle.
        </p>
        <button className="btn primary" onClick={() => openSheet({ kind: 'add-source' })}>
          <Icon name="plus" size={18} stroke={2.3} />Add a source
        </button>
      </Sheet>
    );
  }

  return <AddIncomeForm editing={editing} sources={sources} closeSheet={closeSheet} addIncome={addIncome} updateIncome={updateIncome} showToast={showToast} cur={cur} />;
}

function AddIncomeForm({ editing, sources, closeSheet, addIncome, updateIncome, showToast, cur }) {
  const e = editing || {};
  const [amount, setAmount] = useState(e.amount ? String(e.amount) : '');
  const [sourceId, setSourceId] = useState(e.sourceId || sources[0].id);
  const [note, setNote] = useState(e.note || '');
  const [date, setDate] = useState(e.date || toISO(new Date()));

  const save = () => {
    const amt = Number(String(amount).replace(/[^0-9.]/g, ''));
    if (!(amt > 0)) { showToast('Enter an amount'); return; }
    if (!sourceId) { showToast('Pick a source'); return; }
    if (editing) updateIncome(editing.id, { amount: amt, sourceId, note: note.trim(), date });
    else addIncome({ amount: amt, sourceId, note: note.trim(), date });
    closeSheet();
  };

  return (
    <Sheet
      title={editing ? 'Edit income' : 'Add income'}
      onClose={closeSheet}
      footer={
        <button className="btn primary" onClick={save}>
          <Icon name="check" size={18} stroke={2.4} />{editing ? 'Save changes' : 'Save income'}
        </button>
      }
    >
      <div className="field">
        <label>Amount</label>
        <div className="amtfield">
          <span className="cur">{cur()}</span>
          <input inputMode="decimal" placeholder="0" value={amount} onChange={(ev) => setAmount(ev.target.value)} autoFocus />
        </div>
      </div>
      <div className="field">
        <label>Source</label>
        <div className="pillselect">
          {sources.map((s) => (
            <button key={s.id} type="button" className={sourceId === s.id ? 'on' : ''} onClick={() => setSourceId(s.id)}>{s.name}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Note (optional)</label>
        <input className="input" placeholder="e.g. November salary" value={note} onChange={(ev) => setNote(ev.target.value)} />
      </div>
      <div className="field" style={{ marginBottom: 4 }}>
        <label>Date</label>
        <input className="input" type="date" value={date} max={toISO(new Date())} onChange={(ev) => setDate(ev.target.value)} />
      </div>
    </Sheet>
  );
}
