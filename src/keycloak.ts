import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'https://plateform-auth.konitys.fr',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'konitys',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'compress-tool',
};

const keycloak = new Keycloak(keycloakConfig);

// Expose for debugging in browser console: window.__keycloak
(window as any).__keycloak = keycloak;

export default keycloak;
