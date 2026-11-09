require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);

// ─────────────────────────────────────────
// WebSocket Server
// ─────────────────────────────────────────
const wss = new WebSocket.Server({ server: httpServer });

// Active driver simulations: orderCode -> { intervalId, stepIndex, waypoints, clients }
const simulations = {};

/**
 * Broadcast a message to all clients subscribed to an orderCode.
 */
function broadcast(orderCode, data) {
  const sim = simulations[orderCode];
  if (!sim) return;
  const msg = JSON.stringify(data);
  sim.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

/**
 * Start (or restart) the driver location simulation for a given order.
 */
async function startSimulation(orderCode) {
  // Avoid duplicate simulations
  if (simulations[orderCode]) return;

  try {
    const [rows] = await pool.query(
      `SELECT rw.lat, rw.lng, rw.label, rw.step_index
         FROM orders o
         JOIN route_waypoints rw ON rw.order_id = o.id
        WHERE o.order_code = ?
        ORDER BY rw.step_index ASC`,
      [orderCode]
    );

    if (!rows.length) return;

    const [orderRows] = await pool.query(
      `SELECT status_code FROM orders WHERE order_code = ?`,
      [orderCode]
    );

    const status = orderRows[0]?.status_code || 'pending';

    // For delivered or pending orders: jump straight to the last/first waypoint
    let startStep = 0;
    if (status === 'delivered') startStep = rows.length - 1;
    if (status === 'pending' || status === 'in_warehouse') startStep = 0;
    if (status === 'in_transit') startStep = Math.floor(rows.length * 0.2);
    if (status === 'out_delivery') startStep = Math.floor(rows.length * 0.6);

    simulations[orderCode] = {
      intervalId: null,
      stepIndex: startStep,
      waypoints: rows,
      clients: new Set(),
      status,
    };

    const sim = simulations[orderCode];

    // Broadcast current position immediately
    broadcast(orderCode, {
      type: 'location',
      orderCode,
      step: sim.stepIndex,
      total: sim.waypoints.length,
      lat: sim.waypoints[sim.stepIndex].lat,
      lng: sim.waypoints[sim.stepIndex].lng,
      label: sim.waypoints[sim.stepIndex].label,
      status: sim.status,
    });

    // Don't animate if delivered or no movement needed
    if (status === 'delivered' || status === 'pending' || status === 'in_warehouse') return;

    sim.intervalId = setInterval(() => {
      if (!simulations[orderCode]) return;

      sim.stepIndex++;
      if (sim.stepIndex >= sim.waypoints.length) {
        sim.stepIndex = sim.waypoints.length - 1;
        clearInterval(sim.intervalId);
        sim.intervalId = null;
      }

      broadcast(orderCode, {
        type: 'location',
        orderCode,
        step: sim.stepIndex,
        total: sim.waypoints.length,
        lat: sim.waypoints[sim.stepIndex].lat,
        lng: sim.waypoints[sim.stepIndex].lng,
        label: sim.waypoints[sim.stepIndex].label,
        status: sim.status,
      });
    }, 2000); // Move every 2 seconds
  } catch (err) {
    console.error('Simulation error:', err.message);
  }
}

wss.on('connection', (ws) => {
  let subscribedOrder = null;

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === 'subscribe' && msg.orderCode) {
        // Unsubscribe from previous order
        if (subscribedOrder && simulations[subscribedOrder]) {
          simulations[subscribedOrder].clients.delete(ws);
        }

        subscribedOrder = msg.orderCode;

        // Start simulation if not running
        if (!simulations[subscribedOrder]) {
          await startSimulation(subscribedOrder);
        }

        if (simulations[subscribedOrder]) {
          simulations[subscribedOrder].clients.add(ws);

          // Send full route + current position immediately on subscribe
          const sim = simulations[subscribedOrder];
          ws.send(
            JSON.stringify({
              type: 'init',
              orderCode: subscribedOrder,
              waypoints: sim.waypoints,
              step: sim.stepIndex,
              status: sim.status,
            })
          );

          // Also send current position
          ws.send(
            JSON.stringify({
              type: 'location',
              orderCode: subscribedOrder,
              step: sim.stepIndex,
              total: sim.waypoints.length,
              lat: sim.waypoints[sim.stepIndex].lat,
              lng: sim.waypoints[sim.stepIndex].lng,
              label: sim.waypoints[sim.stepIndex].label,
              status: sim.status,
            })
          );
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Order not found or has no route.' }));
        }
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format.' }));
    }
  });

  ws.on('close', () => {
    if (subscribedOrder && simulations[subscribedOrder]) {
      simulations[subscribedOrder].clients.delete(ws);
    }
  });
});

// ─────────────────────────────────────────
// REST API Routes
// ─────────────────────────────────────────

/**
 * GET /api/order/:code
 * Returns order details, status history, and route waypoints.
 */
app.get('/api/order/:code', async (req, res) => {
  const orderCode = req.params.code.trim().toUpperCase();

  try {
    // Fetch order
    const [orders] = await pool.query(
      `SELECT o.id, o.order_code, o.sender_name, o.receiver_name,
              o.receiver_phone, o.description, o.weight_kg,
              o.status_code, ds.label AS status_label,
              o.created_at, o.updated_at
         FROM orders o
         JOIN delivery_statuses ds ON ds.code = o.status_code
        WHERE o.order_code = ?`,
      [orderCode]
    );

    if (!orders.length) {
      return res.status(404).json({ error: 'Order not found. Please check your order code.' });
    }

    const order = orders[0];

    // Fetch route
    const [waypoints] = await pool.query(
      `SELECT step_index, lat, lng, label
         FROM route_waypoints
        WHERE order_id = ?
        ORDER BY step_index ASC`,
      [order.id]
    );

    // Fetch status history
    const [history] = await pool.query(
      `SELECT sh.status_code, ds.label AS status_label, sh.note, sh.changed_at
         FROM status_history sh
         JOIN delivery_statuses ds ON ds.code = sh.status_code
        WHERE sh.order_id = ?
        ORDER BY sh.changed_at ASC`,
      [order.id]
    );

    // All statuses for timeline
    const [allStatuses] = await pool.query(
      `SELECT code, label, sort_order FROM delivery_statuses ORDER BY sort_order ASC`
    );

    return res.json({ order, waypoints, history, allStatuses });
  } catch (err) {
    console.error('DB error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/statuses
 * Returns all available delivery statuses.
 */
app.get('/api/statuses', async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM delivery_statuses ORDER BY sort_order');
  res.json(rows);
});

/**
 * Health check
 */
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ─────────────────────────────────────────
// Start
// ─────────────────────────────────────────
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Delivery Tracking Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket available on ws://localhost:${PORT}`);
});
