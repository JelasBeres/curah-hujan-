import pandas as pd
import numpy as np
import joblib
import json
import logging
from pathlib import Path
from typing import Optional, List, Tuple

logger = logging.getLogger(__name__)


FEATURES = [
    'tma', 'rainfall_mm', 'discharge_m3s', 'hour', 'day_of_week',
    'day_of_month', 'month', 'is_weekend',
    'hour_sin', 'hour_cos', 'month_sin', 'month_cos',
    'tma_lag_1h', 'tma_lag_2h', 'tma_lag_3h', 'tma_lag_6h', 'tma_lag_12h', 'tma_lag_24h',
    'tma_diff_1h', 'tma_diff_3h',
    'tma_rolling_mean_3h', 'tma_rolling_mean_6h', 'tma_rolling_mean_12h', 'tma_rolling_std_6h',
    'rainfall_lag_1d', 'rainfall_lag_2d',
    'rainfall_rolling_sum_3d', 'rainfall_rolling_sum_7d',
    'discharge_lag_1h', 'discharge_lag_3h', 'discharge_rolling_mean_6h'
]


def calculate_discharge(tma: float) -> float:
    if tma is None or tma < -0.15:
        raise ValueError(f"Nilai TMA tidak valid untuk rating curve: {tma}")
    return 20.268 * ((tma + 0.15) ** 2.157)


def determine_warning_status(predicted_tma: float, thresholds: dict = None) -> str:
    if thresholds is None:
        thresholds = {"safe_max": 2.0, "alert_max": 3.0, "danger_min": 3.0}
    if predicted_tma < thresholds.get("safe_max", 2.0):
        return "Aman"
    elif predicted_tma < thresholds.get("alert_max", 3.0):
        return "Siaga"
    else:
        return "Bahaya"


class ModelService:
    def __init__(self, model_path: str, metadata_path: str):
        self.model_path = Path(model_path)
        self.metadata_path = Path(metadata_path)
        self.model = None
        self.metadata = None
        self.load_model()

    def load_model(self):
        if self.model_path.exists():
            self.model = joblib.load(self.model_path)
            logger.info(f"Model loaded from {self.model_path}")
        else:
            logger.warning(f"Model not found at {self.model_path}")

        if self.metadata_path.exists():
            with open(self.metadata_path) as f:
                self.metadata = json.load(f)
            logger.info(f"Metadata loaded from {self.metadata_path}")
        else:
            logger.warning(f"Metadata not found at {self.metadata_path}")

    @property
    def is_loaded(self) -> bool:
        return self.model is not None

    @property
    def model_version(self) -> str:
        if self.metadata:
            return self.metadata.get("version", "unknown")
        return "unknown"

    def predict(self, current_tma: float, rainfall_mm: float = 0.0,
                history: Optional[List[float]] = None,
                prediction_time=None) -> dict:
        if not self.is_loaded:
            raise RuntimeError("Model belum dimuat")

        if prediction_time is None:
            prediction_time = pd.Timestamp.now(tz="Asia/Jakarta")

        discharge = calculate_discharge(current_tma)

        if history and len(history) >= 24:
            hist = list(history[-24:]) + [current_tma]
        else:
            hist = [current_tma] * 25

        ts = pd.Timestamp(prediction_time)
        hour = ts.hour
        day_of_week = ts.dayofweek
        day_of_month = ts.day
        month = ts.month
        is_weekend = 1 if day_of_week >= 5 else 0

        tma_series = pd.Series(hist)

        features = {
            'tma': current_tma,
            'rainfall_mm': rainfall_mm,
            'discharge_m3s': discharge,
            'hour': hour,
            'day_of_week': day_of_week,
            'day_of_month': day_of_month,
            'month': month,
            'is_weekend': is_weekend,
            'hour_sin': np.sin(2 * np.pi * hour / 24),
            'hour_cos': np.cos(2 * np.pi * hour / 24),
            'month_sin': np.sin(2 * np.pi * month / 12),
            'month_cos': np.cos(2 * np.pi * month / 12),
            'tma_lag_1h': tma_series.iloc[-2] if len(tma_series) >= 2 else current_tma,
            'tma_lag_2h': tma_series.iloc[-3] if len(tma_series) >= 3 else current_tma,
            'tma_lag_3h': tma_series.iloc[-4] if len(tma_series) >= 4 else current_tma,
            'tma_lag_6h': tma_series.iloc[-7] if len(tma_series) >= 7 else current_tma,
            'tma_lag_12h': tma_series.iloc[-13] if len(tma_series) >= 13 else current_tma,
            'tma_lag_24h': tma_series.iloc[-25] if len(tma_series) >= 25 else current_tma,
            'tma_diff_1h': current_tma - (tma_series.iloc[-2] if len(tma_series) >= 2 else current_tma),
            'tma_diff_3h': current_tma - (tma_series.iloc[-4] if len(tma_series) >= 4 else current_tma),
            'tma_rolling_mean_3h': tma_series.tail(3).mean(),
            'tma_rolling_mean_6h': tma_series.tail(6).mean(),
            'tma_rolling_mean_12h': tma_series.tail(12).mean(),
            'tma_rolling_std_6h': tma_series.tail(6).std() if len(tma_series) >= 6 else 0,
            'rainfall_lag_1d': rainfall_mm,
            'rainfall_lag_2d': rainfall_mm,
            'rainfall_rolling_sum_3d': rainfall_mm * 3,
            'rainfall_rolling_sum_7d': rainfall_mm * 7,
            'discharge_lag_1h': discharge,
            'discharge_lag_3h': discharge,
            'discharge_rolling_mean_6h': discharge,
        }

        X = pd.DataFrame([features])[FEATURES]

        predicted_tma = float(self.model.predict(X)[0])
        predicted_discharge = calculate_discharge(predicted_tma)
        status = determine_warning_status(predicted_tma)

        next_hour = ts + pd.Timedelta(hours=1)

        return {
            "prediction_timestamp": next_hour.strftime("%Y-%m-%dT%H:%M:00+07:00"),
            "predicted_tma": round(predicted_tma, 4),
            "calculated_discharge_m3s": round(predicted_discharge, 2),
            "status": status,
            "model_version": self.model_version,
            "input_summary": {
                "current_tma": current_tma,
                "rainfall_mm": rainfall_mm,
                "hour": hour
            }
        }

    def get_metrics(self) -> dict:
        if not self.metadata:
            return {"error": "Metadata tidak tersedia"}
        metrics = self.metadata.get("metrics", {}).get("testing", {})
        return {
            "model_version": self.model_version,
            "mae": metrics.get("mae", 0),
            "rmse": metrics.get("rmse", 0),
            "r2": metrics.get("r2", 0),
            "training_date": self.metadata.get("training_date", ""),
            "feature_importance": [
                {"feature": k, "importance": v}
                for k, v in sorted(
                    self.metadata.get("feature_importance", {}).items(),
                    key=lambda x: x[1], reverse=True
                )[:20]
            ]
        }
