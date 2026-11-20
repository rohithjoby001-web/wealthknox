import { Icon } from '../icons/index.jsx';

// Small "Show N more / Show less" row used under any list we truncate by
// default — keeps long day-by-day transaction lists from dominating the
// page while still making the full list one tap away.
export default function ExpandToggle({ expanded, remaining, onClick }) {
  return (
    <button className="listmore" onClick={onClick}>
      {expanded ? 'Show less' : `Show ${remaining} more`}
      <Icon name={expanded ? 'chevUp' : 'chevDown'} size={15} stroke={2.2} />
    </button>
  );
}
