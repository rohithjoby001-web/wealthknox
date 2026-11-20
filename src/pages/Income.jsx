import { useApp } from '../state/AppContext.jsx';
import Header from '../components/Header.jsx';
import MonthNav from '../components/MonthNav.jsx';
import SrcCard from '../components/SrcCard.jsx';
import GroupedTxList from '../components/GroupedTxList.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Icon } from '../icons/index.jsx';
import { monthKey, addMonths } from '../utils/date.js';
import { formatMoney, clampPct } from '../utils/format.js';
import { monthIncome, sourceTotals, inMonth, groupByDay } from '../utils/calc.js';

export default function Income() {
  const { state, openSheet, cur } = useApp();
  const { incomes, sources, monthDate } = state;
  const key = monthKey(monthDate);
  const total = monthIncome(incomes, key);
  const prevTotal = monthIncome(incomes, monthKey(addMonths(monthDate, -1)));
  const delta = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;
  const bySource = sourceTotals(incomes, key, sources);
  const monthRows = inMonth(incomes, key).map((x) => ({ ...x, kind: 'income' }));
  const groups = groupByDay(monthRows);
  const maxSrc = Math.max(1, ...bySource.map((b) => b.total));

  return (
    <>
      <Header title="Income" subtitle="Everything coming in" />
      <MonthNav />

      <div className="hero">
        <div className="hero-top">
          <div style={{ minWidth: 0 }}>
            <span className="lbl-sm">Total income</span>
            <div className="hero-amt num">{formatMoney(total, cur())}</div>
            {delta !== null ? (
              <p className="hero-sub">{delta === 0 ? 'Same as last month' : `${delta > 0 ? 'Up' : 'Down'} ${Math.abs(delta)}% vs last month`}</p>
            ) : (
              <p className="hero-sub">{total > 0 ? 'No data for last month' : 'Nothing logged yet'}</p>
            )}
          </div>
          <button className="hero-orb" aria-label="Add income" onClick={() => openSheet({ kind: 'add-income' })}><Icon name="plus" size={22} stroke={2.4} /></button>
        </div>
      </div>

      <div className="section-h">
        <h2>Sources</h2>
        <button className="more" onClick={() => openSheet({ kind: 'add-source' })}><Icon name="plus" size={13} stroke={2.5} /> New</button>
      </div>
      {sources.length === 0 ? (
        <EmptyState
          icon="briefcase"
          title="No sources yet"
          text="Add an income source — like your main job, freelance, or a side hustle."
          actionLabel="Add a source"
          onAction={() => openSheet({ kind: 'add-source' })}
        />
      ) : (
        <div className="stack-sm">
          {bySource.map((b) => (
            <SrcCard
              key={b.source.id}
              source={b.source}
              amount={b.total}
              currency={cur()}
              pctLabel={total > 0 ? `${Math.round(clampPct((b.total / total) * 100))}% of this month` : 'No income logged yet'}
              fillPct={clampPct((b.total / maxSrc) * 100)}
              onClick={() => openSheet({ kind: 'add-source', editing: b.source })}
            />
          ))}
        </div>
      )}

      <div className="section-h"><h2>Transactions</h2></div>
      {groups.length === 0 ? (
        <EmptyState icon="income" title="No income yet" text="Log your first payday, freelance payment or side-hustle drop for this month." />
      ) : (
        <GroupedTxList
          groups={groups}
          sources={sources}
          currency={cur()}
          onOpenTx={(txId) => openSheet({ kind: 'tx-detail', txId })}
        />
      )}
    </>
  );
}
