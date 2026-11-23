import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';
import { REMINDER_ICONS } from '../data/categories.js';
import { toISO } from '../utils/date.js';

// AddReminderSheet replaces AddGoalSheet. Same Sheet skeleton (name,
// amount, icon picker), but instead of a target-date field it has an
// optional due-date picker. Under the hood the app only stores the
// day-of-month (since reminders are recurring monthly bills), but a
// date picker is a more familiar input than asking for a bare "day 5"
// — the user picks any date, we extract the day part.
//
// When editing an existing reminder that already has a dueDay, the
// picker defaults to that day in the current month (so the user sees a
// real date in the field they can adjust), instead of an empty picker
// that would imply "no due date set".
export default function AddReminderSheet({ editing }) {
  const { closeSheet, openSheet, addReminder, updateReminder, deleteReminder, showToast, cur } = useApp();
  const [name, setName] = useState(editing?.name || '');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  // If editing a reminder that already has a dueDay, default the date
  // picker to that day-of-month in the current month/year. Otherwise
  // leave it empty (the user can pick a date or skip).
  const [dueDate, setDueDate] = useState(() => {
    if (!editing?.dueDay) return '';
    const now = new Date();
    const d = Math.min(editing.dueDay, 28); // clamp to a safe day-of-month
    return toISO(new Date(now.getFullYear(), now.getMonth(), d));
  });
  const [icon, setIcon] = useState(editing?.icon || REMINDER_ICONS[0]);

  const save = () => {
    const nm = name.trim();
    const amt = Number(String(amount).replace(/[^0-9.]/g, ''));
    if (!nm) { showToast('Enter a name'); return; }
    if (!(amt > 0)) { showToast('Enter an amount'); return; }
    // Extract the day-of-month from the picked date. The month and year
    // are discarded — reminders are recurring monthly, so only the day
    // matters. Empty date → null (no due day tracked).
    let day = null;
    if (dueDate) {
      const parts = dueDate.split('-'); // 'YYYY-MM-DD'
      if (parts.length === 3) {
        day = Math.min(31, Math.max(1, parseInt(parts[2], 10) || 0));
      }
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
        <label>Due date (optional)</label>
        <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <p className="helptext">Pick any date — we use the day of the month as the recurring due day each month. Leave empty if you don't want due-day reminders.</p>
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
