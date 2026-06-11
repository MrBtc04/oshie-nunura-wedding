/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN PANEL — Client-side JavaScript
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
let allRsvps = [];
let deleteTargetId = null;

// ─── DOM References ───────────────────────────────────────────────────────────
const loginView    = document.getElementById('login-view');
const dashView     = document.getElementById('dashboard-view');
const loginForm    = document.getElementById('login-form');
const loginBtn     = document.getElementById('login-btn');
const loginError   = document.getElementById('login-error');
const logoutBtn    = document.getElementById('logout-btn');
const mobileLogout = document.getElementById('mobile-logout-btn');
const mobileBurger = document.getElementById('mobile-menu-btn');
const sidebar      = document.querySelector('.sidebar');

const navButtons  = document.querySelectorAll('.sidebar-nav-btn');
const viewSections = document.querySelectorAll('.view-section');

const statTotal     = document.getElementById('stat-total');
const statAttending = document.getElementById('stat-attending');
const statNotAtt    = document.getElementById('stat-not-attending');
const statGuests    = document.getElementById('stat-guests');

const donutYes    = document.getElementById('donut-yes');
const donutNo     = document.getElementById('donut-no');
const donutCenter = document.getElementById('donut-center-num');
const legendAtt   = document.getElementById('legend-attending');
const legendNotAtt= document.getElementById('legend-not-attending');
const barFill     = document.getElementById('attend-bar-fill');
const barPct      = document.getElementById('attend-bar-pct');
const barEl       = document.querySelector('.attend-bar');
const tableAtt    = document.getElementById('table-attending');
const tableNotAtt = document.getElementById('table-not-attending');

const tableLoading = document.getElementById('table-loading');
const tableEmpty   = document.getElementById('table-empty');
const rsvpTable    = document.getElementById('rsvp-table');
const rsvpTbody    = document.getElementById('rsvp-tbody');
const tableCount   = document.getElementById('table-count');
const searchInput  = document.getElementById('search-input');
const searchClear  = document.getElementById('search-clear');

const modalBackdrop = document.getElementById('modal-backdrop');
const modalCancel   = document.getElementById('modal-cancel');
const modalConfirm  = document.getElementById('modal-confirm');

// ─── Utility ──────────────────────────────────────────────────────────────────
function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function showView(viewId) {
  viewSections.forEach(s => { s.hidden = s.id !== viewId; });
  navButtons.forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.view === viewId.replace('view-', ''));
  });

  // Lazy-load RSVPs when switching to that view
  if (viewId === 'view-rsvps') loadRsvps();
  closeMobileMenu();
}

navButtons.forEach(btn => {
  btn.addEventListener('click', () => showView(`view-${btn.dataset.view}`));
});

// Mobile menu
function openMobileMenu()  { sidebar?.classList.add('is-open'); mobileBurger?.setAttribute('aria-expanded', 'true'); }
function closeMobileMenu() { sidebar?.classList.remove('is-open'); mobileBurger?.setAttribute('aria-expanded', 'false'); }

mobileBurger?.addEventListener('click', () => {
  sidebar?.classList.contains('is-open') ? closeMobileMenu() : openMobileMenu();
});

