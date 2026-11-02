# WayaTronic – Professional Electronic Test Equipment E-Commerce Platform

> **"Precision Tools. Smarter Electronics."**  
> *Your Trusted Store for Electronic Test Equipment and Components in Sri Lanka.*

![WayaTronic Logo](assets/logo.svg)

---

## 🔬 Project Overview

**WayaTronic** is a modern, responsive, high-performance e-commerce platform built specifically for electronic test equipment, laboratory instruments, and electronic components. Built from the ground up using **pure HTML5, CSS3, and Modern JavaScript (ES6+)**, WayaTronic requires **zero external build dependencies or Node.js runtime**. It features a complete database architecture, secure Web Crypto API password hashing, a full admin suite, a real-time shopping cart, and a 9-step checkout system with Sri Lankan districts and bank slip uploads.

---

## 🌟 Key Architecture & Features

### 1. Brand Identity & UI/UX Design
- **Consistent Branding**: Business name is always presented as **WayaTronic**.
- **Modern Vector Logo**: Custom SVG logo featuring circuit traces, an oscilloscope sine wave morphing into a digital pulse, and glowing electric blue/cyan accents.
- **Color Palette**:
  - Dark Navy Blue (`#0a1128`, `#001f54`, `#031926`)
  - Electric Blue (`#0066ff`, `#0052cc`)
  - Subtle Cyan Accent (`#00f2fe`, `#00d2ff`)
  - Crisp White (`#ffffff`) and Slate (`#94a3b8`)
- **Interactive Oscilloscope Waveform**: Real-time animated HTML5 Canvas waveform generator in the hero section displaying dual-channel sine and pulse signals.
- **Fully Responsive**: Optimized for desktop monitors, laptops, tablets, and mobile smartphones.

### 2. Website Search & SEO Optimization
- **Target Keywords**: Optimized for Google searches including:
  - *WayaTronic*
  - *Waya Tronic*
  - *WayaTronic Electronic Test Kits*
  - *WayaTronic Sri Lanka*
