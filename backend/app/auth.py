from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader

from app.config import settings

_header_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)


async def require_api_key(key: str | None = Security(_header_scheme)) -> None:
    """FastAPI dependency. Pass as `dependencies=[Depends(require_api_key)]`.

    If API_KEY is unset (empty string) auth is skipped — safe for local dev and
    hackathon demos. Set a non-empty API_KEY env var to enforce it in production.
    """
    if not settings.api_key:
        return
    if key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key header",
        )
