// ================================================================
// DATA STATE & FIREBASE HELPERS
// ================================================================
let db = null;
let fbConfigured = false;

const state = {
  colonies: [],
  residents: [],
  problems: [],
  notifications: []
};

function getColonies()      { return state.colonies; }
function getResidents()     { return state.residents; }
function getProblems()      { return state.problems; }
function getNotifications() { return state.notifications; }

async function saveColonies(d) {
  state.colonies = d;
  if (!db) return;
  for (const c of d) {
    if (!c.id) continue;
    await db.collection('colonies').doc(c.id).set(c);
  }
}
async function saveResidents(d) {
  state.residents = d;
  if (!db) return;
  for (const r of d) {
    const rId = `${r.colonyId}_${r.houseNo}`;
    await db.collection('residents').doc(rId).set(r);
  }
}
async function saveProblems(d) {
  state.problems = d;
  if (!db) return;
  for (const p of d) {
    if (!p.id) continue;
    await db.collection('problems').doc(p.id).set(p);
  }
}
async function saveNotifications(d) {
  state.notifications = d;
  if (!db) return;
  for (const n of d) {
    if (!n.id) continue;
    await db.collection('notifications').doc(n.id).set(n);
  }
}

function findColony(id) {
  return state.colonies.find(c => c.id.toUpperCase() === id.toUpperCase());
}

function generateId(prefix) {
  return prefix + '-' + Math.random().toString(36).substr(2,6).toUpperCase();
}

function generateColonyCode() {
  return 'COL-' + Math.floor(1000 + Math.random() * 9000);
}

// ================================================================
// FIREBASE SETUP
// ================================================================
function checkFirebase() {
  // Bypassed automatic setup modal for smooth UX during testing.
  // Running in Local Mode initially. 
  
  if (state.colonies.length === 0) {
    state.colonies.push(DEMO_COLONY);
    DEMO_RESIDENTS.forEach(dr => state.residents.push(dr));
    makeDemoProblems().forEach(dp => state.problems.push(dp));
  }
  
  // To enable real backend later, uncomment initFirebase with your real config:
  /*
  const firebaseConfig = { ... };
  initFirebase(firebaseConfig);
  */
}

function initFirebase(config) {
  if (firebase.apps.length === 0) {
    firebase.initializeApp(config);
  }
  db = firebase.firestore();
  fbConfigured = true;
  
  // Setup realtime listeners
  db.collection('colonies').onSnapshot(snap => {
    const docs = [];
    snap.forEach(d => docs.push(d.data()));
    state.colonies = docs;
  });
  
  db.collection('residents').onSnapshot(snap => {
    const docs = [];
    snap.forEach(d => docs.push(d.data()));
    state.residents = docs;
  });
  
  db.collection('problems').onSnapshot(snap => {
    const docs = [];
    snap.forEach(d => docs.push(d.data()));
    state.problems = docs;
    
    // Auto-refresh UI when new problem arrives or status changes
    if (currentUser) {
      if (currentUser.role === 'manager') refreshDashboard();
      if (currentUser.role === 'resident' && document.getElementById('tab-history').classList.contains('active')) {
        renderMyComplaints();
      }
    }
  });

  db.collection('notifications').onSnapshot(snap => {
    const docs = [];
    snap.forEach(d => docs.push(d.data()));
    state.notifications = docs;
    if (currentUser && currentUser.role === 'resident') {
      updateNotifBadge();
      if (!document.getElementById('notif-panel').classList.contains('hidden')) {
        renderNotifications();
      }
    }
  });
}
