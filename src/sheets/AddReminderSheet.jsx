import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';
import { REMINDER_ICONS } from '../data/categories.js';
import { toISO, parseISO } from '../utils/date.js';

// AddReminderSheet — bills the user wants to track paid/unpaid status for.
//
// Two flavors of due date, picked via a segmented control:
//
//   1. "Every month" (recurring): the bill is due on the same day of every
//      month (rent on the 1st, phone on the 27th, etc.). Just pick a Day.
//      The card always shows the NEXT upcoming occurrence — once this
//      month's date passes and it's marked paid, it auto-rolls to next
//      month's date. No manual date editing needed, ever.
//
//   2. "One-time": a specific due date for a one-off payment. Pick Month +
//      Day (year is inferred: this year if today-or-later, else next year).
//      After it passes, shows overdue until marked paid or deleted.
//
// The default is "Every month" since most bills people track are recurring.
//
// An ON/OFF toggle pill lets the user disable the due date entirely.
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function daysInMonth(monthIdx1) {
  const days = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[monthIdx1 - 1] || 31;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Smart year inference for one-time reminders: this year if the picked
// month/day is today or later, otherwise next year.
function nextOccurrenceISO(monthIdx1, day, today = new Date()) {
  const yr = today.getFullYear();
  const candidate = new Date(yr, monthIdx1 - 1, day, 12);
  const todayNoon = new Date(yr, today.getMonth(), today.getDate(), 12);
  if (candidate >= todayNoon) return toISO(new Date(yr, monthIdx1 - 1, day));
  return toISO(new Date(yr + 1, monthIdx1 - 1, day));
}

export default function AddReminderSheet({ editing }) {
  const { closeSheet, openSheet, addReminder, updateReminder, deleteReminder, showToast, cur } = useApp();
  const [name, setName] = useState(editing?.name || '');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [icon, setIcon] = useState(editing?.icon || REMINDER_ICONS[0]);

  // Determine the initial "recurring" mode from the editing reminder.
  // New reminders default to recurring=true (most bills are monthly).
  const editingRecurring = editing
    ? (editing.recurring != null ? editing.recurring : (editing.dueDay != null && !editing.dueDate))
    : true;
  const [hasDueDate, setHasDueDate] = useState(!!(editing?.dueDay || editing?.dueDate));
  const [recurring, setRecurring] = useState(editingRecurring);

  const now = new Date();
  // For recurring mode: just a Day dropdown, defaults to the editing
  // reminder's dueDay or today's date.
  const [day, setDay] = useState(() => {
    if (editing?.recurring && editing?.dueDay) return String(editing.dueDay);
    if (editing?.dueDay) return String(editing.dueDay);
    return String(now.getDate());
  });
  // For one-time mode: Month + Day dropdowns.
  const [month, setMonth] = useState(() => {
    if (editing?.dueDate) {
      const d = parseISO(editing.dueDate);
      return String(d.getMonth() + 1);
    }
    return String(now.getMonth() + 1);
  });
  const [oneTimeDay, setOneTimeDay] = useState(() => {
    if (editing?.dueDate) {
      const d = parseISO(editing.dueDate);
      return String(d.getDate());
    }
    return String(now.getDate());
  });

  // Clamp day if the user switches to a month with fewer days.
  const maxDay = daysInMonth(parseInt(month, 10));
  const effectiveOneTimeDay = Math.min(parseInt(oneTimeDay, 10) || 1, maxDay);
  if (String(effectiveOneTimeDay) !== oneTimeDay) {
    setTimeout(() => setOneTimeDay(String(effectiveOneTimeDay)), 0);
  }

  const save = () => {
    const nm = name.trim();
    const amt = Number(String(amount).replace(/[^0-9.]/g, ''));
    if (!nm) { showToast('Enter a name'); return; }
    if (!(amt > 0)) { showToast('Enter an amount'); return; }

    if (!hasDueDate) {
      // No due date at all
      if (editing) updateReminder(editing.id, { name: nm, amount: amt, recurring: false, dueDay: null, dueDate: null, icon });
      else addReminder({ name: nm, amount: amt, recurring: false, dueDay: null, dueDate: null, icon });
    } else if (recurring) {
      // Recurring monthly — store just the day-of-month
      const d = Math.min(31, Math.max(1, parseInt(day, 10) || 1));
      if (editing) updateReminder(editing.id, { name: nm, amount: amt, recurring: true, dueDay: d, dueDate: null, icon });
      else addReminder({ name: nm, amount: amt, recurring: true, dueDay: d, dueDate: null, icon });
    } else {
      // One-time — store the full date with smart year inference
      const m = parseInt(month, 10);
      const d = Math.min(31, Math.max(1, parseInt(oneTimeDay, 10) || 1));
      const iso = nextOccurrenceISO(m, d, now);
      if (editing) updateReminder(editing.id, { name: nm, amount: amt, recurring: false, dueDay: null, dueDate: iso, icon });
      else addReminder({ name: nm, amount: amt, recurring: false, dueDay: null, dueDate: iso, icon });
    }
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
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span>Due date (optional)</span>
          <button
            type="button"
            onClick={() => setHasDueDate((v) => !v)}
            style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
              background: hasDueDate ? 'var(--ink)' : 'var(--surface-3)',
              color: hasDueDate ? 'var(--on-ink)' : 'var(--ink-2)',
              border: 'none', cursor: 'pointer', letterSpacing: '.04em',
            }}
          >
            {hasDueDate ? 'ON' : 'OFF'}
          </button>
        </label>
        {hasDueDate ? (
          <>
            {/* Segmented control: Every month vs One-time */}
            <div className="seg" style={{ marginBottom: 12 }}>
              <button type="button" className={recurring ? 'on' : ''} onClick={() => setRecurring(true)}>Every month</button>
              <button type="button" className={!recurring ? 'on' : ''} onClick={() => setRecurring(false)}>One-time</button>
            </div>
            {recurring ? (
              <>
                {/* Recurring: just a Day dropdown */}
                <select
                  className="input"
                  value={String(day)}
                  onChange={(e) => setDay(e.target.value)}
                  style={{ width: '100%', appearance: 'auto', WebkitAppearance: 'auto' }}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={String(d)}>{ordinal(d)} of every month</option>
                  ))}
                </select>
                <p className="helptext">Recurs every month on this day. The card always shows the next upcoming date — once you mark it paid, it auto-rolls to next month.</p>
              </>
            ) : (
              <>
                {/* One-time: Month + Day dropdowns */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    className="input"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    style={{ width: 'auto', flex: '0 0 auto', minWidth: 0, appearance: 'auto', WebkitAppearance: 'auto' }}
                  >
                    {MONTHS.map((m, i) => <option key={i + 1} value={String(i + 1)}>{m}</option>)}
                  </select>
                  <select
                    className="input"
                    value={String(effectiveOneTimeDay)}
                    onChange={(e) => setOneTimeDay(e.target.value)}
                    style={{ width: 'auto', flex: 1, minWidth: 0, appearance: 'auto', WebkitAppearance: 'auto' }}
                  >
                    {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d)}>{ordinal(d)}</option>
                    ))}
                  </select>
                </div>
                <p className="helptext">One-time due date. Year is auto-set: this year if the date is today or later, otherwise next year. After it passes, the reminder shows overdue until you mark it paid or delete it.</p>
              </>
            )}
          </>
        ) : (
          <p className="helptext" style={{ padding: '4px 0' }}>No due date — this reminder will just show its amount and paid status, without "Due in N days" hints.</p>
        )}
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
