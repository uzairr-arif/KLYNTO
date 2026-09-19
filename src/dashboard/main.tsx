import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '../ui/styles/index.css';
import './dashboard.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
