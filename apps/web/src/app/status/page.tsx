"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Droplets,
  Gauge,
  CloudRain,
  Clock,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import {
  formatNumberIndonesian,
  formatDateIndonesian,
} from "@/lib/utils";

interface StatusData {
  latestTma: number;
  latestRainfall: number;
  latestDischarge: number;
  currentStatus: string;
  latestDataTimestamp: string | null;
  prediction: {
    predictedTma: number;
    predictedDischarge: number;
    predictedStatus: string;
    predictionTimestamp: string;
  } | null;
  publishedWarning: {
    title: string;
    content: string;
    status: string;
  } | null;
}

function StatusIcon({ status, size = "lg" }: { status: string; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "w-16 h-16" : "w-5 h-5";
  switch (status) {
    case "Bahaya":
      return <AlertTriangle className={`${cls} text-danger`} />;
    case "Siaga":
      return <AlertCircle className={`${cls} text-alert`} />;
    default:
      return <CheckCircle className={`${cls} text-safe`} />;
  }
}

const statusBg: Record<string, string> = {
  Aman: "bg-safe",
  Siaga: "bg-alert",
  Bahaya: "bg-danger",
};

const statusColors: Record<string, string> = {
  Aman: "bg-safe/10 border-safe text-safe",
  Siaga: "bg-alert/10 border-alert text-alert",
  Bahaya: "bg-danger/10 border-danger text-danger",
};

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error("Gagal memuat data");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-200 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
          <h1 className="text-2xl font-bold mt-2 flex items-center gap-2">
            <Gauge className="w-6 h-6" />
            Status Terkini
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-8 shadow-sm animate-pulse">
              <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-2" />
              <div className="h-4 bg-gray-200 rounded w-64 mx-auto" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-16 mb-3" />
                  <div className="h-6 bg-gray-200 rounded w-20" />
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-8 text-center">
            <p className="text-lg font-medium">Gagal memuat data</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div
              className={`rounded-2xl p-8 md:p-12 border-2 text-center mb-8 ${
                statusColors[data.currentStatus]
              }`}
            >
              <div className="flex justify-center mb-4">
                <StatusIcon status={data.currentStatus} />
              </div>
              <p className="text-3xl md:text-4xl font-bold mb-2">
                {data.currentStatus}
              </p>
              <p className="text-lg opacity-80">
                {data.currentStatus === "Aman"
                  ? "Kondisi air dalam batas normal"
                  : data.currentStatus === "Siaga"
                  ? "Waspada potensi peningkatan tinggi muka air"
                  : "Bahaya! Tinggi muka air melampaui batas"}
              </p>
              {data.latestDataTimestamp && (
                <p className="text-sm opacity-60 flex items-center justify-center gap-1 mt-4">
                  <Clock className="w-4 h-4" />
                  Terakhir diperbarui: {formatDateIndonesian(data.latestDataTimestamp)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">TMA</p>
                <p className="text-2xl font-bold">{formatNumberIndonesian(data.latestTma * 100, 1)} cm</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Curah Hujan</p>
                <p className="text-2xl font-bold">{formatNumberIndonesian(data.latestRainfall, 1)} mm</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Debit Air</p>
                <p className="text-2xl font-bold">{formatNumberIndonesian(data.latestDischarge, 2)} m³/s</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Prediksi TMA</p>
                <p className="text-2xl font-bold">
                  {data.prediction
                    ? `${formatNumberIndonesian(data.prediction.predictedTma * 100, 1)} cm`
                    : "—"}
                </p>
              </div>
            </div>

            {data.prediction && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <Droplets className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold">Prediksi 1 Jam ke Depan</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">TMA Diprediksi</p>
                    <p className="text-xl font-bold">
                      {formatNumberIndonesian(data.prediction.predictedTma * 100, 1)} cm
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Debit Diprediksi</p>
                    <p className="text-xl font-bold">
                      {formatNumberIndonesian(data.prediction.predictedDischarge, 2)} m³/s
                    </p>
                    <p className="text-xs text-gray-400">Debit terhitung otomatis berdasarkan rating curve</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <div className="flex items-center gap-1 mt-1">
                      <StatusIcon status={data.prediction.predictedStatus} size="sm" />
                      <span className="text-xl font-bold">{data.prediction.predictedStatus}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Waktu Prediksi</p>
                    <p className="text-sm font-medium mt-1">
                      {formatDateIndonesian(data.prediction.predictionTimestamp)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {data.publishedWarning && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-yellow-800">
                      {data.publishedWarning.title}
                    </p>
                    <p className="text-yellow-700 text-sm mt-1">
                      {data.publishedWarning.content}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !error && !data && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center text-gray-500">
            <Droplets className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-xl font-medium">Belum ada data</p>
            <p className="text-sm mt-2">
              Data hidrologi belum tersedia. Silakan periksa kembali nanti.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
