/* ================================================================
   ColonyConnect — app.js
   Voice AI + NLP Categorizer + Data Layer + Router
   ================================================================ */

'use strict';

// ================================================================
// STATE
// ================================================================
let currentUser = null;       // { role: 'resident'|'manager', colonyId, houseNo, name }
let currentLang = 'en-IN';
let recognition = null;
let isRecording = false;
let transcript = '';
let categoryChart = null;
let currentDetailId = null;

// ================================================================
// CONSTANTS — AI CATEGORIZER
// ================================================================
const CATEGORIES = {
  Plumbing: {
    emoji: '🔧',
    color: '#3B82F6',
    keywords: ['water','pipe','leak','tap','drain','overflow','bathroom','toilet','flush','plumber',
                'sewage','blockage','gutter','sink','बाढ़','पानी','नल','पाइप','लीक','टंकी','drain'],
  },
  Electrical: {
    emoji: '⚡',
    color: '#F59E0B',
    keywords: ['electricity','electric','light','power','wire','switch','fan','socket','spark','short',
                'bulb','fuse','meter','mcb','voltage','trip','बिजली','लाइट','पावर','पंखा','तार','करंट'],
  },
  Cleaning: {
    emoji: '🗑️',
    color: '#10B981',
    keywords: ['garbage','trash','dirty','smell','waste','sweep','clean','dust','litter','bins','sanitation',
                'mosquito','drain dirty','कचरा','गंदगी','साफ','बदबू','सफाई','झाड़ू','मच्छर'],
  },
  Security: {
    emoji: '🔐',
    color: '#EF4444',
    keywords: ['gate','lock','guard','theft','steal','stolen','stranger','cctv','camera','safe','theft',
                'robbery','break in','suspicious','security','सुरक्षा','चोरी','चौकीदार','गेट','ताला','संदिग्ध'],
  },
  Gardening: {
    emoji: '🌿',
    color: '#84CC16',
    keywords: ['garden','grass','tree','plant','leaves','trim','branch','bush','lawn','weed',
                'landscape','water plant','बगीचा','घास','पेड़','पौधा','पत्ते','माली'],
  },
  Road: {
    emoji: '🛣️',
    color: '#94A3B8',
    keywords: ['road','pothole','path','broken','crack','pavement','footpath','speed breaker','slope',
                'stone','gravel','parking','सड़क','गड्ढा','रास्ता','टूटी','फुटपाथ','पार्किंग'],
  },
  'Street Light': {
    emoji: '💡',
    color: '#FCD34D',
    keywords: ['street light','lamp','dark','pole','glow','dim','bulb broken','light off','lamp post',
                'night dark','street dark','streetlight','स्ट्रीट लाइट','अंधेरा','लैंप','पोल','रात'],
  },
  Others: {
    emoji: '📦',
    color: '#8B5CF6',
    keywords: [],
  },
};

const URGENCY_HIGH_WORDS = [
  'urgent','emergency','immediately','danger','fire','flood','flooding','bleeding','accident',
  'burst','short circuit','dangerous','critical','collapse','जरूरी','आपातकाल','तुरंत','खतरा',
  'आग','बाढ़','दुर्घटना','जल्दी','अभी'
];

const URGENCY_LOW_WORDS = [
  'minor','small','little','whenever','no rush','slow','eventually','later','थोड़ा','छोटा','जब समय हो'
];

// ================================================================
// DEMO DATA
// ================================================================
const DEMO_COLONY = {
  id: 'COL-DEMO',
  name: 'Green Valley Apartments',
  area: 'Sector 12, Noida',
  pin: '201301',
  adminName: 'Rajiv Sharma',
  adminPassword: 'demo1234',
  createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
};

const DEMO_RESIDENTS = [
  { houseNo: 'A-101', colonyId: 'COL-DEMO', name: 'Ramesh Kumar' },
  { houseNo: 'B-205', colonyId: 'COL-DEMO', name: 'Priya Singh' },
  { houseNo: 'C-302', colonyId: 'COL-DEMO', name: 'Anil Mehta' },
  { houseNo: 'D-110', colonyId: 'COL-DEMO', name: 'Sunita Verma' },
];

