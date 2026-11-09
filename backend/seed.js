#!/usr/bin/env node
/**
 * seed.js – Initializes the delivery_tracking database and seeds sample data.
 *
 * Usage:
 *   node seed.js
 *
 * Reads DB credentials from .env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).
 * Run this ONCE after starting MySQL.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
};

const DB_NAME = process.env.DB_NAME || 'delivery_tracking';

async function run() {
  let conn;
  try {
    conn = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to MySQL');

    // Create database
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${DB_NAME}\``);
    console.log(`✅ Database \`${DB_NAME}\` ready`);

    // Statuses
    await conn.query(`
      CREATE TABLE IF NOT EXISTS delivery_statuses (
        id         INT         PRIMARY KEY AUTO_INCREMENT,
        code       VARCHAR(30) NOT NULL UNIQUE,
        label      VARCHAR(60) NOT NULL,
        sort_order INT         NOT NULL DEFAULT 0
      )
    `);

    const statuses = [
      ['pending',      'Pending',          1],
      ['in_warehouse', 'In Warehouse',     2],
      ['in_transit',   'In Transit',       3],
      ['out_delivery', 'Out for Delivery', 4],
      ['delivered',    'Delivered',        5],
    ];
    for (const [code, label, sort_order] of statuses) {
      await conn.query(
        'INSERT IGNORE INTO delivery_statuses (code, label, sort_order) VALUES (?, ?, ?)',
        [code, label, sort_order]
      );
    }
    console.log('✅ Delivery statuses seeded');

    // Orders
    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id             INT           PRIMARY KEY AUTO_INCREMENT,
        order_code     VARCHAR(20)   NOT NULL UNIQUE,
        sender_name    VARCHAR(100)  NOT NULL,
        receiver_name  VARCHAR(100)  NOT NULL,
        receiver_phone VARCHAR(20),
        description    VARCHAR(255),
        weight_kg      DECIMAL(8,2),
        status_code    VARCHAR(30)   NOT NULL DEFAULT 'pending',
        created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (status_code) REFERENCES delivery_statuses(code)
      )
    `);

    // Route waypoints
    await conn.query(`
      CREATE TABLE IF NOT EXISTS route_waypoints (
        id         INT           PRIMARY KEY AUTO_INCREMENT,
        order_id   INT           NOT NULL,
        step_index INT           NOT NULL,
        lat        DECIMAL(10,7) NOT NULL,
        lng        DECIMAL(10,7) NOT NULL,
        label      VARCHAR(100),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);

    // Status history
    await conn.query(`
      CREATE TABLE IF NOT EXISTS status_history (
        id          INT         PRIMARY KEY AUTO_INCREMENT,
        order_id    INT         NOT NULL,
        status_code VARCHAR(30) NOT NULL,
        note        VARCHAR(255),
        changed_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id)    REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (status_code) REFERENCES delivery_statuses(code)
      )
    `);
    console.log('✅ Tables created');

    // ─── Sample Orders ────────────────────────────────────────────────────────
    const sampleOrders = [
      {
        order_code:     'TRK-001001',
        sender_name:    'Ahmet Yilmaz',
        receiver_name:  'Mehmet Demir',
        receiver_phone: '0532 111 2233',
        description:    'Electronics package',
        weight_kg:      2.5,
        status_code:    'in_transit',
        waypoints: [
          [0,  41.0082, 28.9784, 'Istanbul Central Warehouse'],
          [1,  41.0130, 28.9650, 'Fatih Junction'],
          [2,  41.0190, 28.9510, 'Aksaray'],
          [3,  41.0261, 28.9423, 'Laleli'],
          [4,  41.0300, 28.9300, 'Beyazit'],
          [5,  41.0350, 28.9175, 'Kapalıcarsı'],
          [6,  41.0380, 28.9100, 'Eminönü'],
          [7,  41.0400, 28.9050, 'Galata Bridge'],
          [8,  41.0430, 28.9000, 'Karaköy'],
          [9,  41.0461, 28.8976, 'Receiver Address – Karaköy'],
        ],
        history: [
          ['pending',      'Order created'],
          ['in_warehouse', 'Package received at Istanbul Central Warehouse'],
          ['in_transit',   'Package picked up by driver'],
        ],
      },
      {
        order_code:     'TRK-001002',
        sender_name:    'Fatma Kaya',
        receiver_name:  'Ali Celik',
        receiver_phone: '0542 444 5566',
        description:    'Clothing & accessories',
        weight_kg:      1.2,
        status_code:    'out_delivery',
        waypoints: [
          [0,  41.0620, 28.9900, 'Sisli Distribution Center'],
          [1,  41.0580, 29.0000, 'Nisantasi'],
          [2,  41.0530, 29.0080, 'Macka'],
          [3,  41.0490, 29.0160, 'Besiktas'],
          [4,  41.0450, 29.0230, 'Barbaros'],
          [5,  41.0420, 29.0310, 'Ortakoy'],
          [6,  41.0400, 29.0400, 'Kuruçesme'],
          [7,  41.0375, 29.0490, 'Arnavutkoy'],
          [8,  41.0355, 29.0560, 'Bebek'],
          [9,  41.0340, 29.0620, 'Receiver Address – Bebek'],
        ],
        history: [
          ['pending',      'Order created'],
          ['in_warehouse', 'Arrived at Sisli hub'],
          ['in_transit',   'Loaded on delivery van'],
          ['out_delivery', 'Driver en route to receiver'],
        ],
      },
      {
        order_code:     'TRK-001003',
        sender_name:    'Zeynep Arslan',
        receiver_name:  'Hasan Ozturk',
        receiver_phone: '0505 777 8899',
        description:    'Books & stationery',
        weight_kg:      3.8,
        status_code:    'delivered',
        waypoints: [
          [0,  41.0050, 29.0300, 'Kadikoy Warehouse'],
          [1,  41.0080, 29.0400, 'Moda'],
          [2,  41.0110, 29.0480, 'Bahariye'],
          [3,  41.0150, 29.0560, 'Fenerbahce'],
          [4,  41.0200, 29.0640, 'Bostanci'],
          [5,  41.0230, 29.0720, 'Receiver Address – Bostanci'],
        ],
        history: [
          ['pending',      'Order created'],
          ['in_warehouse', 'Arrived at Kadikoy warehouse'],
          ['in_transit',   'Dispatched'],
          ['out_delivery', 'On the way to receiver'],
          ['delivered',    'Package delivered successfully'],
        ],
      },
      {
        order_code:     'TRK-001004',
        sender_name:    'Can Yildiz',
        receiver_name:  'Selin Koc',
        receiver_phone: '0533 222 3344',
        description:    'Medical supplies',
        weight_kg:      0.8,
        status_code:    'in_warehouse',
        waypoints: [
          [0,  41.0720, 28.8900, 'Bayrampasa Sorting Center'],
          [1,  41.0680, 28.9100, 'Bagcilar'],
          [2,  41.0640, 28.9280, 'Günesli'],
          [3,  41.0590, 28.9450, 'Bakirköy'],
          [4,  41.0550, 28.9580, 'Zeytinburnu'],
          [5,  41.0510, 28.9700, 'Receiver Address – Zeytinburnu'],
        ],
        history: [
          ['pending',      'Order created'],
          ['in_warehouse', 'Package at Bayrampasa sorting center'],
        ],
      },
      {
        order_code:     'TRK-001005',
        sender_name:    'Burak Sen',
        receiver_name:  'Nur Polat',
        receiver_phone: '0555 666 7788',
        description:    'Furniture parts',
        weight_kg:      15.0,
        status_code:    'pending',
        waypoints: [
          [0,  41.0900, 28.8500, 'Esenyurt Mega Warehouse'],
          [1,  41.0850, 28.8700, 'Avcilar'],
          [2,  41.0800, 28.8900, 'Küçükçekmece'],
          [3,  41.0750, 28.9100, 'Bahçelievler'],
          [4,  41.0700, 28.9300, 'Receiver Address – Bahçelievler'],
        ],
        history: [
          ['pending', 'Order created, awaiting warehouse processing'],
        ],
      },
    ];

    for (const o of sampleOrders) {
      // Insert order
      await conn.query(
        `INSERT IGNORE INTO orders
          (order_code, sender_name, receiver_name, receiver_phone, description, weight_kg, status_code)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [o.order_code, o.sender_name, o.receiver_name, o.receiver_phone,
         o.description, o.weight_kg, o.status_code]
      );

      const [[{ id }]] = await conn.query(
        'SELECT id FROM orders WHERE order_code = ?', [o.order_code]
      );

      // Waypoints
      for (const [step_index, lat, lng, label] of o.waypoints) {
        await conn.query(
          `INSERT IGNORE INTO route_waypoints (order_id, step_index, lat, lng, label)
           VALUES (?, ?, ?, ?, ?)`,
          [id, step_index, lat, lng, label]
        );
      }

      // History
      for (const [status_code, note] of o.history) {
        await conn.query(
          `INSERT INTO status_history (order_id, status_code, note) VALUES (?, ?, ?)`,
          [id, status_code, note]
        );
      }

      console.log(`  📦 Seeded order ${o.order_code} (${o.status_code})`);
    }

    console.log('\n🎉 Database setup complete!');
    console.log('   Sample order codes:');
    sampleOrders.forEach((o) =>
      console.log(`   • ${o.order_code}  → ${o.status_code}`)
    );

  } catch (err) {
    console.error('\n❌ Setup failed:', err.message);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   → Check DB_USER and DB_PASSWORD in backend/.env');
    }
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOENT') {
      console.error('   → MySQL is not running. Start it with: sudo service mysql start');
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
