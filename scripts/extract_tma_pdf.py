"""
Extract TMA (Tinggi Muka Air) data from Batu Beulah 2024 PDF.
Robust: matches TMA values to nearest hour label vertically.
"""

import pdfplumber
import pandas as pd
import re
from pathlib import Path
import sys

DATA_RAW = Path(__file__).parent.parent / "data" / "raw"
DATA_INTERIM = Path(__file__).parent.parent / "data" / "interim"

MONTH_INDONESIAN = {
    "Januari": 1, "Februari": 2, "Maret": 3, "April": 4,
    "Mei": 5, "Juni": 6, "Juli": 7, "Agustus": 8,
    "September": 9, "Oktober": 10, "November": 11, "Desember": 12
}
MONTH_DAYS = {1: 31, 2: 29, 3: 31, 4: 30, 5: 31, 6: 30,
              7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31}
HOUR_SET = {f"{h}.00" for h in range(0, 24)}


def parse_decimal(v):
    v = v.strip().replace(',', '.')
    try:
        return float(v)
    except ValueError:
        return None


def extract_month_page(page):
    text = page.extract_text() or ""
    m = re.search(r'BLN/THN\s*:\s*(\w+)\s+(\d{4})', text)
    if m:
        mn = m.group(1)
        y = int(m.group(2))
        num = MONTH_INDONESIAN.get(mn)
        if num:
            return num, y, mn
    return None, None, None


def process_page(page, month, year, month_name):
    words = page.extract_words()
    if not words:
        return []

    expected_days = MONTH_DAYS.get(month, 31)

    # Group by y for header detection
    rows_by_y = {}
    for w in words:
        yk = round(w['top'])
        rows_by_y.setdefault(yk, []).append(w)

    best_days = {}
    header_y = None
    for yk in sorted(rows_by_y):
        rw = sorted(rows_by_y[yk], key=lambda x: x['x0'])
        days = {}
        for w in rw:
            t = w['text'].strip()
            if t.isdigit() and 1 <= int(t) <= 31:
                days[int(t)] = (w['x0'] + w['x1']) / 2
        if len(days) > len(best_days):
            best_days = days
            header_y = yk

    if not best_days:
        return []
    best_days = {d: x for d, x in best_days.items() if d <= expected_days}
    if not best_days:
        return []

    first_day_x = min(best_days.values())

    hour_x = first_day_x - 25
    for w in words:
        if w['text'] == 'JAM' and abs(w['top'] - header_y) < 10:
            hour_x = (w['x0'] + w['x1']) / 2
            break

    # Find all hour labels
    hour_labels = []
    for w in words:
        t = w['text'].strip()
        if t in HOUR_SET and w['top'] > header_y + 2 and w['top'] < header_y + 140:
            cx = (w['x0'] + w['x1']) / 2
            if abs(cx - hour_x) < 20 or cx < first_day_x + 5:
                h = 0 if t == "24.00" else int(float(t))
                hour_labels.append((h, w['top']))

    if not hour_labels:
        return []

    hour_labels.sort(key=lambda x: x[1])

    # For each hour, find values in vertical band
    records = []
    for idx, (hour, y_pos) in enumerate(hour_labels):
        # y band: start from halfway between prev hour and this hour
        if idx == 0:
            y_min = y_pos - 3
        else:
            y_min = (hour_labels[idx-1][1] + y_pos) / 2

        if idx == len(hour_labels) - 1:
            y_max = y_pos + 8
        else:
            y_max = (y_pos + hour_labels[idx+1][1]) / 2

        # Find words in band
        band_words = [w for w in words if y_min <= w['top'] < y_max]

        for day, cx in sorted(best_days.items()):
            best_val = None
            best_dist = 14
            for w in band_words:
                t = w['text'].strip()
                if t in HOUR_SET or (t.isdigit() and 1 <= int(t) <= 31):
                    continue  # Skip day numbers and hour labels
                vc = (w['x0'] + w['x1']) / 2
                d = abs(vc - cx)
                if d < best_dist:
                    val = parse_decimal(t)
                    if val is not None:
                        best_dist = d
                        best_val = val
            if best_val is not None:
                ts = f"{year}-{month:02d}-{day:02d} {hour:02d}:00:00"
                records.append({"timestamp": ts, "tma": best_val})

    return records


def process_tma_pdf(pdf_path, output_path):
    all_records = []
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Total pages: {len(pdf.pages)}")
        for pi, page in enumerate(pdf.pages):
            month, year, mn = extract_month_page(page)
            if month is None:
                continue
            print(f"Page {pi+1}: {mn} {year}")
            recs = process_page(page, month, year, mn)
            if recs:
                all_records.extend(recs)
                print(f"  -> {len(recs)} records")
            else:
                print(f"  -> 0 records!")

    if not all_records:
        print("ERROR: No records extracted!")
        return None

    df = pd.DataFrame(all_records)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    before = len(df)
    df = df.drop_duplicates(subset=['timestamp']).reset_index(drop=True)
    df = df.sort_values('timestamp').reset_index(drop=True)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)

    print(f"\nSaved {len(df)} records to {output_path}")
    print(f"Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")
    print(f"TMA range: {df['tma'].min():.2f} to {df['tma'].max():.2f}")
    print(f"Duplicates: {before - len(df)}")

    exp = sum(MONTH_DAYS[m] for m in range(1, 13)) * 24
    print(f"Expected ~{exp}, got {len(df)} ({len(df)/exp*100:.1f}%)")
    return df


if __name__ == "__main__":
    p = DATA_RAW / "Batubeulah_2024.pdf"
    o = DATA_INTERIM / "tma_batu_beulah_2024.csv"
    if not p.exists():
        print(f"Not found: {p}")
        sys.exit(1)
    process_tma_pdf(p, o)
