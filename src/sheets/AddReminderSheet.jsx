import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';
import { REMINDER_ICONS } from '../data/categories.js';

// AddReminderSheet replaces AddGoalSheet. Same Sheet skeleton (name,
// amount, icon picker), but instead of a target-date field it has an
// optional due-day-of-month input (1–31) — what day of the month this
// bill is typically due, so the card can show "Due in N days" / "Overdue".
export default function AddReminderSheet({ editing }) {
  const { closeSheet, openSheet, addReminder, updateReminder, deleteReminder, showToast, cur } = useApp();
  const [name, setName] = useState(editing?.name || '');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [dueDay, setDueDay] = useState(editing?.dueDay ? String(editing.dueDay) : '');
  const [icon, setIcon] = useState(editing?.icon || REMINDER_ICONS[0]);

  const save = () => {
    const nm = name.trim();
    const amt = Number(String(amount).replace(/[^0-9.]/g, ''));
    if (!nm) { showToast('Enter a name'); return; }
    if (!(amt > 0)) { showToast('Enter an amount'); return; }
    // Due day is optional — empty string becomes null. Clamp to 1–31.
    let day = null;
    if (dueDay) {
      day = Math.min(31, Math.max(1, parseInt(String(dueDay).replace(/[^0-9]/g, ''), 10) || 0));
    }
    if (editing) updateReminder(editing.id, { name: nm, amount: amt, dueDay: day, icon });
    else addReminder({ name: nm, amount: amt, dueDay: day, icon });
    closeSheet();
  };

  const askDelete = () => {
    openSheet({
      kind: 'confirm',
      title: 'Delete this reminder?',
      text: "The bill won't be tracked anymore. Past paid months are removed too.",
      confirmLabel: 'Delete',
      onConfirm: () => deleteReminder(editing.id),
    });
  };

  return (
    <Sheet
      title={editing ? 'Edit reminder' : 'New reminder'}
      onClose={closeSheet}
      footer={
        <div className="stack-sm">
          <button className="btn primary" onClick={save}>
            <Icon name="check" size={18} stroke={2.4} />{editing ? 'Save changes' : 'Create reminder'}
          </button>
          {editing ? (
            <button className="btn danger" onClick={askDelete}>
              <Icon name="trash" size={17} stroke={2} />Delete reminder
            </button>
          ) : null}
        </div>
      }
    >
      <div className="field">
        <label>What's the bill for?</label>
        <input className="input" placeholder="e.g. Rent, Electricity, Phone" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label>Amount</label>
        <div className="amtfield">
          <span className="cur">{cur()}</span>
          <input inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Due day of month (optional)</label>
        <input className="input" inputMode="numeric" placeholder="e.g. 5 — empty if not sure" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        <p className="helptext">Used to show "Due in N days" or "Overdue" on the card.</p>
      </div>
      <div className="field" style={{ marginBottom: 4 }}>
        <label>Icon</label>
        <div className="catgrid">
          {REMINDER_ICONS.map((ic) => (
            <button key={ic} type="button" className={`catcell${icon === ic ? ' on' : ''}`} style={{ padding: '14px 4px' }} onClick={() => setIcon(ic)}>
              <i><Icon name={ic} size={19} stroke={1.9} /></i>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
