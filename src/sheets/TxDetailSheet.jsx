import Sheet from './Sheet.jsx';
import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';
import { catById } from '../data/categories.js';
import { formatMoney } from '../utils/format.js';
import { niceDate } from '../utils/date.js';
import { findTx } from '../utils/calc.js';

export default function TxDetailSheet({ txId }) {
  const { state, closeSheet, openSheet, deleteIncome, deleteExpense } = useApp();
  const tx = findTx(state.incomes, state.expenses, txId);
  if (!tx) return null;
  const isInc = tx.kind === 'income';
  const src = isInc ? state.sources.find((s) => s.id === tx.sourceId) : null;
  const ic = isInc ? (src?.icon || 'wallet') : catById(tx.categoryId).icon;
  const title = isInc ? (src?.name || 'Income') : catById(tx.categoryId).name;
  const cur = state.settings.currency;

  const rows = [
    ['Date', niceDate(tx.date)],
    [isInc ? 'Source' : 'Category', title],
    ...(tx.note ? [['Note', tx.note]] : []),
  ];

  const edit = () => {
    closeSheet();
    openSheet(isInc ? { kind: 'add-income', editing: tx } : { kind: 'add-expense', editing: tx });
  };
  const del = () => {
    openSheet({
      kind: 'confirm',
      title: 'Delete this entry?',
      text: "This can't be undone.",
      confirmLabel: 'Delete',
      onConfirm: () => (isInc ? deleteIncome(tx.id) : deleteExpense(tx.id)),
    });
  };

  return (
    <Sheet
      title={isInc ? 'Income' : 'Expense'}
      onClose={closeSheet}
      footer={
        <div className="btn-row">
          <button className="btn ghost" onClick={edit}><Icon name="edit" size={16} stroke={2} />Edit</button>
          <button className="btn danger" onClick={del}><Icon name="trash" size={16} stroke={2} />Delete</button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 0 22px' }}>
        <i style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', marginBottom: 14 }}>
          <Icon name={ic} size={24} stroke={1.8} />
        </i>
        <div className="num" style={{ fontFamily: 'var(--hd)', fontWeight: 800, fontSize: 30, letterSpacing: '-.02em' }}>
          {isInc ? '+ ' : '- '}{formatMoney(tx.amount, cur)}
        </div>
        <div className="mu" style={{ marginTop: 4, fontSize: 14 }}>{title}</div>
      </div>
      <div className="plist" style={{ background: 'var(--surface-2)', borderRadius: 16, padding: '4px 16px' }}>
        {rows.map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderTop: '1px solid var(--line)' }}>
            <span className="mu" style={{ fontSize: 13.5 }}>{l}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
