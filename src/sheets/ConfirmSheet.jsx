import Sheet from './Sheet.jsx';
import { useApp } from '../state/AppContext.jsx';

// Generic Yes/Cancel confirmation sheet. The original app re-dispatched a
// named action string through the same event-delegation switch; here the
// caller just hands us the callback to run, which is simpler and avoids
// re-deriving "which record is this about" from a dataset attribute.
export default function ConfirmSheet({ title, text, confirmLabel, onConfirm }) {
  const { closeSheet } = useApp();
  return (
    <Sheet
      title={title}
      center
      onClose={closeSheet}
      footer={
        <div className="btn-row">
          <button className="btn ghost" onClick={closeSheet}>Cancel</button>
          <button className="btn primary" onClick={() => { onConfirm(); closeSheet(); }}>{confirmLabel}</button>
        </div>
      }
    >
      <p className="mu" style={{ fontSize: 14, margin: '2px 0 18px', lineHeight: 1.5 }}>{text}</p>
    </Sheet>
  );
}
