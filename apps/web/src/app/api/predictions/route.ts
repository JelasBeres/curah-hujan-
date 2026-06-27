import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { hydrologyData, predictions, modelVersions, warningThresholds } from "@/db/schema";
import { calculateDischarge, determineWarningStatus } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const offset = (page - 1) * limit;

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(predictions)
        .orderBy(desc(predictions.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: predictions.id })
        .from(predictions)
        .then((rows) => rows.length),
    ]);

    return NextResponse.json({
      data,
      total: totalResult,
      page,
      limit,
      totalPages: Math.ceil(totalResult / limit),
    });
  } catch (error) {
    console.error("Error fetching predictions:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data prediksi" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const [latestData] = await db
      .select()
      .from(hydrologyData)
      .orderBy(desc(hydrologyData.timestamp))
      .limit(1);

    if (!latestData) {
      return NextResponse.json(
        { error: "Tidak ada data hidrologi untuk diprediksi" },
        { status: 400 }
      );
    }

    const [activeModel] = await db
      .select()
      .from(modelVersions)
      .where(eq(modelVersions.isActive, true))
      .limit(1);

    if (!activeModel) {
      return NextResponse.json(
        { error: "Tidak ada model aktif" },
        { status: 400 }
      );
    }

    const mlServiceUrl = process.env.ML_SERVICE_URL;
    if (!mlServiceUrl) {
      return NextResponse.json(
        { error: "ML Service URL tidak dikonfigurasi" },
        { status: 500 }
      );
    }

    const response = await fetch(`${mlServiceUrl}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_tma: latestData.tma,
        rainfall_mm: latestData.rainfallMm ?? 0,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "ML service returned error");
    }

    const result = await response.json();
    const predictedTma = result.predicted_tma;

    const [activeThreshold] = await db
      .select()
      .from(warningThresholds)
      .where(eq(warningThresholds.isActive, true))
      .limit(1);

    const thresholds = activeThreshold
      ? { safeMax: activeThreshold.safeMax, alertMax: activeThreshold.alertMax, dangerMin: activeThreshold.dangerMin }
      : { safeMax: 2.0, alertMax: 3.0, dangerMin: 3.0 };

    const warningStatus = determineWarningStatus(predictedTma, thresholds);
    const discharge = calculateDischarge(predictedTma);

    const predictionTimestamp = new Date(
      latestData.timestamp.getTime() + 60 * 60 * 1000
    );

    const [prediction] = await db
      .insert(predictions)
      .values({
        inputTimestamp: latestData.timestamp,
        predictionTimestamp,
        predictedTma,
        calculatedDischargeM3s: discharge,
        warningStatus,
        modelVersionId: activeModel.id,
      })
      .returning();

    return NextResponse.json(prediction, { status: 201 });
  } catch (error) {
    console.error("Error running prediction:", error);
    return NextResponse.json(
      { error: "Gagal menjalankan prediksi" },
      { status: 500 }
    );
  }
}
