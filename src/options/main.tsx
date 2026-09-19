import React from 'react';
import { createRoot } from 'react-dom/client';
import '../ui/styles/index.css';
import { SettingsView } from '../dashboard/views/SettingsView';
import { useSettings, useTheme } from '../ui/hooks/useSettings';

function OptionsApp() {
  const { settings } = useSettings();
  useTheme(settings);
  return <SettingsView standalone />;
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>,
);
