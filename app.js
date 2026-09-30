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
let imgExistingUrls = []; // URLs already saved in DB
let imgNewFiles     = []; // new File objects pending upload
let imgRemovedUrls  = []; // existing URLs to delete from storage on save

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
const imgInput   = document.getElementById('img-input');
const imgGallery = document.getElementById('img-gallery');
const imgAddTile = document.getElementById('img-add-tile');

// ── Auth: tab switching ───────────────────────────
let authMode = 'login';

authTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    authMode = tab.dataset.tab;
    authTabs.forEach(t => {
      t.classList.toggle('active', t.dataset.tab === authMode);
      t.setAttribute('aria-selected', t.dataset.tab === authMode);
    });
    confirmField.style.display    = authMode === 'signup' ? 'flex' : 'none';
    authBtnText.textContent       = authMode === 'signup' ? 'Create Account' : 'Sign In';
    authConfirm.required          = authMode === 'signup';
    authPassword.autocomplete     = authMode === 'signup' ? 'new-password' : 'current-password';
    hideAuthError();
    authForm.reset();
  });
});

// ── Auth: password toggle ─────────────────────────
const EYE_OPEN   = '<path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6z"/><circle cx="10" cy="10" r="2.5"/>';
const EYE_CLOSED = '<path d="M3 3l14 14M8.2 4.3A8.6 8.6 0 0110 4c5.5 0 8.5 6 8.5 6a14 14 0 01-2.3 3M5.4 5.6A14 14 0 001.5 10s3 6 8.5 6a8 8 0 004-1.1"/><path d="M8.2 8.2a2.5 2.5 0 003.6 3.6"/>';

