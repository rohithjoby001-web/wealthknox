import { Icon } from '../icons/index.jsx';
import { catById } from '../data/categories.js';
import { formatMoney } from '../utils/format.js';
import { dayLabel } from '../utils/date.js';

export default function TxRow({ tx, sources, currency, onClick }) {
  const isInc = tx.kind === 'income';
  const src = isInc ? sources.find((s) => s.id === tx.sourceId) : null;
  const ic = isInc ? (src?.icon || 'wallet') : catById(tx.categoryId).icon;
  const title = tx.title || (isInc ? (src?.name || 'Income') : catById(tx.categoryId).name);
  const sub = tx.note || dayLabel(tx.date);
  return (
    <button className="txrow" onClick={onClick}>
      <i className={`th${isInc ? ' dark' : ''}`}><Icon name={ic} size={18} stroke={1.9} /></i>
      <span className="mid">
        <strong>{title}</strong>
        <span>{sub}</span>
      </span>
      <b className={`amt num ${isInc ? 'in' : 'out'}`}>{isInc ? '+' : '-'}{formatMoney(tx.amount, currency)}</b>
    </button>
  );
}
