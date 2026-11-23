import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';
import { REMINDER_ICONS } from '../data/categories.js';

// AddReminderSheet replaces AddGoalSheet. Same Sheet skeleton (name,
// amount, icon picker), but instead of a target-date field it has an
// optional due-day picker.
//
// The original v1 used a bare numeric input (1-31) which was confusing.
// v2 tried <input type="date"> but the native date picker's month column
// didn't render reliably across devices. v3 (this) uses two explicit
// <select> dropdowns — Month + Day — which render identically everywhere
// and make it visually clear what's being picked.
//
// Under the hood the app still only stores `dueDay: number|null` — the
// month select is for picker UX only, since reminders are recurring
// monthly bills (rent due on the 1st of every month, etc.). The help
// text below the dropdowns makes this explicit.
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Days-in-month for a 1-indexed month (1=Jan … 12=Dec). Feb returns 29
// so the day dropdown always offers up to 29 in February — picking 30
// or 31 for Feb would be invalid, so we just don't offer those options
// when Feb is selected.
function daysInMonth(monthIdx1) {
  // monthIdx1: 1=Jan, 12=Dec
  const days = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[monthIdx1 - 1] || 31;
}

// Ordinal suffix for a day number — "1st", "2nd", "3rd", "4th", …
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function AddReminderSheet({ editing }) {
  const { closeSheet, openSheet, addReminder, updateReminder, deleteReminder, showToast, cur } = useApp();
  const [name, setName] = useState(editing?.name || '');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [icon, setIcon] = useState(editing?.icon || REMINDER_ICONS[0]);

  // Due-day state — two pieces: whether we have a due day at all, and
  // (if so) which day. The month select is for picker UX only and is
  // not stored. When editing a reminder with an existing dueDay, default
  // both selects to the current month + that day so the user sees real
  // values they can adjust.
  const now = new Date();
  const [hasDueDay, setHasDueDay] = useState(!!editing?.dueDay);
  const [month, setMonth] = useState(String(now.getMonth() + 1)); // '1'..'12'
  const [day, setDay] = useState(editing?.dueDay ? String(editing.dueDay) : String(now.getDate()));

  // Clamp day if the user switches to a month with fewer days than the
  // currently-selected day (e.g. picked 31 then switched to February).
  const maxDay = daysInMonth(parseInt(month, 10));
  const effectiveDay = Math.min(parseInt(day, 10) || 1, maxDay);
  if (String(effectiveDay) !== day) {
    // side-effect during render is fine here — just keeping state in sync
    setTimeout(() => setDay(String(effectiveDay)), 0);
  }

  const save = () => {
    const nm = name.trim();
    const amt = Number(String(amount).replace(/[^0-9.]/g, ''));
    if (!nm) { showToast('Enter a name'); return; }
    if (!(amt > 0)) { showToast('Enter an amount'); return; }
    // Store only the day-of-month. Month and year are discarded —
    // reminders are recurring monthly, so only the day matters.
    const storedDay = hasDueDay ? Math.min(31, Math.max(1, parseInt(day, 10) || 1)) : null;
    if (editing) updateReminder(editing.id, { name: nm, amount: amt, dueDay: storedDay, icon });
    else addReminder({ name: nm, amount: amt, dueDay: storedDay, icon });
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
          <span>Due day (optional)</span>
          <button
            type="button"
            onClick={() => setHasDueDay((v) => !v)}
            style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
              background: hasDueDay ? 'var(--ink)' : 'var(--surface-3)',
              color: hasDueDay ? 'var(--on-ink)' : 'var(--ink-2)',
              border: 'none', cursor: 'pointer', letterSpacing: '.04em',
            }}
          >
            {hasDueDay ? 'ON' : 'OFF'}
          </button>
        </label>
        {hasDueDay ? (
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
            <p className="helptext">Recurring every month — pick a month just to choose a valid day (Feb only goes to the 29th, etc.). We only store the day, not the month.</p>
          </>
        ) : (
          <p className="helptext" style={{ padding: '4px 0' }}>No due day — this reminder will just show its amount and paid status, without "Due in N days" hints.</p>
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
