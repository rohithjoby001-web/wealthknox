import { useState } from 'react';
import { useApp } from '../state/AppContext.jsx';
import Header from '../components/Header.jsx';
import StatTile from '../components/StatTile.jsx';
import HealthCard from '../components/HealthCard.jsx';
import TxRow from '../components/TxRow.jsx';
import ExpandToggle from '../components/ExpandToggle.jsx';
import EmptyState from '../components/EmptyState.jsx';
import GoalCard from '../components/GoalCard.jsx';
import { WeekBarChart } from '../components/charts/BarChart.jsx';
import LineChart from '../components/charts/LineChart.jsx';
import { Icon } from '../icons/index.jsx';
import { monthKey, monthLabel, parseISO, MONTHS_SHORT } from '../utils/date.js';
import { formatMoney, clampPct } from '../utils/format.js';
import {
  monthIncome, monthExpense, monthNet, savingsRate, spendRatio, spendTier,
  monthlySeries, dailySeries, rangeSeries, recentTransactions, availableBalance, totalAllocatedAll,
} from '../utils/calc.js';

const RANGES = [[3, '3M'], [6, '6M'], [12, '1Y']];

const RECENT_LIMIT = 4;

const shortDate = (iso) => { const d = parseISO(iso); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };

export default function Overview() {
  const { state, setTab, setChartRange, openSheet, cur } = useApp();
  const { incomes, expenses, goals, sources, chartRange } = state;
  const [recentExpanded, setRecentExpanded] = useState(false);
  const [customRange, setCustomRange] = useState(null); // { from: iso, to: iso } | null — a one-off view, not synced or persisted
  const today = new Date();
  const key = monthKey(today);

  const inc = monthIncome(incomes, key);
  const exp = monthExpense(expenses, key);
  const net = monthNet(incomes, expenses, key);
  const rate = savingsRate(incomes, expenses, key);
  const ratio = spendRatio(incomes, expenses, key);
  const tier = spendTier(ratio);
  const series = customRange
    ? (() => {
        const raw = rangeSeries(incomes, expenses, parseISO(customRange.from), parseISO(customRange.to));
        // Daily points (have .iso) are already short ("5 Nov"); monthly
        // points ("Nov 2026") drop the year once there are enough of them
        // that repeating it under every point would just be clutter —
        // same rule the preset 3M/6M/1Y ranges already use below.
        const isDaily = raw.length > 0 && 'iso' in raw[0];
        return !isDaily && raw.length > 6 ? raw.map((m) => ({ ...m, label: m.label.split(' ')[0] })) : raw;
      })()
    : monthlySeries(incomes, expenses, chartRange).map((m) => ({
        ...m,
        label: chartRange > 6 ? m.label.split(' ')[0] : m.label,
      }));

  const pickCustomRange = () => openSheet({
    kind: 'date-range',
    initialFrom: customRange?.from,
    initialTo: customRange?.to,
    onApply: (from, to) => setCustomRange({ from, to }),
  });
  const week = dailySeries(incomes, expenses, 7);
  const recentPool = recentTransactions(incomes, expenses, sources, 20);
  const recent = recentExpanded ? recentPool : recentPool.slice(0, RECENT_LIMIT);
  const avail = availableBalance(incomes, expenses, goals, state.settings.startingBalance);
  const allocated = totalAllocatedAll(goals);
  const activeGoals = goals.filter((g) => g.allocated < g.target).slice(0, 2);
  const goalsToShow = activeGoals.length ? activeGoals : goals.slice(0, 2);

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
          <div className="hero-orb"><Icon name="coin" size={22} stroke={2.2} /></div>
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
          <button className="hero-chip" onClick={() => setTab('goals')}>
            <div className="k"><Icon name="target" size={13} stroke={2.3} />Saved</div>
            <div className="v num">{inc > 0 ? `${rate}%` : '--'}</div>
          </button>
        </div>
      </div>

      <div className="bento">
        <StatTile
          icon="wallet"
          label="Available"
          amount={avail}
          detail={avail < 0 ? "Spending has dipped into money already saved toward targets" : null}
          currency={cur()}
          onClick={() => setTab('goals')}
        />
      </div>

      {inc > 0 ? <HealthCard tier={tier} ratio={ratio} rate={rate} /> : null}

      <div className="section-h"><h2>Income vs expenses</h2></div>
      <div className="card">
        <div className="seg" role="tablist">
          {RANGES.map(([n, l]) => (
            <button key={n} className={!customRange && chartRange === n ? 'on' : ''} onClick={() => { setCustomRange(null); setChartRange(n); }}>{l}</button>
          ))}
          <button className={customRange ? 'on' : ''} onClick={pickCustomRange}>
            {customRange ? `${shortDate(customRange.from)}–${shortDate(customRange.to)}` : 'Custom'}
          </button>
        </div>
        <LineChart data={series} currentKey={key} />
      </div>

      <div className="section-h"><h2>Last 7 days</h2></div>
      <div className="card"><WeekBarChart data={week} /></div>

      {goals.length > 0 ? (
        <>
          <div className="section-h"><h2>Targets</h2><button className="more" onClick={() => setTab('goals')}>View all</button></div>
          <div className="bento">
            <StatTile icon="target" label="In goals" amount={allocated} detail={`${goals.length} target${goals.length === 1 ? '' : 's'}`} currency={cur()} onClick={() => setTab('goals')} />
          </div>
          <div className="stack-sm">
            {goalsToShow.map((g) => (
              <GoalCard key={g.id} goal={g} currency={cur()} onClick={() => openSheet({ kind: 'goal-detail', goalId: g.id })} />
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
