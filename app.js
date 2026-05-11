// ─── Toast ───────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: '🔔', order: '📦', task: '✏️' };
  const tc = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span class="toast-icon">${icons[type] || '🔔'}</span><span>${msg}</span>`;
  tc.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, 3500);
}

// ─── Page Router ─────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ─── Modal ───────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
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
  const list = document.getElementById('notif-list');
  list.innerHTML = notifs.length ? notifs.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}">
      <div class="notif-msg">${n.type === 'order' ? '📦' : '✏️'} ${n.message}</div>
      <div class="notif-time">${n.time}</div>
    </div>
  `).join('') : '<div class="empty-state"><div class="empty-icon">🔔</div><p>No notifications yet</p></div>';
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
  document.querySelectorAll('.login-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
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
  ['admin-user','admin-pass','emp-email','emp-id'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  showPage('login-page');
  notifPanelOpen = false;
  document.getElementById('notif-panel').classList.remove('open');
  currentDetailView = null;
}


// ─── Admin Management ─────────────────────────────────────────────
function renderAdmins() {
  const tbody = document.getElementById('admin-tbody');
  if (!tbody) { console.error('admin-tbody not found'); return; }
  const admins = SASIT.data.admins || [];
  if (!admins.length) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">🛡</div><p>No admins found</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = admins.map(a => {
    const initials = (a.name || 'A').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
    return `
    <tr class="fade-in">
      <td>
        <div class="emp-cell">
          <div class="emp-avatar" style="background:var(--orange-dim);border-color:rgba(249,115,22,0.3);color:var(--orange)">${initials}</div>
          <div><div class="emp-name">${a.name}</div><div class="emp-email">${a.email || 'No email set'}</div></div>
        </div>
      </td>
      <td><code style="background:var(--bg-input);padding:3px 8px;border-radius:6px;font-size:13px">${a.username}</code></td>
      <td><span class="badge ${a.id === 'ADM001' ? 'badge-high' : 'badge-in-progress'}">${a.type || 'Admin'}</span></td>
      <td>${a.createdAt}</td>
      <td>
        ${a.id !== 'ADM001'
          ? `<button class="btn btn-sm btn-danger" onclick="deleteAdmin('${a.id}')">🗑 Remove</button>`
          : '<span style="font-size:12px;color:var(--text-muted)">🔒 Protected</span>'}
      </td>
    </tr>`;
  }).join('');
}

function submitAddAdmin() {
  const name = document.getElementById('new-admin-name').value.trim();
  const username = document.getElementById('new-admin-username').value.trim();
  const password = document.getElementById('new-admin-password').value.trim();
  const email = document.getElementById('new-admin-email').value.trim();
  if (!name || !username || !password) { showToast('Please fill all required fields', 'error'); return; }
  // Check username not taken
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
    if (result) { renderAdmins(); showToast('Admin removed', 'error'); }
    else showToast('Cannot delete Super Admin', 'error');
  }
}

// ─── Employee Profile / Stats ─────────────────────────────────────
function openEmpProfile(empId) {
  const emp = SASIT.getEmployeeById(empId);
  if (!emp) return;
  const tasks = SASIT.getTasksForEmployee(empId);
  const orders = SASIT.getOrdersForEmployee(empId);
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const revenue = orders.filter(o => o.status === 'completed').reduce((s,o) => s + o.amount, 0);

  document.getElementById('emp-profile-title').textContent = `👤 ${emp.name}`;
  document.getElementById('emp-profile-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:20px;margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid var(--border)">
      <div style="width:72px;height:72px;border-radius:18px;background:var(--accent-dim);border:2px solid rgba(108,99,255,0.3);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--accent-light)">${emp.avatar}</div>
      <div>
        <div style="font-family:var(--font-display);font-size:22px;font-weight:800;margin-bottom:4px">${emp.name}</div>
        <div style="font-size:14px;color:var(--text-secondary)">${emp.role} &nbsp;·&nbsp; ${emp.email}</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:4px">📞 ${emp.phone} &nbsp;·&nbsp; Joined: ${emp.joinDate}</div>
      </div>
      <code style="margin-left:auto;background:var(--accent-dim);color:var(--accent-light);padding:6px 14px;border-radius:8px;font-size:15px;font-weight:700;border:1px solid rgba(108,99,255,0.3)">${emp.id}</code>
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
      ${tasks.slice(0,3).map(t => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-input);border-radius:var(--radius-sm);margin-bottom:8px;border:1px solid var(--border)">
          <span style="font-size:14px">${t.title}</span>
          <div style="display:flex;gap:8px">${getBadge(t.priority,'priority')} ${getBadge(t.status)}</div>
        </div>
      `).join('')}
    </div>` : ''}

    ${orders.length ? `
    <div>
      <div style="font-family:var(--font-display);font-size:15px;font-weight:700;margin-bottom:12px">Recent Orders</div>
      ${orders.slice(0,3).map(o => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-input);border-radius:var(--radius-sm);margin-bottom:8px;border:1px solid var(--border)">
          <div><span style="font-size:14px;font-weight:500">${o.clientName}</span><span style="font-size:12px;color:var(--text-muted);margin-left:8px">${o.type}</span></div>
          <div style="display:flex;gap:8px;align-items:center"><span style="font-size:13px;font-weight:700;color:var(--green)">₹${o.amount.toLocaleString('en-IN')}</span>${getBadge(o.status)}</div>
        </div>
      `).join('')}
    </div>` : ''}
  `;
  openModal('emp-profile-modal');
}

