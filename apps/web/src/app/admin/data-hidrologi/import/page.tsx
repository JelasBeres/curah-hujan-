"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Upload,
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Table,
} from "lucide-react";

interface PreviewRow {
  row: number;
  timestamp?: string;
  tma?: number;
  rainfall_mm?: number;
  valid: boolean;
  error?: string;
}

interface ImportResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: { row: number; error: string }[];
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      const headers = lines[0]?.split(",").map((h) => h.trim().toLowerCase()) || [];

      const rows: PreviewRow[] = [];
      for (let i = 1; i < Math.min(lines.length, 6); i++) {
        const vals = lines[i].split(",").map((v) => v.trim());
        const rowData: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowData[h] = vals[idx] || "";
        });

        const tma = parseFloat(rowData["tma"] || rowData["tinggi muka air"] || "");
        const timestamp = rowData["timestamp"] || rowData["waktu"] || "";
        const rainfall = parseFloat(rowData["rainfall_mm"] || rowData["curah hujan"] || "0");

        const valid = !isNaN(tma) && timestamp.length > 0 && tma > 0;
        rows.push({
          row: i + 1,
          timestamp: timestamp.slice(0, 16),
          tma: isNaN(tma) ? undefined : tma,
          rainfall_mm: isNaN(rainfall) ? undefined : rainfall,
          valid,
          error: valid ? undefined : "Data tidak lengkap atau tidak valid",
        });
      }
      setPreview(rows);
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/hydrology/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mengimpor");
      }

      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/data-hidrologi"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Data Hidrologi
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Import Data</h1>
        <p className="text-sm text-gray-500 mt-1">
          Impor data hidrologi dari file CSV atau XLSX
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-blue-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setPreview(null);
                  setResult(null);
                }}
                className="ml-4 text-sm text-red-600 hover:text-red-700"
              >
                Hapus
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700">
                Klik atau taruh file di sini
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Format: CSV atau XLSX
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {preview && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Table className="w-4 h-4" />
            Pratinjau Data ({preview.length} baris pertama)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Baris</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Waktu</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">TMA (m)</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Curah Hujan (mm)</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr
                    key={row.row}
                    className={`border-b border-gray-50 ${
                      row.valid ? "" : "bg-red-50"
                    }`}
                  >
                    <td className="px-3 py-2">{row.row}</td>
                    <td className="px-3 py-2">{row.timestamp || "—"}</td>
                    <td className="px-3 py-2">
                      {row.tma != null ? row.tma.toFixed(2) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.rainfall_mm != null ? row.rainfall_mm.toFixed(1) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.valid ? (
                        <span className="inline-flex items-center gap-1 text-safe text-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-danger text-xs">
                          <XCircle className="w-3 h-3" />
                          {row.error}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-safe" />
            Hasil Import
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {result.totalRows}
              </p>
              <p className="text-xs text-gray-500">Total Baris</p>
            </div>
            <div className="bg-safe/10 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-safe">
                {result.validRows}
              </p>
              <p className="text-xs text-safe">Valid</p>
            </div>
            <div className="bg-danger/10 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-danger">
                {result.invalidRows}
              </p>
              <p className="text-xs text-danger">Tidak Valid</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs font-medium text-red-700 mb-2">
                Detail Error:
              </p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-600">
                  Baris {e.row}: {e.error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {file && !importing && !result && (
        <button
          onClick={handleImport}
          disabled={!file}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import Data
        </button>
      )}

      {importing && (
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 text-white rounded-lg font-medium opacity-50">
          <Loader2 className="w-4 h-4 animate-spin" />
          Mengimpor...
        </div>
      )}
    </div>
  );
}
