import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'https://plateform-auth.konitys.fr',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'konitys',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'compress-tool',
});

export default keycloak;
