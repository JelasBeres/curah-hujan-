"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Droplets,
  Gauge,
  CloudRain,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw,
  Brain,
  Info,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  formatNumberIndonesian,
  formatDateIndonesian,
} from "@/lib/utils";

interface DashboardData {
  latestTma: number;
  latestRainfall: number;
  latestDischarge: number;
  latestDataTimestamp: string | null;
  currentStatus: string;
  prediction: {
    id: string;
    predictedTma: number;
    predictedDischarge: number;
    predictedStatus: string;
    predictionTimestamp: string;
    createdAt: string;
  } | null;
  publishedWarning: {
    id: string;
    title: string;
    content: string;
    status: string;
  } | null;
  chartData: { timestamp: string; tma: number; rainfall: number }[];
  predictionChartData: { timestamp: string; predictedTma: number }[];
  thresholds: { safeMax: number; alertMax: number; dangerMin: number };
}

const periods = [
  { label: "7 Hari", days: 7 },
  { label: "14 Hari", days: 14 },
  { label: "30 Hari", days: 30 },
];

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

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1">{formatDateIndonesian(label)}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatNumberIndonesian(entry.value, 2)}{" "}
          {entry.name === "Curah Hujan" ? "mm" : "m"}
        </p>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(7);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Gagal memuat data");
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filterByDays = <T extends { timestamp: string }>(arr: T[], days: number): T[] => {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return arr.filter((d) => new Date(d.timestamp) >= cutoff);
  };

  const filteredChartData = data ? filterByDays(data.chartData, period) : [];
  const chartData = filteredChartData.map((d) => ({
    waktu: new Date(d.timestamp).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    }),
    tma: d.tma,
    rainfall: d.rainfall,
  }));

  const filteredPredData = data
    ? filterByDays(data.predictionChartData, period)
    : [];
  const predictionMap = new Map(
    filteredPredData.map((p) => [
      new Date(p.timestamp).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      }),
      p.predictedTma,
    ])
  );
  const combinedData = chartData.map((d) => ({
    ...d,
    prediksi: predictionMap.get(d.waktu) || null,
  }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ringkasan data hidrologi dan prediksi
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Muat Ulang
        </button>
      </div>

      {loading && !data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-16 mb-3" />
                <div className="h-7 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-2 bg-gray-200 rounded w-20" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-48 mb-4" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-8 text-center">
          <p className="text-lg font-medium">Gagal memuat data dashboard</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Loader2 className="w-4 h-4" />
            Muat Ulang
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Gauge className="w-4 h-4" />
                <span className="text-sm">TMA Terakhir</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumberIndonesian(data.latestTma, 2)} m
              </p>
              {data.latestDataTimestamp && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDateIndonesian(data.latestDataTimestamp)}
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <CloudRain className="w-4 h-4" />
                <span className="text-sm">Curah Hujan</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumberIndonesian(data.latestRainfall, 1)} mm
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Droplets className="w-4 h-4" />
                <span className="text-sm">Debit Air</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumberIndonesian(data.latestDischarge, 2)} m³/s
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Debit terhitung otomatis berdasarkan rating curve
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">Status</span>
              </div>
              <StatusBadge status={data.currentStatus} />
              {data.prediction && (
                <p className="text-xs text-gray-400 mt-2">
                  Prediksi: <StatusBadge status={data.prediction.predictedStatus} />
                </p>
              )}
            </div>
          </div>

          {data.prediction && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-blue-800 text-sm font-medium mb-2">
                <Brain className="w-4 h-4" />
                Prediksi Terakhir
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-600">TMA Diprediksi:</span>
                  <span className="font-semibold ml-1">
                    {formatNumberIndonesian(data.prediction.predictedTma, 2)} m
                  </span>
                </div>
                <div>
                  <span className="text-blue-600">Debit Diprediksi:</span>
                  <span className="font-semibold ml-1">
                    {formatNumberIndonesian(data.prediction.predictedDischarge, 2)} m³/s
                  </span>
                </div>
                <div>
                  <span className="text-blue-600">Status:</span>
                  <span className="font-semibold ml-1">
                    {data.prediction.predictedStatus}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600">Waktu:</span>
                  <span className="font-semibold ml-1">
                    {formatDateIndonesian(data.prediction.predictionTimestamp)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-4">
            {periods.map((p) => (
              <button
                key={p.days}
                onClick={() => setPeriod(p.days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  period === p.days
                    ? "bg-blue-900 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Tinggi Muka Air (TMA)
              </h3>
              {combinedData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={combinedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="waktu" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="tma"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                      name="TMA Aktual"
                    />
                    <Line
                      type="monotone"
                      dataKey="prediksi"
                      stroke="#dc2626"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Prediksi"
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
                  Belum ada data untuk periode ini
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <CloudRain className="w-4 h-4" />
                Curah Hujan
              </h3>
              {chartData.some((d) => d.rainfall > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="waktu" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="rainfall"
                      fill="#3b82f6"
                      name="Curah Hujan"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
                  Belum ada data curah hujan
                </div>
              )}
            </div>
          </div>

          {data.publishedWarning && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-yellow-800 text-sm">
                    {data.publishedWarning.title}
                  </p>
                  <p className="text-yellow-700 text-xs mt-1">
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
            Data dashboard belum tersedia. Tambahkan data hidrologi terlebih
            dahulu.
          </p>
        </div>
      )}
    </div>
  );
}
