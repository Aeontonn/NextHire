/* ============================================================
   LIA Tracker — Supabase-backed app
   ============================================================ */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ── Supabase init ─────────────────────────────────
const SUPABASE_URL  = 'https://zssdqkkdfxjdmjcfilhy.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpzc2Rxa2tkZnhqZG1qY2ZpbGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTI4OTcsImV4cCI6MjA5MTQyODg5N30.0ZcXeR8sf2u1opf6hBigj0DvEVK0-WJ5VucWEyoMEYQ';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── State ─────────────────────────────────────────
let apps      = [];
let currentUser = null;
let editingId = null;
let imgFile   = null;   // new File pending upload
let imgUrl    = null;   // URL to store (existing or newly uploaded)

// ── DOM ───────────────────────────────────────────
const authScreen    = document.getElementById('auth-screen');
const appScreen     = document.getElementById('app-screen');

// Auth
const authForm      = document.getElementById('auth-form');
const authEmail     = document.getElementById('auth-email');
const authPassword  = document.getElementById('auth-password');
const authConfirm   = document.getElementById('auth-confirm');
const confirmField  = document.getElementById('confirm-field');
const authTabs      = document.querySelectorAll('.auth-tab');
const authSubmit    = document.getElementById('auth-submit');
const authBtnText   = document.getElementById('auth-btn-text');
const authSpinner   = document.getElementById('auth-spinner');
const authError     = document.getElementById('auth-error');
const togglePw      = document.getElementById('toggle-pw');

// App
const userEmailEl   = document.getElementById('user-email');
const logoutBtn     = document.getElementById('logout-btn');
const searchInput   = document.getElementById('search');
const filterStatus  = document.getElementById('filter-status');
const sortBy        = document.getElementById('sort-by');
const openAddBtn    = document.getElementById('open-add-btn');
const appList       = document.getElementById('app-list');
const planningList  = document.getElementById('planning-list');
const emptyState    = document.getElementById('empty-state');
const planningEmpty = document.getElementById('planning-empty');
const boards        = document.getElementById('boards');
const loadingState  = document.getElementById('loading-state');
const planningCount = document.getElementById('planning-count');
const appliedCount  = document.getElementById('applied-count');

// Add/Edit modal
const modalOverlay  = document.getElementById('modal-overlay');
const modalTitle    = document.getElementById('modal-title');
const appForm       = document.getElementById('app-form');
const editIdField   = document.getElementById('edit-id');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCancelBtn= document.getElementById('modal-cancel-btn');
const modalSubmit   = document.getElementById('modal-submit-btn');
const modalBtnText  = document.getElementById('modal-btn-text');
const modalSpinner  = document.getElementById('modal-spinner');

// Detail modal
const detailOverlay = document.getElementById('detail-overlay');
const detailTitle   = document.getElementById('detail-title');
const detailBody    = document.getElementById('detail-body');
const detailClose   = document.getElementById('detail-close-btn');
const detailEdit    = document.getElementById('detail-edit-btn');
const detailDelete  = document.getElementById('detail-delete-btn');

const toast         = document.getElementById('toast');

// Image upload
const imgUploadArea  = document.getElementById('img-upload-area');
const imgInput       = document.getElementById('img-input');
const imgPlaceholder = document.getElementById('img-placeholder');
const imgPreviewWrap = document.getElementById('img-preview-wrap');
const imgPreviewEl   = document.getElementById('img-preview');
const imgRemoveBtn   = document.getElementById('img-remove-btn');

// ── Auth: tab switching ───────────────────────────
let authMode = 'login';

authTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    authMode = tab.dataset.tab;
    authTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === authMode));
    confirmField.style.display    = authMode === 'signup' ? 'flex' : 'none';
    authBtnText.textContent       = authMode === 'signup' ? 'Create Account' : 'Sign In';
    authConfirm.required          = authMode === 'signup';
    authPassword.autocomplete     = authMode === 'signup' ? 'new-password' : 'current-password';
    hideAuthError();
    authForm.reset();
  });
});

// ── Auth: password toggle ─────────────────────────
togglePw.addEventListener('click', () => {
  const pw = authPassword;
  pw.type = pw.type === 'password' ? 'text' : 'password';
  togglePw.textContent = pw.type === 'password' ? '👁' : '🙈';
});

