import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { hash } from "bcryptjs";
import { sql } from "drizzle-orm";
import {
  users,
  warningThresholds,
  modelVersions,
  siteContent,
} from "@/db/schema";

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const sqlClient = neon(databaseUrl);
  const db = drizzle(sqlClient);

  console.log("Seeding database...");

  const passwordHash = await hash("admin123", 12);
  await db.insert(users).values({
    name: "Admin",
    email: "admin@example.com",
    passwordHash,
    role: "admin",
  }).onConflictDoNothing({ target: users.email });
  console.log("Admin user created: admin@example.com / admin123");

  await db.insert(warningThresholds).values({
    safeMax: 2.0,
    alertMax: 3.0,
    dangerMin: 3.0,
    unit: "m",
    isActive: true,
  });
  console.log("Warning thresholds created (safe_max=2.0, alert_max=3.0, danger_min=3.0) with note: contoh pengembangan");

  await db.insert(modelVersions).values({
    version: "rf-tma-2024-v1",
    algorithm: "RandomForestRegressor",
    featureList: ["tma", "rainfall_mm", "discharge_m3s", "hour", "day_of_week", "day_of_month", "month", "is_weekend", "hour_sin", "hour_cos", "month_sin", "month_cos", "tma_lag_1h", "tma_lag_2h", "tma_lag_3h", "tma_lag_6h", "tma_lag_12h", "tma_lag_24h", "tma_diff_1h", "tma_diff_3h", "tma_rolling_mean_3h", "tma_rolling_mean_6h", "tma_rolling_mean_12h", "tma_rolling_std_6h", "rainfall_lag_1d", "rainfall_lag_2d", "rainfall_rolling_sum_3d", "rainfall_rolling_sum_7d", "discharge_lag_1h", "discharge_lag_3h", "discharge_rolling_mean_6h"],
    parameters: { n_estimators: 300, max_depth: 25, min_samples_split: 5, min_samples_leaf: 2, max_features: "sqrt" },
    mae: 0.0957,
    rmse: 0.2137,
    r2: 0.7918,
    trainingStartDate: new Date("2024-01-08"),
    trainingEndDate: new Date("2024-09-15"),
    artifactPath: "ml/artifacts/random_forest_tma.joblib",
    isActive: true,
  });
  console.log("Model version rf-tma-2024-v1 created");

  const defaultContent = [
    { key: "site_title", value: "Sistem Peringatan Dini Banjir" },
    { key: "site_subtitle", value: "Pemantauan dan Prediksi Banjir" },
    { key: "hero_title", value: "Pantau Banjir dengan Data Terbaru" },
    { key: "hero_description", value: "Sistem pemantauan tinggi muka air, curah hujan, dan prediksi banjir untuk mitigasi bencana yang lebih baik." },
    { key: "footer_text", value: "Data sumber dari stasiun pemantauan hidrologi" },
  ];
  for (const item of defaultContent) {
    await db.insert(siteContent).values(item).onConflictDoNothing({ target: siteContent.key });
  }
  console.log("Site content seeded");

  console.log("Seed completed successfully");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
