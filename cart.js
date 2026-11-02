/**
 * WayaTronic - Shopping Cart Controller (cart.js)
 * Real-time cart calculations, stock constraint enforcement, and cross-session syncing.
 */

class WayaCartManager {
  constructor() {
    this.CART_KEY = 'wayatronic_cart_v1';
    this.items = [];
    this.init();
  }

  init() {
    this.loadCart();
    // Listen for customer login/logout to sync user cart
    window.addEventListener('wayatronic:auth_changed', () => {
      this.loadCart();
    });
  }

  getStorageKey() {
    const customer = window.WayaAuth ? window.WayaAuth.getCurrentCustomer() : null;
    return customer ? `wayatronic_cart_user_${customer.id}` : this.CART_KEY;
  }

  loadCart() {
    try {
      const data = localStorage.getItem(this.getStorageKey());
      this.items = data ? JSON.parse(data) : [];
    } catch (e) {
      this.items = [];
    }
    this.notify();
  }

  saveCart() {
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(this.items));
      this.notify();
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
  }

  notify() {
    window.dispatchEvent(new CustomEvent('wayatronic:cart_updated', {
      detail: {
        items: this.items,
        summary: this.getSummary()
      }
    }));
  }

  async addItem(product, quantity = 1) {
    if (!product || !product.id) throw new Error('Invalid product');
    
    // Check latest live stock from DB
    const liveProd = await window.WayaDB.getProductById(product.id);
    if (!liveProd) throw new Error('Product is no longer available.');
    
    const existingIndex = this.items.findIndex(item => item.id === product.id);
    const currentQtyInCart = existingIndex > -1 ? this.items[existingIndex].quantity : 0;
    const requestedTotal = currentQtyInCart + quantity;

    if (requestedTotal > liveProd.stockQuantity) {
      throw new Error(`Cannot add ${quantity} more. Only ${liveProd.stockQuantity} units available in stock (you already have ${currentQtyInCart} in your cart).`);
    }

    const effectivePrice = liveProd.discountPrice || liveProd.price;

    if (existingIndex > -1) {
      this.items[existingIndex].quantity = requestedTotal;
      this.items[existingIndex].price = effectivePrice;
      this.items[existingIndex].regularPrice = liveProd.price;
    } else {
      this.items.push({
        id: liveProd.id,
        name: liveProd.name,
        brand: liveProd.brand,
        modelNumber: liveProd.modelNumber,
        sku: liveProd.sku,
        price: effectivePrice,
        regularPrice: liveProd.price,
        image: liveProd.images && liveProd.images.length ? liveProd.images[0] : 'assets/images/multimeter.svg',
        quantity: quantity,
        maxStock: liveProd.stockQuantity
      });
    }

    this.saveCart();
    return this.getSummary();
  }

  async updateQuantity(productId, newQty) {
    const itemIndex = this.items.findIndex(item => item.id === productId);
    if (itemIndex === -1) return;

    if (newQty <= 0) {
      this.removeItem(productId);
      return;
    }

    // Check stock
    const liveProd = await window.WayaDB.getProductById(productId);
    if (liveProd && newQty > liveProd.stockQuantity) {
      throw new Error(`Maximum available stock is ${liveProd.stockQuantity} units.`);
    }

    this.items[itemIndex].quantity = newQty;
    this.saveCart();
  }

  removeItem(productId) {
    this.items = this.items.filter(item => item.id !== productId);
    this.saveCart();
  }

  clearCart() {
    this.items = [];
    this.saveCart();
  }

  getItemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getSummary() {
    let regularSubtotal = 0;
    let actualSubtotal = 0;

    for (const item of this.items) {
      regularSubtotal += (item.regularPrice || item.price) * item.quantity;
      actualSubtotal += item.price * item.quantity;
    }

    const discountSavings = Math.max(0, regularSubtotal - actualSubtotal);
    const freeShippingThreshold = 50000; // LKR
    const standardShippingFee = 850; // LKR
    
    const shippingFee = actualSubtotal >= freeShippingThreshold || actualSubtotal === 0 ? 0 : standardShippingFee;
    const finalTotal = actualSubtotal + shippingFee;

    return {
      itemCount: this.getItemCount(),
      items: [...this.items],
      regularSubtotal,
      subtotal: actualSubtotal,
      discountSavings,
      shippingFee,
      freeShippingThreshold,
      qualifiesForFreeShipping: actualSubtotal >= freeShippingThreshold,
      amountNeededForFreeShipping: Math.max(0, freeShippingThreshold - actualSubtotal),
      finalTotal
    };
  }
}

// Global Singleton Instance
window.WayaCart = new WayaCartManager();
