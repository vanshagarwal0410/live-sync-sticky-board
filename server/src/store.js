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
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE_PATH = path.join(DATA_DIR, 'board.json');
const DEBOUNCE_MS = 300;

let notes = [];
let writeTimer = null;

/** Load persisted state from disk, or start with an empty board. */
function load() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(FILE_PATH)) {
      const raw = fs.readFileSync(FILE_PATH, 'utf-8');
      const data = JSON.parse(raw);
      notes = Array.isArray(data.notes) ? data.notes : [];
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
  writeTimer = setTimeout(() => {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(FILE_PATH, JSON.stringify({ notes }, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save board.json:', err.message);
    }
  }, DEBOUNCE_MS);
}

function getNotes() {
  return notes;
}

function addNote(note) {
  notes.push(note);
  scheduleSave();
}

function editNote(id, text) {
  const note = notes.find((n) => n.id === id);
  if (note) {
    note.text = text;
    scheduleSave();
  }
  return note;
}

function deleteNote(id) {
  notes = notes.filter((n) => n.id !== id);
  scheduleSave();
}

function moveNote(id, x, y) {
  const note = notes.find((n) => n.id === id);
  if (note) {
    note.x = x;
    note.y = y;
    scheduleSave();
  }
  return note;
}

module.exports = { load, getNotes, addNote, editNote, deleteNote, moveNote };
