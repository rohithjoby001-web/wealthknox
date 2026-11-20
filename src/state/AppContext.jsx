import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { buildSampleData } from '../data/sampleData.js';
import { toISO, parseISO, addMonths, isCurrentMonth } from '../utils/date.js';
import { formatMoney } from '../utils/format.js';
import { availableBalance } from '../utils/calc.js';
import { useAuth } from '../auth/AuthContext.jsx';
import {
  subscribeToUserData, ensureSeeded, putDoc, patchDoc, removeDoc,
  putSettings, adjustGoalAllocated, resetAllCloud, replaceAllCloud,
} from './cloudSync.js';

const STORAGE_KEY = 'wealthknox:state:v1';
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
    settings: { currency: '$', startingBalance: 0 },
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
    goals: state.goals,
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
    settings: Object.assign({ currency: '$', startingBalance: 0 }, saved.settings || {}),
    sources: Array.isArray(saved.sources) ? saved.sources : [],
    incomes: Array.isArray(saved.incomes) ? saved.incomes : [],
    expenses: Array.isArray(saved.expenses) ? saved.expenses : [],
    goals: Array.isArray(saved.goals) ? saved.goals : [],
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
      return { ...state, goals: [...state.goals, action.goal] };
    case 'UPDATE_GOAL':
      return { ...state, goals: state.goals.map((g) => (g.id === action.id ? { ...g, ...action.patch } : g)) };
    case 'DELETE_GOAL':
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };
    case 'ALLOCATE_GOAL':
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.goalId
            ? { ...g, allocated: g.allocated + action.amount, history: [action.entry, ...(g.history || [])] }
            : g
        ),
      };
    case 'WITHDRAW_GOAL':
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.goalId
            ? { ...g, allocated: Math.max(0, g.allocated - action.amount), history: [action.entry, ...(g.history || [])] }
            : g
        ),
      };

    case 'ADD_SOURCE':
      return { ...state, sources: [...state.sources, action.source] };
    case 'UPDATE_SOURCE':
      return { ...state, sources: state.sources.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)) };
    case 'DELETE_SOURCE':
      return { ...state, sources: state.sources.filter((s) => s.id !== action.id) };

    case 'RESET_ALL':
      return { ...state, sources: [], incomes: [], expenses: [], goals: [] };

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

  // Local-only mode: load any saved data once, on first mount. If
  // nothing is saved yet (brand-new install), the bundled sample data
  // stays as-is. Skipped entirely in cloud mode — Firestore (below) is
  // this account's data, not whatever happens to be in this browser.
  useEffect(() => {
    if (cloudActive) { hydrated.current = true; return; }
    const saved = loadPersisted();
    if (saved) dispatch({ type: 'HYDRATE', payload: saved });
    hydrated.current = true;
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
          if (data) dispatch({ type: 'HYDRATE', payload: { settings: { currency: data.currency || '$', startingBalance: data.startingBalance || 0 }, chartRange: data.chartRange ?? 6 } });
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

      // Income is meant to represent real money (your actual balance or
      // deposits), so an expense can never be recorded past what's
      // actually available — unlike a plain ledger that just lets the
      // total go negative, this treats "available" as a hard ceiling,
      // the same way allocateToGoal already does for targets. Rejects
      // outright (toast + no-op) rather than silently clamping the
      // amount down, since silently changing what someone said they
      // spent would misrepresent the real transaction.
      addExpense: ({ amount, categoryId, note, date }) => {
        const avail = availableBalance(state.incomes, state.expenses, state.goals, state.settings.startingBalance);
        if (amount > avail) { showToast(`Only ${formatMoney(avail, state.settings.currency)} available`); return false; }
        const expense = { id: 'e' + Date.now(), amount, categoryId, note, date, createdAt: new Date().toISOString() };
        if (cloudActive) putDoc(uid, 'expenses', expense).catch(cloudFail("Couldn't save — try again"));
        else dispatch({ type: 'ADD_EXPENSE', expense });
        showToast('Expense added');
        return true;
      },
      updateExpense: (id, { amount, categoryId, note, date }) => {
        // The entry being edited is already subtracted once in the
        // current available balance, so add its old amount back before
        // checking the new one against the cap.
        const prev = state.expenses.find((x) => x.id === id);
        const avail = availableBalance(state.incomes, state.expenses, state.goals, state.settings.startingBalance) + (prev?.amount || 0);
        if (amount > avail) { showToast(`Only ${formatMoney(avail, state.settings.currency)} available`); return false; }
        const patch = { amount, categoryId, note, date };
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

      addGoal: ({ name, target, icon, deadline }) => {
        const goal = { id: 'g' + Date.now(), name, target, allocated: 0, icon, deadline, createdAt: new Date().toISOString(), history: [] };
        if (cloudActive) putDoc(uid, 'goals', goal).catch(cloudFail("Couldn't save — try again"));
        else dispatch({ type: 'ADD_GOAL', goal });
        showToast('Target created');
      },
      updateGoal: (id, { name, target, icon, deadline }) => {
        const g = state.goals.find((x) => x.id === id);
        if (!g) return;
        const nt = Math.max(target, g.allocated);
        const clamped = target < g.allocated;
        const patch = { name, target: nt, icon, deadline };
        if (cloudActive) patchDoc(uid, 'goals', id, patch).catch(cloudFail("Couldn't save the change"));
        else dispatch({ type: 'UPDATE_GOAL', id, patch });
        showToast(clamped ? `Target can't go below ${formatMoney(nt, cur())} already saved` : 'Target updated');
      },
      deleteGoal: (id) => {
        if (cloudActive) removeDoc(uid, 'goals', id).catch(cloudFail("Couldn't delete — try again"));
        else dispatch({ type: 'DELETE_GOAL', id });
        showToast('Target deleted');
      },
      // Mirrors the original's inline 'save-allocate' handler: clamp the
      // entered amount to what's actually available and what's left on
      // the target, bail out with a toast if there's nothing to give,
      // otherwise commit and report success so the sheet can close.
      allocateToGoal: (goalId, rawAmount) => {
        const g = state.goals.find((x) => x.id === goalId);
        if (!g) return false;
        const avail = availableBalance(state.incomes, state.expenses, state.goals, state.settings.startingBalance);
        const remaining = Math.max(0, g.target - g.allocated);
        const cap = Math.max(0, Math.min(avail, remaining));
        const n = Math.max(0, Math.min(rawAmount || 0, cap, remaining));
        if (n <= 0) { showToast('Nothing to allocate'); return false; }
        const entry = { id: 'a' + Date.now(), goalId, date: toISO(new Date()), amount: n, createdAt: new Date().toISOString() };
        if (cloudActive) adjustGoalAllocated(uid, goalId, n, entry).catch(cloudFail("Couldn't save — try again"));
        else dispatch({ type: 'ALLOCATE_GOAL', goalId, amount: n, entry });
        showToast(`${formatMoney(n, cur())} allocated to ${g.name}`);
        return true;
      },
      allocationCap: (goalId) => {
        const g = state.goals.find((x) => x.id === goalId);
        if (!g) return { avail: 0, remaining: 0, cap: 0 };
        const avail = availableBalance(state.incomes, state.expenses, state.goals, state.settings.startingBalance);
        const remaining = Math.max(0, g.target - g.allocated);
        return { avail, remaining, cap: Math.max(0, Math.min(avail, remaining)) };
      },
      // Lets a saver pull money back out of a target without deleting the
      // whole thing — plans change, and until now the only way to free up
      // allocated money was to delete the target and lose its name/history.
      withdrawFromGoal: (goalId, rawAmount) => {
        const g = state.goals.find((x) => x.id === goalId);
        if (!g) return false;
        const n = Math.max(0, Math.min(rawAmount || 0, g.allocated));
        if (n <= 0) { showToast('Nothing to withdraw'); return false; }
        const entry = { id: 'w' + Date.now(), goalId, date: toISO(new Date()), amount: -n, createdAt: new Date().toISOString() };
        if (cloudActive) adjustGoalAllocated(uid, goalId, -n, entry).catch(cloudFail("Couldn't save — try again"));
        else dispatch({ type: 'WITHDRAW_GOAL', goalId, amount: n, entry });
        showToast(`${formatMoney(n, cur())} moved back to available balance`);
        return true;
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
  }, [state, sheet, toastMsg, showToast, openSheet, closeSheet, cloudActive, uid]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
