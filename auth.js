/**
 * WayaTronic - Authentication & Role-Based Session Manager (auth.js)
 * Manages Customer and Admin authentication, sessions, and security checks.
 */

class WayaAuthManager {
  constructor() {
    this.CUSTOMER_SESSION_KEY = 'wayatronic_customer_session';
    this.ADMIN_SESSION_KEY = 'wayatronic_admin_session';
  }

  // --- Customer Authentication ---
  async loginCustomer(email, password) {
    if (!email || !password) throw new Error('Please enter both email and password.');
    
    const user = await window.WayaDB.getUserByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    if (!user.isActive) {
      throw new Error('This account has been suspended. Please contact customer support.');
    }

    const isValid = await window.WayaDB.verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!isValid) {
      throw new Error('Invalid email or password.');
    }

    const sessionData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      district: user.district,
      address: user.address,
      city: user.city,
      postalCode: user.postalCode,
      loginTime: new Date().toISOString()
    };

    localStorage.setItem(this.CUSTOMER_SESSION_KEY, JSON.stringify(sessionData));
    window.dispatchEvent(new CustomEvent('wayatronic:auth_changed', { detail: { type: 'customer', session: sessionData } }));
    return sessionData;
  }

  async registerCustomer(userData) {
    const { name, email, phone, password, district, address, city, postalCode } = userData;
    if (!name || !email || !password) {
      throw new Error('Name, email, and password are required.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const newUser = await window.WayaDB.registerUser({
      name,
      email,
      phone: phone || '',
      password,
      district: district || 'Colombo',
      address: address || '',
      city: city || '',
      postalCode: postalCode || ''
    });

    return await this.loginCustomer(email, password);
  }

  logoutCustomer() {
    localStorage.removeItem(this.CUSTOMER_SESSION_KEY);
    window.dispatchEvent(new CustomEvent('wayatronic:auth_changed', { detail: { type: 'customer', session: null } }));
  }

  getCurrentCustomer() {
    try {
      const data = localStorage.getItem(this.CUSTOMER_SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  async resetPassword(email, newPassword) {
    const user = await window.WayaDB.getUserByEmail(email);
    if (!user) {
      throw new Error('No registered account found with that email address.');
    }
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    await window.WayaDB.updateUser(user.id, { password: newPassword });
    return true;
  }

  // --- Admin Authentication ---
  async loginAdmin(username, password) {
    if (!username || !password) throw new Error('Please enter username and password.');

    const admin = await window.WayaDB.getAdminByUsername(username);
    if (!admin) {
      throw new Error('Invalid administrator credentials.');
    }

    if (!admin.isActive) {
      throw new Error('This administrator account has been disabled.');
    }

    const isValid = await window.WayaDB.verifyPassword(password, admin.passwordHash, admin.passwordSalt);
    if (!isValid) {
      throw new Error('Invalid administrator credentials.');
    }

    const sessionData = {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      mustChangePassword: !!admin.mustChangePassword,
      loginTime: new Date().toISOString()
    };

    localStorage.setItem(this.ADMIN_SESSION_KEY, JSON.stringify(sessionData));
    window.dispatchEvent(new CustomEvent('wayatronic:auth_changed', { detail: { type: 'admin', session: sessionData } }));
    return sessionData;
  }

  async changeInitialAdminPassword(adminId, newPassword) {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }
    if (newPassword === 'Admin123@') {
      throw new Error('New password cannot be the default development password.');
    }

    await window.WayaDB.updateAdmin(adminId, { password: newPassword });
    
    // Update active session
    const current = this.getCurrentAdmin();
    if (current && current.id === adminId) {
      current.mustChangePassword = false;
      localStorage.setItem(this.ADMIN_SESSION_KEY, JSON.stringify(current));
    }
    return true;
  }

  logoutAdmin() {
    localStorage.removeItem(this.ADMIN_SESSION_KEY);
    window.dispatchEvent(new CustomEvent('wayatronic:auth_changed', { detail: { type: 'admin', session: null } }));
  }

  getCurrentAdmin() {
    try {
      const data = localStorage.getItem(this.ADMIN_SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  isCustomerLoggedIn() {
    return !!this.getCurrentCustomer();
  }

  isAdminLoggedIn() {
    const admin = this.getCurrentAdmin();
    return !!(admin && !admin.mustChangePassword);
  }
}

// Global Singleton Instance
window.WayaAuth = new WayaAuthManager();
