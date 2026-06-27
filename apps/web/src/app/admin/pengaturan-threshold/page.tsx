"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  SlidersHorizontal,
  Save,
  Loader2,
  AlertTriangle,
  Gauge,
} from "lucide-react";
import { thresholdSchema, type ThresholdInput } from "@/lib/validations";
import { formatNumberIndonesian } from "@/lib/utils";

export default function ThresholdPage() {
  const [current, setCurrent] = useState<ThresholdInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ThresholdInput>({
    resolver: zodResolver(thresholdSchema),
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/thresholds");
      if (!res.ok) {
        if (res.status === 404) {
          setCurrent(null);
          reset({ safe_max: 2.0, alert_max: 3.0, danger_min: 3.0 });
          return;
        }
        throw new Error("Gagal memuat data");
      }
      const json = await res.json();
      const vals = {
        safe_max: json.safeMax,
        alert_max: json.alertMax,
        danger_min: json.dangerMin,
      };
      setCurrent(vals);
      reset(vals);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onSubmit = async (formData: ThresholdInput) => {
    if (formData.safe_max >= formData.alert_max) {
      showToast("error", "Batas aman harus kurang dari batas siaga");
      return;
    }
    if (formData.alert_max >= formData.danger_min) {
      showToast("error", "Batas siaga harus kurang dari batas bahaya");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/thresholds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan");
      }

      setCurrent(formData);
      showToast("success", "Threshold berhasil disimpan");
      fetchData();
    } catch (e: any) {
      showToast("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Pengaturan Threshold
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Konfigurasi batas-batas status peringatan banjir
        </p>
      </div>

      {loading && (
        <div className="bg-white rounded-xl p-8 shadow-sm animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 text-center">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Nilai Threshold
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batas Aman (safe_max) - meter
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register("safe_max", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {errors.safe_max && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.safe_max.message}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  TMA &le; nilai ini = status Aman
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batas Siaga (alert_max) - meter
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register("alert_max", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {errors.alert_max && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.alert_max.message}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  safe_max &lt; TMA &le; nilai ini = status Siaga
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batas Bahaya (danger_min) - meter
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register("danger_min", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {errors.danger_min && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.danger_min.message}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  TMA &ge; nilai ini = status Bahaya
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <Save className="w-4 h-4" />
                {saving ? "Menyimpan..." : "Simpan Pengaturan"}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Visualisasi Threshold
              </h2>
              {current && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 rounded-full bg-safe shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Aman</p>
                      <p className="text-xs text-gray-500">
                        TMA &le; {formatNumberIndonesian(current.safe_max, 2)} m
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 rounded-full bg-alert shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Siaga</p>
                      <p className="text-xs text-gray-500">
                        {formatNumberIndonesian(current.safe_max, 2)} m &lt; TMA &le;{" "}
                        {formatNumberIndonesian(current.alert_max, 2)} m
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 rounded-full bg-danger shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Bahaya</p>
                      <p className="text-xs text-gray-500">
                        TMA &ge; {formatNumberIndonesian(current.danger_min, 2)} m
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                <div className="text-xs text-yellow-800">
                  <p className="font-medium mb-1">Catatan:</p>
                  <p>
                    Threshold ini adalah batas konfigurasi untuk status
                    peringatan banjir. Nilai-nilai ini dapat disesuaikan
                    berdasarkan karakteristik daerah masing-masing. Pastikan
                    batas aman &lt; batas siaga &lt; batas bahaya.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
