import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';
import { SOURCE_ICONS } from '../data/categories.js';

export default function AddSourceSheet({ editing }) {
  const { state, closeSheet, openSheet, addSource, updateSource, deleteSource, showToast } = useApp();
  const [name, setName] = useState(editing?.name || '');
  const [icon, setIcon] = useState(editing?.icon || SOURCE_ICONS[0]);

  const save = () => {
    const nm = name.trim();
    if (!nm) { showToast('Enter a name'); return; }
    if (editing) updateSource(editing.id, { name: nm, icon });
    else addSource({ name: nm, icon });
    closeSheet();
  };

  const askDelete = () => {
    if (state.incomes.some((i) => i.sourceId === editing.id)) {
      showToast("Can't delete — it still has income logged");
      return;
    }
    openSheet({
      kind: 'confirm',
      title: 'Delete this source?',
      text: 'You can only delete a source once it has no income entries left.',
      confirmLabel: 'Delete',
      onConfirm: () => deleteSource(editing.id),
    });
  };

  return (
    <Sheet
      title={editing ? 'Edit source' : 'New income source'}
      onClose={closeSheet}
      footer={
        <div className="stack-sm">
          <button className="btn primary" onClick={save}>
            <Icon name="check" size={18} stroke={2.4} />{editing ? 'Save changes' : 'Add source'}
          </button>
          {editing ? (
            <button className="btn danger" onClick={askDelete}>
              <Icon name="trash" size={17} stroke={2} />Delete source
            </button>
          ) : null}
        </div>
      }
    >
      <div className="field">
        <label>Name</label>
        <input className="input" placeholder="e.g. Main Job, Freelance" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="field" style={{ marginBottom: 4 }}>
        <label>Icon</label>
        <div className="catgrid">
          {SOURCE_ICONS.map((ic) => (
            <button key={ic} type="button" className={`catcell${icon === ic ? ' on' : ''}`} style={{ padding: '14px 4px' }} onClick={() => setIcon(ic)}>
              <i><Icon name={ic} size={19} stroke={1.9} /></i>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