// ─── Admin Dashboard ─────────────────────────────────────────────
function initAdminDashboard() {
  // Show current admin name in sidebar
  const admin = SASIT.currentUser;
  document.querySelector('#admin-page .user-name').textContent = admin.name;
  document.querySelector('#admin-page .user-id').textContent = admin.username || 'Admin';
  document.querySelector('#admin-page .user-avatar').textContent = admin.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  updateNotifDot();
  showAdminTab('dashboard');
}

function showAdminTab(tab) {
  const adminPage = document.getElementById('admin-page');
  adminPage.querySelectorAll('.nav-item[data-tab]').forEach(n => n.classList.toggle('active', n.dataset.tab === tab));
  const allTabs = ['dashboard','employees','tasks','orders','chat','admins','reports','settings'];
  allTabs.forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });
  const titles = { dashboard: 'Dashboard', employees: 'Employees', tasks: 'Tasks', orders: 'Orders', chat: 'Team Chat', admins: 'Manage Admins', reports: 'Reports', settings: 'Settings' };
  document.getElementById('admin-topbar-title').textContent = titles[tab] || 'Dashboard';
  currentDetailView = null;
  if (tab === 'dashboard') renderAdminDashboard();
  if (tab === 'employees') renderEmployees();
  if (tab === 'tasks') renderTasks();
  if (tab === 'orders') renderOrders();
  if (tab === 'chat') renderAdminChat();
  if (tab === 'admins') renderAdmins();
  if (tab === 'reports') renderReports();
  if (tab === 'settings') renderSettings();
}

function renderAdminDashboard() {
  const s = SASIT.getStats();
  document.getElementById('stat-employees').textContent = s.totalEmployees;
  document.getElementById('stat-pending-tasks').textContent = s.pendingTasks;
  document.getElementById('stat-total-orders').textContent = s.totalOrders;
  document.getElementById('stat-revenue').textContent = '₹' + s.totalRevenue.toLocaleString('en-IN');
  renderRecentActivity();
}

function renderRecentActivity() {
  const tasks = SASIT.data.tasks.slice(-3).reverse();
  const orders = SASIT.data.orders.slice(-3).reverse();
  const el = document.getElementById('recent-activity');
  el.innerHTML = [...tasks.map(t => `
    <tr class="fade-in">
      <td><span style="opacity:0.5">✏️</span> ${t.title}</td>
      <td>${getEmpName(t.assignedTo)}</td>
      <td>${getBadge(t.priority, 'priority')}</td>
      <td>${getBadge(t.status)}</td>
      <td>${t.deadline}</td>
    </tr>
  `), ...orders.map(o => `
    <tr class="fade-in">
      <td><span style="opacity:0.5">📦</span> ${o.clientName}</td>
      <td>${getEmpName(o.assignedTo)}</td>
      <td>—</td>
      <td>${getBadge(o.status)}</td>
      <td>${o.createdAt}</td>
    </tr>
  `)].join('');
}

