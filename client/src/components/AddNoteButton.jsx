/**
 * AddNoteButton.jsx — Floating "+" button that creates a new sticky note.
 *
 * Picks a random color from the Candy Board palette and places the note
 * at a slightly randomized position near the center of the viewport,
 * so new notes don't stack exactly on top of each other.
 */

import { useCallback } from 'react';
import { COLOR_NAMES } from '../constants';
import { uid } from '../uid';

export default function AddNoteButton({ onAdd }) {
  const handleAdd = useCallback(() => {
    // Pick a random color from the palette
    const color = COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)];

    // Place near center with random jitter (±100px) so notes don't stack
    const x = Math.max(
      40,
      Math.floor(window.innerWidth / 2 - 110 + (Math.random() - 0.5) * 200)
    );
    const y = Math.max(
      60,
      Math.floor(window.innerHeight / 2 - 80 + (Math.random() - 0.5) * 200)
    );

    onAdd({
      id: uid(),
      text: '',
      color,
      x,
      y,
    });
  }, [onAdd]);

  return (
    <button
      className="toolbar-btn"
      onClick={handleAdd}
      aria-label="Add new note"
      title="Add note"
    >
      +
    </button>
  );
}
