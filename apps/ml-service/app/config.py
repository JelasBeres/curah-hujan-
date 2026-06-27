from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    model_path: str = str(
        Path(__file__).parent.parent.parent.parent / "ml" / "artifacts" / "random_forest_tma.joblib"
    )
    metadata_path: str = str(
        Path(__file__).parent.parent.parent.parent / "ml" / "artifacts" / "model_metadata.json"
    )
    api_key: str = "ml-service-secret-key-change-in-production"
    allowed_origin: str = "http://localhost:3000"
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_prefix = "ML_"


settings = Settings()
