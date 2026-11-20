import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'overview' },
  { key: 'reports', label: 'Reports', icon: 'trendingUp' },
  { key: 'expenses', label: 'Expenses', icon: 'expense' },
  { key: 'income', label: 'Income', icon: 'income' },
  { key: 'goals', label: 'Goals', icon: 'target' },
];

// Icon-only, fixed-size tabs — no label to expand/collapse, so
// selecting one never reflows its neighbors.
function Tab({ t, cur, onNav }) {
  const isCur = cur === t.key;
  return (
    <button className={`tab${isCur ? ' cur' : ''}`} aria-label={t.label} onClick={() => onNav(t.key)}>
      <Icon name={t.icon} size={20} stroke={isCur ? 2.3 : 1.9} />
    </button>
  );
}

// The Add action used to live here as a central FAB whose meaning
// silently changed depending on which tab you were on (expense/income/
// target) — even redesigned to float clear of the tabs, that's still a
// control that means something different every time you look at it.
// It now lives on each relevant page itself (the "+" on the Expenses/
// Income/Targets hero card), so this is just plain navigation — five
// tabs, nothing contextual.
export default function BottomNav() {
  const { state, setTab } = useApp();

  return (
    <nav className="bottomnav">
      {TABS.map((t) => <Tab key={t.key} t={t} cur={state.tab} onNav={setTab} />)}
    </nav>
  );
}
