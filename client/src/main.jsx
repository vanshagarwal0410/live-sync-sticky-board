/**
 * main.jsx — Application entry point.
 *
 * Renders the root App component into the DOM. Wrapped in StrictMode
 * for development warnings — this gets stripped in the production build.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