// ─── Employees ───────────────────────────────────────────────────
function renderEmployees() {
  const tbody = document.getElementById('emp-tbody');
  tbody.innerHTML = SASIT.data.employees.map(e => `
    <tr class="fade-in">
      <td>
        <div class="emp-cell" style="cursor:pointer" onclick="openEmpProfile('${e.id}')">
          <div class="emp-avatar">${e.avatar}</div>
          <div><div class="emp-name">${e.name}</div><div class="emp-email">${e.email}</div></div>
        </div>
      </td>
      <td>
        <code onclick="openEmpProfile('${e.id}')" style="background:var(--accent-dim);color:var(--accent-light);padding:4px 10px;border-radius:6px;font-size:13px;cursor:pointer;border:1px solid rgba(108,99,255,0.25);transition:0.2s" title="Click to view profile">${e.id} 👁</code>
      </td>
      <td>${e.role}</td>
      <td>${e.phone}</td>
      <td>${e.joinDate}</td>
      <td>
        <div class="actions-row">
          <button class="btn btn-sm btn-secondary" onclick="openEmpProfile('${e.id}')">📊 Stats</button>
          <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${e.id}')">🗑</button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">👤</div><p>No employees yet</p></div></td></tr>`;
}

function deleteEmployee(id) {
  if (confirm('Delete this employee?')) { SASIT.deleteEmployee(id); renderEmployees(); showToast('Employee deleted', 'error'); }
}
function openAddEmp() { document.getElementById('add-emp-form').reset(); openModal('add-emp-modal'); }
function submitAddEmp() {
  const name = document.getElementById('new-emp-name').value.trim();
  const email = document.getElementById('new-emp-email').value.trim();
  const role = document.getElementById('new-emp-role').value.trim();
  const phone = document.getElementById('new-emp-phone').value.trim();
  const empEmail = document.getElementById('new-emp-gmail').value.trim();
  if (!name || !email || !role || !phone) { showToast('Please fill all required fields', 'error'); return; }
  const emp = SASIT.addEmployee({ name, email, role, phone, gmailNotify: empEmail });
  closeModal('add-emp-modal');
  renderEmployees();
  showToast(`Employee ${emp.name} added! ID: ${emp.id}`, 'success');
}

// ─── Tasks ───────────────────────────────────────────────────────
function renderTasks() {
  const tasks = SASIT.data.tasks;
  const tbody = document.getElementById('task-tbody');
  tbody.innerHTML = tasks.map(t => `
    <tr class="fade-in">
      <td>
        <div style="font-weight:500">${t.title}</div>
        <div style="font-size:12px;color:var(--text-muted)">${t.description.slice(0,50)}${t.description.length>50?'...':''}</div>
      </td>
      <td>${getEmpCell(t.assignedTo)}</td>
      <td>${getBadge(t.priority, 'priority')}</td>
      <td>${getBadge(t.status)}</td>
      <td>${t.deadline}</td>
      <td>
        <div class="actions-row">
          <button class="btn btn-sm btn-secondary" onclick="openDetailView('task','${t.id}')">👁 View</button>
          <button class="btn btn-sm btn-danger" onclick="deleteTask('${t.id}')">🗑</button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">✏️</div><p>No tasks yet</p></div></td></tr>`;
}

function openAddTask() {
  const sel = document.getElementById('task-assign-sel');
  sel.innerHTML = SASIT.data.employees.map(e => `<option value="${e.id}">${e.name} (${e.id})</option>`).join('');
  document.getElementById('add-task-form').reset();
  openModal('add-task-modal');
}
function submitAddTask() {
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const assignedTo = document.getElementById('task-assign-sel').value;
  const priority = document.getElementById('task-priority').value;
  const deadline = document.getElementById('task-deadline').value;
  if (!title || !assignedTo || !deadline) { showToast('Please fill required fields', 'error'); return; }
  const task = SASIT.addTask({ title, description, assignedTo, priority, deadline });
  closeModal('add-task-modal');
  renderTasks();
  // Email notification
  const emp = SASIT.getEmployeeById(assignedTo);
  if (emp?.gmailNotify) sendEmail(emp.gmailNotify, `New Task Assigned: ${title}`, `Hello ${emp.name},\n\nA new task has been assigned to you.\n\nTask: ${title}\nPriority: ${priority}\nDeadline: ${deadline}\nDescription: ${description}\n\n- SASIT Team`);
  showToast(`Task assigned to ${SASIT.getEmployeeById(assignedTo)?.name}!`, 'success');
}
function deleteTask(id) {
  if (confirm('Delete this task?')) { SASIT.deleteTask(id); renderTasks(); showToast('Task deleted', 'error'); }
}

// ─── Orders ──────────────────────────────────────────────────────
function renderOrders() {
  const orders = SASIT.data.orders;
  const tbody = document.getElementById('order-tbody');
  tbody.innerHTML = orders.map(o => `
    <tr class="fade-in">
      <td><div style="font-weight:600">${o.clientName}</div><div style="font-size:12px;color:var(--text-muted)">${o.type}</div></td>
      <td><a class="order-link" href="${o.link}" target="_blank">${o.link.replace('https://','').replace('http://','')}</a></td>
      <td>${getEmpCell(o.assignedTo)}</td>
      <td style="font-family:var(--font-display);font-weight:700;color:var(--green)">₹${o.amount.toLocaleString('en-IN')}</td>
      <td>${getBadge(o.status)}</td>
      <td>${o.createdAt}</td>
      <td>
        <div class="actions-row">
          <button class="btn btn-sm btn-secondary" onclick="openDetailView('order','${o.id}')">👁 View</button>
          <button class="btn btn-sm btn-danger" onclick="deleteOrder('${o.id}')">🗑</button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📦</div><p>No orders yet</p></div></td></tr>`;
}

function openAddOrder() {
  const sel = document.getElementById('order-assign-sel');
  sel.innerHTML = `<option value="">Unassigned</option>` + SASIT.data.employees.map(e => `<option value="${e.id}">${e.name} (${e.id})</option>`).join('');
  document.getElementById('add-order-form').reset();
  openModal('add-order-modal');
}
function submitAddOrder() {
  const clientName = document.getElementById('order-client').value.trim();
  const link = document.getElementById('order-link-input').value.trim();
  const type = document.getElementById('order-type').value.trim();
  const pages = parseInt(document.getElementById('order-pages').value) || 0;
  const amount = parseFloat(document.getElementById('order-amount').value) || 0;
  const assignedTo = document.getElementById('order-assign-sel').value || null;
  const notes = document.getElementById('order-notes').value.trim();
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
  if (confirm('Delete this order?')) { SASIT.deleteOrder(id); renderOrders(); showToast('Order deleted', 'error'); }
}

// ─── Detail View ─────────────────────────────────────────────────
let currentDetailView = null;

function openDetailView(type, id) {
  currentDetailView = { type, id };
  const item = type === 'task'
    ? SASIT.data.tasks.find(t => t.id === id)
    : SASIT.data.orders.find(o => o.id === id);
  if (!item) return;

  const isAdmin = SASIT.currentRole === 'admin';
  const emp = SASIT.getEmployeeById(item.assignedTo);

  const detailHtml = type === 'task' ? `
    <div class="detail-grid">
      <div class="detail-field"><div class="detail-label">Task ID</div><div class="detail-value">${item.id}</div></div>
      <div class="detail-field"><div class="detail-label">Status</div><div class="detail-value">${getBadge(item.status)}</div></div>
      <div class="detail-field"><div class="detail-label">Priority</div><div class="detail-value">${getBadge(item.priority,'priority')}</div></div>
      <div class="detail-field"><div class="detail-label">Assigned To</div><div class="detail-value">${emp ? emp.name : '—'}</div></div>
      <div class="detail-field"><div class="detail-label">Deadline</div><div class="detail-value">${item.deadline}</div></div>
      <div class="detail-field"><div class="detail-label">Created On</div><div class="detail-value">${item.createdAt}</div></div>
    </div>
    <div class="detail-field" style="margin-top:16px">
      <div class="detail-label">Description</div>
      <div class="detail-desc">${item.description || 'No description provided.'}</div>
    </div>
  ` : `
    <div class="detail-grid">
      <div class="detail-field"><div class="detail-label">Order ID</div><div class="detail-value">${item.id}</div></div>
      <div class="detail-field"><div class="detail-label">Status</div><div class="detail-value">${getBadge(item.status)}</div></div>
      <div class="detail-field"><div class="detail-label">Type</div><div class="detail-value">${item.type}</div></div>
      <div class="detail-field"><div class="detail-label">Assigned To</div><div class="detail-value">${emp ? emp.name : '—'}</div></div>
      <div class="detail-field"><div class="detail-label">Pages</div><div class="detail-value">${item.pages}</div></div>
      <div class="detail-field"><div class="detail-label">Amount</div><div class="detail-value" style="color:var(--green);font-weight:700">₹${item.amount.toLocaleString('en-IN')}</div></div>
      <div class="detail-field"><div class="detail-label">Created On</div><div class="detail-value">${item.createdAt}</div></div>
      <div class="detail-field"><div class="detail-label">Link</div><div class="detail-value"><a href="${item.link}" target="_blank" class="order-link">${item.link}</a></div></div>
    </div>
    ${item.notes ? `<div class="detail-field" style="margin-top:16px"><div class="detail-label">Notes</div><div class="detail-desc">${item.notes}</div></div>` : ''}
  `;

  const comments = item.comments || [];
  const commentsHtml = `
    <div class="comments-section">
      <div class="comments-title">💬 Comments (${comments.length})</div>
      <div class="comments-list" id="comments-list">
        ${comments.length ? comments.map(c => `
          <div class="comment-item ${c.authorId === 'ADMIN' ? 'comment-admin' : 'comment-emp'}">
            <div class="comment-header">
              <span class="comment-author">${c.author}</span>
              <span class="comment-time">${c.date} · ${c.time}</span>
            </div>
            <div class="comment-text">${c.text}</div>
          </div>
        `).join('') : '<div style="color:var(--text-muted);font-size:14px;padding:12px 0">No comments yet. Be the first to add one!</div>'}
      </div>
      <div class="comment-input-row">
        <input class="form-input" id="new-comment-input" placeholder="Write a comment..." style="flex:1">
        <button class="btn btn-primary btn-sm" onclick="submitComment()">Send</button>
      </div>
    </div>
  `;

  document.getElementById('detail-modal-title').textContent = type === 'task' ? `✏️ ${item.title}` : `📦 ${item.clientName}`;
  document.getElementById('detail-modal-body').innerHTML = detailHtml + commentsHtml;
  openModal('detail-modal');

  // Focus comment input
  setTimeout(() => {
    const inp = document.getElementById('new-comment-input');
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') submitComment(); });
  }, 100);
}

function submitComment() {
  if (!currentDetailView) return;
  const input = document.getElementById('new-comment-input');
  const text = input.value.trim();
  if (!text) return;
  SASIT.addComment(currentDetailView.type, currentDetailView.id, text);
  input.value = '';
  // Re-render comments
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
    return `
      <div class="chat-emp-item ${activeChatEmpId === e.id ? 'active' : ''}" onclick="selectChatEmployee('${e.id}')">
        <div class="emp-avatar" style="width:38px;height:38px">${e.avatar}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px">${e.name}</div>
          <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${last ? last.text.slice(0,30)+'...' : 'No messages yet'}</div>
        </div>
      </div>
    `;
  }).join('') || '<div style="padding:20px;color:var(--text-muted);font-size:14px">No employees found</div>';

  if (activeChatEmpId) selectChatEmployee(activeChatEmpId);
  else renderChatEmpty();
}

function renderChatEmpty() {
  document.getElementById('chat-messages-area').innerHTML = `
    <div class="empty-state" style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center">
      <div class="empty-icon">💬</div>
      <p>Select an employee to start chatting</p>
    </div>`;
  document.getElementById('chat-input-row').style.display = 'none';
}

function selectChatEmployee(empId) {
  activeChatEmpId = empId;
  const emp = SASIT.getEmployeeById(empId);
  document.getElementById('chat-emp-name').textContent = emp ? `${emp.name} (${emp.role})` : '';
  document.getElementById('chat-input-row').style.display = 'flex';
  renderAdminChatMessages();
  // Refresh emp list to update active state
  document.querySelectorAll('.chat-emp-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.chat-emp-item').forEach((el, i) => {
    if (SASIT.data.employees[i]?.id === empId) el.classList.add('active');
  });
}

function renderAdminChatMessages() {
  if (!activeChatEmpId) return;
  const msgs = SASIT.getChatMessages(activeChatEmpId);
  const area = document.getElementById('chat-messages-area');
  area.innerHTML = msgs.length ? msgs.map(m => `
    <div class="chat-msg ${m.from === 'ADMIN' ? 'chat-msg-me' : 'chat-msg-them'}">
      <div class="chat-bubble">${m.text}</div>
      <div class="chat-meta">${m.time}</div>
    </div>
  `).join('') : '<div style="text-align:center;color:var(--text-muted);padding:40px;font-size:14px">No messages yet. Say hello! 👋</div>';
  area.scrollTop = area.scrollHeight;
}

function sendAdminChatMessage() {
  if (!activeChatEmpId) return;
  const input = document.getElementById('admin-chat-input');
  const text = input.value.trim();
  if (!text) return;
  SASIT.sendChatMessage(activeChatEmpId, text);
  input.value = '';
  renderAdminChatMessages();
  renderAdminChat();
}

// ─── Employee Chat ────────────────────────────────────────────────
function renderEmployeeChat() {
  const msgs = SASIT.getChatMessages(SASIT.currentUser.id);
  const area = document.getElementById('emp-chat-messages');
  area.innerHTML = msgs.length ? msgs.map(m => `
    <div class="chat-msg ${m.from === SASIT.currentUser.id ? 'chat-msg-me' : 'chat-msg-them'}">
      <div class="chat-bubble">${m.text}</div>
      <div class="chat-meta">${m.fromName} · ${m.time}</div>
    </div>
  `).join('') : '<div style="text-align:center;color:var(--text-muted);padding:40px;font-size:14px">No messages yet. Send a message to Admin! 👋</div>';
  area.scrollTop = area.scrollHeight;
}

function sendEmpChatMessage() {
  const input = document.getElementById('emp-chat-input');
  const text = input.value.trim();
  if (!text) return;
  SASIT.sendChatMessage('ADMIN', text);
  input.value = '';
  renderEmployeeChat();
}

// ─── Employee Dashboard ───────────────────────────────────────────
function initEmployeeDashboard() {
  const emp = SASIT.currentUser;
  document.getElementById('emp-user-name').textContent = emp.name;
  document.getElementById('emp-user-id').textContent = emp.id;
  document.getElementById('emp-user-avatar').textContent = emp.avatar;
  document.getElementById('emp-topbar-user').textContent = emp.name;
  updateNotifDot();
  showEmpTab('my-tasks');
}

function showEmpTab(tab) {
  const empPage = document.getElementById('employee-page');
  empPage.querySelectorAll('.emp-nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === tab));
  const allEmpTabs = ['my-tasks','my-orders','link-exchange','chat'];
  allEmpTabs.forEach(t => {
    const el = document.getElementById('emp-tab-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });
  if (tab === 'my-tasks') renderMyTasks();
  if (tab === 'my-orders') renderMyOrders();
  if (tab === 'chat') renderEmployeeChat();
  if (tab === 'link-exchange') renderLinkExchange();
}

function renderMyTasks() {
  const empId = SASIT.currentUser.id;
  const tasks = SASIT.getTasksForEmployee(empId);
  const tbody = document.getElementById('my-task-tbody');
  tbody.innerHTML = tasks.map(t => `
    <tr class="fade-in">
      <td>
        <div style="font-weight:500">${t.title}</div>
        <div style="font-size:12px;color:var(--text-muted)">${t.description}</div>
      </td>
      <td>${getBadge(t.priority, 'priority')}</td>
      <td>
        <select class="status-select" onchange="updateMyTaskStatus('${t.id}', this.value)" style="${getStatusSelectStyle(t.status)}">
          <option value="pending" ${t.status==='pending'?'selected':''}>Pending</option>
          <option value="in-progress" ${t.status==='in-progress'?'selected':''}>In Progress</option>
          <option value="completed" ${t.status==='completed'?'selected':''}>Completed</option>
        </select>
      </td>
      <td>${t.deadline}</td>
      <td>${t.createdAt}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="openDetailView('task','${t.id}')">👁 View</button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">✏️</div><p>No tasks assigned yet</p></div></td></tr>`;
}

function updateMyTaskStatus(id, status) {
  const task = SASIT.updateTaskStatus(id, status);
  const labels = { pending: 'Pending', 'in-progress': 'In Progress', completed: 'Completed' };
  showToast(`Task marked as ${labels[status]}`, 'info');
  if (status === 'completed' && task) {
    // Email admin
    const adminEmail = SASIT.data.adminCredentials.email;
    if (adminEmail) sendEmail(adminEmail, `Task Completed: ${task.title}`, `Hello Admin,\n\nA task has been marked as completed.\n\nTask: ${task.title}\nCompleted By: ${SASIT.currentUser.name}\nEmployee ID: ${SASIT.currentUser.id}\n\n- SASIT Team`);
  }
  renderMyTasks();
  updateNotifDot();
}

function renderMyOrders() {
  const empId = SASIT.currentUser.id;
  const orders = SASIT.getOrdersForEmployee(empId);
  const container = document.getElementById('my-orders-list');
  container.innerHTML = orders.map(o => `
    <div class="order-card fade-in">
      <div class="order-card-header">
        <div>
          <div class="order-client">${o.clientName}</div>
          <div class="order-meta">${o.type} · ${o.pages} pages · ${o.createdAt}</div>
          ${o.notes ? `<div style="font-size:13px;color:var(--text-secondary);margin-top:6px">📝 ${o.notes}</div>` : ''}
        </div>
        <select class="status-select" onchange="updateMyOrderStatus('${o.id}', this.value)" style="${getStatusSelectStyle(o.status)}">
          <option value="pending" ${o.status==='pending'?'selected':''}>Pending</option>
          <option value="in-progress" ${o.status==='in-progress'?'selected':''}>In Progress</option>
          <option value="completed" ${o.status==='completed'?'selected':''}>Completed</option>
        </select>
      </div>
      <a href="${o.link}" target="_blank" class="order-link">🔗 ${o.link}</a>
      <div class="order-card-footer">
        <div class="order-amount">₹${o.amount.toLocaleString('en-IN')}</div>
        <button class="btn btn-sm btn-secondary" onclick="openDetailView('order','${o.id}')">👁 View Details</button>
      </div>
    </div>
  `).join('') || `<div class="empty-state"><div class="empty-icon">📦</div><p>No orders assigned yet</p></div>`;
}

function updateMyOrderStatus(id, status) {
  const order = SASIT.updateOrderStatus(id, status);
  const labels = { pending: 'Pending', 'in-progress': 'In Progress', completed: 'Completed' };
  showToast(`Order marked as ${labels[status]}`, 'info');
  if (status === 'completed' && order) {
    const adminEmail = SASIT.data.adminCredentials.email;
    if (adminEmail) sendEmail(adminEmail, `Order Completed: ${order.clientName}`, `Hello Admin,\n\nAn order has been marked as completed.\n\nClient: ${order.clientName}\nType: ${order.type}\nAmount: ₹${order.amount}\nCompleted By: ${SASIT.currentUser.name}\n\n- SASIT Team`);
  }
  renderMyOrders();
  updateNotifDot();
}

// ─── Settings ────────────────────────────────────────────────────
function renderSettings() {
  document.getElementById('settings-admin-email').value = SASIT.data.adminCredentials.email || '';
  document.getElementById('settings-ejs-service').value = SASIT.data.emailConfig.serviceId || '';
  document.getElementById('settings-ejs-template').value = SASIT.data.emailConfig.templateId || '';
  document.getElementById('settings-ejs-pubkey').value = SASIT.data.emailConfig.publicKey || '';
}

function saveSettings() {
  SASIT.data.adminCredentials.email = document.getElementById('settings-admin-email').value.trim();
  SASIT.data.emailConfig.serviceId = document.getElementById('settings-ejs-service').value.trim();
  SASIT.data.emailConfig.templateId = document.getElementById('settings-ejs-template').value.trim();
  SASIT.data.emailConfig.publicKey = document.getElementById('settings-ejs-pubkey').value.trim();
  showToast('Settings saved successfully!', 'success');
}

// ─── EmailJS ─────────────────────────────────────────────────────
function sendEmail(toEmail, subject, message) {
  const cfg = SASIT.data.emailConfig;
  if (!cfg.serviceId || !cfg.templateId || !cfg.publicKey) return; // not configured
  if (typeof emailjs === 'undefined') return;
  emailjs.init(cfg.publicKey);
  emailjs.send(cfg.serviceId, cfg.templateId, {
    to_email: toEmail,
    subject: subject,
    message: message,
  }).then(() => console.log('Email sent to', toEmail))
    .catch(err => console.warn('EmailJS error:', err));
}

// ─── Helpers ─────────────────────────────────────────────────────
function getBadge(val, type = 'status') {
  if (type === 'priority') {
    const map = { high: 'badge-high', medium: 'badge-medium', low: 'badge-low' };
    return `<span class="badge ${map[val] || 'badge-medium'}">${val}</span>`;
  }
  const map = { pending: 'badge-pending', 'in-progress': 'badge-in-progress', completed: 'badge-completed' };
  const label = { pending: 'Pending', 'in-progress': 'In Progress', completed: 'Completed' };
  return `<span class="badge ${map[val] || 'badge-pending'}">${label[val] || val}</span>`;
}

function getEmpName(id) { const e = SASIT.getEmployeeById(id); return e ? e.name : '—'; }

function getEmpCell(id) {
  const e = SASIT.getEmployeeById(id);
  if (!e) return '—';
  return `<div class="emp-cell"><div class="emp-avatar" style="width:28px;height:28px;font-size:11px">${e.avatar}</div><div class="emp-name" style="font-size:13px">${e.name}</div></div>`;
}

function getStatusSelectStyle(status) {
  const map = { pending: 'color:var(--yellow)', 'in-progress': 'color:var(--accent-light)', completed: 'color:var(--green)' };
  return map[status] || '';
}

// ─── Init ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  showPage('landing-page');
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && document.getElementById('login-page').classList.contains('active')) doLogin();
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
  });
  // Chat enter key
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const adminInput = document.getElementById('admin-chat-input');
      const empInput = document.getElementById('emp-chat-input');
      if (document.activeElement === adminInput) sendAdminChatMessage();
      if (document.activeElement === empInput) sendEmpChatMessage();
    }
  });
});

