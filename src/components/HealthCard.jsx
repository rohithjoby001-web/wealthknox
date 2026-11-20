import { Icon } from '../icons/index.jsx';
import { SPEND_HEALTHY_LIMIT } from '../utils/calc.js';

export default function HealthCard({ tier, ratio, rate }) {
  return (
    <div className={`bento-tile healthcard tier-${tier.tier}`}>
      <div className="healthcard-top">
        <div className="healthcard-id">
          <i><Icon name={tier.icon} size={13} stroke={2.2} /></i>
          <strong>{tier.label}</strong>
        </div>
        <span className="healthcard-pct num">
          {ratio == null ? '--' : `${Math.round(ratio)}%`}
          {ratio != null ? <small>spent</small> : null}
        </span>
      </div>
      <div className="gauge">
        <span className="gauge-label" style={{ left: `${SPEND_HEALTHY_LIMIT}%` }}>Safe limit · {SPEND_HEALTHY_LIMIT}%</span>
        <div className="gauge-track">
          <div className="gauge-fill-clip">
            <i className={`gauge-fill${(ratio ?? 0) > 100 ? ' over' : ''}`} style={{ width: `${Math.max(0, Math.min(100, ratio ?? 0))}%` }} />
          </div>
          <i className="gauge-tick" style={{ left: `${SPEND_HEALTHY_LIMIT}%` }} />
        </div>
      </div>
      <p>{ratio == null ? 'No income yet' : ratio <= 100 ? `${rate}% kept back this month` : 'Over budget'}</p>
    </div>
  );
}