function makeDemoProblems() {
  const now = Date.now();
  return [
    {
      id: 'P-D001', colonyId: 'COL-DEMO', houseNo: 'A-101', residentName: 'Ramesh Kumar',
      category: 'Plumbing', tags:['leak','kitchen','pipe'],
      description: 'Water pipe is leaking very badly in the kitchen. Floor is wet and water is wasting.',
      urgency: 'High', status: 'Pending', assignedTo: null,
      createdAt: new Date(now - 2 * 3600000).toISOString(), updatedAt: new Date(now - 2 * 3600000).toISOString(), resolvedAt: null,
    },
    {
      id: 'P-D002', colonyId: 'COL-DEMO', houseNo: 'B-205', residentName: 'Priya Singh',
      category: 'Electrical', tags:['light','socket','spark'],
      description: 'The electric socket in living room is causing sparks. Very dangerous, need immediate help.',
      urgency: 'High', status: 'In Progress', assignedTo: 'Electrician Team',
      createdAt: new Date(now - 5 * 3600000).toISOString(), updatedAt: new Date(now - 1 * 3600000).toISOString(), resolvedAt: null,
    },
    {
      id: 'P-D003', colonyId: 'COL-DEMO', houseNo: 'C-302', residentName: 'Anil Mehta',
      category: 'Cleaning', tags:['garbage','smell','bins'],
      description: 'Garbage bins near block C are overflowing since two days. Very bad smell.',
      urgency: 'Medium', status: 'Pending', assignedTo: null,
      createdAt: new Date(now - 8 * 3600000).toISOString(), updatedAt: new Date(now - 8 * 3600000).toISOString(), resolvedAt: null,
    },
    {
      id: 'P-D004', colonyId: 'COL-DEMO', houseNo: 'D-110', residentName: 'Sunita Verma',
      category: 'Security', tags:['gate','guard','lock'],
      description: 'Main entrance gate lock is broken. Anyone can enter colony at night.',
      urgency: 'High', status: 'Pending', assignedTo: null,
      createdAt: new Date(now - 10 * 3600000).toISOString(), updatedAt: new Date(now - 10 * 3600000).toISOString(), resolvedAt: null,
    },
    {
      id: 'P-D005', colonyId: 'COL-DEMO', houseNo: 'A-101', residentName: 'Ramesh Kumar',
      category: 'Street Light', tags:['dark','lamp','pole'],
      description: 'Street light near block A is not working. The road is completely dark at night.',
      urgency: 'Medium', status: 'Resolved', assignedTo: 'Maintenance Team',
      createdAt: new Date(now - 24 * 3600000).toISOString(), updatedAt: new Date(now - 6 * 3600000).toISOString(),
      resolvedAt: new Date(now - 6 * 3600000).toISOString(),
    },
    {
      id: 'P-D006', colonyId: 'COL-DEMO', houseNo: 'B-205', residentName: 'Priya Singh',
      category: 'Road', tags:['pothole','road','broken'],
      description: 'Big pothole in the road near block B parking area. Cars getting damaged.',
      urgency: 'Medium', status: 'Pending', assignedTo: null,
      createdAt: new Date(now - 3 * 86400000).toISOString(), updatedAt: new Date(now - 3 * 86400000).toISOString(), resolvedAt: null,
    },
    {
      id: 'P-D007', colonyId: 'COL-DEMO', houseNo: 'C-302', residentName: 'Anil Mehta',
      category: 'Gardening', tags:['tree','branch','trim'],
      description: 'A large tree branch is hanging dangerously over walkway near block C.',
      urgency: 'High', status: 'In Progress', assignedTo: 'Garden Team',
      createdAt: new Date(now - 4 * 86400000).toISOString(), updatedAt: new Date(now - 2 * 86400000).toISOString(), resolvedAt: null,
    },
    {
      id: 'P-D008', colonyId: 'COL-DEMO', houseNo: 'D-110', residentName: 'Sunita Verma',
      category: 'Others', tags:['noise','complaint'],
      description: 'Loud music and noise from parking area after midnight. Very disturbing.',
      urgency: 'Low', status: 'Resolved', assignedTo: 'Security',
      createdAt: new Date(now - 5 * 86400000).toISOString(), updatedAt: new Date(now - 3 * 86400000).toISOString(),
      resolvedAt: new Date(now - 3 * 86400000).toISOString(),
    },
    {
      id: 'P-D009', colonyId: 'COL-DEMO', houseNo: 'A-101', residentName: 'Ramesh Kumar',
      category: 'Plumbing', tags:['drain','blocked'],
      description: 'Drainage near building A-1 entrance is completely blocked and causing waterlogging.',
      urgency: 'Medium', status: 'Pending', assignedTo: null,
      createdAt: new Date(now - 6 * 86400000).toISOString(), updatedAt: new Date(now - 6 * 86400000).toISOString(), resolvedAt: null,
    },
    {
      id: 'P-D010', colonyId: 'COL-DEMO', houseNo: 'B-205', residentName: 'Priya Singh',
      category: 'Electrical', tags:['fan','switch','not working'],
      description: 'Common area fan in lobby is not working since 3 days. Very hot inside.',
      urgency: 'Low', status: 'Resolved', assignedTo: 'Electrician Team',
      createdAt: new Date(now - 7 * 86400000).toISOString(), updatedAt: new Date(now - 5 * 86400000).toISOString(),
      resolvedAt: new Date(now - 5 * 86400000).toISOString(),
    },
  ];
}

