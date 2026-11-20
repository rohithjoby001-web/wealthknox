import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './state/AppContext.jsx';
import { InstallPromptProvider } from './pwa/useInstallPrompt.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import AuthGate from './auth/AuthGate.jsx';
import App from './App.jsx';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate>
        <InstallPromptProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </InstallPromptProvider>
      </AuthGate>
    </AuthProvider>
  </StrictMode>
);
