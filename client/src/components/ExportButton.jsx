/**
 * ExportButton.jsx — Downloads the current board as a .json file.
 *
 * Nice-to-have feature (Section 6). Entirely client-side: creates a Blob
 * from the notes array, generates an object URL, and triggers a download
 * via a temporary <a> element. No server round-trip involved.
 */

import { useCallback } from 'react';

export default function ExportButton({ notes }) {
  const handleExport = useCallback(() => {
    const data = JSON.stringify({ notes, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create a temporary link and click it to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = `sticky-board-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [notes]);

  return (
    <button
      className="export-btn"
      onClick={handleExport}
      aria-label="Export board as JSON"
      title="Export board"
    >
      📥 Export
    </button>
  );
}