// Removed: Data State and Firebase helpers extracted to backend.js

// ================================================================
// TOAST
// ================================================================
let toastTimer = null;
function showToast(msg, duration = 3000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

// ================================================================
// SCREEN ROUTER
// ================================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
    target.scrollTop = 0;
    window.scrollTo(0, 0);
  }
}

// ================================================================
// COLONY REGISTRATION
// ================================================================
function registerColony(e) {
  e.preventDefault();
  const name     = document.getElementById('colony-name').value.trim();
  const area     = document.getElementById('colony-area').value.trim();
  const pin      = document.getElementById('colony-pin').value.trim();
  const adminName = document.getElementById('colony-admin-name').value.trim();
  const password = document.getElementById('colony-admin-password').value;

  if (!/^\d{6}$/.test(pin)) {
    showToast('❌ PIN code must be exactly 6 digits');
    return;
  }

  const id = generateColonyCode();
  const colony = { id, name, area, pin, adminName, adminPassword: password, createdAt: new Date().toISOString() };
  const colonies = getColonies();
  colonies.push(colony);
  saveColonies(colonies);

  document.getElementById('success-colony-name').textContent = name;
  document.getElementById('success-colony-code').textContent = id;
  document.getElementById('success-colony-area').textContent = area;

  showScreen('screen-colony-success');
  showToast('✅ Colony registered successfully!');
}

function copyColonyCode() {
  const code = document.getElementById('success-colony-code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    showToast('📋 Colony code copied!');
  }).catch(() => {
    showToast('Colony code: ' + code);
  });
}

// ================================================================
// RESIDENT LOGIN
// ================================================================
function residentLogin(e) {
  e.preventDefault();
  const colonyCode = document.getElementById('resident-colony-code').value.trim().toUpperCase();
  const houseNo    = document.getElementById('resident-house').value.trim();
  const name       = document.getElementById('resident-name').value.trim();

  const colony = findColony(colonyCode);
  if (!colony) {
    showToast('❌ Colony code not found. Please check and try again.');
    return;
  }

  // Register resident if new
  const residents = getResidents();
  let resident = residents.find(r => r.houseNo.toUpperCase() === houseNo.toUpperCase() && r.colonyId === colony.id);
  if (!resident) {
    resident = { houseNo, colonyId: colony.id, name, registeredAt: new Date().toISOString() };
    residents.push(resident);
    saveResidents(residents);
  }

  currentUser = { role: 'resident', colonyId: colony.id, colonyName: colony.name, houseNo, name };
  enterResidentPortal();
}

function enterResidentPortal() {
  const { name, colonyName, houseNo } = currentUser;
  document.getElementById('portal-resident-name').textContent = name;
  document.getElementById('resident-avatar').textContent = name.charAt(0).toUpperCase();
  document.getElementById('resident-colony-display').textContent = colonyName;
  document.getElementById('resident-house-display').textContent = houseNo;
  switchPortalTab('report');
  showScreen('screen-resident-portal');
  updateNotifBadge();
  showToast('👋 Welcome, ' + name + '!');
}

// ================================================================
// MANAGER LOGIN
// ================================================================
function managerLogin(e) {
  e.preventDefault();
  const colonyCode = document.getElementById('manager-colony-code').value.trim().toUpperCase();
  const password   = document.getElementById('manager-password').value;

  const colony = findColony(colonyCode);
  if (!colony) {
    showToast('❌ Colony code not found.');
    return;
  }
  if (colony.adminPassword !== password) {
    showToast('❌ Incorrect password.');
    return;
  }

  currentUser = { role: 'manager', colonyId: colony.id, colonyName: colony.name };
  enterManagerDashboard();
}

function enterManagerDashboard() {
  document.getElementById('dashboard-colony-name').textContent = currentUser.colonyName;
  document.getElementById('dashboard-colony-code').textContent = currentUser.colonyId;
  showScreen('screen-manager-dashboard');
  refreshDashboard();
  showToast('🛡️ Welcome, Manager!');
}

// ================================================================
// LOGOUT
// ================================================================
function logout() {
  currentUser = null;
  transcript = '';
  stopRecording();
  if (categoryChart) { categoryChart.destroy(); categoryChart = null; }
  showScreen('screen-landing');
  showToast('👋 Logged out.');
}

