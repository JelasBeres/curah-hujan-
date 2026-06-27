import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Depends, HTTPException, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import settings
from app.models import (
    PredictRequest, PredictResponse, TrainResponse,
    HealthResponse, MetricsResponse, ErrorResponse
)
from app.services import ModelService, calculate_discharge, determine_warning_status

logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)
model_service: ModelService = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model_service
    logger.info("Starting ML service...")
    model_service = ModelService(settings.model_path, settings.metadata_path)
    logger.info(f"Model version: {model_service.model_version}")
    yield
    logger.info("Shutting down ML service...")


app = FastAPI(
    title="Flood Early Warning - ML Service",
    description="Random Forest model for predicting water levels (TMA)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.allowed_origin, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_api_key(credentials: HTTPAuthorizationCredentials = Security(security)):
    if credentials and credentials.credentials == settings.api_key:
        return True
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="API key tidak valid",
    )


@app.get("/health", response_model=HealthResponse)
async def health():
    if not model_service or not model_service.is_loaded:
        return HealthResponse(
            status="unhealthy",
            model_version="none",
            model_loaded=False,
            features_count=0,
        )
    return HealthResponse(
        status="healthy",
        model_version=model_service.model_version,
        model_loaded=True,
        features_count=len(model_service.metadata.get("feature_list", []))
        if model_service.metadata else 0,
    )


@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    if not model_service or not model_service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model belum dimuat",
        )

    try:
        result = model_service.predict(
            current_tma=request.current_tma,
            rainfall_mm=request.rainfall_mm,
            history=request.previous_tma_history,
        )
        return PredictResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.exception("Prediction error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Kesalahan prediksi: {str(e)}",
        )


@app.post("/train", response_model=TrainResponse)
async def train(authorized: bool = Depends(verify_api_key)):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Training endpoint requires full dataset access. "
               "Use the training script: python scripts/train_model.py",
    )


@app.get("/model/metrics", response_model=MetricsResponse)
async def model_metrics():
    if not model_service or not model_service.metadata:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Metadata model tidak tersedia",
        )
    metrics = model_service.get_metrics()
    return MetricsResponse(**metrics)


@app.get("/discharge/{tma}")
async def calc_discharge(tma: float):
    try:
        q = calculate_discharge(tma)
        return {"tma": tma, "discharge_m3s": round(q, 2)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