// ─── Reports Tab ─────────────────────────────────────────────────
let reportSelectedEmp = null;

function renderReports() {
  const empSel = document.getElementById('report-emp-select');
  if (!empSel) return;
  empSel.innerHTML = '<option value="">-- Select Employee --</option>' +
    SASIT.data.employees.map(e => `<option value="${e.id}">${e.name} (${e.id})</option>`).join('');
  document.getElementById('report-content').innerHTML = `
    <div class="empty-state"><div class="empty-icon">📊</div><p>Select an employee to view their report</p></div>`;
}

function loadEmployeeReport() {
  const empId = document.getElementById('report-emp-select').value;
  if (!empId) return;
  reportSelectedEmp = empId;
  const emp = SASIT.getEmployeeById(empId);
  const tasks = SASIT.getTasksForEmployee(empId);
  const orders = SASIT.getOrdersForEmployee(empId);

  // Group orders by date
  const ordersByDate = {};
  orders.forEach(o => {
    if (!ordersByDate[o.createdAt]) ordersByDate[o.createdAt] = [];
    ordersByDate[o.createdAt].push(o);
  });

  // Group orders by month
  const ordersByMonth = {};
  orders.forEach(o => {
    const month = o.createdAt.slice(0, 7);
    if (!ordersByMonth[month]) ordersByMonth[month] = [];
    ordersByMonth[month].push(o);
  });

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const revenue = orders.filter(o => o.status === 'completed').reduce((s,o) => s + o.amount, 0);

  document.getElementById('report-content').innerHTML = `
    <!-- Stats -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px">
      <div class="stat-card accent"><div class="stat-card-icon">✅</div><div class="stat-card-value">${tasks.length}</div><div class="stat-card-label">Total Tasks</div></div>
      <div class="stat-card green"><div class="stat-card-icon">🏆</div><div class="stat-card-value">${completedTasks}</div><div class="stat-card-label">Tasks Done</div></div>
      <div class="stat-card yellow"><div class="stat-card-icon">📦</div><div class="stat-card-value">${orders.length}</div><div class="stat-card-label">Total Orders</div></div>
      <div class="stat-card green"><div class="stat-card-icon">💰</div><div class="stat-card-value">₹${revenue.toLocaleString('en-IN')}</div><div class="stat-card-label">Revenue</div></div>
    </div>

    <!-- Download CSV -->
    <div class="section-header" style="margin-bottom:16px">
      <div class="section-title">📅 Daily Orders</div>
      <button class="btn btn-primary btn-sm" onclick="downloadCSV('${empId}')">⬇ Download Monthly CSV</button>
    </div>

    <!-- Daily Orders Table -->
    <div class="table-container" style="margin-bottom:28px">
      <table>
        <thead><tr><th>Date</th><th>Client</th><th>Type</th><th>Pages</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>
          ${orders.length ? orders.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(o => `
            <tr>
              <td>${o.createdAt}</td>
              <td style="font-weight:500">${o.clientName}</td>
              <td>${o.type}</td>
              <td>${o.pages}</td>
              <td style="color:var(--green);font-weight:700">₹${o.amount.toLocaleString('en-IN')}</td>
              <td>${getBadge(o.status)}</td>
            </tr>
          `).join('') : '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📦</div><p>No orders yet</p></div></td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- Monthly Summary -->
    <div class="section-header" style="margin-bottom:16px">
      <div class="section-title">📆 Monthly Summary</div>
    </div>
    <div class="table-container">
      <table>
        <thead><tr><th>Month</th><th>Total Orders</th><th>Completed</th><th>Pending</th><th>Revenue</th></tr></thead>
        <tbody>
          ${Object.keys(ordersByMonth).length ? Object.keys(ordersByMonth).sort((a,b) => b.localeCompare(a)).map(month => {
            const mo = ordersByMonth[month];
            const rev = mo.filter(o => o.status === 'completed').reduce((s,o) => s+o.amount, 0);
            return `<tr>
              <td style="font-weight:600">${month}</td>
              <td>${mo.length}</td>
              <td style="color:var(--green)">${mo.filter(o=>o.status==='completed').length}</td>
              <td style="color:var(--orange)">${mo.filter(o=>o.status==='pending').length}</td>
              <td style="color:var(--green);font-weight:700">₹${rev.toLocaleString('en-IN')}</td>
            </tr>`;
          }).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px">No data</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function downloadCSV(empId) {
  const emp = SASIT.getEmployeeById(empId);
  const orders = SASIT.getOrdersForEmployee(empId);
  if (!orders.length) { showToast('No orders to export', 'error'); return; }

  const headers = ['Date','Order ID','Client Name','Type','Pages','Amount','Status','Notes'];
  const rows = orders.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(o => [
    o.createdAt, o.id, `"${o.clientName}"`, `"${o.type}"`, o.pages, o.amount,
    o.status, `"${o.notes || ''}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${emp.name.replace(' ','_')}_orders_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV downloaded!', 'success');
}

