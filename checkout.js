/**
 * WayaTronic - Checkout & Order Processing Controller (checkout.js)
 * Full 9-step customer checkout, Sri Lankan districts, Bank Slip upload, stock reduction.
 */

class WayaCheckoutManager {
  constructor() {
    this.districts = [
      'Colombo', 'Gampaha', 'Kalutara',
      'Kandy', 'Matale', 'Nuwara Eliya',
      'Galle', 'Matara', 'Hambantota',
      'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu',
      'Batticaloa', 'Ampara', 'Trincomalee',
      'Kurunegala', 'Puttalam',
      'Anuradhapura', 'Polonnaruwa',
      'Badulla', 'Monaragala',
      'Ratnapura', 'Kegalle'
    ];
    this.paymentSlipBase64 = null;
  }

  getDistricts() {
    return [...this.districts];
  }

  formatLKR(amount) {
    return 'LKR ' + Math.round(amount).toLocaleString('en-US');
  }

  // Pre-fill fields if customer is logged in
  initCheckoutForm() {
    const customer = window.WayaAuth ? window.WayaAuth.getCurrentCustomer() : null;
    
    // District Dropdown
    const districtSelect = document.getElementById('checkoutDistrict');
    if (districtSelect && districtSelect.children.length <= 1) {
      districtSelect.innerHTML = '<option value="">-- Select Sri Lanka District --</option>' +
        this.districts.map(d => `<option value="${d}">${d}</option>`).join('');
    }

    if (customer) {
      const nameInput = document.getElementById('checkoutName');
      const emailInput = document.getElementById('checkoutEmail');
      const phoneInput = document.getElementById('checkoutPhone');
      const addressInput = document.getElementById('checkoutAddress');
      const cityInput = document.getElementById('checkoutCity');
      const postalInput = document.getElementById('checkoutPostal');

      if (nameInput && !nameInput.value) nameInput.value = customer.name || '';
      if (emailInput && !emailInput.value) emailInput.value = customer.email || '';
      if (phoneInput && !phoneInput.value) phoneInput.value = customer.phone || '';
      if (addressInput && !addressInput.value) addressInput.value = customer.address || '';
      if (cityInput && !cityInput.value) cityInput.value = customer.city || '';
      if (postalInput && !postalInput.value) postalInput.value = customer.postalCode || '';
      if (districtSelect && customer.district) districtSelect.value = customer.district;
    }

    this.renderCheckoutSummary();
  }

  renderCheckoutSummary() {
    const summaryContainer = document.getElementById('checkoutItemsReview');
    const totalsContainer = document.getElementById('checkoutTotalsReview');
    if (!summaryContainer || !totalsContainer) return;

    const summary = window.WayaCart.getSummary();

    if (summary.items.length === 0) {
      summaryContainer.innerHTML = `
        <div class="empty-state">
          <p>Your shopping cart is currently empty.</p>
          <button class="btn btn-primary btn-sm" onclick="window.WayaApp.navigateTo('products')">Browse Equipment</button>
        </div>
      `;
      totalsContainer.innerHTML = '';
      return;
    }

    summaryContainer.innerHTML = summary.items.map(item => `
      <div class="checkout-review-item">
        <img src="${item.image}" alt="${item.name}" class="review-item-thumb" />
        <div class="review-item-info">
          <div class="review-item-name">${item.name}</div>
          <div class="review-item-meta">Qty: ${item.quantity} × ${this.formatLKR(item.price)}</div>
        </div>
        <div class="review-item-total">${this.formatLKR(item.price * item.quantity)}</div>
      </div>
    `).join('');

    totalsContainer.innerHTML = `
      <div class="summary-line">
        <span>Cart Subtotal</span>
        <span>${this.formatLKR(summary.subtotal)}</span>
      </div>
      ${summary.discountSavings > 0 ? `
        <div class="summary-line discount-line">
          <span>Promotional Savings</span>
          <span>-${this.formatLKR(summary.discountSavings)}</span>
        </div>
      ` : ''}
      <div class="summary-line">
        <span>Islandwide Courier Delivery</span>
        <span>${summary.shippingFee === 0 ? '<strong class="text-success">FREE (Order > 50,000 LKR)</strong>' : this.formatLKR(summary.shippingFee)}</span>
      </div>
      <div class="summary-line grand-total">
        <span>Total Payable (LKR)</span>
        <span class="total-amount">${this.formatLKR(summary.finalTotal)}</span>
      </div>
    `;
  }

