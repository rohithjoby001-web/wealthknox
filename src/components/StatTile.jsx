import { Icon } from '../icons/index.jsx';
import { formatMoney } from '../utils/format.js';

export default function StatTile({ icon, label, amount, detail, onClick, raw, currency }) {
  // formatMoney always prints a positive-looking number (it takes the
  // absolute value), so a tile showing a value that can legitimately go
  // negative — like "Available" once spending outpaces what isn't
  // already earmarked for a target — needs its own minus sign here.
  const neg = !raw && (amount || 0) < 0;
  return (
    <button className={`bento-tile${neg ? ' neg' : ''}`} onClick={onClick}>
      <div className="bt-top"><i className="bt-icon"><Icon name={icon} size={15} stroke={2.1} /></i></div>
      <span className="bt-k">{label}</span>
      <div className="bt-v num">{raw ? Math.round(amount || 0) : `${neg ? '−' : ''}${formatMoney(Math.abs(amount || 0), currency)}`}</div>
      {detail ? <div className="bt-d">{detail}</div> : null}
    </button>
  );
}
