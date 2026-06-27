import { clsx, type ClassValue } from "clsx";

export function calculateDischarge(tma: number): number {
  return 20.268 * Math.pow(tma + 0.15, 2.157);
}

export function determineWarningStatus(
  predictedTma: number,
  thresholds: { safeMax: number; alertMax: number; dangerMin: number }
): "Aman" | "Siaga" | "Bahaya" {
  if (predictedTma >= thresholds.dangerMin) return "Bahaya";
  if (predictedTma > thresholds.safeMax) return "Siaga";
  return "Aman";
}

const indonesianMonths = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function formatDateIndonesian(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = d.getDate();
  const month = indonesianMonths[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes} WIB`;
}

export function formatNumberIndonesian(value: number, decimals = 2): string {
  return value.toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
