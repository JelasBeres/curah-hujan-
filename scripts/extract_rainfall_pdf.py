"""
Extract rainfall data from Ranca Bungur 2024 PDF.
Output: CSV with columns date, rainfall_mm
"""

import pdfplumber
import pandas as pd
import re
from pathlib import Path
import sys

DATA_RAW = Path(__file__).parent.parent / "data" / "raw"
DATA_INTERIM = Path(__file__).parent.parent / "data" / "interim"

MONTH_NAMES = {
    "Jan": 1, "Januari": 1,
    "Feb": 2, "Februari": 2,
    "Mar": 3, "Maret": 3,
    "Apr": 4, "April": 4,
    "Mei": 5,
    "Jun": 6, "Juni": 6,
    "Jul": 7, "Juli": 7,
    "Ags": 8, "Agst": 8, "Agust": 8, "Agustus": 8,
    "Sep": 9, "Sept": 9, "September": 9,
    "Okt": 10, "Oktober": 10,
    "Nov": 11, "Nop": 11, "November": 11,
    "Des": 12, "Desember": 12,
}


def parse_decimal(value_str: str) -> float:
    value_str = value_str.strip().replace(',', '.')
    try:
        v = float(value_str)
        return v if v >= 0 else None
    except ValueError:
        return None


def extract_rainfall_data(words):
    records = []

    # Group words by y position
    rows_by_y = {}
    for w in words:
        y_key = round(w['top'], 0)
        if y_key not in rows_by_y:
            rows_by_y[y_key] = []
        rows_by_y[y_key].append(w)

    # Find month header row
    month_positions = {}
    header_y = None

    for y_key in sorted(rows_by_y.keys()):
        row = sorted(rows_by_y[y_key], key=lambda x: x['x0'])
        row_text = " ".join(w['text'] for w in row)

        # Check if this row has month names
        found_months = 0
        for w in row:
            text = w['text'].strip()
            for m_name, m_num in MONTH_NAMES.items():
                if text.upper() == m_name.upper() or text.upper().startswith(m_name.upper()):
                    if m_num not in month_positions:
                        month_positions[m_num] = (w['x0'] + w['x1']) / 2
                        found_months += 1
                    break

        if found_months >= 3:
            header_y = y_key
            break

    if not month_positions:
        print("Could not find month header row. Full word list analysis:")
        for y_key in sorted(rows_by_y.keys()):
            row = sorted(rows_by_y[y_key], key=lambda x: x['x0'])
            texts = [f"{w['text']}({w['x0']:.0f})" for w in row[:15]]
            print(f"  y={y_key}: {', '.join(texts)}")
        return records

    print(f"Month columns found: {dict(sorted(month_positions.items()))}")

    # Find data rows: day number followed by values
    # Skip header row, summary rows
    summary_keywords = ["Per Tahun", "Total Hujan", "Maksimum", "Minimum",
                        "Jml. Hari", "HIDROGRAF", "RANCA BUNGUR", "Tahun",
                        "Tanggal", "Keterangan", "2024"]

    for y_key in sorted(rows_by_y.keys()):
        if header_y and y_key <= header_y + 2:
            continue

        row = sorted(rows_by_y[y_key], key=lambda x: x['x0'])
        if not row:
            continue

        row_texts = [w['text'] for w in row]
        full_text = " ".join(row_texts)

        if any(kw in full_text for kw in summary_keywords):
            continue

        first_text = row[0]['text'].strip()

        if not first_text.isdigit():
            continue

        day = int(first_text)
        if day < 1 or day > 31:
            continue

        for w in row[1:]:
            text = w['text'].strip()
            val_center = (w['x0'] + w['x1']) / 2

            for month_num, month_center in month_positions.items():
                if abs(val_center - month_center) < 15:
                    if text == "-" or text == "":
                        rainfall = 0.0
                    else:
                        rainfall = parse_decimal(text)
                        if rainfall is None:
                            rainfall = 0.0

                    date_str = f"2024-{month_num:02d}-{day:02d}"
                    records.append({"date": date_str, "rainfall_mm": rainfall})
                    break

    return records


def process_rainfall_pdf(pdf_path, output_path):
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Total pages: {len(pdf.pages)}")
        all_records = []

        for page_idx, page in enumerate(pdf.pages):
            words = page.extract_words()
            records = extract_rainfall_data(words)
            if records:
                all_records.extend(records)
                print(f"Extracted {len(records)} records from page {page_idx+1}")
            else:
                text = page.extract_text() or ""
                print(f"No records from page {page_idx+1}")

    if not all_records:
        print("ERROR: No rainfall data extracted!")
        return None

    df = pd.DataFrame(all_records)
    df['date'] = pd.to_datetime(df['date'])
    df = df.drop_duplicates(subset=['date'])
    df = df.sort_values('date').reset_index(drop=True)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)

    print(f"\nSaved {len(df)} records to {output_path}")
    print(f"Date range: {df['date'].min()} to {df['date'].max()}")
    print(f"Rainfall range: {df['rainfall_mm'].min():.1f} to {df['rainfall_mm'].max():.1f}")
    print(f"Non-zero rainfall days: {(df['rainfall_mm'] > 0).sum()}")
    print(f"Zero/No-data days: {(df['rainfall_mm'] == 0).sum()}")

    # Check monthly totals
    df['month'] = df['date'].dt.month
    monthly = df.groupby('month')['rainfall_mm'].sum()
    print("\nMonthly totals:")
    for m, total in monthly.items():
        print(f"  Month {m}: {total:.1f} mm")

    return df


if __name__ == "__main__":
    pdf_path = DATA_RAW / "ARR-RancaBungur_2024.pdf"
    output_path = DATA_INTERIM / "rainfall_ranca_bungur_2024.csv"

    if not pdf_path.exists():
        print(f"PDF not found: {pdf_path}")
        sys.exit(1)

    df = process_rainfall_pdf(pdf_path, output_path)
