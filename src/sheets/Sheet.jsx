import { Icon } from '../icons/index.jsx';

export default function Sheet({ title, center, onClose, children, footer }) {
  return (
    <div className={center ? 'overlay' : 'overlay'} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`sheet${center ? ' center' : ''}`} role="dialog" aria-modal="true">
        {!center && <div className="sheet-grab" />}
        <div className="sheet-head">
          <h2>{title}</h2>
          {!center && (
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="close" size={18} stroke={2.2} />
            </button>
          )}
        </div>
        <div className="sheet-body">{children}</div>
        {footer ? <div className="sheet-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
