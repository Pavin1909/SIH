import secrets

from fastapi import Depends, Header, HTTPException, status

from app.core.config import Settings, get_settings


def require_phase3_access(
    x_api_key: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> None:
    expected = settings.phase3_api_key
    if not expected:
        return
    supplied = x_api_key or (authorization.removeprefix("Bearer ").strip() if authorization else "")
    if not secrets.compare_digest(supplied, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Valid Phase 3 API credentials are required")