from fastapi import HTTPException, Request
from jose import jwt, JWTError
import httpx
from config import KEYCLOAK_JWKS_URL, KEYCLOAK_URL, KEYCLOAK_REALM

_jwks_cache = None


async def get_jwks():
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient() as client:
            resp = await client.get(KEYCLOAK_JWKS_URL)
            _jwks_cache = resp.json()
    return _jwks_cache


async def get_current_user(request: Request) -> dict:
    """Extract and validate Keycloak JWT from Authorization header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header.split(" ", 1)[1]
    try:
        jwks = await get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        key = None
        for k in jwks.get("keys", []):
            if k["kid"] == unverified_header.get("kid"):
                key = k
                break

        if key is None:
            # Keys may have rotated, clear cache and retry
            global _jwks_cache
            _jwks_cache = None
            jwks = await get_jwks()
            for k in jwks.get("keys", []):
                if k["kid"] == unverified_header.get("kid"):
                    key = k
                    break

        if key is None:
            raise HTTPException(status_code=401, detail="Unable to find matching signing key")

        issuer = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}"
        payload = jwt.decode(
            token, key, algorithms=["RS256"],
            issuer=issuer,
            options={"verify_aud": False},
        )
        return {
            "user_id": payload.get("sub"),
            "username": payload.get("preferred_username", ""),
            "email": payload.get("email", ""),
        }
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token validation failed: {str(e)}")
