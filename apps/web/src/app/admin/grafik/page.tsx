"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  Droplets,
  CloudRain,
  Gauge,
  Download,
  Loader2,
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
import { formatNumberIndonesian, formatDateIndonesian } from "@/lib/utils";

interface ChartDataPoint {
  timestamp: string;
  tma: number;
  rainfall: number;
}

interface PredictionPoint {
  timestamp: string;
  predictedTma: number;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1">{formatDateIndonesian(label)}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatNumberIndonesian(entry.value, 2)}{" "}
          {entry.name === "Curah Hujan" || entry.name === "Rainfall"
            ? "mm"
            : "m"}
        </p>
      ))}
    </div>
  );
}

const periods = [
  { label: "7 Hari", days: 7 },
  { label: "14 Hari", days: 14 },
  { label: "30 Hari", days: 30 },
];

export default function AdminGrafikPage() {
  const [rawData, setRawData] = useState<{
    chartData: ChartDataPoint[];
    predictionChartData: PredictionPoint[];
  } | null>(null);
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
      setRawData({
        chartData: json.chartData || [],
        predictionChartData: json.predictionChartData || [],
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filterByDays = <T extends { timestamp: string }>(
    arr: T[],
    days: number
  ) => {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return arr.filter((d) => new Date(d.timestamp) >= cutoff);
  };

  const filteredTma = rawData
    ? filterByDays(rawData.chartData, period)
    : [];
  const filteredPred = rawData
    ? filterByDays(rawData.predictionChartData, period)
    : [];

  const tmaChartData = filteredTma.map((d) => ({
    waktu: new Date(d.timestamp).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    }),
    tma: d.tma,
    rainfall: d.rainfall,
  }));

  const predMap = new Map(
    filteredPred.map((p) => [
      new Date(p.timestamp).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      }),
      p.predictedTma,
    ])
  );
  const combinedTmaData = tmaChartData.map((d) => ({
    ...d,
    prediksi: predMap.get(d.waktu) || null,
  }));

  const rainfallChartData = filteredTma.map((d) => ({
    waktu: new Date(d.timestamp).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    }),
    curahHujan: d.rainfall,
  }));

  const dischargeChartData = filteredTma.map((d) => ({
    waktu: new Date(d.timestamp).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    }),
    debit: d.tma * 5.67,
  }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grafik</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visualisasi data hidrologi dan prediksi
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {}}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PNG
          </button>
          <button
            onClick={() => {}}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {periods.map((p) => (
          <button
            key={p.days}
            onClick={() => setPeriod(p.days)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p.days
                ? "bg-blue-900 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-6 shadow-sm animate-pulse"
            >
              <div className="h-5 bg-gray-200 rounded w-48 mb-4" />
              <div className="h-64 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-8 text-center">
          <p className="text-lg font-medium">Gagal memuat data grafik</p>
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

      {!loading && !error && rawData && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              TMA Aktual vs Prediksi
            </h3>
            {combinedTmaData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={combinedTmaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="waktu"
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 11 }} />
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
              <div className="h-[350px] flex items-center justify-center text-gray-400">
                Belum ada data untuk periode ini
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <CloudRain className="w-4 h-4" />
                Curah Hujan
              </h3>
              {rainfallChartData.some((d) => d.curahHujan > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={rainfallChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="waktu" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="curahHujan"
                      fill="#3b82f6"
                      name="Curah Hujan"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  Belum ada data curah hujan
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Debit Air (m³/s)
              </h3>
              {dischargeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dischargeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="waktu" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="debit"
                      stroke="#0891b2"
                      strokeWidth={2}
                      dot={false}
                      name="Debit"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  Belum ada data debit
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Debit terhitung otomatis berdasarkan rating curve
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && !rawData && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center text-gray-500">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-xl font-medium">Belum ada data</p>
          <p className="text-sm mt-2">
            Data grafik belum tersedia. Tambahkan data hidrologi terlebih
            dahulu.
          </p>
        </div>
      )}
    </div>
  );
}
