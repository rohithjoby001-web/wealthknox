import { useState } from 'react';
import TxRow from './TxRow.jsx';
import ExpandToggle from './ExpandToggle.jsx';
import { dayLabel } from '../utils/date.js';

// Renders day-grouped transactions (the shape groupByDay produces), but
// only shows `limit` rows by default — cutting a day group short rather
// than dropping it, so the day header for a partially-shown day still
// appears. "Show N more" reveals the rest in place.
export default function GroupedTxList({ groups, sources, currency, onOpenTx, limit = 4 }) {
  const [expanded, setExpanded] = useState(false);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  let shown = groups;
  if (!expanded && total > limit) {
    let budget = limit;
    shown = [];
    for (const g of groups) {
      if (budget <= 0) break;
      const items = g.items.slice(0, budget);
      if (items.length) shown.push({ ...g, items });
      budget -= items.length;
    }
  }

  return (
    <>
      {shown.map((g) => (
        <div key={g.date}>
          <div className="daydiv"><span>{dayLabel(g.date)}</span><i /></div>
          <div className="rowlist">
            {g.items.map((tx) => (
              <TxRow key={tx.id} tx={tx} sources={sources} currency={currency} onClick={() => onOpenTx(tx.id)} />
            ))}
          </div>
        </div>
      ))}
      {total > limit ? (
        <ExpandToggle expanded={expanded} remaining={total - limit} onClick={() => setExpanded((e) => !e)} />
      ) : null}
    </>
  );
}
