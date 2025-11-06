from fastapi import FastAPI
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import text

app = FastAPI()

# Настройки подключения к базе данных
DATABASE_URL = "postgresql+asyncpg://admin:admin@db:5432/mydatabase"

# Создание движка SQLAlchemy
engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
Base = declarative_base()


@app.on_event("startup")
async def startup():
    # Проверим подключение при запуске
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
    print("✅ Connected to PostgreSQL (PostGIS)!")
po

@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/db-check")
async def db_check():
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT NOW()"))
        time_now = result.scalar()
        return {"db_time": str(time_now)}
