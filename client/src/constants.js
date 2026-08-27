/**
 * constants.js — Shared design tokens for the Sticky Board client.
 *
 * Defines the "Candy Board" color palette so note colors stay consistent
 * between the AddNoteButton (which picks a random color) and StickyNote
 * (which renders it). Colors are stored as names in the note data; the
 * hex mapping lives here.
 */

export const NOTE_COLORS = {
  tangerine: '#FFB347',
  rose: '#FF6B8A',
  lavender: '#B48BFF',
  mint: '#6BCB77',
  sky: '#61C0FF',
  lemon: '#FFE066',
};

export const COLOR_NAMES = Object.keys(NOTE_COLORS);
