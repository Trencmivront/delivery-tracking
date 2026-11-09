-- ============================================================
-- Delivery Tracking System - Database Setup
-- ============================================================
-- Run this script once to initialize the database.
-- Usage: mysql -u root -p < setup.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS delivery_tracking
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE delivery_tracking;

-- -------------------------------------------------------
-- Statuses reference table
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS delivery_statuses (
  id        INT          PRIMARY KEY AUTO_INCREMENT,
  code      VARCHAR(30)  NOT NULL UNIQUE,
  label     VARCHAR(60)  NOT NULL,
  sort_order INT         NOT NULL DEFAULT 0
);

INSERT IGNORE INTO delivery_statuses (code, label, sort_order) VALUES
  ('pending',      'Pending',          1),
  ('in_warehouse', 'In Warehouse',     2),
  ('in_transit',   'In Transit',       3),
  ('out_delivery', 'Out for Delivery', 4),
  ('delivered',    'Delivered',        5);

-- -------------------------------------------------------
-- Orders table
-- -------------------------------------------------------
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
);

-- -------------------------------------------------------
-- Route waypoints (pre-defined path for each order)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS route_waypoints (
  id         INT          PRIMARY KEY AUTO_INCREMENT,
  order_id   INT          NOT NULL,
  step_index INT          NOT NULL,
  lat        DECIMAL(10,7) NOT NULL,
  lng        DECIMAL(10,7) NOT NULL,
  label      VARCHAR(100),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- -------------------------------------------------------
-- Status history (audit trail)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS status_history (
  id          INT       PRIMARY KEY AUTO_INCREMENT,
  order_id    INT       NOT NULL,
  status_code VARCHAR(30) NOT NULL,
  note        VARCHAR(255),
  changed_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id)    REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (status_code) REFERENCES delivery_statuses(code)
);

-- -------------------------------------------------------
-- Sample data – 5 orders with Istanbul routes
-- -------------------------------------------------------
-- Order 1 : TRK-001001
INSERT IGNORE INTO orders (order_code, sender_name, receiver_name, receiver_phone, description, weight_kg, status_code)
VALUES ('TRK-001001', 'Ahmet Yilmaz', 'Mehmet Demir', '0532 111 2233', 'Electronics package', 2.5, 'in_transit');

SET @o1 = (SELECT id FROM orders WHERE order_code = 'TRK-001001');

INSERT IGNORE INTO route_waypoints (order_id, step_index, lat, lng, label) VALUES
(@o1, 0,  41.0082, 28.9784, 'Istanbul Central Warehouse'),
(@o1, 1,  41.0130, 28.9650, 'Fatih Junction'),
(@o1, 2,  41.0190, 28.9510, 'Aksaray'),
(@o1, 3,  41.0261, 28.9423, 'Laleli'),
(@o1, 4,  41.0300, 28.9300, 'Beyazit'),
(@o1, 5,  41.0350, 28.9175, 'Kapalıcarsı'),
(@o1, 6,  41.0380, 28.9100, 'Eminönü'),
(@o1, 7,  41.0400, 28.9050, 'Galata Bridge'),
(@o1, 8,  41.0430, 28.9000, 'Karaköy'),
(@o1, 9,  41.0461, 28.8976, 'Receiver Address – Karaköy');

INSERT IGNORE INTO status_history (order_id, status_code, note) VALUES
(@o1, 'pending',      'Order created'),
(@o1, 'in_warehouse', 'Package received at Istanbul Central Warehouse'),
(@o1, 'in_transit',   'Package picked up by driver');

-- Order 2 : TRK-001002
INSERT IGNORE INTO orders (order_code, sender_name, receiver_name, receiver_phone, description, weight_kg, status_code)
VALUES ('TRK-001002', 'Fatma Kaya', 'Ali Celik', '0542 444 5566', 'Clothing & accessories', 1.2, 'out_delivery');

SET @o2 = (SELECT id FROM orders WHERE order_code = 'TRK-001002');

INSERT IGNORE INTO route_waypoints (order_id, step_index, lat, lng, label) VALUES
(@o2, 0,  41.0620, 28.9900, 'Sisli Distribution Center'),
(@o2, 1,  41.0580, 29.0000, 'Nisantasi'),
(@o2, 2,  41.0530, 29.0080, 'Macka'),
(@o2, 3,  41.0490, 29.0160, 'Besiktas'),
(@o2, 4,  41.0450, 29.0230, 'Barbaros'),
(@o2, 5,  41.0420, 29.0310, 'Ortakoy'),
(@o2, 6,  41.0400, 29.0400, 'Kuruçesme'),
(@o2, 7,  41.0375, 29.0490, 'Arnavutkoy'),
(@o2, 8,  41.0355, 29.0560, 'Bebek'),
(@o2, 9,  41.0340, 29.0620, 'Receiver Address – Bebek');

