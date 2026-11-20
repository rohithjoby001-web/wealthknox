import { useApp } from '../state/AppContext.jsx';

export default function Toast() {
  const { toastMsg } = useApp();
  if (!toastMsg) return null;
  return <div className="toast">{toastMsg}</div>;
}
