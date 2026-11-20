import { useApp } from '../state/AppContext.jsx';
import Header from '../components/Header.jsx';
import MonthNav from '../components/MonthNav.jsx';
import GroupedTxList from '../components/GroupedTxList.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Icon } from '../icons/index.jsx';
import { CATEGORIES, catById } from '../data/categories.js';
import { monthKey, addMonths } from '../utils/date.js';
import { formatMoney, clampPct } from '../utils/format.js';
import { monthExpense, categoryTotals, inMonth, groupByDay } from '../utils/calc.js';

export default function Expenses() {
  const { state, openSheet, setFilterCat, cur } = useApp();
  const { expenses, monthDate, filterCat } = state;
  const key = monthKey(monthDate);
  const total = monthExpense(expenses, key);
  const prevTotal = monthExpense(expenses, monthKey(addMonths(monthDate, -1)));
  const delta = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;
  const cats = categoryTotals(expenses, key);
  const monthRows = inMonth(expenses, key).map((x) => ({ ...x, kind: 'expense' }));
  const filtered = filterCat === 'all' ? monthRows : monthRows.filter((x) => x.categoryId === filterCat);
  const groups = groupByDay(filtered);
  const maxCat = cats[0]?.total || 1;

  const chipCats = CATEGORIES.filter((c) => cats.some((x) => x.categoryId === c.id));

  return (
    <>
      <Header title="Expenses" subtitle="Where your money is going" />
      <MonthNav />

      <div className="hero">
        <div className="hero-top">
          <div style={{ minWidth: 0 }}>
            <span className="lbl-sm">Total spent</span>
            <div className="hero-amt num">{formatMoney(total, cur())}</div>
            {delta !== null ? (
              <p className="hero-sub">{delta === 0 ? 'Same as last month' : `${delta > 0 ? 'Up' : 'Down'} ${Math.abs(delta)}% vs last month`}</p>
            ) : (
              <p className="hero-sub">{total > 0 ? 'No data for last month' : 'Nothing logged yet'}</p>
            )}
          </div>
          <button className="hero-orb" aria-label="Add expense" onClick={() => openSheet({ kind: 'add-expense' })}><Icon name="plus" size={22} stroke={2.4} /></button>
        </div>
      </div>

      {cats.length > 0 ? (
        <>
          <div className="section-h"><h2>By category</h2></div>
          <div className="card">
            <div className="ranklist">
              {cats.map((c) => (
                <div className="rankrow" key={c.categoryId}>
                  <div className="top">
                    <span className="name"><Icon name={c.cat.icon} size={14} stroke={2} />{c.cat.name}</span>
                    <span className="val num"><b>{formatMoney(c.total, cur())}</b><span className="pct">{total > 0 ? Math.round((c.total / total) * 100) : 0}%</span></span>
                  </div>
                  <div className="track"><i style={{ width: `${clampPct((c.total / maxCat) * 100)}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      <div className="section-h"><h2>Transactions</h2></div>
      <div className="chiprow">
        <button className={`chip${filterCat === 'all' ? ' on' : ''}`} onClick={() => setFilterCat('all')}>All</button>
        {chipCats.map((c) => (
          <button key={c.id} className={`chip${filterCat === c.id ? ' on' : ''}`} onClick={() => setFilterCat(c.id)}>
            <Icon name={c.icon} size={13} stroke={2.1} />{c.name}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon="expense"
          title="No expenses here"
          text={filterCat === 'all' ? 'Nothing logged for this month yet.' : `No ${catById(filterCat).name.toLowerCase()} expenses this month.`}
        />
      ) : (
        <GroupedTxList
          groups={groups}
          sources={state.sources}
          currency={cur()}
          onOpenTx={(txId) => openSheet({ kind: 'tx-detail', txId })}
        />
      )}
    </>
  );
}