INSERT IGNORE INTO status_history (order_id, status_code, note) VALUES
(@o2, 'pending',      'Order created'),
(@o2, 'in_warehouse', 'Arrived at Sisli hub'),
(@o2, 'in_transit',   'Loaded on delivery van'),
(@o2, 'out_delivery', 'Driver en route to receiver');

-- Order 3 : TRK-001003
INSERT IGNORE INTO orders (order_code, sender_name, receiver_name, receiver_phone, description, weight_kg, status_code)
VALUES ('TRK-001003', 'Zeynep Arslan', 'Hasan Ozturk', '0505 777 8899', 'Books & stationery', 3.8, 'delivered');

SET @o3 = (SELECT id FROM orders WHERE order_code = 'TRK-001003');

INSERT IGNORE INTO route_waypoints (order_id, step_index, lat, lng, label) VALUES
(@o3, 0,  41.0050, 29.0300, 'Kadikoy Warehouse'),
(@o3, 1,  41.0080, 29.0400, 'Moda'),
(@o3, 2,  41.0110, 29.0480, 'Bahariye'),
(@o3, 3,  41.0150, 29.0560, 'Fenerbahce'),
(@o3, 4,  41.0200, 29.0640, 'Bostanci'),
(@o3, 5,  41.0230, 29.0720, 'Receiver Address – Bostanci');

INSERT IGNORE INTO status_history (order_id, status_code, note) VALUES
(@o3, 'pending',      'Order created'),
(@o3, 'in_warehouse', 'Arrived at Kadikoy warehouse'),
(@o3, 'in_transit',   'Dispatched'),
(@o3, 'out_delivery', 'On the way to receiver'),
(@o3, 'delivered',    'Package delivered successfully');

-- Order 4 : TRK-001004
INSERT IGNORE INTO orders (order_code, sender_name, receiver_name, receiver_phone, description, weight_kg, status_code)
VALUES ('TRK-001004', 'Can Yildiz', 'Selin Koc', '0533 222 3344', 'Medical supplies', 0.8, 'in_warehouse');

SET @o4 = (SELECT id FROM orders WHERE order_code = 'TRK-001004');

INSERT IGNORE INTO route_waypoints (order_id, step_index, lat, lng, label) VALUES
(@o4, 0,  41.0720, 28.8900, 'Bayrampasa Sorting Center'),
(@o4, 1,  41.0680, 28.9100, 'Bagcilar'),
(@o4, 2,  41.0640, 28.9280, 'Günesli'),
(@o4, 3,  41.0590, 28.9450, 'Bakirköy'),
(@o4, 4,  41.0550, 28.9580, 'Zeytinburnu'),
(@o4, 5,  41.0510, 28.9700, 'Receiver Address – Zeytinburnu');

INSERT IGNORE INTO status_history (order_id, status_code, note) VALUES
(@o4, 'pending',      'Order created'),
(@o4, 'in_warehouse', 'Package at Bayrampasa sorting center');

-- Order 5 : TRK-001005
INSERT IGNORE INTO orders (order_code, sender_name, receiver_name, receiver_phone, description, weight_kg, status_code)
VALUES ('TRK-001005', 'Burak Sen', 'Nur Polat', '0555 666 7788', 'Furniture parts', 15.0, 'pending');

SET @o5 = (SELECT id FROM orders WHERE order_code = 'TRK-001005');

INSERT IGNORE INTO route_waypoints (order_id, step_index, lat, lng, label) VALUES
(@o5, 0,  41.0900, 28.8500, 'Esenyurt Mega Warehouse'),
(@o5, 1,  41.0850, 28.8700, 'Avcilar'),
(@o5, 2,  41.0800, 28.8900, 'Küçükçekmece'),
(@o5, 3,  41.0750, 28.9100, 'Bahçelievler'),
(@o5, 4,  41.0700, 28.9300, 'Receiver Address – Bahçelievler');

INSERT IGNORE INTO status_history (order_id, status_code, note) VALUES
(@o5, 'pending', 'Order created, awaiting warehouse processing');