// ── Auth: submit ──────────────────────────────────
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAuthError();

  const email    = authEmail.value.trim();
  const password = authPassword.value;

  if (authMode === 'signup') {
    if (password !== authConfirm.value) {
      showAuthError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      showAuthError('Password must be at least 6 characters.');
      return;
    }
  }

  setAuthLoading(true);
  try {
    if (authMode === 'login') {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // onAuthStateChange handles the rest
    } else {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) throw error;

      if (data.session) {
        // Email confirmation is OFF — user is signed in immediately, onAuthStateChange handles routing
      } else {
        // Email confirmation is ON — tell the user to check their inbox
        showAuthError(
          '✅ Account created! Please check your email inbox (and spam) for a confirmation link, then come back and sign in.',
          true
        );
        setAuthLoading(false);
      }
      return;
    }
  } catch (err) {
    showAuthError(friendlyAuthError(err.message));
    setAuthLoading(false);
  }
});

function setAuthLoading(on) {
  authSubmit.disabled   = on;
  authBtnText.style.display  = on ? 'none' : 'inline';
  authSpinner.style.display  = on ? 'inline-block' : 'none';
}

function showAuthError(msg, success = false) {
  authError.textContent = msg;
  authError.style.display = 'block';
  authError.style.color = success ? 'var(--green)' : 'var(--red)';
  authError.style.borderColor = success ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)';
  authError.style.background  = success ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)';
}

function hideAuthError() {
  authError.style.display = 'none';
}

function friendlyAuthError(msg) {
  if (msg.includes('Invalid login') || msg.includes('invalid_credentials'))
    return 'Incorrect email or password.';
  if (msg.includes('already registered') || msg.includes('already been registered'))
    return 'An account with this email already exists. Try signing in instead.';
  if (msg.includes('Email not confirmed'))
    return 'Please confirm your email first — check your inbox (and spam folder).';
  if (msg.includes('User already registered'))
    return 'An account with this email already exists. Try signing in instead.';
  return msg;
}

// ── Auth: sign out ────────────────────────────────
logoutBtn.addEventListener('click', async () => {
  await sb.auth.signOut();
});

// ── Auth: state listener ──────────────────────────
sb.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    currentUser = session.user;
    showApp();
  } else {
    currentUser = null;
    showAuth();
  }
});

function showAuth() {
  authScreen.style.display = 'flex';
  appScreen.style.display  = 'none';
  apps = [];
  authForm.reset();
  setAuthLoading(false);
  hideAuthError();
}

async function showApp() {
  authScreen.style.display = 'none';
  appScreen.style.display  = 'block';
  userEmailEl.textContent  = currentUser.email;
  loadingState.style.display = 'block';
  emptyState.style.display   = 'none';
  appList.innerHTML = '';
  await fetchApps();
}

// ── Database: fetch ───────────────────────────────
async function fetchApps() {
  const { data, error } = await sb
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });

  loadingState.style.display = 'none';
  boards.style.display = 'grid';

  if (error) { showToast('Failed to load applications.'); return; }
  apps = data || [];
  render();
}

// ── Database: add / update ────────────────────────
appForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setModalLoading(true);

  const status = val('status');

  // ── Image: upload new file or clean up removed one ──
  let finalImgUrl = imgUrl;
  if (imgFile) {
    try {
      if (editingId) {
        const old = apps.find(a => a.id === editingId);
        if (old?.image_url) await removeAppImage(old.image_url);
      }
      finalImgUrl = await uploadAppImage(imgFile);
    } catch {
      showToast('Image upload failed — saving without image.');
      finalImgUrl = null;
    }
  } else if (editingId && imgUrl === null) {
    const old = apps.find(a => a.id === editingId);
    if (old?.image_url) await removeAppImage(old.image_url);
  }

  const payload = {
    company:      val('company'),
    role:         val('role'),
    location:     val('location') || null,
    date_applied: val('date-applied') || (status === 'Planning' ? today() : null),
    deadline:     val('deadline')  || null,
    status,
    link:         val('link')      || null,
    notes:        val('notes')     || null,
    image_url:    finalImgUrl      || null,
    user_id:      currentUser.id,
    updated_at:   new Date().toISOString(),
  };

  let error;
  if (editingId) {
    ({ error } = await sb.from('applications').update(payload).eq('id', editingId));
  } else {
    ({ error } = await sb.from('applications').insert(payload));
  }

  setModalLoading(false);

  if (error) { showToast('Error saving — please try again.'); return; }

  showToast(editingId ? 'Application updated.' : 'Application added!');
  closeModal();
  await fetchApps();
});

