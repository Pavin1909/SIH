import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import Depends

from app.api.routes import router
from app.core.config import get_settings
from app.database.session import get_db

settings = get_settings()
logging.basicConfig(level=settings.log_level.upper())

app = FastAPI(title=settings.app_name, version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
)
app.include_router(router)


@app.get("/health")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
	db.execute(text("SELECT 1"))
	return {"status": "ok"}
