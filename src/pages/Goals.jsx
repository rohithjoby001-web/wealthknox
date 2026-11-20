import { useApp } from '../state/AppContext.jsx';
import Header from '../components/Header.jsx';
import StatTile from '../components/StatTile.jsx';
import GoalCard from '../components/GoalCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Icon } from '../icons/index.jsx';
import { niceDate, daysUntil } from '../utils/date.js';
import { formatMoney } from '../utils/format.js';
import { availableBalance, totalAllocatedAll } from '../utils/calc.js';

export default function Goals() {
  const { state, openSheet, cur } = useApp();
  const { incomes, expenses, goals } = state;
  const avail = availableBalance(incomes, expenses, goals, state.settings.startingBalance);
  const allocated = totalAllocatedAll(goals);
  const doneCount = goals.filter((g) => g.allocated >= g.target).length;
  const active = goals.filter((g) => g.allocated < g.target);
  const completed = goals.filter((g) => g.allocated >= g.target);
  const ordered = [...active, ...completed];

  const savedSuffix = (g) => {
    const done = g.allocated >= g.target;
    if (!g.deadline) return '';
    if (!done) {
      const dleft = daysUntil(g.deadline);
      if (dleft != null) return ` · ${dleft > 0 ? `${dleft}d left` : 'past due'}`;
    }
    return ` · ${niceDate(g.deadline)}`;
  };

  return (
    <>
      <Header title="Targets" subtitle="Save toward what matters" />

      <div className={`hero${avail < 0 ? ' neg' : ''}`}>
        <div className="hero-top">
          <div style={{ minWidth: 0 }}>
            <span className="lbl-sm">Available to allocate</span>
            <div className="hero-amt num">{avail < 0 ? <small>&minus;</small> : null}{formatMoney(Math.abs(avail), cur())}</div>
            <p className="hero-sub">
              {avail < 0
                ? "Spending has dipped into money already saved toward targets — add income or withdraw from a target to balance it out."
                : "What you've earned, minus what you've spent and already saved toward targets."}
            </p>
          </div>
          <button className="hero-orb" aria-label="New target" onClick={() => openSheet({ kind: 'add-goal' })}><Icon name="plus" size={22} stroke={2.4} /></button>
        </div>
      </div>

      <div className="bento cols-2">
        <StatTile icon="target" label="Saved in targets" amount={allocated} detail={`${goals.length} total`} currency={cur()} />
        <StatTile icon="check" label="Completed" amount={doneCount} detail="targets reached" raw />
      </div>

      <div className="section-h"><h2>Your targets</h2></div>

      {goals.length === 0 ? (
        <EmptyState
          icon="target"
          title="No targets yet"
          text="Set something you're saving for — a trip, a gadget, an emergency fund — and chip away at it."
          actionLabel="Create a target"
          onAction={() => openSheet({ kind: 'add-goal' })}
        />
      ) : (
        <div className="stack-sm">
          {ordered.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              currency={cur()}
              withDoneClass
              savedSuffix={savedSuffix(g)}
              onClick={() => openSheet({ kind: 'goal-detail', goalId: g.id })}
            />
          ))}
        </div>
      )}
    </>
  );
}
