/**
 * WayaTronic - Main Application Controller (app.js)
 * Router, UI View Transitions, Live Autocomplete Search, Oscilloscope Hero Canvas, Modals, Customer Portal.
 */

class WayaAppController {
  constructor() {
    this.currentView = 'home';
  }

  async init() {
    await window.WayaDB.readyPromise;
    this.setupRouter();
    this.setupHeader();
    this.setupCartDrawer();
    this.setupOscilloscopeCanvas();
    this.renderHomeSections();
    this.setupAccountPortal();
    this.setupNewsletter();
    this.setupContactForm();
    this.setupTrackOrder();

    // Listen for DB updates
    window.addEventListener('wayatronic:db_changed', () => {
      this.refreshCurrentView();
    });
  }

  // --- Router & View Management ---
  setupRouter() {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '') || 'home';
      const [route, param] = hash.split('/');
      this.navigateTo(route, param, false);
    };

    window.addEventListener('hashchange', handleHash);
    handleHash();
  }

  navigateTo(viewName, param = null, updateHash = true) {
    this.currentView = viewName;
    if (updateHash) {
      window.location.hash = param ? `${viewName}/${param}` : viewName;
    }

    // Hide all view containers
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.style.display = 'none';
    });

    // Close any active slide drawers/modals
    this.closeCartDrawer();
    this.closeMobileNav();

    // Show target view
    const targetEl = document.getElementById(`view_${viewName}`) || document.getElementById('view_home');
    if (targetEl) {
      targetEl.style.display = 'block';
    }

    // Update active nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.view === viewName);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Handle view specific rendering
    switch (viewName) {
      case 'home':
        this.renderHomeSections();
        break;
      case 'products':
        if (param) {
          window.WayaProducts.currentFilters.category = decodeURIComponent(param);
        }
        this.renderProductsPage();
        break;
      case 'categories':
        this.renderCategoriesPage();
        break;
      case 'about':
        break;
      case 'contact':
        break;
      case 'account':
        this.renderAccountPortal();
        break;
      case 'cart':
        this.renderFullCartPage();
        break;
      case 'checkout':
        window.WayaCheckout.initCheckoutForm();
        break;
      case 'track':
        if (param) {
          const trackInput = document.getElementById('trackOrderInput');
          if (trackInput) {
            trackInput.value = param;
            this.handleTrackLookup();
          }
        }
        break;
    }
  }

  refreshCurrentView() {
    this.updateCartBadge();
    if (this.currentView === 'home') this.renderHomeSections();
    if (this.currentView === 'products') this.renderProductsPage();
    if (this.currentView === 'categories') this.renderCategoriesPage();
    if (this.currentView === 'account') this.renderAccountPortal();
    if (this.currentView === 'cart') this.renderFullCartPage();
  }

  // --- Header, Live Search & Mobile Drawer ---
  setupHeader() {
    // Cart badge listener
    window.addEventListener('wayatronic:cart_updated', () => {
      this.updateCartBadge();
    });
    this.updateCartBadge();

    // Customer Auth state listener
    window.addEventListener('wayatronic:auth_changed', () => {
      this.updateAuthHeaderButtons();
    });
    this.updateAuthHeaderButtons();

    // Search Autocomplete input
    const searchInput = document.getElementById('headerSearchInput');
    const searchDropdown = document.getElementById('searchAutocompleteDropdown');
    const searchForm = document.getElementById('headerSearchForm');

    if (searchInput && searchDropdown) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const q = e.target.value.trim();
        if (q.length < 2) {
          searchDropdown.style.display = 'none';
          return;
        }

        debounceTimer = setTimeout(async () => {
          const products = await window.WayaDB.getProducts();
          const matches = products.filter(p => 
            p.name.toLowerCase().includes(q.toLowerCase()) ||
            p.modelNumber.toLowerCase().includes(q.toLowerCase()) ||
            p.brand.toLowerCase().includes(q.toLowerCase()) ||
            p.sku.toLowerCase().includes(q.toLowerCase()) ||
            p.category.toLowerCase().includes(q.toLowerCase())
          ).slice(0, 5);

          if (matches.length === 0) {
            searchDropdown.innerHTML = `<div class="search-no-results">No instruments or parts found for "${q}".</div>`;
            searchDropdown.style.display = 'block';
            return;
          }

          searchDropdown.innerHTML = `
            <div class="search-results-header">Matching Instruments &amp; Parts</div>
            ${matches.map(p => `
              <div class="search-result-row" onclick="window.WayaProducts.openProductModal('${p.id}'); document.getElementById('searchAutocompleteDropdown').style.display='none';">
                <img src="${p.images[0]}" alt="${p.name}" class="search-result-thumb" />
                <div class="search-result-info">
                  <div class="search-result-name">${p.name}</div>
                  <div class="search-result-meta">${p.brand} | Model: ${p.modelNumber} | SKU: ${p.sku}</div>
                </div>
                <div class="search-result-price">${window.WayaProducts.formatLKR(p.discountPrice || p.price)}</div>
              </div>
            `).join('')}
            <div class="search-view-all-btn" onclick="window.WayaApp.executeSearch('${q}');">
              View all results for "${q}" →
            </div>
          `;
          searchDropdown.style.display = 'block';
        }, 200);
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box-wrapper')) {
          searchDropdown.style.display = 'none';
        }
      });
    }

    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = searchInput.value.trim();
        this.executeSearch(q);
      });
    }

    // Sticky Header Scroll effect
    window.addEventListener('scroll', () => {
      const header = document.querySelector('.site-header');
      if (header) {
        header.classList.toggle('scrolled', window.scrollY > 40);
      }
    });

    // Mobile nav toggle
    const mobileBtn = document.getElementById('mobileNavToggle');
    const mobileNav = document.getElementById('mobileNavDrawer');
    if (mobileBtn && mobileNav) {
      mobileBtn.addEventListener('click', () => {
        mobileNav.classList.toggle('active');
      });
    }
  }

  executeSearch(query) {
    const searchDropdown = document.getElementById('searchAutocompleteDropdown');
    if (searchDropdown) searchDropdown.style.display = 'none';

    window.WayaProducts.currentFilters.searchQuery = query;
    window.WayaProducts.currentPage = 1;
    this.navigateTo('products');
  }

  closeMobileNav() {
    const mobileNav = document.getElementById('mobileNavDrawer');
    if (mobileNav) mobileNav.classList.remove('active');
  }

  updateAuthHeaderButtons() {
    const customer = window.WayaAuth.getCurrentCustomer();
    const guestLinks = document.getElementById('headerGuestAuth');
    const userMenu = document.getElementById('headerUserMenu');
    const userNameSpan = document.getElementById('headerCustomerName');

    if (customer) {
      if (guestLinks) guestLinks.style.display = 'none';
      if (userMenu) userMenu.style.display = 'flex';
      if (userNameSpan) userNameSpan.textContent = customer.name.split(' ')[0];
    } else {
      if (guestLinks) guestLinks.style.display = 'flex';
      if (userMenu) userMenu.style.display = 'none';
    }
  }

  updateCartBadge() {
    const count = window.WayaCart ? window.WayaCart.getItemCount() : 0;
    document.querySelectorAll('.cart-badge').forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    });
  }

  // --- Shopping Cart Drawer ---
  setupCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartDrawerOverlay');
    const closeBtn = document.getElementById('closeCartDrawer');

    if (closeBtn) closeBtn.addEventListener('click', () => this.closeCartDrawer());
    if (overlay) overlay.addEventListener('click', () => this.closeCartDrawer());

    // Render whenever cart changes
    window.addEventListener('wayatronic:cart_updated', (e) => {
      this.renderCartDrawerContent(e.detail.items, e.detail.summary);
    });

    // Initial render
    const sum = window.WayaCart.getSummary();
    this.renderCartDrawerContent(sum.items, sum);
  }

  openCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartDrawerOverlay');
    if (drawer && overlay) {
      drawer.classList.add('active');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartDrawerOverlay');
    if (drawer && overlay) {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  renderCartDrawerContent(items, summary) {
    const container = document.getElementById('cartDrawerItems');
    const footer = document.getElementById('cartDrawerFooter');
    if (!container || !footer) return;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-cart-view">
          <div class="empty-icon">🛒</div>
          <h4>Your cart is empty</h4>
          <p>Add precision multimeters, oscilloscopes, or components to your bench.</p>
          <button class="btn btn-primary" onclick="window.WayaApp.closeCartDrawer(); window.WayaApp.navigateTo('products');">Explore Products</button>
        </div>
      `;
      footer.style.display = 'none';
      return;
    }

    footer.style.display = 'block';

    // Shipping progress bar
    const progressPct = Math.min(100, Math.round((summary.subtotal / summary.freeShippingThreshold) * 100));
    const shippingBanner = summary.qualifiesForFreeShipping
      ? `<div class="free-ship-banner achieved">✓ You qualify for FREE Islandwide Courier Delivery!</div>`
      : `<div class="free-ship-banner">Add <strong>${window.WayaProducts.formatLKR(summary.amountNeededForFreeShipping)}</strong> more for <strong>FREE Islandwide Delivery</strong>
          <div class="ship-progress-bar"><div class="fill" style="width:${progressPct}%"></div></div>
         </div>`;

    container.innerHTML = `
      ${shippingBanner}
      <div class="drawer-items-list">
        ${items.map(item => `
          <div class="drawer-cart-item">
            <img src="${item.image}" alt="${item.name}" class="drawer-thumb" />
            <div class="drawer-item-details">
              <h5 class="drawer-item-title">${item.name}</h5>
              <div class="drawer-item-sku">SKU: ${item.sku}</div>
              <div class="drawer-item-price">${window.WayaProducts.formatLKR(item.price)}</div>
              
              <div class="drawer-qty-row">
                <div class="qty-pill">
                  <button type="button" onclick="window.WayaCart.updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                  <span>${item.quantity}</span>
                  <button type="button" onclick="window.WayaCart.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                </div>
                <button type="button" class="btn-remove-item" onclick="window.WayaCart.removeItem('${item.id}')" title="Remove item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    footer.innerHTML = `
      <div class="drawer-summary-line">
        <span>Subtotal</span>
        <span>${window.WayaProducts.formatLKR(summary.subtotal)}</span>
      </div>
      ${summary.discountSavings > 0 ? `
        <div class="drawer-summary-line discount">
          <span>Savings</span>
          <span>-${window.WayaProducts.formatLKR(summary.discountSavings)}</span>
        </div>
      ` : ''}
      <div class="drawer-summary-line">
        <span>Delivery (Sri Lanka)</span>
        <span>${summary.shippingFee === 0 ? '<strong class="text-success">FREE</strong>' : window.WayaProducts.formatLKR(summary.shippingFee)}</span>
      </div>
      <div class="drawer-summary-line total">
        <span>Est. Total (LKR)</span>
        <span>${window.WayaProducts.formatLKR(summary.finalTotal)}</span>
      </div>
      
      <div class="drawer-actions">
        <button class="btn btn-secondary btn-block" onclick="window.WayaApp.closeCartDrawer(); window.WayaApp.navigateTo('cart');">
          View Shopping Cart
        </button>
        <button class="btn btn-primary btn-block btn-lg" onclick="window.WayaApp.closeCartDrawer(); window.WayaApp.navigateTo('checkout');">
          Proceed to Checkout →
        </button>
      </div>
    `;
  }

  // --- Oscilloscope Hero Canvas Animation ---
  setupOscilloscopeCanvas() {
    const canvas = document.getElementById('oscilloscopeHeroCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = canvas.parentElement.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let offset = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const cy = h / 2;

      // Draw subtle grid
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Sine Wave 1 (Electric Blue)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 102, 255, 0.5)';
      ctx.lineWidth = 2.5;
      for (let x = 0; x < w; x += 3) {
        const y = cy + Math.sin((x * 0.015) + offset) * 45 + Math.sin((x * 0.03) + offset * 1.5) * 15;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Sine Wave 2 (Glowing Cyan with lead offset)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.85)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 10;
      for (let x = 0; x < w; x += 3) {
        const y = cy + Math.cos((x * 0.018) + (offset * 1.2)) * 38;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // reset glow

      offset += 0.04;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
  }

  // --- Homepage Sections Rendering ---
  async renderHomeSections() {
    const products = await window.WayaDB.getProducts();
    const categories = await window.WayaDB.getCategories();
    const reviews = window.WayaDB.data ? window.WayaDB.data.reviews : [];

    // 1. Featured Products (6 items)
    const featuredEl = document.getElementById('featuredProductsGrid');
    if (featuredEl) {
      const featured = products.filter(p => p.isFeatured).slice(0, 6);
      featuredEl.innerHTML = featured.map(p => window.WayaProducts.renderProductCard(p)).join('');
    }

    // 2. Popular Categories Grid (all 12 or top 6)
    const categoriesEl = document.getElementById('popularCategoriesGrid');
    if (categoriesEl) {
      categoriesEl.innerHTML = categories.map(cat => {
        const count = products.filter(p => p.category === cat.name).length;
        return `
          <div class="category-card" onclick="window.WayaApp.navigateTo('products', '${encodeURIComponent(cat.name)}')">
            <div class="cat-card-icon-wrap">
              <img src="assets/images/${cat.icon}" alt="${cat.name}" />
            </div>
            <h4 class="cat-card-title">${cat.name}</h4>
            <p class="cat-card-desc">${cat.description}</p>
            <div class="cat-card-count">${count} Products Available →</div>
          </div>
        `;
      }).join('');
    }

    // 3. Best Sellers Section (4 items)
    const bestSellersEl = document.getElementById('bestSellersGrid');
    if (bestSellersEl) {
      const best = products.filter(p => p.isBestSeller).slice(0, 4);
      bestSellersEl.innerHTML = best.map(p => window.WayaProducts.renderProductCard(p)).join('');
    }

    // 4. New Arrivals Section (4 items)
    const newArrivalsEl = document.getElementById('newArrivalsGrid');
    if (newArrivalsEl) {
      const news = products.filter(p => p.isNewArrival).slice(0, 4);
      newArrivalsEl.innerHTML = news.map(p => window.WayaProducts.renderProductCard(p)).join('');
    }

    // 5. Customer Reviews Section
    const reviewsEl = document.getElementById('customerReviewsGrid');
    if (reviewsEl && reviews.length > 0) {
      reviewsEl.innerHTML = reviews.map(r => `
        <div class="review-card">
          <div class="review-stars">${'★'.repeat(r.rating)}</div>
          <p class="review-comment">"${r.comment}"</p>
          <div class="review-author-box">
            <strong>${r.author}</strong>
            <span>${r.role}</span>
          </div>
        </div>
      `).join('');
    }
  }

  // --- Products Catalog Page (Search, Filters, Sorting, Pagination) ---
  async renderProductsPage() {
    const categories = await window.WayaDB.getCategories();
    const products = await window.WayaDB.getProducts();

    // Populate category filter links / sidebar
    const catListEl = document.getElementById('catalogCategoryFilters');
    if (catListEl) {
      catListEl.innerHTML = `
        <li class="filter-cat-item ${window.WayaProducts.currentFilters.category === 'all' ? 'active' : ''}" 
            onclick="window.WayaApp.applyCatalogCategory('all')">
          <span>All Categories</span>
          <span class="count">${products.length}</span>
        </li>
        ${categories.map(c => {
          const count = products.filter(p => p.category === c.name).length;
          const isActive = window.WayaProducts.currentFilters.category.toLowerCase() === c.name.toLowerCase();
          return `
            <li class="filter-cat-item ${isActive ? 'active' : ''}" 
                onclick="window.WayaApp.applyCatalogCategory('${c.name}')">
              <span>${c.name}</span>
              <span class="count">${count}</span>
            </li>
          `;
        }).join('')}
      `;
    }

    // Populate Brand Checkboxes
    const brandListEl = document.getElementById('catalogBrandFilters');
    if (brandListEl) {
      const brands = Array.from(new Set(products.map(p => p.brand)));
      brandListEl.innerHTML = brands.map(b => `
        <label class="filter-checkbox-label">
          <input type="radio" name="catalogBrand" value="${b}" 
                 ${window.WayaProducts.currentFilters.brand === b ? 'checked' : ''} 
                 onchange="window.WayaApp.applyCatalogBrand('${b}')" />
          <span>${b}</span>
        </label>
      `).join('') + `
        <label class="filter-checkbox-label">
          <input type="radio" name="catalogBrand" value="all" 
                 ${window.WayaProducts.currentFilters.brand === 'all' ? 'checked' : ''} 
                 onchange="window.WayaApp.applyCatalogBrand('all')" />
          <span>All Brands</span>
        </label>
      `;
    }

    // Bind Sorting & Stock toggle
    const sortSelect = document.getElementById('catalogSortSelect');
    if (sortSelect) {
      sortSelect.value = window.WayaProducts.currentFilters.sortBy;
      sortSelect.onchange = (e) => {
        window.WayaProducts.currentFilters.sortBy = e.target.value;
        this.renderCatalogGrid();
      };
    }

    const inStockToggle = document.getElementById('catalogInStockToggle');
    if (inStockToggle) {
      inStockToggle.checked = window.WayaProducts.currentFilters.inStockOnly;
      inStockToggle.onchange = (e) => {
        window.WayaProducts.currentFilters.inStockOnly = e.target.checked;
        window.WayaProducts.currentPage = 1;
        this.renderCatalogGrid();
      };
    }

    // Price Filter Buttons
    const applyPriceBtn = document.getElementById('applyPriceFilterBtn');
    if (applyPriceBtn) {
      applyPriceBtn.onclick = () => {
        const min = parseFloat(document.getElementById('catalogMinPrice').value);
        const max = parseFloat(document.getElementById('catalogMaxPrice').value);
        window.WayaProducts.currentFilters.minPrice = isNaN(min) ? null : min;
        window.WayaProducts.currentFilters.maxPrice = isNaN(max) ? null : max;
        window.WayaProducts.currentPage = 1;
        this.renderCatalogGrid();
      };
    }

    await this.renderCatalogGrid();
  }

  applyCatalogCategory(catName) {
    window.WayaProducts.currentFilters.category = catName;
    window.WayaProducts.currentPage = 1;
    this.renderProductsPage();
  }

  applyCatalogBrand(brandName) {
    window.WayaProducts.currentFilters.brand = brandName;
    window.WayaProducts.currentPage = 1;
    this.renderCatalogGrid();
  }

  async renderCatalogGrid() {
    const gridContainer = document.getElementById('catalogProductsGrid');
    const paginationContainer = document.getElementById('catalogPagination');
    const resultsCountEl = document.getElementById('catalogResultsCount');
    if (!gridContainer) return;

    gridContainer.innerHTML = '<div class="catalog-loading">Searching instrument inventory...</div>';

    const result = await window.WayaProducts.getPaginatedResults();

    if (resultsCountEl) {
      resultsCountEl.textContent = `Showing ${result.startIndex}–${result.endIndex} of ${result.totalItems} results`;
    }

    if (result.items.length === 0) {
      gridContainer.innerHTML = `
        <div class="catalog-empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No matching equipment found</h3>
          <p>Try clearing some filters or searching for broader terms like "Multimeter", "Probe", or "Rigol".</p>
          <button class="btn btn-secondary" onclick="window.WayaApp.resetCatalogFilters()">Reset All Filters</button>
        </div>
      `;
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    gridContainer.innerHTML = result.items.map(p => window.WayaProducts.renderProductCard(p)).join('');

    // Render Pagination
    if (paginationContainer) {
      if (result.totalPages <= 1) {
        paginationContainer.innerHTML = '';
      } else {
        let pagesHtml = '';
        pagesHtml += `<button class="page-btn" ${result.currentPage === 1 ? 'disabled' : ''} onclick="window.WayaApp.changePage(${result.currentPage - 1})">« Prev</button>`;
        for (let i = 1; i <= result.totalPages; i++) {
          pagesHtml += `<button class="page-btn ${result.currentPage === i ? 'active' : ''}" onclick="window.WayaApp.changePage(${i})">${i}</button>`;
        }
        pagesHtml += `<button class="page-btn ${result.currentPage === result.totalPages ? 'disabled' : ''} onclick="window.WayaApp.changePage(${result.currentPage + 1})">Next »</button>`;
        paginationContainer.innerHTML = pagesHtml;
      }
    }
  }

  changePage(pageNum) {
    window.WayaProducts.currentPage = pageNum;
    this.renderCatalogGrid();
    window.scrollTo({ top: 300, behavior: 'smooth' });
  }

  resetCatalogFilters() {
    window.WayaProducts.currentFilters = {
      searchQuery: '',
      category: 'all',
      brand: 'all',
      minPrice: null,
      maxPrice: null,
      inStockOnly: false,
      sortBy: 'featured'
    };
    window.WayaProducts.currentPage = 1;
    const searchInput = document.getElementById('headerSearchInput');
    if (searchInput) searchInput.value = '';
    const minInput = document.getElementById('catalogMinPrice');
    const maxInput = document.getElementById('catalogMaxPrice');
    if (minInput) minInput.value = '';
    if (maxInput) maxInput.value = '';
    this.renderProductsPage();
  }

  // --- Categories Standalone Page ---
  async renderCategoriesPage() {
    const categories = await window.WayaDB.getCategories();
    const products = await window.WayaDB.getProducts();
    const container = document.getElementById('allCategoriesGrid');
    if (!container) return;

    container.innerHTML = categories.map(cat => {
      const count = products.filter(p => p.category === cat.name).length;
      return `
        <div class="category-page-card" onclick="window.WayaApp.navigateTo('products', '${encodeURIComponent(cat.name)}')">
          <div class="cat-page-icon-wrap">
            <img src="assets/images/${cat.icon}" alt="${cat.name}" />
          </div>
          <div class="cat-page-content">
            <h3>${cat.name}</h3>
            <p>${cat.description}</p>
            <div class="cat-page-meta">
              <span class="badge badge-secondary">${count} Instruments &amp; Items</span>
              <span class="btn-link">Explore Category →</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Full Shopping Cart Page ---
  renderFullCartPage() {
    const summary = window.WayaCart.getSummary();
    const itemsContainer = document.getElementById('fullCartItemsTableBody');
    const orderSummaryContainer = document.getElementById('fullCartOrderSummary');
    const emptyContainer = document.getElementById('fullCartEmptyState');
    const tableContainer = document.getElementById('fullCartTableContainer');

    if (!itemsContainer || !orderSummaryContainer) return;

    if (summary.items.length === 0) {
      if (emptyContainer) emptyContainer.style.display = 'block';
      if (tableContainer) tableContainer.style.display = 'none';
      return;
    }

    if (emptyContainer) emptyContainer.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'block';

    itemsContainer.innerHTML = summary.items.map(item => `
      <tr>
        <td>
          <div class="cart-table-item">
            <img src="${item.image}" alt="${item.name}" class="cart-table-thumb" />
            <div>
              <strong>${item.name}</strong><br>
              <small class="text-muted">${item.brand} | Model: ${item.modelNumber}</small>
            </div>
          </div>
        </td>
        <td>${window.WayaProducts.formatLKR(item.price)}</td>
        <td>
          <div class="qty-pill">
            <button type="button" onclick="window.WayaCart.updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
            <span>${item.quantity}</span>
            <button type="button" onclick="window.WayaCart.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
          </div>
        </td>
        <td><strong>${window.WayaProducts.formatLKR(item.price * item.quantity)}</strong></td>
        <td>
          <button class="btn-text-danger" onclick="window.WayaCart.removeItem('${item.id}')">Remove</button>
        </td>
      </tr>
    `).join('');

    orderSummaryContainer.innerHTML = `
      <div class="order-summary-box">
        <h3>Order Summary</h3>
        <div class="summary-line">
          <span>Items Subtotal</span>
          <span>${window.WayaProducts.formatLKR(summary.subtotal)}</span>
        </div>
        ${summary.discountSavings > 0 ? `
          <div class="summary-line text-success">
            <span>Special Promotional Savings</span>
            <span>-${window.WayaProducts.formatLKR(summary.discountSavings)}</span>
          </div>
        ` : ''}
        <div class="summary-line">
          <span>Islandwide Delivery</span>
          <span>${summary.shippingFee === 0 ? '<strong class="text-success">FREE Delivery</strong>' : window.WayaProducts.formatLKR(summary.shippingFee)}</span>
        </div>
        <div class="summary-line grand-total">
          <span>Estimated Total (LKR)</span>
          <span class="total-price">${window.WayaProducts.formatLKR(summary.finalTotal)}</span>
        </div>
        <button class="btn btn-primary btn-block btn-lg" onclick="window.WayaApp.navigateTo('checkout')">
          Proceed to Checkout
        </button>
        <button class="btn btn-secondary btn-block" onclick="window.WayaApp.navigateTo('products')">
          Continue Shopping
        </button>
      </div>
    `;
  }

  // --- Customer Account Portal & Modals ---
  setupAccountPortal() {
    // Customer login form
    const loginForm = document.getElementById('customerLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('custLoginEmail').value.trim();
        const pass = document.getElementById('custLoginPassword').value;
        const errEl = document.getElementById('custLoginError');
        try {
          if (errEl) errEl.style.display = 'none';
          await window.WayaAuth.loginCustomer(email, pass);
          this.closeAuthModal();
          this.showToast('Welcome back! You are now logged in.', 'success');
          this.navigateTo('account');
        } catch (err) {
          if (errEl) { errEl.textContent = err.message; errEl.style.display = 'block'; }
        }
      });
    }

    // Customer register form
    const regForm = document.getElementById('customerRegisterForm');
    if (regForm) {
      // Populate district select in register form
      const regDistrict = document.getElementById('custRegDistrict');
      if (regDistrict && regDistrict.children.length <= 1) {
        regDistrict.innerHTML = window.WayaCheckout.districts.map(d => `<option value="${d}">${d}</option>`).join('');
      }

      regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('custRegName').value.trim();
        const email = document.getElementById('custRegEmail').value.trim();
        const phone = document.getElementById('custRegPhone').value.trim();
        const district = document.getElementById('custRegDistrict').value;
        const address = document.getElementById('custRegAddress').value.trim();
        const pass1 = document.getElementById('custRegPassword').value;
        const pass2 = document.getElementById('custRegConfirmPassword').value;
        const errEl = document.getElementById('custRegError');

        if (pass1 !== pass2) {
          if (errEl) { errEl.textContent = 'Passwords do not match.'; errEl.style.display = 'block'; }
          return;
        }

        try {
          if (errEl) errEl.style.display = 'none';
          await window.WayaAuth.registerCustomer({ name, email, phone, district, address, password: pass1 });
          this.closeAuthModal();
          this.showToast('Account registered successfully! Welcome to WayaTronic.', 'success');
          this.navigateTo('account');
        } catch (err) {
          if (errEl) { errEl.textContent = err.message; errEl.style.display = 'block'; }
        }
      });
    }

    // Forgot password form
    const forgotForm = document.getElementById('customerForgotForm');
    if (forgotForm) {
      forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('custForgotEmail').value.trim();
        const newPass = document.getElementById('custForgotNewPass').value;
        const errEl = document.getElementById('custForgotError');
        try {
          if (errEl) errEl.style.display = 'none';
          await window.WayaAuth.resetPassword(email, newPass);
          this.showToast('Password reset successfully. Please login with your new password.', 'success');
          this.switchAuthTab('login');
        } catch (err) {
          if (errEl) { errEl.textContent = err.message; errEl.style.display = 'block'; }
        }
      });
    }

    // Customer profile update form
    const profileForm = document.getElementById('customerProfileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const customer = window.WayaAuth.getCurrentCustomer();
        if (!customer) return;

        const name = document.getElementById('profileNameInput').value.trim();
        const phone = document.getElementById('profilePhoneInput').value.trim();
        const district = document.getElementById('profileDistrictSelect').value;
        const address = document.getElementById('profileAddressInput').value.trim();
        const city = document.getElementById('profileCityInput').value.trim();
        const postal = document.getElementById('profilePostalInput').value.trim();
        const newPass = document.getElementById('profileNewPassInput').value;

        try {
          const payload = { name, phone, district, address, city, postalCode: postal };
          if (newPass && newPass.length >= 6) payload.password = newPass;

          await window.WayaDB.updateUser(customer.id, payload);
          // update session
          customer.name = name;
          customer.phone = phone;
          customer.district = district;
          customer.address = address;
          customer.city = city;
          customer.postalCode = postal;
          localStorage.setItem('wayatronic_customer_session', JSON.stringify(customer));

          this.showToast('Profile information saved.', 'success');
        } catch (err) {
          this.showToast(err.message, 'error');
        }
      });
    }
  }

  openAuthModal(initialTab = 'login') {
    const modal = document.getElementById('customerAuthModal');
    if (modal) {
      this.switchAuthTab(initialTab);
      modal.classList.add('active');
    }
  }

  closeAuthModal() {
    const modal = document.getElementById('customerAuthModal');
    if (modal) modal.classList.remove('active');
  }

  switchAuthTab(tabName) {
    document.querySelectorAll('.auth-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.auth-form-pane').forEach(pane => {
      pane.style.display = pane.id === `authPane_${tabName}` ? 'block' : 'none';
    });
  }

  async renderAccountPortal() {
    const customer = window.WayaAuth.getCurrentCustomer();
    const guestNotice = document.getElementById('accountGuestNotice');
    const portalContent = document.getElementById('accountPortalContent');

    if (!customer) {
      if (guestNotice) guestNotice.style.display = 'block';
      if (portalContent) portalContent.style.display = 'none';
      return;
    }

    if (guestNotice) guestNotice.style.display = 'none';
    if (portalContent) portalContent.style.display = 'block';

    // Populate profile inputs
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    setVal('profileNameInput', customer.name);
    setVal('profileEmailInput', customer.email);
    setVal('profilePhoneInput', customer.phone);
    setVal('profileAddressInput', customer.address);
    setVal('profileCityInput', customer.city);
    setVal('profilePostalInput', customer.postalCode);

    // Populate district select in profile
    const distSelect = document.getElementById('profileDistrictSelect');
    if (distSelect) {
      distSelect.innerHTML = window.WayaCheckout.districts.map(d => `
        <option value="${d}" ${d === customer.district ? 'selected' : ''}>${d}</option>
      `).join('');
    }

    // Render Order History
    const orders = await window.WayaDB.getOrders();
    const userOrders = orders.filter(o => o.userId === customer.id || o.customerEmail === customer.email);
    const ordersTbody = document.getElementById('accountOrdersTableBody');

    if (ordersTbody) {
      if (userOrders.length === 0) {
        ordersTbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">You have not placed any orders yet.</td></tr>`;
      } else {
        ordersTbody.innerHTML = userOrders.map(o => `
          <tr>
            <td><strong>${o.id}</strong></td>
            <td>${new Date(o.createdAt).toLocaleDateString()}</td>
            <td>${o.items.length} items (${o.items.map(i=>i.name).slice(0, 1).join('')}${o.items.length>1?'...':''})</td>
            <td><strong>${window.WayaProducts.formatLKR(o.total)}</strong></td>
            <td><span class="badge badge-status-${o.orderStatus.toLowerCase()}">${o.orderStatus}</span></td>
            <td>
              <button class="btn btn-secondary btn-xs" onclick="window.WayaApp.navigateTo('track', '${o.id}')">Track Order</button>
            </td>
          </tr>
        `).join('');
      }
    }
  }

  // --- Order Tracking System ---
  setupTrackOrder() {
    const form = document.getElementById('trackOrderForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleTrackLookup();
      });
    }
  }

  async handleTrackLookup() {
    const input = document.getElementById('trackOrderInput');
    const resultBox = document.getElementById('trackOrderResultBox');
    if (!input || !resultBox) return;

    const orderId = input.value.trim().toUpperCase();
    if (!orderId) {
      this.showToast('Please enter an Order Number (e.g. WT-2026-8841).', 'error');
      return;
    }

    const order = await window.WayaDB.getOrderById(orderId);
    if (!order) {
      resultBox.innerHTML = `
        <div class="tracking-not-found">
          <h4>Order Not Found</h4>
          <p>We could not find any active order with tracking ID <strong>"${orderId}"</strong>. Please verify the order number from your confirmation receipt.</p>
        </div>
      `;
      resultBox.style.display = 'block';
      return;
    }

    // Status step progression mapping
    const statuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];
    let currentStepIndex = statuses.indexOf(order.orderStatus);
    if (currentStepIndex === -1 && order.orderStatus === 'Cancelled') {
      currentStepIndex = -1;
    }

    resultBox.innerHTML = `
      <div class="tracking-card">
        <div class="tracking-header">
          <div>
            <h3>Order ${order.id}</h3>
            <span class="text-muted">Recipient: ${order.customerName} | Placed on ${new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
          <div>
            <span class="badge badge-status-${order.orderStatus.toLowerCase()} badge-lg">${order.orderStatus}</span>
          </div>
        </div>

        ${order.orderStatus === 'Cancelled' ? `
          <div class="tracking-cancelled-banner">
            This order has been cancelled. For inquiries regarding refund or recalibration, please contact support@wayatronic.lk.
          </div>
        ` : `
          <div class="tracking-stepper">
            ${statuses.map((step, idx) => {
              const isDone = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return `
                <div class="tracking-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}">
                  <div class="step-circle">${isDone ? '✓' : idx + 1}</div>
                  <div class="step-label">${step}</div>
                </div>
              `;
            }).join('')}
          </div>
        `}

        <div class="tracking-meta-grid">
          <div>
            <strong>Delivery Destination:</strong>
            <p>${order.deliveryAddress.street}, ${order.deliveryAddress.city}, District: ${order.deliveryAddress.district}</p>
          </div>
          <div>
            <strong>Courier Partner &amp; Waybill:</strong>
            <p>${order.courierTracking ? `<strong>Tracking Code: ${order.courierTracking}</strong> (Islandwide Express)` : 'Will be updated upon dispatch'}</p>
          </div>
        </div>

        <div class="tracking-items-summary">
          <h4>Instruments &amp; Parts in this Order</h4>
          <ul>
            ${order.items.map(i => `<li>${i.quantity}x ${i.name} (SKU: ${i.sku || 'N/A'}) - ${window.WayaProducts.formatLKR(i.price * i.quantity)}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
    resultBox.style.display = 'block';
  }

  // --- Contact Us Form ---
  setupContactForm() {
    const form = document.getElementById('contactUsForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('contactName').value.trim();
        const email = document.getElementById('contactEmail').value.trim();
        const phone = document.getElementById('contactPhone').value.trim();
        const subject = document.getElementById('contactSubject').value.trim();
        const message = document.getElementById('contactMessage').value.trim();

        if (!name || !email || !message) {
          this.showToast('Please fill out all required fields.', 'error');
          return;
        }

        try {
          await window.WayaDB.addMessage({ name, email, phone, subject, message });
          form.reset();
          this.showToast('Thank you! Your message has been received by WayaTronic technical support.', 'success');
        } catch (err) {
          this.showToast(err.message, 'error');
        }
      });
    }
  }

  // --- Newsletter Form ---
  setupNewsletter() {
    const form = document.getElementById('newsletterForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('newsletterEmail');
        const email = emailInput ? emailInput.value.trim() : '';
        if (email && email.includes('@')) {
          this.showToast('Thank you for subscribing! Your 5% calibration discount code: WAYA5PRO', 'success');
          if (emailInput) emailInput.value = '';
        } else {
          this.showToast('Please enter a valid email address.', 'error');
        }
      });
    }
  }

  // --- Toast Notifications ---
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">
        ${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}
      </span>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }
}

// Global Singleton Instance
window.WayaApp = new WayaAppController();
document.addEventListener('DOMContentLoaded', () => {
  window.WayaApp.init();
});
