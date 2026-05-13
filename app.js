// ─── Helpers ─────────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function getBadge(val, type = 'status') {
  if (type === 'priority') {
    const map = { high: 'badge-high', medium: 'badge-medium', low: 'badge-low' };
    return `<span class="badge ${map[val] || 'badge-medium'}">${esc(val)}</span>`;
  }
  const map   = { pending: 'badge-pending', 'in-progress': 'badge-in-progress', completed: 'badge-completed', cancelled: 'badge-high' };
  const label = { pending: 'Pending', 'in-progress': 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };
  return `<span class="badge ${map[val] || 'badge-pending'}">${label[val] || esc(val)}</span>`;
}

function getEmpName(id) { const e = SASIT.getEmployeeById(id); return e ? esc(e.name) : '—'; }

function getEmpCell(id) {
  const e = SASIT.getEmployeeById(id);
  if (!e) return '—';
  return `<div class="emp-cell"><div class="emp-avatar" style="width:28px;height:28px;font-size:11px">${esc(e.avatar)}</div><div class="emp-name" style="font-size:13px">${esc(e.name)}</div></div>`;
}

function getStatusSelectStyle(status) {
  const map = { pending: 'color:var(--yellow)', 'in-progress': 'color:var(--accent-light)', completed: 'color:var(--green)' };
  return map[status] || '';
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

// ─── Toast ───────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: '🔔', order: '📦', task: '✏️', chat: '💬' };
  const tc = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span class="toast-icon">${icons[type] || '🔔'}</span><span>${esc(msg)}</span>`;
  tc.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, 3500);
}

// ─── Page Router ─────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ─── Modal ───────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open');    }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ─── Notification Panel ──────────────────────────────────────────
let notifPanelOpen = false;
function toggleNotifPanel() {
  notifPanelOpen = !notifPanelOpen;
  document.getElementById('notif-panel').classList.toggle('open', notifPanelOpen);
  if (notifPanelOpen) renderNotifications();
}

function renderNotifications() {
  const userId = SASIT.currentRole === 'admin' ? 'ADMIN' : SASIT.currentUser.id;
  const notifs = SASIT.getNotifications(userId).slice(0, 30);
  const icons  = { order: '📦', task: '✏️', chat: '💬' };
  const list   = document.getElementById('notif-list');
  list.innerHTML = notifs.length
    ? notifs.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}">
          <div class="notif-msg">${icons[n.type] || '🔔'} ${esc(n.message)}</div>
          <div class="notif-time">${esc(n.time)}</div>
        </div>`).join('')
    : '<div class="empty-state"><div class="empty-icon">🔔</div><p>No notifications yet</p></div>';
  SASIT.markAllRead(userId);
  updateNotifDot();
}

function updateNotifDot() {
  const userId = SASIT.currentRole === 'admin' ? 'ADMIN' : SASIT.currentUser?.id;
  if (!userId) return;
  const count = SASIT.getUnreadCount(userId);
  document.querySelectorAll('.notif-dot').forEach(d => d.classList.toggle('show', count > 0));
}

// ─── Login ───────────────────────────────────────────────────────
let loginMode = 'admin';

function setLoginTab(mode) {
  loginMode = mode;
  document.querySelectorAll('.login-tab').forEach(t  => t.classList.toggle('active', t.dataset.mode === mode));
  document.querySelectorAll('.login-form').forEach(f => f.classList.toggle('active', f.id === `${mode}-form`));
  document.getElementById('login-error').style.display = 'none';
}

function doLogin() {
  const err = document.getElementById('login-error');
  err.style.display = 'none';
  if (loginMode === 'admin') {
    const u = document.getElementById('admin-user').value.trim();
    const p = document.getElementById('admin-pass').value.trim();
    if (SASIT.login(u, p, 'admin')) { showPage('admin-page'); initAdminDashboard(); }
    else { err.style.display = 'block'; err.textContent = 'Invalid username or password'; }
  } else {
    const e = document.getElementById('emp-email').value.trim();
    const p = document.getElementById('emp-id').value.trim();
    if (SASIT.login(e, p, 'employee')) { showPage('employee-page'); initEmployeeDashboard(); }
    else { err.style.display = 'block'; err.textContent = 'Invalid Email or Employee ID'; }
  }
}

function doLogout() {
  SASIT.logout();
  ['admin-user','admin-pass','emp-email','emp-id'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  showPage('login-page');
  notifPanelOpen = false;
  document.getElementById('notif-panel').classList.remove('open');
  currentDetailView = null;
}

// ─── Admin Management ─────────────────────────────────────────────
function renderAdmins() {
  const tbody  = document.getElementById('admin-tbody');
  if (!tbody) return;
  const admins = SASIT.data.admins || [];
  if (!admins.length) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">🛡</div><p>No admins found</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = admins.map(a => {
    const initials = (a.name || 'A').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    return `<tr class="fade-in">
      <td>
        <div class="emp-cell">
          <div class="emp-avatar" style="background:var(--orange-dim);border-color:rgba(249,115,22,0.3);color:var(--orange)">${esc(initials)}</div>
          <div><div class="emp-name">${esc(a.name)}</div><div class="emp-email">${esc(a.email || 'No email set')}</div></div>
        </div>
      </td>
      <td><code style="background:var(--bg-input);padding:3px 8px;border-radius:6px;font-size:13px">${esc(a.username)}</code></td>
      <td><span class="badge ${a.id === 'ADM001' ? 'badge-high' : 'badge-in-progress'}">${esc(a.type || 'Admin')}</span></td>
      <td>${esc(a.createdAt)}</td>
      <td>${a.id !== 'ADM001'
        ? `<button class="btn btn-sm btn-danger" onclick="deleteAdmin('${esc(a.id)}')">🗑 Remove</button>`
        : '<span style="font-size:12px;color:var(--text-muted)">🔒 Protected</span>'}</td>
    </tr>`;
  }).join('');
}

function submitAddAdmin() {
  const name     = document.getElementById('new-admin-name').value.trim();
  const username = document.getElementById('new-admin-username').value.trim();
  const password = document.getElementById('new-admin-password').value.trim();
  const email    = document.getElementById('new-admin-email').value.trim();
  if (!name || !username || !password) { showToast('Please fill all required fields', 'error'); return; }
  if (SASIT.data.admins.find(a => a.username === username)) { showToast('Username already taken', 'error'); return; }
  const admin = SASIT.addAdmin({ name, username, password, email });
  closeModal('add-admin-modal');
  document.getElementById('add-admin-form').reset();
  renderAdmins();
  showToast(`Admin "${admin.name}" created! Username: ${admin.username}`, 'success');
}

function deleteAdmin(id) {
  if (confirm('Remove this admin account?')) {
    const result = SASIT.deleteAdmin(id);
    if (result) { renderAdmins(); showToast('Admin removed', 'success'); }
    else showToast('Cannot delete Super Admin', 'error');
  }
}