  handleSlipUpload(event) {
    const file = event.target.files[0];
    const previewEl = document.getElementById('bankSlipPreview');
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      window.WayaApp.showToast('Please upload a valid image file (JPG, PNG, WebP).', 'error');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      window.WayaApp.showToast('File size exceeds 5MB limit.', 'error');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.paymentSlipBase64 = e.target.result;
      if (previewEl) {
        previewEl.innerHTML = `
          <div class="slip-preview-card">
            <img src="${this.paymentSlipBase64}" alt="Bank Payment Slip" />
            <div class="slip-preview-meta">
              <span>✓ ${file.name}</span>
              <button type="button" class="btn-text-danger" onclick="window.WayaCheckout.removeSlip()">Remove</button>
            </div>
          </div>
        `;
      }
    };
    reader.readAsDataURL(file);
  }

  removeSlip() {
    this.paymentSlipBase64 = null;
    const input = document.getElementById('bankSlipInput');
    const previewEl = document.getElementById('bankSlipPreview');
    if (input) input.value = '';
    if (previewEl) previewEl.innerHTML = '';
  }

  async processOrder(event) {
    if (event) event.preventDefault();

    const summary = window.WayaCart.getSummary();
    if (summary.items.length === 0) {
      window.WayaApp.showToast('Your shopping cart is empty.', 'error');
      return;
    }

    // Read form values
    const name = document.getElementById('checkoutName').value.trim();
    const email = document.getElementById('checkoutEmail').value.trim();
    const phone = document.getElementById('checkoutPhone').value.trim();
    const address = document.getElementById('checkoutAddress').value.trim();
    const city = document.getElementById('checkoutCity').value.trim();
    const district = document.getElementById('checkoutDistrict').value;
    const postalCode = document.getElementById('checkoutPostal').value.trim();
    const instructions = document.getElementById('checkoutInstructions') ? document.getElementById('checkoutInstructions').value.trim() : '';

    const paymentMethodEl = document.querySelector('input[name="paymentMethod"]:checked');
    const paymentMethod = paymentMethodEl ? paymentMethodEl.value : null;

    // Field Validations
    if (!name || !email || !phone || !address || !city || !district) {
      window.WayaApp.showToast('Please complete all mandatory delivery address fields.', 'error');
      return;
    }

    if (!paymentMethod) {
      window.WayaApp.showToast('Please select a payment method.', 'error');
      return;
    }

    if (paymentMethod === 'Online Gateway') {
      window.WayaApp.showToast('Online Card Gateway is currently under maintenance. Please select Cash on Delivery or Bank Transfer.', 'warning');
      return;
    }

    if (paymentMethod === 'Bank Transfer' && !this.paymentSlipBase64) {
      const confirmWithout = confirm('You have not uploaded a bank transfer receipt yet. You can confirm now and email it or submit later. Proceed with order confirmation?');
      if (!confirmWithout) return;
    }

    const submitBtn = document.getElementById('confirmOrderBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Processing Order &amp; Reserving Inventory...</span>`;
    }

    try {
      const customer = window.WayaAuth ? window.WayaAuth.getCurrentCustomer() : null;

      const orderPayload = {
        userId: customer ? customer.id : 'guest-' + Date.now(),
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        deliveryAddress: {
          street: address,
          city: city,
          district: district,
          postalCode: postalCode,
          instructions: instructions
        },
        items: summary.items.map(item => ({
          productId: item.id,
          name: item.name,
          brand: item.brand,
          modelNumber: item.modelNumber,
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        })),
        subtotal: summary.subtotal,
        discountSavings: summary.discountSavings,
        shippingFee: summary.shippingFee,
        total: summary.finalTotal,
        paymentMethod: paymentMethod,
        paymentSlipUrl: this.paymentSlipBase64 || null
      };

      const createdOrder = await window.WayaDB.createOrder(orderPayload);

      // Clear the shopping cart
      window.WayaCart.clearCart();
      this.paymentSlipBase64 = null;

      // Display Order Success Screen
      this.displayOrderSuccess(createdOrder);

    } catch (err) {
      console.error('Order creation error:', err);
      window.WayaApp.showToast(err.message, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Confirm &amp; Place Order</span>`;
      }
    }
  }

  displayOrderSuccess(order) {
    const checkoutView = document.getElementById('checkoutView');
    const successView = document.getElementById('orderSuccessView');
    if (!checkoutView || !successView) return;

    checkoutView.style.display = 'none';
    successView.style.display = 'block';

    const orderNumberEl = document.getElementById('successOrderNumber');
    const orderDetailsEl = document.getElementById('successOrderDetails');

    if (orderNumberEl) orderNumberEl.textContent = order.id;

    if (orderDetailsEl) {
      orderDetailsEl.innerHTML = `
        <div class="order-receipt-card">
          <div class="receipt-header">
            <div class="receipt-brand">WayaTronic Precision Instruments</div>
            <div class="receipt-meta">
              <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              <div><strong>Status:</strong> <span class="badge badge-success">${order.orderStatus}</span></div>
              <div><strong>Payment:</strong> ${order.paymentMethod}</div>
            </div>
          </div>

          <div class="receipt-address-box">
            <h4>Delivery Details:</h4>
            <p><strong>${order.customerName}</strong> (${order.customerPhone})<br />
            ${order.deliveryAddress.street}, ${order.deliveryAddress.city}, District: ${order.deliveryAddress.district} ${order.deliveryAddress.postalCode ? ' - ' + order.deliveryAddress.postalCode : ''}<br />
            <em>${order.deliveryAddress.instructions ? 'Note: ' + order.deliveryAddress.instructions : ''}</em></p>
          </div>

          <table class="receipt-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th class="text-right">Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(i => `
                <tr>
                  <td>${i.name} <br/><small class="text-muted">SKU: ${i.sku || 'N/A'}</small></td>
                  <td>${i.quantity}</td>
                  <td class="text-right">${this.formatLKR(i.price)}</td>
                  <td class="text-right">${this.formatLKR(i.price * i.quantity)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="text-right"><strong>Subtotal:</strong></td>
                <td class="text-right">${this.formatLKR(order.subtotal)}</td>
              </tr>
              ${order.discountSavings > 0 ? `
                <tr>
                  <td colspan="3" class="text-right text-success"><strong>Promotional Savings:</strong></td>
                  <td class="text-right text-success">-${this.formatLKR(order.discountSavings)}</td>
                </tr>
              ` : ''}
              <tr>
                <td colspan="3" class="text-right"><strong>Islandwide Delivery:</strong></td>
                <td class="text-right">${order.shippingFee === 0 ? 'FREE' : this.formatLKR(order.shippingFee)}</td>
              </tr>
              <tr class="receipt-grand-total">
                <td colspan="3" class="text-right"><strong>Total Amount:</strong></td>
                <td class="text-right"><strong>${this.formatLKR(order.total)}</strong></td>
              </tr>
            </tfoot>
          </table>

          ${order.paymentMethod === 'Bank Transfer' ? `
            <div class="bank-instructions-reminder">
              <h5>Direct Bank Deposit Instructions</h5>
              <p>Please transfer <strong>${this.formatLKR(order.total)}</strong> to our official corporate account:</p>
              <ul>
                <li><strong>Bank:</strong> Commercial Bank of Ceylon</li>
                <li><strong>Account Name:</strong> WayaTronic (Pvt) Ltd</li>
                <li><strong>Account Number:</strong> 800-459-2104-01</li>
                <li><strong>Branch:</strong> Colombo Fort</li>
                <li><strong>Reference:</strong> ${order.id}</li>
              </ul>
              <p class="small text-muted">Once verified by our finance department, your equipment calibration and courier dispatch will be initialized.</p>
            </div>
          ` : ''}
        </div>
      `;
    }

    // Scroll to top of success view
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.WayaApp.showToast(`Order ${order.id} confirmed successfully!`, 'success');
  }
}

// Global Singleton Instance
window.WayaCheckout = new WayaCheckoutManager();
