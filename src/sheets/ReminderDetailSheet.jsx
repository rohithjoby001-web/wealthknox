import Sheet from './Sheet.jsx';
import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';
import { formatMoney } from '../utils/format.js';
import { monthLabel } from '../utils/date.js';
import { reminderPaidFor, reminderDueIn, reminderMonthStats } from '../utils/calc.js';

// ReminderDetailSheet replaces GoalDetailSheet. Shows the reminder's
// details, a "Mark paid / Mark unpaid" toggle for the current month,
// and a small history of past paid months (so you can see at a glance
// which months you've already covered).
//
// No allocate/withdraw flow anymore — reminders aren't earmarked money,
// they're a checklist. Marking paid is just a state toggle.
export default function ReminderDetailSheet({ reminderId }) {
  const { state, closeSheet, openSheet, toggleReminderPaid, deleteReminder, cur } = useApp();
  const r = state.reminders.find((x) => x.id === reminderId);
  if (!r) return null;

  const today = new Date();
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const paid = reminderPaidFor(r, key);
  const dueIn = reminderDueIn(r, today);

  // Caption for the current-month state.
  let monthStateText;
  if (paid) {
    monthStateText = `Paid for ${monthLabel(today)}`;
  } else if (dueIn == null) {
    monthStateText = `Not yet paid for ${monthLabel(today)}`;
  } else if (dueIn === 0) {
    monthStateText = `Due today · ${monthLabel(today)}`;
  } else if (dueIn > 0) {
    monthStateText = `Due in ${dueIn} day${dueIn === 1 ? '' : 's'} · ${monthLabel(today)}`;
  } else {
    monthStateText = `${-dueIn} day${dueIn === -1 ? '' : 's'} overdue · ${monthLabel(today)}`;
  }

  // Sort paid months descending (most recent first) for the history list.
  const paidMonthsDesc = [...(r.paidMonths || [])].sort((a, b) => b.localeCompare(a));

  // Monthly totals across all reminders (for context: "this is X% of your monthly bills").
  const stats = reminderMonthStats(state.reminders, key);

  return (
    <Sheet
      title={r.name}
      onClose={closeSheet}
      footer={
        <div className="stack-sm">
          <button
            className={`btn ${paid ? 'ghost' : 'primary'}`}
            onClick={() => toggleReminderPaid(r.id, key)}
          >
            <Icon name={paid ? 'minus' : 'check'} size={18} stroke={2.4} />
            {paid ? 'Mark unpaid' : 'Mark paid'}
          </button>
          <div className="btn-row">
            <button className="btn ghost" onClick={() => openSheet({ kind: 'add-reminder', editing: r })}>
              <Icon name="edit" size={16} stroke={2} />Edit
            </button>
            <button className="btn danger" onClick={() => openSheet({
              kind: 'confirm',
              title: 'Delete this reminder?',
              text: "The bill won't be tracked anymore. Past paid months are removed too.",
              confirmLabel: 'Delete',
              onConfirm: () => { closeSheet(); deleteReminder(r.id); },
            })}>
              <Icon name="trash" size={16} stroke={2} />Delete
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 0 18px' }}>
        <i style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', marginBottom: 12 }}>
          <Icon name={r.icon} size={24} stroke={1.8} />
        </i>
        <div className="num" style={{ fontFamily: 'var(--hd)', fontWeight: 800, fontSize: 30, letterSpacing: '-.02em' }}>
          {formatMoney(r.amount, cur())}
        </div>
        <div className="mu" style={{ marginTop: 4, fontSize: 13.5 }}>{monthStateText}</div>
        {r.dueDay ? (
          <div className="mu" style={{ marginTop: 2, fontSize: 12.5 }}>Due on day {r.dueDay} of each month</div>
        ) : null}
      </div>

      {stats.totalCount > 1 ? (
        <div className="note" style={{ marginBottom: 18 }}>
          <span>Share of monthly bills</span>
          <b className="num">{Math.round((r.amount / stats.total) * 100)}%</b>
        </div>
      ) : null}

      <div className="section-h" style={{ margin: '6px 0 8px' }}><h2 style={{ fontSize: 14.5 }}>Paid months</h2></div>
      {paidMonthsDesc.length === 0 ? (
        <p className="mu" style={{ fontSize: 13.5, padding: '8px 0 4px' }}>Not marked paid in any month yet.</p>
      ) : (
        <div className="plist" style={{ background: 'var(--surface-2)', borderRadius: 16, padding: '4px 16px' }}>
          {paidMonthsDesc.map((k) => {
            // Parse 'YYYY-MM' into a Date for niceMonthYear display.
            const [y, m] = k.split('-').map(Number);
            const d = new Date(y, m - 1, 1);
            const isCurrent = k === key;
            return (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: '1px solid var(--line)' }}>
                <span className="mu" style={{ fontSize: 13.5 }}>{monthLabel(d)}{isCurrent ? ' · this month' : ''}</span>
                <span className="num" style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>
                  <Icon name="check" size={13} stroke={2.6} style={{ verticalAlign: '-2px' }} />
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
