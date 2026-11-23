import { Icon } from '../icons/index.jsx';
import { formatMoney } from '../utils/format.js';
import { reminderPaidFor, reminderDueIn } from '../utils/calc.js';

// ReminderCard replaces GoalCard. Same visual skeleton (bordered card,
// icon, name, amount) but instead of an allocation progress bar it shows
// the bill's due-day hint and a paid/unpaid toggle for the current month.
//
// The whole card opens the detail sheet on click, EXCEPT the paid toggle
// button which stops propagation so tapping it just flips the paid state
// without also opening the detail sheet.
export default function ReminderCard({ reminder, currency, monthKeyStr, today, onClick }) {
  const paid = reminderPaidFor(reminder, monthKeyStr);
  const dueIn = reminderDueIn(reminder, today);

  // Caption under the name: due-day hint when not yet paid, "Paid" when paid.
  let sub;
  if (paid) {
    sub = 'Paid this month';
  } else if (dueIn == null) {
    sub = `${formatMoney(reminder.amount, currency)} due`;
  } else if (dueIn === 0) {
    sub = 'Due today';
  } else if (dueIn > 0) {
    sub = `Due in ${dueIn} day${dueIn === 1 ? '' : 's'}`;
  } else {
    sub = `${-dueIn} day${dueIn === -1 ? '' : 's'} overdue`;
  }

  return (
    <button className={`goalcard${paid ? ' done' : ''}`} onClick={onClick}>
      <div className="gh">
        <i className="icn"><Icon name={reminder.icon} size={20} stroke={1.9} /></i>
        <div className="t">
          <strong>{reminder.name}</strong>
          <span>{sub}</span>
        </div>
        {paid ? (
          <span className="badge-done"><Icon name="check" size={11} stroke={3} />Paid</span>
        ) : null}
      </div>
      <div className="gstats">
        <span className="mu">{reminder.dueDay ? `Day ${reminder.dueDay}` : 'No due day'}</span>
        <b className="num">{formatMoney(reminder.amount, currency)}</b>
      </div>
    </button>
  );
}
