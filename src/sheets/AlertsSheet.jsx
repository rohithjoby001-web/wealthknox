import Sheet from './Sheet.jsx';
import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';

export default function AlertsSheet({ alerts }) {
  const { closeSheet } = useApp();
  const list = alerts || [];

  return (
    <Sheet title="Alerts" onClose={closeSheet}>
      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '18px 0 6px' }}>
          <i style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', margin: '0 auto 14px' }}>
            <Icon name="check" size={22} stroke={2} />
          </i>
          <p className="mu" style={{ fontSize: 14 }}>Nothing needs your attention right now.</p>
        </div>
      ) : (
        <div className="stack-sm">
          {list.map((a) => (
            <div key={a.id} className={`alertrow${a.tone === 'warn' ? ' warn' : ''}`}>
              <i className="icn"><Icon name={a.icon} size={17} stroke={2} /></i>
              <span>{a.text}</span>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
