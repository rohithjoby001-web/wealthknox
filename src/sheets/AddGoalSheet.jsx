import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';
import { GOAL_ICONS } from '../data/categories.js';
import { formatMoney } from '../utils/format.js';

export default function AddGoalSheet({ editing }) {
  const { closeSheet, openSheet, addGoal, updateGoal, deleteGoal, showToast, cur } = useApp();
  const [name, setName] = useState(editing?.name || '');
  const [target, setTarget] = useState(editing ? String(editing.target) : '');
  const [icon, setIcon] = useState(editing?.icon || GOAL_ICONS[0]);
  const [deadline, setDeadline] = useState(editing?.deadline || '');
  const minTarget = editing?.allocated || 0;

  const save = () => {
    const nm = name.trim();
    const amt = Number(String(target).replace(/[^0-9.]/g, ''));
    if (!nm) { showToast('Enter a name'); return; }
    if (!(amt > 0)) { showToast('Enter a target'); return; }
    if (editing) updateGoal(editing.id, { name: nm, target: amt, icon, deadline: deadline || null });
    else addGoal({ name: nm, target: amt, icon, deadline: deadline || null });
    closeSheet();
  };

  const askDelete = () => {
    openSheet({
      kind: 'confirm',
      title: 'Delete this target?',
      text: editing.allocated
        ? `${formatMoney(editing.allocated, cur())} already allocated will go back to your available balance.`
        : "This can't be undone.",
      confirmLabel: 'Delete',
      onConfirm: () => deleteGoal(editing.id),
    });
  };

  return (
    <Sheet
      title={editing ? 'Edit target' : 'New target'}
      onClose={closeSheet}
      footer={
        <div className="stack-sm">
          <button className="btn primary" onClick={save}>
            <Icon name="check" size={18} stroke={2.4} />{editing ? 'Save changes' : 'Create target'}
          </button>
          {editing ? (
            <button className="btn danger" onClick={askDelete}>
              <Icon name="trash" size={17} stroke={2} />Delete target
            </button>
          ) : null}
        </div>
      }
    >
      <div className="field">
        <label>What are you saving for?</label>
        <input className="input" placeholder="e.g. New laptop, trip abroad" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label>Target amount</label>
        <div className="amtfield">
          <span className="cur">{cur()}</span>
          <input inputMode="decimal" placeholder="0" value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
        {minTarget > 0 ? <p className="helptext">Can't go below {formatMoney(minTarget, cur())} — that's already allocated.</p> : null}
      </div>
      <div className="field">
        <label>Icon</label>
        <div className="catgrid">
          {GOAL_ICONS.map((ic) => (
            <button key={ic} type="button" className={`catcell${icon === ic ? ' on' : ''}`} style={{ padding: '14px 4px' }} onClick={() => setIcon(ic)}>
              <i><Icon name={ic} size={19} stroke={1.9} /></i>
            </button>
          ))}
        </div>
      </div>
      <div className="field" style={{ marginBottom: 4 }}>
        <label>Target date (optional)</label>
        <input className="input" type="date" value={deadline || ''} onChange={(e) => setDeadline(e.target.value)} />
      </div>
    </Sheet>
  );
}