// ================================================================
// DEMO MODE
// ================================================================
function loadDemoAndEnter() {
  // Inject demo data if not present
  const colonies = getColonies();
  if (!colonies.find(c => c.id === 'COL-DEMO')) {
    colonies.push(DEMO_COLONY);
    saveColonies(colonies);
  }

  const residents = getResidents();
  DEMO_RESIDENTS.forEach(dr => {
    if (!residents.find(r => r.houseNo === dr.houseNo && r.colonyId === dr.colonyId)) {
      residents.push(dr);
    }
  });
  saveResidents(residents);

  const problems = getProblems();
  const demoProblems = makeDemoProblems();
  demoProblems.forEach(dp => {
    if (!problems.find(p => p.id === dp.id)) problems.push(dp);
  });
  saveProblems(problems);

  currentUser = { role: 'manager', colonyId: 'COL-DEMO', colonyName: 'Green Valley Apartments' };
  enterManagerDashboard();
  showToast('🎭 Demo mode loaded! 10 sample complaints ready.');
}

// ================================================================
// PORTAL TABS
// ================================================================
function switchPortalTab(tab) {
  document.querySelectorAll('.portal-tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('tab-' + tab).setAttribute('aria-selected', 'true');
  document.getElementById('tab-content-' + tab).classList.add('active');

  if (tab === 'history') renderMyComplaints();
}

// ================================================================
// LANGUAGE
// ================================================================
function setLang(lang) {
  currentLang = lang;
  document.getElementById('lang-en').classList.toggle('active', lang === 'en-IN');
  document.getElementById('lang-hi').classList.toggle('active', lang === 'hi-IN');
}

// ================================================================
// AI CATEGORIZER
// ================================================================
function categorize(text) {
  const lower = text.toLowerCase();
  let bestCat = 'Others';
  let bestScore = 0;

  for (const [cat, data] of Object.entries(CATEGORIES)) {
    if (cat === 'Others') continue;
    let score = 0;
    data.keywords.forEach(kw => {
      if (lower.includes(kw)) score += kw.length > 6 ? 3 : 2;
    });
    if (score > bestScore) { bestScore = score; bestCat = cat; }
  }

  // Urgency
  let urgency = 'Medium';
  const hasHigh = URGENCY_HIGH_WORDS.some(w => lower.includes(w));
  const hasLow  = URGENCY_LOW_WORDS.some(w => lower.includes(w));
  if (hasHigh) urgency = 'High';
  else if (hasLow) urgency = 'Low';

  // Tags: extract notable nouns
  const tagKeywords = CATEGORIES[bestCat]?.keywords || [];
  const tags = [];
  tagKeywords.forEach(k => {
    if (lower.includes(k) && tags.length < 4 && !tags.includes(k)) tags.push(k);
  });
  if (urgency === 'High' && !tags.includes('urgent')) tags.push('urgent');

  return {
    category: bestCat,
    urgency,
    tags,
    confidence: bestScore > 4 ? 'High' : bestScore > 1 ? 'Medium' : 'Low',
  };
}

// ================================================================
// VOICE RECORDING
// ================================================================
function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    showToast('⚠️ Voice not supported. Please use Chrome or Edge.');
    openManualEntry();
    return;
  }

  if (window.location.protocol === 'file:') {
    showToast("⚠️ Voice doesn't work on local files (security). Please deploy to Vercel or run a local server.", 6000);
    setTimeout(openManualEntry, 1000);
    return;
  }

  recognition = new SpeechRec();
  recognition.lang = currentLang;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let finalTranscript = transcript;

  recognition.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        finalTranscript += t + ' ';
      } else {
        interim = t;
      }
    }
    transcript = finalTranscript;
    showTranscript(finalTranscript + interim);
  };

  recognition.onerror = (e) => {
    if (e.error === 'not-allowed') {
      showToast('🎤 Microphone access denied. Please allow mic in browser settings.');
    } else if (e.error !== 'aborted') {
      showToast('⚠️ Voice error: ' + e.error);
    }
    stopRecording();
  };

  recognition.onend = () => {
    if (isRecording) recognition.start(); // keep alive
  };

  recognition.start();
  isRecording = true;
  document.getElementById('mic-btn').classList.add('recording');
  document.getElementById('mic-label').textContent = 'Tap to stop recording';
  document.getElementById('mic-sublabel').textContent = 'बोलना बंद करने के लिए टैप करें';
}

