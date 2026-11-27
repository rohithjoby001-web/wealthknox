import { useEffect } from 'react';
import { useApp } from '../state/AppContext.jsx';
import AddExpenseSheet from './AddExpenseSheet.jsx';
import AddIncomeSheet from './AddIncomeSheet.jsx';
import AddReminderSheet from './AddReminderSheet.jsx';
import AddSourceSheet from './AddSourceSheet.jsx';
import ReminderDetailSheet from './ReminderDetailSheet.jsx';
import TxDetailSheet from './TxDetailSheet.jsx';
import SettingsSheet from './SettingsSheet.jsx';
import ConfirmSheet from './ConfirmSheet.jsx';
import AlertsSheet from './AlertsSheet.jsx';
import AccountSheet from './AccountSheet.jsx';
import DateRangeSheet from './DateRangeSheet.jsx';
import StartingBalanceSheet from './StartingBalanceSheet.jsx';
import AdjustBalanceSheet from './AdjustBalanceSheet.jsx';

export default function SheetRoot() {
  const { sheet, closeSheet } = useApp();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && sheet) closeSheet();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheet, closeSheet]);

  if (!sheet) return null;
  return <SheetBody sheet={sheet} />;
}

function SheetBody({ sheet }) {
  switch (sheet.kind) {
    case 'settings':
      return <SettingsSheet />;
    case 'alerts':
      return <AlertsSheet alerts={sheet.alerts} />;
    case 'account':
      return <AccountSheet />;
    case 'date-range':
      return <DateRangeSheet initialFrom={sheet.initialFrom} initialTo={sheet.initialTo} onApply={sheet.onApply} />;
    case 'starting-balance':
      return <StartingBalanceSheet onboarding={!!sheet.onboarding} />;
    case 'adjust-balance':
      return <AdjustBalanceSheet />;
    case 'add-expense':
      return <AddExpenseSheet editing={sheet.editing} />;
    case 'add-income':
      return <AddIncomeSheet editing={sheet.editing} />;
    case 'add-reminder':
      return <AddReminderSheet editing={sheet.editing} />;
    case 'add-source':
      return <AddSourceSheet editing={sheet.editing} />;
    case 'reminder-detail':
      return <ReminderDetailSheet reminderId={sheet.reminderId} />;
    case 'tx-detail':
      return <TxDetailSheet txId={sheet.txId} />;
    case 'confirm':
      return <ConfirmSheet title={sheet.title} text={sheet.text} confirmLabel={sheet.confirmLabel} onConfirm={sheet.onConfirm} />;
    default:
      return null;
  }
}
