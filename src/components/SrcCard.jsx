import { Icon } from '../icons/index.jsx';
import ProgressBar from './charts/ProgressBar.jsx';
import { formatMoney } from '../utils/format.js';

export default function SrcCard({ source, amount, pctLabel, fillPct, currency, onClick }) {
  return (
    <button className="srccard" onClick={onClick}>
      <i className="icn"><Icon name={source.icon} size={19} stroke={1.9} /></i>
      <span className="t">
        <strong>{source.name}</strong>
        <span>{pctLabel}</span>
        <div style={{ marginTop: 8 }}><ProgressBar pct={fillPct} /></div>
      </span>
      <span className="v"><b className="num">{formatMoney(amount, currency)}</b></span>
    </button>
  );
}