// Close sidebar on backdrop click (mobile)
document.addEventListener('click', (e) => {
  if (sidebar?.classList.contains('is-open') && !sidebar.contains(e.target) && e.target !== mobileBurger) {
    closeMobileMenu();
  }
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function checkSession() {
  try {
    const res = await fetch('/api/admin/check');
    const data = await res.json();
    if (data.isAdmin) {
      showDashboard();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

function showLogin() {
  loginView.style.display = '';
  dashView.hidden = true;
}

function showDashboard() {
  loginView.style.display = 'none';
  dashView.hidden = false;
  loadStats();
}

async function logout() {
  try {
    await fetch('/api/admin/logout', { method: 'POST' });
  } catch {}
  showLogin();
}

logoutBtn?.addEventListener('click', logout);
mobileLogout?.addEventListener('click', logout);

// Login form
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';

  const password = document.getElementById('password')?.value;
  if (!password) {
    loginError.textContent = 'Please enter the password.';
    return;
  }

  loginBtn?.classList.add('is-loading');
  loginBtn.disabled = true;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showDashboard();
    } else {
      loginError.textContent = data.error || 'Incorrect password.';
      loginBtn?.classList.remove('is-loading');
      loginBtn.disabled = false;
    }
  } catch {
    loginError.textContent = 'Connection error. Please try again.';
    loginBtn?.classList.remove('is-loading');
    loginBtn.disabled = false;
  }
});

// ─── Stats & Chart ────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch('/api/admin/stats');
    if (!res.ok) return;
    const data = await res.json();
    updateStats(data);
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

function updateStats({ total, attending, notAttending, totalGuests }) {
  if (statTotal)     statTotal.textContent     = total;
  if (statAttending) statAttending.textContent = attending;
  if (statNotAtt)    statNotAtt.textContent    = notAttending;
  if (statGuests)    statGuests.textContent    = totalGuests;

  // Update chart
  if (legendAtt)    legendAtt.textContent    = attending;
  if (legendNotAtt) legendNotAtt.textContent = notAttending;
  if (tableAtt)     tableAtt.textContent     = attending;
  if (tableNotAtt)  tableNotAtt.textContent  = notAttending;
  if (donutCenter)  donutCenter.textContent  = total;

  // Donut chart — circumference = 2π × 60 ≈ 377
  const circ = 2 * Math.PI * 60;
  if (total > 0) {
    const yesFrac = attending / total;
    const noFrac  = notAttending / total;
    const yesArc  = yesFrac * circ;
    const noArc   = noFrac  * circ;
    const yesOffset = 0;
    const noOffset  = yesArc;

    if (donutYes) {
      donutYes.style.strokeDasharray  = `${yesArc} ${circ - yesArc}`;
      donutYes.style.strokeDashoffset = '';
    }
    if (donutNo) {
      donutNo.style.strokeDasharray   = `${noArc} ${circ - noArc}`;
      donutNo.style.strokeDashoffset  = `-${noOffset}`;
      donutNo.setAttribute('transform', `rotate(-90 80 80)`);
    }

    // Bar
    const pct = Math.round(yesFrac * 100);
    if (barFill) barFill.style.width = `${pct}%`;
    if (barPct)  barPct.textContent  = `${pct}%`;
    if (barEl)   barEl.setAttribute('aria-valuenow', pct);
  }
}

// ─── RSVP Table ───────────────────────────────────────────────────────────────
async function loadRsvps(search = '') {
  tableLoading.hidden = false;
  tableEmpty.hidden   = true;
  rsvpTable.hidden    = true;
  tableCount.textContent = '';

  try {
    const url = `/api/admin/rsvps${search ? `?search=${encodeURIComponent(search)}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load');
    allRsvps = await res.json();
    renderTable(allRsvps);
  } catch (err) {
    console.error(err);
    tableLoading.hidden = true;
    rsvpTbody.innerHTML = '';
    tableEmpty.hidden   = false;
  }
}

function renderTable(rows) {
  tableLoading.hidden = true;

  if (!rows || rows.length === 0) {
    rsvpTable.hidden  = true;
    tableEmpty.hidden = false;
    tableCount.textContent = 'No results found.';
    return;
  }

  tableEmpty.hidden = true;
  rsvpTable.hidden  = false;

  rsvpTbody.innerHTML = rows.map(r => `
    <tr data-id="${r.id}">
      <td class="td-name">${escapeHtml(r.name)}</td>
      <td class="td-email">${escapeHtml(r.email)}</td>
      <td class="td-phone">${escapeHtml(r.phone) || '—'}</td>
      <td class="td-guests">${r.guests}</td>
      <td>
        <span class="badge badge--${r.attending ? 'yes' : 'no'}">
          ${r.attending ? '✓ Yes' : '✗ No'}
        </span>
      </td>
      <td class="td-dietary">${escapeHtml(r.dietary) || '—'}</td>
      <td class="td-message">${escapeHtml(r.message) || '—'}</td>
      <td class="td-ts">${formatDate(r.created_at)}</td>
      <td>
        <button class="delete-btn" data-id="${r.id}" aria-label="Delete RSVP from ${escapeHtml(r.name)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');

  tableCount.textContent = `Showing ${rows.length} RSVP${rows.length !== 1 ? 's' : ''}`;

  // Wire up delete buttons
  rsvpTbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(parseInt(btn.dataset.id, 10), btn.closest('tr')?.querySelector('.td-name')?.textContent));
  });
}

// ─── Search ───────────────────────────────────────────────────────────────────
let searchTimer = null;

searchInput?.addEventListener('input', () => {
  const val = searchInput.value.trim();
  searchClear.hidden = !val;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadRsvps(val), 350);
});

searchClear?.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.hidden = true;
  loadRsvps();
  searchInput.focus();
});

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function openDeleteModal(id, name) {
  deleteTargetId = id;
  const body = document.getElementById('modal-body');
  if (body) body.textContent = `Are you sure you want to delete the RSVP from "${name || 'this guest'}"? This cannot be undone.`;
  modalBackdrop.hidden = false;
  modalConfirm?.focus();
}

function closeDeleteModal() {
  modalBackdrop.hidden = true;
  deleteTargetId = null;
}

modalCancel?.addEventListener('click', closeDeleteModal);

modalBackdrop?.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) closeDeleteModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalBackdrop.hidden) closeDeleteModal();
});

modalConfirm?.addEventListener('click', async () => {
  if (!deleteTargetId) return;
  modalConfirm.disabled = true;
  modalConfirm.textContent = 'Deleting…';

  try {
    const res = await fetch(`/api/admin/rsvps/${deleteTargetId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');

    // Remove row from DOM
    const row = rsvpTbody.querySelector(`tr[data-id="${deleteTargetId}"]`);
    row?.remove();

    // Update local state
    allRsvps = allRsvps.filter(r => r.id !== deleteTargetId);
    tableCount.textContent = `Showing ${allRsvps.length} RSVP${allRsvps.length !== 1 ? 's' : ''}`;

    if (allRsvps.length === 0) {
      rsvpTable.hidden  = true;
      tableEmpty.hidden = false;
    }

    closeDeleteModal();
    loadStats(); // Refresh stats after delete
  } catch (err) {
    console.error(err);
    closeDeleteModal();
    alert('Failed to delete RSVP. Please try again.');
  } finally {
    modalConfirm.disabled = false;
    modalConfirm.textContent = 'Delete';
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────
checkSession();
