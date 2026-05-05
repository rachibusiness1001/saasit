// SASIT - Central Data Store with localStorage persistence

const DEFAULT_DATA = {
  employees: [],
  tasks: [],
  orders: [],
  notifications: [],
  chatMessages: [],
  adminCredentials: { username: 'admin', password: 'admin123', email: '' },
  admins: [
    { id: 'ADM001', name: 'Super Admin', username: 'admin', password: 'admin123', email: '', type: 'Super Admin', createdAt: '2025-01-01' },
  ],
  emailConfig: { serviceId: '', templateId: '', publicKey: '' },
};

const SASIT = {
  data: null,
  currentUser: null,
  currentRole: null,

  // ─── Persistence ──────────────────────────────────────────────
  load() {
    try {
      const saved = localStorage.getItem('sasit_data');
      if (saved) {
        this.data = JSON.parse(saved);
        // Ensure new keys exist if old data loaded
        if (!this.data.admins) this.data.admins = DEFAULT_DATA.admins;
        if (!this.data.emailConfig) this.data.emailConfig = DEFAULT_DATA.emailConfig;
        if (!this.data.chatMessages) this.data.chatMessages = [];
        if (!this.data.notifications) this.data.notifications = [];
      } else {
        this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
        this.save();
      }
    } catch(e) {
      this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
  },

  save() {
    try {
      localStorage.setItem('sasit_data', JSON.stringify(this.data));
    } catch(e) {
      console.warn('localStorage save failed:', e);
    }
  },

  // ─── Auth ─────────────────────────────────────────────────────
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
      const emp = this.data.employees.find(e => e.email === username && e.id === password);
      if (emp) { this.currentUser = emp; this.currentRole = 'employee'; return true; }
      return false;
    }
  },
  logout() { this.currentUser = null; this.currentRole = null; },

  // ─── Employee CRUD ────────────────────────────────────────────
  addEmployee(data) {
    const num = this.data.employees.length + 1;
    const id = 'EMP' + String(num).padStart(3, '0');
    const emp = { ...data, id, joinDate: new Date().toISOString().split('T')[0], avatar: data.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) };
    this.data.employees.push(emp);
    this.save();
    return emp;
  },
  deleteEmployee(id) {
    this.data.employees = this.data.employees.filter(e => e.id !== id);
    this.save();
  },

  // ─── Admin CRUD ───────────────────────────────────────────────
  addAdmin(data) {
    const id = 'ADM' + String(this.data.admins.length + 1).padStart(3, '0');
    const admin = { ...data, id, type: 'Admin', createdAt: new Date().toISOString().split('T')[0] };
    this.data.admins.push(admin);
    this.save();
    return admin;
  },
  deleteAdmin(id) {
    if (id === 'ADM001') return false;
    this.data.admins = this.data.admins.filter(a => a.id !== id);
    this.save();
    return true;
  },

  // ─── Task CRUD ────────────────────────────────────────────────
  addTask(data) {
    const id = 'TSK' + String(this.data.tasks.length + 1).padStart(3, '0');
    const task = { ...data, id, status: 'pending', createdAt: new Date().toISOString().split('T')[0], comments: [] };
    this.data.tasks.push(task);
    this.addNotification(data.assignedTo, `New task assigned: ${data.title}`, 'task');
    this.save();
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
      this.save();
    }
    return task;
  },
  deleteTask(id) {
    this.data.tasks = this.data.tasks.filter(t => t.id !== id);
    this.save();
  },

  // ─── Order CRUD ───────────────────────────────────────────────
  addOrder(data) {
    const id = 'ORD' + String(this.data.orders.length + 1).padStart(3, '0');
    const order = { ...data, id, status: 'pending', createdAt: new Date().toISOString().split('T')[0], comments: [] };
    this.data.orders.push(order);
    if (data.assignedTo) this.addNotification(data.assignedTo, `New order assigned: ${data.clientName}`, 'order');
    this.save();
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
      this.save();
    }
    return order;
  },
  deleteOrder(id) {
    this.data.orders = this.data.orders.filter(o => o.id !== id);
    this.save();
  },

  // ─── Comments ─────────────────────────────────────────────────
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
    this.save();
    return comment;
  },

  // ─── Chat ─────────────────────────────────────────────────────
  getChatMessages(empId) {
    return this.data.chatMessages.filter(m =>
      (m.from === 'ADMIN' && m.to === empId) ||
      (m.from === empId && m.to === 'ADMIN')
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
    this.save();
    return msg;
  },

  // ─── Notifications ────────────────────────────────────────────
  addNotification(userId, message, type) {
    this.data.notifications.unshift({
      id: Date.now(), userId, message, type, read: false,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    });
    // Keep max 100 notifications
    if (this.data.notifications.length > 100) this.data.notifications = this.data.notifications.slice(0, 100);
    this.save();
  },
  getNotifications(userId) {
    if (userId === 'ADMIN') return this.data.notifications.filter(n => n.userId === 'ADMIN');
    return this.data.notifications.filter(n => n.userId === userId);
  },
  markAllRead(userId) {
    this.data.notifications.forEach(n => { if (n.userId === userId) n.read = true; });
    this.save();
  },

  // ─── Settings ─────────────────────────────────────────────────
  saveEmailConfig(config) {
    this.data.emailConfig = config;
    this.save();
  },
  saveAdminEmail(email) {
    this.data.adminCredentials.email = email;
    this.save();
  },

  // ─── Helpers ──────────────────────────────────────────────────
  getEmployeeById(id) { return this.data.employees.find(e => e.id === id); },
  getTasksForEmployee(empId) { return this.data.tasks.filter(t => t.assignedTo === empId); },
  getOrdersForEmployee(empId) { return this.data.orders.filter(o => o.assignedTo === empId); },
  getUnreadCount(userId) { return this.data.notifications.filter(n => n.userId === userId && !n.read).length; },

  getStats() {
    return {
      totalEmployees: this.data.employees.length,
      totalTasks: this.data.tasks.length,
      pendingTasks: this.data.tasks.filter(t => t.status === 'pending').length,
      completedTasks: this.data.tasks.filter(t => t.status === 'completed').length,
      totalOrders: this.data.orders.length,
      pendingOrders: this.data.orders.filter(o => o.status === 'pending').length,
      completedOrders: this.data.orders.filter(o => o.status === 'completed').length,
      totalRevenue: this.data.orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.amount, 0),
    };
  }
};

// Load data immediately when script runs
SASIT.load();
