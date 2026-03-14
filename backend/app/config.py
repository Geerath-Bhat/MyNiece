from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./crybaby.db"
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    vapid_private_key: str = ""
    vapid_public_key: str = ""
    vapid_claim_email: str = "admin@crybaby.app"

    llm_provider: str = "anthropic"
    llm_api_key: str = ""
    llm_model: str = "claude-haiku-4-5-20251001"  # cheapest, ~$0.0001/call

    cors_origins: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"
        extra = "ignore"    # tolerate unknown env vars in .env


settings = Settings()
