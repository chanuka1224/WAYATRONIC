/**
 * WayaTronic - Product Catalog, Search, Filtering & Presentation Controller (products.js)
 */

class WayaProductsManager {
  constructor() {
    this.currentFilters = {
      searchQuery: '',
      category: 'all',
      brand: 'all',
      minPrice: null,
      maxPrice: null,
      inStockOnly: false,
      sortBy: 'featured'
    };
    this.currentPage = 1;
    this.itemsPerPage = 9;
  }

  formatLKR(amount) {
    return 'LKR ' + Math.round(amount).toLocaleString('en-US');
  }

  async filterProducts() {
    let list = await window.WayaDB.getProducts();

    // 1. Search Query Filter (name, brand, model number, SKU, description)
    if (this.currentFilters.searchQuery && this.currentFilters.searchQuery.trim() !== '') {
      const q = this.currentFilters.searchQuery.toLowerCase().trim();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.modelNumber.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }

    // 2. Category Filter
    if (this.currentFilters.category && this.currentFilters.category !== 'all') {
      list = list.filter(p => p.category.toLowerCase() === this.currentFilters.category.toLowerCase());
    }

    // 3. Brand Filter
    if (this.currentFilters.brand && this.currentFilters.brand !== 'all') {
      list = list.filter(p => p.brand.toLowerCase() === this.currentFilters.brand.toLowerCase());
    }

    // 4. Price Range Filter
    if (this.currentFilters.minPrice !== null && !isNaN(this.currentFilters.minPrice)) {
      list = list.filter(p => (p.discountPrice || p.price) >= this.currentFilters.minPrice);
    }
    if (this.currentFilters.maxPrice !== null && !isNaN(this.currentFilters.maxPrice)) {
      list = list.filter(p => (p.discountPrice || p.price) <= this.currentFilters.maxPrice);
    }

    // 5. In Stock Only Filter
    if (this.currentFilters.inStockOnly) {
      list = list.filter(p => p.stockQuantity > 0 && p.status !== 'out_of_stock');
    }

    // 6. Sorting
    switch (this.currentFilters.sortBy) {
      case 'price_low_high':
        list.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
        break;
      case 'price_high_low':
        list.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
        break;
      case 'newest':
        list.sort((a, b) => (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0) || (b.createdAt > a.createdAt ? 1 : -1));
        break;
      case 'popularity':
      case 'bestseller':
        list.sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0) || b.reviewCount - a.reviewCount);
        break;
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'featured':
      default:
        list.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0));
        break;
    }

    return list;
  }

  async getPaginatedResults() {
    const allFiltered = await this.filterProducts();
    const totalItems = allFiltered.length;
    const totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;

    if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const paginatedItems = allFiltered.slice(startIndex, startIndex + this.itemsPerPage);

    return {
      items: paginatedItems,
      totalItems,
      totalPages,
      currentPage: this.currentPage,
      startIndex: totalItems > 0 ? startIndex + 1 : 0,
      endIndex: Math.min(startIndex + this.itemsPerPage, totalItems)
    };
  }

  // Generate HTML for a single product card
  renderProductCard(product) {
    const effectivePrice = product.discountPrice || product.price;
    const hasDiscount = product.discountPrice && product.discountPrice < product.price;
    const discountPercent = hasDiscount ? Math.round(((product.price - product.discountPrice) / product.price) * 100) : 0;
    const isOutOfStock = product.stockQuantity <= 0 || product.status === 'out_of_stock';
    const isLowStock = !isOutOfStock && product.stockQuantity <= 5;
    const mainImg = product.images && product.images.length ? product.images[0] : 'assets/images/multimeter.svg';

    let badges = '';
    if (hasDiscount) {
      badges += `<span class="badge badge-sale">-${discountPercent}%</span>`;
    }
    if (product.isNewArrival) {
      badges += `<span class="badge badge-new">NEW</span>`;
    }
    if (product.isBestSeller) {
      badges += `<span class="badge badge-bestseller">HOT</span>`;
    }

    let stockBadge = '';
    if (isOutOfStock) {
      stockBadge = `<span class="stock-pill out-of-stock"><span class="dot"></span> Out of Stock</span>`;
    } else if (isLowStock) {
      stockBadge = `<span class="stock-pill low-stock"><span class="dot"></span> Only ${product.stockQuantity} left</span>`;
    } else {
      stockBadge = `<span class="stock-pill in-stock"><span class="dot"></span> In Stock (${product.stockQuantity})</span>`;
    }

    return `
      <div class="product-card" data-product-id="${product.id}">
        <div class="product-card-top">
          <div class="badge-stack">${badges}</div>
          <button class="quick-view-btn" onclick="window.WayaProducts.openProductModal('${product.id}')" title="Quick View">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <div class="product-thumb-wrap" onclick="window.WayaProducts.openProductModal('${product.id}')">
            <img src="${mainImg}" alt="${product.name}" class="product-thumbnail" loading="lazy" />
          </div>
        </div>

        <div class="product-card-body">
          <div class="product-meta">
            <span class="product-category">${product.category}</span>
            <span class="product-sku">${product.sku}</span>
          </div>
          
          <h3 class="product-title" onclick="window.WayaProducts.openProductModal('${product.id}')" title="${product.name}">
            ${product.name}
          </h3>

          <div class="product-specs-snippet">
            <span>Model: <strong>${product.modelNumber}</strong></span>
            <span>Brand: <strong>${product.brand}</strong></span>
          </div>

          <div class="product-rating">
            <div class="stars">
              ${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}
            </div>
            <span class="rating-num">${product.rating.toFixed(1)} (${product.reviewCount || 0})</span>
          </div>

          <div class="product-stock-status">
            ${stockBadge}
          </div>

          <div class="product-price-row">
            <div class="price-box">
              <span class="current-price">${this.formatLKR(effectivePrice)}</span>
              ${hasDiscount ? `<span class="original-price">${this.formatLKR(product.price)}</span>` : ''}
            </div>
            <button class="btn btn-add-cart ${isOutOfStock ? 'disabled' : ''}" 
                    ${isOutOfStock ? 'disabled' : ''} 
                    onclick="window.WayaProducts.handleAddToCart('${product.id}', 1, this)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async handleAddToCart(productId, qty = 1, buttonElement = null) {
    try {
      const product = await window.WayaDB.getProductById(productId);
      if (!product) return;

      if (buttonElement) {
        buttonElement.classList.add('loading');
        buttonElement.innerHTML = `<span>Adding...</span>`;
      }

      await window.WayaCart.addItem(product, qty);

      if (buttonElement) {
        buttonElement.classList.remove('loading');
        buttonElement.classList.add('added');
        buttonElement.innerHTML = `<span>✓ Added</span>`;
        setTimeout(() => {
          buttonElement.classList.remove('added');
          buttonElement.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <span>Add</span>
          `;
        }, 1500);
      }

      window.WayaApp.showToast(`"${product.name}" added to cart!`, 'success');
    } catch (err) {
      if (buttonElement) {
        buttonElement.classList.remove('loading');
        buttonElement.innerHTML = `<span>Add</span>`;
      }
      window.WayaApp.showToast(err.message, 'error');
    }
  }

  // Open rich product modal
  async openProductModal(productId) {
    const product = await window.WayaDB.getProductById(productId);
    if (!product) return;

    const modal = document.getElementById('productDetailModal');
    if (!modal) return;

    const effectivePrice = product.discountPrice || product.price;
    const hasDiscount = product.discountPrice && product.discountPrice < product.price;
    const discountPercent = hasDiscount ? Math.round(((product.price - product.discountPrice) / product.price) * 100) : 0;
    const isOutOfStock = product.stockQuantity <= 0 || product.status === 'out_of_stock';

    // Build specs HTML
    let specsHtml = '';
    if (product.specifications && Object.keys(product.specifications).length > 0) {
      specsHtml = `
        <div class="product-specs-table-wrap">
          <table class="specs-table">
            <tbody>
              ${Object.entries(product.specifications).map(([key, val]) => `
                <tr>
                  <td class="spec-name">${key}</td>
                  <td class="spec-value">${val}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      specsHtml = '<p class="text-muted">Standard technical specifications available upon request.</p>';
    }

    // Related products (same category)
    const allProducts = await window.WayaDB.getProducts();
    const related = allProducts
      .filter(p => p.category === product.category && p.id !== product.id)
      .slice(0, 3);

    let relatedHtml = '';
    if (related.length > 0) {
      relatedHtml = `
        <div class="related-products-section">
          <h4>Related Instruments &amp; Tools</h4>
          <div class="related-grid">
            ${related.map(r => `
              <div class="related-card" onclick="window.WayaProducts.openProductModal('${r.id}')">
                <img src="${r.images[0]}" alt="${r.name}" />
                <div class="related-info">
                  <span class="related-title">${r.name}</span>
                  <span class="related-price">${this.formatLKR(r.discountPrice || r.price)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Modal Content
    const container = modal.querySelector('.modal-content-inner');
    container.innerHTML = `
      <div class="product-modal-grid">
        <div class="product-modal-gallery">
          <div class="main-modal-image-wrap">
            <img id="modalMainImg" src="${product.images[0]}" alt="${product.name}" />
          </div>
          <div class="modal-thumbnails">
            ${product.images.map((img, idx) => `
              <img src="${img}" class="thumb-mini ${idx === 0 ? 'active' : ''}" 
                   onclick="document.getElementById('modalMainImg').src='${img}'; document.querySelectorAll('.thumb-mini').forEach(t=>t.classList.remove('active')); this.classList.add('active');" 
                   alt="Angle ${idx + 1}" />
            `).join('')}
          </div>
          <div class="technical-datasheet-box">
            <button class="btn btn-secondary btn-sm" onclick="window.WayaApp.showToast('Downloading WayaTronic Official Datasheet for ${product.modelNumber}...', 'info')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Download Technical PDF Datasheet</span>
            </button>
            <span class="datasheet-note">Includes NIST-traceable calibration specs</span>
          </div>
        </div>

        <div class="product-modal-details">
          <div class="modal-category-tag">${product.category}</div>
          <h2 class="modal-product-title">${product.name}</h2>
          
          <div class="modal-sub-meta">
            <span>Brand: <strong>${product.brand}</strong></span>
            <span>Model: <strong>${product.modelNumber}</strong></span>
            <span>SKU: <strong>${product.sku}</strong></span>
          </div>

          <div class="modal-rating-row">
            <div class="stars">${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}</div>
            <span class="score">${product.rating.toFixed(1)}</span>
            <span class="count">(${product.reviewCount} verified lab reviews)</span>
          </div>

          <div class="modal-price-box">
            <div class="price-main">${this.formatLKR(effectivePrice)}</div>
            ${hasDiscount ? `
              <div class="price-discount-wrap">
                <span class="price-old">${this.formatLKR(product.price)}</span>
                <span class="discount-pill">Save ${this.formatLKR(product.price - product.discountPrice)} (-${discountPercent}%)</span>
              </div>
            ` : ''}
          </div>

          <div class="modal-stock-indicator">
            ${isOutOfStock ? `
              <div class="stock-banner out-of-stock">
                <strong>Out of Stock</strong> - Expected restock within 5 business days
              </div>
            ` : `
              <div class="stock-banner in-stock">
                <span class="pulse-indicator"></span>
                <strong>In Stock:</strong> ${product.stockQuantity} units available for instant islandwide dispatch
              </div>
            `}
          </div>

          <div class="modal-description">
            <p>${product.description}</p>
          </div>

          <!-- Purchase Action Controls -->
          <div class="modal-action-row">
            <div class="qty-selector">
              <button type="button" class="qty-btn" onclick="const q=document.getElementById('modalQtyInput'); if(q.value>1) q.value=parseInt(q.value)-1;">-</button>
              <input type="number" id="modalQtyInput" value="1" min="1" max="${product.stockQuantity}" readonly />
              <button type="button" class="qty-btn" onclick="const q=document.getElementById('modalQtyInput'); if(parseInt(q.value)<${product.stockQuantity}) q.value=parseInt(q.value)+1;">+</button>
            </div>

            <button class="btn btn-primary btn-lg flex-1 ${isOutOfStock ? 'disabled' : ''}" 
                    ${isOutOfStock ? 'disabled' : ''}
                    onclick="const q=parseInt(document.getElementById('modalQtyInput').value); window.WayaProducts.handleAddToCart('${product.id}', q, this);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <span>Add to Shopping Cart</span>
            </button>
          </div>

          <!-- Technical Specs Accordion -->
          <div class="modal-specs-section">
            <h4 class="specs-header">Laboratory Specifications &amp; Electrical Ratings</h4>
            ${specsHtml}
          </div>

          ${relatedHtml}
        </div>
      </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeProductModal() {
    const modal = document.getElementById('productDetailModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
}

// Global Singleton Instance
window.WayaProducts = new WayaProductsManager();
