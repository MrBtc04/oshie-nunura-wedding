/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN PANEL — JavaScript (JWT Auth)
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

// ─── Token Storage ────────────────────────────────────────────────────────────
const TOKEN_KEY = 'admin_token';

function getToken()         { return localStorage.getItem(TOKEN_KEY); }
function setToken(t)        { localStorage.setItem(TOKEN_KEY, t); }
function clearToken()       { localStorage.removeItem(TOKEN_KEY); }

// Attach auth header to every admin API call
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

// ─── DOM ──────────────────────────────────────────────────────────────────────
const loginView  = document.getElementById('login-view');
const dashView   = document.getElementById('dashboard-view');
const loginForm  = document.getElementById('login-form');
const loginBtn   = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const pwToggle   = document.getElementById('pw-toggle');
const pwField    = document.getElementById('password');
const eyeOpen    = document.getElementById('eye-open');
const eyeClosed  = document.getElementById('eye-closed');

const logoutBtn       = document.getElementById('logout-btn');
const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
const burgerBtn       = document.getElementById('burger-btn');
const sidebar         = document.getElementById('sidebar');
const topbarTitle     = document.getElementById('topbar-title');

const navItems   = document.querySelectorAll('.nav-item');
const views      = document.querySelectorAll('.view');

const statTotal      = document.getElementById('stat-total');
const statAttending  = document.getElementById('stat-attending');
const statNotAtt     = document.getElementById('stat-not-attending');
const statGuests     = document.getElementById('stat-guests');
const donutYes       = document.getElementById('donut-yes');
const donutNo        = document.getElementById('donut-no');
const donutCenter    = document.getElementById('donut-center-num');
const legendAtt      = document.getElementById('legend-attending');
const legendNotAtt   = document.getElementById('legend-not-attending');
const progressFill   = document.getElementById('progress-fill');
const progressPct    = document.getElementById('attend-pct');
const progressBarEl  = document.getElementById('progress-bar-el');
const lastUpdated    = document.getElementById('last-updated');

const tableLoading   = document.getElementById('table-loading');
const tableEmpty     = document.getElementById('table-empty');
const rsvpTable      = document.getElementById('rsvp-table');
const rsvpTbody      = document.getElementById('rsvp-tbody');
const tableCount     = document.getElementById('table-count');
const searchInput    = document.getElementById('search-input');
const searchClear    = document.getElementById('search-clear');
const exportBtn      = document.getElementById('export-btn');

const modalBackdrop  = document.getElementById('modal-backdrop');
const modalCancel    = document.getElementById('modal-cancel');
const modalConfirm   = document.getElementById('modal-confirm');
const modalBody      = document.getElementById('modal-body');

// ─── State ────────────────────────────────────────────────────────────────────
let allRsvps = [];
let deleteTargetId = null;
let currentFilter = 'all';

// ─── Utilities ────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleString('en-GB', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit',
  });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function checkSession() {
  const token = getToken();
  if (!token) { showLogin(); return; }

  try {
    const res = await fetch('/api/admin/check', { headers: authHeaders() });
    if (res.ok) {
      showDashboard();
    } else {
      clearToken();
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

function logout() {
  clearToken();
  showLogin();
}

logoutBtn?.addEventListener('click', logout);
mobileLogoutBtn?.addEventListener('click', logout);

// Login form
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';

  const password = pwField?.value;
  if (!password) { loginError.textContent = 'Please enter the password.'; return; }

  loginBtn.classList.add('is-loading');
  loginBtn.disabled = true;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      setToken(data.token);
      showDashboard();
    } else {
      loginError.textContent = data.error || 'Incorrect password.';
      loginBtn.classList.remove('is-loading');
      loginBtn.disabled = false;
    }
  } catch {
    loginError.textContent = 'Connection error. Please try again.';
    loginBtn.classList.remove('is-loading');
    loginBtn.disabled = false;
  }
});

// Password visibility toggle
pwToggle?.addEventListener('click', () => {
  const isHidden = pwField.type === 'password';
  pwField.type = isHidden ? 'text' : 'password';
  eyeOpen.hidden  =  isHidden;
  eyeClosed.hidden = !isHidden;
});

