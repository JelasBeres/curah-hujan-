"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Info,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  FileText,
  Loader2,
} from "lucide-react";
import { formatDateIndonesian } from "@/lib/utils";

interface WarningItem {
  id: string;
  title: string;
  content: string;
  status: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
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
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${
        styles[status] || ""
      }`}
    >
      {icons[status]}
      {status}
    </span>
  );
}

export default function InformasiPage() {
  const [data, setData] = useState<WarningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/warnings")
      .then((r) => {
        if (!r.ok) throw new Error("Gagal memuat informasi");
        return r.json();
      })
      .then((items) =>
        setData(
          items.filter((item: WarningItem) => item.isPublished)
        )
      )
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
            <Info className="w-6 h-6" />
            Informasi
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 shadow-sm animate-pulse"
              >
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/4 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-8 text-center">
            <p className="text-lg font-medium">Gagal memuat informasi</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div className="space-y-4">
            {data.map((item) => (
              <article
                key={item.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {item.title}
                  </h2>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {item.content}
                </p>
                <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                  {item.publishedAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDateIndonesian(item.publishedAt)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Dibuat: {formatDateIndonesian(item.createdAt)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-xl font-medium">Belum ada informasi</p>
            <p className="text-sm mt-2">
              Belum ada informasi atau peringatan yang dipublikasikan.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
