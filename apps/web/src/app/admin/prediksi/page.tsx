"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Brain,
  Play,
  History,
  Loader2,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Gauge,
  Droplets,
  Clock,
  Database,
} from "lucide-react";
import {
  formatNumberIndonesian,
  formatDateIndonesian,
} from "@/lib/utils";

interface Prediction {
  id: string;
  inputTimestamp: string;
  predictionTimestamp: string;
  predictedTma: number;
  calculatedDischargeM3s: number;
  warningStatus: string;
  modelVersionId: string;
  createdAt: string;
}

interface PaginatedPredictions {
  data: Prediction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Aman: "bg-safe/10 text-safe border-safe/20",
    Siaga: "bg-alert/10 text-alert border-alert/20",
    Bahaya: "bg-danger/10 text-danger border-danger/20",
  };
  const icons: Record<string, React.ReactNode> = {
    Aman: <CheckCircle className="w-4 h-4" />,
    Siaga: <AlertCircle className="w-4 h-4" />,
    Bahaya: <AlertTriangle className="w-4 h-4" />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        styles[status] || ""
      }`}
    >
      {icons[status]}
      {status}
    </span>
  );
}

export default function PrediksiPage() {
  const [latestData, setLatestData] = useState<{
    latestTma: number;
    latestRainfall: number;
    latestDischarge: number;
    latestDataTimestamp: string | null;
    currentStatus: string;
  } | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setLatestData({
          latestTma: json.latestTma,
          latestRainfall: json.latestRainfall,
          latestDischarge: json.latestDischarge,
          latestDataTimestamp: json.latestDataTimestamp,
          currentStatus: json.currentStatus,
        });
      }
    } catch {
      // Silent fail - non-critical
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/predictions?page=${historyPage}&limit=10`
      );
      if (res.ok) {
        const json: PaginatedPredictions = await res.json();
        setPredictions(json.data);
        setTotalPages(json.totalPages);
      }
    } catch {
      // Silent fail
    }
  }, [historyPage]);

  useEffect(() => {
    Promise.all([fetchDashboard(), fetchHistory()]).finally(() =>
      setLoading(false)
    );
  }, [fetchDashboard, fetchHistory]);

  const runPrediction = async () => {
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/predictions", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menjalankan prediksi");
      }
      const data = await res.json();
      setResult(data);
      fetchHistory();
      fetchDashboard();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prediksi</h1>
        <p className="text-sm text-gray-500 mt-1">
          Jalankan prediksi tinggi muka air menggunakan model machine learning
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Data Terkini
          </h2>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded" />
              ))}
            </div>
          ) : latestData ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">TMA</span>
                <span className="font-semibold">
                  {formatNumberIndonesian(latestData.latestTma, 2)} m
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Curah Hujan</span>
                <span className="font-semibold">
                  {formatNumberIndonesian(latestData.latestRainfall, 1)} mm
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Debit Air</span>
                <span className="font-semibold">
                  {formatNumberIndonesian(latestData.latestDischarge, 2)} m³/s
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Status</span>
                <StatusBadge status={latestData.currentStatus} />
              </div>
              {latestData.latestDataTimestamp && (
                <p className="text-xs text-gray-400 flex items-center gap-1 pt-2">
                  <Clock className="w-3 h-3" />
                  Data terakhir:{" "}
                  {formatDateIndonesian(latestData.latestDataTimestamp)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">
              Data tidak tersedia
            </p>
          )}

          <button
            onClick={runPrediction}
            disabled={running || !latestData}
            className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Jalankan Prediksi
              </>
            )}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Hasil Prediksi
          </h2>

          {running && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-900 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Menghubungi layanan ML...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
              {error}
            </div>
          )}

          {result && !running && (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">TMA Diprediksi</span>
                <span className="font-semibold">
                  {formatNumberIndonesian(result.predictedTma, 2)} m
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Debit Diprediksi</span>
                <span className="font-semibold">
                  {formatNumberIndonesian(result.calculatedDischargeM3s, 2)}{" "}
                  m³/s
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Status</span>
                <StatusBadge status={result.warningStatus} />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Waktu Prediksi</span>
                <span className="text-sm font-medium">
                  {formatDateIndonesian(result.predictionTimestamp)}
                </span>
              </div>
              <p className="text-xs text-gray-400 pt-2">
                Model: {result.modelVersionId || "Tidak diketahui"}
              </p>
            </div>
          )}

          {!result && !running && !error && (
            <div className="text-center py-8 text-gray-400">
              <Brain className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Belum ada hasil prediksi</p>
              <p className="text-xs mt-1">
                Jalankan prediksi untuk melihat hasil
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <History className="w-4 h-4" />
          Riwayat Prediksi
        </h2>

        {predictions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Waktu Input
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Waktu Prediksi
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    TMA Diprediksi
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Debit
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Status
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Dibuat
                  </th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((pred) => (
                  <tr
                    key={pred.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-2 text-xs">
                      {formatDateIndonesian(pred.inputTimestamp)}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {formatDateIndonesian(pred.predictionTimestamp)}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {formatNumberIndonesian(pred.predictedTma, 2)} m
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {formatNumberIndonesian(pred.calculatedDischargeM3s, 2)}{" "}
                      m³/s
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={pred.warningStatus} />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {formatDateIndonesian(pred.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <History className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Belum ada riwayat prediksi</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
              disabled={historyPage === 1}
              className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30"
            >
              Sebelumnya
            </button>
            <span className="px-3 py-1 text-xs text-gray-500">
              {historyPage} / {totalPages}
            </span>
            <button
              onClick={() =>
                setHistoryPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={historyPage === totalPages}
              className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30"
            >
              Selanjutnya
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
