/**
 * wsHandlers.js — WebSocket message router.
 *
 * Receives parsed messages from clients, updates the in-memory store,
 * and broadcasts the result to every connected client. Each broadcast
 * includes the original sourceClientId so recipients can tell whether
 * a change came from themselves or from someone else (used on the client
 * to trigger the "remote update" pulse animation).
 *
 * Every handler returns early when the store rejects a message, so a
 * malformed or hostile payload is dropped rather than broadcast — a broadcast
 * the clients can't parse is worse than no broadcast at all.
 *
 * Conflict model: last-write-wins. Whichever update the server processes
 * last for a given note is what gets stored and broadcast. This is
 * deliberate for a first-year submission — see README for the rationale.
 */

const store = require('./store');

/**
 * Route a single parsed client message to the appropriate handler
 * and broadcast the result to all connected clients.
 */
function handleMessage(message, wss) {
  const { type, payload, sourceClientId } = message;

  switch (type) {
    case 'ADD_NOTE': {
      // Broadcast what the store actually kept, not the raw client payload
      const note = store.addNote(payload);
      if (note) {
        broadcast(wss, {
          type: 'NOTE_ADDED',
          payload: note,
          sourceClientId,
        });
      }
      break;
    }

    case 'EDIT_NOTE': {
      if (!payload) break;
      const note = store.editNote(payload.id, payload.text);
      if (note) {
        broadcast(wss, {
          type: 'NOTE_EDITED',
          payload: { id: note.id, text: note.text },
          sourceClientId,
        });
      }
      break;
    }

    case 'DELETE_NOTE': {
      if (!payload || typeof payload.id !== 'string') break;
      store.deleteNote(payload.id);
      broadcast(wss, {
        type: 'NOTE_DELETED',
        payload: { id: payload.id },
        sourceClientId,
      });
      break;
    }

    case 'MOVE_NOTE': {
      if (!payload) break;
      const note = store.moveNote(payload.id, payload.x, payload.y);
      if (note) {
        broadcast(wss, {
          type: 'NOTE_MOVED',
          payload: { id: note.id, x: note.x, y: note.y },
          sourceClientId,
        });
      }
      break;
    }

    default:
      console.warn('Unknown message type:', type);
  }
}

/** Send a JSON message to every client whose socket is currently open. */
function broadcast(wss, message) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      // 1 === WebSocket.OPEN
      client.send(data);
    }
  });
}

/** Count how many clients currently have an open connection. */
function getConnectedCount(wss) {
  let count = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === 1) count++;
  });
  return count;
}

module.exports = { handleMessage, broadcast, getConnectedCount };