togglePw.addEventListener('click', () => {
  const pw = authPassword;
  const show = pw.type === 'password';
  pw.type = show ? 'text' : 'password';
  document.getElementById('toggle-pw-icon').innerHTML = show ? EYE_CLOSED : EYE_OPEN;
  togglePw.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  togglePw.setAttribute('aria-pressed', show);
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
          'Account created. Check your inbox (and spam folder) for a confirmation link, then come back and sign in.',
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

  // ── Image: delete removed, upload new ──
  for (const url of imgRemovedUrls) await removeAppImage(url);

  const uploadedUrls = [];
  for (const file of imgNewFiles) {
    try {
      uploadedUrls.push(await uploadAppImage(file));
    } catch {
      showToast('One image failed to upload — skipping it.');
    }
  }
  const finalUrls = [...imgExistingUrls.filter(u => !imgRemovedUrls.includes(u)), ...uploadedUrls];
  const finalImgUrl = finalUrls.length === 0 ? null
    : finalUrls.length === 1 ? finalUrls[0]
    : JSON.stringify(finalUrls);

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

  for (const url of parseImageUrls(app?.image_url)) await removeAppImage(url);
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
    if (sort === 'date-asc')  return (a.date_applied || '').localeCompare(b.date_applied || '');
    if (sort === 'date-desc') return (b.date_applied || '').localeCompare(a.date_applied || '');
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
  card.style.animationDelay = `${Math.min(i, 10) * 30}ms`;
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `${app.company}, ${app.role}, ${statusLabel(app.status)}`);

  const initials = app.company.slice(0,2).toUpperCase();
  const deadline = app.deadline
    ? `<span class="meta-deadline">${icon('flag')}Due ${fmtDate(app.deadline)}</span>` : '';
  const dateMeta = app.status === 'Planning' || !app.date_applied
    ? ''
    : `<span title="${fmtDate(app.date_applied)}">${icon('cal')}Applied ${daysAgo(app.date_applied)}</span>`;

  card.innerHTML = `
    <div class="card-avatar" style="${avatarStyle(app.company)}" aria-hidden="true">${esc(initials)}</div>
    <div class="card-body">
      <div class="card-top">
        <span class="card-company">${esc(app.company)}</span>
      </div>
      <div class="card-role">${esc(app.role)}</div>
      <div class="card-meta">${app.location ? `<span>${icon('pin')}${esc(app.location)}</span>` : ''}${dateMeta}${deadline}</div>
    </div>
    <div class="card-right">
      <span class="badge badge-${app.status}">${statusLabel(app.status)}</span>
      <div class="card-actions">
        <button type="button" class="btn-icon edit-btn" aria-label="Edit ${esc(app.company)}" title="Edit">${icon('edit')}</button>
        <button type="button" class="btn-icon danger del-btn" aria-label="Delete ${esc(app.company)}" title="Delete">${icon('trash')}</button>
      </div>
    </div>
  `;

  card.addEventListener('click', (e) => {
    if (e.target.closest('.edit-btn') || e.target.closest('.del-btn')) return;
    openDetailModal(app.id);
  });
  card.addEventListener('keydown', (e) => {
    if (e.target !== card) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetailModal(app.id); }
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
  imgExistingUrls = []; imgNewFiles = []; imgRemovedUrls = []; renderImgGallery();
  setVal('status', defaultStatus);
  if (defaultStatus !== 'Planning') {
    document.getElementById('date-applied').value = today();
  }
  modalTitle.textContent    = defaultStatus === 'Planning' ? 'Add to Planning' : 'Add Application';
  modalBtnText.textContent  = defaultStatus === 'Planning' ? 'Add to Planning' : 'Add Application';
  openOverlay(modalOverlay, document.getElementById('company'));
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
  imgExistingUrls = parseImageUrls(app.image_url);
  imgNewFiles = []; imgRemovedUrls = [];
  renderImgGallery();
  modalTitle.textContent   = 'Edit Application';
  modalBtnText.textContent = 'Save Changes';
  closeDetailModal(false);
  openOverlay(modalOverlay, document.getElementById('company'));
}

function closeModal() {
  if (modalOverlay.style.display === 'none') return;
  closeOverlay(modalOverlay);
  editingId = null;
}

// ── Overlay focus management ──────────────────────
// Remember what opened a dialog so focus can return there on close.
let overlayReturnFocus = null;

function openOverlay(overlay, focusEl) {
  if (!overlayReturnFocus || !document.body.contains(overlayReturnFocus)) {
    overlayReturnFocus = document.activeElement;
  }
  overlay.style.display = 'flex';
  requestAnimationFrame(() => (focusEl || overlay.querySelector('.modal-close'))?.focus());
}

function closeOverlay(overlay, restoreFocus = true) {
  overlay.style.display = 'none';
  if (restoreFocus && overlayReturnFocus && document.body.contains(overlayReturnFocus)) {
    overlayReturnFocus.focus();
  }
  if (restoreFocus) overlayReturnFocus = null;
}

// Keep Tab inside the open dialog
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const overlay = [modalOverlay, detailOverlay, calendarOverlay].find(o => o.style.display !== 'none');
  if (!overlay) return;
  const focusables = [...overlay.querySelectorAll('button, [href], input:not([type="hidden"]):not(.sr-only), select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.disabled && el.offsetParent !== null);
  if (!focusables.length) return;
  const first = focusables[0], last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

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
      ${app.link ? (() => { const sl = safeUrl(app.link); return sl ? `<div class="detail-field full"><label>Job Posting</label><div class="val"><a href="${esc(sl)}" target="_blank" rel="noopener noreferrer">${esc(app.link)}</a></div></div>` : `<div class="detail-field full"><label>Job Posting</label><div class="val invalid-link">${esc(app.link)}<small>Not a valid http/https URL — edit the application to fix it.</small></div></div>`; })() : ''}
      ${app.notes ? `<div class="detail-field full"><label>Notes</label><div class="val notes-val">${esc(app.notes)}</div></div>` : ''}
      ${parseImageUrls(app.image_url).length ? `<div class="detail-field full"><label>Attachments</label><div class="detail-images">${parseImageUrls(app.image_url).map((u, n) => `<a class="detail-image-link" href="${esc(u)}" target="_blank" rel="noopener noreferrer"><img class="detail-image" src="${esc(u)}" alt="Attachment ${n + 1} for ${esc(app.company)}" width="140" height="100" loading="lazy" /></a>`).join('')}</div></div>` : ''}
    </div>
  `;

  detailEdit.onclick   = () => openEditModal(id);
  detailDelete.onclick = () => deleteApp(id);
  openOverlay(detailOverlay, detailEdit);
}

function closeDetailModal(restoreFocus = true) {
  if (detailOverlay.style.display === 'none') return;
  closeOverlay(detailOverlay, restoreFocus);
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
// Local calendar date as YYYY-MM-DD (toISOString would give the UTC date)
function isoLocal(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function today() { return isoLocal(new Date()); }

function parseLocalDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const DATE_FMT = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const REL_FMT  = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

function fmtDate(iso) {
  if (!iso) return '—';
  return DATE_FMT.format(parseLocalDate(iso));
}

function daysAgo(iso) {
  if (!iso) return '';
  const diff = Math.round((parseLocalDate(today()) - parseLocalDate(iso)) / 86400000);
  return REL_FMT.format(-diff, 'day');
}

function icon(name) {
  return `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
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

// Soft tinted avatar: muted hue background with a light text of the same hue
const AVATAR_HUES = [262, 214, 158, 32, 330, 190, 8, 48];
function avatarStyle(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = AVATAR_HUES[h % AVATAR_HUES.length];
  return `background:hsl(${hue} 30% 24%);color:hsl(${hue} 85% 84%)`;
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
  openOverlay(calendarOverlay, document.getElementById('cal-next-btn'));
}

function closeCalendarModal(restoreFocus = true) {
  if (calendarOverlay.style.display === 'none') return;
  closeOverlay(calendarOverlay, restoreFocus);
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

const MONTH_FMT = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const DAY_FMT   = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

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
  calMonthTitle.textContent = MONTH_FMT.format(new Date(calYear, calMonth, 1));
  calDayDetail.style.display = 'none';
  calSelectedDay = null;

  const events   = getCalendarEvents();
  const todayStr = today();

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

    // Days with events are real buttons so they're reachable by keyboard
    const cell = document.createElement(dayEvents.length > 0 ? 'button' : 'div');
    cell.className = 'cal-day';
    if (dateStr === todayStr)    cell.classList.add('cal-today');
    if (dayEvents.length > 0) {
      cell.type = 'button';
      cell.classList.add('cal-has-events');
      cell.setAttribute('aria-label',
        `${DAY_FMT.format(parseLocalDate(dateStr))}, ${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'}`);
    }
    if (dateStr === todayStr) cell.setAttribute('aria-current', 'date');

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
  calDayTitle.textContent = DAY_FMT.format(parseLocalDate(dateStr));
  calDayEvents.innerHTML = '';

  dayEvents.forEach(ev => {
    // Whole row is the button — bigger hit target than a trailing icon
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'cal-event-item';

    const isDeadline = ev.type === 'deadline';
    const badgeClass = isDeadline ? 'badge-deadline' : `badge-${ev.app.status}`;
    const typeLabel  = isDeadline ? 'Deadline' : statusLabel(ev.app.status);

    item.innerHTML = `
      <span class="badge ${badgeClass}">${esc(typeLabel)}</span>
      <span class="cal-event-info">
        <span class="cal-event-company">${esc(ev.app.company)}</span>
        <span class="cal-event-role">${esc(ev.app.role)}</span>
      </span>
      ${icon('chevron')}
    `;

    item.addEventListener('click', () => {
      closeCalendarModal(false);
      openDetailModal(ev.app.id);
    });

    calDayEvents.appendChild(item);
  });

  calDayDetail.style.display = 'block';
}

// ── Image Upload ──────────────────────────────────
function parseImageUrls(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [raw];
  } catch { return [raw]; }
}

function renderImgGallery() {
  // Remove all thumbs (keep the add tile)
  imgGallery.querySelectorAll('.img-thumb').forEach(el => el.remove());

  // Existing URLs
  imgExistingUrls.forEach((url, i) => {
    if (imgRemovedUrls.includes(url)) return;
    const thumb = makeThumb(url, () => {
      imgRemovedUrls.push(url);
      renderImgGallery();
    });
    imgGallery.insertBefore(thumb, imgAddTile);
  });

  // New files (not yet uploaded)
  imgNewFiles.forEach((file, i) => {
    const objUrl = URL.createObjectURL(file);
    const thumb = makeThumb(objUrl, () => {
      imgNewFiles.splice(i, 1);
      renderImgGallery();
    });
    imgGallery.insertBefore(thumb, imgAddTile);
  });
}

function makeThumb(src, onRemove) {
  const div = document.createElement('div');
  div.className = 'img-thumb';
  const img = document.createElement('img');
  img.src = src;
  img.alt = 'Attachment preview';
  img.width = 96;
  img.height = 96;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'img-remove-btn';
  btn.setAttribute('aria-label', 'Remove image');
  btn.innerHTML = '<svg width="12" height="12" aria-hidden="true"><use href="#i-x"/></svg>';
  btn.addEventListener('click', (e) => { e.stopPropagation(); onRemove(); });
  div.appendChild(img);
  div.appendChild(btn);
  return div;
}

function handleImageFiles(files) {
  let skipped = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) { skipped++; continue; }
    if (file.size > 5 * 1024 * 1024) { showToast(`"${file.name}" exceeds 5 MB — skipped.`); continue; }
    imgNewFiles.push(file);
  }
  if (skipped) showToast('Some files were not images — skipped.');
  renderImgGallery();
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
imgAddTile.addEventListener('click', () => imgInput.click());
imgInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleImageFiles(Array.from(e.target.files));
  imgInput.value = '';
});
imgAddTile.addEventListener('dragover',  (e) => { e.preventDefault(); imgAddTile.classList.add('drag-over'); });
imgAddTile.addEventListener('dragleave', ()  => imgAddTile.classList.remove('drag-over'));
imgAddTile.addEventListener('drop', (e) => {
  e.preventDefault();
  imgAddTile.classList.remove('drag-over');
  if (e.dataTransfer.files.length) handleImageFiles(Array.from(e.dataTransfer.files));
});

