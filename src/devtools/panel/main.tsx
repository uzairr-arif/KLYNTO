import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../ui/styles/index.css';
import '../../dashboard/dashboard.css';
import './panel.css';
import { PanelApp } from './PanelApp';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <PanelApp />
  </React.StrictMode>,
);
