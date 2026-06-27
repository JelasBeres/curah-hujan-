"""
Build the complete dataset:
1. Merge TMA hourly data with daily rainfall
2. Calculate discharge using rating curve
3. Create time-based features
4. Create lag features
5. Create rolling features
6. Create target variable
7. Split chronologically (70/15/15)
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
import sys

DATA_INTERIM = Path(__file__).parent.parent / "data" / "interim"
DATA_PROCESSED = Path(__file__).parent.parent / "data" / "processed"


def calculate_discharge(tma: float) -> float:
    """Calculate discharge using rating curve: Q = 20.268 × (H + 0.15)^2.157"""
    if tma is None or tma < -0.15:
        raise ValueError(f"Nilai TMA tidak valid untuk rating curve: {tma}")
    return 20.268 * ((tma + 0.15) ** 2.157)


def build_dataset():
    print("=" * 60)
    print("MEMBANGUN DATASET")
    print("=" * 60)

    # 1. Load data
    tma = pd.read_csv(DATA_INTERIM / "tma_batu_beulah_2024.csv")
    rain = pd.read_csv(DATA_INTERIM / "rainfall_ranca_bungur_2024.csv")

    tma['timestamp'] = pd.to_datetime(tma['timestamp'])
    rain['date'] = pd.to_datetime(rain['date'])

    print(f"\nData TMA: {len(tma)} records")
    print(f"Data Hujan: {len(rain)} records")

    # 2. Sort by timestamp
    tma = tma.sort_values('timestamp').reset_index(drop=True)

    # 3. Remove duplicate timestamps
    before = len(tma)
    tma = tma.drop_duplicates(subset=['timestamp']).reset_index(drop=True)
    print(f"Duplikat dihapus: {before - len(tma)}")

    # 4. Validate TMA range (sanity check)
    outliers = tma[(tma['tma'] < -0.15) | (tma['tma'] > 10)]
    if len(outliers) > 0:
        print(f"Peringatan: {len(outliers)} nilai TMA di luar rentang wajar")
        print(outliers)
        # Remove implausible values
        tma = tma[(tma['tma'] >= -0.15) & (tma['tma'] <= 10)]
        print(f"Setelah filter: {len(tma)} records")

    # 5. Merge rainfall (daily) into TMA (hourly)
    tma['date'] = tma['timestamp'].dt.date
    rain['date'] = rain['date'].dt.date

    df = tma.merge(rain, on='date', how='left', suffixes=('', '_rain'))

    # Check for missing rainfall
    missing_rain = df['rainfall_mm'].isna().sum()
    if missing_rain > 0:
        print(f"Peringatan: {missing_rain} baris tanpa data hujan (diisi 0)")
        df['rainfall_mm'] = df['rainfall_mm'].fillna(0.0)

    print(f"\nSetelah merge: {len(df)} records")

    # 6. Calculate discharge automatically
    df['discharge_m3s'] = df['tma'].apply(calculate_discharge)
    print(f"Debit terhitung: {df['discharge_m3s'].min():.2f} - {df['discharge_m3s'].max():.2f} m³/s")

    # 7. Create time features
    df['hour'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    df['day_of_month'] = df['timestamp'].dt.day
    df['month'] = df['timestamp'].dt.month
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)

    # 8. Cyclical features
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)

    # 9. Lag features for TMA
    for lag in [1, 2, 3, 6, 12, 24]:
        df[f'tma_lag_{lag}h'] = df['tma'].shift(lag)

    # 10. Difference features
    df['tma_diff_1h'] = df['tma'].diff(1)
    df['tma_diff_3h'] = df['tma'].diff(3)

    # 11. Rolling features for TMA
    df['tma_rolling_mean_3h'] = df['tma'].rolling(window=3, min_periods=3).mean()
    df['tma_rolling_mean_6h'] = df['tma'].rolling(window=6, min_periods=6).mean()
    df['tma_rolling_mean_12h'] = df['tma'].rolling(window=12, min_periods=12).mean()
    df['tma_rolling_std_6h'] = df['tma'].rolling(window=6, min_periods=6).std()

    # 12. Rainfall lag features (daily lags for hourly data)
    df['rainfall_lag_1d'] = df['rainfall_mm'].shift(24)  # 1 day ago
    df['rainfall_lag_2d'] = df['rainfall_mm'].shift(48)  # 2 days ago
    df['rainfall_rolling_sum_3d'] = df['rainfall_mm'].rolling(window=72, min_periods=72).sum()
    df['rainfall_rolling_sum_7d'] = df['rainfall_mm'].rolling(window=168, min_periods=168).sum()

    # 13. Discharge lag features
    df['discharge_lag_1h'] = df['discharge_m3s'].shift(1)
    df['discharge_lag_3h'] = df['discharge_m3s'].shift(3)
    df['discharge_rolling_mean_6h'] = df['discharge_m3s'].rolling(window=6, min_periods=6).mean()

    # 14. Create target (TMA one hour ahead)
    df['target_tma_next_1h'] = df['tma'].shift(-1)

    # 15. Remove rows with missing lag features
    feature_cols = [
        'tma', 'rainfall_mm', 'discharge_m3s', 'hour', 'day_of_week',
        'day_of_month', 'month', 'is_weekend',
        'hour_sin', 'hour_cos', 'month_sin', 'month_cos',
        'tma_lag_1h', 'tma_lag_2h', 'tma_lag_3h', 'tma_lag_6h', 'tma_lag_12h', 'tma_lag_24h',
        'tma_diff_1h', 'tma_diff_3h',
        'tma_rolling_mean_3h', 'tma_rolling_mean_6h', 'tma_rolling_mean_12h', 'tma_rolling_std_6h',
        'rainfall_lag_1d', 'rainfall_lag_2d',
        'rainfall_rolling_sum_3d', 'rainfall_rolling_sum_7d',
        'discharge_lag_1h', 'discharge_lag_3h', 'discharge_rolling_mean_6h',
        'target_tma_next_1h'
    ]

    before = len(df)
    df = df.dropna(subset=feature_cols).reset_index(drop=True)
    print(f"\nBaris setelah drop missing features: {len(df)} (dari {before})")

    # 16. Chronological split (70/15/15)
    n = len(df)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)

    train = df.iloc[:train_end].copy()
    val = df.iloc[train_end:val_end].copy()
    test = df.iloc[val_end:].copy()

    print(f"\n--- Pembagian Data ---")
    print(f"Training:   {len(train)} records ({train['timestamp'].min()} s/d {train['timestamp'].max()})")
    print(f"Validation: {len(val)} records ({val['timestamp'].min()} s/d {val['timestamp'].max()})")
    print(f"Testing:    {len(test)} records ({test['timestamp'].min()} s/d {test['timestamp'].max()})")

    # 17. Save processed data
    DATA_PROCESSED.mkdir(parents=True, exist_ok=True)
    df.to_csv(DATA_PROCESSED / "dataset_complete.csv", index=False)
    train.to_csv(DATA_PROCESSED / "dataset_train.csv", index=False)
    val.to_csv(DATA_PROCESSED / "dataset_val.csv", index=False)
    test.to_csv(DATA_PROCESSED / "dataset_test.csv", index=False)

    # 18. Save metadata
    metadata = {
        "total_records": int(len(df)),
        "train_records": int(len(train)),
        "val_records": int(len(val)),
        "test_records": int(len(test)),
        "train_date_range": [str(train['timestamp'].min()), str(train['timestamp'].max())],
        "val_date_range": [str(val['timestamp'].min()), str(val['timestamp'].max())],
        "test_date_range": [str(test['timestamp'].min()), str(test['timestamp'].max())],
        "features": feature_cols[:-1],
        "target": "target_tma_next_1h",
        "missing_values_before_drop": {
            col: int(before - len(df)) for col in feature_cols
        },
        "tma_range": [float(df['tma'].min()), float(df['tma'].max())],
        "rainfall_range": [float(df['rainfall_mm'].min()), float(df['rainfall_mm'].max())],
        "discharge_range": [float(df['discharge_m3s'].min()), float(df['discharge_m3s'].max())],
    }

    with open(DATA_PROCESSED / "dataset_metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"\nDataset tersimpan di: {DATA_PROCESSED}")
    print(f"Metadata: {DATA_PROCESSED / 'dataset_metadata.json'}")

    return df, train, val, test, metadata


if __name__ == "__main__":
    df, train, val, test, meta = build_dataset()

    print("\n" + "=" * 60)
    print("LIMA BARIS PERTAMA DATASET")
    print("=" * 60)
    print(df[['timestamp', 'tma', 'rainfall_mm', 'discharge_m3s', 'target_tma_next_1h']].head())
