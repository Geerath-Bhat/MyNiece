from pydantic import BaseModel


class VoiceInterpretIn(BaseModel):
    transcript: str
    baby_id: str


class VoiceResultOut(BaseModel):
    intent: str
    entities: dict
    action_taken: str
    response_message: str
    log_id: str | None = None
    reminder_id: str | None = None
    success: bool