- **SEO Elements**:
  - Semantic HTML5 heading structure (`h1`, `h2`, `h3`).
  - Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`, `og:site_name`).
  - Twitter Card metadata.
  - Valid `sitemap.xml` with priority and change frequencies.
  - Configured `robots.txt`.
  - Schema.org JSON-LD Structured Data for `ElectronicsStore` and `Product`.

### 3. Homepage Highlights
- **Top Announcement Bar**: Island-wide delivery alerts and customer service hotlines.
- **Header**: High-tech logo, live autocomplete search bar, navigation links, customer account menu, and dynamic shopping cart icon with item count badge.
- **Hero Section**:
  - Main Headline: *"Precision Tools. Smarter Electronics."*
  - Subtitle: *"Your Trusted Store for Electronic Test Equipment and Components."*
  - Interactive CTAs: "Shop Now", "Explore Test Kits", "View Categories".
- **Trust Badges Strip**: Calibrated & Certified, Islandwide Sri Lanka Delivery, Official Warranty, Flexible Payments.
- **Featured Products**: Highlighted laboratory instruments with True-RMS specifications.
- **Popular Categories**: Visual cards for the 12 specialized departments.
- **Best Sellers & New Arrivals**: Curated lists of popular multimeters and newly arrived AIoT hardware.
- **Why Choose WayaTronic**: Value pillars (Laboratory Accuracy, Sri Lankan Engineering Support, Transit Packaging, Genuine Components).
- **Verified Customer Reviews**: Authentic reviews from university professors, research laboratories, and embedded systems engineers.
- **Newsletter Subscription**: Instant validation and promotional voucher reward.
- **Professional Footer**: Complete business details, physical location (Colombo 03), contact numbers, opening hours, and direct link to Admin Portal.

### 4. 12 Mandatory Product Categories
The system comes pre-seeded with all 12 required categories (editable, addable, and deletable by administrators):
1. **Digital Multimeters**
2. **Oscilloscopes**
3. **Clamp Meters**
4. **Power Supplies**
5. **Function Generators**
6. **Soldering Stations**
7. **Electronic Test Kits**
8. **Arduino and ESP32 Boards**
9. **Sensors and Modules**
10. **Electronic Components**
11. **Test Leads and Probes**
12. **Accessories and Tools**

### 5. Product Management & Catalog
Each product in the database supports:
- Product Name & Model Number
- Category & Brand
- Stock Keeping Unit (SKU)
- Price in Sri Lankan Rupees (LKR) & Optional Discount Price
- Stock Quantity with real-time stock alert badges (*In Stock*, *Low Stock*, *Out of Stock*)
- Multiple Product Images (including uploaded images converted to Data URLs)
- Rich Product Description
- Technical Laboratory Specifications (Key-Value table)
- Homepage Visibility Flags (*Featured*, *Best Seller*, *New Arrival*)
- Product Details Modal with high-resolution image preview, specifications table, and simulated technical datasheet download.

### 6. Customer Account System
- **Registration**: Full Name, Email, Phone, District, Street Address, and Password.
- **Authentication**: Secure login and logout with session state.
- **Password Reset**: Forgot password workflow allowing secure updates.
- **Profile Management**: Update delivery address, phone number, and district across Sri Lanka.
- **Order History**: Review previous purchases with status badges and printable receipts.
- **Order Tracking**: Real-time 5-step progress visualization (Order Placed → Confirmed → Processing & Calibration → Shipped → Delivered).

### 7. Admin Authentication & Operations Dashboard
- **Separate Admin Portal**: Located at [`admin.html`](admin.html).
- **Initial Development Credentials**:
  - **Username**: `Admin`
  - **Password**: `Admin123@`
- **Strict Security Compliance**:
  - Passwords are never stored in plain text.
  - Hashed using the standard **Web Crypto API** (PBKDF2 with HMAC-SHA-256 and 100,000 iterations with unique cryptographic salt per user).
  - **First-Login Password Enforcement**: The system strictly forces the initial admin to change the default `Admin123@` password upon first sign-in before granting dashboard access.
- **Admin Dashboard Summary Cards**:
  1. *Total Products*
  2. *Total Customers*
  3. *Total Orders*
  4. *Total Revenue (LKR)*
  5. *Pending Orders*
  6. *Low Stock Products*
- **Interactive SVG Analytics Charts**: Monthly Revenue Trend bar chart & Category distribution progress bars.
- **Inventory Management**: Search, filter, add new product with file upload, edit prices/stock, and delete with confirmation dialog.
- **Category Management**: Create, edit, and delete categories with safety checks preventing deletion of active categories.
- **Order Processing**: Filter orders, update status (*Pending, Confirmed, Processing, Shipped, Delivered, Cancelled*), assign courier tracking numbers, and view customer-uploaded bank transfer slips.
- **Customer Management**: View registered customers, order history, and suspend/activate accounts.
- **Admin Management**: Super Admin can create additional admin accounts with specific roles (*Super Admin, Inventory Manager, Order Dispatcher*).
- **Database Backup & Restore**: Export full database as a JSON file, restore from JSON, or reset to factory defaults.

### 8. Shopping Cart
- Slide-over Cart Drawer + Full Cart Page.
- Add products, update quantities, or remove items.
- Real-time stock validation preventing customers from exceeding available inventory.
- Automatic calculations: Subtotal, Promotional Discount Savings, Islandwide Delivery Fee (Free above 50,000 LKR or standard flat 850 LKR), and Final Total in LKR.
- Persistent cart storage saved for logged-in customers.

### 9. Checkout & Purchase System
- **Complete 9-Step Process**:
  1. Review cart items
  2. Enter full name
  3. Enter phone number
  4. Enter email address
  5. Enter street address and city
  6. Select from all **25 Sri Lankan Districts** (Colombo, Gampaha, Kandy, Galle, Jaffna, etc.)
  7. Add additional delivery instructions
  8. Review order summary
  9. Confirm order
- **Payment Options**:
  - **Cash on Delivery (COD)**: Available for orders under 150,000 LKR.
  - **Direct Bank Transfer**: Displays Commercial Bank & Sampath Bank corporate account details and includes an interactive file upload for payment slips/screenshots.
  - **Online Payment**: Features a clear maintenance notice explaining that the card gateway is under scheduled maintenance and advising customers to select COD or Bank Wire.
- **Post-Order Automation**:
  - Generates unique order number (e.g., `WT-2026-8841`).
  - Automatically decrements product inventory in the database.
  - Displays printable order confirmation receipt.

---

## 📁 Project File Structure

```
wayatronic/
├── index.html            # Main customer storefront & single-page application
├── admin.html            # Dedicated secure Administrator Portal
├── sitemap.xml           # SEO sitemap for search engine indexing
├── robots.txt            # Search engine crawler instructions
├── README.md             # Complete documentation and user manual
├── server.py             # Optional 1-click Python local HTTP server
├── css/
│   ├── styles.css        # Design tokens, typography, header, hero, footer
│   ├── components.css    # Product cards, modals, cart drawer, checkout, toasts
│   └── admin.css         # Admin dashboard layout, stats cards, tables, charts
├── js/
│   ├── db.js             # WayaDB: Schema, seed data, Web Crypto API PBKDF2 hashing
│   ├── auth.js           # Session manager, customer & admin authentication
│   ├── cart.js           # Shopping cart state, stock validation, calculations
│   ├── products.js       # Catalog filters, search, sorting, pagination, modals
│   ├── checkout.js       # 9-step checkout, Sri Lanka districts, slip upload
│   ├── admin.js          # Admin suite controllers: CRUD, orders, charts, backup
│   └── app.js            # Main router, header search autocomplete, hero canvas
└── assets/
    ├── logo.svg          # WayaTronic vector brand logo
    ├── favicon.svg       # WayaTronic browser tab icon
    └── images/           # Category & product vector illustrations
        ├── multimeter.svg
        ├── oscilloscope.svg
        ├── clamp_meter.svg
        ├── power_supply.svg
        ├── function_gen.svg
        ├── soldering_station.svg
        ├── test_kit.svg
        ├── microcontroller.svg
        ├── sensors.svg
        ├── components.svg
        ├── test_leads.svg
        └── accessories.svg
