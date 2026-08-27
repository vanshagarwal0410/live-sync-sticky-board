/**
 * App.jsx — Root component that wires everything together.
 *
 * Owns no state itself — all board state lives in the useBoardSocket
 * hook, which manages the WebSocket connection and exposes notes +
 * action dispatchers. This component just composes the UI from
 * smaller, single-purpose components.
 */

import { useBoardSocket } from './hooks/useBoardSocket';
import Board from './components/Board';
import AddNoteButton from './components/AddNoteButton';
import ConnectionStatus from './components/ConnectionStatus';
import ExportButton from './components/ExportButton';

export default function App() {
  const {
    notes,
    isConnected,
    connectedCount,
    remoteUpdatedIds,
    addNote,
    editNote,
    deleteNote,
    moveNote,
  } = useBoardSocket();

  return (
    <div className="app">
      {/* ── Header: title + status badges ──────────── */}
      <header className="app-header">
        <h1 className="app-title">Sticky Board</h1>
        <div className="header-controls">
          <ConnectionStatus isConnected={isConnected} count={connectedCount} />
          <ExportButton notes={notes} />
        </div>
      </header>

      {/* ── Board: the dotted-grid canvas with notes ── */}
      <Board
        notes={notes}
        remoteUpdatedIds={remoteUpdatedIds}
        onEdit={editNote}
        onDelete={deleteNote}
        onMove={moveNote}
      />

      {/* ── Floating toolbar ───────────────────────── */}
      <div className="toolbar">
        <AddNoteButton onAdd={addNote} />
      </div>
    </div>
  );
}
