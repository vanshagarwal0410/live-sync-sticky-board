/**
 * StickyNote.jsx — A single draggable, editable sticky note.
 *
 * Handles three interactions:
 *  1. Drag to move — mousedown on the note starts a drag. Positions are
 *     broadcast to the server throttled (~60ms) so other tabs see the note
 *     glide rather than snap. Why throttle instead of sending every pixel?
 *     Sending 60+ messages per second per drag would flood the WebSocket
 *     for no visual benefit — 15–17 updates/sec is plenty smooth.
 *  2. Edit text — a controlled textarea. Edits are debounced (250ms) before
 *     being sent to the server, so rapid typing doesn't flood the wire.
 *  3. Delete — a small × button in the top-right corner.
 *
 * The `isRemoteUpdated` prop triggers a brief CSS pulse animation when
 * another client changes this note, making "liveness" visually obvious.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { NOTE_COLORS } from '../constants';

const THROTTLE_MS = 60;
const EDIT_DEBOUNCE_MS = 250;

export default function StickyNote({
  note,
  isRemoteUpdated,
  onEdit,
  onDelete,
  onMove,
}) {
  // ── Local text state ──────────────────────────────────
  // Keeps the textarea responsive during typing. Syncs from props
  // when the note is updated remotely (and user isn't focused).
  const [localText, setLocalText] = useState(note.text);
  const isFocusedRef = useRef(false);
  const editTimerRef = useRef(null);

  // Sync text from server when we're not actively editing
  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalText(note.text);
    }
  }, [note.text]);

  const handleTextChange = useCallback(
    (e) => {
      const newText = e.target.value;
      setLocalText(newText);

      // Debounce the server send so rapid keystrokes don't flood the wire
      if (editTimerRef.current) clearTimeout(editTimerRef.current);
      editTimerRef.current = setTimeout(() => {
        onEdit(note.id, newText);
      }, EDIT_DEBOUNCE_MS);
    },
    [note.id, onEdit]
  );

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true;
  }, []);

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false;
    // Flush any pending debounced edit immediately on blur
    if (editTimerRef.current) {
      clearTimeout(editTimerRef.current);
      editTimerRef.current = null;
    }
    onEdit(note.id, localText);
  }, [note.id, localText, onEdit]);

  // ── Drag logic ────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: note.x, y: note.y });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const lastSendRef = useRef(0);

  // Sync position from server when we're not dragging
  useEffect(() => {
    if (!isDragging) {
      setDragPos({ x: note.x, y: note.y });
    }
  }, [note.x, note.y, isDragging]);

  const handleMouseDown = useCallback(
    (e) => {
      // Don't start drag if clicking on the textarea or delete button
      if (
        e.target.closest('.note-text') ||
        e.target.closest('.note-delete')
      ) {
        return;
      }

      e.preventDefault();
      setIsDragging(true);
      dragOffsetRef.current = {
        x: e.clientX - dragPos.x,
        y: e.clientY - dragPos.y,
      };
    },
    [dragPos.x, dragPos.y]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const newX = Math.max(0, e.clientX - dragOffsetRef.current.x);
      const newY = Math.max(0, e.clientY - dragOffsetRef.current.y);
      setDragPos({ x: newX, y: newY });

      // Throttle server sends to ~60ms intervals
      const now = Date.now();
      if (now - lastSendRef.current >= THROTTLE_MS) {
        lastSendRef.current = now;
        onMove(note.id, newX, newY);
      }
    };

    const handleMouseUp = (e) => {
      setIsDragging(false);
      // Send final position immediately (unthrottled) so the last
      // position is always accurate
      const finalX = Math.max(0, e.clientX - dragOffsetRef.current.x);
      const finalY = Math.max(0, e.clientY - dragOffsetRef.current.y);
      onMove(note.id, finalX, finalY);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, note.id, onMove]);

  // ── Render ────────────────────────────────────────────

  const bgColor = NOTE_COLORS[note.color] || note.color || '#FFE066';

  const className = [
    'sticky-note',
    isDragging && 'dragging',
    isRemoteUpdated && 'remote-pulse',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      style={{
        left: dragPos.x,
        top: dragPos.y,
        backgroundColor: bgColor,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="note-header">
        <button
          className="note-delete"
          onClick={() => onDelete(note.id)}
          aria-label="Delete note"
          title="Delete note"
        >
          ×
        </button>
      </div>
      <textarea
        className="note-text"
        value={localText}
        onChange={handleTextChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Type something…"
        aria-label="Note text"
      />
    </div>
  );
}
