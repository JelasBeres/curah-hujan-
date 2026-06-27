"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Droplets,
  Gauge,
  Eye,
  BarChart3,
  Info,
  Shield,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { formatNumberIndonesian, formatDateIndonesian } from "@/lib/utils";

interface DashboardData {
  latestTma: number;
  latestRainfall: number;
  latestDischarge: number;
  currentStatus: string;
  latestDataTimestamp: string | null;
  publishedWarning: {
    title: string;
    content: string;
    status: string;
  } | null;
}

interface SiteContent {
  site_title: string;
  site_subtitle: string;
  hero_title: string;
  hero_description: string;
  footer_text: string;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "Bahaya":
      return <AlertTriangle className="w-12 h-12 text-danger" />;
    case "Siaga":
      return <AlertCircle className="w-12 h-12 text-alert" />;
    default:
      return <CheckCircle className="w-12 h-12 text-safe" />;
  }
}

const statusColors: Record<string, string> = {
  Aman: "bg-safe/10 border-safe text-safe",
  Siaga: "bg-alert/10 border-alert text-alert",
  Bahaya: "bg-danger/10 border-danger text-danger",
};

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((r) => { if (!r.ok) throw new Error("Gagal memuat data"); return r.json(); }),
      fetch("/api/site-content").then((r) => { if (!r.ok) throw new Error("Gagal memuat konten"); return r.json(); }),
    ])
      .then(([dashboardData, siteContent]) => {
        setData(dashboardData);
        setContent(siteContent);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Droplets className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">{content?.site_title || "Sistem Peringatan Dini Banjir"}</h1>
              <p className="text-blue-200 text-sm">{content?.site_subtitle || "Pemantauan dan Prediksi Banjir"}</p>
            </div>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <Shield className="w-4 h-4" />
            Admin
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-gradient-to-br from-blue-900 to-blue-800 text-white py-16">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {content?.hero_title || "Pantau Banjir dengan Data Terbaru"}
            </h2>
            <p className="text-blue-200 text-lg max-w-2xl mx-auto mb-8">
              {content?.hero_description || "Sistem pemantauan tinggi muka air, curah hujan, dan prediksi banjir untuk mitigasi bencana yang lebih baik."}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/status"
                className="inline-flex items-center gap-2 bg-white text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                <Eye className="w-5 h-5" />
                Status Terkini
              </Link>
              <Link
                href="/grafik"
                className="inline-flex items-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
              >
                <BarChart3 className="w-5 h-5" />
                Lihat Grafik
              </Link>
              <Link
                href="/informasi"
                className="inline-flex items-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
              >
                <Info className="w-5 h-5" />
                Informasi
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-6">Status Terkini</h2>

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
                  <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-20" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 text-center">
              <p>Gagal memuat data. Silakan coba lagi.</p>
            </div>
          )}

          {!loading && !error && data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Tinggi Muka Air</p>
                  <p className="text-3xl font-bold">{formatNumberIndonesian(data.latestTma * 100, 1)} cm</p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Curah Hujan</p>
                  <p className="text-3xl font-bold">{formatNumberIndonesian(data.latestRainfall, 1)} mm</p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Debit Air</p>
                  <p className="text-3xl font-bold">{formatNumberIndonesian(data.latestDischarge, 2)} m³/s</p>
                  <p className="text-xs text-gray-400 mt-1">Debit terhitung otomatis berdasarkan rating curve</p>
                </div>
              </div>

              <div
                className={`rounded-xl p-8 border-2 text-center ${
                  statusColors[data.currentStatus] || ""
                }`}
              >
                <div className="flex justify-center mb-4">
                  <StatusIcon status={data.currentStatus} />
                </div>
                <p className="text-2xl font-bold mb-2">
                  Status: {data.currentStatus}
                </p>
                {data.latestDataTimestamp && (
                  <p className="text-sm opacity-75 flex items-center justify-center gap-1">
                    <Clock className="w-4 h-4" />
                    Terakhir diperbarui:{" "}
                    {formatDateIndonesian(data.latestDataTimestamp)}
                  </p>
                )}
              </div>

              {data.publishedWarning && (
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
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

              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href="/status"
                  className="inline-flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors"
                >
                  Detail Status <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/grafik"
                  className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Lihat Grafik <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </>
          )}

          {!loading && !error && !data && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500">
              <Droplets className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">Belum ada data</p>
              <p className="text-sm mt-1">Data hidrologi akan muncul setelah tersedia.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Droplets className="w-5 h-5" />
            <span className="text-white font-semibold">
              {content?.site_title || "Sistem Peringatan Dini Banjir"}
            </span>
          </div>
          <p className="text-sm">
            &copy; {new Date().getFullYear()} - {content?.footer_text || "Data sumber dari stasiun pemantauan hidrologi"}
          </p>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <Link href="/status" className="hover:text-white transition-colors">
              Status
            </Link>
            <Link href="/grafik" className="hover:text-white transition-colors">
              Grafik
            </Link>
            <Link href="/informasi" className="hover:text-white transition-colors">
              Informasi
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