// ─── Employee Profile / Stats ─────────────────────────────────────
function openEmpProfile(empId) {
  const emp = SASIT.getEmployeeById(empId);
  if (!emp) return;
  const tasks          = SASIT.getTasksForEmployee(empId);
  const orders         = SASIT.getOrdersForEmployee(empId);
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks   = tasks.filter(t => t.status === 'pending').length;
  const completedOrders= orders.filter(o => o.status === 'completed').length;
  const revenue        = orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.amount, 0);

  document.getElementById('emp-profile-title').textContent = `👤 ${emp.name}`;
  document.getElementById('emp-profile-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:20px;margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid var(--border)">
      <div style="width:72px;height:72px;border-radius:18px;background:var(--accent-dim);border:2px solid rgba(108,99,255,0.3);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--accent-light)">${esc(emp.avatar)}</div>
      <div>
        <div style="font-family:var(--font-display);font-size:22px;font-weight:800;margin-bottom:4px">${esc(emp.name)}</div>
        <div style="font-size:14px;color:var(--text-secondary)">${esc(emp.role)} &nbsp;·&nbsp; ${esc(emp.email)}</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:4px">📞 ${esc(emp.phone)} &nbsp;·&nbsp; Joined: ${esc(emp.joinDate)}</div>
      </div>
      <code style="margin-left:auto;background:var(--accent-dim);color:var(--accent-light);padding:6px 14px;border-radius:8px;font-size:15px;font-weight:700;border:1px solid rgba(108,99,255,0.3)">${esc(emp.id)}</code>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px">
      <div style="background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);padding:18px;text-align:center">
        <div style="font-family:var(--font-display);font-size:28px;font-weight:800;color:var(--accent-light)">${tasks.length}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Total Tasks</div>
      </div>
      <div style="background:var(--green-dim);border:1px solid rgba(34,211,165,0.2);border-radius:var(--radius);padding:18px;text-align:center">
        <div style="font-family:var(--font-display);font-size:28px;font-weight:800;color:var(--green)">${completedTasks}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Tasks Completed</div>
      </div>
      <div style="background:var(--orange-dim);border:1px solid rgba(249,115,22,0.2);border-radius:var(--radius);padding:18px;text-align:center">
        <div style="font-family:var(--font-display);font-size:28px;font-weight:800;color:var(--orange)">${pendingTasks}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Tasks Pending</div>
      </div>
      <div style="background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);padding:18px;text-align:center">
        <div style="font-family:var(--font-display);font-size:28px;font-weight:800;color:var(--accent-light)">${orders.length}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Total Orders</div>
      </div>
      <div style="background:var(--green-dim);border:1px solid rgba(34,211,165,0.2);border-radius:var(--radius);padding:18px;text-align:center">
        <div style="font-family:var(--font-display);font-size:28px;font-weight:800;color:var(--green)">${completedOrders}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Orders Completed</div>
      </div>
      <div style="background:var(--green-dim);border:1px solid rgba(34,211,165,0.2);border-radius:var(--radius);padding:18px;text-align:center">
        <div style="font-family:var(--font-display);font-size:26px;font-weight:800;color:var(--green)">₹${revenue.toLocaleString('en-IN')}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Revenue Generated</div>
      </div>
    </div>
    ${tasks.length ? `
    <div style="margin-bottom:20px">
      <div style="font-family:var(--font-display);font-size:15px;font-weight:700;margin-bottom:12px">Recent Tasks</div>
      ${tasks.slice(0, 3).map(t => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-input);border-radius:var(--radius-sm);margin-bottom:8px;border:1px solid var(--border)">
          <span style="font-size:14px">${esc(t.title)}</span>
          <div style="display:flex;gap:8px">${getBadge(t.priority, 'priority')} ${getBadge(t.status)}</div>
        </div>`).join('')}
    </div>` : ''}
    ${orders.length ? `
    <div>
      <div style="font-family:var(--font-display);font-size:15px;font-weight:700;margin-bottom:12px">Recent Orders</div>
      ${orders.slice(0, 3).map(o => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-input);border-radius:var(--radius-sm);margin-bottom:8px;border:1px solid var(--border)">
          <div><span style="font-size:14px;font-weight:500">${esc(o.clientName)}</span><span style="font-size:12px;color:var(--text-muted);margin-left:8px">${esc(o.type)}</span></div>
          <div style="display:flex;gap:8px;align-items:center"><span style="font-size:13px;font-weight:700;color:var(--green)">₹${o.amount.toLocaleString('en-IN')}</span>${getBadge(o.status)}</div>
        </div>`).join('')}
    </div>` : ''}
  `;
  openModal('emp-profile-modal');
}

// ─── Admin Dashboard ─────────────────────────────────────────────
function initAdminDashboard() {
  const admin = SASIT.currentUser;
  document.querySelector('#admin-page .user-name').textContent = admin.name;
  document.querySelector('#admin-page .user-id').textContent   = admin.username || 'Admin';
  document.querySelector('#admin-page .user-avatar').textContent = admin.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  updateNotifDot();
  showAdminTab('dashboard');
}

function showAdminTab(tab) {
  const adminPage = document.getElementById('admin-page');
  adminPage.querySelectorAll('.nav-item[data-tab]').forEach(n => n.classList.toggle('active', n.dataset.tab === tab));
  const allTabs = ['dashboard','employees','tasks','orders','chat','admins','settings'];
  allTabs.forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });
  const titles = { dashboard: 'Dashboard', employees: 'Employees', tasks: 'Tasks', orders: 'Orders', chat: 'Team Chat', admins: 'Manage Admins', settings: 'Settings' };
  document.getElementById('admin-topbar-title').textContent = titles[tab] || 'Dashboard';
  currentDetailView = null;
  if (tab === 'dashboard')  renderAdminDashboard();
  if (tab === 'employees')  { renderEmployees(); renderEmployeeTabs(); }
  if (tab === 'tasks')      renderTasks();
  if (tab === 'orders')     renderOrders();
  if (tab === 'chat')       renderAdminChat();
  if (tab === 'admins')     renderAdmins();
  if (tab === 'settings')   renderSettings();
}

function renderAdminDashboard() {
  const s = SASIT.getStats();
  document.getElementById('stat-employees').textContent   = s.totalEmployees;
  document.getElementById('stat-pending-tasks').textContent = s.pendingTasks;
  document.getElementById('stat-total-orders').textContent  = s.totalOrders;
  document.getElementById('stat-revenue').textContent       = '₹' + s.totalRevenue.toLocaleString('en-IN');
  renderRecentActivity();
}

function renderRecentActivity() {
  const tasks  = SASIT.data.tasks.slice(-3).reverse();
  const orders = SASIT.data.orders.slice(-3).reverse();
  const el = document.getElementById('recent-activity');
  el.innerHTML = [...tasks.map(t => `
    <tr class="fade-in">
      <td><span style="opacity:0.5">✏️</span> ${esc(t.title)}</td>
      <td>${getEmpName(t.assignedTo)}</td>
      <td>${getBadge(t.priority, 'priority')}</td>
      <td>${getBadge(t.status)}</td>
      <td>${esc(t.deadline)}</td>
    </tr>`),
    ...orders.map(o => `
    <tr class="fade-in">
      <td><span style="opacity:0.5">📦</span> ${esc(o.clientName)}</td>
      <td>${getEmpName(o.assignedTo)}</td>
      <td>—</td>
      <td>${getBadge(o.status)}</td>
      <td>${esc(o.createdAt)}</td>
    </tr>`)].join('');
}

// ─── Per-Employee Tabs (Admin view) ──────────────────────────────
let activeEmpTabId = null;

function renderEmployeeTabs() {
  const container = document.getElementById('emp-tabs-nav');
  if (!container) return;
  const emps = SASIT.data.employees;
  if (!emps.length) {
    container.innerHTML = '<div style="color:var(--text-muted);font-size:14px;padding:12px">No employees yet</div>';
    document.getElementById('emp-tab-content').innerHTML = '';
    return;
  }
  if (!activeEmpTabId || !emps.find(e => e.id === activeEmpTabId)) {
    activeEmpTabId = emps[0].id;
  }
  container.innerHTML = emps.map(e => `
    <button class="emp-person-tab ${activeEmpTabId === e.id ? 'active' : ''}" onclick="selectEmpTab('${esc(e.id)}')">
      <span class="emp-avatar" style="width:24px;height:24px;font-size:10px;flex-shrink:0">${esc(e.avatar)}</span>
      ${esc(e.name)}
    </button>`).join('');
  renderEmpTabContent(activeEmpTabId);
}

function selectEmpTab(empId) {
  activeEmpTabId = empId;
  document.querySelectorAll('.emp-person-tab').forEach(b => b.classList.toggle('active', b.onclick.toString().includes(empId)));
  // Re-draw buttons properly
  renderEmployeeTabs();
}

function renderEmpTabContent(empId) {
  const emp    = SASIT.getEmployeeById(empId);
  const tasks  = SASIT.getTasksForEmployee(empId);
  const orders = SASIT.getOrdersForEmployee(empId);
  const container = document.getElementById('emp-tab-content');
  if (!container || !emp) return;

  // Group orders by date
  const ordersByDate = {};
  orders.forEach(o => {
    const d = o.createdAt || 'Unknown';
    if (!ordersByDate[d]) ordersByDate[d] = [];
    ordersByDate[d].push(o);
  });
  const sortedDates = Object.keys(ordersByDate).sort((a,b) => b.localeCompare(a));

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:14px">
        <div class="emp-avatar" style="width:48px;height:48px;font-size:16px">${esc(emp.avatar)}</div>
        <div>
          <div style="font-family:var(--font-display);font-size:18px;font-weight:800">${esc(emp.name)}</div>
          <div style="font-size:13px;color:var(--text-muted)">${esc(emp.role)} · ${esc(emp.id)}</div>
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-sm btn-secondary" onclick="downloadMonthlyTaskReport('${esc(empId)}')">📥 Monthly Task CSV</button>
        <button class="btn btn-sm btn-secondary" onclick="openEmpProfile('${esc(empId)}')">📊 Full Profile</button>
      </div>
    </div>

    <!-- Tasks section -->
    <div style="margin-bottom:32px">
      <div class="section-title" style="margin-bottom:14px">✅ Assigned Tasks (${tasks.length})</div>
      ${tasks.length ? `
      <div class="table-container">
        <table>
          <thead><tr><th>Task</th><th>Priority</th><th>Status</th><th>Deadline</th><th>Actions</th></tr></thead>
          <tbody>
            ${tasks.map(t => `
            <tr class="fade-in">
              <td>
                <div style="font-weight:500">${esc(t.title)}</div>
                <div style="font-size:12px;color:var(--text-muted)">${esc(t.description.slice(0,50))}${t.description.length>50?'...':''}</div>
              </td>
              <td>${getBadge(t.priority, 'priority')}</td>
              <td>${getBadge(t.status)}</td>
              <td>${esc(t.deadline)}</td>
              <td>
                <button class="btn btn-sm btn-secondary" onclick="openDetailView('task','${esc(t.id)}')">👁 View</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : `<div class="empty-state" style="padding:30px 0"><div class="empty-icon" style="font-size:32px">✏️</div><p>No tasks assigned</p></div>`}
    </div>

    <!-- Orders by day section -->
    <div>
      <div class="section-title" style="margin-bottom:14px">📦 Orders by Day (${orders.length})</div>
      ${sortedDates.length ? sortedDates.map(date => `
        <div style="margin-bottom:20px">
          <div style="font-size:13px;font-weight:700;color:var(--text-secondary);background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 14px;margin-bottom:10px;display:inline-block">
            📅 ${esc(date)} — ${ordersByDate[date].length} order${ordersByDate[date].length>1?'s':''}
          </div>
          <div class="table-container">
            <table>
              <thead><tr><th>Client</th><th>Type</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${ordersByDate[date].map(o => `
                <tr class="fade-in">
                  <td>
                    <div style="font-weight:600">${esc(o.clientName)}</div>
                    <a class="order-link" href="${esc(o.link)}" target="_blank" style="font-size:12px">${esc(o.link.replace('https://','').replace('http://',''))}</a>
                  </td>
                  <td>${esc(o.type)}</td>
                  <td style="font-weight:700;color:var(--green)">₹${o.amount.toLocaleString('en-IN')}</td>
                  <td>${getBadge(o.status)}</td>
                  <td><button class="btn btn-sm btn-secondary" onclick="openDetailView('order','${esc(o.id)}')">👁 View</button></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`).join('')
      : `<div class="empty-state" style="padding:30px 0"><div class="empty-icon" style="font-size:32px">📦</div><p>No orders assigned</p></div>`}
    </div>
  `;
}

// ─── Monthly Task CSV Download ────────────────────────────────────
function downloadMonthlyTaskReport(empId) {
  const emp   = SASIT.getEmployeeById(empId);
  const tasks = SASIT.getTasksForEmployee(empId);
  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();

  // Filter tasks created this month
  const monthTasks = tasks.filter(t => {
    const d = new Date(t.createdAt);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const monthName = now.toLocaleString('en-IN', { month: 'long' });
  const rows = [
    ['SASIT Monthly Task Report'],
    [`Employee: ${emp ? emp.name : empId}`, `Month: ${monthName} ${year}`],
    [],
    ['Task ID', 'Title', 'Description', 'Priority', 'Status', 'Deadline', 'Assigned On'],
    ...monthTasks.map(t => [
      t.id, t.title, t.description, t.priority, t.status, t.deadline, t.createdAt
    ])
  ];

  if (!monthTasks.length) {
    rows.push(['', 'No tasks found for this month', '', '', '', '', '']);
  }

  // Summary rows
  rows.push([]);
  rows.push(['Summary']);
  rows.push(['Total Tasks', monthTasks.length]);
  rows.push(['Completed',   monthTasks.filter(t => t.status==='completed').length]);
  rows.push(['In Progress', monthTasks.filter(t => t.status==='in-progress').length]);
  rows.push(['Pending',     monthTasks.filter(t => t.status==='pending').length]);

  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${emp ? emp.name.replace(/\s+/g,'_') : empId}_Tasks_${monthName}_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`CSV downloaded for ${emp ? emp.name : empId}`, 'success');
}

// ─── Employees ───────────────────────────────────────────────────
function renderEmployees() {
  const tbody = document.getElementById('emp-tbody');
  tbody.innerHTML = SASIT.data.employees.map(e => `
    <tr class="fade-in">
      <td>
        <div class="emp-cell" style="cursor:pointer" onclick="openEmpProfile('${esc(e.id)}')">
          <div class="emp-avatar">${esc(e.avatar)}</div>
          <div><div class="emp-name">${esc(e.name)}</div><div class="emp-email">${esc(e.email)}</div></div>
        </div>
      </td>
      <td><code style="background:var(--accent-dim);color:var(--accent-light);padding:4px 10px;border-radius:6px;font-size:13px;border:1px solid rgba(108,99,255,0.25)">${esc(e.id)}</code></td>
      <td>${esc(e.role)}</td>
      <td>${esc(e.phone)}</td>
      <td>${esc(e.joinDate)}</td>
      <td>
        <div class="actions-row">
          <button class="btn btn-sm btn-secondary" onclick="openEmpProfile('${esc(e.id)}')">📊 Stats</button>
          <button class="btn btn-sm btn-danger"    onclick="deleteEmployee('${esc(e.id)}')">🗑</button>
        </div>
      </td>
    </tr>`).join('')
    || `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">👤</div><p>No employees yet</p></div></td></tr>`;
}

function deleteEmployee(id) {
  if (confirm('Delete this employee?')) { SASIT.deleteEmployee(id); renderEmployees(); renderEmployeeTabs(); showToast('Employee deleted', 'success'); }
}

function openAddEmp() { document.getElementById('add-emp-form').reset(); openModal('add-emp-modal'); }

function submitAddEmp() {
  const name    = document.getElementById('new-emp-name').value.trim();
  const email   = document.getElementById('new-emp-email').value.trim();
  const role    = document.getElementById('new-emp-role').value.trim();
  const phone   = document.getElementById('new-emp-phone').value.trim();
  const empEmail= document.getElementById('new-emp-gmail').value.trim();
  if (!name || !email || !role || !phone) { showToast('Please fill all required fields', 'error'); return; }
  if (SASIT.data.employees.find(e => e.email.toLowerCase() === email.toLowerCase())) {
    showToast('An employee with this email already exists', 'error'); return;
  }
  const emp = SASIT.addEmployee({ name, email, role, phone, gmailNotify: empEmail });
  closeModal('add-emp-modal');
  renderEmployees();
  renderEmployeeTabs();
  showToast(`Employee ${emp.name} added! ID: ${emp.id}`, 'success');
}

// ─── Tasks ───────────────────────────────────────────────────────
function renderTasks() {
  const tasks = SASIT.data.tasks;
  const tbody = document.getElementById('task-tbody');
  tbody.innerHTML = tasks.map(t => `
    <tr class="fade-in">
      <td>
        <div style="font-weight:500">${esc(t.title)}</div>
        <div style="font-size:12px;color:var(--text-muted)">${esc(t.description.slice(0,50))}${t.description.length>50?'...':''}</div>
      </td>
      <td>${getEmpCell(t.assignedTo)}</td>
      <td>${getBadge(t.priority, 'priority')}</td>
      <td>${getBadge(t.status)}</td>
      <td>${esc(t.deadline)}</td>
      <td>
        <div class="actions-row">
          <button class="btn btn-sm btn-secondary" onclick="openDetailView('task','${esc(t.id)}')">👁 View</button>
          <button class="btn btn-sm btn-danger"    onclick="deleteTask('${esc(t.id)}')">🗑</button>
        </div>
      </td>
    </tr>`).join('')
    || `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">✏️</div><p>No tasks yet</p></div></td></tr>`;
}

function openAddTask() {
  const sel = document.getElementById('task-assign-sel');
  sel.innerHTML = SASIT.data.employees.map(e => `<option value="${esc(e.id)}">${esc(e.name)} (${esc(e.id)})</option>`).join('');
  document.getElementById('add-task-form').reset();
  openModal('add-task-modal');
}

function submitAddTask() {
  const title      = document.getElementById('task-title').value.trim();
  const description= document.getElementById('task-desc').value.trim();
  const assignedTo = document.getElementById('task-assign-sel').value;
  const priority   = document.getElementById('task-priority').value;
  const deadline   = document.getElementById('task-deadline').value;
  if (!title || !assignedTo || !deadline) { showToast('Please fill required fields', 'error'); return; }
  const task = SASIT.addTask({ title, description, assignedTo, priority, deadline });
  closeModal('add-task-modal');
  renderTasks();
  const emp = SASIT.getEmployeeById(assignedTo);
  if (emp?.gmailNotify) sendEmail(emp.gmailNotify, `New Task Assigned: ${title}`, `Hello ${emp.name},\n\nA new task has been assigned to you.\n\nTask: ${title}\nPriority: ${priority}\nDeadline: ${deadline}\nDescription: ${description}\n\n- SASIT Team`);
  showToast(`Task assigned to ${SASIT.getEmployeeById(assignedTo)?.name}!`, 'success');
}

function deleteTask(id) {
  if (confirm('Delete this task?')) { SASIT.deleteTask(id); renderTasks(); showToast('Task deleted', 'success'); }
}

// ─── Orders ──────────────────────────────────────────────────────
function renderOrders() {
  const orders = SASIT.data.orders;
  const tbody  = document.getElementById('order-tbody');
  tbody.innerHTML = orders.map(o => `
    <tr class="fade-in">
      <td><div style="font-weight:600">${esc(o.clientName)}</div><div style="font-size:12px;color:var(--text-muted)">${esc(o.type)}</div></td>
      <td><a class="order-link" href="${esc(o.link)}" target="_blank">${esc(o.link.replace('https://','').replace('http://',''))}</a></td>
      <td>${getEmpCell(o.assignedTo)}</td>
      <td style="font-family:var(--font-display);font-weight:700;color:var(--green)">₹${o.amount.toLocaleString('en-IN')}</td>
      <td>${getBadge(o.status)}</td>
      <td>${esc(o.createdAt)}</td>
      <td>
        <div class="actions-row">
          <button class="btn btn-sm btn-secondary" onclick="openDetailView('order','${esc(o.id)}')">👁 View</button>
          <button class="btn btn-sm btn-danger"    onclick="deleteOrder('${esc(o.id)}')">🗑</button>
        </div>
      </td>
    </tr>`).join('')
    || `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📦</div><p>No orders yet</p></div></td></tr>`;
}

function openAddOrder() {
  const sel = document.getElementById('order-assign-sel');
  sel.innerHTML = `<option value="">Unassigned</option>` + SASIT.data.employees.map(e => `<option value="${esc(e.id)}">${esc(e.name)} (${esc(e.id)})</option>`).join('');
  document.getElementById('add-order-form').reset();
  openModal('add-order-modal');
}

function submitAddOrder() {
  const clientName = document.getElementById('order-client').value.trim();
  const link       = document.getElementById('order-link-input').value.trim();
  const type       = document.getElementById('order-type').value.trim();
  const pages      = parseInt(document.getElementById('order-pages').value) || 0;
  const amount     = parseFloat(document.getElementById('order-amount').value) || 0;
  const assignedTo = document.getElementById('order-assign-sel').value || null;
  const notes      = document.getElementById('order-notes').value.trim();
  if (!clientName || !link || !type || !amount) { showToast('Please fill required fields', 'error'); return; }
  const order = SASIT.addOrder({ clientName, link, type, pages, amount, assignedTo, notes });
  closeModal('add-order-modal');
  renderOrders();
  if (assignedTo) {
    const emp = SASIT.getEmployeeById(assignedTo);
    if (emp?.gmailNotify) sendEmail(emp.gmailNotify, `New Order Assigned: ${clientName}`, `Hello ${emp.name},\n\nA new order has been assigned to you.\n\nClient: ${clientName}\nType: ${type}\nLink: ${link}\nAmount: ₹${amount}\nNotes: ${notes || 'None'}\n\n- SASIT Team`);
  }
  showToast(`Order for ${order.clientName} created!`, 'success');
}

function deleteOrder(id) {
  if (confirm('Delete this order?')) { SASIT.deleteOrder(id); renderOrders(); showToast('Order deleted', 'success'); }
}

// ─── Detail View ─────────────────────────────────────────────────
let currentDetailView = null;

function openDetailView(type, id) {
  currentDetailView = { type, id };
  const item = type === 'task'
    ? SASIT.data.tasks.find(t => t.id === id)
    : SASIT.data.orders.find(o => o.id === id);
  if (!item) return;

  const emp = SASIT.getEmployeeById(item.assignedTo);

  const detailHtml = type === 'task' ? `
    <div class="detail-grid">
      <div class="detail-field"><div class="detail-label">Task ID</div><div class="detail-value">${esc(item.id)}</div></div>
      <div class="detail-field"><div class="detail-label">Status</div><div class="detail-value">${getBadge(item.status)}</div></div>
      <div class="detail-field"><div class="detail-label">Priority</div><div class="detail-value">${getBadge(item.priority,'priority')}</div></div>
      <div class="detail-field"><div class="detail-label">Assigned To</div><div class="detail-value">${emp ? esc(emp.name) : '—'}</div></div>
      <div class="detail-field"><div class="detail-label">Deadline</div><div class="detail-value">${esc(item.deadline)}</div></div>
      <div class="detail-field"><div class="detail-label">Created On</div><div class="detail-value">${esc(item.createdAt)}</div></div>
    </div>
    <div class="detail-field" style="margin-top:16px">
      <div class="detail-label">Description</div>
      <div class="detail-desc">${esc(item.description || 'No description provided.')}</div>
    </div>` : `
    <div class="detail-grid">
      <div class="detail-field"><div class="detail-label">Order ID</div><div class="detail-value">${esc(item.id)}</div></div>
      <div class="detail-field"><div class="detail-label">Status</div><div class="detail-value">${getBadge(item.status)}</div></div>
      <div class="detail-field"><div class="detail-label">Type</div><div class="detail-value">${esc(item.type)}</div></div>
      <div class="detail-field"><div class="detail-label">Assigned To</div><div class="detail-value">${emp ? esc(emp.name) : '—'}</div></div>
      <div class="detail-field"><div class="detail-label">Pages</div><div class="detail-value">${esc(String(item.pages))}</div></div>
      <div class="detail-field"><div class="detail-label">Amount</div><div class="detail-value" style="color:var(--green);font-weight:700">₹${item.amount.toLocaleString('en-IN')}</div></div>
      <div class="detail-field"><div class="detail-label">Created On</div><div class="detail-value">${esc(item.createdAt)}</div></div>
      <div class="detail-field"><div class="detail-label">Link</div><div class="detail-value"><a href="${esc(item.link)}" target="_blank" class="order-link">${esc(item.link)}</a></div></div>
    </div>
    ${item.notes ? `<div class="detail-field" style="margin-top:16px"><div class="detail-label">Notes</div><div class="detail-desc">${esc(item.notes)}</div></div>` : ''}`;

  const comments = item.comments || [];
  const commentsHtml = `
    <div class="comments-section">
      <div class="comments-title">💬 Comments (${comments.length})</div>
      <div class="comments-list" id="comments-list">
        ${comments.length ? comments.map(c => `
          <div class="comment-item ${c.authorId === 'ADMIN' ? 'comment-admin' : 'comment-emp'}">
            <div class="comment-header">
              <span class="comment-author">${esc(c.author)}</span>
              <span class="comment-time">${esc(c.date)} · ${esc(c.time)}</span>
            </div>
            <div class="comment-text">${esc(c.text)}</div>
          </div>`).join('')
          : '<div style="color:var(--text-muted);font-size:14px;padding:12px 0">No comments yet. Be the first to add one!</div>'}
      </div>
      <div class="comment-input-row">
        <input class="form-input" id="new-comment-input" placeholder="Write a comment..." style="flex:1">
        <button class="btn btn-primary btn-sm" onclick="submitComment()">Send</button>
      </div>
    </div>`;

  document.getElementById('detail-modal-title').textContent = type === 'task' ? `✏️ ${item.title}` : `📦 ${item.clientName}`;
  document.getElementById('detail-modal-body').innerHTML = detailHtml + commentsHtml;
  openModal('detail-modal');

  setTimeout(() => {
    const inp = document.getElementById('new-comment-input');
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') submitComment(); });
  }, 100);
}

function submitComment() {
  if (!currentDetailView) return;
  const input = document.getElementById('new-comment-input');
  const text  = input.value.trim();
  if (!text) return;
  SASIT.addComment(currentDetailView.type, currentDetailView.id, text);
  input.value = '';
  openDetailView(currentDetailView.type, currentDetailView.id);
  showToast('Comment added', 'success');
}

// ─── Admin Chat ───────────────────────────────────────────────────
let activeChatEmpId = null;

function renderAdminChat() {
  const empList = document.getElementById('chat-emp-list');
  empList.innerHTML = SASIT.data.employees.map(e => {
    const msgs = SASIT.getChatMessages(e.id);
    const last = msgs[msgs.length - 1];
    const lastText = last ? (last.text.length > 30 ? last.text.slice(0, 30) + '…' : last.text) : 'No messages yet';
    return `
      <div class="chat-emp-item ${activeChatEmpId === e.id ? 'active' : ''}" onclick="selectChatEmployee('${esc(e.id)}')">
        <div class="emp-avatar" style="width:38px;height:38px">${esc(e.avatar)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px">${esc(e.name)}</div>
          <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(lastText)}</div>
        </div>
      </div>`;
  }).join('') || '<div style="padding:20px;color:var(--text-muted);font-size:14px">No employees found</div>';

  if (activeChatEmpId) selectChatEmployee(activeChatEmpId);
  else renderChatEmpty();
}

function renderChatEmpty() {
  document.getElementById('chat-messages-area').innerHTML = `
    <div class="empty-state" style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center">
      <div class="empty-icon">💬</div><p>Select an employee to start chatting</p>
    </div>`;
  document.getElementById('chat-input-row').style.display = 'none';
}

function selectChatEmployee(empId) {
  activeChatEmpId = empId;
  const emp = SASIT.getEmployeeById(empId);
  document.getElementById('chat-emp-name').textContent = emp ? `${emp.name} (${emp.role})` : '';
  document.getElementById('chat-input-row').style.display = 'flex';
  renderAdminChatMessages();
  // Update active highlight without full re-render
  document.querySelectorAll('.chat-emp-item').forEach(el => {
    el.classList.toggle('active', el.onclick && el.getAttribute('onclick') && el.getAttribute('onclick').includes(empId));
  });
}

function renderAdminChatMessages() {
  if (!activeChatEmpId) return;
  const msgs = SASIT.getChatMessages(activeChatEmpId);
  const area = document.getElementById('chat-messages-area');
  area.innerHTML = msgs.length ? msgs.map(m => `
    <div class="chat-msg ${m.from === 'ADMIN' ? 'chat-msg-me' : 'chat-msg-them'}">
      <div class="chat-bubble">${esc(m.text)}</div>
      <div class="chat-meta">${esc(m.time)}</div>
    </div>`).join('')
    : '<div style="text-align:center;color:var(--text-muted);padding:40px;font-size:14px">No messages yet. Say hello! 👋</div>';
  area.scrollTop = area.scrollHeight;
}

function sendAdminChatMessage() {
  if (!activeChatEmpId) return;
  const input = document.getElementById('admin-chat-input');
  const text  = input.value.trim();
  if (!text) return;
  SASIT.sendChatMessage(activeChatEmpId, text);
  input.value = '';
  renderAdminChatMessages();
  // Only re-render the sidebar preview without losing active state
  const empList = document.getElementById('chat-emp-list');
  empList.querySelectorAll('.chat-emp-item').forEach(el => {
    const onclick = el.getAttribute('onclick') || '';
    const id = (onclick.match(/'([^']+)'/) || [])[1];
    if (id) {
      const msgs = SASIT.getChatMessages(id);
      const last = msgs[msgs.length - 1];
      const lastText = last ? (last.text.length > 30 ? last.text.slice(0, 30) + '…' : last.text) : 'No messages yet';
      const preview = el.querySelector('div > div:last-child');
      if (preview) preview.textContent = lastText;
    }
  });
}

// ─── Employee Chat ────────────────────────────────────────────────
function renderEmployeeChat() {
  const msgs = SASIT.getChatMessages(SASIT.currentUser.id);
  const area = document.getElementById('emp-chat-messages');
  area.innerHTML = msgs.length ? msgs.map(m => `
    <div class="chat-msg ${m.from === SASIT.currentUser.id ? 'chat-msg-me' : 'chat-msg-them'}">
      <div class="chat-bubble">${esc(m.text)}</div>
      <div class="chat-meta">${esc(m.fromName)} · ${esc(m.time)}</div>
    </div>`).join('')
    : '<div style="text-align:center;color:var(--text-muted);padding:40px;font-size:14px">No messages yet. Send a message to Admin! 👋</div>';
  area.scrollTop = area.scrollHeight;
}

function sendEmpChatMessage() {
  const input = document.getElementById('emp-chat-input');
  const text  = input.value.trim();
  if (!text) return;
  SASIT.sendChatMessage('ADMIN', text);
  input.value = '';
  renderEmployeeChat();
  updateNotifDot();
}

// ─── Employee Dashboard ───────────────────────────────────────────
function initEmployeeDashboard() {
  const emp = SASIT.currentUser;
  document.getElementById('emp-user-name').textContent    = emp.name;
  document.getElementById('emp-user-id').textContent      = emp.id;
  document.getElementById('emp-user-avatar').textContent  = emp.avatar;
  document.getElementById('emp-topbar-user').textContent  = emp.name;
  updateNotifDot();
  showEmpTab('my-tasks');
}

function showEmpTab(tab) {
  const allEmpTabs = ['my-tasks','my-orders','link-exchange','chat'];
  document.getElementById('employee-page').querySelectorAll('.emp-nav-item').forEach(n =>
    n.classList.toggle('active', n.dataset.tab === tab)
  );
  allEmpTabs.forEach(t => {
    const el = document.getElementById('emp-tab-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });
  if (tab === 'my-tasks')      renderMyTasks();
  if (tab === 'my-orders')     renderMyOrders();
  if (tab === 'link-exchange') renderLinkExchange();
  if (tab === 'chat')          renderEmployeeChat();
}

function renderMyTasks() {
  const empId = SASIT.currentUser.id;
  const tasks = SASIT.getTasksForEmployee(empId);
  const tbody = document.getElementById('my-task-tbody');
  tbody.innerHTML = tasks.map(t => `
    <tr class="fade-in">
      <td>
        <div style="font-weight:500">${esc(t.title)}</div>
        <div style="font-size:12px;color:var(--text-muted)">${esc(t.description)}</div>
      </td>
      <td>${getBadge(t.priority, 'priority')}</td>
      <td>
        <select class="status-select" onchange="updateMyTaskStatus('${esc(t.id)}', this.value)" style="${getStatusSelectStyle(t.status)}">
          <option value="pending"     ${t.status==='pending'?'selected':''}>Pending</option>
          <option value="in-progress" ${t.status==='in-progress'?'selected':''}>In Progress</option>
          <option value="completed"   ${t.status==='completed'?'selected':''}>Completed</option>
        </select>
      </td>
      <td>${esc(t.deadline)}</td>
      <td>${esc(t.createdAt)}</td>
      <td><button class="btn btn-sm btn-secondary" onclick="openDetailView('task','${esc(t.id)}')">👁 View</button></td>
    </tr>`).join('')
    || `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">✏️</div><p>No tasks assigned yet</p></div></td></tr>`;
}

function updateMyTaskStatus(id, status) {
  const task   = SASIT.updateTaskStatus(id, status);
  const labels = { pending: 'Pending', 'in-progress': 'In Progress', completed: 'Completed' };
  showToast(`Task marked as ${labels[status]}`, 'info');
  if (status === 'completed' && task) {
    const adminEmail = SASIT.data.adminCredentials.email;
    if (adminEmail) sendEmail(adminEmail, `Task Completed: ${task.title}`, `Hello Admin,\n\nA task has been marked as completed.\n\nTask: ${task.title}\nCompleted By: ${SASIT.currentUser.name}\nEmployee ID: ${SASIT.currentUser.id}\n\n- SASIT Team`);
  }
  renderMyTasks();
  updateNotifDot();
}

function renderMyOrders() {
  const empId  = SASIT.currentUser.id;
  const orders = SASIT.getOrdersForEmployee(empId);
  const container = document.getElementById('my-orders-list');
  container.innerHTML = orders.map(o => `
    <div class="order-card fade-in">
      <div class="order-card-header">
        <div>
          <div class="order-client">${esc(o.clientName)}</div>
          <div class="order-meta">${esc(o.type)} · ${o.pages} pages · ${esc(o.createdAt)}</div>
          ${o.notes ? `<div style="font-size:13px;color:var(--text-secondary);margin-top:6px">📝 ${esc(o.notes)}</div>` : ''}
        </div>
        <select class="status-select" onchange="updateMyOrderStatus('${esc(o.id)}', this.value)" style="${getStatusSelectStyle(o.status)}">
          <option value="pending"     ${o.status==='pending'?'selected':''}>Pending</option>
          <option value="in-progress" ${o.status==='in-progress'?'selected':''}>In Progress</option>
          <option value="completed"   ${o.status==='completed'?'selected':''}>Completed</option>
        </select>
      </div>
      <a href="${esc(o.link)}" target="_blank" class="order-link">🔗 ${esc(o.link)}</a>
      <div class="order-card-footer">
        <div class="order-amount">₹${o.amount.toLocaleString('en-IN')}</div>
        <button class="btn btn-sm btn-secondary" onclick="openDetailView('order','${esc(o.id)}')">👁 View Details</button>
      </div>
    </div>`).join('')
    || `<div class="empty-state"><div class="empty-icon">📦</div><p>No orders assigned yet</p></div>`;
}

function updateMyOrderStatus(id, status) {
  const order  = SASIT.updateOrderStatus(id, status);
  const labels = { pending: 'Pending', 'in-progress': 'In Progress', completed: 'Completed' };
  showToast(`Order marked as ${labels[status]}`, 'info');
  if (status === 'completed' && order) {
    const adminEmail = SASIT.data.adminCredentials.email;
    if (adminEmail) sendEmail(adminEmail, `Order Completed: ${order.clientName}`, `Hello Admin,\n\nAn order has been marked as completed.\n\nClient: ${order.clientName}\nType: ${order.type}\nAmount: ₹${order.amount}\nCompleted By: ${SASIT.currentUser.name}\n\n- SASIT Team`);
  }
  renderMyOrders();
  updateNotifDot();
}

// ─── Link Exchange (Employee) ─────────────────────────────────────
function renderLinkExchange() {
  const empId   = SASIT.currentUser.id;
  const entries = SASIT.getLinkExchangesForEmployee(empId);
  const container = document.getElementById('emp-tab-link-exchange');
  if (!container) return;

  // Summary counts
  const given    = entries.filter(e => e.linkGiven).length;
  const received = entries.filter(e => e.linkReceived).length;
  const pending  = entries.filter(e => e.status === 'pending').length;

  // Render table
  const tableRows = entries.length ? entries.map(e => `
    <tr class="fade-in">
      <td>
        <div style="font-weight:600;font-size:13px">${esc(e.fromName || '—')}</div>
        ${e.fromLinkedIn ? `<a href="${esc(e.fromLinkedIn)}" target="_blank" class="order-link" style="font-size:11px">🔗 LinkedIn</a>` : ''}
        ${e.fromEmail    ? `<div style="font-size:11px;color:var(--text-muted)">✉️ ${esc(e.fromEmail)}</div>` : ''}
      </td>
      <td>
        <div style="font-weight:500;font-size:13px">${esc(e.fromSite || '—')}</div>
      </td>
      <td>
        <div style="font-weight:600;font-size:13px">${esc(e.toName || '—')}</div>
        ${e.toLinkedIn ? `<a href="${esc(e.toLinkedIn)}" target="_blank" class="order-link" style="font-size:11px">🔗 LinkedIn</a>` : ''}
        ${e.toEmail    ? `<div style="font-size:11px;color:var(--text-muted)">✉️ ${esc(e.toEmail)}</div>` : ''}
      </td>
      <td>
        <div style="font-weight:500;font-size:13px">${esc(e.toSite || '—')}</div>
      </td>
      <td>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
          <input type="checkbox" ${e.linkGiven ? 'checked' : ''} onchange="toggleLinkField('${esc(e.id)}','linkGiven',this.checked)" style="accent-color:var(--accent)">
          <span style="color:${e.linkGiven?'var(--green)':'var(--text-muted)'}">${e.linkGiven ? 'Yes ✓' : 'No'}</span>
        </label>
      </td>
      <td>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
          <input type="checkbox" ${e.linkReceived ? 'checked' : ''} onchange="toggleLinkField('${esc(e.id)}','linkReceived',this.checked)" style="accent-color:var(--green)">
          <span style="color:${e.linkReceived?'var(--green)':'var(--text-muted)'}">${e.linkReceived ? 'Yes ✓' : 'No'}</span>
        </label>
      </td>
      <td>
        <select class="status-select" onchange="updateLinkStatus('${esc(e.id)}',this.value)" style="${getLinkStatusStyle(e.status)}">
          <option value="pending"     ${e.status==='pending'?'selected':''}>Pending</option>
          <option value="in-progress" ${e.status==='in-progress'?'selected':''}>In Progress</option>
          <option value="completed"   ${e.status==='completed'?'selected':''}>Completed</option>
          <option value="cancelled"   ${e.status==='cancelled'?'selected':''}>Cancelled</option>
        </select>
      </td>
      <td>
        <div class="actions-row">
          <button class="btn btn-sm btn-secondary" onclick="openEditLinkExchange('${esc(e.id)}')">✏️</button>
          <button class="btn btn-sm btn-danger"    onclick="deleteLinkExchange('${esc(e.id)}')">🗑</button>
        </div>
      </td>
    </tr>`).join('')
    : `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🔗</div><p>No link exchanges yet. Add your first one!</p></div></td></tr>`;

  container.innerHTML = `
    <div class="section-header" style="margin-bottom:20px">
      <div class="section-title">🔗 Link Exchange Manager</div>
      <button class="btn btn-primary btn-sm" onclick="openAddLinkExchange()">+ Add Exchange</button>
    </div>

    <!-- Summary cards -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center">
        <div style="font-family:var(--font-display);font-size:26px;font-weight:800;color:var(--accent-light)">${entries.length}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Total Exchanges</div>
      </div>
      <div style="background:var(--green-dim);border:1px solid rgba(34,211,165,0.2);border-radius:var(--radius);padding:16px;text-align:center">
        <div style="font-family:var(--font-display);font-size:26px;font-weight:800;color:var(--green)">${given} / ${received}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Links Given / Received</div>
      </div>
      <div style="background:var(--yellow-dim);border:1px solid rgba(234,179,8,0.2);border-radius:var(--radius);padding:16px;text-align:center">
        <div style="font-family:var(--font-display);font-size:26px;font-weight:800;color:var(--yellow)">${pending}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Pending</div>
      </div>
    </div>

    <div class="table-container" style="overflow-x:auto">
      <table style="min-width:900px">
        <thead>
          <tr>
            <th>From (Source)</th>
            <th>Their Site</th>
            <th>To (Recipient)</th>
            <th>Recipient Site</th>
            <th>Link Given?</th>
            <th>Link Received?</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  `;
}

function getLinkStatusStyle(status) {
  const map = { pending: 'color:var(--yellow)', 'in-progress': 'color:var(--accent-light)', completed: 'color:var(--green)', cancelled: 'color:var(--red)' };
  return map[status] || '';
}

function toggleLinkField(id, field, value) {
  SASIT.updateLinkExchange(id, { [field]: value });
  renderLinkExchange();
  showToast(`Updated`, 'success');
}

function updateLinkStatus(id, status) {
  SASIT.updateLinkExchange(id, { status });
  renderLinkExchange();
  showToast(`Status updated to ${status}`, 'info');
}

function deleteLinkExchange(id) {
  if (confirm('Delete this link exchange entry?')) {
    SASIT.deleteLinkExchange(id);
    renderLinkExchange();
    showToast('Entry deleted', 'success');
  }
}

// Add/Edit Link Exchange Modal logic
let editingLinkExId = null;

function openAddLinkExchange() {
  editingLinkExId = null;
  document.getElementById('link-ex-modal-title').textContent = '🔗 Add Link Exchange';
  document.getElementById('link-ex-form').reset();
  openModal('link-ex-modal');
}

function openEditLinkExchange(id) {
  editingLinkExId = id;
  const entry = SASIT.data.linkExchanges.find(l => l.id === id);
  if (!entry) return;
  document.getElementById('link-ex-modal-title').textContent = '✏️ Edit Link Exchange';
  document.getElementById('lx-from-name').value     = entry.fromName     || '';
  document.getElementById('lx-from-linkedin').value = entry.fromLinkedIn || '';
  document.getElementById('lx-from-email').value    = entry.fromEmail    || '';
  document.getElementById('lx-from-site').value     = entry.fromSite     || '';
  document.getElementById('lx-to-name').value       = entry.toName       || '';
  document.getElementById('lx-to-linkedin').value   = entry.toLinkedIn   || '';
  document.getElementById('lx-to-email').value      = entry.toEmail      || '';
  document.getElementById('lx-to-site').value       = entry.toSite       || '';
  document.getElementById('lx-link-given').checked    = !!entry.linkGiven;
  document.getElementById('lx-link-received').checked = !!entry.linkReceived;
  document.getElementById('lx-status').value        = entry.status       || 'pending';
  document.getElementById('lx-notes').value         = entry.notes        || '';
  openModal('link-ex-modal');
}

function submitLinkExchange() {
  const data = {
    empId:        SASIT.currentUser.id,
    fromName:     document.getElementById('lx-from-name').value.trim(),
    fromLinkedIn: document.getElementById('lx-from-linkedin').value.trim(),
    fromEmail:    document.getElementById('lx-from-email').value.trim(),
    fromSite:     document.getElementById('lx-from-site').value.trim(),
    toName:       document.getElementById('lx-to-name').value.trim(),
    toLinkedIn:   document.getElementById('lx-to-linkedin').value.trim(),
    toEmail:      document.getElementById('lx-to-email').value.trim(),
    toSite:       document.getElementById('lx-to-site').value.trim(),
    linkGiven:    document.getElementById('lx-link-given').checked,
    linkReceived: document.getElementById('lx-link-received').checked,
    status:       document.getElementById('lx-status').value,
    notes:        document.getElementById('lx-notes').value.trim(),
  };
  if (!data.fromName && !data.fromSite) { showToast('Please enter at least the source name or site', 'error'); return; }
  if (editingLinkExId) {
    SASIT.updateLinkExchange(editingLinkExId, data);
    showToast('Entry updated', 'success');
  } else {
    SASIT.addLinkExchange(data);
    showToast('Link exchange entry added', 'success');
  }
  closeModal('link-ex-modal');
  renderLinkExchange();
}

// ─── Settings ────────────────────────────────────────────────────
function renderSettings() {
  document.getElementById('settings-admin-email').value  = SASIT.data.adminCredentials.email || '';
  document.getElementById('settings-ejs-service').value  = SASIT.data.emailConfig.serviceId  || '';
  document.getElementById('settings-ejs-template').value = SASIT.data.emailConfig.templateId || '';
  document.getElementById('settings-ejs-pubkey').value   = SASIT.data.emailConfig.publicKey  || '';
}

function saveSettings() {
  SASIT.data.adminCredentials.email = document.getElementById('settings-admin-email').value.trim();
  SASIT.data.emailConfig.serviceId  = document.getElementById('settings-ejs-service').value.trim();
  SASIT.data.emailConfig.templateId = document.getElementById('settings-ejs-template').value.trim();
  SASIT.data.emailConfig.publicKey  = document.getElementById('settings-ejs-pubkey').value.trim();
  SASIT._save();
  showToast('Settings saved!', 'success');
}

// ─── EmailJS ─────────────────────────────────────────────────────
function sendEmail(toEmail, subject, message) {
  const cfg = SASIT.data.emailConfig;
  if (!cfg.serviceId || !cfg.templateId || !cfg.publicKey) return;
  if (typeof emailjs === 'undefined') return;
  emailjs.init(cfg.publicKey);
  emailjs.send(cfg.serviceId, cfg.templateId, { to_email: toEmail, subject, message })
    .then(() => console.log('Email sent to', toEmail))
    .catch(err => console.warn('EmailJS error:', err));
}

// ─── Init ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  showPage('landing-page');

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      // Login
      if (document.getElementById('login-page').classList.contains('active')) { doLogin(); return; }
      // Chat
      const adminInput = document.getElementById('admin-chat-input');
      const empInput   = document.getElementById('emp-chat-input');
      if (document.activeElement === adminInput) { sendAdminChatMessage(); return; }
      if (document.activeElement === empInput)   { sendEmpChatMessage();   return; }
    }
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
  });
});
