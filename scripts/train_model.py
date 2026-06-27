"""
Train Random Forest model for TMA prediction.
Uses chronological split, TimeSeriesSplit CV, and no data leakage.
"""

import pandas as pd
import numpy as np
import json
import time
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

DATA_PROCESSED = Path(__file__).parent.parent / "data" / "processed"
ML_ARTIFACTS = Path(__file__).parent.parent / "ml" / "artifacts"

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
TARGET = 'target_tma_next_1h'


def calculate_discharge(tma):
    if tma is None or tma < -0.15:
        raise ValueError(f"Nilai TMA tidak valid: {tma}")
    return 20.268 * ((tma + 0.15) ** 2.157)


def evaluate(y_true, y_pred, name=""):
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    print(f"\n{name}:")
    print(f"  MAE:  {mae:.4f} m")
    print(f"  RMSE: {rmse:.4f} m")
    print(f"  R²:   {r2:.4f}")
    return {"mae": mae, "rmse": rmse, "r2": r2}


def train_model():
    print("=" * 60)
    print("TRAINING RANDOM FOREST MODEL")
    print("=" * 60)

    ML_ARTIFACTS.mkdir(parents=True, exist_ok=True)

    # Load data
    train = pd.read_csv(DATA_PROCESSED / "dataset_train.csv")
    val = pd.read_csv(DATA_PROCESSED / "dataset_val.csv")
    test = pd.read_csv(DATA_PROCESSED / "dataset_test.csv")

    X_train = train[FEATURES].values
    y_train = train[TARGET].values
    X_val = val[FEATURES].values
    y_val = val[TARGET].values
    X_test = test[FEATURES].values
    y_test = test[TARGET].values

    print(f"\nX_train: {X_train.shape}")
    print(f"X_val:   {X_val.shape}")
    print(f"X_test:  {X_test.shape}")

    # Baseline: predict the last observed TMA (persistence forecast)
    y_train_baseline = X_train[:, FEATURES.index('tma')]
    y_val_baseline = X_val[:, FEATURES.index('tma')]
    y_test_baseline = X_test[:, FEATURES.index('tma')]

    print("\n--- BASELINE (Persistence: TMA saat ini sebagai prediksi) ---")
    bl_train = evaluate(y_train, y_train_baseline, "Training")
    bl_val = evaluate(y_val, y_val_baseline, "Validation")
    bl_test = evaluate(y_test, y_test_baseline, "Testing")

    # Time Series Cross Validation
    print("\n--- TIME SERIES CROSS VALIDATION ---")
    tscv = TimeSeriesSplit(n_splits=5)
    cv_scores = []

    fold = 1
    for train_idx, val_idx in tscv.split(X_train):
        X_cv_train, X_cv_val = X_train[train_idx], X_train[val_idx]
        y_cv_train, y_cv_val = y_train[train_idx], y_train[val_idx]

        model_cv = RandomForestRegressor(
            n_estimators=100,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            max_features='sqrt',
            random_state=42,
            n_jobs=-1
        )
        model_cv.fit(X_cv_train, y_cv_train)
        y_cv_pred = model_cv.predict(X_cv_val)
        mae = mean_absolute_error(y_cv_val, y_cv_pred)
        cv_scores.append(mae)
        print(f"  Fold {fold}: MAE = {mae:.4f}")
        fold += 1

    print(f"  CV MAE: {np.mean(cv_scores):.4f} ± {np.std(cv_scores):.4f}")

    # Train final model with tuned parameters
    print("\n--- TRAINING FINAL MODEL ---")
    start_time = time.time()

    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=25,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features='sqrt',
        random_state=42,
        n_jobs=-1,
        verbose=1
    )

    model.fit(X_train, y_train)
    train_time = time.time() - start_time
    print(f"Training time: {train_time:.2f}s")

    # Evaluate
    y_pred_train = model.predict(X_train)
    y_pred_val = model.predict(X_val)
    y_pred_test = model.predict(X_test)

    metrics_train = evaluate(y_train, y_pred_train, "Training")
    metrics_val = evaluate(y_val, y_pred_val, "Validation")
    metrics_test = evaluate(y_test, y_pred_test, "Testing")

    # Feature importance
    feature_importance = sorted(
        zip(FEATURES, model.feature_importances_),
        key=lambda x: x[1],
        reverse=True
    )

    print("\n--- TOP 15 FEATURE IMPORTANCE ---")
    for name, imp in feature_importance[:15]:
        print(f"  {name:35s}: {imp:.4f}")

    # Save model
    version = "rf-tma-2024-v1"
    model_path = ML_ARTIFACTS / "random_forest_tma.joblib"
    joblib.dump(model, model_path)
    print(f"\nModel saved: {model_path}")

    # Save metadata
    metadata = {
        "version": version,
        "algorithm": "RandomForestRegressor",
        "parameters": model.get_params(),
        "feature_list": FEATURES,
        "target": TARGET,
        "training_date": time.strftime("%Y-%m-%d %H:%M:%S"),
        "training_duration_seconds": train_time,
        "training_date_range": [
            str(train['timestamp'].min()), str(train['timestamp'].max())
        ],
        "validation_date_range": [
            str(val['timestamp'].min()), str(val['timestamp'].max())
        ],
        "test_date_range": [
            str(test['timestamp'].min()), str(test['timestamp'].max())
        ],
        "num_train_records": len(train),
        "num_val_records": len(val),
        "num_test_records": len(test),
        "baseline_metrics": {
            "training": bl_train,
            "validation": bl_val,
            "testing": bl_test
        },
        "metrics": {
            "training": metrics_train,
            "validation": metrics_val,
            "testing": metrics_test
        },
        "cv_scores": {
            "folds": cv_scores,
            "mean_mae": float(np.mean(cv_scores)),
            "std_mae": float(np.std(cv_scores))
        },
        "feature_importance": {
            name: float(imp) for name, imp in feature_importance
        },
        "rating_curve": "Q = 20.268 × (H + 0.15)^2.157"
    }

    meta_path = ML_ARTIFACTS / "model_metadata.json"
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Metadata saved: {meta_path}")

    # Save evaluation results
    evaluation = {
        "model_version": version,
        "metrics": {
            "training": metrics_train,
            "validation": metrics_val,
            "testing": metrics_test
        },
        "baseline": {
            "training": bl_train,
            "validation": bl_val,
            "testing": bl_test
        },
        "feature_importance": [
            {"feature": name, "importance": float(imp)}
            for name, imp in feature_importance
        ],
        "cv_mean_mae": float(np.mean(cv_scores)),
        "cv_std_mae": float(np.std(cv_scores)),
        "training_time_seconds": train_time
    }

    eval_path = ML_ARTIFACTS / "evaluation.json"
    with open(eval_path, 'w') as f:
        json.dump(evaluation, f, indent=2)
    print(f"Evaluation saved: {eval_path}")

    # Save prediction samples
    samples = pd.DataFrame({
        'timestamp': test['timestamp'],
        'actual_tma': y_test,
        'predicted_tma': y_pred_test,
        'residual': y_test - y_pred_test,
        'current_tma': X_test[:, FEATURES.index('tma')],
        'rainfall_mm': X_test[:, FEATURES.index('rainfall_mm')],
    })
    samples.to_csv(ML_ARTIFACTS / "test_predictions.csv", index=False)
    print(f"Test predictions saved: {ML_ARTIFACTS / 'test_predictions.csv'}")

    return model, metadata


if __name__ == "__main__":
    model, metadata = train_model()
