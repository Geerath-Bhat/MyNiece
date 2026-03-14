from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./crybaby.db"
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    vapid_private_key: str = ""
    vapid_public_key: str = ""
    vapid_claim_email: str = "admin@crybaby.app"

    # LLM — priority: Gemini > Groq > Anthropic/OpenAI
    gemini_api_key: str = ""          # GEMINI_API_KEY in .env  (free tier via AI Studio)
    groq_api_key: str = ""            # GROQ_API_KEY in .env    (free tier, no card needed)
    llm_api_key: str = ""             # ANTHROPIC / OPENAI key fallback
    llm_model: str = ""               # auto-selected based on provider below
    llm_provider: str = ""            # auto-selected below

    # Telegram notifications (free alternative to WhatsApp)
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    # Email OTP (Gmail SMTP)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 465
    smtp_user: str = ""           # SMTP_USER in .env  (your Gmail address)
    smtp_password: str = ""       # SMTP_PASSWORD in .env  (Gmail App Password)

    @property
    def otp_enabled(self) -> bool:
        return bool(self.smtp_user and self.smtp_password)

    cors_origins: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def active_llm_provider(self) -> str:
        if self.gemini_api_key:
            return "gemini"
        if self.groq_api_key:
            return "groq"
        if self.llm_provider:
            return self.llm_provider
        if self.llm_api_key:
            return "anthropic"
        return "none"

    @property
    def active_llm_key(self) -> str:
        if self.gemini_api_key:
            return self.gemini_api_key
        if self.groq_api_key:
            return self.groq_api_key
        return self.llm_api_key

    @property
    def active_llm_model(self) -> str:
        provider = self.active_llm_provider
        if provider == "gemini":
            return "models/gemini-2.0-flash"       # free: 15 RPM, 1.5M TPD
        if provider == "groq":
            return "llama-3.3-70b-versatile"       # free: 30 RPM, 131K ctx
        if self.llm_model:
            return self.llm_model
        return "claude-haiku-4-5-20251001"


settings = Settings()