// ─── Link Exchange ────────────────────────────────────────────────
function renderLinkExchange() {
  const empId = SASIT.currentUser.id;
  const links = SASIT.getLinkExchangesForEmployee(empId);

  // Stats
  const given = links.filter(l => l.givenTo).length;
  const received = links.filter(l => l.takenFrom).length;
  const exchangeComplete = links.filter(l => l.givenBack && l.receivedBack).length;

  document.getElementById('link-stats').innerHTML = `
    <div class="stat-card accent"><div class="stat-card-icon">🔗</div><div class="stat-card-value">${links.length}</div><div class="stat-card-label">Total Entries</div></div>
    <div class="stat-card green"><div class="stat-card-icon">⬆</div><div class="stat-card-value">${given}</div><div class="stat-card-label">Links Given</div></div>
    <div class="stat-card yellow"><div class="stat-card-icon">⬇</div><div class="stat-card-value">${received}</div><div class="stat-card-label">Links Taken</div></div>
    <div class="stat-card green"><div class="stat-card-icon">✅</div><div class="stat-card-value">${exchangeComplete}</div><div class="stat-card-label">Exchanges Complete</div></div>
  `;

  const tbody = document.getElementById('link-tbody');
  tbody.innerHTML = links.length ? links.map(l => `
    <tr class="fade-in">
      <td style="font-size:12px;color:var(--text-muted)">${l.id}</td>
      <td>
        <div style="font-size:13px;font-weight:500">${l.takenFrom || '—'}</div>
        <div style="font-size:11px;color:var(--text-muted)">${l.takenFromContact || ''}</div>
      </td>
      <td>
        <div style="font-size:13px;font-weight:500">${l.givenTo || '—'}</div>
        <div style="font-size:11px;color:var(--text-muted)">${l.givenToContact || ''}</div>
      </td>
      <td><a href="${l.siteTaken || '#'}" target="_blank" style="color:var(--accent-light);font-size:13px">${l.siteTaken || '—'}</a></td>
      <td><a href="${l.siteGiven || '#'}" target="_blank" style="color:var(--green);font-size:13px">${l.siteGiven || '—'}</a></td>
      <td>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" ${l.givenBack ? 'checked' : ''} onchange="updateLinkField('${l.id}','givenBack',this.checked)">
            <span style="color:${l.givenBack ? 'var(--green)' : 'var(--text-muted)'}">Given Back</span>
          </label>
          <label style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" ${l.receivedBack ? 'checked' : ''} onchange="updateLinkField('${l.id}','receivedBack',this.checked)">
            <span style="color:${l.receivedBack ? 'var(--green)' : 'var(--text-muted)'}">Received Back</span>
          </label>
        </div>
      </td>
      <td>${l.date}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteLinkEntry('${l.id}')">🗑</button>
      </td>
    </tr>
  `).join('') : `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🔗</div><p>No link exchanges yet. Add your first one!</p></div></td></tr>`;
}