function stopRecording() {
  if (recognition) {
    recognition.onend = null;
    recognition.stop();
    recognition = null;
  }
  isRecording = false;
  document.getElementById('mic-btn').classList.remove('recording');
  document.getElementById('mic-label').textContent = 'Tap to speak your complaint';
  document.getElementById('mic-sublabel').textContent = 'या हिंदी में बोलें';

  if (transcript.trim().length > 3) {
    analyzeAndShowResult(transcript.trim());
  }
}

function showTranscript(text) {
  const box = document.getElementById('transcript-box');
  const el  = document.getElementById('transcript-text');
  box.classList.remove('hidden');
  el.textContent = text;
}

function clearTranscript() {
  transcript = '';
  document.getElementById('transcript-text').textContent = '';
  document.getElementById('transcript-box').classList.add('hidden');
  document.getElementById('ai-result').classList.add('hidden');
}

// ================================================================
// SHOW AI RESULT
// ================================================================
function analyzeAndShowResult(text) {
  const result = categorize(text);

  // Set category select
  document.getElementById('category-select').value = result.category;

  // Urgency
  const urgEl = document.getElementById('urgency-badge');
  urgEl.textContent = result.urgency;
  urgEl.className = 'urgency-badge urgency-' + result.urgency.toLowerCase();

  // Tags
  const tagsEl = document.getElementById('ai-tags');
  tagsEl.innerHTML = result.tags.map(t => `<span class="tag">#${t}</span>`).join('') || '<span class="tag">#general</span>';

  // Confidence
  document.getElementById('ai-confidence').textContent = result.confidence + ' Confidence';

  // Pre-fill description
  document.getElementById('complaint-description').value = text;

  document.getElementById('ai-result').classList.remove('hidden');
}

function onCategoryChange() {
  // Allow manual override without re-triggering
}

// ================================================================
// SUBMIT COMPLAINT
// ================================================================
function submitComplaint() {
  const category    = document.getElementById('category-select').value;
  const urgencyEl   = document.getElementById('urgency-badge');
  const urgency     = urgencyEl.textContent.trim();
  const description = document.getElementById('complaint-description').value.trim();

  if (!description) { showToast('⚠️ Please describe the issue.'); return; }
  if (!currentUser) return;

  const tags = Array.from(document.querySelectorAll('#ai-tags .tag')).map(t => t.textContent.replace('#',''));

  const problem = {
    id: generateId('P'),
    colonyId: currentUser.colonyId,
    houseNo: currentUser.houseNo,
    residentName: currentUser.name,
    category, urgency, description, tags,
    status: 'Pending',
    assignedTo: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resolvedAt: null,
  };

  const problems = getProblems();
  problems.push(problem);
  saveProblems(problems);

  // Notification to self (mock)
  addNotification(currentUser.houseNo, problem.id, `✅ Your ${category} complaint has been submitted. We'll update you soon.`);

  // Reset UI
  transcript = '';
  document.getElementById('transcript-box').classList.add('hidden');
  document.getElementById('ai-result').classList.add('hidden');
  document.getElementById('complaint-description').value = '';

  showToast('🚀 Complaint submitted! Category: ' + CATEGORIES[category].emoji + ' ' + category);
  switchPortalTab('history');
}

// ================================================================
// MANUAL ENTRY
// ================================================================
function openManualEntry() {
  document.getElementById('manual-modal').classList.remove('hidden');
}

function closeManualEntry() {
  document.getElementById('manual-modal').classList.add('hidden');
}

function submitManualComplaint() {
  const category    = document.getElementById('manual-category').value;
  const urgency     = document.getElementById('manual-urgency').value;
  const description = document.getElementById('manual-description').value.trim();

  if (!description) { showToast('⚠️ Please describe the issue.'); return; }
  if (!currentUser) return;

  const problem = {
    id: generateId('P'),
    colonyId: currentUser.colonyId,
    houseNo: currentUser.houseNo,
    residentName: currentUser.name,
    category, urgency, description,
    tags: [],
    status: 'Pending',
    assignedTo: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resolvedAt: null,
  };

  const problems = getProblems();
  problems.push(problem);
  saveProblems(problems);

  addNotification(currentUser.houseNo, problem.id, `✅ Your ${category} complaint has been submitted.`);
  document.getElementById('manual-description').value = '';
  closeManualEntry();
  showToast('🚀 Complaint submitted!');
  switchPortalTab('history');
}

