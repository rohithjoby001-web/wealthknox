import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';
import { monthLabel, isCurrentMonth } from '../utils/date.js';

export default function MonthNav() {
  const { state, prevMonth, nextMonth } = useApp();
  const atCurrent = isCurrentMonth(state.monthDate);
  return (
    <div className="monthnav">
      <span className="lbl">{monthLabel(state.monthDate)}</span>
      <div className="arrows">
        <button aria-label="Previous month" onClick={prevMonth}>
          <Icon name="chevLeft" size={17} stroke={2.3} />
        </button>
        <button aria-label="Next month" disabled={atCurrent} onClick={nextMonth}>
          <Icon name="chevRight" size={17} stroke={2.3} />
        </button>
      </div>
    </div>
  );
}
