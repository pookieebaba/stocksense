import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Core
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
    FLASK_ENV  = os.getenv("FLASK_ENV", "development")

    # Database
    SQLALCHEMY_DATABASE_URI     = os.getenv("DATABASE_URL", "sqlite:///stocksense.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY              = os.getenv("JWT_SECRET_KEY", "jwt-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES    = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 86400))

    # Email
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_FROM     = os.getenv("MAIL_FROM")

    # CORS
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
