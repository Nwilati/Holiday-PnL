from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool
from app.core.config import settings

# Convert psycopg2 URL to psycopg URL format
database_url = settings.DATABASE_URL
if database_url.startswith("postgresql+psycopg2://"):
    database_url = database_url.replace("postgresql+psycopg2://", "postgresql+psycopg://")
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://")

# Fix SSL connection timeout with Neon database
engine = create_engine(
    database_url,
    poolclass=QueuePool,
    pool_pre_ping=True,      # Check connection is alive before using
    pool_recycle=300,        # Recycle connections after 5 minutes
    pool_size=5,             # Number of connections to keep
    max_overflow=10,         # Extra connections allowed
    connect_args={
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
