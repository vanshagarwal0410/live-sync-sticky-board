/**
 * store.js — In-memory board state backed by a JSON file on disk.
 *
 * Loads board.json on startup (creates it if missing). All mutations happen
 * in memory first, then get debounce-flushed to disk 300ms after the last
 * change — so rapid edits or drag-moves don't hammer the filesystem.
 *
 * Why a JSON file instead of a database? This is a single-server, first-year
 * project with a small data footprint. A flat file keeps the stack minimal
 * and the persistence model easy to explain on camera.
 *
 * Everything that enters the store goes through sanitizeNote() first. The
 * WebSocket is a trust boundary: a malformed message used to be written
 * straight to board.json, and a bad record there crashed every client on
 * load — permanently, since the file is re-read on every restart.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE_PATH = path.join(DATA_DIR, 'board.json');
const DEBOUNCE_MS = 300;

const MAX_TEXT = 10000; // cap so one client can't grow board.json unbounded

let notes = [];
let writeTimer = null;

/**
 * Coerce a client-supplied note into a well-formed record, or return null
 * if it can't be salvaged. Used both on the wire (new messages) and on load
 * (heals a board.json already corrupted by an older build).
 */
function sanitizeNote(input) {
  if (!input || typeof input.id !== 'string' || input.id === '') return null;
  if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) return null;
  return {
    id: input.id,
    text: typeof input.text === 'string' ? input.text.slice(0, MAX_TEXT) : '',
    color: typeof input.color === 'string' ? input.color : 'lemon',
    x: input.x,
    y: input.y,
  };
}

/** Load persisted state from disk, or start with an empty board. */
function load() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(FILE_PATH)) {
      const raw = fs.readFileSync(FILE_PATH, 'utf-8');
      const data = JSON.parse(raw);
      const raws = Array.isArray(data.notes) ? data.notes : [];
      notes = raws.map(sanitizeNote).filter(Boolean);
      const dropped = raws.length - notes.length;
      if (dropped > 0) {
        console.warn(`Dropped ${dropped} malformed note(s) from board.json`);
        scheduleSave(); // rewrite the file without the bad records
      }
      console.log(`Loaded ${notes.length} note(s) from board.json`);
    } else {
      console.log('No board.json found — starting with empty board');
    }
  } catch (err) {
    console.error('Failed to load board.json, starting fresh:', err.message);
    notes = [];
  }
}

/**
 * Schedule a debounced write to disk. Resets the timer on every call,
 * so a burst of rapid changes (e.g. dragging a note) only writes once
 * after the burst settles.
 */
function scheduleSave() {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(flush, DEBOUNCE_MS);
}

/**
 * Write to disk right now, cancelling any pending debounced write. Called
 * on shutdown — otherwise the last 300ms of edits die with the process.
 */
function flush() {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify({ notes }, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save board.json:', err.message);
  }
}

function getNotes() {
  return notes;
}

function addNote(input) {
  const note = sanitizeNote(input);
  if (!note) return null;
  notes.push(note);
  scheduleSave();
  return note;
}

function editNote(id, text) {
  if (typeof text !== 'string') return null;
  const note = notes.find((n) => n.id === id);
  if (note) {
    note.text = text.slice(0, MAX_TEXT);
    scheduleSave();
  }
  return note;
}

function deleteNote(id) {
  notes = notes.filter((n) => n.id !== id);
  scheduleSave();
}

function moveNote(id, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const note = notes.find((n) => n.id === id);
  if (note) {
    note.x = x;
    note.y = y;
    scheduleSave();
  }
  return note;
}

module.exports = {
  load,
  flush,
  sanitizeNote,
  getNotes,
  addNote,
  editNote,
  deleteNote,
  moveNote,
};