// ================================================================
// MY COMPLAINTS (RESIDENT)
// ================================================================
function renderMyComplaints() {
  if (!currentUser) return;
  const list = document.getElementById('my-complaints-list');
  const problems = getProblems().filter(p =>
    p.colonyId === currentUser.colonyId &&
    p.houseNo.toUpperCase() === currentUser.houseNo.toUpperCase()
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (!problems.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>No complaints yet.</p><p>Tap the Report tab to file one!</p></div>`;
    return;
  }

  list.innerHTML = problems.map(p => buildComplaintCard(p, false)).join('');
}

// ================================================================
// DASHBOARD
// ================================================================
function refreshDashboard() {
  if (!currentUser) return;
  const problems = getProblems().filter(p => p.colonyId === currentUser.colonyId);

  const total    = problems.length;
  const pending  = problems.filter(p => p.status === 'Pending').length;
  const progress = problems.filter(p => p.status === 'In Progress').length;
  const resolved = problems.filter(p => p.status === 'Resolved').length;

  document.getElementById('stat-total').textContent    = total;
  document.getElementById('stat-pending').textContent  = pending;
  document.getElementById('stat-progress').textContent = progress;
  document.getElementById('stat-resolved').textContent = resolved;

  renderCategoryChart(problems);
  applyFilters();
}

function renderCategoryChart(problems) {
  const counts = {};
  Object.keys(CATEGORIES).forEach(cat => counts[cat] = 0);
  problems.forEach(p => { if (counts[p.category] !== undefined) counts[p.category]++; });

  const labels = [], data = [], colors = [], borders = [];
  for (const [cat, cnt] of Object.entries(counts)) {
    if (cnt > 0) {
      labels.push(CATEGORIES[cat].emoji + ' ' + cat);
      data.push(cnt);
      colors.push(CATEGORIES[cat].color + '55');
      borders.push(CATEGORIES[cat].color);
    }
  }

  const ctx = document.getElementById('category-chart').getContext('2d');
  if (categoryChart) categoryChart.destroy();

  Chart.defaults.color = '#9CA3CF';
  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 2,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12,
            padding: 10,
            font: { size: 11, family: 'Inter' },
            color: '#9CA3CF'
          }
        },
        tooltip: {
          backgroundColor: '#1A1730',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: '#F0EEFF',
          bodyColor: '#9CA3CF',
          padding: 10,
        }
      }
    }
  });
}

// ================================================================
// FILTERS
// ================================================================
function applyFilters() {
  if (!currentUser) return;
  const statusF   = document.getElementById('filter-status').value;
  const categoryF = document.getElementById('filter-category').value;
  const urgencyF  = document.getElementById('filter-urgency').value;
  const searchF   = document.getElementById('filter-search').value.toLowerCase();

  let problems = getProblems().filter(p => p.colonyId === currentUser.colonyId);

  if (statusF)   problems = problems.filter(p => p.status === statusF);
  if (categoryF) problems = problems.filter(p => p.category === categoryF);
  if (urgencyF)  problems = problems.filter(p => p.urgency === urgencyF);
  if (searchF)   problems = problems.filter(p =>
    p.houseNo.toLowerCase().includes(searchF) ||
    p.description.toLowerCase().includes(searchF) ||
    p.residentName.toLowerCase().includes(searchF)
  );

  problems.sort((a, b) => {
    const urgOrder = {High:0, Medium:1, Low:2};
    if (urgOrder[a.urgency] !== urgOrder[b.urgency]) return urgOrder[a.urgency] - urgOrder[b.urgency];
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  document.getElementById('inbox-count').textContent = problems.length + ' complaint' + (problems.length !== 1 ? 's' : '');

  const list = document.getElementById('manager-complaints-list');
  if (!problems.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>No complaints match your filters.</p></div>`;
    return;
  }
  list.innerHTML = problems.map(p => buildComplaintCard(p, true)).join('');
}

function clearFilters() {
  document.getElementById('filter-status').value   = '';
  document.getElementById('filter-category').value = '';
  document.getElementById('filter-urgency').value  = '';
  document.getElementById('filter-search').value   = '';
  applyFilters();
}

// ================================================================
// COMPLAINT CARD BUILDER
// ================================================================
function buildComplaintCard(p, isManager) {
  const cat  = CATEGORIES[p.category] || CATEGORIES.Others;
  const time = formatTime(p.createdAt);
  const safeId = p.id.replace(/[^a-zA-Z0-9-_]/g, '');

  let managerActions = '';
  if (isManager) {
    if (p.status === 'Pending') {
      managerActions = `
        <div class="manager-actions">
          <button class="btn-action btn-action-progress" onclick="updateStatus('${p.id}','In Progress');event.stopPropagation()">🔄 In Progress</button>
          <button class="btn-action btn-action-resolve"  onclick="updateStatus('${p.id}','Resolved');event.stopPropagation()">✅ Resolve</button>
        </div>`;
    } else if (p.status === 'In Progress') {
      managerActions = `
        <div class="manager-actions">
          <button class="btn-action btn-action-resolve"  onclick="updateStatus('${p.id}','Resolved');event.stopPropagation()">✅ Resolve</button>
          <button class="btn-action btn-action-reopen"   onclick="updateStatus('${p.id}','Pending');event.stopPropagation()">↩️ Reopen</button>
        </div>`;
    } else {
      managerActions = `
        <div class="manager-actions">
          <button class="btn-action btn-action-reopen" onclick="updateStatus('${p.id}','Pending');event.stopPropagation()">↩️ Reopen</button>
        </div>`;
    }
  }

  const urgencyDot = p.urgency === 'High' ? '🔴' : p.urgency === 'Low' ? '🟢' : '🟡';

  return `
    <div class="complaint-card cat-${p.category.replace(' ','\\ ')}" id="card-${safeId}" onclick="openDetailModal('${p.id}')">
      <div class="complaint-card-header">
        <div class="complaint-card-left">
          <span class="category-emoji">${cat.emoji}</span>
          <div>
            <div class="complaint-house">${p.houseNo} · ${p.residentName}</div>
            <div class="complaint-category">${p.category} ${urgencyDot} ${p.urgency}</div>
          </div>
        </div>
        <span class="status-badge status-${p.status}">${p.status}</span>
      </div>
      <p class="complaint-desc">${escHtml(p.description)}</p>
      <div class="complaint-footer">
        <span>${time}</span>
        <span>${p.tags?.slice(0,3).map(t => '#'+t).join(' ') || ''}</span>
      </div>
      ${managerActions}
    </div>`;
}

// ================================================================
// STATUS UPDATE
// ================================================================
function updateStatus(problemId, newStatus) {
  const problems = getProblems();
  const idx = problems.findIndex(p => p.id === problemId);
  if (idx === -1) return;

  problems[idx].status = newStatus;
  problems[idx].updatedAt = new Date().toISOString();
  if (newStatus === 'Resolved') problems[idx].resolvedAt = new Date().toISOString();
  else problems[idx].resolvedAt = null;

  saveProblems(problems);

  // Notify resident
  const p = problems[idx];
  const msg = newStatus === 'Resolved'
    ? `🎉 Your ${p.category} complaint has been resolved!`
    : `🔄 Your ${p.category} complaint is now in progress.`;
  addNotification(p.houseNo, p.id, msg);

  showToast(newStatus === 'Resolved' ? '✅ Marked as Resolved!' : '🔄 Marked In Progress');
  refreshDashboard();
  if (currentDetailId === problemId) openDetailModal(problemId);
}

// ================================================================
// DETAIL MODAL
// ================================================================
function openDetailModal(problemId) {
  currentDetailId = problemId;
  const problems = getProblems();
  const p = problems.find(pr => pr.id === problemId);
  if (!p) return;

  const cat = CATEGORIES[p.category] || CATEGORIES.Others;
  const isManager = currentUser?.role === 'manager';

  document.getElementById('detail-title').textContent = cat.emoji + ' ' + p.category + ' Complaint';

  document.getElementById('detail-content').innerHTML = `
    <div class="detail-field">
      <label>Resident & House</label>
      <p>${escHtml(p.residentName)} · ${escHtml(p.houseNo)}</p>
    </div>
    <div class="detail-field">
      <label>Description</label>
      <p>${escHtml(p.description)}</p>
    </div>
    <div class="detail-field">
      <label>Urgency</label>
      <p><span class="urgency-badge urgency-${p.urgency.toLowerCase()}">${p.urgency}</span></p>
    </div>
    <div class="detail-field">
      <label>Status</label>
      <p><span class="status-badge status-${p.status}">${p.status}</span></p>
    </div>
    ${p.assignedTo ? `<div class="detail-field"><label>Assigned To</label><p>${escHtml(p.assignedTo)}</p></div>` : ''}
    <div class="detail-field">
      <label>Tags</label>
      <p>${(p.tags||[]).map(t => `<span class="tag">#${t}</span>`).join(' ') || '<em>None</em>'}</p>
    </div>
    <div class="detail-field">
      <label>Filed At</label>
      <p>${new Date(p.createdAt).toLocaleString('en-IN')}</p>
    </div>
    ${p.resolvedAt ? `<div class="detail-field"><label>Resolved At</label><p>${new Date(p.resolvedAt).toLocaleString('en-IN')}</p></div>` : ''}
  `;

  let actions = '';
  if (isManager) {
    if (p.status === 'Pending') {
      actions = `
        <button class="btn-primary" style="background:rgba(59,130,246,0.3);box-shadow:none;border:1px solid rgba(59,130,246,0.5);color:#93C5FD"
          onclick="updateStatus('${p.id}','In Progress')">🔄 Mark In Progress</button>
        <button class="btn-primary" onclick="updateStatus('${p.id}','Resolved')">✅ Mark Resolved</button>`;
    } else if (p.status === 'In Progress') {
      actions = `
        <button class="btn-primary" onclick="updateStatus('${p.id}','Resolved')">✅ Mark Resolved</button>
        <button class="btn-secondary" onclick="updateStatus('${p.id}','Pending')">↩️ Reopen</button>`;
    } else {
      actions = `<button class="btn-secondary" onclick="updateStatus('${p.id}','Pending')">↩️ Reopen</button>`;
    }
  }
  document.getElementById('detail-actions').innerHTML = actions;

  document.getElementById('detail-modal').classList.remove('hidden');
}

function closeDetailModal() {
  document.getElementById('detail-modal').classList.add('hidden');
  currentDetailId = null;
}

// ================================================================
// NOTIFICATIONS
// ================================================================
function addNotification(houseNo, problemId, message) {
  const notifs = getNotifications();
  notifs.unshift({
    id: generateId('N'),
    problemId, houseNo, message,
    read: false,
    createdAt: new Date().toISOString(),
  });
  saveNotifications(notifs.slice(0, 50)); // keep last 50
  updateNotifBadge();
}

function updateNotifBadge() {
  if (!currentUser || currentUser.role !== 'resident') return;
  const notifs = getNotifications().filter(n =>
    n.houseNo === currentUser.houseNo && !n.read
  );
  const badge = document.getElementById('notif-badge');
  if (notifs.length > 0) {
    badge.textContent = notifs.length;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function toggleNotifications() {
  const panel = document.getElementById('notif-panel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) renderNotifications();
}

function renderNotifications() {
  if (!currentUser) return;
  const notifs = getNotifications().filter(n => n.houseNo === currentUser.houseNo)
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  const list = document.getElementById('notif-list');
  if (!notifs.length) {
    list.innerHTML = `<div class="notif-item"><p>No notifications yet.</p></div>`;
    return;
  }
  list.innerHTML = notifs.slice(0, 10).map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}">
      <p>${escHtml(n.message)}</p>
      <span>${formatTime(n.createdAt)}</span>
    </div>
  `).join('');
}

