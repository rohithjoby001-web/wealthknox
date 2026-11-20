import { useRef, useState } from 'react';
import Sheet from './Sheet.jsx';
import { Icon } from '../icons/index.jsx';
import { useApp } from '../state/AppContext.jsx';
import { useInstallPrompt } from '../pwa/useInstallPrompt.jsx';

const CURRENCIES = ['$', '₹', '€', '£'];

const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

export default function SettingsSheet() {
  const { state, closeSheet, openSheet, setCurrency, setStartingBalance, resetAll, exportData, importData, showToast, cloudActive } = useApp();
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const fileInputRef = useRef(null);
  const [sbInput, setSbInput] = useState(String(state.settings.startingBalance || ''));

  const commitStartingBalance = () => {
    const n = Math.max(0, parseFloat(sbInput) || 0);
    setSbInput(n ? String(n) : '');
    if (n !== (state.settings.startingBalance || 0)) setStartingBalance(n);
  };
  // Drives the save button's look — filled once you've typed something
  // that hasn't been committed yet, so it's clear there's a pending change
  // and clear once it's saved, rather than leaving people to guess whether
  // tapping away or pressing Enter actually did anything.
  const sbDirty = Math.max(0, parseFloat(sbInput) || 0) !== (state.settings.startingBalance || 0);

  const askReset = () => {
    openSheet({
      kind: 'confirm',
      title: 'Reset everything?',
      text: cloudActive
        ? "This clears every expense, income entry, source, goal and your starting balance from your account, on every device. This can't be undone."
        : "This clears every expense, income entry, source, goal and your starting balance. This can't be undone.",
      confirmLabel: 'Reset',
      onConfirm: resetAll,
    });
  };

  const handleExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wealthknox-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup downloaded');
  };

  const handleFileChosen = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      // Check the file is actually a readable backup *before* asking to
      // restore it — otherwise someone picking the wrong file sees a
      // "Restore this backup?" prompt for a file that was never valid,
      // and only learns that after already saying yes.
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = null; }
      const looksValid = parsed && typeof parsed === 'object' &&
        ['incomes', 'expenses', 'goals', 'sources'].every((k) => Array.isArray(parsed[k]));
      if (!looksValid) { showToast("That doesn't look like a WealthKnox backup file"); return; }
      openSheet({
        kind: 'confirm',
        title: 'Restore this backup?',
        text: cloudActive
          ? "This replaces every expense, income entry, source and target in your account, on every device, with what's in the file. This can't be undone."
          : "This replaces every expense, income entry, source and target on this device with what's in the file. This can't be undone.",
        confirmLabel: 'Restore',
        onConfirm: () => importData(text),
      });
    };
    reader.readAsText(file);
  };

  return (
    <Sheet title="Settings" onClose={closeSheet}>
      {installed ? (
        <div className="install-row">
          <i className="icn"><Icon name="check" size={18} stroke={2.2} /></i>
          <span className="t"><strong>App installed</strong><span>You're using WealthKnox from your home screen</span></span>
        </div>
      ) : canInstall ? (
        <div className="install-row">
          <i className="icn"><Icon name="download" size={18} stroke={2} /></i>
          <span className="t"><strong>Install app</strong><span>Add WealthKnox to your home screen</span></span>
          <button className="btn" style={{ padding: '8px 14px', flex: '0 0 auto' }} onClick={promptInstall}>Install</button>
        </div>
      ) : isIOS ? (
        <div className="install-row">
          <i className="icn"><Icon name="download" size={18} stroke={2} /></i>
          <span className="t"><strong>Install app</strong><span>Tap Share, then "Add to Home Screen"</span></span>
        </div>
      ) : null}
      <div className="field">
        <label>Starting balance</label>
        <div className="amtfield">
          <span className="cur">{state.settings.currency}</span>
          <input
            inputMode="decimal"
            placeholder="0"
            value={sbInput}
            onChange={(e) => setSbInput(e.target.value)}
            onBlur={commitStartingBalance}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          />
          <button
            type="button"
            aria-label="Save starting balance"
            onClick={commitStartingBalance}
            style={{
              width: 36, height: 36, minWidth: 36, borderRadius: '50%', border: 'none',
              display: 'grid', placeItems: 'center', transition: '.15s',
              background: sbDirty ? 'var(--ink)' : 'var(--surface-3)',
              color: sbDirty ? 'var(--on-ink)' : 'var(--mu)',
            }}
          >
            <Icon name="check" size={16} stroke={2.4} />
          </button>
        </div>
        <p className="helptext">
          What you're starting with (e.g. your current bank balance) — counted toward "Available", but kept out of your monthly and yearly income totals so Reports only shows what you actually earned. Type it, then tap the check to save.
        </p>
      </div>
      <div className="divider" />
      <div className="field">
        <label>Currency symbol</label>
        <div className="pillselect">
          {CURRENCIES.map((c) => (
            <button key={c} type="button" className={state.settings.currency === c ? 'on' : ''} onClick={() => setCurrency(c)}>{c}</button>
          ))}
        </div>
      </div>
      <div className="divider" />
      <div className="field">
        <label>Back up &amp; restore</label>
        <p className="mu" style={{ fontSize: 13.5, marginBottom: 12, lineHeight: 1.5 }}>
          {cloudActive
            ? 'Your data already syncs to your account, so this is just an extra copy in your own hands — handy if you ever want to move it somewhere else.'
            : 'Everything stays on this device — no server, no account. That also means clearing your browser data or switching phones can erase it for good, so keep a backup file somewhere safe.'}
        </p>
        <div className="btn-row">
          <button className="btn ghost" onClick={handleExport}><Icon name="download" size={16} stroke={2} />Export</button>
          <button className="btn ghost" onClick={() => fileInputRef.current?.click()}><Icon name="upload" size={16} stroke={2} />Import</button>
        </div>
        <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleFileChosen} style={{ display: 'none' }} />
      </div>
      <div className="divider" />
      <div className="field">
        <label>Data</label>
        <p className="mu" style={{ fontSize: 13.5, marginBottom: 12, lineHeight: 1.5 }}>
          {cloudActive
            ? 'Clear every expense, income entry, source, target and starting balance from your account, on every device.'
            : 'Clear every expense, income entry, source, target and starting balance on this device.'}
        </p>
        <button className="btn danger" onClick={askReset}>Reset all data</button>
      </div>
      <div className="divider" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '4px 0 2px' }}>
        <p className="mu" style={{ fontSize: 12 }}>WealthKnox</p>
      </div>
    </Sheet>
  );
}
