import { Icon } from '../icons/index.jsx';
import { formatMoney } from '../utils/format.js';
import { MONTHS_SHORT, parseISO } from '../utils/date.js';
import { reminderPaidFor, reminderDueIn, reminderDueDate, reminderIsRecurring } from '../utils/calc.js';

// ReminderCard shows a bill's name, amount, and due-date status for the
// current month. The status is conveyed two ways:
//   1. A subtitle with the actual due date (e.g. "Dec 7") instead of the
//      old "Day 7" label that was confusing and discarded the month.
//   2. A status pill on the right side:
//        - Paid         → white badge with checkmark (existing .badge-done)
//        - Upcoming     → blue pill using --accent (the one accent color)
//        - Due today    → white pill (no checkmark)
//        - Overdue      → no pill, the subtitle text carries the warning
//        - No due date  → no pill, just shows "No due date"
//
// The whole card opens the detail sheet on click.
export default function ReminderCard({ reminder, currency, monthKeyStr, today, onClick }) {
  const paid = reminderPaidFor(reminder, monthKeyStr);
  const dueIn = reminderDueIn(reminder, today);
  const dueDateISO = reminderDueDate(reminder, today);

  // Format the due date as "Dec 7" (short month + day, no year). If no
  // due date is set, leave it empty — the subtitle handles that case.
  let dateLabel = '';
  if (dueDateISO) {
    const d = parseISO(dueDateISO);
    dateLabel = `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
  }

  // Build the subtitle (under the name) and the right-side pill.
  // For recurring reminders, also show a small "↻ Monthly" tag in the
  // bottom row so it's clear this is a recurring bill, not a one-time date.
  const isRecurring = reminderIsRecurring(reminder);
  let sub;
  let pill = null; // { text, variant }

  if (paid) {
    sub = dateLabel ? `Paid · next ${dateLabel}` : 'Paid this month';
    pill = { text: 'Paid', variant: 'done' }; // white badge with check
  } else if (dueIn == null) {
    sub = 'No due date';
  } else if (dueIn === 0) {
    sub = dateLabel ? `Due today · ${dateLabel}` : 'Due today';
    pill = { text: 'Due today', variant: 'today' }; // white pill
  } else if (dueIn > 0) {
    sub = dateLabel ? `${dateLabel} · in ${dueIn} day${dueIn === 1 ? '' : 's'}` : `Due in ${dueIn} day${dueIn === 1 ? '' : 's'}`;
    pill = { text: 'Upcoming', variant: 'upcoming' }; // blue pill
  } else {
    // Overdue — no pill (the muted text carries the warning, less alarming
    // than a red badge would be — stays within the monochrome system).
    const days = -dueIn;
    sub = dateLabel ? `${dateLabel} · ${days} day${days === 1 ? '' : 's'} overdue` : `${days} day${days === 1 ? '' : 's'} overdue`;
  }

  return (
    <button className={`goalcard${paid ? ' done' : ''}`} onClick={onClick}>
      <div className="gh">
        <i className="icn"><Icon name={reminder.icon} size={20} stroke={1.9} /></i>
        <div className="t">
          <strong>{reminder.name}</strong>
          <span>{sub}</span>
        </div>
        {pill ? (
          pill.variant === 'done' ? (
            <span className="badge-done"><Icon name="check" size={11} stroke={3} />{pill.text}</span>
          ) : pill.variant === 'upcoming' ? (
            <span className="badge-upcoming">{pill.text}</span>
          ) : (
            <span className="badge-today">{pill.text}</span>
          )
        ) : null}
      </div>
      <div className="gstats">
        <span className="mu">
          {isRecurring ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="repeat" size={11} stroke={2.2} style={{ verticalAlign: '-1px' }} />
              Monthly · day {reminder.dueDay}
            </span>
          ) : (dateLabel || 'No due date')}
        </span>
        <b className="num">{formatMoney(reminder.amount, currency)}</b>
      </div>
    </button>
  );
}
