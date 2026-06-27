"use client";

import { useEffect, useState } from "react";
import {
  Cpu,
  Calendar,
  Layers,
  Loader2,
  RefreshCw,
  TrendingUp,
  Activity,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatNumberIndonesian, formatDateIndonesian } from "@/lib/utils";

interface ModelMetrics {
  id: string;
  version: string;
  algorithm: string;
  featureList: string[];
  parameters: Record<string, unknown>;
  mae: number | null;
  rmse: number | null;
  r2: number | null;
  trainingStartDate: string | null;
  trainingEndDate: string | null;
  isActive: boolean;
  createdAt: string;
  featureImportance: { feature: string; importance: number }[] | null;
}

export default function ModelPage() {
  const [data, setData] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetch("/api/model/metrics")
      .then((r) => {
        if (!r.ok) throw new Error("Gagal memuat data model");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Model</h1>
          <p className="text-sm text-gray-500 mt-1">
            Informasi dan metrik model machine learning
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

      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 shadow-sm animate-pulse"
              >
                <div className="h-3 bg-gray-200 rounded w-16 mb-3" />
                <div className="h-7 bg-gray-200 rounded w-20" />
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
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Cpu className="w-4 h-4" />
                <span className="text-sm">Model Aktif</span>
              </div>
              <p className="text-2xl font-bold">v{data.version}</p>
              <p className="text-xs text-gray-400 mt-1 capitalize">
                {data.algorithm}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Periode Training</span>
              </div>
              <p className="text-lg font-bold">
                {data.trainingStartDate
                  ? formatDateIndonesian(data.trainingStartDate).split(" ").slice(0, 3).join(" ")
                  : "—"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                s/d{" "}
                {data.trainingEndDate
                  ? formatDateIndonesian(data.trainingEndDate).split(" ").slice(0, 3).join(" ")
                  : "—"}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Layers className="w-4 h-4" />
                <span className="text-sm">Fitur</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {data.featureList.map((f) => (
                  <span
                    key={f}
                    className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Target className="w-4 h-4" />
                <span className="text-sm">MAE</span>
              </div>
              <p className="text-2xl font-bold">
                {data.mae != null
                  ? formatNumberIndonesian(data.mae, 4)
                  : "—"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Mean Absolute Error
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-sm">RMSE</span>
              </div>
              <p className="text-2xl font-bold">
                {data.rmse != null
                  ? formatNumberIndonesian(data.rmse, 4)
                  : "—"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Root Mean Square Error
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">R²</span>
              </div>
              <p className="text-2xl font-bold">
                {data.r2 != null ? formatNumberIndonesian(data.r2, 4) : "—"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Koefisien Determinasi
              </p>
            </div>
          </div>

          {data.featureImportance && data.featureImportance.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                Feature Importance
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data.featureImportance
                    .sort((a, b) => b.importance - a.importance)
                    .slice(0, 10)}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="feature" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="importance" fill="#2563eb" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-6">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">
              Detail Parameter Model
            </h3>
            <pre className="text-xs text-blue-700 bg-white/50 rounded-lg p-3 overflow-x-auto">
              {JSON.stringify(data.parameters, null, 2)}
            </pre>
          </div>
        </>
      )}

      {!loading && !error && !data && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center text-gray-500">
          <Cpu className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-xl font-medium">Tidak ada model aktif</p>
          <p className="text-sm mt-2">
            Belum ada model machine learning yang dikonfigurasi.
          </p>
        </div>
      )}
    </div>
  );
}
