"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Upload,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Database,
  X,
  Gauge,
} from "lucide-react";
import { hydrologyFormSchema } from "@/lib/validations";
import { formatNumberIndonesian, formatDateIndonesian } from "@/lib/utils";

interface HydrologyRecord {
  id: string;
  timestamp: string;
  tma: number;
  rainfallMm: number | null;
  calculatedDischargeM3s: number | null;
  source: string;
  createdAt: string;
}

interface PaginatedResponse {
  data: HydrologyRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function DataHidrologiPage() {
  const [hydrologyData, setHydrologyData] = useState<HydrologyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchDate, setSearchDate] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(hydrologyFormSchema),
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (searchDate) {
        params.set("start_date", `${searchDate}T00:00:00.000Z`);
        params.set("end_date", `${searchDate}T23:59:59.999Z`);
      }
      const res = await fetch(`/api/hydrology?${params}`);
      if (!res.ok) throw new Error("Gagal memuat data");
      const json: PaginatedResponse = await res.json();
      setHydrologyData(json.data);
      setTotalPages(json.totalPages);
      setTotal(json.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, searchDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditingId(null);
    reset({
      timestamp: new Date().toISOString().slice(0, 16),
      tma: undefined,
      rainfall_mm: undefined,
    });
    setShowModal(true);
  };

  const openEdit = (record: HydrologyRecord) => {
    setEditingId(record.id);
    reset({
      timestamp: new Date(record.timestamp).toISOString().slice(0, 16),
      tma: record.tma,
      rainfall_mm: record.rainfallMm ?? undefined,
    });
    setShowModal(true);
  };

  const onSubmit = async (formData: any) => {
    setSaving(true);
    try {
      const payload = {
        timestamp: new Date(formData.timestamp).toISOString(),
        tma: parseFloat(formData.tma),
        rainfall_mm: formData.rainfall_mm
          ? parseFloat(formData.rainfall_mm)
          : undefined,
      };

      const url = editingId
        ? `/api/hydrology/${editingId}`
        : "/api/hydrology";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan data");
      }

      showToast("success", editingId ? "Data berhasil diperbarui" : "Data berhasil ditambahkan");
      setShowModal(false);
      fetchData();
    } catch (e: any) {
      showToast("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/hydrology/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus data");
      showToast("success", "Data berhasil dihapus");
      setDeleteConfirm(null);
      fetchData();
    } catch (e: any) {
      showToast("error", e.message);
    } finally {
      setDeleting(false);
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Hidrologi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola data tinggi muka air dan curah hujan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/data-hidrologi/import"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </Link>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Data
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={searchDate}
              onChange={(e) => {
                setSearchDate(e.target.value);
                setPage(1);
              }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            {searchDate && (
              <button
                onClick={() => {
                  setSearchDate("");
                  setPage(1);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-900 mx-auto" />
            <p className="text-sm text-gray-500 mt-2">Memuat data...</p>
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-red-600">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && hydrologyData.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">Belum ada data</p>
            <p className="text-sm mt-1">
              Tambahkan data hidrologi atau impor dari file CSV/XLSX.
            </p>
          </div>
        )}

        {!loading && !error && hydrologyData.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Waktu
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    TMA (m)
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Curah Hujan (mm)
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Debit (m³/s)
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Sumber
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {hydrologyData.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDateIndonesian(record.timestamp)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatNumberIndonesian(record.tma, 2)}
                    </td>
                    <td className="px-4 py-3">
                      {record.rainfallMm != null
                        ? formatNumberIndonesian(record.rainfallMm, 1)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {record.calculatedDischargeM3s != null
                        ? formatNumberIndonesian(record.calculatedDischargeM3s, 2)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 capitalize">{record.source}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(record)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(record.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Total: {total} data
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-600 px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-gray-600">
        <p className="flex items-center gap-1">
          <Gauge className="w-3 h-3" />
          Debit terhitung otomatis berdasarkan rating curve: Q = 20.268 &times;
          (H + 0.15)^2.157
        </p>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editingId ? "Edit Data" : "Tambah Data"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Waktu
                </label>
                <input
                  type="datetime-local"
                  {...register("timestamp")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {errors.timestamp && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.timestamp.message as string}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TMA (m)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("tma", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {errors.tma && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.tma.message as string}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Curah Hujan (mm) - opsional
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register("rainfall_mm", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-2">Konfirmasi Hapus</h2>
            <p className="text-sm text-gray-600 mb-4">
              Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak
              dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={deleting}
              >
                Batal
              </button>
              <button
                onClick={() => confirmDelete(deleteConfirm)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
