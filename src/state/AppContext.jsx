import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { buildSampleData } from '../data/sampleData.js';
import { toISO, parseISO, addMonths, isCurrentMonth, monthKey } from '../utils/date.js';
import { formatMoney } from '../utils/format.js';
import { availableFor, countsTowardBalance, reminderIconToCategoryId } from '../utils/calc.js';
import { useAuth } from '../auth/AuthContext.jsx';
import {
  subscribeToUserData, ensureSeeded, putDoc, patchDoc, removeDoc,
  putSettings, resetAllCloud, replaceAllCloud,
} from './cloudSync.js';

const STORAGE_KEY = 'wealthknox:state:v1';

// startingDate: 'YYYY-MM-DD' the starting balance applies from (null =
// legacy, counts every entry). adjustments: balance corrections made via
// "Adjust balance". onboarded: the first-run starting-balance prompt has
// been answered or skipped.
const DEFAULT_SETTINGS = { currency: '$', startingBalance: 0, startingDate: null, adjustments: [], onboarded: false };
const settingsFrom = (d) => ({
  currency: d?.currency || '$',
  startingBalance: Number(d?.startingBalance) || 0,
  startingDate: d?.startingDate || null,
  adjustments: Array.isArray(d?.adjustments) ? d.adjustments : [],
  // Anyone who already set a starting balance before this prompt existed
  // has effectively been onboarded — don't nag them.
  onboarded: !!d?.onboarded || (Number(d?.startingBalance) || 0) > 0,
});
const TOAST_MS = 2400;

/* ---------- initial / persisted data state ----------
   Mirrors the original build's `state` object, minus the purely-UI
   fields (sheet / toast), which live as separate React state below
   since they should never be written to localStorage. */
function initData() {
  const sample = buildSampleData();
  return {
    tab: 'overview',
    monthDate: new Date(),
    filterCat: 'all',
    chartRange: 6,
    settings: { ...DEFAULT_SETTINGS },
    ...sample,
  };
}

function persistablePayload(state) {
  return {
    tab: state.tab,
    monthDate: toISO(state.monthDate),
    filterCat: state.filterCat,
    chartRange: state.chartRange,
    settings: state.settings,
    sources: state.sources,
    incomes: state.incomes,
    expenses: state.expenses,
    reminders: state.reminders,
  };
}

// Shared by both the silent localStorage load and a user-initiated
// backup-file import, so a restored file is validated exactly as
// strictly as data already on the device.
function normalizeSaved(saved) {
  if (!saved || typeof saved !== 'object') return null;
  return {
    tab: saved.tab || 'overview',
    monthDate: saved.monthDate ? parseISO(saved.monthDate) : new Date(),
    filterCat: saved.filterCat || 'all',
    chartRange: saved.chartRange || 6,
    settings: settingsFrom(saved.settings),
    sources: Array.isArray(saved.sources) ? saved.sources : [],
    incomes: Array.isArray(saved.incomes) ? saved.incomes : [],
    expenses: Array.isArray(saved.expenses) ? saved.expenses : [],
    // Backward-compat: if an older backup file still has `goals` from the
    // pre-reminders era, it just gets dropped — there's no clean migration
    // path from savings-target data to bill-reminder data, and the user can
    // always re-create reminders by hand. New files use `reminders`.
    reminders: Array.isArray(saved.reminders) ? saved.reminders : [],
  };
}

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeSaved(JSON.parse(raw));
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistablePayload(state)));
  } catch {
    /* storage unavailable or full — app still works in-memory */
  }
}

/* ---------- reducer ----------
   Used as-is for the local-only (no Firebase project configured, or
   signed out) path. In cloud mode the same reducer still holds the
   state that components read — HYDRATE is just fed by Firestore
   snapshots instead of localStorage, so every page below this needed
   zero changes to work in either mode. */
