"""
Validate the extracted TMA and rainfall data.
"""

import pandas as pd
from pathlib import Path

DATA_INTERIM = Path(__file__).parent.parent / "data" / "interim"

def validate_tma():
    print("=" * 60)
    print("VALIDASI DATA TMA BATU BEULAH 2024")
    print("=" * 60)

    df = pd.read_csv(DATA_INTERIM / "tma_batu_beulah_2024.csv")
    df['timestamp'] = pd.to_datetime(df['timestamp'])

    print(f"\nJumlah record: {len(df)}")
    print(f"Rentang tanggal: {df['timestamp'].min()} s/d {df['timestamp'].max()}")
    print(f"Rentang TMA: {df['tma'].min():.2f} - {df['tma'].max():.2f} m")
    print(f"Rata-rata TMA: {df['tma'].mean():.2f} m")
    print(f"Standar deviasi TMA: {df['tma'].std():.2f} m")
    print(f"Missing values: {df['tma'].isna().sum()}")

    # Check per month
    df['month'] = df['timestamp'].dt.month
    df['year'] = df['timestamp'].dt.year
    df['hour'] = df['timestamp'].dt.hour

    print(f"\n--- Per Bulan ---")
    for m in sorted(df['month'].unique()):
        mdf = df[df['month'] == m]
        days = mdf['timestamp'].dt.day.nunique()
        hours = mdf['hour'].nunique()
        month_name = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
                      "Jul", "Ags", "Sep", "Okt", "Nov", "Des"][m-1]
        print(f"  {month_name}: {len(mdf)} records, {days} hari, {hours} jam/hari, "
              f"TMA {mdf['tma'].min():.2f}-{mdf['tma'].max():.2f}")

    # Check duplicates
    dups = df.duplicated(subset=['timestamp']).sum()
    print(f"\nDuplikat timestamp: {dups}")

    # Hour distribution
    print(f"\n--- Distribusi Jam ---")
    hour_counts = df['hour'].value_counts().sort_index()
    for h, c in hour_counts.items():
        print(f"  Jam {h:02d}:00: {c} records")

    return df

def validate_rainfall():
    print("\n" + "=" * 60)
    print("VALIDASI DATA CURAH HUJAN RANCA BUNGUR 2024")
    print("=" * 60)

    df = pd.read_csv(DATA_INTERIM / "rainfall_ranca_bungur_2024.csv")
    df['date'] = pd.to_datetime(df['date'])

    print(f"\nJumlah record: {len(df)}")
    print(f"Rentang tanggal: {df['date'].min()} s/d {df['date'].max()}")
    print(f"Rentang curah hujan: {df['rainfall_mm'].min():.1f} - {df['rainfall_mm'].max():.1f} mm")
    print(f"Rata-rata curah hujan: {df['rainfall_mm'].mean():.1f} mm")
    print(f"Total curah hujan: {df['rainfall_mm'].sum():.1f} mm")
    print(f"Hari dengan hujan (>0 mm): {(df['rainfall_mm'] > 0).sum()} hari")
    print(f"Hari tanpa hujan (0 mm): {(df['rainfall_mm'] == 0).sum()} hari")
    print(f"Missing values: {df['rainfall_mm'].isna().sum()}")

    # Check per month
    df['month'] = df['date'].dt.month
    print(f"\n--- Per Bulan ---")
    expected_totals = {
        1: 407.5, 2: 206.0, 3: 388.0, 4: 340.0, 5: 424.5, 6: 244.0,
        7: 248.5, 8: 67.0, 9: 275.0, 10: 377.5, 11: 522.0, 12: 117.0
    }
    for m in sorted(df['month'].unique()):
        mdf = df[df['month'] == m]
        total = mdf['rainfall_mm'].sum()
        expected = expected_totals.get(m, 0)
        match = "✓" if abs(total - expected) < 1 else "✗"
        month_name = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
                      "Jul", "Ags", "Sep", "Okt", "Nov", "Des"][m-1]
        print(f"  {month_name}: total={total:.1f} mm (expected={expected:.1f}) {match}")

    return df

if __name__ == "__main__":
    tma = validate_tma()
    rain = validate_rainfall()
