/**
 * Board.jsx — The dotted-grid canvas that holds all sticky notes.
 *
 * This is purely a layout container — it maps over the notes array and
 * renders a StickyNote for each one. When the board is empty, it shows
 * a friendly prompt pointing the user to the "+" button.
 */

import StickyNote from './StickyNote';

export default function Board({
  notes,
  remoteUpdatedIds,
  onEdit,
  onDelete,
  onMove,
}) {
  return (
    <div className="board">
      {notes.length === 0 && (
        <div className="board-empty">
          <div className="board-empty-icon">📝</div>
          <p>No notes yet — click <strong>+</strong> to add one!</p>
        </div>
      )}

      {notes.map((note) => (
        <StickyNote
          key={note.id}
          note={note}
          isRemoteUpdated={remoteUpdatedIds.has(note.id)}
          onEdit={onEdit}
          onDelete={onDelete}
          onMove={onMove}
        />
      ))}
    </div>
  );
}