// ─── Navigation ───────────────────────────────────────────────────────────────
function showView(viewId, filter = 'all') {
  views.forEach(v => {
    v.hidden = v.id !== `view-${viewId}`;
    v.classList.toggle('active', v.id === `view-${viewId}`);
  });
  
  navItems.forEach(btn => {
    if (btn.dataset.view === viewId && (btn.dataset.filter || 'all') === filter) {
      btn.classList.add('is-active');
    } else if (btn.dataset.view !== 'rsvps' && btn.dataset.view === viewId) {
      btn.classList.add('is-active');
    } else {
      btn.classList.remove('is-active');
    }
  });

  const titles = { overview: 'Overview', rsvps: 'All RSVPs' };
  if (viewId === 'rsvps') {
    if (filter === 'wedding') titles.rsvps = 'Main Site RSVPs';
    else if (filter === 'meal') titles.rsvps = 'Menu Site RSVPs';
  }
  
  if (topbarTitle) topbarTitle.textContent = titles[viewId] || 'Dashboard';

  if (viewId === 'rsvps') {
    currentFilter = filter;
    if (allRsvps.length > 0) renderTable(allRsvps);
    else loadRsvps();
  }
  closeSidebar();
}

navItems.forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view, btn.dataset.filter || 'all')));

// Mobile sidebar
function openSidebar()  { sidebar?.classList.add('is-open'); burgerBtn?.classList.add('is-open'); burgerBtn?.setAttribute('aria-expanded','true'); }
function closeSidebar() { sidebar?.classList.remove('is-open'); burgerBtn?.classList.remove('is-open'); burgerBtn?.setAttribute('aria-expanded','false'); }

burgerBtn?.addEventListener('click', () => {
  sidebar?.classList.contains('is-open') ? closeSidebar() : openSidebar();
});

document.addEventListener('click', (e) => {
  if (sidebar?.classList.contains('is-open') && !sidebar.contains(e.target) && e.target !== burgerBtn && !burgerBtn?.contains(e.target)) {
    closeSidebar();
  }
});

// ─── Stats & Chart ────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch('/api/admin/stats', { headers: authHeaders() });
    if (res.status === 401) { logout(); return; }
    if (!res.ok) return;
    const data = await res.json();
    updateStats(data);
    if (lastUpdated) lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}`;
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

function updateStats(data) {
  const { total, attending, notAttending, totalGuests, events, menu } = data;
  if (statTotal)     statTotal.textContent     = total;
  if (statAttending) statAttending.textContent = attending;
  if (statNotAtt)    statNotAtt.textContent    = notAttending;
  if (statGuests)    statGuests.textContent    = totalGuests;

  if (legendAtt)   legendAtt.textContent   = attending;
  if (legendNotAtt)legendNotAtt.textContent = notAttending;
  if (donutCenter) donutCenter.textContent  = total;

  // Donut chart — circumference = 2π × 58 ≈ 364.4
  const circ = 2 * Math.PI * 58;
  if (total > 0) {
    const yesFrac = attending / total;
    const noFrac  = notAttending / total;
    const yesArc  = yesFrac * circ;
    const noArc   = noFrac  * circ;

    if (donutYes) donutYes.style.strokeDasharray = `${yesArc} ${circ - yesArc}`;
    if (donutNo)  {
      donutNo.style.strokeDasharray  = `${noArc} ${circ - noArc}`;
      donutNo.style.strokeDashoffset = `-${yesArc}`;
    }

    const pct = Math.round(yesFrac * 100);
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressPct)  progressPct.textContent  = `${pct}%`;
    if (progressBarEl) progressBarEl.setAttribute('aria-valuenow', pct);
  }

  const detailedBreakdown = document.getElementById('detailed-breakdown');
  if (detailedBreakdown && events && menu) {
    let menuHtml = '';
    const categories = [
      { key: 'starter', label: 'Starters' },
      { key: 'soup', label: 'Soups' },
      { key: 'main', label: 'Mains' },
      { key: 'dessert', label: 'Desserts' },
      { key: 'beverage', label: 'Beverages' }
    ];
    
    categories.forEach(cat => {
      const items = menu[cat.key];
      if (Object.keys(items).length > 0) {
        menuHtml += `<div style="margin-bottom: 8px;"><strong style="color: #fff;">${cat.label}:</strong><ul style="margin: 4px 0 0 16px; padding: 0;">`;
        for (const [name, count] of Object.entries(items)) {
          menuHtml += `<li>${name}: ${count}</li>`;
        }
        menuHtml += `</ul></div>`;
      }
    });

    detailedBreakdown.innerHTML = `
      <div style="margin-bottom: 24px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1);">
        <h4 style="font-size: 0.95rem; margin-bottom: 12px; color: var(--text-light);">Events Breakdown</h4>
        <div class="legend-row">
          <div class="legend-dot" style="background:#8EB1D1; width:6px; height:6px;"></div>
          <div><p class="legend-label">Church</p><p class="legend-val">${events.church}</p></div>
        </div>
        <div class="legend-row" style="margin-top:12px;">
          <div class="legend-dot" style="background:#8EB1D1; width:6px; height:6px;"></div>
          <div><p class="legend-label">Reception</p><p class="legend-val">${events.reception}</p></div>
        </div>
      </div>
      ${menuHtml ? `
        <div>
          <h4 style="font-size: 0.95rem; margin-bottom: 12px; color: var(--text-light);">Menu Selections</h4>
          <div style="font-size: 0.85rem; color: #a9b5c2; line-height: 1.5;">
            ${menuHtml}
          </div>
        </div>
      ` : ''}
    `;
  }
}

// ─── RSVP Table ───────────────────────────────────────────────────────────────
async function loadRsvps(search = '') {
  tableLoading.hidden = false;
  tableEmpty.hidden   = true;
  rsvpTable.hidden    = true;
  if (tableCount) tableCount.textContent = '';

  try {
    const url = `/api/admin/rsvps${search ? `?search=${encodeURIComponent(search)}` : ''}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (res.status === 401) { logout(); return; }
    if (!res.ok) throw new Error('Failed to load');
    allRsvps = await res.json();
    renderTable(allRsvps);
  } catch (err) {
    console.error(err);
    tableLoading.hidden = true;
    tableEmpty.hidden   = false;
  }
}