```

---

## 🚀 How to Run the Website Locally

Since the project uses **100% pure HTML, CSS, and Modern JavaScript**, no installation or `npm install` is required.

### Method 1: Direct Browser Opening (Zero Setup)
1. Navigate to the project directory:
   ```
   C:\Users\Chanuka\.gemini\antigravity\scratch\wayatronic
   ```
2. Double-click **`index.html`** to open the customer storefront in Google Chrome, Microsoft Edge, or Mozilla Firefox.
3. Double-click **`admin.html`** to open the dedicated Admin Portal.

### Method 2: Local HTTP Server (Recommended)
You can use the included `server.py` standard Python script:

```bash
cd C:\Users\Chanuka\.gemini\antigravity\scratch\wayatronic
python server.py
```

Then open in your browser:
- Customer Storefront: **`http://localhost:8080/index.html`**
- Admin Management Portal: **`http://localhost:8080/admin.html`**

---

## 🔒 Security & Admin Access Guide

1. Navigate to **`admin.html`** (or click **"Admin Portal 🔒"** in the footer of `index.html`).
2. Log in with initial credentials:
   - **Username**: `Admin`
   - **Password**: `Admin123@`
3. Upon first login, the system will prompt you to set a new strong administrator password (at least 8 characters).
4. Enter your new password and click **"Update Password & Unlock Dashboard"**.
5. Once unlocked, you have full access to manage inventory, categories, orders, registered customers, and store settings.

---

## 🌐 Production Deployment Instructions

WayaTronic is static-host ready and can be deployed in seconds to any web server or CDN:

### Option A: GitHub Pages
1. Push the `wayatronic` directory to a GitHub repository.
2. In the repository **Settings → Pages**, select the branch (`main` or `gh-pages`) and root folder (`/`).
3. Click **Save**. Your site will be published at `https://<username>.github.io/<repo>/`.

### Option B: Netlify or Vercel
1. Drag and drop the `wayatronic` folder directly into the [Netlify Drop](https://app.netlify.com/drop) dashboard, or import via Vercel CLI.
2. Deployment completes instantly with global CDN acceleration and HTTPS.

### Option C: Apache / Nginx / cPanel Web Hosting
1. Upload all files from the `wayatronic` directory to your web server's `public_html` directory via FTP/cPanel File Manager.
2. Verify that `index.html`, `admin.html`, and `sitemap.xml` are in the document root.

---

## 📄 License & Attribution
- **Brand**: WayaTronic (Pvt) Ltd
- **Created For**: Laboratory, Industrial, and Maker Electronic Test Equipment in Sri Lanka
- **Technology Stack**: HTML5 / CSS3 / Vanilla JavaScript / Web Crypto API
