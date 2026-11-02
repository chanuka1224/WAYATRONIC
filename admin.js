/**
 * WayaTronic - Enterprise Admin Suite Controller (admin.js)
 * Full administrative control: Analytics, Inventory CRUD, Category CRUD, Order Processing, User Management, Database Backup.
 */

class WayaAdminController {
  constructor() {
    this.currentView = 'dashboard';
    this.editingProductId = null;
    this.editingCategoryId = null;
  }

  formatLKR(amount) {
    return 'LKR ' + Math.round(amount || 0).toLocaleString('en-US');
  }

  async init() {
    await window.WayaDB.readyPromise;
    this.checkAdminSession();
    this.bindEvents();
  }

  checkAdminSession() {
    const admin = window.WayaAuth.getCurrentAdmin();
    const loginSection = document.getElementById('adminLoginSection');
    const mainDashboard = document.getElementById('adminMainDashboard');
    const forcePasswordSection = document.getElementById('adminForcePasswordSection');

    if (!admin) {
      if (loginSection) loginSection.style.display = 'flex';
      if (mainDashboard) mainDashboard.style.display = 'none';
      if (forcePasswordSection) forcePasswordSection.style.display = 'none';
      return;
    }

    // Force password change on first login check
    if (admin.mustChangePassword) {
      if (loginSection) loginSection.style.display = 'none';
      if (mainDashboard) mainDashboard.style.display = 'none';
      if (forcePasswordSection) {
        forcePasswordSection.style.display = 'flex';
        const userDisplay = document.getElementById('forcePasswordAdminUser');
        if (userDisplay) userDisplay.textContent = admin.username;
      }
      return;
    }

    // Authenticated successfully
    if (loginSection) loginSection.style.display = 'none';
    if (forcePasswordSection) forcePasswordSection.style.display = 'none';
    if (mainDashboard) mainDashboard.style.display = 'flex';

    // Update admin badge
    const adminNameEl = document.getElementById('adminCurrentName');
    const adminRoleEl = document.getElementById('adminCurrentRole');
    if (adminNameEl) adminNameEl.textContent = admin.name || admin.username;
    if (adminRoleEl) adminRoleEl.textContent = admin.role;

    this.loadCurrentView();
  }

