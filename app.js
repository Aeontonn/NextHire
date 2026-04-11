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
const emptyState    = document.getElementById('empty-state');
const loadingState  = document.getElementById('loading-state');

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

// ── Auth: tab switching ───────────────────────────
let authMode = 'login';

authTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    authMode = tab.dataset.tab;
    authTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === authMode));
    confirmField.style.display = authMode === 'signup' ? 'flex' : 'none';
    authBtnText.textContent    = authMode === 'signup' ? 'Create Account' : 'Sign In';
    authConfirm.required       = authMode === 'signup';
    hideAuthError();
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
    } else {
      const { error } = await sb.auth.signUp({ email, password });
      if (error) throw error;
      showAuthError('✅ Account created! Check your email to confirm, then sign in.', true);
      setAuthLoading(false);
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
  if (msg.includes('Invalid login'))   return 'Incorrect email or password.';
  if (msg.includes('already registered')) return 'An account with this email already exists.';
  if (msg.includes('Email not confirmed')) return 'Please confirm your email before signing in.';
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

  if (error) { showToast('Failed to load applications.'); return; }
  apps = data || [];
  render();
}

// ── Database: add / update ────────────────────────
appForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setModalLoading(true);

  const payload = {
    company:      val('company'),
    role:         val('role'),
    location:     val('location') || null,
    date_applied: val('date-applied'),
    deadline:     val('deadline')  || null,
    status:       val('status'),
    link:         val('link')      || null,
    notes:        val('notes')     || null,
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

  appList.innerHTML = '';
  emptyState.style.display = filtered.length === 0 ? 'block' : 'none';

  filtered.forEach((app, i) => {
    const card = document.createElement('div');
    card.className = `app-card s-${app.status}`;
    card.style.animationDelay = `${i * 30}ms`;

    const initials = app.company.slice(0,2).toUpperCase();
    const avatarBg = avatarColor(app.company);
    const deadline = app.deadline
      ? `<span>📅 Deadline ${fmtDate(app.deadline)}</span>` : '';

    card.innerHTML = `
      <div class="card-avatar" style="background:${avatarBg}">${esc(initials)}</div>
      <div class="card-body">
        <div class="card-top">
          <span class="card-company">${esc(app.company)}</span>
        </div>
        <div class="card-role">${esc(app.role)}</div>
        <div class="card-meta">
          ${app.location ? `<span>📍 ${esc(app.location)}</span>` : ''}
          <span>📅 ${fmtDate(app.date_applied)}</span>
          <span>${daysAgo(app.date_applied)}</span>
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

    appList.appendChild(card);
  });
}

// ── Stats ─────────────────────────────────────────
function updateStats() {
  document.getElementById('s-total').textContent    = apps.length;
  document.getElementById('s-applied').textContent  = apps.filter(a => a.status === 'Applied').length;
  document.getElementById('s-interview').textContent = apps.filter(a => a.status === 'Interview' || a.status === 'Interviewed').length;
  document.getElementById('s-offer').textContent    = apps.filter(a => a.status === 'Offer').length;
  document.getElementById('s-rejected').textContent = apps.filter(a => a.status === 'Rejected').length;
}

// ── Add Modal ─────────────────────────────────────
openAddBtn.addEventListener('click', () => openAddModal());

function openAddModal() {
  editingId = null;
  appForm.reset();
  editIdField.value = '';
  document.getElementById('date-applied').value = today();
  modalTitle.textContent    = 'Add Application';
  modalBtnText.textContent  = 'Add Application';
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
      ${app.link ? `<div class="detail-field full"><label>Job Posting</label><div class="val"><a href="${esc(app.link)}" target="_blank" rel="noopener noreferrer">${esc(app.link)}</a></div></div>` : ''}
      ${app.notes ? `<div class="detail-field full"><label>Notes</label><div class="val notes-val">${esc(app.notes)}</div></div>` : ''}
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
  if (e.key === 'Escape') { closeModal(); closeDetailModal(); }
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

function statusLabel(s) {
  const m = { Applied:'Applied', Interview:'Interview Scheduled', Interviewed:'Interviewed', Offer:'Offer Received', Rejected:'Rejected', Withdrawn:'Withdrawn' };
  return m[s] || s;
}

const AVATAR_COLORS = [
  '#7c3aed','#2563eb','#059669','#b45309',
  '#be185d','#0891b2','#dc2626','#7c3aed',
];
function avatarColor(name) {
  return AVATAR_COLORS[(name.charCodeAt(0) + name.length) % AVATAR_COLORS.length];
}

// ── Toast ─────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3000);
}
