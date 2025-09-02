import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Hide loading screen when React app starts
const loadingScreen = document.getElementById('loading-screen');
if (loadingScreen) {
  setTimeout(() => {
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 300);
  }, 1000);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