function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload };
    case 'SET_TAB':
      return { ...state, tab: action.tab };
    case 'PREV_MONTH':
      return { ...state, monthDate: addMonths(state.monthDate, -1) };
    case 'NEXT_MONTH':
      return isCurrentMonth(state.monthDate) ? state : { ...state, monthDate: addMonths(state.monthDate, 1) };
    case 'SET_FILTER_CAT':
      return { ...state, filterCat: action.cat };
    case 'SET_CHART_RANGE':
      return { ...state, chartRange: action.range };
    case 'SET_CURRENCY':
      return { ...state, settings: { ...state.settings, currency: action.currency } };
    case 'SET_STARTING_BALANCE':
      return { ...state, settings: { ...state.settings, startingBalance: action.value } };
    case 'PATCH_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'ADD_EXPENSE':
      return { ...state, expenses: [...state.expenses, action.expense] };
    case 'UPDATE_EXPENSE':
      return { ...state, expenses: state.expenses.map((x) => (x.id === action.id ? { ...x, ...action.patch } : x)) };
    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter((x) => x.id !== action.id) };

    case 'ADD_INCOME':
      return { ...state, incomes: [...state.incomes, action.income] };
    case 'UPDATE_INCOME':
      return { ...state, incomes: state.incomes.map((x) => (x.id === action.id ? { ...x, ...action.patch } : x)) };
    case 'DELETE_INCOME':
      return { ...state, incomes: state.incomes.filter((x) => x.id !== action.id) };

    case 'ADD_GOAL':
    case 'UPDATE_GOAL':
    case 'DELETE_GOAL':
    case 'ALLOCATE_GOAL':
    case 'WITHDRAW_GOAL':
      // Legacy goal actions — silently no-op. Any caller still dispatching
      // these (e.g. an older tab somehow still in memory) gets a safe
      // identity return rather than a crash. Goal infrastructure was
      // replaced by reminders.
      return state;

    case 'ADD_REMINDER':
      return { ...state, reminders: [...state.reminders, action.reminder] };
    case 'UPDATE_REMINDER':
      return { ...state, reminders: state.reminders.map((r) => (r.id === action.id ? { ...r, ...action.patch } : r)) };
    case 'DELETE_REMINDER':
      return { ...state, reminders: state.reminders.filter((r) => r.id !== action.id) };
    case 'TOGGLE_REMINDER_PAID': {
      // Toggle whether a reminder is marked paid for the given monthKey.
      // paidMonths is a plain array of 'YYYY-MM' strings — add or remove
      // the current key. In cloud mode this mirrors via patchDoc so the
      // change syncs as a normal doc update (no atomic counter needed).
      const key = action.monthKey;
      return {
        ...state,
        reminders: state.reminders.map((r) => {
          if (r.id !== action.id) return r;
          const has = Array.isArray(r.paidMonths) && r.paidMonths.includes(key);
          const paidMonths = has
            ? (r.paidMonths || []).filter((k) => k !== key)
            : [...(r.paidMonths || []), key];
          return { ...r, paidMonths };
        }),
      };
    }

    case 'ADD_SOURCE':
      return { ...state, sources: [...state.sources, action.source] };
    case 'UPDATE_SOURCE':
      return { ...state, sources: state.sources.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)) };
    case 'DELETE_SOURCE':
      return { ...state, sources: state.sources.filter((s) => s.id !== action.id) };

    case 'RESET_ALL':
      // Starting balance is money tied to this data, not a display preference
      // like currency — a "reset everything" that left it behind would show
      // an Available figure with nothing behind it.
      return { ...state, sources: [], incomes: [], expenses: [], reminders: [], settings: { ...state.settings, startingBalance: 0, startingDate: null, adjustments: [], onboarded: false } };

    default:
      return state;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initData);
  const { enabled: firebaseEnabled, user } = useAuth();
  const uid = user?.uid || null;
  // True once we're actually syncing this account's data through
  // Firestore instead of this one browser's localStorage. AuthGate (see
  // App.jsx) only renders this provider once sign-in has resolved, so
  // this doesn't flicker between modes after mount.
  const cloudActive = firebaseEnabled && !!uid;

  // UI-only state — intentionally outside the reducer so it's never persisted.
  const [sheet, setSheet] = useState(null); // { kind, editing?, goalId?, txId?, ... }
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef(null);
  const hydrated = useRef(false);
  // True once settings have actually loaded (localStorage read, or the
  // first Firestore snapshot) — the first-run prompt waits for this so it
  // never flashes up for someone whose settings just haven't arrived yet.
  const [settingsReady, setSettingsReady] = useState(false);

  // Local-only mode: load any saved data once, on first mount. If
  // nothing is saved yet (brand-new install), the bundled sample data
  // stays as-is. Skipped entirely in cloud mode — Firestore (below) is
  // this account's data, not whatever happens to be in this browser.
  useEffect(() => {
    if (cloudActive) { hydrated.current = true; return; }
    const saved = loadPersisted();
    if (saved) dispatch({ type: 'HYDRATE', payload: saved });
    hydrated.current = true;
    setSettingsReady(true);
  }, [cloudActive]);

  // Local-only mode: persist on every data change (skip the very first
  // render, before hydration has had a chance to run, to avoid
  // clobbering saved data with the sample-data default for one frame).
  useEffect(() => {
    if (cloudActive) return;
    if (!hydrated.current) return;
    saveState(state);
  }, [state, cloudActive]);

  // Cloud mode: seed a brand-new account with the same sample data a
  // fresh local install gets, then mirror this account's four
  // collections + settings doc into the same reducer shape everything
  // else already reads. Each snapshot fires instantly off Firestore's
  // on-device cache — including this device's own writes, even
  // offline — and again later if the write needed to reach the server.
  useEffect(() => {
    if (!cloudActive) return;
    let cancelled = false;
    let unsubscribe = null;
    (async () => {
      try { await ensureSeeded(uid); } catch { /* fine — listener below still attaches */ }
      if (cancelled) return;
      unsubscribe = subscribeToUserData(uid, (entity, data) => {
        if (entity === 'settings') {
          if (data) dispatch({ type: 'HYDRATE', payload: { settings: settingsFrom(data), chartRange: data.chartRange ?? 6 } });
          setSettingsReady(true);
        } else {
          dispatch({ type: 'HYDRATE', payload: { [entity]: data } });
        }
      });
    })();
    return () => { cancelled = true; if (unsubscribe) unsubscribe(); };
  }, [cloudActive, uid]);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), TOAST_MS);
  }, []);

  const openSheet = useCallback((s) => setSheet(s), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const value = useMemo(() => {
    const cur = () => state.settings.currency;
    const cloudFail = (msg) => () => showToast(msg);

    return {
      state,
      cur,
      sheet,
      toastMsg,
      showToast,
      openSheet,
      closeSheet,
      cloudActive,
      settingsReady,

      setTab: (tab) => dispatch({ type: 'SET_TAB', tab }),
      prevMonth: () => dispatch({ type: 'PREV_MONTH' }),
      nextMonth: () => dispatch({ type: 'NEXT_MONTH' }),
      setFilterCat: (cat) => dispatch({ type: 'SET_FILTER_CAT', cat }),
      setChartRange: (range) => {
        if (cloudActive) putSettings(uid, { chartRange: range }).catch(cloudFail("Couldn't save that — try again"));
        else dispatch({ type: 'SET_CHART_RANGE', range });
      },
      setCurrency: (currency) => {
        if (cloudActive) putSettings(uid, { currency }).catch(cloudFail("Couldn't save — try again"));
        else dispatch({ type: 'SET_CURRENCY', currency });
        showToast('Currency updated');
      },
      // A one-time "what I'm starting with" figure, kept separate from
      // the Income ledger — see availableBalance in calc.js for why.
      setStartingBalance: (value) => {
        const n = Math.max(0, Number(value) || 0);
        if (cloudActive) putSettings(uid, { startingBalance: n }).catch(cloudFail("Couldn't save — try again"));
        else dispatch({ type: 'SET_STARTING_BALANCE', value: n });
        showToast('Starting balance updated');
      },
      // Sets the dated starting point ("I had X at the start of DATE").
      // A new starting point replaces any earlier adjustments — they were
      // corrections against the old figure and would be wrong on the new one.
      setStartingPoint: ({ amount, date }) => {
        const patch = { startingBalance: Math.max(0, Number(amount) || 0), startingDate: date || toISO(new Date()), adjustments: [], onboarded: true };
        if (cloudActive) putSettings(uid, patch).catch(cloudFail("Couldn't save — try again"));
        else dispatch({ type: 'PATCH_SETTINGS', patch });
        showToast('Starting balance saved');
      },
      dismissOnboarding: () => {
        const patch = { onboarded: true };
        if (cloudActive) putSettings(uid, patch).catch(() => {});
        else dispatch({ type: 'PATCH_SETTINGS', patch });
      },
      // "My bank actually shows X": records the difference as an
      // adjustment so Available matches reality, without inventing a fake
      // income or expense that would distort Reports.
      adjustBalanceTo: (actual, note = '') => {
        const current = availableFor(state.incomes, state.expenses, state.settings);
        const diff = Math.round((Number(actual) - current) * 100) / 100;
        if (!isFinite(diff) || diff === 0) { showToast('Already matches — nothing to adjust'); return false; }
        const adj = { id: 'a' + Date.now(), amount: diff, date: toISO(new Date()), note: note || '', createdAt: new Date().toISOString() };
        const adjustments = [...(state.settings.adjustments || []), adj];
        if (cloudActive) putSettings(uid, { adjustments }).catch(cloudFail("Couldn't save — try again"));
        else dispatch({ type: 'PATCH_SETTINGS', patch: { adjustments } });
        showToast(`Balance adjusted by ${diff < 0 ? '−' : '+'}${formatMoney(Math.abs(diff), state.settings.currency)}`);
        return true;
      },
      deleteAdjustment: (id) => {
        const adjustments = (state.settings.adjustments || []).filter((a) => a.id !== id);
        if (cloudActive) putSettings(uid, { adjustments }).catch(cloudFail("Couldn't delete — try again"));
        else dispatch({ type: 'PATCH_SETTINGS', patch: { adjustments } });
        showToast('Adjustment removed');
      },

      // Income is meant to represent real money (your actual balance or
      // deposits), so an expense can never be recorded past what's
      // actually available — unlike a plain ledger that just lets the
      // total go negative, this treats "available" as a hard ceiling.
      // Rejects outright (toast + no-op) rather than silently clamping the
      // amount down, since silently changing what someone said they
      // spent would misrepresent the real transaction.
      //
      // `customName` is set only when the user picks the "Other" category
      // and names the expense themselves — see AddExpenseSheet.
      addExpense: ({ amount, categoryId, note, date, customName }) => {
        const avail = availableFor(state.incomes, state.expenses, state.settings);
        // An expense dated before the starting point is already inside the
        // starting figure, so it can't overdraw anything — no cap for it.
        if (countsTowardBalance(date, state.settings) && amount > avail) { showToast(`Only ${formatMoney(avail, state.settings.currency)} available`); return false; }
        const expense = { id: 'e' + Date.now(), amount, categoryId, note, date, createdAt: new Date().toISOString() };
        if (categoryId === 'other' && customName) expense.customName = customName;
        if (cloudActive) putDoc(uid, 'expenses', expense).catch(cloudFail("Couldn't save — try again"));
        else dispatch({ type: 'ADD_EXPENSE', expense });
        showToast('Expense added');
        return true;
      },
      updateExpense: (id, { amount, categoryId, note, date, customName }) => {
        // The entry being edited is already subtracted once in the
        // current available balance, so add its old amount back before
        // checking the new one against the cap.
        const prev = state.expenses.find((x) => x.id === id);
        const prevCounted = prev && countsTowardBalance(prev.date, state.settings) ? prev.amount : 0;
        const avail = availableFor(state.incomes, state.expenses, state.settings) + prevCounted;
        if (countsTowardBalance(date, state.settings) && amount > avail) { showToast(`Only ${formatMoney(avail, state.settings.currency)} available`); return false; }
        // Build the patch — include customName only when it's set on an
        // Other-category expense; otherwise strip it from the stored doc
        // so a category change away from Other doesn't leave a stale name.
        const patch = { amount, categoryId, note, date };
        if (categoryId === 'other' && customName) patch.customName = customName;
        else if (prev?.customName) patch.customName = null;
        if (cloudActive) patchDoc(uid, 'expenses', id, patch).catch(cloudFail("Couldn't save the change"));
        else dispatch({ type: 'UPDATE_EXPENSE', id, patch });
        showToast('Expense updated');
        return true;
      },
      deleteExpense: (id) => {
        if (cloudActive) removeDoc(uid, 'expenses', id).catch(cloudFail("Couldn't delete — try again"));
        else dispatch({ type: 'DELETE_EXPENSE', id });
        showToast('Entry deleted');
      },

      addIncome: ({ amount, sourceId, note, date }) => {
        const income = { id: 'i' + Date.now(), amount, sourceId, note, date, createdAt: new Date().toISOString() };
        if (cloudActive) putDoc(uid, 'incomes', income).catch(cloudFail("Couldn't save — try again"));
        else dispatch({ type: 'ADD_INCOME', income });
        showToast('Income added');
      },
      updateIncome: (id, { amount, sourceId, note, date }) => {
        const patch = { amount, sourceId, note, date };
        if (cloudActive) patchDoc(uid, 'incomes', id, patch).catch(cloudFail("Couldn't save the change"));
        else dispatch({ type: 'UPDATE_INCOME', id, patch });
        showToast('Income updated');
      },
      deleteIncome: (id) => {
        if (cloudActive) removeDoc(uid, 'incomes', id).catch(cloudFail("Couldn't delete — try again"));
        else dispatch({ type: 'DELETE_INCOME', id });
        showToast('Entry deleted');
      },

      // Reminders replace the old goals/targets concept. Two flavors:
      //   - Recurring monthly: `recurring: true` + `dueDay: number` (e.g. rent
      //     on the 1st of every month). The card auto-rolls to next month's
      //     date once marked paid — no manual date editing needed.
      //   - One-time: `recurring: false` + `dueDate: 'YYYY-MM-DD'` (a specific
      //     due date for a one-off payment).
      addReminder: ({ name, amount, recurring, dueDay, dueDate, icon }) => {
        const reminder = {
          id: 'r' + Date.now(),
          name, amount,
          recurring: !!recurring,
          dueDay: recurring ? (dueDay || null) : null,
          dueDate: recurring ? null : (dueDate || null),
          icon: icon || 'wallet',
          paidMonths: [],
          createdAt: new Date().toISOString(),
        };
        if (cloudActive) putDoc(uid, 'reminders', reminder).catch(cloudFail("Couldn't save — try again"));
        else dispatch({ type: 'ADD_REMINDER', reminder });
        showToast('Reminder created');
      },
      updateReminder: (id, { name, amount, recurring, dueDay, dueDate, icon }) => {
        const patch = {
          name, amount,
          recurring: !!recurring,
          dueDay: recurring ? (dueDay || null) : null,
          dueDate: recurring ? null : (dueDate || null),
          icon,
        };
        if (cloudActive) patchDoc(uid, 'reminders', id, patch).catch(cloudFail("Couldn't save the change"));
        else dispatch({ type: 'UPDATE_REMINDER', id, patch });
        showToast('Reminder updated');
      },
      deleteReminder: (id) => {
        if (cloudActive) removeDoc(uid, 'reminders', id).catch(cloudFail("Couldn't delete — try again"));
        else dispatch({ type: 'DELETE_REMINDER', id });
        showToast('Reminder deleted');
      },
      // Toggle the paid status for a reminder in the given monthKey (defaults
      // to the current monthKey derived from state.monthDate). In cloud mode
      // the patch doc replaces paidMonths wholesale — Firestore's
      // arrayUnion/arrayRemove would also work but a plain array write is
      // simpler and fine here since toggles are user-paced, not concurrent.
      toggleReminderPaid: (id, keyArg) => {
        const r = state.reminders.find((x) => x.id === id);
        if (!r) return;
        const key = keyArg || monthKey(state.monthDate);
        const has = Array.isArray(r.paidMonths) && r.paidMonths.includes(key);
        const paidMonths = has
          ? (r.paidMonths || []).filter((k) => k !== key)
          : [...(r.paidMonths || []), key];
        if (cloudActive) patchDoc(uid, 'reminders', id, { paidMonths }).catch(cloudFail("Couldn't save — try again"));
        else dispatch({ type: 'TOGGLE_REMINDER_PAID', id, monthKey: key });
        showToast(has ? 'Marked unpaid' : 'Marked paid');
      },
      // One-tap "Pay" from the Overview page: marks the reminder paid for
      // the current month AND creates a corresponding expense entry (with
      // the amount, a category mapped from the reminder's icon, and today's
      // date) — so the user doesn't have to separately open Expenses and
      // log the payment by hand.
      //
      // Bypasses the available-balance cap that addExpense enforces: if
      // someone is paying a real bill, the expense needs to be recorded
      // even if it pushes the balance negative (that's real information,
      // not a bug). If the reminder is already marked paid for this month,
      // we still create the expense (the user might be re-paying or logging
      // a late payment) but don't toggle the paid flag again.
      payReminder: (reminderId) => {
        const r = state.reminders.find((x) => x.id === reminderId);
        if (!r) return;
        const key = monthKey(new Date());
        const alreadyPaid = Array.isArray(r.paidMonths) && r.paidMonths.includes(key);

        // 1. Mark as paid for this month (only if not already)
        if (!alreadyPaid) {
          const paidMonths = [...(r.paidMonths || []), key];
          if (cloudActive) patchDoc(uid, 'reminders', reminderId, { paidMonths }).catch(cloudFail("Couldn't save — try again"));
          else dispatch({ type: 'TOGGLE_REMINDER_PAID', id: reminderId, monthKey: key });
        }

        // 2. Create the expense — category mapped from the reminder icon,
        // note set to the reminder name so it shows in the expense list
        // with context. Bypasses the available-balance cap intentionally.
        const categoryId = reminderIconToCategoryId(r.icon);
        const expense = {
          id: 'e' + Date.now(),
          amount: r.amount,
          categoryId,
          note: r.name,
          date: toISO(new Date()),
          createdAt: new Date().toISOString(),
        };
        // For 'other' category, also set customName so the expense title
        // shows the bill name instead of the generic "Other" label.
        if (categoryId === 'other') {
          expense.customName = r.name;
          expense.note = '';
        }
        if (cloudActive) putDoc(uid, 'expenses', expense).catch(cloudFail("Couldn't save the expense — try again"));
        else dispatch({ type: 'ADD_EXPENSE', expense });

        showToast(`Paid ${formatMoney(r.amount, cur())} for ${r.name}`);
      },

      addSource: ({ name, icon }) => {
        const source = { id: 's' + Date.now(), name, icon, createdAt: new Date().toISOString() };
        if (cloudActive) putDoc(uid, 'sources', source).catch(cloudFail("Couldn't save — try again"));
        else dispatch({ type: 'ADD_SOURCE', source });
        showToast('Source added');
      },
      updateSource: (id, { name, icon }) => {
        const patch = { name, icon };
        if (cloudActive) patchDoc(uid, 'sources', id, patch).catch(cloudFail("Couldn't save the change"));
        else dispatch({ type: 'UPDATE_SOURCE', id, patch });
        showToast('Source updated');
      },
      deleteSource: (id) => {
        if (cloudActive) removeDoc(uid, 'sources', id).catch(cloudFail("Couldn't delete — try again"));
        else dispatch({ type: 'DELETE_SOURCE', id });
        showToast('Source removed');
      },

      resetAll: () => {
        if (cloudActive) resetAllCloud(uid).catch(cloudFail("Couldn't clear everything — try again"));
        else dispatch({ type: 'RESET_ALL' });
        showToast('All data cleared');
      },

      // In local-only mode everything lives in this browser's
      // localStorage (see Settings), so clearing site data, switching
      // phones, or an OS storage sweep on an un-installed PWA can erase
      // it all with no way back — these give a real file to hold onto.
      // In cloud mode they're just as useful as a second, offline,
      // in-your-own-hands copy alongside the synced account.
      exportData: () => JSON.stringify(persistablePayload(state), null, 2),
      importData: (jsonText) => {
        let parsed;
        try { parsed = JSON.parse(jsonText); } catch { parsed = null; }
        const payload = normalizeSaved(parsed);
        if (!payload) { showToast("Couldn't read that backup file"); return false; }
        if (cloudActive) replaceAllCloud(uid, payload).catch(cloudFail("Couldn't restore the backup — try again"));
        else dispatch({ type: 'HYDRATE', payload });
        showToast('Backup restored');
        return true;
      },
    };
  }, [state, sheet, toastMsg, showToast, openSheet, closeSheet, cloudActive, uid, settingsReady]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
