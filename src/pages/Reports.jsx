import { useState } from 'react';
import { useApp } from '../state/AppContext.jsx';
import Header from '../components/Header.jsx';
import StatTile from '../components/StatTile.jsx';
import EmptyState from '../components/EmptyState.jsx';
import TxRow from '../components/TxRow.jsx';
import LineChart from '../components/charts/LineChart.jsx';
import SpendCalendar from '../components/reports/SpendCalendar.jsx';
import DayDetail from '../components/reports/DayDetail.jsx';
import { DailySpendChart, WeekdayBars, CategoryDonut, YearMonthBars, YearHeatmap, InsightGrid } from '../components/reports/ReportCharts.jsx';
import { Icon } from '../icons/index.jsx';
import { monthKey, monthLabel, addMonths, addDays, isCurrentMonth, toISO, parseISO, niceDate, MONTHS_SHORT, MONTHS } from '../utils/date.js';
import { formatMoney, clampPct } from '../utils/format.js';
import {
  monthIncome, monthExpense, monthNet, savingsRate, sourceTotals,
  yearIncome, yearExpense, yearNet, yearSavingsRate, categoryTotalsYear, sourceTotalsYear, yearMonthlySeries,
  expenseTitle,
} from '../utils/calc.js';
import {
  dayTotalsForMonth, daySpendForYear, monthInsights, weekdayPattern, categoryCompare, topExpenses, yearInsights,
} from '../utils/reportCalc.js';

