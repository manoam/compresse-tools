import os

_raw_db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://compress:compress@localhost:5432/compress")

# Coolify/Heroku use postgres:// but SQLAlchemy needs postgresql+asyncpg://
DATABASE_URL = _raw_db_url
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "https://plateform-auth.konitys.fr")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "konitys")
KEYCLOAK_JWKS_URL = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs"
