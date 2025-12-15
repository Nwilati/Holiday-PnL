import os

class Settings:
    APP_NAME: str = os.environ.get("APP_NAME", "Holiday Home PnL")
    DEBUG: bool = os.environ.get("DEBUG", "False").lower() == "true"
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "")
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "default-secret-key")
    ALGORITHM: str = os.environ.get("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

settings = Settings()
