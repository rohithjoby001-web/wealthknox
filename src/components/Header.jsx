import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { monthKey } from '../utils/date.js';
import { getAlerts } from '../utils/calc.js';

const initial = (email) => (email || '?').trim().charAt(0).toUpperCase() || '?';

export default function Header({ title, subtitle }) {
  const { state, openSheet } = useApp();
  const { enabled: authEnabled, user } = useAuth();
  const alerts = getAlerts(state.incomes, state.expenses, state.goals, monthKey(new Date()), state.settings.startingBalance);

  return (
    <div className="head-row">
      <div className="head-id">
        {authEnabled && user ? (
          <button className="avatar avatar-account" onClick={() => openSheet({ kind: 'account' })} aria-label="Account">
            {user.photoURL ? <img src={user.photoURL} alt="" /> : <span className="avatar-initial">{initial(user.email)}</span>}
          </button>
        ) : (
          <div className="avatar">
            <img src="/icons/avatar-mark.png" alt="WealthKnox" />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="page-sub">{subtitle}</p> : null}
        </div>
      </div>
      <div className="header-icons">
        <button className="icon-btn" aria-label={alerts.length ? `${alerts.length} alert${alerts.length === 1 ? '' : 's'}` : 'Alerts'} onClick={() => openSheet({ kind: 'alerts', alerts })}>
          <Icon name="bell" size={18} stroke={2} />
          {alerts.length ? <i className="dot" /> : null}
        </button>
        <button className="icon-btn" aria-label="Settings" onClick={() => openSheet({ kind: 'settings' })}>
          <Icon name="gear" size={18} stroke={2} />
        </button>
      </div>
    </div>
  );
}
