from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class PredictRequest(BaseModel):
    current_tma: float = Field(..., description="TMA saat ini dalam meter")
    rainfall_mm: float = Field(0.0, description="Curah hujan dalam mm")
    previous_tma_history: Optional[List[float]] = Field(
        None, description="Riwayat TMA 24 jam terakhir (urutan kronologis)"
    )


class PredictResponse(BaseModel):
    prediction_timestamp: str
    predicted_tma: float
    calculated_discharge_m3s: float
    status: str
    model_version: str
    input_summary: dict


class TrainResponse(BaseModel):
    status: str
    message: str
    model_version: str
    metrics: dict


class HealthResponse(BaseModel):
    status: str
    model_version: str
    model_loaded: bool
    features_count: int


class MetricsResponse(BaseModel):
    model_version: str
    mae: float
    rmse: float
    r2: float
    training_date: str
    feature_importance: List[dict]


class ErrorResponse(BaseModel):
    detail: str
    error_code: str
