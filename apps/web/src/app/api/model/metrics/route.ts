import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { modelVersions } from "@/db/schema";

export async function GET() {
  try {
    const [activeModel] = await db
      .select()
      .from(modelVersions)
      .where(eq(modelVersions.isActive, true))
      .limit(1);

    if (!activeModel) {
      return NextResponse.json(
        { error: "Tidak ada model aktif" },
        { status: 404 }
      );
    }

    const mlServiceUrl = process.env.ML_SERVICE_URL;
    let featureImportance: { feature: string; importance: number }[] | null = null;

    if (mlServiceUrl) {
      try {
        const response = await fetch(`${mlServiceUrl}/metrics`, {
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          const result = await response.json();
          featureImportance = result.feature_importance ?? null;
        }
      } catch {
        console.warn("ML service not available, using database metrics only");
      }
    }

    return NextResponse.json({
      id: activeModel.id,
      version: activeModel.version,
      algorithm: activeModel.algorithm,
      featureList: activeModel.featureList as string[],
      parameters: activeModel.parameters,
      mae: activeModel.mae,
      rmse: activeModel.rmse,
      r2: activeModel.r2,
      trainingStartDate: activeModel.trainingStartDate,
      trainingEndDate: activeModel.trainingEndDate,
      isActive: activeModel.isActive,
      createdAt: activeModel.createdAt,
      featureImportance,
    });
  } catch (error) {
    console.error("Error fetching model metrics:", error);
    return NextResponse.json(
      { error: "Gagal mengambil metrik model" },
      { status: 500 }
    );
  }
}
