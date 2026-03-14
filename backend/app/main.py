from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import create_tables
from app.scheduler.setup import start_scheduler, shutdown_scheduler
from app.routers import auth, babies, reminders, logs, voice, push, expenses, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
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

for router_module in [auth, babies, reminders, logs, voice, push, expenses, analytics]:
    app.include_router(router_module.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
