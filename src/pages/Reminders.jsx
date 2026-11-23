import { useApp } from '../state/AppContext.jsx';
import Header from '../components/Header.jsx';
import StatTile from '../components/StatTile.jsx';
import ReminderCard from '../components/ReminderCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Icon } from '../icons/index.jsx';
import { monthKey, monthLabel } from '../utils/date.js';
import { formatMoney } from '../utils/format.js';
import { availableBalance, reminderMonthStats, reminderDueDate } from '../utils/calc.js';

// Reminders replaces Goals/Targets. Each reminder is a recurring monthly
// bill (rent, electricity, etc.) with an amount and optional due day.
// The page shows a hero with this month's total bills + paid/pending
// breakdown, two stat tiles, and a list of reminders sorted by due day.
//
// Unlike goals, reminders don't earmark money — marking a bill paid is
// just a checklist toggle, not a cash movement. The actual money out is
// recorded separately as an expense in the Expenses page when the bill
// is paid. So availableBalance here is shown for context (what you have
// to pay these bills with) but isn't affected by the reminders themselves.
export default function Reminders() {
  const { state, openSheet, cur } = useApp();
  const { incomes, expenses, reminders } = state;
  const today = new Date();
  const key = monthKey(today);

  const avail = availableBalance(incomes, expenses, reminders, state.settings.startingBalance);
  const stats = reminderMonthStats(reminders, key);

  // Sort: unpaid first (so they're actionable), then by due date ascending
  // (soonest due first), then by name. Paid ones sink to the bottom.
  const sorted = [...reminders].sort((a, b) => {
    const aPaid = (a.paidMonths || []).includes(key);
    const bPaid = (b.paidMonths || []).includes(key);
    if (aPaid !== bPaid) return aPaid ? 1 : -1;
    // Both unpaid or both paid — sort by due date (nulls last)
    const aISO = reminderDueDate(a, today);
    const bISO = reminderDueDate(b, today);
    if (aISO && bISO) return aISO.localeCompare(bISO);
    if (aISO) return -1;
    if (bISO) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      <Header title="Reminders" subtitle={monthLabel(today)} />

      <div className={`hero${stats.pending > avail ? ' neg' : ''}`}>
        <div className="hero-top">
          <div style={{ minWidth: 0 }}>
            <span className="lbl-sm">Bills this month</span>
            <div className="hero-amt num">{formatMoney(stats.total, cur())}</div>
            <p className="hero-sub">
              {reminders.length === 0
                ? 'Add your recurring monthly bills — rent, utilities, subscriptions — to track what\'s due and what\'s paid.'
                : stats.pendingCount === 0
                  ? `All ${stats.totalCount} bill${stats.totalCount === 1 ? '' : 's'} paid for ${monthLabel(today)}. Nice.`
                  : `${formatMoney(stats.pending, cur())} still pending across ${stats.pendingCount} bill${stats.pendingCount === 1 ? '' : 's'}.`}
            </p>
          </div>
          <button className="hero-orb" aria-label="New reminder" onClick={() => openSheet({ kind: 'add-reminder' })}><Icon name="plus" size={22} stroke={2.4} /></button>
        </div>
      </div>

      <div className="bento cols-2">
        <StatTile icon="check" label="Paid this month" amount={stats.paid} detail={`${stats.paidCount} of ${stats.totalCount} bills`} currency={cur()} />
        <StatTile icon="wallet" label="Available" amount={avail} detail={stats.pending > avail ? 'Not enough to cover pending' : 'Across income, expenses & starting balance'} currency={cur()} />
      </div>

      <div className="section-h"><h2>Your reminders</h2></div>

      {reminders.length === 0 ? (
        <EmptyState
          icon="bell"
          title="No reminders yet"
          text="Add your recurring monthly bills — rent, electricity, phone, subscriptions — so you always know what's due and what's paid."
          actionLabel="Add a reminder"
          onAction={() => openSheet({ kind: 'add-reminder' })}
        />
      ) : (
        <div className="stack-sm">
          {sorted.map((r) => (
            <ReminderCard
              key={r.id}
              reminder={r}
              currency={cur()}
              monthKeyStr={key}
              today={today}
              onClick={() => openSheet({ kind: 'reminder-detail', reminderId: r.id })}
            />
          ))}
        </div>
      )}
    </>
  );
}
