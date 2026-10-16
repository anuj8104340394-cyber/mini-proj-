from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import DATABASE_URL


db_url = DATABASE_URL
if db_url.startswith("sqlite"):
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
else:
    try:
        connect_args = {"connect_timeout": 2} if "psycopg" in db_url else {}
        engine = create_engine(db_url, pool_pre_ping=True, connect_args=connect_args)
        with engine.connect() as conn:
            pass
    except Exception as e:
        import sys
        from pathlib import Path
        _db_path = Path(__file__).resolve().parents[1] / "bmc.db"
        db_url = f"sqlite:///{_db_path.as_posix()}"
        engine = create_engine(db_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass
