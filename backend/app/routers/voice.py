from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.voice import VoiceInterpretIn, VoiceResultOut
from app.config import settings

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post("/interpret", response_model=VoiceResultOut)
async def interpret(body: VoiceInterpretIn,
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if not settings.llm_api_key:
        raise HTTPException(503, "Voice AI not configured — set LLM_API_KEY")
    from app.services.voice_service import interpret as svc_interpret
    return await svc_interpret(db, body.transcript, body.baby_id, user.id, user.timezone)