// ── Navigation ────────────────────────────────────
const navTabs = document.querySelectorAll('.nav-tab');
const viewApplications = document.getElementById('view-applications');
const viewTodos        = document.getElementById('view-todos');

navTabs.forEach(tab => {
  tab.addEventListener('click', () => switchView(tab.dataset.view));
});

function switchView(view) {
  navTabs.forEach(t => {
    t.classList.toggle('active', t.dataset.view === view);
    if (t.dataset.view === view) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  });
  viewApplications.style.display = view === 'applications' ? 'block' : 'none';
  viewTodos.style.display        = view === 'todos'        ? 'block' : 'none';
  if (view === 'todos') fetchTodos();
}

// ── Todos: state ──────────────────────────────────
let todos = [];

async function fetchTodos() {
  const { data, error } = await sb
    .from('todos')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { showToast('Failed to load todos.'); return; }
  todos = data || [];
  renderTodos();
}

function renderTodos() {
  renderTodoSection('daily');
  renderTodoSection('weekly');
}

function renderTodoSection(type) {
  const list  = document.getElementById(`todo-list-${type}`);
  const count = document.getElementById(`todo-count-${type}`);
  const empty = document.getElementById(`todo-empty-${type}`);
  const sectionTodos = todos.filter(t => t.type === type);

  count.textContent = sectionTodos.filter(t => t.status !== 'done').length;

  // Remove all items except the empty placeholder
  [...list.children].forEach(child => {
    if (!child.classList.contains('todo-empty')) child.remove();
  });

  empty.style.display = sectionTodos.length === 0 ? 'flex' : 'none';
  sectionTodos.forEach(todo => list.insertBefore(buildTodoItem(todo), empty));
}

