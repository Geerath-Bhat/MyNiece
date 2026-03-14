"""
In-memory SSE event bus for real-time household activity streaming.
Thread-safe for APScheduler (BackgroundScheduler) + FastAPI hybrid.
"""
import asyncio
import logging
import threading
from typing import Any

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_subscribers: dict[str, set[asyncio.Queue]] = {}

# Captured at app startup so sync threads can post to the async loop
_loop: asyncio.AbstractEventLoop | None = None


def set_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _loop
    _loop = loop


def subscribe(household_id: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue(maxsize=100)
    with _lock:
        _subscribers.setdefault(household_id, set()).add(q)
    return q


def unsubscribe(household_id: str, q: asyncio.Queue) -> None:
    with _lock:
        subs = _subscribers.get(household_id)
        if subs:
            subs.discard(q)
            if not subs:
                del _subscribers[household_id]


def publish(household_id: str, event: dict[str, Any]) -> None:
    """Publish from any thread (sync or async)."""
    with _lock:
        queues = list(_subscribers.get(household_id, set()))

    if not queues:
        return

    def _put(q: asyncio.Queue) -> None:
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            logger.debug("SSE queue full for household %s — dropping event", household_id)

    if _loop and _loop.is_running():
        for q in queues:
            _loop.call_soon_threadsafe(_put, q)
    else:
        # Fallback: direct put (only safe if called from the async loop itself)
        for q in queues:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass
