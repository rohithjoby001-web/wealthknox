import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';
import { CATEGORIES } from '../data/categories.js';
import { toISO } from '../utils/date.js';
import { availableFor, countsTowardBalance } from '../utils/calc.js';
import { niceDate } from '../utils/date.js';
import { formatMoney } from '../utils/format.js';

export default function AddExpenseSheet({ editing }) {
  const { state, closeSheet, addExpense, updateExpense, showToast, cur } = useApp();
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId || 'food');
  const [note, setNote] = useState(editing?.note || '');
  const [date, setDate] = useState(editing?.date || toISO(new Date()));
  // `customName` is only relevant when the user picks the "Other" category —
  // instead of forcing every "Other" expense to share the same generic label,
  // they can give it its own name (e.g. "Birthday gift", "Parking fine") that
  // then shows in transaction lists and the recent-activity feed.
  const [customName, setCustomName] = useState(editing?.customName || '');

  // An expense can't be logged past what's actually available — when
  // editing, add the entry's own current amount back in, since it's
  // already subtracted once in this figure.
  const avail = availableFor(state.incomes, state.expenses, state.settings) + (editing && countsTowardBalance(editing.date, state.settings) ? editing.amount : 0);
  const beforeStart = !countsTowardBalance(date, state.settings);

  const isOther = categoryId === 'other';

  const pickCategory = (id) => {
    setCategoryId(id);
    // Clearing customName when leaving "Other" keeps the stored expense doc
    // clean — the reducer's updateExpense path also strips it server-side
    // via patchDoc, so a stale name doesn't linger on a non-Other expense.
    if (id !== 'other') setCustomName('');
  };

  const save = () => {
    const amt = parseFloat(amount);
    if (!(amt > 0)) { showToast('Enter an amount'); return; }
    // When the category is "Other", require a customName — the whole point
    // of the new flow is that Other expenses get their own label, and an
    // Other expense with no name is just the old generic behavior we're
    // trying to replace. Note is separate and still optional.
    if (isOther && !customName.trim()) {
      showToast('Name this expense');
      return;
    }
    // addExpense/updateExpense re-check this same cap and reject with
    // their own toast if it's somehow exceeded (e.g. available balance
    // shifted from another device while this sheet was open) — only
    // close the sheet once the save actually went through.
    const ok = editing
      ? updateExpense(editing.id, { amount: amt, categoryId, note: note.trim(), date, customName: customName.trim() })
      : addExpense({ amount: amt, categoryId, note: note.trim(), date, customName: customName.trim() });
    if (ok) closeSheet();
  };

  return (
    <Sheet
      title={editing ? 'Edit expense' : 'Add expense'}
      onClose={closeSheet}
      footer={
        <button className="btn primary" onClick={save}>
          <Icon name="check" size={18} stroke={2.4} />{editing ? 'Save changes' : 'Save expense'}
        </button>
      }
    >
      <div className="field">
        <label>Amount</label>
        <div className="amtfield">
          <span className="cur">{cur()}</span>
          <input inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </div>
        <p className="helptext">
          {beforeStart
            ? `Dated before your starting balance (${niceDate(state.settings.startingDate)}), so it won't change Available.`
            : avail > 0 ? `${formatMoney(avail, cur())} available` : "You're out of available balance — add income or adjust your balance first."}
        </p>
      </div>
      <div className="field">
        <label>Category</label>
        <div className="catgrid">
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" className={`catcell${categoryId === c.id ? ' on' : ''}`} onClick={() => pickCategory(c.id)}>
              <i><Icon name={c.icon} size={18} stroke={1.9} /></i>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>
      {isOther ? (
        <div className="field">
          <label>Name this expense</label>
          <input className="input" placeholder="e.g. Birthday gift, Parking fine" value={customName} onChange={(e) => setCustomName(e.target.value)} />
          <p className="helptext">Shows as the expense's name in lists and Recent activity, instead of just "Other".</p>
        </div>
      ) : null}
      <div className="field">
        <label>Note (optional)</label>
        <input className="input" placeholder="e.g. Lunch with team" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="field" style={{ marginBottom: 4 }}>
        <label>Date</label>
        <input className="input" type="date" value={date} max={toISO(new Date())} onChange={(e) => setDate(e.target.value)} />
      </div>
    </Sheet>
  );
}