  bindEvents() {
    // Admin login form submit
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('adminUsernameInput').value.trim();
        const p = document.getElementById('adminPasswordInput').value;
        const errEl = document.getElementById('adminLoginError');
        try {
          if (errEl) errEl.style.display = 'none';
          await window.WayaAuth.loginAdmin(u, p);
          this.checkAdminSession();
        } catch (err) {
          if (errEl) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
          }
        }
      });
    }

    // Force change password form submit
    const forceForm = document.getElementById('adminForcePasswordForm');
    if (forceForm) {
      forceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const p1 = document.getElementById('newAdminPass1').value;
        const p2 = document.getElementById('newAdminPass2').value;
        const errEl = document.getElementById('adminForcePassError');
        
        if (p1 !== p2) {
          if (errEl) { errEl.textContent = 'Passwords do not match.'; errEl.style.display = 'block'; }
          return;
        }

        try {
          const current = window.WayaAuth.getCurrentAdmin();
          await window.WayaAuth.changeInitialAdminPassword(current.id, p1);
          window.WayaApp.showToast('Password updated successfully! Welcome to WayaTronic Admin.', 'success');
          this.checkAdminSession();
        } catch (err) {
          if (errEl) { errEl.textContent = err.message; errEl.style.display = 'block'; }
        }
      });
    }

    // Product search in admin
    const prodSearch = document.getElementById('adminProductSearch');
    if (prodSearch) {
      prodSearch.addEventListener('input', () => this.renderProductsTable());
    }

    // Category filter in admin
    const catFilter = document.getElementById('adminProductCategoryFilter');
    if (catFilter) {
      catFilter.addEventListener('change', () => this.renderProductsTable());
    }

    // Order status filter in admin
    const orderStatusFilter = document.getElementById('adminOrderStatusFilter');
    if (orderStatusFilter) {
      orderStatusFilter.addEventListener('change', () => this.renderOrdersTable());
    }
  }

  switchAdminView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll('.admin-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === viewName);
    });
    document.querySelectorAll('.admin-tab-pane').forEach(el => {
      el.style.display = el.id === `adminPane_${viewName}` ? 'block' : 'none';
    });
    this.loadCurrentView();
  }

  async loadCurrentView() {
    switch (this.currentView) {
      case 'dashboard':
        await this.renderDashboard();
        break;
      case 'products':
        await this.renderProductsTable();
        break;
      case 'categories':
        await this.renderCategoriesTable();
        break;
      case 'orders':
        await this.renderOrdersTable();
        break;
      case 'customers':
        await this.renderCustomersTable();
        break;
      case 'admins':
        await this.renderAdminsTable();
        break;
      case 'messages':
        await this.renderMessagesTable();
        break;
      case 'settings':
        await this.renderSettingsForm();
        break;
    }
  }

  // --- 1. Dashboard View with 6 Summary Cards and SVG Charts ---
  async renderDashboard() {
    const products = await window.WayaDB.getProducts();
    const customers = await window.WayaDB.getUsers();
    const orders = await window.WayaDB.getOrders();

    const totalProducts = products.length;
    const totalCustomers = customers.length;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.orderStatus !== 'Cancelled' ? o.total : 0), 0);
    const pendingOrders = orders.filter(o => o.orderStatus === 'Pending').length;
    const lowStockProducts = products.filter(p => p.stockQuantity <= 5).length;

    // Populate summary cards
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setVal('dashStatProducts', totalProducts);
    setVal('dashStatCustomers', totalCustomers);
    setVal('dashStatOrders', totalOrders);
    setVal('dashStatRevenue', this.formatLKR(totalRevenue));
    setVal('dashStatPending', pendingOrders);
    setVal('dashStatLowStock', lowStockProducts);

    // Render Recent Orders in dashboard
    const recentOrdersTable = document.getElementById('dashRecentOrdersBody');
    if (recentOrdersTable) {
      const recent = orders.slice(0, 5);
      if (recent.length === 0) {
        recentOrdersTable.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No orders placed yet.</td></tr>`;
      } else {
        recentOrdersTable.innerHTML = recent.map(o => `
          <tr>
            <td><strong>${o.id}</strong></td>
            <td>${o.customerName}<br><small class="text-muted">${o.customerPhone}</small></td>
            <td>${new Date(o.createdAt).toLocaleDateString()}</td>
            <td><strong>${this.formatLKR(o.total)}</strong></td>
            <td><span class="badge badge-status-${o.orderStatus.toLowerCase()}">${o.orderStatus}</span></td>
            <td>
              <button class="btn btn-secondary btn-xs" onclick="window.WayaAdmin.viewOrderDetails('${o.id}')">Manage</button>
            </td>
          </tr>
        `).join('');
      }
    }

    // Render Low Stock Table in dashboard
    const lowStockTable = document.getElementById('dashLowStockBody');
    if (lowStockTable) {
      const low = products.filter(p => p.stockQuantity <= 5).slice(0, 5);
      if (low.length === 0) {
        lowStockTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Inventory levels are healthy.</td></tr>`;
      } else {
        lowStockTable.innerHTML = low.map(p => `
          <tr>
            <td>
              <div class="table-prod-cell">
                <img src="${p.images[0]}" alt="${p.name}" class="table-thumb" />
                <div>
                  <strong>${p.name}</strong><br>
                  <small class="text-muted">${p.modelNumber} | ${p.sku}</small>
                </div>
              </div>
            </td>
            <td>${p.category}</td>
            <td><strong class="text-danger">${p.stockQuantity} units left</strong></td>
            <td>
              <button class="btn btn-primary btn-xs" onclick="window.WayaAdmin.openEditProductModal('${p.id}')">Restock</button>
            </td>
          </tr>
        `).join('');
      }
    }

    // Render SVG Analytics Charts
    this.renderCharts(orders, products);
  }

  renderCharts(orders, products) {
    const chartContainer = document.getElementById('dashRevenueChart');
    if (chartContainer) {
      // Create SVG Bar chart for last 6 periods/months
      const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
      const values = [185000, 240000, 310000, 420000, 380000, 520000];
      const maxVal = Math.max(...values);

      const bars = months.map((m, i) => {
        const height = (values[i] / maxVal) * 130;
        const x = 40 + i * 65;
        const y = 160 - height;
        return `
          <rect x="${x}" y="${y}" width="36" height="${height}" rx="4" fill="url(#chartGrad)" />
          <text x="${x + 18}" y="180" font-family="sans-serif" font-size="11" fill="#94a3b8" text-anchor="middle">${m}</text>
          <text x="${x + 18}" y="${y - 8}" font-family="sans-serif" font-size="9" font-weight="bold" fill="#00f2fe" text-anchor="middle">${Math.round(values[i]/1000)}k</text>
        `;
      }).join('');

      chartContainer.innerHTML = `
        <svg viewBox="0 0 460 200" width="100%" height="100%">
          <defs>
            <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#00f2fe"/>
              <stop offset="100%" stop-color="#0066ff"/>
            </linearGradient>
          </defs>
          <line x1="20" y1="160" x2="440" y2="160" stroke="#334155" stroke-width="1" />
          ${bars}
        </svg>
      `;
    }

    const catChartContainer = document.getElementById('dashCategoryChart');
    if (catChartContainer) {
      // Calculate category distribution
      const counts = {};
      products.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
      const topCats = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0, 5);

      catChartContainer.innerHTML = `
        <div class="category-bars-list">
          ${topCats.map(([cat, count]) => {
            const pct = Math.round((count / products.length) * 100);
            return `
              <div class="cat-bar-item">
                <div class="cat-bar-labels">
                  <span>${cat}</span>
                  <strong>${count} items (${pct}%)</strong>
                </div>
                <div class="cat-progress-track">
                  <div class="cat-progress-fill" style="width: ${pct}%"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  }

  // --- 2. Products Management View ---
  async renderProductsTable() {
    const products = await window.WayaDB.getProducts();
    const categories = await window.WayaDB.getCategories();
    const tbody = document.getElementById('adminProductsTableBody');
    if (!tbody) return;

    // Populate category dropdown filter if not already populated
    const catSelect = document.getElementById('adminProductCategoryFilter');
    if (catSelect && catSelect.children.length <= 1) {
      catSelect.innerHTML = '<option value="all">All Categories</option>' +
        categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }

    const q = (document.getElementById('adminProductSearch')?.value || '').toLowerCase().trim();
    const cat = document.getElementById('adminProductCategoryFilter')?.value || 'all';

    let filtered = products;
    if (q) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.modelNumber.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
      );
    }
    if (cat !== 'all') {
      filtered = filtered.filter(p => p.category === cat);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No products found matching criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(p => `
      <tr>
        <td>
          <div class="table-prod-cell">
            <img src="${p.images[0]}" alt="${p.name}" class="table-thumb" />
            <div>
              <strong>${p.name}</strong><br>
              <small class="text-muted">${p.brand} | Model: ${p.modelNumber}</small>
            </div>
          </div>
        </td>
        <td><code>${p.sku}</code></td>
        <td>${p.category}</td>
        <td>
          <strong>${this.formatLKR(p.discountPrice || p.price)}</strong>
          ${p.discountPrice ? `<br><small class="text-muted line-through">${this.formatLKR(p.price)}</small>` : ''}
        </td>
        <td>
          <span class="stock-badge ${p.stockQuantity <= 5 ? 'low' : 'ok'}">${p.stockQuantity} units</span>
        </td>
        <td>
          <div class="flag-badges">
            ${p.isFeatured ? '<span class="badge badge-featured">Featured</span>' : ''}
            ${p.isBestSeller ? '<span class="badge badge-bestseller">Best Seller</span>' : ''}
            ${p.isNewArrival ? '<span class="badge badge-new">New</span>' : ''}
          </div>
        </td>
        <td>
          <div class="action-btn-group">
            <button class="btn btn-secondary btn-xs" onclick="window.WayaAdmin.openEditProductModal('${p.id}')">Edit</button>
            <button class="btn btn-danger btn-xs" onclick="window.WayaAdmin.confirmDeleteProduct('${p.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  async openAddProductModal() {
    this.editingProductId = null;
    const modal = document.getElementById('adminProductModal');
    const form = document.getElementById('adminProductForm');
    const titleEl = document.getElementById('adminProductModalTitle');
    if (!modal || !form) return;

    form.reset();
    titleEl.textContent = 'Add New Instrument / Component';

    // Populate Category Dropdown
    const categories = await window.WayaDB.getCategories();
    const catSelect = document.getElementById('prodModalCategory');
    if (catSelect) {
      catSelect.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }

    // Clear spec lines
    document.getElementById('specsContainer').innerHTML = `
      <div class="spec-row">
        <input type="text" placeholder="Spec Name (e.g. Bandwidth)" class="spec-key" value="Bandwidth" />
        <input type="text" placeholder="Spec Value (e.g. 100 MHz)" class="spec-val" value="100 MHz" />
        <button type="button" class="btn-remove-spec" onclick="this.parentElement.remove()">×</button>
      </div>
    `;

    document.getElementById('prodModalImagePreview').innerHTML = '';
    modal.classList.add('active');
  }

  async openEditProductModal(productId) {
    this.editingProductId = productId;
    const product = await window.WayaDB.getProductById(productId);
    if (!product) return;

    const modal = document.getElementById('adminProductModal');
    const titleEl = document.getElementById('adminProductModalTitle');
    if (!modal) return;

    titleEl.textContent = `Edit Product: ${product.name}`;

    // Populate Category Dropdown
    const categories = await window.WayaDB.getCategories();
    const catSelect = document.getElementById('prodModalCategory');
    if (catSelect) {
      catSelect.innerHTML = categories.map(c => `<option value="${c.name}" ${c.name === product.category ? 'selected' : ''}>${c.name}</option>`).join('');
    }

    document.getElementById('prodModalName').value = product.name;
    document.getElementById('prodModalBrand').value = product.brand;
    document.getElementById('prodModalModel').value = product.modelNumber;
    document.getElementById('prodModalSKU').value = product.sku;
    document.getElementById('prodModalPrice').value = product.price;
    document.getElementById('prodModalDiscountPrice').value = product.discountPrice || '';
    document.getElementById('prodModalStock').value = product.stockQuantity;
    document.getElementById('prodModalDescription').value = product.description;
    document.getElementById('prodModalFeatured').checked = !!product.isFeatured;
    document.getElementById('prodModalBestSeller').checked = !!product.isBestSeller;
    document.getElementById('prodModalNewArrival').checked = !!product.isNewArrival;

    // Specifications builder
    const specsContainer = document.getElementById('specsContainer');
    specsContainer.innerHTML = '';
    if (product.specifications && Object.keys(product.specifications).length > 0) {
      Object.entries(product.specifications).forEach(([k, v]) => {
        const row = document.createElement('div');
        row.className = 'spec-row';
        row.innerHTML = `
          <input type="text" class="spec-key" value="${k}" />
          <input type="text" class="spec-val" value="${v}" />
          <button type="button" class="btn-remove-spec" onclick="this.parentElement.remove()">×</button>
        `;
        specsContainer.appendChild(row);
      });
    }

    // Image preview
    const preview = document.getElementById('prodModalImagePreview');
    preview.innerHTML = product.images.map(img => `<img src="${img}" class="preview-thumb" />`).join('');

    modal.classList.add('active');
  }

  addSpecRow() {
    const specsContainer = document.getElementById('specsContainer');
    const row = document.createElement('div');
    row.className = 'spec-row';
    row.innerHTML = `
      <input type="text" placeholder="Key (e.g. Sampling Rate)" class="spec-key" />
      <input type="text" placeholder="Value (e.g. 1 GSa/s)" class="spec-val" />
      <button type="button" class="btn-remove-spec" onclick="this.parentElement.remove()">×</button>
    `;
    specsContainer.appendChild(row);
  }

  handleProductImageUpload(event) {
    const files = Array.from(event.target.files);
    const preview = document.getElementById('prodModalImagePreview');
    if (!files.length) return;

    preview.innerHTML = '';
    this.uploadedProductImageBase64 = [];

    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedProductImageBase64.push(e.target.result);
        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = 'preview-thumb';
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  }

  async saveProduct(event) {
    if (event) event.preventDefault();

    const name = document.getElementById('prodModalName').value.trim();
    const brand = document.getElementById('prodModalBrand').value.trim();
    const modelNumber = document.getElementById('prodModalModel').value.trim();
    const sku = document.getElementById('prodModalSKU').value.trim();
    const category = document.getElementById('prodModalCategory').value;
    const price = parseFloat(document.getElementById('prodModalPrice').value);
    const discountVal = document.getElementById('prodModalDiscountPrice').value;
    const discountPrice = discountVal ? parseFloat(discountVal) : null;
    const stockQuantity = parseInt(document.getElementById('prodModalStock').value, 10);
    const description = document.getElementById('prodModalDescription').value.trim();
    const isFeatured = document.getElementById('prodModalFeatured').checked;
    const isBestSeller = document.getElementById('prodModalBestSeller').checked;
    const isNewArrival = document.getElementById('prodModalNewArrival').checked;

    if (!name || !sku || isNaN(price) || isNaN(stockQuantity)) {
      window.WayaApp.showToast('Please fill all mandatory product fields.', 'error');
      return;
    }

    // Gather specs
    const specs = {};
    document.querySelectorAll('#specsContainer .spec-row').forEach(row => {
      const k = row.querySelector('.spec-key').value.trim();
      const v = row.querySelector('.spec-val').value.trim();
      if (k && v) specs[k] = v;
    });

    let images = this.uploadedProductImageBase64 && this.uploadedProductImageBase64.length
      ? this.uploadedProductImageBase64
      : null;

    if (this.editingProductId) {
      const existing = await window.WayaDB.getProductById(this.editingProductId);
      const payload = {
        name,
        brand,
        modelNumber,
        sku,
        category,
        price,
        discountPrice,
        stockQuantity,
        description,
        isFeatured,
        isBestSeller,
        isNewArrival,
        specifications: specs,
        status: stockQuantity === 0 ? 'out_of_stock' : stockQuantity <= 5 ? 'low_stock' : 'in_stock'
      };
      if (images) payload.images = images;

      await window.WayaDB.updateProduct(this.editingProductId, payload);
      window.WayaApp.showToast('Product updated successfully.', 'success');
    } else {
      if (!images || !images.length) {
        images = ['assets/images/multimeter.svg'];
      }
      await window.WayaDB.addProduct({
        name,
        brand,
        modelNumber,
        sku,
        category,
        price,
        discountPrice,
        stockQuantity,
        description,
        isFeatured,
        isBestSeller,
        isNewArrival,
        specifications: specs,
        images,
        status: stockQuantity === 0 ? 'out_of_stock' : stockQuantity <= 5 ? 'low_stock' : 'in_stock'
      });
      window.WayaApp.showToast('New product added to inventory.', 'success');
    }

    this.closeProductModal();
    await this.renderProductsTable();
  }

  closeProductModal() {
    const modal = document.getElementById('adminProductModal');
    if (modal) modal.classList.remove('active');
    this.uploadedProductImageBase64 = null;
  }

  async confirmDeleteProduct(id) {
    const p = await window.WayaDB.getProductById(id);
    if (!p) return;
    if (confirm(`Are you sure you want to delete product "${p.name}" (${p.sku})? This action cannot be undone.`)) {
      await window.WayaDB.deleteProduct(id);
      window.WayaApp.showToast('Product deleted.', 'info');
      await this.renderProductsTable();
    }
  }

  // --- 3. Categories Management View ---
  async renderCategoriesTable() {
    const categories = await window.WayaDB.getCategories();
    const products = await window.WayaDB.getProducts();
    const tbody = document.getElementById('adminCategoriesTableBody');
    if (!tbody) return;

    tbody.innerHTML = categories.map(c => {
      const count = products.filter(p => p.category === c.name).length;
      return `
        <tr>
          <td>
            <div class="cat-cell">
              <img src="assets/images/${c.icon || 'multimeter.svg'}" class="cat-icon-thumb" />
              <strong>${c.name}</strong>
            </div>
          </td>
          <td><code>${c.slug}</code></td>
          <td>${c.description}</td>
          <td><span class="badge badge-secondary">${count} products</span></td>
          <td>
            <div class="action-btn-group">
              <button class="btn btn-secondary btn-xs" onclick="window.WayaAdmin.openEditCategoryModal('${c.id}')">Edit</button>
              <button class="btn btn-danger btn-xs" onclick="window.WayaAdmin.confirmDeleteCategory('${c.id}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  openAddCategoryModal() {
    this.editingCategoryId = null;
    const modal = document.getElementById('adminCategoryModal');
    const form = document.getElementById('adminCategoryForm');
    const title = document.getElementById('adminCategoryModalTitle');
    if (!modal || !form) return;

    form.reset();
    title.textContent = 'Add Product Category';
    modal.classList.add('active');
  }

  async openEditCategoryModal(id) {
    this.editingCategoryId = id;
    const categories = await window.WayaDB.getCategories();
    const cat = categories.find(c => c.id === id);
    if (!cat) return;

    const modal = document.getElementById('adminCategoryModal');
    const title = document.getElementById('adminCategoryModalTitle');
    if (!modal) return;

    title.textContent = `Edit Category: ${cat.name}`;
    document.getElementById('catModalName').value = cat.name;
    document.getElementById('catModalSlug').value = cat.slug;
    document.getElementById('catModalDescription').value = cat.description || '';
    document.getElementById('catModalIcon').value = cat.icon || 'multimeter.svg';
    modal.classList.add('active');
  }

  async saveCategory(event) {
    if (event) event.preventDefault();
    const name = document.getElementById('catModalName').value.trim();
    const slug = document.getElementById('catModalSlug').value.trim();
    const description = document.getElementById('catModalDescription').value.trim();
    const icon = document.getElementById('catModalIcon').value;

    if (!name) {
      window.WayaApp.showToast('Category name is required.', 'error');
      return;
    }

    try {
      if (this.editingCategoryId) {
        await window.WayaDB.updateCategory(this.editingCategoryId, { name, slug, description, icon });
        window.WayaApp.showToast('Category updated.', 'success');
      } else {
        await window.WayaDB.addCategory({ name, slug, description, icon });
        window.WayaApp.showToast('Category created.', 'success');
      }
      this.closeCategoryModal();
      await this.renderCategoriesTable();
    } catch (err) {
      window.WayaApp.showToast(err.message, 'error');
    }
  }

  closeCategoryModal() {
    const modal = document.getElementById('adminCategoryModal');
    if (modal) modal.classList.remove('active');
  }

  async confirmDeleteCategory(id) {
    const categories = await window.WayaDB.getCategories();
    const cat = categories.find(c => c.id === id);
    if (!cat) return;

    if (confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      try {
        await window.WayaDB.deleteCategory(id);
        window.WayaApp.showToast('Category deleted.', 'info');
        await this.renderCategoriesTable();
      } catch (err) {
        window.WayaApp.showToast(err.message, 'error');
      }
    }
  }

  // --- 4. Orders Management View ---
  async renderOrdersTable() {
    const orders = await window.WayaDB.getOrders();
    const tbody = document.getElementById('adminOrdersTableBody');
    if (!tbody) return;

    const filterStatus = document.getElementById('adminOrderStatusFilter')?.value || 'all';
    let filtered = orders;
    if (filterStatus !== 'all') {
      filtered = filtered.filter(o => o.orderStatus === filterStatus);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No orders matching current filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(o => `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>
          <strong>${o.customerName}</strong><br>
          <small class="text-muted">${o.customerEmail} | ${o.customerPhone}</small>
        </td>
        <td>${new Date(o.createdAt).toLocaleDateString()}</td>
        <td>
          ${o.items.length} items<br>
          <small class="text-muted">${o.items.map(i => i.name).slice(0, 1).join('')}${o.items.length > 1 ? ` +${o.items.length - 1} more` : ''}</small>
        </td>
        <td>
          <strong>${this.formatLKR(o.total)}</strong><br>
          <small class="text-muted">${o.paymentMethod}</small>
        </td>
        <td>
          <span class="badge badge-status-${o.orderStatus.toLowerCase()}">${o.orderStatus}</span>
          ${o.paymentSlipUrl ? '<span class="badge badge-info" title="Bank slip attached">Slip Attached</span>' : ''}
        </td>
        <td>
          <button class="btn btn-secondary btn-xs" onclick="window.WayaAdmin.viewOrderDetails('${o.id}')">Manage Order</button>
        </td>
      </tr>
    `).join('');
  }

  async viewOrderDetails(orderId) {
    const order = await window.WayaDB.getOrderById(orderId);
    if (!order) return;

    const modal = document.getElementById('adminOrderModal');
    const container = document.getElementById('adminOrderModalContent');
    if (!modal || !container) return;

    container.innerHTML = `
      <div class="admin-order-detail-grid">
        <div class="admin-order-info-block">
          <h3>Order Details: ${order.id}</h3>
          <p><strong>Customer:</strong> ${order.customerName} (${order.customerPhone})</p>
          <p><strong>Email:</strong> ${order.customerEmail}</p>
          <p><strong>Delivery Address:</strong> ${order.deliveryAddress.street}, ${order.deliveryAddress.city}, District: ${order.deliveryAddress.district} ${order.deliveryAddress.postalCode ? ' - ' + order.deliveryAddress.postalCode : ''}</p>
          <p><strong>Instructions:</strong> ${order.deliveryAddress.instructions || 'None'}</p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>

          ${order.paymentSlipUrl ? `
            <div class="attached-slip-box">
              <h4>Bank Payment Receipt</h4>
              <a href="${order.paymentSlipUrl}" target="_blank">
                <img src="${order.paymentSlipUrl}" class="slip-large-preview" alt="Customer Payment Slip" />
              </a>
            </div>
          ` : '<p class="text-muted">No deposit slip uploaded.</p>'}
        </div>

        <div class="admin-order-action-block">
          <h4>Update Order Status</h4>
          <div class="form-group">
            <label>Current Status:</label>
            <select id="updateOrderStatusSelect" class="form-control">
              <option value="Pending" ${order.orderStatus === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Confirmed" ${order.orderStatus === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="Processing" ${order.orderStatus === 'Processing' ? 'selected' : ''}>Processing</option>
              <option value="Shipped" ${order.orderStatus === 'Shipped' ? 'selected' : ''}>Shipped</option>
              <option value="Delivered" ${order.orderStatus === 'Delivered' ? 'selected' : ''}>Delivered</option>
              <option value="Cancelled" ${order.orderStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </div>

          <div class="form-group">
            <label>Courier Tracking Number (e.g. PRONET-LK-XXXX):</label>
            <input type="text" id="updateCourierTracking" class="form-control" value="${order.courierTracking || ''}" placeholder="Enter Tracking No" />
          </div>

          <button class="btn btn-primary btn-block" onclick="window.WayaAdmin.saveOrderStatus('${order.id}')">Save Status &amp; Tracking</button>

          <hr />
          <h4>Itemized Summary</h4>
          <table class="table-compact">
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Price</th></tr>
            </thead>
            <tbody>
              ${order.items.map(i => `
                <tr>
                  <td>${i.name}</td>
                  <td>${i.quantity}</td>
                  <td>${this.formatLKR(i.price * i.quantity)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr><td colspan="2">Total:</td><td><strong>${this.formatLKR(order.total)}</strong></td></tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;

    modal.classList.add('active');
  }

  async saveOrderStatus(orderId) {
    const status = document.getElementById('updateOrderStatusSelect').value;
    const tracking = document.getElementById('updateCourierTracking').value.trim();

    await window.WayaDB.updateOrderStatus(orderId, status, tracking);
    window.WayaApp.showToast(`Order ${orderId} updated to ${status}.`, 'success');
    this.closeOrderModal();
    await this.renderOrdersTable();
  }

  closeOrderModal() {
    const modal = document.getElementById('adminOrderModal');
    if (modal) modal.classList.remove('active');
  }

  // --- 5. Customers Management View ---
  async renderCustomersTable() {
    const customers = await window.WayaDB.getUsers();
    const orders = await window.WayaDB.getOrders();
    const tbody = document.getElementById('adminCustomersTableBody');
    if (!tbody) return;

    tbody.innerHTML = customers.map(c => {
      const userOrders = orders.filter(o => o.userId === c.id || o.customerEmail === c.email);
      const totalSpent = userOrders.reduce((sum, o) => sum + (o.orderStatus !== 'Cancelled' ? o.total : 0), 0);
      return `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td>${c.email}</td>
          <td>${c.phone || '-'}</td>
          <td>${c.district || '-'}, ${c.city || ''}</td>
          <td><span class="badge badge-secondary">${userOrders.length} orders</span></td>
          <td><strong>${this.formatLKR(totalSpent)}</strong></td>
          <td>
            <button class="btn ${c.isActive ? 'btn-danger' : 'btn-success'} btn-xs" 
                    onclick="window.WayaAdmin.toggleCustomerActive('${c.id}', ${!c.isActive})">
              ${c.isActive ? 'Suspend' : 'Activate'}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async toggleCustomerActive(id, newState) {
    await window.WayaDB.updateUser(id, { isActive: newState });
    window.WayaApp.showToast(`Customer account ${newState ? 'activated' : 'suspended'}.`, 'info');
    await this.renderCustomersTable();
  }

  // --- 6. Admin Accounts Management View ---
  async renderAdminsTable() {
    const admins = await window.WayaDB.getAdmins();
    const tbody = document.getElementById('adminAccountsTableBody');
    if (!tbody) return;

    tbody.innerHTML = admins.map(a => `
      <tr>
        <td><strong>${a.username}</strong></td>
        <td>${a.name}</td>
        <td>${a.email || '-'}</td>
        <td><span class="badge badge-primary">${a.role}</span></td>
        <td>${a.isActive ? '<span class="text-success">Active</span>' : '<span class="text-danger">Disabled</span>'}</td>
        <td>
          ${a.username !== 'Admin' ? `
            <button class="btn btn-danger btn-xs" onclick="window.WayaAdmin.toggleAdminActive('${a.id}', ${!a.isActive})">
              ${a.isActive ? 'Disable' : 'Enable'}
            </button>
          ` : '<span class="text-muted">Master Admin</span>'}
        </td>
      </tr>
    `).join('');
  }

  openCreateAdminModal() {
    const modal = document.getElementById('adminCreateAdminModal');
    const form = document.getElementById('adminCreateAdminForm');
    if (modal && form) {
      form.reset();
      modal.classList.add('active');
    }
  }

  async saveNewAdmin(event) {
    if (event) event.preventDefault();
    const username = document.getElementById('newAdminUsername').value.trim();
    const name = document.getElementById('newAdminFullName').value.trim();
    const email = document.getElementById('newAdminEmail').value.trim();
    const role = document.getElementById('newAdminRole').value;
    const password = document.getElementById('newAdminPassword').value;

    if (!username || !password || password.length < 8) {
      window.WayaApp.showToast('Username and password (min 8 chars) are required.', 'error');
      return;
    }

    try {
      await window.WayaDB.createAdmin({ username, name, email, role, password });
      window.WayaApp.showToast(`Admin account "${username}" created successfully.`, 'success');
      this.closeCreateAdminModal();
      await this.renderAdminsTable();
    } catch (err) {
      window.WayaApp.showToast(err.message, 'error');
    }
  }

  closeCreateAdminModal() {
    const modal = document.getElementById('adminCreateAdminModal');
    if (modal) modal.classList.remove('active');
  }

  async toggleAdminActive(id, newState) {
    await window.WayaDB.updateAdmin(id, { isActive: newState });
    window.WayaApp.showToast(`Administrator account status updated.`, 'info');
    await this.renderAdminsTable();
  }

  // --- 7. Messages View ---
  async renderMessagesTable() {
    const messages = await window.WayaDB.getMessages();
    const tbody = document.getElementById('adminMessagesTableBody');
    if (!tbody) return;

    if (messages.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No inquiry messages yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = messages.map(m => `
      <tr>
        <td><strong>${m.name}</strong><br><small class="text-muted">${m.email} | ${m.phone}</small></td>
        <td><strong>${m.subject}</strong></td>
        <td><p class="table-msg-preview">${m.message}</p></td>
        <td>${new Date(m.createdAt).toLocaleDateString()}</td>
        <td><span class="badge badge-info">${m.status}</span></td>
      </tr>
    `).join('');
  }

  // --- 8. Store Settings Form ---
  async renderSettingsForm() {
    const settings = await window.WayaDB.getSettings();
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

    setVal('settingsStoreName', settings.storeName);
    setVal('settingsTagline', settings.tagline);
    setVal('settingsPhone', settings.phone);
    setVal('settingsEmail', settings.email);
    setVal('settingsAddress', settings.address);
    setVal('settingsAnnouncement', settings.announcement);
    setVal('settingsFreeShippingThreshold', settings.freeShippingThreshold);
    setVal('settingsStandardShippingFee', settings.standardShippingFee);

    if (settings.bankDetails) {
      setVal('settingsBankName', settings.bankDetails.bankName);
      setVal('settingsAccountName', settings.bankDetails.accountName);
      setVal('settingsAccountNumber', settings.bankDetails.accountNumber);
      setVal('settingsBranch', settings.bankDetails.branch);
    }
  }

  async saveSettings(event) {
    if (event) event.preventDefault();
    const getVal = id => document.getElementById(id)?.value.trim();

    const payload = {
      storeName: getVal('settingsStoreName'),
      tagline: getVal('settingsTagline'),
      phone: getVal('settingsPhone'),
      email: getVal('settingsEmail'),
      address: getVal('settingsAddress'),
      announcement: getVal('settingsAnnouncement'),
      freeShippingThreshold: parseFloat(getVal('settingsFreeShippingThreshold')),
      standardShippingFee: parseFloat(getVal('settingsStandardShippingFee')),
      bankDetails: {
        bankName: getVal('settingsBankName'),
        accountName: getVal('settingsAccountName'),
        accountNumber: getVal('settingsAccountNumber'),
        branch: getVal('settingsBranch')
      }
    };

    await window.WayaDB.updateSettings(payload);
    window.WayaApp.showToast('Store settings updated.', 'success');
  }

  // --- Database Export / Import / Reset ---
  async exportDb() {
    const json = await window.WayaDB.exportDatabase();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wayatronic_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    window.WayaApp.showToast('Database exported as JSON.', 'success');
  }

  importDb(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        await window.WayaDB.importDatabase(e.target.result);
        window.WayaApp.showToast('Database imported successfully! Reloading...', 'success');
        setTimeout(() => location.reload(), 1200);
      } catch (err) {
        window.WayaApp.showToast(err.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  async resetDb() {
    if (confirm('CRITICAL WARNING: This will reset all products, orders, categories, and customers to factory defaults. Continue?')) {
      await window.WayaDB.resetToDefaults();
      window.WayaApp.showToast('Database reset to defaults. Reloading...', 'info');
      setTimeout(() => location.reload(), 1200);
    }
  }
}

// Global Singleton Instance
window.WayaAdmin = new WayaAdminController();
