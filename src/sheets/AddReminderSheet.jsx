import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';
import { REMINDER_ICONS } from '../data/categories.js';
import { toISO, parseISO } from '../utils/date.js';

// AddReminderSheet — bills the user wants to track paid/unpaid status for,
// with a specific due date (full ISO 'YYYY-MM-DD').
//
// The due-date UI uses two <select> dropdowns (Month + Day) because the
// native <input type="date"> picker had rendering issues on some devices
// (the month column wasn't visible). The year is inferred smartly: if the
// picked month/day is today or later this year, use this year; if it's
// already passed this year, use next year. This way "December 7" saved
// in November → "2026-12-07", and "January 5" saved in November → "2027-01-05".
//
// When editing, the existing dueDate is parsed back into Month + Day
// dropdown values so the user sees what they previously picked (no more
// "December → November" bug where the month got discarded).
//
// An ON/OFF toggle pill lets the user disable the due date entirely
// (some bills don't have a specific due date — they just want to track
// the amount and paid status).
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

// Smart year inference: given a 1-indexed month and day, return the ISO
// date 'YYYY-MM-DD' for the next occurrence of that month/day from today.
// If the month/day is today or later this year, use this year; if it's
// already passed, use next year.
function nextOccurrenceISO(monthIdx1, day, today = new Date()) {
  const yr = today.getFullYear();
  const candidate = new Date(yr, monthIdx1 - 1, day, 12); // noon to avoid DST edge issues
  const todayNoon = new Date(yr, today.getMonth(), today.getDate(), 12);
  if (candidate >= todayNoon) return toISO(new Date(yr, monthIdx1 - 1, day));
  return toISO(new Date(yr + 1, monthIdx1 - 1, day));
}

export default function AddReminderSheet({ editing }) {
  const { closeSheet, openSheet, addReminder, updateReminder, deleteReminder, showToast, cur } = useApp();
  const [name, setName] = useState(editing?.name || '');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [icon, setIcon] = useState(editing?.icon || REMINDER_ICONS[0]);

  // Parse the existing dueDate (if any) back into Month + Day dropdown
  // values. This preserves what the user previously picked — no more
  // "December → November" bug where the month got discarded.
  const now = new Date();
  const [hasDueDate, setHasDueDate] = useState(!!editing?.dueDate);
  const [month, setMonth] = useState(() => {
    if (editing?.dueDate) {
      const d = parseISO(editing.dueDate);
      return String(d.getMonth() + 1);
    }
    return String(now.getMonth() + 1);
  });
  const [day, setDay] = useState(() => {
    if (editing?.dueDate) {
      const d = parseISO(editing.dueDate);
      return String(d.getDate());
    }
    return String(now.getDate());
  });

  // Clamp day if the user switches to a month with fewer days than the
  // currently-selected day (e.g. picked 31 then switched to February).
  const maxDay = daysInMonth(parseInt(month, 10));
  const effectiveDay = Math.min(parseInt(day, 10) || 1, maxDay);
  if (String(effectiveDay) !== day) {
    setTimeout(() => setDay(String(effectiveDay)), 0);
  }

  const save = () => {
    const nm = name.trim();
    const amt = Number(String(amount).replace(/[^0-9.]/g, ''));
    if (!nm) { showToast('Enter a name'); return; }
    if (!(amt > 0)) { showToast('Enter an amount'); return; }
    // Build the full ISO due date using smart year inference. This
    // preserves the month (the December→November bug was caused by
    // discarding the month and only storing the day-of-month).
    let stored = null;
    if (hasDueDate) {
      const m = parseInt(month, 10);
      const d = Math.min(31, Math.max(1, parseInt(day, 10) || 1));
      stored = nextOccurrenceISO(m, d, now);
    }
    if (editing) updateReminder(editing.id, { name: nm, amount: amt, dueDate: stored, icon });
    else addReminder({ name: nm, amount: amt, dueDate: stored, icon });
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
                value={String(effectiveDay)}
                onChange={(e) => setDay(e.target.value)}
                style={{ width: 'auto', flex: 1, minWidth: 0, appearance: 'auto', WebkitAppearance: 'auto' }}
              >
                {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d)}>{ordinal(d)}</option>
                ))}
              </select>
            </div>
            <p className="helptext">Year is auto-set: this year if the date is today or later, otherwise next year. The full date is what shows on the card.</p>
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
