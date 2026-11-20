import { Icon } from '../icons/index.jsx';

export default function EmptyState({ icon, title, text, actionLabel, onAction, actionIcon = 'plus' }) {
  return (
    <div className="empty">
      <i className="ic"><Icon name={icon} size={26} stroke={1.8} /></i>
      <strong>{title}</strong>
      <p>{text}</p>
      {actionLabel ? (
        <button className="btn primary" style={{ marginTop: 6 }} onClick={onAction}>
          <Icon name={actionIcon} size={17} stroke={2.3} />{actionLabel}
        </button>
      ) : null}
    </div>
  );
}
