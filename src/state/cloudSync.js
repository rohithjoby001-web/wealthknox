// All the Firestore plumbing for a signed-in user's data, kept in one
// place so AppContext.jsx only has to call plain functions and never
// touches a Firestore API directly. Every person's data lives under
// users/{uid}/... — see firestore.rules for the access rule that keeps
// one person's documents invisible to everyone else.
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc,
  getDoc, getDocs, writeBatch, increment, arrayUnion,
} from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { buildSampleData } from '../data/sampleData.js';

const ENTITY_COLLECTIONS = ['sources', 'incomes', 'expenses', 'goals'];
const BATCH_LIMIT = 450; // Firestore caps a batch at 500 writes — stay well clear of it.

const userDocRef = (uid) => doc(db, 'users', uid);
const entityCollectionRef = (uid, entity) => collection(db, 'users', uid, entity);
const entityDocRef = (uid, entity, id) => doc(db, 'users', uid, entity, id);

async function commitInChunks(buildOps) {
  const batches = [];
  let batch = writeBatch(db);
  let n = 0;
  const op = (fn) => {
    fn(batch);
    n += 1;
    if (n === BATCH_LIMIT) { batches.push(batch); batch = writeBatch(db); n = 0; }
  };
  buildOps(op);
  if (n > 0) batches.push(batch);
  await Promise.all(batches.map((b) => b.commit()));
}

// One listener per entity collection, plus the user's settings doc.
// Fires on every local-cache write too (this device's own, instantly,
// even offline) as well as on anything that synced in from elsewhere —
// that's what makes the UI feel instant while still staying in sync.
export function subscribeToUserData(uid, onChange) {
  const unsubs = ENTITY_COLLECTIONS.map((entity) =>
    onSnapshot(entityCollectionRef(uid, entity), (snap) => {
      onChange(entity, snap.docs.map((d) => d.data()));
    })
  );
  unsubs.push(
    onSnapshot(userDocRef(uid), (snap) => {
      onChange('settings', snap.exists() ? snap.data() : null);
    })
  );
  return () => unsubs.forEach((u) => u());
}

// First-ever sign-in for this account: there's no user doc yet, so seed
// the same friendly sample data a fresh local install starts with,
// instead of handing someone a completely blank app.
export async function ensureSeeded(uid) {
  const snap = await getDoc(userDocRef(uid));
  if (snap.exists()) return false;
  const sample = buildSampleData();
  await commitInChunks((op) => {
    op((b) => b.set(userDocRef(uid), { currency: '$', chartRange: 6, createdAt: new Date().toISOString() }));
    ENTITY_COLLECTIONS.forEach((entity) => {
      sample[entity].forEach((item) => op((b) => b.set(entityDocRef(uid, entity, item.id), item)));
    });
  });
  return true;
}

export const putDoc = (uid, entity, item) => setDoc(entityDocRef(uid, entity, item.id), item);
export const patchDoc = (uid, entity, id, patch) => updateDoc(entityDocRef(uid, entity, id), patch);
export const removeDoc = (uid, entity, id) => deleteDoc(entityDocRef(uid, entity, id));
export const putSettings = (uid, patch) => setDoc(userDocRef(uid), patch, { merge: true });

// Goal allocate/withdraw both move the same lever in opposite directions:
// an atomic increment on `allocated` (positive to add, negative to take
// back out) plus one more line in the history array. increment() is
// Firestore's own atomic counter op, so two devices adjusting the same
// goal at once still land on the correct total instead of one clobbering
// the other.
export const adjustGoalAllocated = (uid, goalId, delta, historyEntry) =>
  updateDoc(entityDocRef(uid, 'goals', goalId), { allocated: increment(delta), history: arrayUnion(historyEntry) });

export async function resetAllCloud(uid) {
  for (const entity of ENTITY_COLLECTIONS) {
    const snap = await getDocs(entityCollectionRef(uid, entity));
    await commitInChunks((op) => snap.docs.forEach((d) => op((b) => b.delete(d.ref))));
  }
  // Starting balance is a money figure tied to this data, not a display
  // preference like currency — a "reset everything" that left an old
  // balance behind would show money that no longer traces back to anything.
  await setDoc(userDocRef(uid), { startingBalance: 0 }, { merge: true });
}

// Backs the Import-backup flow in Settings: wipe every entity collection
// for this account, then write the restored file's data in its place.
export async function replaceAllCloud(uid, payload) {
  await resetAllCloud(uid);
  await commitInChunks((op) => {
    ENTITY_COLLECTIONS.forEach((entity) => {
      (payload[entity] || []).forEach((item) => op((b) => b.set(entityDocRef(uid, entity, item.id), item)));
    });
    op((b) => b.set(userDocRef(uid), { currency: payload.settings?.currency || '$', startingBalance: payload.settings?.startingBalance || 0, chartRange: payload.chartRange || 6 }));
  });
}
