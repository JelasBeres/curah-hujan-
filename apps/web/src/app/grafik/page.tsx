"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Droplets,
  CloudRain,
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
import { formatDateIndonesian, formatNumberIndonesian } from "@/lib/utils";

interface ChartDataPoint {
  timestamp: string;
  tma: number;
  rainfall: number;
}

interface PredictionPoint {
  timestamp: string;
  predictedTma: number;
}

interface ChartData {
  chartData: ChartDataPoint[];
  predictionChartData: PredictionPoint[];
}

const periods = [
  { label: "7 Hari", days: 7 },
  { label: "14 Hari", days: 14 },
  { label: "30 Hari", days: 30 },
];

function CustomTooltip({ active, payload, label }: any) {
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

export default function GrafikPage() {
  const [rawData, setRawData] = useState<ChartData | null>(null);
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
      setRawData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filterByDays = <T extends { timestamp: string }>(data: T[], days: number): T[] => {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return data.filter((d) => new Date(d.timestamp) >= cutoff);
  };

  const filteredTmaData = rawData ? filterByDays(rawData.chartData, period) : [];
  const filteredRainfallData = filteredTmaData;
  const filteredPredictionData = rawData
    ? filterByDays(rawData.predictionChartData, period)
    : [];

  const tmaChartData = filteredTmaData.map((d) => ({
    ...d,
    waktu: new Date(d.timestamp).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    }),
  }));

  const predictionMap = new Map(
    filteredPredictionData.map((p) => [
      new Date(p.timestamp).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      }),
      p.predictedTma,
    ])
  );

  const combinedChartData = tmaChartData.map((d) => ({
    ...d,
    prediksi: predictionMap.get(d.waktu) || null,
  }));

  const rainfallChartData = filteredRainfallData.map((d) => ({
    waktu: new Date(d.timestamp).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    }),
    curahHujan: d.rainfall,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-200 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
          <h1 className="text-2xl font-bold mt-2 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Grafik Hidrologi
          </h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
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
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
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
          <>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Droplets className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Tinggi Muka Air (TMA)</h2>
              </div>
              {combinedChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={combinedChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="waktu"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      label={{
                        value: "TMA (m)",
                        angle: -90,
                        position: "insideLeft",
                        style: { fontSize: 12 },
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
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
                <div className="h-64 flex items-center justify-center text-gray-400">
                  <p>Belum ada data TMA untuk periode ini</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <CloudRain className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Curah Hujan</h2>
              </div>
              {rainfallChartData.some((d) => d.curahHujan > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={rainfallChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="waktu"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      label={{
                        value: "Curah Hujan (mm)",
                        angle: -90,
                        position: "insideLeft",
                        style: { fontSize: 12 },
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="curahHujan"
                      fill="#3b82f6"
                      name="Curah Hujan"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  <p>Belum ada data curah hujan untuk periode ini</p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-sm text-gray-600">
              <p className="font-medium text-blue-800 mb-2">Keterangan:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>TMA (Tinggi Muka Air) diukur dalam satuan meter (m)</li>
                <li>Curah hujan diukur dalam satuan milimeter (mm)</li>
                <li>
                  Data prediksi merupakan hasil perhitungan model Random Forest
                  berdasarkan data historis
                </li>
                <li>
                  Debit terhitung otomatis berdasarkan rating curve: Q = 20.268
                  &times; (H + 0.15)^2.157
                </li>
                <li>
                  Sumber data: Pos Duga Air Batu Beulah dan ARR Ranca Bungur
                </li>
              </ul>
            </div>
          </>
        )}

        {!loading && !error && !rawData && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center text-gray-500">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-xl font-medium">Belum ada data</p>
            <p className="text-sm mt-2">
              Data grafik belum tersedia. Silakan periksa kembali nanti.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