function renderTable(rows) {
  tableLoading.hidden = true;

  let filteredRows = rows || [];
  if (currentFilter !== 'all') {
    filteredRows = rows.filter(r => r.event_type === currentFilter);
  }

  if (filteredRows.length === 0) {
    rsvpTable.hidden  = true;
    tableEmpty.hidden = false;
    if (tableCount) tableCount.textContent = 'No results found.';
    return;
  }

  tableEmpty.hidden = true;
  rsvpTable.hidden  = false;

  rsvpTbody.innerHTML = filteredRows.map(r => `
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
      <td>
        <span class="badge badge--${r.event_type === 'meal' ? 'no' : 'yes'}">
          ${r.event_type === 'meal' ? 'Meal' : 'Wedding'}
        </span>
      </td>
      <td class="td-events-attending" title="${escapeHtml(r.events_attending)}">${escapeHtml(r.events_attending) || '—'}</td>
      <td class="td-dietary">${escapeHtml(r.dietary) || '—'}</td>
      <td class="td-menu-choices" title="${escapeHtml(r.menu_choices)}">${escapeHtml(r.menu_choices) || '—'}</td>
      <td class="td-message" title="${escapeHtml(r.message)}">${escapeHtml(r.message) || '—'}</td>
      <td class="td-ts">${formatDate(r.created_at)}</td>
      <td>
        <button class="delete-btn" data-id="${r.id}" aria-label="Delete RSVP from ${escapeHtml(r.name)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');

  if (tableCount) tableCount.textContent = `Showing ${filteredRows.length} RSVP${filteredRows.length !== 1 ? 's' : ''}`;

  rsvpTbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.closest('tr')?.querySelector('.td-name')?.textContent;
      openDeleteModal(parseInt(btn.dataset.id, 10), name);
    });
  });
}

// ─── Search ───────────────────────────────────────────────────────────────────
let searchTimer = null;

searchInput?.addEventListener('input', () => {
  const val = searchInput.value.trim();
  if (searchClear) searchClear.hidden = !val;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadRsvps(val), 350);
});

searchClear?.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.hidden = true;
  loadRsvps();
  searchInput.focus();
});

// ─── Export ───────────────────────────────────────────────────────────────────
exportBtn?.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/admin/export', { headers: authHeaders() });
    if (res.status === 401) { logout(); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rsvps-oshie-ninura.csv';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export failed:', err);
    alert('Export failed. Please try again.');
  }
});

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function openDeleteModal(id, name) {
  deleteTargetId = id;
  if (modalBody) modalBody.textContent = `Are you sure you want to delete the RSVP from "${name || 'this guest'}"? This cannot be undone.`;
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
  if (e.key === 'Escape' && !modalBackdrop?.hidden) closeDeleteModal();
});

modalConfirm?.addEventListener('click', async () => {
  if (!deleteTargetId) return;
  modalConfirm.disabled = true;
  modalConfirm.textContent = 'Deleting…';

  try {
    const res = await fetch(`/api/admin/rsvps/${deleteTargetId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.status === 401) { logout(); return; }
    if (!res.ok) throw new Error('Delete failed');

    const row = rsvpTbody.querySelector(`tr[data-id="${deleteTargetId}"]`);
    row?.remove();

    allRsvps = allRsvps.filter(r => r.id !== deleteTargetId);
    if (tableCount) tableCount.textContent = `Showing ${allRsvps.length} RSVP${allRsvps.length !== 1 ? 's' : ''}`;

    if (allRsvps.length === 0) {
      rsvpTable.hidden  = true;
      tableEmpty.hidden = false;
    }

    closeDeleteModal();
    loadStats();
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
