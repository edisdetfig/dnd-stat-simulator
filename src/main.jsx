import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Self-host fonts via @fontsource so they're bundled with the app — no
// external CDN. fonts.css writes our own @font-face rules with
// font-display: block to avoid the FOUT swap (text is briefly invisible
// instead of jumping size when the font loads).
import './styles/fonts.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