function buildTodoItem(todo) {
  const item = document.createElement('div');
  item.className = `todo-item todo-${todo.status}`;

  const done = todo.status === 'done';
  const doingBtn = !done
    ? `<button type="button" class="todo-doing-btn${todo.status === 'doing' ? ' active' : ''}" aria-pressed="${todo.status === 'doing'}" title="${todo.status === 'doing' ? 'Back to todo' : 'Mark as doing'}">Doing</button>`
    : '';

  item.innerHTML = `
    <button type="button" class="todo-check${done ? ' checked' : ''}" role="checkbox" aria-checked="${done}" aria-label="Done: ${esc(todo.text)}">
      <svg width="14" height="14" aria-hidden="true"><use href="#i-check"/></svg>
    </button>
    <span class="todo-text">${esc(todo.text)}</span>
    <div class="todo-actions">
      ${doingBtn}
      <button type="button" class="todo-edit-btn btn-icon" aria-label="Edit task" title="Edit">${icon('edit')}</button>
      <button type="button" class="todo-delete-btn btn-icon danger" aria-label="Delete task" title="Delete">${icon('trash')}</button>
    </div>
  `;

  item.querySelector('.todo-check').addEventListener('click', () => {
    updateTodoStatus(todo.id, todo.status === 'done' ? 'todo' : 'done');
  });

  const doingEl = item.querySelector('.todo-doing-btn');
  if (doingEl) {
    doingEl.addEventListener('click', () => {
      updateTodoStatus(todo.id, todo.status === 'doing' ? 'todo' : 'doing');
    });
  }

  item.querySelector('.todo-edit-btn').addEventListener('click', () => startEditTodo(todo, item));
  item.querySelector('.todo-delete-btn').addEventListener('click', () => deleteTodo(todo.id));

  return item;
}