function markAllRead() {
  if (!currentUser) return;
  const notifs = getNotifications().map(n => {
    if (n.houseNo === currentUser.houseNo) n.read = true;
    return n;
  });
  saveNotifications(notifs);
  updateNotifBadge();
  renderNotifications();
  showToast('✅ All notifications marked as read.');
}

// ================================================================
// EXPORT
// ================================================================
function exportData() {
  if (!currentUser) return;
  const problems = getProblems().filter(p => p.colonyId === currentUser.colonyId);
  const colony   = findColony(currentUser.colonyId);

  // CSV
  const headers = ['ID','House No','Resident','Category','Urgency','Status','Description','Filed At','Resolved At'];
  const rows = problems.map(p => [
    p.id, p.houseNo, p.residentName, p.category, p.urgency, p.status,
    '"' + (p.description||'').replace(/"/g,'""') + '"',
    p.createdAt, p.resolvedAt || ''
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `${(colony?.name||'Colony').replace(/\s/g,'_')}_Complaints_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📊 Data exported as CSV!');
}

// ================================================================
// UTILITIES
// ================================================================
function escHtml(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return Math.floor(diff/60) + ' min ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff/86400) + 'd ago';
  return d.toLocaleDateString('en-IN');
}

// Close panels when clicking outside
document.addEventListener('click', (e) => {
  const panel = document.getElementById('notif-panel');
  if (panel && !panel.classList.contains('hidden')) {
    if (!panel.contains(e.target) && !document.getElementById('notif-btn')?.contains(e.target)) {
      panel.classList.add('hidden');
    }
  }
  // Close modals on overlay click
  const manualModal = document.getElementById('manual-modal');
  if (manualModal && !manualModal.classList.contains('hidden') && e.target === manualModal) {
    closeManualEntry();
  }
  const detailModal = document.getElementById('detail-modal');
  if (detailModal && !detailModal.classList.contains('hidden') && e.target === detailModal) {
    closeDetailModal();
  }
});

// Keyboard: ESC closes modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeManualEntry();
    closeDetailModal();
    document.getElementById('notif-panel')?.classList.add('hidden');
  }
});

// ================================================================
// INIT
// ================================================================
(function init() {
  // Check Firebase or show Modal
  setTimeout(() => {
    checkFirebase();
  }, 500);

  // Show landing screen
  showScreen('screen-landing');
  console.log('🏘️ ColonyConnect initialized. Ready!');
})();
