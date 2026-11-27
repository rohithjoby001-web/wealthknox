import { useState } from 'react';
import { useApp } from '../state/AppContext.jsx';
import Header from '../components/Header.jsx';
import StatTile from '../components/StatTile.jsx';
import HealthCard from '../components/HealthCard.jsx';
import TxRow from '../components/TxRow.jsx';
import ExpandToggle from '../components/ExpandToggle.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ReminderCard from '../components/ReminderCard.jsx';
import { Icon } from '../icons/index.jsx';
import { monthKey, monthLabel, niceDate } from '../utils/date.js';
import { formatMoney, clampPct } from '../utils/format.js';
import {
  monthIncome, monthExpense, monthNet, savingsRate, spendRatio, spendTier,
  recentTransactions, availableFor, reminderMonthStats, reminderDueDate,
  reminderDueIn,
} from '../utils/calc.js';

const RECENT_LIMIT = 4;

// The other icons are fixed hand-drawn shapes, but a currency symbol isn't —
// $/₹/€/£ all look different, so this one draws the actual chosen symbol
// as text inside the same circle the old dollar-only "coin" icon used.
function CurrencyBadge({ symbol, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="700" fill="currentColor" stroke="none">{symbol}</text>
    </svg>
  );
}

export default function Overview() {
  const { state, setTab, openSheet, cur, payReminder } = useApp();
  const { incomes, expenses, reminders, sources } = state;
  const [recentExpanded, setRecentExpanded] = useState(false);
  const today = new Date();
  const key = monthKey(today);

  const inc = monthIncome(incomes, key);
  const exp = monthExpense(expenses, key);
  const net = monthNet(incomes, expenses, key);
  const rate = savingsRate(incomes, expenses, key);
  const ratio = spendRatio(incomes, expenses, key);
  const tier = spendTier(ratio);
  const recentPool = recentTransactions(incomes, expenses, sources, 20);
  const recent = recentExpanded ? recentPool : recentPool.slice(0, RECENT_LIMIT);
  const avail = availableFor(incomes, expenses, state.settings);
  const s = state.settings;
  const availDetail = avail < 0
    ? "Below zero — tap to check or adjust"
    : s.startingDate
      ? `From ${formatMoney(s.startingBalance || 0, cur())} on ${niceDate(s.startingDate)} · tap to adjust`
      : s.startingBalance > 0 ? 'Tap to check or adjust' : 'Tap to set your starting balance';
  const rstats = reminderMonthStats(reminders, key);
  // Show up to 2 reminders on Overview — unpaid first (most actionable),
  // then by due date. Falls back to any 2 if everything's already paid.
  const unpaid = reminders.filter((r) => !((r.paidMonths || []).includes(key)));
  const remindersToShow = (unpaid.length ? unpaid : reminders)
    .slice()
    .sort((a, b) => {
      const aISO = reminderDueDate(a, today);
      const bISO = reminderDueDate(b, today);
      if (aISO && bISO) return aISO.localeCompare(bISO);
      if (aISO) return -1;
      if (bISO) return 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 2);

  // Bills that need action NOW: due today or overdue, not yet paid.
  // These show in a dedicated "Pay today" section with one-tap Pay
  // buttons that mark the reminder paid AND create an expense entry.
  const payToday = reminders
    .filter((r) => {
      if ((r.paidMonths || []).includes(key)) return false; // already paid
      const dueIn = reminderDueIn(r, today);
      return dueIn != null && dueIn <= 0; // due today (0) or overdue (negative)
    })
    .sort((a, b) => {
      // Most overdue first (most negative dueIn first)
      const aIn = reminderDueIn(a, today);
      const bIn = reminderDueIn(b, today);
      return aIn - bIn;
    });

  return (
    <>
      <Header title="Overview" subtitle={monthLabel(today)} />

      <div className={`hero${net < 0 ? ' neg' : ''}`}>
        <div className="hero-top">
          <div style={{ minWidth: 0 }}>
            <span className="lbl-sm">This month's balance</span>
            <div className="hero-amt num">{net < 0 ? <small>&minus;</small> : null}{formatMoney(Math.abs(net), cur())}</div>
            {inc <= 0 ? (
              <p className="hero-sub">Add your income and expenses to see how this month is going.</p>
            ) : net < 0 ? (
              <p className="hero-sub">Spending has passed income this month.</p>
            ) : (
              <p className="hero-sub">Saving {rate}% of what came in this month.</p>
            )}
          </div>
          <div className="hero-orb"><CurrencyBadge symbol={cur()} size={22} /></div>
        </div>
        <span className="lbl-sm hero-period">This month</span>
        <div className="hero-row">
          <button className="hero-chip" onClick={() => setTab('income')}>
            <div className="k"><Icon name="arrowUp" size={13} stroke={2.3} />Income</div>
            <div className="v num">{formatMoney(inc, cur())}</div>
          </button>
          <button className="hero-chip" onClick={() => setTab('expenses')}>
            <div className="k"><Icon name="arrowDown" size={13} stroke={2.3} />Expenses</div>
            <div className="v num">{formatMoney(exp, cur())}</div>
          </button>
          <button className="hero-chip" onClick={() => setTab('reminders')}>
            <div className="k"><Icon name="bell" size={13} stroke={2.3} />Bills</div>
            <div className="v num">{reminders.length === 0 ? '--' : `${rstats.paidCount}/${rstats.totalCount}`}</div>
          </button>
        </div>
      </div>

      <div className="bento">
        <StatTile
          icon="wallet"
          label="Available"
          amount={avail}
          detail={availDetail}
          currency={cur()}
          onClick={() => openSheet(s.startingBalance > 0 || s.startingDate ? { kind: 'adjust-balance' } : { kind: 'starting-balance' })}
        />
      </div>

      {inc > 0 ? <HealthCard tier={tier} ratio={ratio} rate={rate} /> : null}

      {payToday.length > 0 ? (
        <>
          <div className="section-h"><h2>Pay today</h2></div>
          <div className="card">
            {payToday.map((r, idx) => {
              const dueIn = reminderDueIn(r, today);
              const sub = dueIn === 0 ? 'Due today' : `${-dueIn} day${-dueIn === 1 ? '' : 's'} overdue`;
              return (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: idx === 0 ? '4px 0' : '12px 0',
                  borderTop: idx === 0 ? 'none' : '1px solid var(--line)',
                }}>
                  <i className="th"><Icon name={r.icon} size={18} stroke={1.9} /></i>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 14.5, fontWeight: 600 }}>{r.name}</strong>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--mu)', marginTop: 1 }}>{sub}</span>
                  </div>
                  <b className="num" style={{ fontSize: 15, fontWeight: 700 }}>{formatMoney(r.amount, cur())}</b>
                  <button
                    className="btn primary sm"
                    onClick={() => payReminder(r.id)}
                    style={{ padding: '8px 14px', flex: '0 0 auto' }}
                  >
                    <Icon name="check" size={14} stroke={2.4} />Pay
                  </button>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {reminders.length > 0 ? (
        <>
          <div className="section-h"><h2>Reminders</h2><button className="more" onClick={() => setTab('reminders')}>View all</button></div>
          <div className="bento">
            <StatTile icon="bell" label="Bills this month" amount={rstats.total} detail={`${rstats.paidCount} of ${rstats.totalCount} paid`} currency={cur()} onClick={() => setTab('reminders')} />
          </div>
          <div className="stack-sm">
            {remindersToShow.map((r) => (
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
        </>
      ) : null}

      <div className="section-h"><h2>Recent activity</h2></div>
      {recent.length === 0 ? (
        <EmptyState icon="wallet" title="Nothing logged yet" text="Add your first expense or income entry to get started." />
      ) : (
        <>
          <div className="rowlist">
            {recent.map((tx) => (
              <TxRow key={tx.id} tx={tx} sources={sources} currency={cur()} onClick={() => openSheet({ kind: 'tx-detail', txId: tx.id })} />
            ))}
          </div>
          {recentPool.length > RECENT_LIMIT ? (
            <ExpandToggle
              expanded={recentExpanded}
              remaining={recentPool.length - RECENT_LIMIT}
              onClick={() => setRecentExpanded((e) => !e)}
            />
          ) : null}
        </>
      )}
    </>
  );
}
