/**
 * WayaTronic - Enterprise Database & Backend Data Engine (db.js)
 * High-performance, schema-driven, secure local persistence layer.
 * Includes Web Crypto API PBKDF2/SHA-256 password hashing.
 */

class WayaDBEngine {
  constructor() {
    this.STORAGE_KEY = 'wayatronic_database_v2';
    this.data = null;
    this.readyPromise = this.init();
  }

  // Cryptographic Helper Functions using Web Crypto API
  async _bufToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async _hexToBuf(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes.buffer;
  }

  async hashPassword(password, existingSaltHex = null) {
    const enc = new TextEncoder();
    let saltBuffer;
    if (existingSaltHex) {
      saltBuffer = await this._hexToBuf(existingSaltHex);
    } else {
      const salt = new Uint8Array(16);
      window.crypto.getRandomValues(salt);
      saltBuffer = salt.buffer;
    }

    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'HMAC', hash: 'SHA-256', length: 256 },
      true,
      ['sign']
    );

    const exported = await window.crypto.subtle.exportKey('raw', key);
    return {
      hash: await this._bufToHex(exported),
      salt: await this._bufToHex(saltBuffer)
    };
  }

  async verifyPassword(password, storedHash, storedSalt) {
    try {
      const result = await this.hashPassword(password, storedSalt);
      return result.hash === storedHash;
    } catch (e) {
      console.error('Password verification failed:', e);
      return false;
    }
  }

  async init() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.data = JSON.parse(saved);
        // Ensure initial admin has hashed password
        await this._ensureAdminHashed();
      } else {
        await this.seedDefaults();
      }
    } catch (e) {
      console.warn('Initializing default dataset due to error/first load:', e);
      await this.seedDefaults();
    }
    return this;
  }

  save() {
    try {
      this.data.updatedAt = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
      window.dispatchEvent(new CustomEvent('wayatronic:db_changed', { detail: { timestamp: Date.now() } }));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  async _ensureAdminHashed() {
    if (!this.data || !this.data.admins) return;
    for (let admin of this.data.admins) {
      if (!admin.passwordHash && admin.tempPassword) {
        const hashed = await this.hashPassword(admin.tempPassword);
        admin.passwordHash = hashed.hash;
        admin.passwordSalt = hashed.salt;
        delete admin.tempPassword;
      }
    }
    this.save();
  }

  async seedDefaults() {
    const adminHashed = await this.hashPassword('Admin123@');
    const customerHashed = await this.hashPassword('Customer123@');

    this.data = {
      version: '2.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        storeName: 'WayaTronic',
        tagline: 'Precision Tools. Smarter Electronics.',
        phone: '+94 11 234 5678',
        email: 'info@wayatronic.lk',
        address: 'No. 45, Technology Innovation Park, Colombo 03, Sri Lanka',
        announcement: 'Island-wide Sri Lanka Delivery on All Electronic Test Kits & Component Orders | Genuine Warranty Guaranteed',
        currency: 'LKR',
        freeShippingThreshold: 50000,
        standardShippingFee: 850,
        bankDetails: {
          bankName: 'Commercial Bank of Ceylon',
          accountName: 'WayaTronic (Pvt) Ltd',
          accountNumber: '800-459-2104-01',
          branch: 'Colombo Fort Branch',
          swiftCode: 'CCEYLKJA'
        }
      },
      admins: [
        {
          id: 'adm-001',
          username: 'Admin',
          name: 'Chief Systems Administrator',
          email: 'admin@wayatronic.lk',
          role: 'Super Admin',
          passwordHash: adminHashed.hash,
          passwordSalt: adminHashed.salt,
          mustChangePassword: true, // Forces initial admin to change default password on first login
          createdAt: new Date().toISOString(),
          isActive: true
        }
      ],
      users: [
        {
          id: 'usr-001',
          name: 'Nalinda Perera',
          email: 'nalinda.p@eng.pdn.ac.lk',
          phone: '+94 77 123 4567',
          passwordHash: customerHashed.hash,
          passwordSalt: customerHashed.salt,
          district: 'Kandy',
          address: 'No. 18, Peradeniya Road',
          city: 'Kandy',
          postalCode: '20000',
          createdAt: '2026-08-15T10:00:00.000Z',
          isActive: true
        },
        {
          id: 'usr-002',
          name: 'Kavindu Senanayake',
          email: 'kavindu.dev@gmail.com',
          phone: '+94 71 890 1234',
          passwordHash: customerHashed.hash,
          passwordSalt: customerHashed.salt,
          district: 'Colombo',
          address: 'Apartment 4B, Lotus Residencies, Nawala',
          city: 'Rajagiriya',
          postalCode: '10107',
          createdAt: '2026-09-01T12:30:00.000Z',
          isActive: true
        }
      ],
      categories: [
        { id: 'cat-1', name: 'Digital Multimeters', slug: 'digital-multimeters', icon: 'multimeter.svg', description: 'Precision True-RMS multimeters with high-accuracy calibration.' },
        { id: 'cat-2', name: 'Oscilloscopes', slug: 'oscilloscopes', icon: 'oscilloscope.svg', description: 'Digital storage & mixed-signal oscilloscopes up to 200MHz.' },
        { id: 'cat-3', name: 'Clamp Meters', slug: 'clamp-meters', icon: 'clamp_meter.svg', description: 'AC/DC current clamp meters for industrial electrical diagnostics.' },
        { id: 'cat-4', name: 'Power Supplies', slug: 'power-supplies', icon: 'power_supply.svg', description: 'Regulated linear & switching DC benchtop lab power supplies.' },
        { id: 'cat-5', name: 'Function Generators', slug: 'function-generators', icon: 'function_gen.svg', description: 'DDS arbitrary waveform and RF frequency generators.' },
        { id: 'cat-6', name: 'Soldering Stations', slug: 'soldering-stations', icon: 'soldering_station.svg', description: 'Digital ESD-safe soldering, desoldering, and hot air stations.' },
        { id: 'cat-7', name: 'Electronic Test Kits', slug: 'electronic-test-kits', icon: 'test_kit.svg', description: 'All-in-one comprehensive engineering & student laboratory kits.' },
        { id: 'cat-8', name: 'Arduino and ESP32 Boards', slug: 'arduino-and-esp32-boards', icon: 'microcontroller.svg', description: 'Genuine microcontrollers, Wi-Fi IoT boards, and shields.' },
        { id: 'cat-9', name: 'Sensors and Modules', slug: 'sensors-and-modules', icon: 'sensors.svg', description: 'Industrial, environmental, motion, and wireless sensor modules.' },
        { id: 'cat-10', name: 'Electronic Components', slug: 'electronic-components', icon: 'components.svg', description: 'Semiconductors, ICs, passives, diodes, and breadboarding parts.' },
        { id: 'cat-11', name: 'Test Leads and Probes', slug: 'test-leads-and-probes', icon: 'test_leads.svg', description: 'Gold-plated probes, BNC cables, high-voltage test leads.' },
        { id: 'cat-12', name: 'Accessories and Tools', slug: 'accessories-and-tools', icon: 'accessories.svg', description: 'ESD protection, precision tweezers, wire strippers, and bench organizers.' }
      ],
      products: [
        // 1. Digital Multimeters
        {
          id: 'prod-001',
          name: 'WayaTronic WT-6000 Pro True-RMS Digital Multimeter',
          slug: 'wayatronic-wt-6000-pro-digital-multimeter',
          category: 'Digital Multimeters',
          brand: 'WayaTronic',
          modelNumber: 'WT-6000P',
          sku: 'WT-DMM-6001',
          price: 24500,
          discountPrice: 21900,
          stockQuantity: 18,
          images: ['assets/images/multimeter.svg'],
          description: 'The flagship WayaTronic WT-6000 Pro provides industrial-grade 6000 count True-RMS accuracy, dual ceramic fuses, non-contact voltage (NCV) detection, and temperature probe compatibility. Engineered for electronics technicians and electrical engineers.',
          specifications: {
            'Display Counts': '6,000 Counts Backlit LCD',
            'RMS Measurement': 'True-RMS 40Hz - 1kHz',
            'DC Voltage': '600mV - 1000V (±0.5%)',
            'AC Voltage': '6V - 750V (±0.8%)',
            'DC/AC Current': '600μA - 10A (±1.2%)',
            'Resistance': '600Ω - 60MΩ (±0.8%)',
            'Capacitance': '9.999nF - 99.99mF',
            'Safety Rating': 'CAT III 1000V / CAT IV 600V'
          },
          isFeatured: true,
          isBestSeller: true,
          isNewArrival: false,
          status: 'in_stock',
          rating: 4.9,
          reviewCount: 38
        },
        {
          id: 'prod-002',
          name: 'UNI-T UT89X Precision True RMS Multimeter',
          slug: 'unit-ut89x-precision-true-rms-multimeter',
          category: 'Digital Multimeters',
          brand: 'UNI-T',
          modelNumber: 'UT89X',
          sku: 'UT-DMM-8902',
          price: 18500,
          discountPrice: 16900,
          stockQuantity: 12,
          images: ['assets/images/multimeter.svg'],
          description: 'Heavy duty True RMS multimeter with 1000V AC/DC measurement, fast continuity beeper with LED indicator, and dual-range NCV test.',
          specifications: {
            'Display': '6,000 Counts with Flashlight',
            'Sampling Rate': '3 times/second',
            'Voltage Range': 'Up to 1000V AC/DC',
            'Current Range': '20A AC/DC',
            'Capacitance': 'Up to 100mF',
            'Safety': 'CAT III 600V'
          },
          isFeatured: false,
          isBestSeller: true,
          isNewArrival: false,
          status: 'in_stock',
          rating: 4.7,
          reviewCount: 22
        },

        // 2. Oscilloscopes
        {
          id: 'prod-003',
          name: 'WayaTronic DSO-2104X 100MHz 4-Channel Digital Storage Oscilloscope',
          slug: 'wayatronic-dso-2104x-100mhz-oscilloscope',
          category: 'Oscilloscopes',
          brand: 'WayaTronic',
          modelNumber: 'WT-DSO-2104X',
          sku: 'WT-SCO-1004',
          price: 158000,
          discountPrice: 142000,
          stockQuantity: 6,
          images: ['assets/images/oscilloscope.svg'],
          description: 'A laboratory powerhouse featuring 100MHz real bandwidth, 4 analog channels, 1 GSa/s real-time sampling rate, and 28Mpts memory depth. Includes hardware frequency counter, FFT spectral analysis, and USB PC interface.',
          specifications: {
            'Bandwidth': '100 MHz Real Bandwidth',
            'Channels': '4 Isolated Analog Channels',
            'Real-Time Sampling': '1.0 GSa/s Max',
            'Memory Depth': '28 Mpts standard',
            'Display': '7.0-inch 800x480 TFT LCD',
            'Vertical Sensitivity': '1 mV/div - 10 V/div',
            'Math Functions': '+, -, *, /, FFT (64k points)',
            'Connectivity': 'USB Host, USB Device, LAN'
          },
          isFeatured: true,
          isBestSeller: true,
          isNewArrival: true,
          status: 'in_stock',
          rating: 5.0,
          reviewCount: 16
        },
        {
          id: 'prod-004',
          name: 'Siglent SDS1202X-E 200MHz Super Phosphor Oscilloscope',
          slug: 'siglent-sds1202x-e-200mhz-oscilloscope',
          category: 'Oscilloscopes',
          brand: 'Siglent',
          modelNumber: 'SDS1202X-E',
          sku: 'SIG-SCO-1202',
          price: 185000,
          discountPrice: 172000,
          stockQuantity: 4,
          images: ['assets/images/oscilloscope.svg'],
          description: 'High-performance 200MHz 2-channel oscilloscope with SPO technology, 1 GSa/s sampling, and 256-level color temperature waveform display.',
          specifications: {
            'Bandwidth': '200 MHz',
            'Channels': '2 Channels',
            'Sampling Rate': '1 GSa/s',
            'Memory Depth': '14 Mpts',
            'Waveform Capture': '100,000 wfm/s (normal)'
          },
          isFeatured: false,
          isBestSeller: false,
          isNewArrival: false,
          status: 'in_stock',
          rating: 4.8,
          reviewCount: 9
        },

        // 3. Clamp Meters
        {
          id: 'prod-005',
          name: 'WayaTronic WT-CM600 AC/DC True-RMS Clamp Meter',
          slug: 'wayatronic-wt-cm600-clamp-meter',
          category: 'Clamp Meters',
          brand: 'WayaTronic',
          modelNumber: 'WT-CM600',
          sku: 'WT-CLP-0600',
          price: 21500,
          discountPrice: 18900,
          stockQuantity: 14,
          images: ['assets/images/clamp_meter.svg'],
          description: 'Compact 600A AC/DC True-RMS clamp meter with Inrush current measurement, frequency counter, and VFD filtering for solar and EV power systems.',
          specifications: {
            'Current Range': '0.1A - 600A AC/DC',
            'Jaw Opening': '28mm Conductor Capacity',
            'Inrush Measurement': '100ms Inrush Capture',
            'VFD Mode': 'Low-pass filter for variable frequency drives',
            'Safety': 'CAT III 600V'
          },
          isFeatured: true,
          isBestSeller: false,
          isNewArrival: false,
          status: 'in_stock',
          rating: 4.8,
          reviewCount: 14
        },

        // 4. Power Supplies
        {
          id: 'prod-006',
          name: 'WayaTronic WT-3005D Precision Linear DC Power Supply 30V 5A',
          slug: 'wayatronic-wt-3005d-dc-power-supply',
          category: 'Power Supplies',
          brand: 'WayaTronic',
          modelNumber: 'WT-3005D',
          sku: 'WT-PWR-3005',
          price: 36500,
          discountPrice: 32900,
          stockQuantity: 9,
          images: ['assets/images/power_supply.svg'],
          description: 'Ultra-low noise linear regulated bench power supply with 4-digit LED readout, constant current (CC) and constant voltage (CV) automatic crossover, and thermal protection.',
          specifications: {
            'Output Voltage': '0 - 30.00 V Continuously Adjustable',
            'Output Current': '0 - 5.000 A Continuously Adjustable',
            'Ripple & Noise': '< 1mVrms / 3mArms',
            'Regulation Mode': 'Automatic CV / CC with LED indicators',
            'Cooling': 'Intelligent Temperature Controlled Fan'
          },
          isFeatured: true,
          isBestSeller: true,
          isNewArrival: false,
          status: 'in_stock',
          rating: 4.9,
          reviewCount: 27
        },
        {
          id: 'prod-007',
          name: 'WayaTronic WT-6005P Programmable Switching Power Supply 60V 5A',
          slug: 'wayatronic-wt-6005p-programmable-power-supply',
          category: 'Power Supplies',
          brand: 'WayaTronic',
          modelNumber: 'WT-6005P',
          sku: 'WT-PWR-6005',
          price: 52000,
          discountPrice: 47500,
          stockQuantity: 5,
          images: ['assets/images/power_supply.svg'],
          description: 'Programmable high-power bench supply with 5 presets memory, USB interface with SCPI command control, and over-current protection latching.',
          specifications: {
            'Output': '0 - 60V, 0 - 5A (300W total)',
            'Memory Slots': 'M1 - M4 Quick Recall buttons',
            'Interface': 'USB PC Remote Software included',
            'Accuracy': '±(0.1% + 2 digits)'
          },
          isFeatured: false,
          isBestSeller: false,
          isNewArrival: true,
          status: 'in_stock',
          rating: 4.8,
          reviewCount: 8
        },

        // 5. Function Generators
        {
          id: 'prod-008',
          name: 'WayaTronic WT-FG25M Dual Channel DDS Arbitrary Function Generator',
          slug: 'wayatronic-wt-fg25m-function-generator',
          category: 'Function Generators',
          brand: 'WayaTronic',
          modelNumber: 'WT-FG25M',
          sku: 'WT-GEN-2502',
          price: 68000,
          discountPrice: 62000,
          stockQuantity: 7,
          images: ['assets/images/function_gen.svg'],
          description: '25MHz dual-channel direct digital synthesis (DDS) waveform generator with 200MSa/s sampling, 14-bit vertical resolution, and 160+ built-in arbitrary waveforms.',
          specifications: {
            'Max Frequency': '25 MHz Sine, 15 MHz Square',
            'Channels': '2 Fully Independent Outputs',
            'Sample Rate': '200 MSa/s',
            'Waveforms': 'Sine, Square, Triangle, Ramp, Pulse, Noise, ARB',
            'Modulation': 'AM, FM, PM, FSK, Sweep, Burst'
          },
          isFeatured: false,
          isBestSeller: false,
          isNewArrival: true,
          status: 'in_stock',
          rating: 4.9,
          reviewCount: 11
        },

        // 6. Soldering Stations
        {
          id: 'prod-009',
          name: 'WayaTronic WT-936D Pro Digital ESD-Safe Soldering Station',
          slug: 'wayatronic-wt-936d-pro-soldering-station',
          category: 'Soldering Stations',
          brand: 'WayaTronic',
          modelNumber: 'WT-936D',
          sku: 'WT-SLD-0936',
          price: 19800,
          discountPrice: 17500,
          stockQuantity: 24,
          images: ['assets/images/soldering_station.svg'],
          description: 'Rapid-heat 75W ceramic heating element soldering station with microcomputer PID temperature control (200°C - 480°C), sleep mode, and brass sponge cleaner.',
          specifications: {
            'Power Consumption': '75W High Power Ceramic Heater',
            'Temperature Range': '200°C to 480°C (392°F - 896°F)',
            'Temperature Stability': '±1°C (Stationary air)',
            'Tip to Ground Resistance': '< 2 Ohms (ESD Safe)',
            'Heater Element': 'Genuine Japanese A1321 Ceramic'
          },
          isFeatured: true,
          isBestSeller: true,
          isNewArrival: false,
          status: 'in_stock',
          rating: 4.9,
          reviewCount: 43
        },
        {
          id: 'prod-010',
          name: 'Quick 861DW 1000W Lead-Free SMD Rework Station',
          slug: 'quick-861dw-1000w-smd-rework-station',
          category: 'Soldering Stations',
          brand: 'Quick',
          modelNumber: '861DW',
          sku: 'QCK-SLD-8610',
          price: 84000,
          discountPrice: 78500,
          stockQuantity: 4,
          images: ['assets/images/soldering_station.svg'],
          description: 'Industry-standard 1000W hot air rework station with brushless vortex fan, 3 memory channels, and magnetic induction auto-cool cradle.',
          specifications: {
            'Power': '1000W Vortex Air Flow',
            'Air Volume': '1 - 120 L/min',
            'Temperature': '100°C - 500°C'
          },
          isFeatured: false,
          isBestSeller: false,
          isNewArrival: false,
          status: 'in_stock',
          rating: 5.0,
          reviewCount: 15
        },

        // 7. Electronic Test Kits
        {
          id: 'prod-011',
          name: 'WayaTronic Master Electronic Test Kit WT-TK99 (Sri Lanka Edition)',
          slug: 'wayatronic-master-electronic-test-kit-wt-tk99',
          category: 'Electronic Test Kits',
          brand: 'WayaTronic',
          modelNumber: 'WT-TK99',
          sku: 'WT-KIT-9901',
          price: 48500,
          discountPrice: 43500,
          stockQuantity: 15,
          images: ['assets/images/test_kit.svg'],
          description: 'The definitive all-in-one laboratory toolkit created for Sri Lankan engineering students, electronic laboratories, and technicians. Includes digital multimeter, logic probe, ESD tweezers set, soldering iron, wire stripper, test leads, and high-strength aluminum flight case.',
          specifications: {
            'Included Instruments': 'WT-6000 DMM + High-Precision Logic Probe',
            'Included Tools': 'Soldering Iron 60W, Solder Wire, Desoldering Pump, Wire Strippers, 6x ESD Tweezers',
            'Accessories': 'Needle Test Leads, Banana-to-BNC, Alligator Clips, Breadboard 830-point',
            'Carrying Case': 'Reinforced Lockable Aluminum Hard Case'
          },
          isFeatured: true,
          isBestSeller: true,
          isNewArrival: true,
          status: 'in_stock',
          rating: 5.0,
          reviewCount: 52
        },
        {
          id: 'prod-012',
          name: 'WayaTronic University Electronics Starter Lab Kit',
          slug: 'wayatronic-university-electronics-starter-kit',
          category: 'Electronic Test Kits',
          brand: 'WayaTronic',
          modelNumber: 'WT-ULK-01',
          sku: 'WT-KIT-0100',
          price: 26000,
          discountPrice: 23500,
          stockQuantity: 20,
          images: ['assets/images/test_kit.svg'],
          description: 'Tailored for undergraduate EE courses covering analog circuits, digital logic, and signal measurements.',
          specifications: {
            'Includes': 'Compact DMM, Breadboard, Jumper Wire Spool, 200+ Passive Components, Battery Clip, Logic Pen',
            'Warranty': '1 Year Full Replacement Warranty'
          },
          isFeatured: false,
          isBestSeller: true,
          isNewArrival: false,
          status: 'in_stock',
          rating: 4.8,
          reviewCount: 31
        },

        // 8. Arduino and ESP32 Boards
        {
          id: 'prod-013',
          name: 'WayaTronic ESP32-S3 Dual-Core AIoT Dev Board (16MB Flash / 8MB PSRAM)',
          slug: 'wayatronic-esp32-s3-aiot-dev-board',
          category: 'Arduino and ESP32 Boards',
          brand: 'WayaTronic',
          modelNumber: 'WT-ESP32-S3',
          sku: 'WT-MCU-3203',
          price: 4600,
          discountPrice: 3950,
          stockQuantity: 45,
          images: ['assets/images/microcontroller.svg'],
          description: 'Next-gen Xtensa 32-bit LX7 dual-core microprocessor running at 240MHz with native USB-C, vector instructions for on-device machine learning, Wi-Fi 4, and Bluetooth 5.0 LE.',
          specifications: {
            'Core': 'Dual-core Xtensa 32-bit LX7 at 240 MHz',
            'Memory': '16 MB Quad SPI Flash + 8 MB Octal PSRAM',
            'Wireless': '2.4 GHz Wi-Fi (802.11 b/g/n) + BLE 5.0 Mesh',
            'I/O Pins': '45 Programmable GPIOs with capacitive touch',
            'Interface': 'Dual USB-C (OTG Native + CH340 UART)'
          },
          isFeatured: true,
          isBestSeller: true,
          isNewArrival: true,
          status: 'in_stock',
          rating: 4.9,
          reviewCount: 64
        },
        {
          id: 'prod-014',
          name: 'Arduino Uno R4 WiFi Genuine Development Board',
          slug: 'arduino-uno-r4-wifi-genuine-board',
          category: 'Arduino and ESP32 Boards',
          brand: 'Arduino',
          modelNumber: 'ABX00087',
          sku: 'ARD-MCU-0004',
          price: 13500,
          discountPrice: 12200,
          stockQuantity: 14,
          images: ['assets/images/microcontroller.svg'],
          description: 'Official Arduino Uno R4 with 32-bit Renesas RA4M1 processor, ESP32-S3 for Wi-Fi/Bluetooth, and onboard 12x8 LED matrix.',
          specifications: {
            'Microcontroller': 'Renesas RA4M1 (Arm Cortex-M4)',
            'Clock Speed': '48 MHz',
            'Operating Voltage': '5V (Supports up to 24V Input)',
            'Display': '12x8 Red LED Matrix built-in'
          },
          isFeatured: false,
          isBestSeller: false,
          isNewArrival: true,
          status: 'in_stock',
          rating: 4.9,
          reviewCount: 19
        },

        // 9. Sensors and Modules
        {
          id: 'prod-015',
          name: 'WayaTronic 10-DOF Precision IMU & Environmental Sensor Module',
          slug: 'wayatronic-10-dof-imu-sensor-module',
          category: 'Sensors and Modules',
          brand: 'WayaTronic',
          modelNumber: 'WT-IMU-10D',
          sku: 'WT-SNS-1001',
          price: 5800,
          discountPrice: 5100,
          stockQuantity: 30,
          images: ['assets/images/sensors.svg'],
          description: 'High-precision 10 degrees of freedom sensor module combining 3-axis accelerometer, 3-axis gyroscope, 3-axis magnetometer, and barometric pressure sensor with I2C/SPI bus.',
          specifications: {
            'Sensors Included': 'MPU-9250 (Gyro+Accel+Mag) + BMP280 (Pressure/Temp)',
            'Bus Voltage': '3.3V - 5.0V with on-board LDO',
            'Communication': 'I2C (Fast Mode 400kHz) and SPI (20MHz)',
            'Application': 'Drones, Robotics, Navigation, Weather Stations'
          },
          isFeatured: false,
          isBestSeller: true,
          isNewArrival: false,
          status: 'in_stock',
          rating: 4.8,
          reviewCount: 28
        },
        {
          id: 'prod-016',
          name: 'Industrial Ultrasonic Transducer Sensor Waterproof (JSN-SR04T)',
          slug: 'waterproof-ultrasonic-sensor-jsn-sr04t',
          category: 'Sensors and Modules',
          brand: 'WayaTronic',
          modelNumber: 'JSN-SR04T-2.0',
          sku: 'WT-SNS-0402',
          price: 3200,
          discountPrice: 2800,
          stockQuantity: 25,
          images: ['assets/images/sensors.svg'],
          description: 'Waterproof ultrasonic ranging module with integrated sealed probe for water tanks, outdoor parking sensors, and automated liquid level monitoring.',
          specifications: {
            'Operating Range': '20cm - 600cm',
            'Resolution': '1mm',
            'Protection': 'IP67 Waterproof Probe with 2.5m Cable'
          },
          isFeatured: false,
          isBestSeller: false,
          isNewArrival: false,
          status: 'in_stock',
          rating: 4.7,
          reviewCount: 17
        },

        // 10. Electronic Components
        {
          id: 'prod-017',
          name: 'WayaTronic 1200-Piece Precision Component Master Assortment Kit',
          slug: 'wayatronic-1200-piece-component-master-kit',
          category: 'Electronic Components',
          brand: 'WayaTronic',
          modelNumber: 'WT-CMP-1200',
          sku: 'WT-CMP-0120',
          price: 8500,
          discountPrice: 7200,
          stockQuantity: 28,
          images: ['assets/images/components.svg'],
          description: 'Complete organized kit containing 1% metal film resistors, multilayer ceramic & electrolytic capacitors, LEDs (5 colors), diodes (1N4148, 1N4007), transistors (2N2222, BC547), and voltage regulators (7805, LM317).',
          specifications: {
            'Resistors': '600x 1/4W 1% (30 values x 20 pcs)',
            'Capacitors': '300x Ceramic (50V) + 120x Electrolytic (16V-50V)',
            'Semiconductors': '100x Transistors, 80x Diodes, 50x LEDs',
            'Packaging': 'Double-sided compartment organizer box'
          },
          isFeatured: true,
          isBestSeller: true,
          isNewArrival: false,
          status: 'in_stock',
          rating: 4.9,
          reviewCount: 71
        },
        {
          id: 'prod-018',
          name: 'NE555 Precision Timer IC (Pack of 10 Pcs Genuine TI)',
          slug: 'ne555-timer-ic-pack-of-10',
          category: 'Electronic Components',
          brand: 'Texas Instruments',
          modelNumber: 'NE555P',
          sku: 'TI-CMP-0555',
          price: 950,
          discountPrice: 790,
          stockQuantity: 120,
          images: ['assets/images/components.svg'],
          description: 'Original Texas Instruments NE555 standard DIP-8 precision timing circuits with high current sink/source capability up to 200mA.',
          specifications: {
            'Package': 'DIP-8 Through-Hole',
            'Supply Voltage': '4.5V to 16V',
            'Max Frequency': '500 kHz'
          },
          isFeatured: false,
          isBestSeller: false,
          isNewArrival: false,
          status: 'in_stock',
          rating: 4.9,
          reviewCount: 35
        },

        // 11. Test Leads and Probes
        {
          id: 'prod-019',
          name: 'WayaTronic CAT III 1000V Gold-Plated Silicone Test Leads Set',
          slug: 'wayatronic-cat-iii-gold-plated-silicone-test-leads',
          category: 'Test Leads and Probes',
          brand: 'WayaTronic',
          modelNumber: 'WT-TL1000',
          sku: 'WT-PRB-1000',
          price: 4200,
          discountPrice: 3600,
          stockQuantity: 35,
          images: ['assets/images/test_leads.svg'],
          description: 'Ultra-flexible heat-resistant silicone multimeter test leads with gold-plated sharp 1mm needle tips, standard 4mm shrouded banana jacks, and screw-on alligator clips.',
          specifications: {
            'Safety Rating': 'CAT III 1000V / CAT IV 600V 20A',
            'Wire Material': 'High-Strand Pure Copper with Silicone Insulation (-50°C to +200°C)',
            'Tip Style': '1mm Gold-Plated Needle + Threaded Clip Adapters',
            'Lead Length': '1.2 Meters (47 Inches)'
          },
          isFeatured: false,
          isBestSeller: true,
          isNewArrival: false,
          status: 'in_stock',
          rating: 4.9,
          reviewCount: 46
        },
        {
          id: 'prod-020',
          name: '100MHz 10:1 Passive Oscilloscope Probe with BNC Connector (Pair)',
          slug: '100mhz-oscilloscope-probe-bnc-pair',
          category: 'Test Leads and Probes',
          brand: 'WayaTronic',
          modelNumber: 'WT-P6100',
          sku: 'WT-PRB-6100',
          price: 6800,
          discountPrice: 5900,
          stockQuantity: 22,
          images: ['assets/images/test_leads.svg'],
          description: 'Standard 100MHz switchable 1X / 10X oscilloscope probes with compensation trimming capacitor, ground lead with alligator clip, and IC testing probe tip.',
          specifications: {
            'Bandwidth': '100 MHz (10X) / 6 MHz (1X)',
            'Attenuation Ratio': '1:1 and 10:1 Switchable',
            'Input Capacitance': '14pF - 18pF (10X)',
            'Max Voltage': '600V DC + Peak AC'
          },
          isFeatured: false,
          isBestSeller: false,
          isNewArrival: false,
          status: 'in_stock',
          rating: 4.8,
          reviewCount: 20
        },

        // 12. Accessories and Tools
        {
          id: 'prod-021',
          name: 'WayaTronic Heat-Resistant Anti-Static Silicone Bench Mat (500x350mm)',
          slug: 'wayatronic-anti-static-silicone-bench-mat',
          category: 'Accessories and Tools',
          brand: 'WayaTronic',
          modelNumber: 'WT-ESD-500',
          sku: 'WT-ACC-0500',
          price: 6500,
          discountPrice: 5400,
          stockQuantity: 18,
          images: ['assets/images/accessories.svg'],
          description: 'Professional high-density silicone workbench repair mat resistant to temperatures up to 500°C (932°F). Features magnetic screw organizers, built-in ruler, and 124 component bins.',
          specifications: {
            'Dimensions': '500mm x 350mm x 5mm',
            'Temperature Resistance': 'Up to 500°C Direct Soldering Heat',
            'Magnetic Areas': '3 Dedicated High-Strength Magnetic Screw Trays',
            'Chemical Resistance': 'Resistant to Isopropyl Alcohol (IPA) and Flux Cleaners'
          },
          isFeatured: false,
          isBestSeller: true,
          isNewArrival: true,
          status: 'in_stock',
          rating: 4.9,
          reviewCount: 39
        },
        {
          id: 'prod-022',
          name: 'WayaTronic 7-Piece Anti-Magnetic Precision ESD Tweezers Set',
          slug: 'wayatronic-7-piece-precision-esd-tweezers-set',
          category: 'Accessories and Tools',
          brand: 'WayaTronic',
          modelNumber: 'WT-TWZ-07',
          sku: 'WT-ACC-0007',
          price: 3800,
          discountPrice: 3200,
          stockQuantity: 40,
          images: ['assets/images/accessories.svg'],
          description: 'Non-magnetic stainless steel electrostatic dissipative (ESD) tweezers set (ESD-10 to ESD-16) with ultra-fine straight, curved, and flat tips for surface-mount soldering.',
          specifications: {
            'Material': 'High-Grade Austenitic Stainless Steel with Conductive Coating',
            'Included Models': 'ESD-10, ESD-11, ESD-12, ESD-13, ESD-14, ESD-15 (Curved), ESD-16',
            'Surface Resistivity': '10^6 - 10^9 Ohms'
          },
          isFeatured: false,
          isBestSeller: true,
          isNewArrival: false,
          status: 'in_stock',
          rating: 4.8,
          reviewCount: 33
        }
      ],
      orders: [
        {
          id: 'WT-2026-8841',
          userId: 'usr-001',
          customerName: 'Nalinda Perera',
          customerEmail: 'nalinda.p@eng.pdn.ac.lk',
          customerPhone: '+94 77 123 4567',
          deliveryAddress: {
            street: 'No. 18, Peradeniya Road',
            city: 'Kandy',
            district: 'Kandy',
            postalCode: '20000',
            instructions: 'Please call before delivery. Deliver to Faculty of Engineering office.'
          },
          items: [
            {
              productId: 'prod-001',
              name: 'WayaTronic WT-6000 Pro True-RMS Digital Multimeter',
              price: 21900,
              quantity: 2,
              image: 'assets/images/multimeter.svg'
            },
            {
              productId: 'prod-019',
              name: 'WayaTronic CAT III 1000V Gold-Plated Silicone Test Leads Set',
              price: 3600,
              quantity: 2,
              image: 'assets/images/test_leads.svg'
            }
          ],
          subtotal: 51000,
          discountSavings: 5200,
          shippingFee: 0, // Free over 50,000 LKR
          total: 51000,
          paymentMethod: 'Bank Transfer',
          paymentStatus: 'Verified',
          orderStatus: 'Shipped',
          courierTracking: 'PRONET-LK-891024',
          paymentSlipUrl: null,
          createdAt: '2026-10-28T09:15:00.000Z',
          updatedAt: '2026-10-29T14:30:00.000Z'
        },
        {
          id: 'WT-2026-9104',
          userId: 'usr-002',
          customerName: 'Kavindu Senanayake',
          customerEmail: 'kavindu.dev@gmail.com',
          customerPhone: '+94 71 890 1234',
          deliveryAddress: {
            street: 'Apartment 4B, Lotus Residencies, Nawala',
            city: 'Rajagiriya',
            district: 'Colombo',
            postalCode: '10107',
            instructions: 'Leave at security reception desk if not available.'
          },
          items: [
            {
              productId: 'prod-011',
              name: 'WayaTronic Master Electronic Test Kit WT-TK99 (Sri Lanka Edition)',
              price: 43500,
              quantity: 1,
              image: 'assets/images/test_kit.svg'
            }
          ],
          subtotal: 43500,
          discountSavings: 5000,
          shippingFee: 850,
          total: 44350,
          paymentMethod: 'Cash on Delivery (COD)',
          paymentStatus: 'Pending',
          orderStatus: 'Confirmed',
          courierTracking: null,
          paymentSlipUrl: null,
          createdAt: '2026-11-01T16:45:00.000Z',
          updatedAt: '2026-11-01T17:10:00.000Z'
        }
      ],
      reviews: [
        {
          id: 'rev-001',
          author: 'Eng. Janaka Bandara',
          role: 'Senior Embedded Systems Specialist, Colombo',
          rating: 5,
          date: '2026-10-14',
          comment: 'WayaTronic has transformed how we source test instruments in Sri Lanka. The WT-6000 Pro multimeter arrived factory-calibrated with an authentic test certificate. The build quality matches top German instruments at a fraction of the cost.'
        },
        {
          id: 'rev-002',
          author: 'Dr. Priyantha Jayasuriya',
          role: 'Head of Robotics Lab, University of Moratuwa',
          rating: 5,
          date: '2026-09-28',
          comment: 'We equipped 12 university lab benches with the WayaTronic DSO-2104X 4-channel oscilloscopes and linear power supplies. Unbeatable signal stability, ultra-fast FFT, and exceptional after-sales support.'
        },
        {
          id: 'rev-003',
          author: 'Shenal Gunaratne',
          role: 'IoT Hardware Developer & Maker',
          rating: 5,
          date: '2026-10-22',
          comment: 'The Master Test Kit WT-TK99 is every engineer’s dream case. The silicone test leads alone are worth every rupee. Super-fast islandwide courier delivery to Galle within 36 hours.'
        }
      ],
      messages: [
        {
          id: 'msg-001',
          name: 'Dileepa Alwis',
          email: 'dileepa@solarlanka.com',
          phone: '+94 77 987 6543',
          subject: 'Bulk Multimeter & Clamp Meter Order for Solar Technicians',
          message: 'Hello WayaTronic team, we require 15 units of WT-CM600 clamp meters with calibration certificates. Please send an official corporate quotation.',
          status: 'New',
          createdAt: '2026-11-02T08:20:00.000Z'
        }
      ]
    };

    this.save();
    return this;
  }

  // --- Products Data API ---
  async getProducts() {
    await this.readyPromise;
    return [...this.data.products];
  }

  async getProductById(id) {
    await this.readyPromise;
    return this.data.products.find(p => p.id === id) || null;
  }

  async getProductBySlug(slug) {
    await this.readyPromise;
    return this.data.products.find(p => p.slug === slug) || null;
  }

  async addProduct(productData) {
    await this.readyPromise;
    const newProduct = {
      id: 'prod-' + Date.now().toString().slice(-6),
      slug: productData.slug || productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      rating: 5.0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
      ...productData
    };
    this.data.products.unshift(newProduct);
    this.save();
    return newProduct;
  }

  async updateProduct(id, updates) {
    await this.readyPromise;
    const index = this.data.products.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Product not found: ' + id);
    this.data.products[index] = { ...this.data.products[index], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return this.data.products[index];
  }

  async deleteProduct(id) {
    await this.readyPromise;
    const index = this.data.products.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Product not found: ' + id);
    const deleted = this.data.products.splice(index, 1)[0];
    this.save();
    return deleted;
  }

  async decrementStock(productId, quantity) {
    await this.readyPromise;
    const prod = this.data.products.find(p => p.id === productId);
    if (!prod) throw new Error('Product not found');
    if (prod.stockQuantity < quantity) {
      throw new Error(`Insufficient stock for "${prod.name}". Available: ${prod.stockQuantity}, Requested: ${quantity}`);
    }
    prod.stockQuantity -= quantity;
    if (prod.stockQuantity === 0) {
      prod.status = 'out_of_stock';
    } else if (prod.stockQuantity <= 5) {
      prod.status = 'low_stock';
    }
    this.save();
    return prod;
  }

  // --- Categories API ---
  async getCategories() {
    await this.readyPromise;
    return [...this.data.categories];
  }

  async addCategory(catData) {
    await this.readyPromise;
    const newCat = {
      id: 'cat-' + Date.now().toString().slice(-5),
      slug: catData.slug || catData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      icon: catData.icon || 'multimeter.svg',
      ...catData
    };
    this.data.categories.push(newCat);
    this.save();
    return newCat;
  }

  async updateCategory(id, updates) {
    await this.readyPromise;
    const index = this.data.categories.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Category not found: ' + id);
    this.data.categories[index] = { ...this.data.categories[index], ...updates };
    this.save();
    return this.data.categories[index];
  }

  async deleteCategory(id) {
    await this.readyPromise;
    const index = this.data.categories.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Category not found: ' + id);
    const cat = this.data.categories[index];
    // Check if any product is assigned to this category
    const count = this.data.products.filter(p => p.category === cat.name).length;
    if (count > 0) {
      throw new Error(`Cannot delete category "${cat.name}". It is assigned to ${count} active product(s). Please reassign products first.`);
    }
    const deleted = this.data.categories.splice(index, 1)[0];
    this.save();
    return deleted;
  }

  // --- Orders API ---
  async getOrders() {
    await this.readyPromise;
    return [...this.data.orders];
  }

  async getOrderById(id) {
    await this.readyPromise;
    return this.data.orders.find(o => o.id === id) || null;
  }

  async createOrder(orderPayload) {
    await this.readyPromise;
    // Validate stock for all items first
    for (const item of orderPayload.items) {
      const prod = this.data.products.find(p => p.id === item.productId);
      if (!prod) throw new Error(`Product ${item.name} does not exist`);
      if (prod.stockQuantity < item.quantity) {
        throw new Error(`Item "${prod.name}" has only ${prod.stockQuantity} items in stock.`);
      }
    }

    // Decrement stock for all items
    for (const item of orderPayload.items) {
      await this.decrementStock(item.productId, item.quantity);
    }

    const orderId = 'WT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    const newOrder = {
      id: orderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      orderStatus: orderPayload.paymentMethod === 'Bank Transfer' ? 'Pending' : 'Confirmed',
      paymentStatus: 'Pending',
      courierTracking: null,
      ...orderPayload
    };

    this.data.orders.unshift(newOrder);
    this.save();
    return newOrder;
  }

  async updateOrderStatus(id, newStatus, trackingNumber = null) {
    await this.readyPromise;
    const order = this.data.orders.find(o => o.id === id);
    if (!order) throw new Error('Order not found: ' + id);
    order.orderStatus = newStatus;
    if (trackingNumber) order.courierTracking = trackingNumber;
    order.updatedAt = new Date().toISOString();
    this.save();
    return order;
  }

  // --- Users & Customers API ---
  async getUsers() {
    await this.readyPromise;
    return [...this.data.users];
  }

  async getUserById(id) {
    await this.readyPromise;
    return this.data.users.find(u => u.id === id) || null;
  }

  async getUserByEmail(email) {
    await this.readyPromise;
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async registerUser(userData) {
    await this.readyPromise;
    const existing = await this.getUserByEmail(userData.email);
    if (existing) {
      throw new Error('An account with this email address is already registered.');
    }
    const hashed = await this.hashPassword(userData.password);
    const newUser = {
      id: 'usr-' + Date.now().toString().slice(-6),
      name: userData.name,
      email: userData.email.toLowerCase(),
      phone: userData.phone || '',
      district: userData.district || 'Colombo',
      address: userData.address || '',
      city: userData.city || '',
      postalCode: userData.postalCode || '',
      passwordHash: hashed.hash,
      passwordSalt: hashed.salt,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    this.data.users.unshift(newUser);
    this.save();
    return newUser;
  }

  async updateUser(id, updates) {
    await this.readyPromise;
    const user = this.data.users.find(u => u.id === id);
    if (!user) throw new Error('User not found: ' + id);
    if (updates.password) {
      const hashed = await this.hashPassword(updates.password);
      user.passwordHash = hashed.hash;
      user.passwordSalt = hashed.salt;
      delete updates.password;
    }
    Object.assign(user, updates);
    this.save();
    return user;
  }

  // --- Admins API ---
  async getAdmins() {
    await this.readyPromise;
    return [...this.data.admins];
  }

  async getAdminByUsername(username) {
    await this.readyPromise;
    return this.data.admins.find(a => a.username.toLowerCase() === username.toLowerCase()) || null;
  }

  async createAdmin(adminData) {
    await this.readyPromise;
    const existing = await this.getAdminByUsername(adminData.username);
    if (existing) {
      throw new Error(`Admin username "${adminData.username}" already exists.`);
    }
    const hashed = await this.hashPassword(adminData.password);
    const newAdmin = {
      id: 'adm-' + Date.now().toString().slice(-5),
      username: adminData.username,
      name: adminData.name || adminData.username,
      email: adminData.email || '',
      role: adminData.role || 'Inventory Manager',
      passwordHash: hashed.hash,
      passwordSalt: hashed.salt,
      mustChangePassword: false,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    this.data.admins.push(newAdmin);
    this.save();
    return newAdmin;
  }

  async updateAdmin(id, updates) {
    await this.readyPromise;
    const admin = this.data.admins.find(a => a.id === id);
    if (!admin) throw new Error('Admin not found: ' + id);
    if (updates.password) {
      const hashed = await this.hashPassword(updates.password);
      admin.passwordHash = hashed.hash;
      admin.passwordSalt = hashed.salt;
      admin.mustChangePassword = false;
      delete updates.password;
    }
    Object.assign(admin, updates);
    this.save();
    return admin;
  }

  // --- Contact Messages API ---
  async getMessages() {
    await this.readyPromise;
    return [...this.data.messages];
  }

  async addMessage(msg) {
    await this.readyPromise;
    const newMsg = {
      id: 'msg-' + Date.now().toString().slice(-5),
      createdAt: new Date().toISOString(),
      status: 'New',
      ...msg
    };
    this.data.messages.unshift(newMsg);
    this.save();
    return newMsg;
  }

  // --- Settings & Store Config ---
  async getSettings() {
    await this.readyPromise;
    return { ...this.data.settings };
  }

  async updateSettings(newSettings) {
    await this.readyPromise;
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
    return this.data.settings;
  }

  // --- Full Database Backup / Restore / Reset ---
  async exportDatabase() {
    await this.readyPromise;
    return JSON.stringify(this.data, null, 2);
  }

  async importDatabase(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.products || !parsed.categories || !parsed.admins) {
        throw new Error('Invalid WayaTronic database backup structure.');
      }
      this.data = parsed;
      this.save();
      return true;
    } catch (e) {
      throw new Error('Import failed: ' + e.message);
    }
  }

  async resetToDefaults() {
    localStorage.removeItem(this.STORAGE_KEY);
    await this.seedDefaults();
    return true;
  }
}

// Global Singleton Instance
window.WayaDB = new WayaDBEngine();
