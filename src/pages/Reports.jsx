import { useState } from 'react';
import { useApp } from '../state/AppContext.jsx';
import Header from '../components/Header.jsx';
import StatTile from '../components/StatTile.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LineChart from '../components/charts/LineChart.jsx';
import { Icon } from '../icons/index.jsx';
import { monthKey, monthLabel, addMonths, isCurrentMonth } from '../utils/date.js';
import { formatMoney, clampPct } from '../utils/format.js';
import {
  monthIncome, monthExpense, monthNet, savingsRate, categoryTotals, sourceTotals,
  yearIncome, yearExpense, yearNet, yearSavingsRate, categoryTotalsYear, sourceTotalsYear, yearMonthlySeries,
} from '../utils/calc.js';

// Shared renderer for "by category" and "by source" breakdowns — same
// ranked-bar look Expenses/Income already use, generalized so Reports
// can show it for either a month or a whole year without duplicating
// the markup four times.
function RankRows({ rows, total, currency }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="ranklist">
      {rows.map((r) => (
        <div className="rankrow" key={r.id}>
          <div className="top">
            <span className="name"><Icon name={r.icon} size={14} stroke={2} />{r.name}</span>
            <span className="val num"><b>{formatMoney(r.total, currency)}</b><span className="pct">{total > 0 ? Math.round((r.total / total) * 100) : 0}%</span></span>
          </div>
          <div className="track"><i style={{ width: `${clampPct((r.total / max) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

const deltaText = (now, prev) => {
  if (prev <= 0) return now > 0 ? 'No data for last period' : null;
  const d = Math.round(((now - prev) / prev) * 100);
  if (d === 0) return 'Same as last period';
  return `${d > 0 ? 'Up' : 'Down'} ${Math.abs(d)}% vs last period`;
};

export default function Reports() {
  const { state, cur } = useApp();
  const { incomes, expenses, sources } = state;
  // Its own cursor, independent of Expenses/Income's shared monthDate —
  // browsing past periods here for analysis shouldn't jump those tabs
  // to a different month. A view filter only, so it's local and unsynced.
  const [period, setPeriod] = useState('month'); // 'month' | 'year'
  const [cursor, setCursor] = useState(new Date());

  const isMonth = period === 'month';
  const year = cursor.getFullYear();
  const atCurrentMonth = isCurrentMonth(cursor);
  const atCurrentYear = year >= new Date().getFullYear();

  const stepMonth = (n) => setCursor((d) => addMonths(d, n));
  const stepYear = (n) => setCursor((d) => new Date(d.getFullYear() + n, d.getMonth(), 1));

  const mKey = monthKey(cursor);
  const mInc = monthIncome(incomes, mKey);
  const mExp = monthExpense(expenses, mKey);
  const mNet = monthNet(incomes, expenses, mKey);
  const mRate = savingsRate(incomes, expenses, mKey);
  const prevMKey = monthKey(addMonths(cursor, -1));
  const mIncDetail = deltaText(mInc, monthIncome(incomes, prevMKey));
  const mExpDetail = deltaText(mExp, monthExpense(expenses, prevMKey));
  const mCatRows = categoryTotals(expenses, mKey).map((c) => ({ id: c.categoryId, icon: c.cat.icon, name: c.cat.name, total: c.total }));
  const mSrcRows = sourceTotals(incomes, mKey, sources).filter((s) => s.total > 0).map((s) => ({ id: s.source.id, icon: s.source.icon, name: s.source.name, total: s.total }));

  const yInc = yearIncome(incomes, year);
  const yExp = yearExpense(expenses, year);
  const yNet = yearNet(incomes, expenses, year);
  const yRate = yearSavingsRate(incomes, expenses, year);
  const yIncDetail = deltaText(yInc, yearIncome(incomes, year - 1));
  const yExpDetail = deltaText(yExp, yearExpense(expenses, year - 1));
  const yCatRows = categoryTotalsYear(expenses, year).map((c) => ({ id: c.categoryId, icon: c.cat.icon, name: c.cat.name, total: c.total }));
  const ySrcRows = sourceTotalsYear(incomes, year, sources).filter((s) => s.total > 0).map((s) => ({ id: s.source.id, icon: s.source.icon, name: s.source.name, total: s.total }));
  const ySeries = yearMonthlySeries(incomes, expenses, year);

  const inc = isMonth ? mInc : yInc;
  const exp = isMonth ? mExp : yExp;
  const net = isMonth ? mNet : yNet;
  const rate = isMonth ? mRate : yRate;
  const incDetail = isMonth ? mIncDetail : yIncDetail;
  const expDetail = isMonth ? mExpDetail : yExpDetail;
  const catRows = isMonth ? mCatRows : yCatRows;
  const srcRows = isMonth ? mSrcRows : ySrcRows;
  const hasData = inc > 0 || exp > 0;

  return (
    <>
      <Header title="Reports" subtitle="See where your money's been going" />

      <div className="seg" role="tablist" style={{ marginBottom: 14 }}>
        <button className={isMonth ? 'on' : ''} onClick={() => setPeriod('month')}>Monthly</button>
        <button className={!isMonth ? 'on' : ''} onClick={() => setPeriod('year')}>Yearly</button>
      </div>

      <div className="monthnav">
        <span className="lbl">{isMonth ? monthLabel(cursor) : year}</span>
        <div className="arrows">
          <button aria-label="Previous period" onClick={() => (isMonth ? stepMonth(-1) : stepYear(-1))}>
            <Icon name="chevLeft" size={17} stroke={2.3} />
          </button>
          <button
            aria-label="Next period"
            disabled={isMonth ? atCurrentMonth : atCurrentYear}
            onClick={() => (isMonth ? stepMonth(1) : stepYear(1))}
          >
            <Icon name="chevRight" size={17} stroke={2.3} />
          </button>
        </div>
      </div>

      {!hasData ? (
        <EmptyState
          icon="trendingUp"
          title={isMonth ? 'Nothing logged this month' : 'Nothing logged this year'}
          text="Add some income or expenses to see a breakdown here."
        />
      ) : (
        <>
          <div className="bento cols-3">
            <StatTile icon="arrowUp" label="Income" amount={inc} detail={incDetail} currency={cur()} />
            <StatTile icon="arrowDown" label="Expenses" amount={exp} detail={expDetail} currency={cur()} />
            <StatTile icon="trendingUp" label="Net" amount={net} detail={inc > 0 ? `${rate}% saved` : null} currency={cur()} />
          </div>

          {!isMonth ? (
            <>
              <div className="section-h"><h2>Month by month</h2></div>
              <div className="card"><LineChart data={ySeries} currentKey={monthKey(new Date())} currency={cur()} /></div>
            </>
          ) : null}

          {catRows.length > 0 ? (
            <>
              <div className="section-h"><h2>By category</h2></div>
              <div className="card"><RankRows rows={catRows} total={exp} currency={cur()} /></div>
            </>
          ) : null}

          {srcRows.length > 0 ? (
            <>
              <div className="section-h"><h2>By source</h2></div>
              <div className="card"><RankRows rows={srcRows} total={inc} currency={cur()} /></div>
            </>
          ) : null}
        </>
      )}
    </>
  );
}