// ── Database: delete ──────────────────────────────
async function deleteApp(id) {
  const app = apps.find(a => a.id === id);
  if (!confirm(`Delete application to ${app?.company}?`)) return;

  const { error } = await sb.from('applications').delete().eq('id', id);
  if (error) { showToast('Error deleting — please try again.'); return; }

  if (app?.image_url) await removeAppImage(app.image_url);
  showToast('Application deleted.');
  closeDetailModal();
  await fetchApps();
}

// ── Render ────────────────────────────────────────
function render() {
  updateStats();

  const search = searchInput.value.toLowerCase();
  const status = filterStatus.value;
  const sort   = sortBy.value;

  let filtered = apps.filter(a => {
    const q = !search ||
      a.company.toLowerCase().includes(search) ||
      a.role.toLowerCase().includes(search) ||
      (a.location || '').toLowerCase().includes(search);
    const s = !status || a.status === status;
    return q && s;
  });

  filtered.sort((a, b) => {
    if (sort === 'date-asc')  return a.date_applied.localeCompare(b.date_applied);
    if (sort === 'date-desc') return b.date_applied.localeCompare(a.date_applied);
    if (sort === 'company')   return a.company.localeCompare(b.company);
    if (sort === 'status')    return a.status.localeCompare(b.status);
    return 0;
  });

  const planning = filtered.filter(a => a.status === 'Planning');
  const applied  = filtered.filter(a => a.status !== 'Planning');

  // Planning column
  planningList.innerHTML = '';
  planningEmpty.style.display = planning.length === 0 ? 'block' : 'none';
  planning.forEach((app, i) => planningList.appendChild(buildCard(app, i)));
  planningCount.textContent = planning.length;

  // Applications column
  appList.innerHTML = '';
  emptyState.style.display = applied.length === 0 ? 'block' : 'none';
  applied.forEach((app, i) => appList.appendChild(buildCard(app, i)));
  appliedCount.textContent = applied.length;
}

function buildCard(app, i) {
  const card = document.createElement('div');
  card.className = `app-card s-${app.status}`;
  card.style.animationDelay = `${i * 30}ms`;

  const initials = app.company.slice(0,2).toUpperCase();
  const avatarBg = avatarColor(app.company);
  const deadline = app.deadline
    ? `<span>📅 Deadline ${fmtDate(app.deadline)}</span>` : '';
  const dateMeta = app.status === 'Planning'
    ? (app.deadline ? '' : '')
    : `<span>📅 ${fmtDate(app.date_applied)}</span><span>${daysAgo(app.date_applied)}</span>`;

  card.innerHTML = `
    <div class="card-avatar" style="background:${avatarBg}">${esc(initials)}</div>
    <div class="card-body">
      <div class="card-top">
        <span class="card-company">${esc(app.company)}</span>
      </div>
      <div class="card-role">${esc(app.role)}</div>
      <div class="card-meta">
        ${app.location ? `<span>📍 ${esc(app.location)}</span>` : ''}
        ${dateMeta}
        ${deadline}
      </div>
    </div>
    <div class="card-right">
      <span class="badge badge-${app.status}">${statusLabel(app.status)}</span>
      <div class="card-actions">
        <button class="btn-icon edit-btn" title="Edit" data-id="${app.id}">✏️</button>
        <button class="btn-icon danger del-btn" title="Delete" data-id="${app.id}">🗑</button>
      </div>
    </div>
  `;

  card.addEventListener('click', (e) => {
    if (e.target.closest('.edit-btn') || e.target.closest('.del-btn')) return;
    openDetailModal(app.id);
  });
  card.querySelector('.edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openEditModal(app.id);
  });
  card.querySelector('.del-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteApp(app.id);
  });

  return card;
}

// ── Stats ─────────────────────────────────────────
function updateStats() {
  document.getElementById('s-total').textContent    = apps.length;
  document.getElementById('s-planning').textContent = apps.filter(a => a.status === 'Planning').length;
  document.getElementById('s-applied').textContent  = apps.filter(a => a.status === 'Applied').length;
  document.getElementById('s-interview').textContent = apps.filter(a => a.status === 'Interview' || a.status === 'Interviewed').length;
  document.getElementById('s-offer').textContent    = apps.filter(a => a.status === 'Offer').length;
  document.getElementById('s-rejected').textContent = apps.filter(a => a.status === 'Rejected').length;
}

