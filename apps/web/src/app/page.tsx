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
  MapPin,
  Waves,
  CloudRain,
  Brain,
  ChevronRight,
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

function StatusIcon({ status, size = "w-5 h-5" }: { status: string; size?: string }) {
  switch (status) {
    case "Bahaya":
      return <AlertTriangle className={`${size} text-danger`} />;
    case "Siaga":
      return <AlertCircle className={`${size} text-alert`} />;
    default:
      return <CheckCircle className={`${size} text-safe`} />;
  }
}

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string; iconBg: string }> = {
  Aman: {
    label: "Aman",
    bg: "bg-safe/5",
    text: "text-safe",
    border: "border-safe/20",
    iconBg: "bg-safe/10",
  },
  Siaga: {
    label: "Siaga",
    bg: "bg-alert/5",
    text: "text-alert",
    border: "border-alert/20",
    iconBg: "bg-alert/10",
  },
  Bahaya: {
    label: "Bahaya",
    bg: "bg-danger/5",
    text: "text-danger",
    border: "border-danger/20",
    iconBg: "bg-danger/10",
  },
};

const features = [
  {
    icon: Waves,
    title: "Pemantauan TMA",
    desc: "Monitoring tinggi muka air secara real-time dari Pos Duga Air Batu Beulah, Bogor.",
  },
  {
    icon: CloudRain,
    title: "Data Curah Hujan",
    desc: "Data curah hujan harian dari stasiun terdekat untuk analisis hidrologi.",
  },
  {
    icon: Brain,
    title: "Prediksi Banjir",
    desc: "Model Random Forest untuk memprediksi kenaikan muka air 1 jam ke depan.",
  },
];

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

  const status = data ? statusConfig[data.currentStatus] || statusConfig.Aman : null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-900 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="bg-blue-100/20 p-2 rounded-lg">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">{content?.site_title || "Sistem Peringatan Dini Banjir"}</h1>
              <p className="text-blue-200 text-xs">{content?.site_subtitle || "Pemantauan dan Prediksi Banjir"}</p>
            </div>
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors text-sm border border-white/10"
          >
            <Shield className="w-4 h-4" />
            Admin
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-400 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-sm text-blue-200 mb-6 border border-white/10">
              <MapPin className="w-4 h-4" />
              Pos Duga Air Batu Beulah, Bogor
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              {content?.hero_title || "Pantau Banjir dengan Data Terbaru"}
            </h2>
            <p className="text-blue-200 text-lg md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed">
              {content?.hero_description || "Sistem pemantauan tinggi muka air, curah hujan, dan prediksi banjir untuk mitigasi bencana yang lebih baik."}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/status"
                className="inline-flex items-center gap-2 bg-white text-blue-900 px-6 py-3.5 rounded-xl font-semibold hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
              >
                <Eye className="w-5 h-5" />
                Status Terkini
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                href="/grafik"
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-white/20 transition-all border border-white/20"
              >
                <BarChart3 className="w-5 h-5" />
                Lihat Grafik
              </Link>
              <Link
                href="/informasi"
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-white/20 transition-all border border-white/20"
              >
                <Info className="w-5 h-5" />
                Informasi
              </Link>
            </div>
          </div>
          <div className="h-16 bg-gradient-to-t from-gray-50 to-transparent relative" />
        </section>

        <section className="max-w-6xl mx-auto px-4 -mt-8 relative z-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 sr-only">Status Terkini</h2>

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse border border-gray-100">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
                  <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-20" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-8 text-center shadow-lg">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
              <p className="text-lg font-medium">Gagal memuat data</p>
              <p className="text-sm mt-1 opacity-75">Silakan coba lagi nanti.</p>
            </div>
          )}

          {!loading && !error && data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-blue-50 rounded-xl">
                      <Waves className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Tinggi Muka Air</p>
                    </div>
                    {status && (
                      <span className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${status.iconBg} ${status.text}`}>
                        <StatusIcon status={data.currentStatus} size="w-3.5 h-3.5" />
                        {status.label}
                      </span>
                    )}
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{formatNumberIndonesian(data.latestTma * 100, 1)} <span className="text-lg font-normal text-gray-500">cm</span></p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-cyan-50 rounded-xl">
                      <CloudRain className="w-5 h-5 text-cyan-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">Curah Hujan</p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{formatNumberIndonesian(data.latestRainfall, 1)} <span className="text-lg font-normal text-gray-500">mm</span></p>
                  <p className="text-xs text-gray-400 mt-2">Data curah hujan harian terakhir</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-emerald-50 rounded-xl">
                      <Gauge className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">Debit Air</p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{formatNumberIndonesian(data.latestDischarge, 2)} <span className="text-lg font-normal text-gray-500">m³/s</span></p>
                  <p className="text-xs text-gray-400 mt-2">Debit terhitung otomatis berdasarkan rating curve</p>
                </div>
              </div>

              <div
                className={`rounded-2xl p-8 border-2 text-center shadow-lg transition-all ${
                  status ? status.bg + " " + status.border : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex justify-center mb-4">
                  <StatusIcon status={data.currentStatus} size="w-16 h-16" />
                </div>
                <p className={`text-3xl font-bold mb-2 ${status ? status.text : "text-gray-700"}`}>
                  Status: {data.currentStatus}
                </p>
                <p className="text-sm text-gray-500">
                  Status terkini kondisi banjir berdasarkan data TMA terakhir
                </p>
                {data.latestDataTimestamp && (
                  <p className="text-sm mt-3 text-gray-400 flex items-center justify-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Terakhir diperbarui: {formatDateIndonesian(data.latestDataTimestamp)}
                  </p>
                )}
              </div>

              {data.publishedWarning && (
                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-amber-100 rounded-xl shrink-0">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-amber-900 text-base">
                        {data.publishedWarning.title}
                      </p>
                      <p className="text-amber-800 text-sm mt-1 leading-relaxed">
                        {data.publishedWarning.content}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href="/status"
                  className="inline-flex items-center gap-2 bg-blue-900 text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-blue-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  Detail Status <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/grafik"
                  className="inline-flex items-center gap-2 bg-white text-gray-700 px-6 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-all border border-gray-200 shadow-sm"
                >
                  Lihat Grafik <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </>
          )}

          {!loading && !error && !data && (
            <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
              <Droplets className="w-16 h-16 mx-auto mb-4 text-blue-200" />
              <p className="text-xl font-medium text-gray-700">Belum ada data</p>
              <p className="text-sm text-gray-400 mt-2">Data hidrologi akan muncul setelah tersedia.</p>
            </div>
          )}
        </section>

        <section className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Fitur Sistem</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Sistem peringatan dini banjir terintegrasi untuk pemantauan dan prediksi
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="p-3 bg-blue-50 rounded-2xl w-fit mb-5">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-blue-800 p-2 rounded-lg">
                  <Droplets className="w-5 h-5 text-blue-200" />
                </div>
                <span className="text-white font-semibold text-lg">
                  {content?.site_title || "Sistem Peringatan Dini Banjir"}
                </span>
              </div>
              <p className="text-sm leading-relaxed">
                {content?.site_subtitle || "Pemantauan dan prediksi banjir untuk mitigasi bencana di wilayah Bogor."}
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Navigasi</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/status" className="hover:text-white transition-colors flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" /> Status Terkini
                  </Link>
                </li>
                <li>
                  <Link href="/grafik" className="hover:text-white transition-colors flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" /> Grafik Hidrologi
                  </Link>
                </li>
                <li>
                  <Link href="/informasi" className="hover:text-white transition-colors flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" /> Informasi
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Lokasi</h4>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <p>Pos Duga Air Batu Beulah, Sungai Cisadane, Kecamatan Bogor, Kota Bogor</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} - {content?.footer_text || "Data sumber dari stasiun pemantauan hidrologi"}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
