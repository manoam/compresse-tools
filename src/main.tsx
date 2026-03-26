import { createRoot } from 'react-dom/client'
import './index.css'
import keycloak from './keycloak'
import App from './App'

// Initialize Keycloak before rendering React
keycloak
  .init({ onLoad: 'login-required', checkLoginIframe: false })
  .then((authenticated) => {
    if (authenticated) {
      createRoot(document.getElementById('root')!).render(<App />);
    }
  })
  .catch((err) => {
    console.error('Keycloak init failed', err);
    document.getElementById('root')!.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#666;">Erreur de connexion. Rechargez la page.</div>';
  });

// Auto-refresh token
setInterval(() => {
  keycloak.updateToken(60).catch(() => {
    keycloak.logout();
  });
}, 30000);
