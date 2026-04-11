/* ============================================================
   LIA Tracker — Application Logic
   Data is persisted in localStorage under "lia_apps"
   ============================================================ */

const STORAGE_KEY = 'lia_apps';

// ── State ─────────────────────────────────────────
let apps = loadApps();
let editingId = null;

// ── Persistence ──────────────────────────────────
function loadApps() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { return []; }
}

function saveApps() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

// ── DOM Refs ──────────────────────────────────────
const form         = document.getElementById('app-form');
const editIdField  = document.getElementById('edit-id');
const submitBtn    = document.getElementById('submit-btn');
const cancelBtn    = document.getElementById('cancel-btn');
const formTitle    = document.getElementById('form-title');
const appList      = document.getElementById('app-list');
const emptyState   = document.getElementById('empty-state');
const searchInput  = document.getElementById('search');
const filterStatus = document.getElementById('filter-status');
const sortBy       = document.getElementById('sort-by');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle   = document.getElementById('modal-title');
const modalBody    = document.getElementById('modal-body');
const modalEditBtn = document.getElementById('modal-edit-btn');
const modalDelBtn  = document.getElementById('modal-delete-btn');
const modalClose   = document.getElementById('modal-close-btn');
const toast        = document.getElementById('toast');

// ── Form: Submit ──────────────────────────────────
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const entry = {
    id:          editingId || crypto.randomUUID(),
    company:     val('company'),
    role:        val('role'),
    location:    val('location'),
    dateApplied: val('date-applied'),
    deadline:    val('deadline'),
    status:      val('status'),
    link:        val('link'),
    notes:       val('notes'),
    createdAt:   editingId ? getApp(editingId)?.createdAt : Date.now(),
    updatedAt:   Date.now(),
  };

  if (editingId) {
    apps = apps.map(a => a.id === editingId ? entry : a);
    showToast('Application updated.');
  } else {
    apps.unshift(entry);
    showToast('Application added!');
  }

  saveApps();
  resetForm();
  render();
});

// ── Form: Cancel Edit ─────────────────────────────
cancelBtn.addEventListener('click', resetForm);

function resetForm() {
  editingId = null;
  form.reset();
  editIdField.value = '';
  formTitle.textContent = 'Add Application';
  submitBtn.textContent = 'Add Application';
  cancelBtn.style.display = 'none';
}