// Ranked bars for "by category" / "by source". Optional `prev` on a row
// adds a small "vs last month" change next to the amount.
function RankRows({ rows, total, currency }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="ranklist">
      {rows.map((r) => {
        let delta = null;
        if (r.prev != null) {
          if (r.prev <= 0) delta = { t: 'New', cls: 'new' };
          else {
            const d = Math.round(((r.total - r.prev) / r.prev) * 100);
            delta = d === 0 ? { t: '0%', cls: 'flat' } : { t: `${d > 0 ? '▲' : '▼'} ${Math.abs(d)}%`, cls: d > 0 ? 'up' : 'down' };
          }
        }
        return (
          <div className="rankrow" key={r.id}>
            <div className="top">
              <span className="name"><Icon name={r.icon} size={14} stroke={2} />{r.name}</span>
              <span className="val num">
                {delta ? <span className={`delta ${delta.cls}`} title="vs last month">{delta.t}</span> : null}
                <b>{formatMoney(r.total, currency)}</b>
                <span className="pct">{total > 0 ? Math.round((r.total / total) * 100) : 0}%</span>
              </span>
            </div>
            <div className="track"><i style={{ width: `${clampPct((r.total / max) * 100)}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

const deltaText = (now, prev) => {
  if (prev <= 0) return now > 0 ? 'No data for last period' : null;
  const d = Math.round(((now - prev) / prev) * 100);
  if (d === 0) return 'Same as last period';
  return `${d > 0 ? 'Up' : 'Down'} ${Math.abs(d)}% vs last period`;
};

const readWeekStart = () => {
  try { const v = localStorage.getItem('wk_week_start'); return v === '0' ? 0 : 1; } catch { return 1; }
};

export default function Reports() {
  const { state, cur, openSheet } = useApp();
  const { incomes, expenses, sources } = state;
  const currency = cur();
  // Its own cursor, independent of Expenses/Income's shared monthDate —
  // browsing past periods here for analysis shouldn't jump those tabs.
  const [period, setPeriod] = useState('month'); // 'month' | 'year'
  const [cursor, setCursor] = useState(new Date());
  const [selDay, setSelDay] = useState(null);
  const [weekStart, setWeekStartState] = useState(readWeekStart);
  const setWeekStart = (v) => { setWeekStartState(v); try { localStorage.setItem('wk_week_start', String(v)); } catch { /* ignore */ } };

  const isMonth = period === 'month';
  const year = cursor.getFullYear();
  const atCurrentMonth = isCurrentMonth(cursor);
  const atCurrentYear = year >= new Date().getFullYear();
  const todayIso = toISO(new Date());

  const stepMonth = (n) => setCursor((d) => addMonths(d, n));
  const stepYear = (n) => setCursor((d) => new Date(d.getFullYear() + n, d.getMonth(), 1));

  // ---------- month ----------
  const mKey = monthKey(cursor);
  const prevMKey = monthKey(addMonths(cursor, -1));
  const mInc = monthIncome(incomes, mKey);
  const mExp = monthExpense(expenses, mKey);
  const mNet = monthNet(incomes, expenses, mKey);
  const mRate = savingsRate(incomes, expenses, mKey);
  const mIncDetail = deltaText(mInc, monthIncome(incomes, prevMKey));
  const mExpDetail = deltaText(mExp, monthExpense(expenses, prevMKey));
  const mCatCmp = categoryCompare(expenses, mKey, prevMKey);
  const mCatRows = mCatCmp.map((c) => ({ id: c.id, icon: c.cat.icon, name: c.cat.name, total: c.total, prev: c.prev, cat: c.cat }));
  const mSrcRows = sourceTotals(incomes, mKey, sources).filter((s) => s.total > 0).map((s) => ({ id: s.source.id, icon: s.source.icon, name: s.source.name, total: s.total }));

  const dayMap = dayTotalsForMonth(incomes, expenses, mKey);
  const ins = monthInsights(incomes, expenses, cursor, dayMap);
  const wkData = weekdayPattern(cursor, dayMap, weekStart);
  const topExp = topExpenses(expenses, mKey, 5);

  // Selected day: whatever was tapped if it's in this month, else today
  // (current month) or the busiest day (past month).
  const selected = selDay && selDay.startsWith(mKey) ? selDay : (atCurrentMonth ? todayIso : ins.topDay?.iso || `${mKey}-01`);
  const firstIso = `${mKey}-01`;
  const lastIso = toISO(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
  const stepDay = (n) => {
    const next = toISO(addDays(parseISO(selected), n));
    if (next >= firstIso && next <= lastIso && next <= todayIso) setSelDay(next);
  };
  const openTx = (id) => openSheet({ kind: 'tx-detail', txId: id });

  const monthInsightItems = [
    { k: 'Avg / day', v: formatMoney(Math.round(ins.avgPerDay), currency), d: `Over ${ins.elapsed} day${ins.elapsed === 1 ? '' : 's'}` },
    ins.projected != null
      ? { k: 'Projected month-end', v: formatMoney(Math.round(ins.projected), currency), d: mInc > 0 ? `${Math.round((ins.projected / mInc) * 100)}% of income so far` : 'At this pace' }
      : { k: 'Avg on spend days', v: formatMoney(Math.round(ins.avgPerSpendDay), currency), d: `${ins.spendDays} spend day${ins.spendDays === 1 ? '' : 's'}` },
    ins.topDay
      ? { k: 'Biggest day', v: formatMoney(ins.topDay.spent, currency), d: niceDate(ins.topDay.iso), onClick: () => setSelDay(ins.topDay.iso) }
      : { k: 'Biggest day', v: '—', d: 'No spending yet' },
    { k: 'No-spend days', v: String(ins.noSpend), d: ins.streak > 1 ? `Longest streak: ${ins.streak} days` : `of ${ins.elapsed} so far` },
    { k: 'Transactions', v: String(ins.txCount), d: ins.txCount ? `Avg ${formatMoney(Math.round(ins.avgTx), currency)} each` : null },
    ins.biggest
      ? { k: 'Largest expense', v: formatMoney(ins.biggest.amount, currency), d: expenseTitle(ins.biggest), onClick: () => openTx(ins.biggest.id) }
      : { k: 'Largest expense', v: '—', d: null },
  ];

  // ---------- year ----------
  const yInc = yearIncome(incomes, year);
  const yExp = yearExpense(expenses, year);
  const yNet = yearNet(incomes, expenses, year);
  const yRate = yearSavingsRate(incomes, expenses, year);
  const yIncDetail = deltaText(yInc, yearIncome(incomes, year - 1));
  const yExpDetail = deltaText(yExp, yearExpense(expenses, year - 1));
  const yCatRows = categoryTotalsYear(expenses, year).map((c) => ({ id: c.categoryId, icon: c.cat.icon, name: c.cat.name, total: c.total, cat: c.cat }));
  const ySrcRows = sourceTotalsYear(incomes, year, sources).filter((s) => s.total > 0).map((s) => ({ id: s.source.id, icon: s.source.icon, name: s.source.name, total: s.total }));
  const ySeries = yearMonthlySeries(incomes, expenses, year);
  const yIns = yearInsights(ySeries);
  const yDaySpend = daySpendForYear(expenses, year);

  const openMonth = (date, iso = null) => {
    setPeriod('month');
    setCursor(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelDay(iso);
  };

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

      {isMonth ? (
        <>
          {/* The calendar always shows, even for an empty month, so you can
              see the shape of the month and confirm nothing was logged. */}
          <div className="section-h"><h2>Spending calendar</h2><span className="more">{MONTHS[cursor.getMonth()]}</span></div>
          <div className="card">
            <SpendCalendar
              cursor={cursor}
              dayMap={dayMap}
              weekStart={weekStart}
              onWeekStart={setWeekStart}
              selected={selected}
              onSelect={setSelDay}
              currency={currency}
            />
          </div>
          <div className="card">
            <DayDetail
              iso={selected}
              day={dayMap[selected]}
              avgPerDay={ins.avgPerDay}
              sources={sources}
              currency={currency}
              onOpenTx={openTx}
              onStep={stepDay}
              canPrev={selected > firstIso}
              canNext={selected < lastIso && selected < todayIso}
            />
          </div>
        </>
      ) : null}

      {!hasData ? (
        <EmptyState
          icon="trendingUp"
          title={isMonth ? 'Nothing logged this month' : 'Nothing logged this year'}
          text="Add some income or expenses to see a breakdown here."
        />
      ) : (
        <>
          <div className="bento cols-3">
            <StatTile icon="arrowUp" label="Income" amount={inc} detail={incDetail} currency={currency} />
            <StatTile icon="arrowDown" label="Expenses" amount={exp} detail={expDetail} currency={currency} />
            <StatTile icon="trendingUp" label="Net" amount={net} detail={inc > 0 ? `${rate}% saved` : null} currency={currency} />
          </div>

          {isMonth ? (
            <>
              {mExp > 0 ? (
                <>
                  <div className="section-h"><h2>Daily spending</h2></div>
                  <div className="card">
                    <DailySpendChart cursor={cursor} dayMap={dayMap} avgPerDay={ins.avgPerDay} selected={selected} onSelect={setSelDay} currency={currency} />
                  </div>
                </>
              ) : null}

              <div className="section-h"><h2>Insights</h2></div>
              <InsightGrid items={monthInsightItems} />

              {mExp > 0 ? (
                <>
                  <div className="section-h"><h2>By weekday</h2><span className="more">Avg spend</span></div>
                  <div className="card"><WeekdayBars data={wkData} currency={currency} /></div>
                </>
              ) : null}
            </>
          ) : (
            <>
              <div className="section-h"><h2>Month by month</h2></div>
              <div className="card"><LineChart data={ySeries} currentKey={monthKey(new Date())} currency={currency} /></div>

              <div className="section-h"><h2>Income vs spend</h2></div>
              <div className="card"><YearMonthBars series={ySeries} currentKey={monthKey(new Date())} onPick={(d) => openMonth(d)} currency={currency} /></div>

              {yIns ? (
                <>
                  <div className="section-h"><h2>Insights</h2></div>
                  <InsightGrid items={[
                    { k: 'Avg monthly spend', v: formatMoney(Math.round(yIns.avgSpend), currency), d: `Across ${yIns.months} active month${yIns.months === 1 ? '' : 's'}` },
                    { k: 'Avg daily spend', v: formatMoney(Math.round(yExp / daysElapsedInYear(year, Object.keys(yDaySpend).sort()[0])), currency), d: 'Since your first entry' },
                    { k: 'Highest spend month', v: MONTHS_SHORT[yIns.top.date.getMonth()], d: formatMoney(yIns.top.expense, currency), onClick: () => openMonth(yIns.top.date) },
                    { k: 'Best saving month', v: MONTHS_SHORT[yIns.best.date.getMonth()], d: `${yIns.best.income - yIns.best.expense < 0 ? '−' : '+'}${formatMoney(Math.abs(yIns.best.income - yIns.best.expense), currency)} net`, onClick: () => openMonth(yIns.best.date) },
                  ]} />
                </>
              ) : null}

              <div className="section-h"><h2>Daily spend heatmap</h2></div>
              <div className="card">
                <YearHeatmap year={year} daySpend={yDaySpend} weekStart={weekStart} currency={currency} onPick={(iso) => openMonth(parseISO(iso), iso)} />
              </div>
            </>
          )}

          {catRows.length > 0 ? (
            <>
              <div className="section-h"><h2>By category</h2>{isMonth ? <span className="more">vs last month</span> : null}</div>
              <div className="card">
                <CategoryDonut rows={catRows} total={exp} currency={currency} />
                <div className="divider" style={{ margin: '16px 0' }} />
                <RankRows rows={catRows} total={exp} currency={currency} />
              </div>
            </>
          ) : null}

          {isMonth && topExp.length > 0 ? (
            <>
              <div className="section-h"><h2>Top expenses</h2></div>
              <div className="rowlist">
                {topExp.map((x) => (
                  <TxRow key={x.id} tx={{ ...x, kind: 'expense' }} sources={sources} currency={currency} onClick={() => openTx(x.id)} />
                ))}
              </div>
            </>
          ) : null}

          {srcRows.length > 0 ? (
            <>
              <div className="section-h"><h2>By source</h2></div>
              <div className="card"><RankRows rows={srcRows} total={inc} currency={currency} /></div>
            </>
          ) : null}
        </>
      )}
    </>
  );
}

// Counted from the first logged expense of the year (if given), so months
// before you started using the app don't drag the average down.
function daysElapsedInYear(year, firstIso) {
  const now = new Date();
  const start = firstIso ? parseISO(firstIso) : new Date(year, 0, 1);
  const end = year < now.getFullYear() ? new Date(year, 11, 31) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(1, Math.floor((end - start) / 86400000) + 1);
}
