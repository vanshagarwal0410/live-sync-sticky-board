/**
 * ConnectionStatus.jsx — Live/Disconnected badge with connected-client count.
 *
 * Shows 🟢 Live when the WebSocket is open, 🔴 Disconnected when it isn't.
 * The client auto-reconnects with exponential backoff (handled in
 * useBoardSocket), so this badge flips back to green on its own once
 * the server is reachable again — no page refresh needed.
 *
 * Also shows the number of connected clients (nice-to-have, Section 6).
 */

export default function ConnectionStatus({ isConnected, count }) {
  return (
    <div className="connection-status" role="status" aria-live="polite">
      <span
        className={`connection-dot ${
          isConnected ? 'connected' : 'disconnected'
        }`}
      />
      <span>{isConnected ? 'Live' : 'Disconnected'}</span>
      {isConnected && count > 0 && (
        <span className="connection-count" title={`${count} tab(s) connected`}>
          · {count}
        </span>
      )}
    </div>
  );
}
