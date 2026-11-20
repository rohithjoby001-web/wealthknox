import { Icon } from '../icons/index.jsx';
import { useInstallPrompt } from './useInstallPrompt.jsx';

export default function InstallBanner() {
  const { canInstall, dismissed, dismiss, promptInstall } = useInstallPrompt();
  if (!canInstall || dismissed) return null;

  return (
    <div className="install-banner">
      <i className="icn"><Icon name="download" size={18} stroke={2} /></i>
      <span className="t">
        <strong>Install WealthKnox</strong>
        <span>Add it to your home screen for quick access</span>
      </span>
      <span className="act">
        <button className="go" onClick={promptInstall}>Install</button>
        <button className="dismiss" aria-label="Dismiss" onClick={dismiss}><Icon name="close" size={15} stroke={2.2} /></button>
      </span>
    </div>
  );
}
