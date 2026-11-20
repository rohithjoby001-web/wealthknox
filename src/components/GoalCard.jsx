import { Icon } from '../icons/index.jsx';
import ProgressBar from './charts/ProgressBar.jsx';
import { clampPct } from '../utils/format.js';
import { formatMoney } from '../utils/format.js';

export default function GoalCard({ goal, currency, onClick, withDoneClass, savedSuffix }) {
  const pct = clampPct((goal.allocated / goal.target) * 100);
  const done = goal.allocated >= goal.target;
  return (
    <button className={`goalcard${withDoneClass && done ? ' done' : ''}`} onClick={onClick}>
      <div className="gh">
        <i className="icn"><Icon name={goal.icon} size={20} stroke={1.9} /></i>
        <div className="t">
          <strong>{goal.name}</strong>
          <span>{done ? 'Target reached' : `${formatMoney(Math.max(0, goal.target - goal.allocated), currency)} to go`}</span>
        </div>
        {done ? <span className="badge-done"><Icon name="check" size={11} stroke={3} />Done</span> : null}
      </div>
      <div className="gstats">
        <span className="mu">{formatMoney(goal.allocated, currency)} saved{savedSuffix || ''}</span>
        <b className="num">{formatMoney(goal.target, currency)}</b>
      </div>
      <ProgressBar pct={pct} done={done} />
    </button>
  );
}
