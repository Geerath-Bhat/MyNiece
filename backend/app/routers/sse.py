"""Server-Sent Events endpoint for real-time household activity feed."""
import asyncio
import json
import logging
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from app.services import event_bus
from app.services.auth_service import decode_token  # type: ignore[attr-defined]
from app.database import SessionLocal
from app.models.baby import Baby

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sse", tags=["sse"])


async def _event_generator(household_id: str):
    q = event_bus.subscribe(household_id)
    try:
        while True:
            try:
                # Keepalive ping every 25s to prevent proxy timeouts
                event = await asyncio.wait_for(q.get(), timeout=25.0)
                yield f"data: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                yield ": ping\n\n"
    except asyncio.CancelledError:
        pass
    finally:
        event_bus.unsubscribe(household_id, q)


@router.get("/feed")
def sse_feed(baby_id: str = Query(...), token: str = Query(...)):
    """
    SSE stream of activity events for the baby's household.
    Token passed as query param because EventSource doesn't support custom headers.
    """
    # Validate token + resolve household
    try:
        from app.services.auth_service import decode_token
        payload = decode_token(token)
        user_id = payload.get("sub")
    except Exception:
        from fastapi.responses import JSONResponse
        return JSONResponse({"detail": "Invalid token"}, status_code=401)

    db = SessionLocal()
    try:
        baby = db.query(Baby).get(baby_id)
        if not baby:
            from fastapi.responses import JSONResponse
            return JSONResponse({"detail": "Baby not found"}, status_code=404)
        household_id = baby.household_id
    finally:
        db.close()

    return StreamingResponse(
        _event_generator(household_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
