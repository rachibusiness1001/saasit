// SASIT - Central Data Store
const SASIT = {

  // ── Default seed data ─────────────────────────────────────────
  _defaults() {
    return {
      employees: [
        { id: 'EMP001', name: 'Rahul Sharma', email: 'rahul@sasit.in', role: 'Developer', phone: '9876543210', joinDate: '2024-01-15', avatar: 'RS' },
        { id: 'EMP002', name: 'Priya Singh',  email: 'priya@sasit.in', role: 'Designer',  phone: '9876543211', joinDate: '2024-02-20', avatar: 'PS' },
        { id: 'EMP003', name: 'Amit Kumar',   email: 'amit@sasit.in',  role: 'Sales',     phone: '9876543212', joinDate: '2024-03-10', avatar: 'AK' },
      ],
      tasks: [
        { id: 'TSK001', title: 'Fix login bug', description: 'Login page throws error on mobile', assignedTo: 'EMP001', priority: 'high', status: 'in-progress', deadline: '2025-05-10', createdAt: '2025-05-01', comments: [{ id: 1, author: 'Admin', authorId: 'ADMIN', text: 'Please fix this ASAP, client is waiting.', time: '10:30 AM', date: '2025-05-01' }] },
        { id: 'TSK002', title: 'Update landing page design', description: 'Redesign hero section with new branding', assignedTo: 'EMP002', priority: 'medium', status: 'pending', deadline: '2025-05-15', createdAt: '2025-05-02', comments: [] },
        { id: 'TSK003', title: 'Client follow-up call', description: 'Call Sharma Industries for renewal', assignedTo: 'EMP003', priority: 'high', status: 'completed', deadline: '2025-05-05', createdAt: '2025-04-30', comments: [] },
      ],
      orders: [
        { id: 'ORD001', clientName: 'Sharma Industries', link: 'https://sharmaindustries.com', type: 'Link Building', pages: 5, amount: 15000, status: 'pending',     assignedTo: 'EMP003', createdAt: '2025-05-01', notes: 'High priority client', comments: [{ id: 1, author: 'Admin', authorId: 'ADMIN', text: 'Focus on DA 40+ sites only.', time: '09:00 AM', date: '2025-05-01' }] },
        { id: 'ORD002', clientName: 'Gupta Textiles',    link: 'https://guptatextiles.com',    type: 'SEO Package',   pages: 3, amount: 8500,  status: 'in-progress', assignedTo: 'EMP001', createdAt: '2025-04-28', notes: '', comments: [] },
        { id: 'ORD003', clientName: 'Verma Exports',     link: 'https://vermaexports.com',     type: 'Link Building', pages: 8, amount: 22000, status: 'completed',   assignedTo: 'EMP002', createdAt: '2025-04-20', notes: 'Repeat client', comments: [] },
      ],
      // Link Exchange entries per employee: { id, empId, fromContact, fromLinkedIn, fromEmail, fromSite, toContact, toLinkedIn, toEmail, linkGiven, linkReceived, status, notes, createdAt }
      linkExchanges: [],
      notifications: [],
      chatMessages: [
        { id: 1, from: 'ADMIN', fromName: 'Admin', to: 'EMP001', text: 'Hi Rahul, please update me on the login bug fix.', time: '09:15 AM', date: '2025-05-01', read: false },
        { id: 2, from: 'EMP001', fromName: 'Rahul Sharma', to: 'ADMIN', text: 'Working on it, should be done by evening.', time: '09:45 AM', date: '2025-05-01', read: false },
      ],
      adminCredentials: { username: 'admin', password: 'admin123', email: '' },
      admins: [
        { id: 'ADM001', name: 'Super Admin', username: 'admin', password: 'admin123', email: '', type: 'Super Admin', createdAt: '2025-01-01' },
      ],
      emailConfig: { serviceId: '', templateId: '', publicKey: '' },
      // counters to avoid ID clashes after delete
      empCounter: 3,
      taskCounter: 3,
      orderCounter: 3,
      adminCounter: 1,
      linkExCounter: 0,
    };
  },

  data: null,
  currentUser: null,
  currentRole: null,

  // ── Persistence ───────────────────────────────────────────────
  _save() {
    try { localStorage.setItem('sasit_data', JSON.stringify(this.data)); } catch(e) { console.warn('Save failed', e); }
  },
  _load() {
    try {
      const raw = localStorage.getItem('sasit_data');
      if (raw) {
        const parsed = JSON.parse(raw);
        // Ensure new fields exist for old saved data
        if (!parsed.linkExchanges) parsed.linkExchanges = [];
        if (!parsed.empCounter)    parsed.empCounter    = parsed.employees.length;
        if (!parsed.taskCounter)   parsed.taskCounter   = parsed.tasks.length;
        if (!parsed.orderCounter)  parsed.orderCounter  = parsed.orders.length;
        if (!parsed.adminCounter)  parsed.adminCounter  = parsed.admins.length;
        if (!parsed.linkExCounter) parsed.linkExCounter = (parsed.linkExchanges || []).length;
        this.data = parsed;
        return;
      }
    } catch(e) { console.warn('Load failed, using defaults', e); }
    this.data = this._defaults();
    this._save();
  },

  init() { this._load(); },

  // ── Auth ──────────────────────────────────────────────────────
  login(username, password, role) {
    if (role === 'admin') {
      const admin = this.data.admins.find(a => a.username === username && a.password === password);
      if (admin) {
        this.currentUser = { id: admin.id, name: admin.name, role: 'admin', username: admin.username };
        this.currentRole = 'admin';
        return true;
      }
      return false;
    } else {
      // Employee: login with email + employee ID
      const emp = this.data.employees.find(e =>
        e.email.toLowerCase() === username.toLowerCase() && e.id === password
      );
      if (emp) { this.currentUser = emp; this.currentRole = 'employee'; return true; }
      return false;
    }
  },
  logout() { this.currentUser = null; this.currentRole = null; },

  // ── Employees ─────────────────────────────────────────────────
  addEmployee(data) {
    this.data.empCounter = (this.data.empCounter || 0) + 1;
    const id = 'EMP' + String(this.data.empCounter).padStart(3, '0');
    const emp = {
      ...data, id,
      joinDate: new Date().toISOString().split('T')[0],
      avatar: data.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    };
    this.data.employees.push(emp);
    this._save();
    return emp;
  },
  deleteEmployee(id) {
    this.data.employees = this.data.employees.filter(e => e.id !== id);
    this._save();
  },

  // ── Admins ────────────────────────────────────────────────────
  addAdmin(data) {
    this.data.adminCounter = (this.data.adminCounter || 0) + 1;
    const id = 'ADM' + String(this.data.adminCounter).padStart(3, '0');
    const admin = { ...data, id, type: 'Admin', createdAt: new Date().toISOString().split('T')[0] };
    this.data.admins.push(admin);
    this._save();
    return admin;
  },
  deleteAdmin(id) {
    if (id === 'ADM001') return false;
    this.data.admins = this.data.admins.filter(a => a.id !== id);
    this._save();
    return true;
  },

  // ── Tasks ─────────────────────────────────────────────────────
  addTask(data) {
    this.data.taskCounter = (this.data.taskCounter || 0) + 1;
    const id = 'TSK' + String(this.data.taskCounter).padStart(3, '0');
    const task = { ...data, id, status: 'pending', createdAt: new Date().toISOString().split('T')[0], comments: [] };
    this.data.tasks.push(task);
    this.addNotification(data.assignedTo, `New task assigned: ${data.title}`, 'task');
    this._save();
    return task;
  },
  updateTaskStatus(id, status) {
    const task = this.data.tasks.find(t => t.id === id);
    if (task) {
      task.status = status;
      if (status === 'completed') {
        const empName = this.getEmployeeById(task.assignedTo)?.name || 'Employee';
        this.addNotification('ADMIN', `Task completed: "${task.title}" by ${empName}`, 'task');
      }
      this._save();
    }
    return task;
  },
  deleteTask(id) { this.data.tasks = this.data.tasks.filter(t => t.id !== id); this._save(); },

  // ── Orders ────────────────────────────────────────────────────
  addOrder(data) {
    this.data.orderCounter = (this.data.orderCounter || 0) + 1;
    const id = 'ORD' + String(this.data.orderCounter).padStart(3, '0');
    const order = { ...data, id, status: 'pending', createdAt: new Date().toISOString().split('T')[0], comments: [] };
    this.data.orders.push(order);
    if (data.assignedTo) this.addNotification(data.assignedTo, `New order assigned: ${data.clientName}`, 'order');
    this._save();
    return order;
  },
  updateOrderStatus(id, status) {
    const order = this.data.orders.find(o => o.id === id);
    if (order) {
      order.status = status;
      if (status === 'completed') {
        const empName = this.getEmployeeById(order.assignedTo)?.name || 'Employee';
        this.addNotification('ADMIN', `Order completed: "${order.clientName}" by ${empName}`, 'order');
      }
      this._save();
    }
    return order;
  },
  deleteOrder(id) { this.data.orders = this.data.orders.filter(o => o.id !== id); this._save(); },

  // ── Link Exchanges ────────────────────────────────────────────
  addLinkExchange(data) {
    this.data.linkExCounter = (this.data.linkExCounter || 0) + 1;
    const id = 'LX' + String(this.data.linkExCounter).padStart(4, '0');
    const entry = {
      id,
      empId: data.empId,
      // "From" = who we got the link from
      fromName:     data.fromName     || '',
      fromLinkedIn: data.fromLinkedIn || '',
      fromEmail:    data.fromEmail    || '',
      fromSite:     data.fromSite     || '',
      // "To" = who we gave the link to
      toName:       data.toName       || '',
      toLinkedIn:   data.toLinkedIn   || '',
      toEmail:      data.toEmail      || '',
      toSite:       data.toSite       || '',
      // Exchange state
      linkGiven:    data.linkGiven    || false,  // have we given a link to "to"?
      linkReceived: data.linkReceived || false,  // have we received a link from "from"?
      status:       data.status       || 'pending', // pending | in-progress | completed | cancelled
      notes:        data.notes        || '',
      createdAt:    new Date().toISOString().split('T')[0],
    };
    this.data.linkExchanges.push(entry);
    this._save();
    return entry;
  },
  updateLinkExchange(id, changes) {
    const idx = this.data.linkExchanges.findIndex(l => l.id === id);
    if (idx !== -1) {
      this.data.linkExchanges[idx] = { ...this.data.linkExchanges[idx], ...changes };
      this._save();
      return this.data.linkExchanges[idx];
    }
    return null;
  },
  deleteLinkExchange(id) {
    this.data.linkExchanges = this.data.linkExchanges.filter(l => l.id !== id);
    this._save();
  },
  getLinkExchangesForEmployee(empId) {
    return this.data.linkExchanges.filter(l => l.empId === empId);
  },

  // ── Comments ──────────────────────────────────────────────────
  addComment(type, itemId, text) {
    const list = type === 'task' ? this.data.tasks : this.data.orders;
    const item = list.find(i => i.id === itemId);
    if (!item) return null;
    const comment = {
      id: Date.now(),
      author: this.currentUser.name,
      authorId: this.currentUser.id,
      text,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split('T')[0]
    };
    item.comments.push(comment);
    this._save();
    return comment;
  },

  // ── Chat ──────────────────────────────────────────────────────
  getChatMessages(empId) {
    return this.data.chatMessages.filter(m =>
      (m.from === 'ADMIN' && m.to === empId) ||
      (m.from === empId  && m.to === 'ADMIN')
    );
  },
  sendChatMessage(to, text) {
    const msg = {
      id: Date.now(),
      from: this.currentUser.id,
      fromName: this.currentUser.name,
      to,
      text,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split('T')[0],
      read: false
    };
    this.data.chatMessages.push(msg);
    // Notify the receiver
    if (to !== 'ADMIN') {
      this.addNotification(to, `New message from Admin`, 'chat');
    } else {
      this.addNotification('ADMIN', `New message from ${this.currentUser.name}`, 'chat');
    }
    this._save();
    return msg;
  },

  // ── Notifications ─────────────────────────────────────────────
  addNotification(userId, message, type) {
    this.data.notifications.unshift({
      id: Date.now(), userId, message, type, read: false,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    });
    this._save();
  },
  getNotifications(userId) {
    if (userId === 'ADMIN') return this.data.notifications.filter(n => n.userId === 'ADMIN');
    return this.data.notifications.filter(n => n.userId === userId);
  },
  markAllRead(userId) {
    this.data.notifications.forEach(n => { if (n.userId === userId) n.read = true; });
    this._save();
  },

  // ── Helpers ───────────────────────────────────────────────────
  getEmployeeById(id) { return this.data.employees.find(e => e.id === id); },
  getTasksForEmployee(empId) { return this.data.tasks.filter(t => t.assignedTo === empId); },
  getOrdersForEmployee(empId) { return this.data.orders.filter(o => o.assignedTo === empId); },
  getUnreadCount(userId) { return this.data.notifications.filter(n => n.userId === userId && !n.read).length; },

  getStats() {
    return {
      totalEmployees:  this.data.employees.length,
      totalTasks:      this.data.tasks.length,
      pendingTasks:    this.data.tasks.filter(t => t.status === 'pending').length,
      completedTasks:  this.data.tasks.filter(t => t.status === 'completed').length,
      totalOrders:     this.data.orders.length,
      pendingOrders:   this.data.orders.filter(o => o.status === 'pending').length,
      completedOrders: this.data.orders.filter(o => o.status === 'completed').length,
      totalRevenue:    this.data.orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.amount, 0),
    };
  }
};

// Auto-init on load
SASIT.init();
