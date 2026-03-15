from pydantic import field_validator
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

    # Email OTP (Resend — preferred) or Gmail SMTP fallback
    resend_api_key: str = ""      # RESEND_API_KEY in .env  (resend.com free tier)
    smtp_host: str = "smtp-relay.brevo.com"
    smtp_port: int = 587
    smtp_user: str = ""           # SMTP_USER in .env  (Brevo SMTP login)
    smtp_password: str = ""       # SMTP_PASSWORD in .env  (Brevo SMTP password)
    smtp_from: str = ""           # SMTP_FROM in .env  (verified sender email in Brevo)

    @property
    def otp_enabled(self) -> bool:
        return bool(self.resend_api_key or (self.smtp_user and self.smtp_password))

    # Global super-admin: this email always gets super_admin role on register/login
    super_admin_email: str = ""

    cors_origins: list[str] = ["http://localhost:5173"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except Exception:
                return [o.strip() for o in v.split(",")]
        return v

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
