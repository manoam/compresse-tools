import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://compress:compress@localhost:5432/compress")
KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "https://plateform-auth.konitys.fr")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "konitys")
KEYCLOAK_JWKS_URL = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs"
