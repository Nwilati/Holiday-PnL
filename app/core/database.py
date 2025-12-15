from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
import psycopg

# Convert psycopg2 URL to psycopg URL format
database_url = settings.DATABASE_URL
if database_url.startswith("postgresql+psycopg2://"):
    database_url = database_url.replace("postgresql+psycopg2://", "postgresql+psycopg://")
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://")

engine = create_engine(database_url)

# Register enum types for psycopg3
@event.listens_for(engine, "connect")
def register_enums(dbapi_connection, connection_record):
    # Get the raw psycopg connection
    if hasattr(dbapi_connection, 'driver_connection'):
        raw_conn = dbapi_connection.driver_connection
    else:
        raw_conn = dbapi_connection

    # Register custom enum types
    info = psycopg.types.TypeInfo.fetch(raw_conn, "booking_status")
    if info:
        psycopg.types.register_type(info, raw_conn)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
