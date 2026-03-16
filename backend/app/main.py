import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import create_tables
from app.scheduler.setup import start_scheduler, shutdown_scheduler
from app.routers import auth, babies, reminders, logs, voice, push, expenses, analytics, sleep, sse, admin, uploads
from app.services import event_bus


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Capture the running event loop for the SSE event bus
    event_bus.set_loop(asyncio.get_event_loop())
    create_tables()
    start_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(
    title="CryBaby API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router_module in [auth, babies, reminders, logs, voice, push, expenses, analytics, sleep, sse, admin, uploads]:
    app.include_router(router_module.router, prefix="/api")

# Serve uploaded avatar files as static files
_uploads_dir = Path("uploads/avatars")
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "ok", "version": "0.1.0"}