// ── Add Modal ─────────────────────────────────────
openAddBtn.addEventListener('click', () => openAddModal('Applied'));
document.getElementById('open-add-applied-btn').addEventListener('click',  () => openAddModal('Applied'));
document.getElementById('open-add-planning-btn').addEventListener('click', () => openAddModal('Planning'));

function openAddModal(defaultStatus = 'Applied') {
  editingId = null;
  appForm.reset();
  editIdField.value = '';
  imgFile = null; imgUrl = null; resetImgUI();
  setVal('status', defaultStatus);
  if (defaultStatus !== 'Planning') {
    document.getElementById('date-applied').value = today();
  }
  modalTitle.textContent    = defaultStatus === 'Planning' ? 'Add to Planning' : 'Add Application';
  modalBtnText.textContent  = defaultStatus === 'Planning' ? 'Add to Planning' : 'Add Application';
  modalOverlay.style.display = 'flex';
  setTimeout(() => document.getElementById('company').focus(), 80);
}

function openEditModal(id) {
  const app = apps.find(a => a.id === id);
  if (!app) return;
  editingId = id;
  setVal('company',      app.company);
  setVal('role',         app.role);
  setVal('location',     app.location);
  setVal('date-applied', app.date_applied);
  setVal('deadline',     app.deadline);
  setVal('status',       app.status);
  setVal('link',         app.link);
  setVal('notes',        app.notes);
  imgFile = null;
  imgUrl  = app.image_url || null;
  if (imgUrl) showImgPreview(imgUrl); else resetImgUI();
  modalTitle.textContent   = 'Edit Application';
  modalBtnText.textContent = 'Save Changes';
  modalOverlay.style.display = 'flex';
  closeDetailModal();
}

function closeModal() {
  modalOverlay.style.display = 'none';
  editingId = null;
}

modalCloseBtn.addEventListener('click',  closeModal);
modalCancelBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

function setModalLoading(on) {
  modalSubmit.disabled          = on;
  modalBtnText.style.display    = on ? 'none' : 'inline';
  modalSpinner.style.display    = on ? 'inline-block' : 'none';
}

// ── Detail Modal ──────────────────────────────────
function openDetailModal(id) {
  const app = apps.find(a => a.id === id);
  if (!app) return;

  detailTitle.textContent = `${app.company} — ${app.role}`;
  detailBody.innerHTML = `
    <div class="detail-grid">
      <div class="detail-field">
        <label>Company</label>
        <div class="val">${esc(app.company)}</div>
      </div>
      <div class="detail-field">
        <label>Status</label>
        <div class="val"><span class="badge badge-${app.status}">${statusLabel(app.status)}</span></div>
      </div>
      <div class="detail-field full">
        <label>Role</label>
        <div class="val">${esc(app.role)}</div>
      </div>
      ${app.location ? `<div class="detail-field"><label>Location</label><div class="val">${esc(app.location)}</div></div>` : ''}
      <div class="detail-field">
        <label>Date Applied</label>
        <div class="val">${fmtDate(app.date_applied)}</div>
      </div>
      ${app.deadline ? `<div class="detail-field"><label>Deadline</label><div class="val">${fmtDate(app.deadline)}</div></div>` : ''}
      ${app.link ? (() => { const sl = safeUrl(app.link); return sl ? `<div class="detail-field full"><label>Job Posting</label><div class="val"><a href="${esc(sl)}" target="_blank" rel="noopener noreferrer">${esc(app.link)}</a></div></div>` : `<div class="detail-field full"><label>Job Posting</label><div class="val" style="color:var(--text-3);font-size:0.88rem">${esc(app.link)}<br><span style="color:var(--red);font-size:0.78rem">⚠ Not a valid http/https URL</span></div></div>`; })() : ''}
      ${app.notes ? `<div class="detail-field full"><label>Notes</label><div class="val notes-val">${esc(app.notes)}</div></div>` : ''}
      ${app.image_url ? `<div class="detail-field full"><label>Attachment</label><img class="detail-image" src="${esc(app.image_url)}" alt="Attachment" loading="lazy" /></div>` : ''}
    </div>
  `;

  detailEdit.onclick   = () => openEditModal(id);
  detailDelete.onclick = () => deleteApp(id);
  detailOverlay.style.display = 'flex';
}

function closeDetailModal() {
  detailOverlay.style.display = 'none';
}

detailClose.addEventListener('click', closeDetailModal);
detailOverlay.addEventListener('click', (e) => { if (e.target === detailOverlay) closeDetailModal(); });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeModal(); closeDetailModal(); closeCalendarModal(); }
});

// ── Filters ───────────────────────────────────────
searchInput.addEventListener('input',  render);
filterStatus.addEventListener('change', render);
sortBy.addEventListener('change',      render);

// ── Helpers ───────────────────────────────────────
function val(id)       { return document.getElementById(id).value.trim(); }
function setVal(id, v) { document.getElementById(id).value = v || ''; }
function today()       { return new Date().toISOString().split('T')[0]; }

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function daysAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}

function esc(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function safeUrl(url) {
  try {
    const u = new URL(String(url || ''));
    return (u.protocol === 'http:' || u.protocol === 'https:') ? url : null;
  } catch { return null; }
}

function statusLabel(s) {
  const m = { Planning:'Planning', Applied:'Applied', Interview:'Interview Scheduled', Interviewed:'Interviewed', Offer:'Offer Received', Rejected:'Rejected', Withdrawn:'Withdrawn' };
  return m[s] || s;
}

const AVATAR_COLORS = [
  '#7c3aed','#2563eb','#059669','#b45309',
  '#be185d','#0891b2','#dc2626','#7c3aed',
];
function avatarColor(name) {
  return AVATAR_COLORS[(name.charCodeAt(0) + name.length) % AVATAR_COLORS.length];
}

// ── Calendar ──────────────────────────────────────
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calSelectedDay = null;

const calendarOverlay = document.getElementById('calendar-overlay');
const calMonthTitle   = document.getElementById('cal-month-title');
const calGrid         = document.getElementById('cal-grid');
const calDayDetail    = document.getElementById('cal-day-detail');
const calDayTitle     = document.getElementById('cal-day-title');
const calDayEvents    = document.getElementById('cal-day-events');

document.getElementById('cal-btn').addEventListener('click', openCalendarModal);
document.getElementById('cal-close-btn').addEventListener('click', closeCalendarModal);
document.getElementById('cal-day-close-btn').addEventListener('click', () => {
  calDayDetail.style.display = 'none';
  calGrid.querySelectorAll('.cal-selected').forEach(el => el.classList.remove('cal-selected'));
});
calendarOverlay.addEventListener('click', (e) => { if (e.target === calendarOverlay) closeCalendarModal(); });
document.getElementById('cal-prev-btn').addEventListener('click', () => {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
});
document.getElementById('cal-next-btn').addEventListener('click', () => {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
});

function openCalendarModal() {
  calYear  = new Date().getFullYear();
  calMonth = new Date().getMonth();
  calSelectedDay = null;
  calDayDetail.style.display = 'none';
  renderCalendar();
  calendarOverlay.style.display = 'flex';
}

function closeCalendarModal() {
  calendarOverlay.style.display = 'none';
}

function getCalendarEvents() {
  const events = {};
  apps.forEach(app => {
    if (app.date_applied && app.status !== 'Planning') {
      if (!events[app.date_applied]) events[app.date_applied] = [];
      events[app.date_applied].push({ type: 'applied', app });
    }
    if (app.deadline) {
      if (!events[app.deadline]) events[app.deadline] = [];
      events[app.deadline].push({ type: 'deadline', app });
    }
  });
  return events;
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_COLORS = {
  Planning:    'var(--purple-400)',
  Applied:     'var(--blue)',
  Interview:   'var(--yellow)',
  Interviewed: 'var(--orange)',
  Offer:       'var(--green)',
  Rejected:    'var(--red)',
  Withdrawn:   'var(--muted)',
};

function renderCalendar() {
  calMonthTitle.textContent = `${MONTH_NAMES[calMonth]} ${calYear}`;
  calDayDetail.style.display = 'none';
  calSelectedDay = null;

  const events   = getCalendarEvents();
  const todayStr = new Date().toISOString().split('T')[0];

  let startOffset = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  startOffset = (startOffset + 6) % 7; // Mon=0 ... Sun=6

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  calGrid.innerHTML = '';

  for (let i = 0; i < startOffset; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day cal-day-empty';
    calGrid.appendChild(cell);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr   = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayEvents = events[dateStr] || [];

    const cell = document.createElement('div');
    cell.className = 'cal-day';
    if (dateStr === todayStr)    cell.classList.add('cal-today');
    if (dayEvents.length > 0)   cell.classList.add('cal-has-events');

    cell.innerHTML = `<span class="cal-day-num">${d}</span>`;

    if (dayEvents.length > 0) {
      const dotsEl = document.createElement('div');
      dotsEl.className = 'cal-dots';
      dayEvents.slice(0, 4).forEach(ev => {
        const dot = document.createElement('span');
        dot.className = 'cal-dot';
        dot.style.background = ev.type === 'deadline'
          ? 'var(--orange)'
          : (STATUS_COLORS[ev.app.status] || 'var(--text-3)');
        dotsEl.appendChild(dot);
      });
      if (dayEvents.length > 4) {
        const more = document.createElement('span');
        more.className = 'cal-dot-more';
        more.textContent = `+${dayEvents.length - 4}`;
        dotsEl.appendChild(more);
      }
      cell.appendChild(dotsEl);

      cell.addEventListener('click', () => {
        calGrid.querySelectorAll('.cal-selected').forEach(el => el.classList.remove('cal-selected'));
        cell.classList.add('cal-selected');
        calSelectedDay = dateStr;
        showDayDetail(dateStr, dayEvents);
      });
    }

    calGrid.appendChild(cell);
  }
}

function showDayDetail(dateStr, dayEvents) {
  const [y, m, d] = dateStr.split('-');
  calDayTitle.textContent = `${Number(d)} ${MONTH_NAMES[Number(m) - 1]} ${y}`;
  calDayEvents.innerHTML = '';

  dayEvents.forEach(ev => {
    const item = document.createElement('div');
    item.className = 'cal-event-item';

    const isDeadline = ev.type === 'deadline';
    const badgeClass = isDeadline ? 'badge-deadline' : `badge-${ev.app.status}`;
    const typeLabel  = isDeadline ? 'Deadline' : statusLabel(ev.app.status);

    item.innerHTML = `
      <span class="badge ${badgeClass}">${esc(typeLabel)}</span>
      <div class="cal-event-info">
        <span class="cal-event-company">${esc(ev.app.company)}</span>
        <span class="cal-event-role">${esc(ev.app.role)}</span>
      </div>
      <button class="btn-icon" title="View details">
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
      </button>
    `;

    item.querySelector('.btn-icon').addEventListener('click', () => {
      closeCalendarModal();
      openDetailModal(ev.app.id);
    });

    calDayEvents.appendChild(item);
  });

  calDayDetail.style.display = 'block';
}

// ── Image Upload ──────────────────────────────────
function handleImageFile(file) {
  if (!file || !file.type.startsWith('image/')) { showToast('Please select an image file.'); return; }
  if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5 MB.'); return; }
  imgFile = file;
  showImgPreview(URL.createObjectURL(file));
}

function showImgPreview(src) {
  imgPreviewEl.src = src;
  imgPlaceholder.style.display = 'none';
  imgPreviewWrap.style.display = 'block';
}

function resetImgUI() {
  imgInput.value   = '';
  imgPreviewEl.src = '';
  imgPreviewWrap.style.display = 'none';
  imgPlaceholder.style.display = 'flex';
}

async function uploadAppImage(file) {
  const ext  = file.name.split('.').pop().toLowerCase() || 'jpg';
  const path = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const { error } = await sb.storage.from('application-images').upload(path, file);
  if (error) throw error;
  return sb.storage.from('application-images').getPublicUrl(path).data.publicUrl;
}

async function removeAppImage(url) {
  if (!url) return;
  try {
    const marker = '/application-images/';
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    await sb.storage.from('application-images').remove([url.slice(idx + marker.length)]);
  } catch {}
}

// Image event listeners
imgUploadArea.addEventListener('click', () => imgInput.click());
imgInput.addEventListener('change', (e) => { if (e.target.files[0]) handleImageFile(e.target.files[0]); });
imgRemoveBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  imgFile = null; imgUrl = null; resetImgUI();
});
imgUploadArea.addEventListener('dragover',  (e) => { e.preventDefault(); imgUploadArea.classList.add('drag-over'); });
imgUploadArea.addEventListener('dragleave', ()  => imgUploadArea.classList.remove('drag-over'));
imgUploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  imgUploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleImageFile(file);
});

// ── Toast ─────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3000);
}
