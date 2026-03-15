from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_verified
from app.models.user import User
from app.schemas.voice import VoiceInterpretIn, VoiceResultOut
from app.config import settings

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post("/interpret", response_model=VoiceResultOut)
async def interpret(body: VoiceInterpretIn,
                    user: User = Depends(require_verified),
                    db: Session = Depends(get_db)):
    if not settings.active_llm_key:
        raise HTTPException(503, "Voice AI not configured — set GEMINI_API_KEY or LLM_API_KEY")
    from app.services.voice_service import interpret as svc_interpret
    return await svc_interpret(db, body.transcript, body.baby_id, user.id, user.timezone)
