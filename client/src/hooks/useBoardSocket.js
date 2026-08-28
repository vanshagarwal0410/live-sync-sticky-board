/**
 * useBoardSocket.js — Custom hook that owns the WebSocket lifecycle.
 *
 * Connects to the server, handles auto-reconnect with exponential backoff
 * (1s → 2s → 4s → … → 30s cap), and exposes the board state plus action
 * dispatchers to the rest of the app.
 *
 * Why a raw WebSocket instead of Socket.IO? The raw protocol keeps
 * connection state easy to reason about and explain on camera: one TCP
 * upgrade, one persistent connection, plain JSON in both directions.
 *
 * Each client generates a unique clientId (see uid.js) so
 * the server can echo it back in broadcasts. The client uses this to
 * distinguish "my own action echoed back" from "someone else's action"
 * — the latter triggers the pulse animation on the affected note.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { uid } from '../uid';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
const RECONNECT_BASE_MS = 1000;
const RECONNECT_CAP_MS = 30000;
const PULSE_DURATION_MS = 600;

export function useBoardSocket() {
  const [notes, setNotes] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedCount, setConnectedCount] = useState(0);
  const [remoteUpdatedIds, setRemoteUpdatedIds] = useState(new Set());

  const wsRef = useRef(null);
  const clientIdRef = useRef(uid());
  const reconnectDelayRef = useRef(RECONNECT_BASE_MS);
  const reconnectTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  // ── Helpers ─────────────────────────────────────────────

  /** Mark a note as "just updated by someone else" for the pulse effect. */
  const markRemoteUpdate = useCallback((id) => {
    setRemoteUpdatedIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setRemoteUpdatedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, PULSE_DURATION_MS);
  }, []);

  // ── Connection logic ────────────────────────────────────

  const connect = useCallback(() => {
    // Don't open a second socket if one is already open or connecting
    const existing = wsRef.current;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    // Every handler bails if this socket is no longer the one we own.
    // React 18 StrictMode mounts, unmounts, and remounts in dev: the first
    // socket's close event used to fire after the remount had set
    // isMountedRef back to true, flipping the badge to "Disconnected" and
    // opening a second, duplicate connection.
    const isCurrent = () => isMountedRef.current && wsRef.current === ws;

    ws.onopen = () => {
      if (!isCurrent()) return;
      setIsConnected(true);
      reconnectDelayRef.current = RECONNECT_BASE_MS; // reset backoff on success
      console.log('[ws] Connected to', WS_URL);
    };

    ws.onclose = () => {
      if (!isCurrent()) return;
      setIsConnected(false);
      setConnectedCount(0);

      // Auto-reconnect with exponential backoff, capped at 30s
      wsRef.current = null; // release the dead socket so connect() can retry

      const delay = reconnectDelayRef.current;
      console.log(`[ws] Disconnected. Reconnecting in ${delay}ms…`);
      reconnectTimerRef.current = setTimeout(() => {
        reconnectDelayRef.current = Math.min(delay * 2, RECONNECT_CAP_MS);
        connect();
      }, delay);
    };

    ws.onerror = () => {
      // onclose will fire after onerror, which triggers reconnect
      // No extra handling needed here
    };

    ws.onmessage = (event) => {
      if (!isCurrent()) return;
      try {
        const msg = JSON.parse(event.data);
        const isRemote =
          msg.sourceClientId && msg.sourceClientId !== clientIdRef.current;

        switch (msg.type) {
          case 'SYNC_STATE':
            // Full board state — replaces everything (used on connect/reconnect).
            // Filtered because one bad record used to crash the whole board.
            setNotes(
              (msg.payload?.notes || []).filter((n) => n && typeof n.id === 'string')
            );
            break;

          case 'NOTE_ADDED':
            setNotes((prev) => {
              // Deduplicate: the sender already added optimistically
              if (prev.some((n) => n.id === msg.payload.id)) return prev;
              return [...prev, msg.payload];
            });
            if (isRemote) markRemoteUpdate(msg.payload.id);
            break;

          case 'NOTE_EDITED':
            setNotes((prev) =>
              prev.map((n) =>
                n.id === msg.payload.id
                  ? { ...n, text: msg.payload.text }
                  : n
              )
            );
            if (isRemote) markRemoteUpdate(msg.payload.id);
            break;

          case 'NOTE_DELETED':
            setNotes((prev) =>
              prev.filter((n) => n.id !== msg.payload.id)
            );
            // No pulse needed — the note is gone
            break;

          case 'NOTE_MOVED':
            setNotes((prev) =>
              prev.map((n) =>
                n.id === msg.payload.id
                  ? { ...n, x: msg.payload.x, y: msg.payload.y }
                  : n
              )
            );
            // Pulse on remote move so liveness is visible (brief, subtle)
            if (isRemote) markRemoteUpdate(msg.payload.id);
            break;

          case 'CLIENT_COUNT':
            setConnectedCount(msg.payload.count);
            break;

          default:
            console.warn('[ws] Unknown message type:', msg.type);
        }
      } catch (err) {
        console.error('[ws] Failed to parse message:', err);
      }
    };
  }, [markRemoteUpdate]);

  // ── Mount/unmount ───────────────────────────────────────

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  // ── Action dispatchers ──────────────────────────────────

  /** Send a JSON message to the server, stamped with our clientId. */
  const send = useCallback((message) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          ...message,
          sourceClientId: clientIdRef.current,
        })
      );
    }
  }, []);

  const addNote = useCallback(
    (note) => {
      // Optimistic local add so the note appears instantly
      setNotes((prev) => [...prev, note]);
      send({ type: 'ADD_NOTE', payload: note });
    },
    [send]
  );

  const editNote = useCallback(
    (id, text) => {
      // Local state is already updated by the StickyNote's controlled input,
      // so we just need to tell the server
      send({ type: 'EDIT_NOTE', payload: { id, text } });
    },
    [send]
  );

  const deleteNote = useCallback(
    (id) => {
      // Optimistic local delete for instant feedback
      setNotes((prev) => prev.filter((n) => n.id !== id));
      send({ type: 'DELETE_NOTE', payload: { id } });
    },
    [send]
  );

  const moveNote = useCallback(
    (id, x, y) => {
      // Position is already updated locally during drag — just tell the server
      send({ type: 'MOVE_NOTE', payload: { id, x, y } });
    },
    [send]
  );

  return {
    notes,
    isConnected,
    connectedCount,
    remoteUpdatedIds,
    addNote,
    editNote,
    deleteNote,
    moveNote,
  };
}