function updateLinkField(id, field, value) {
  SASIT.updateLinkExchange(id, { [field]: value });
  showToast('Updated!', 'success');
  renderLinkExchange();
}

function deleteLinkEntry(id) {
  if (confirm('Delete this link exchange entry?')) {
    SASIT.deleteLinkExchange(id);
    renderLinkExchange();
    showToast('Entry deleted', 'error');
  }
}

function openAddLinkModal() {
  document.getElementById('add-link-form').reset();
  openModal('add-link-modal');
}

function submitAddLink() {
  const takenFrom = document.getElementById('link-taken-from').value.trim();
  const takenFromContact = document.getElementById('link-taken-from-contact').value.trim();
  const givenTo = document.getElementById('link-given-to').value.trim();
  const givenToContact = document.getElementById('link-given-to-contact').value.trim();
  const siteTaken = document.getElementById('link-site-taken').value.trim();
  const siteGiven = document.getElementById('link-site-given').value.trim();
  const notes = document.getElementById('link-notes').value.trim();

  if (!siteTaken && !siteGiven) { showToast('Enter at least one site URL', 'error'); return; }

  SASIT.addLinkExchange({
    empId: SASIT.currentUser.id,
    takenFrom, takenFromContact,
    givenTo, givenToContact,
    siteTaken, siteGiven,
    givenBack: false, receivedBack: false,
    notes
  });

  closeModal('add-link-modal');
  renderLinkExchange();
  showToast('Link exchange entry added!', 'success');
}
