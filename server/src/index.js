/**
 * index.js — Server entry point.
 *
 * Spins up an Express HTTP server with a raw WebSocket server (the ws
 * package) attached to it. Using ws instead of Socket.IO keeps the
 * connection lifecycle transparent and easy to explain: one TCP upgrade,
 * one persistent connection, plain JSON messages in both directions.
 *
 * On each new connection the server immediately sends SYNC_STATE (the
 * full board) so a freshly opened tab shows all existing notes — without
 * this, new tabs would see an empty board, which wouldn't really be
 * "a shared board."
 */

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const store = require('./store');
const { handleMessage, broadcast, getConnectedCount } = require('./wsHandlers');

const PORT = process.env.PORT || 3001;

// Load persisted board state from disk before accepting any connections
store.load();

const app = express();

// Simple health-check endpoint — handy for verifying the server is up
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected. Total:', getConnectedCount(wss));

  // Send the full board state to the newly connected client
  ws.send(
    JSON.stringify({
      type: 'SYNC_STATE',
      payload: { notes: store.getNotes() },
    })
  );

  // Let everyone know the updated client count
  broadcastCount();

  ws.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());
      handleMessage(message, wss);
    } catch (err) {
      console.error('Bad message from client:', err.message);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected. Total:', getConnectedCount(wss));
    broadcastCount();
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
  });
});

/** Broadcast the current connected-client count to all tabs. */
function broadcastCount() {
  broadcast(wss, {
    type: 'CLIENT_COUNT',
    payload: { count: getConnectedCount(wss) },
  });
}

// Flush any pending debounced write before the process dies, otherwise
// the last 300ms of edits never reach board.json.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    store.flush();
    process.exit(0);
  });
}

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}`);
});
