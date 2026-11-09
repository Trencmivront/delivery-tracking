# 📦 Delivery Tracking System

A real-time cargo tracking application built with **Node.js**, **React.js**, **MySQL**, and **WebSocket**.

---

## 🗂️ Project Structure

```
delivery-tracking/
├── backend/
│   ├── server.js      # Express + WebSocket server
│   ├── db.js          # MySQL connection pool
│   ├── seed.js        # Database initializer & sample data seeder
│   ├── setup.sql      # Raw SQL alternative for setup
│   └── .env           # Environment variables
└── frontend/
    └── src/
        ├── App.js              # Main React app
        ├── DeliveryMap.js      # Leaflet map component
        ├── useDeliverySocket.js# WebSocket hook
        ├── utils.js            # Helpers (dates, badges, icons)
        └── App.css             # Global styles
```

---

## 🚀 Getting Started

### 1. Start MySQL

```bash
sudo service mysql start
```

### 2. Configure Database Credentials

Edit `backend/.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=       # ← add your MySQL password if any
DB_NAME=delivery_tracking
PORT=4000
```

### 3. Seed the Database

```bash
cd backend
npm run seed
```

This creates the `delivery_tracking` database, all tables, and inserts 5 sample orders.

### 4. Start the Backend

```bash
# From the backend/ directory
npm start
# or for auto-reload during development:
npm run dev
```

Server runs at → `http://localhost:4000`  
WebSocket at   → `ws://localhost:4000`

### 5. Start the Frontend

```bash
# From the frontend/ directory
npm start
```

Frontend runs at → `http://localhost:3000`

---

## 📋 Sample Order Codes

| Code        | Status            | Route               |
|-------------|-------------------|---------------------|
| TRK-001001  | 🚚 In Transit     | Fatih → Karaköy     |
| TRK-001002  | 📦 Out for Delivery| Şişli → Bebek      |
| TRK-001003  | ✅ Delivered       | Kadıköy → Bostancı  |
| TRK-001004  | 🏭 In Warehouse   | Bayrampaşa          |
| TRK-001005  | 🕐 Pending        | Esenyurt            |

---

## 🔌 API Reference

### REST

| Method | Endpoint            | Description                           |
|--------|---------------------|---------------------------------------|
| GET    | `/api/order/:code`  | Get order info, route, and history    |
| GET    | `/api/statuses`     | List all delivery statuses            |
| GET    | `/api/health`       | Health check                          |

### WebSocket

Connect to `ws://localhost:4000` and send:

```json
{ "type": "subscribe", "orderCode": "TRK-001001" }
```

You will receive:

```json
// On subscribe:
{ "type": "init", "waypoints": [...], "step": 2, "status": "in_transit" }

// Every 3 seconds (while driver moves):
{ "type": "location", "lat": 41.0190, "lng": 28.9510, "label": "Aksaray", "step": 2, "total": 10 }
```

---

## 🗺️ Features

- 🔍 **Order lookup** by code with full sender/receiver details
- 📍 **5-stage status timeline**: Pending → In Warehouse → In Transit → Out for Delivery → Delivered
- 🚚 **Live driver simulation** on Leaflet map (moves every 3 seconds via WebSocket)
- 🗺️ **Route visualization**: planned path (dashed) + completed portion (solid blue)
- 📜 **Status history log** with timestamps and notes
- 🔄 **Auto-reconnecting** WebSocket client