function populateForm(app) {
  editingId = app.id;
  setVal('company',      app.company);
  setVal('role',         app.role);
  setVal('location',     app.location);
  setVal('date-applied', app.dateApplied);
  setVal('deadline',     app.deadline);
  setVal('status',       app.status);
  setVal('link',         app.link);
  setVal('notes',        app.notes);
  formTitle.textContent  = 'Edit Application';
  submitBtn.textContent  = 'Save Changes';
  cancelBtn.style.display = 'inline-block';
  form.querySelector('#company').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Helpers ───────────────────────────────────────
function val(id) { return document.getElementById(id).value.trim(); }
function setVal(id, v) { document.getElementById(id).value = v || ''; }
function getApp(id) { return apps.find(a => a.id === id); }

function formatDate(iso) {
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

// ── Render ────────────────────────────────────────
function render() {
  updateStats();

  const search = searchInput.value.toLowerCase();
  const status = filterStatus.value;
  const sort   = sortBy.value;

  let filtered = apps.filter(a => {
    const matchSearch = !search ||
      a.company.toLowerCase().includes(search) ||
      a.role.toLowerCase().includes(search) ||
      (a.location || '').toLowerCase().includes(search);
    const matchStatus = !status || a.status === status;
    return matchSearch && matchStatus;
  });

  filtered.sort((a, b) => {
    if (sort === 'date-asc')  return a.dateApplied.localeCompare(b.dateApplied);
    if (sort === 'date-desc') return b.dateApplied.localeCompare(a.dateApplied);
    if (sort === 'company')   return a.company.localeCompare(b.company);
    if (sort === 'status')    return a.status.localeCompare(b.status);
    return 0;
  });

  appList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  filtered.forEach(app => {
    const card = document.createElement('div');
    card.className = `app-card status-${app.status}`;
    card.dataset.id = app.id;

    const deadlineHtml = app.deadline
      ? `<span>&#128197; Deadline ${formatDate(app.deadline)}</span>`
      : '';

    card.innerHTML = `
      <div class="card-main">
        <div class="card-company">${esc(app.company)}</div>
        <div class="card-role">${esc(app.role)}</div>
        <div class="card-meta">
          ${app.location ? `<span>&#128205; ${esc(app.location)}</span>` : ''}
          <span>&#128336; Applied ${formatDate(app.dateApplied)}</span>
          <span>${daysAgo(app.dateApplied)}</span>
          ${deadlineHtml}
        </div>
      </div>
      <div class="card-actions">
        <span class="badge badge-${app.status}">${statusLabel(app.status)}</span>
        <div style="display:flex;gap:6px;margin-top:4px;">
          <button class="btn btn-ghost btn-icon edit-btn" data-id="${app.id}" title="Edit">&#9998;</button>
          <button class="btn btn-danger btn-icon del-btn" data-id="${app.id}" title="Delete">&#128465;</button>
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.edit-btn') || e.target.closest('.del-btn')) return;
      openModal(app.id);
    });

    card.querySelector('.edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      closeModal();
      populateForm(getApp(app.id));
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
  const total      = apps.length;
  const applied    = apps.filter(a => a.status === 'Applied').length;
  const interview  = apps.filter(a => a.status === 'Interview' || a.status === 'Interviewed').length;
  const offer      = apps.filter(a => a.status === 'Offer').length;
  const rejected   = apps.filter(a => a.status === 'Rejected').length;

  document.getElementById('s-total').textContent    = total;
  document.getElementById('s-applied').textContent  = applied;
  document.getElementById('s-interview').textContent = interview;
  document.getElementById('s-offer').textContent    = offer;
  document.getElementById('s-rejected').textContent = rejected;
}

// ── Delete ────────────────────────────────────────
function deleteApp(id) {
  const app = getApp(id);
  if (!confirm(`Delete application to ${app?.company}?`)) return;
  apps = apps.filter(a => a.id !== id);
  saveApps();
  if (editingId === id) resetForm();
  closeModal();
  render();
  showToast('Application deleted.');
}

// ── Modal ─────────────────────────────────────────
function openModal(id) {
  const app = getApp(id);
  if (!app) return;

  modalTitle.textContent = `${app.company} — ${app.role}`;

  modalBody.innerHTML = `
    <div class="modal-body-grid">
      <div class="modal-field">
        <label>Company</label>
        <div class="val">${esc(app.company)}</div>
      </div>
      <div class="modal-field">
        <label>Status</label>
        <div class="val"><span class="badge badge-${app.status}">${statusLabel(app.status)}</span></div>
      </div>
      <div class="modal-field full">
        <label>Role</label>
        <div class="val">${esc(app.role)}</div>
      </div>
      ${app.location ? `
      <div class="modal-field">
        <label>Location</label>
        <div class="val">${esc(app.location)}</div>
      </div>` : ''}
      <div class="modal-field">
        <label>Date Applied</label>
        <div class="val">${formatDate(app.dateApplied)}</div>
      </div>
      ${app.deadline ? `
      <div class="modal-field">
        <label>Deadline</label>
        <div class="val">${formatDate(app.deadline)}</div>
      </div>` : ''}
      ${app.link ? `
      <div class="modal-field full">
        <label>Job Posting</label>
        <div class="val"><a href="${esc(app.link)}" target="_blank" rel="noopener">${esc(app.link)}</a></div>
      </div>` : ''}
      ${app.notes ? `
      <div class="modal-field full">
        <label>Notes</label>
        <div class="val" style="white-space:pre-wrap">${esc(app.notes)}</div>
      </div>` : ''}
    </div>
  `;

  modalEditBtn.onclick = () => { closeModal(); populateForm(app); };
  modalDelBtn.onclick  = () => deleteApp(id);

  modalOverlay.style.display = 'flex';
}

function closeModal() {
  modalOverlay.style.display = 'none';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ── Toast ─────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 2800);
}

// ── Filters / Search ──────────────────────────────
searchInput.addEventListener('input', render);
filterStatus.addEventListener('change', render);
sortBy.addEventListener('change', render);

// ── XSS Safety ───────────────────────────────────
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Status Label Map ──────────────────────────────
function statusLabel(s) {
  const map = {
    Applied:     'Applied',
    Interview:   'Interview Scheduled',
    Interviewed: 'Interviewed',
    Offer:       'Offer Received',
    Rejected:    'Rejected',
    Withdrawn:   'Withdrawn',
  };
  return map[s] || s;
}

// ── Set today as default date ─────────────────────
document.getElementById('date-applied').value = new Date().toISOString().split('T')[0];

// ── Initial Render ────────────────────────────────
render();