function startEditTodo(todo, item) {
  const textEl = item.querySelector('.todo-text');
  const input  = document.createElement('input');
  input.type      = 'text';
  input.className = 'todo-edit-input';
  input.value     = todo.text;
  textEl.replaceWith(input);
  input.focus();
  input.select();

  let saved = false;
  const save = async () => {
    if (saved) return;
    saved = true;
    const newText = input.value.trim();
    if (!newText || newText === todo.text) { input.replaceWith(textEl); return; }
    await updateTodoText(todo.id, newText);
  };

  input.addEventListener('blur', save);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { saved = true; input.replaceWith(textEl); }
  });
}

async function updateTodoStatus(id, status) {
  const { error } = await sb.from('todos')
    .update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) { showToast('Failed to update.'); return; }
  await fetchTodos();
}

async function updateTodoText(id, text) {
  const { error } = await sb.from('todos')
    .update({ text, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) { showToast('Failed to update.'); return; }
  await fetchTodos();
}

async function deleteTodo(id) {
  const { error } = await sb.from('todos').delete().eq('id', id);
  if (error) { showToast('Failed to delete.'); return; }
  todos = todos.filter(t => t.id !== id);
  renderTodos();
}

// ── Todos: add handlers ───────────────────────────
['daily', 'weekly'].forEach(type => {
  const input = document.getElementById(`todo-input-${type}`);
  const btn   = document.getElementById(`todo-add-btn-${type}`);

  const addTodo = async () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    const { error } = await sb.from('todos').insert({
      user_id: currentUser.id,
      text,
      type,
      status: 'todo',
    });
    if (error) { showToast('Failed to add task.'); return; }
    await fetchTodos();
  };

  btn.addEventListener('click', addTodo);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTodo(); });
});

// ── Toast ─────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3000);
}
