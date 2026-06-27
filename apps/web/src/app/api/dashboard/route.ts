import { NextResponse } from "next/server";
import { desc, eq, gte, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  hydrologyData,
  predictions,
  warningThresholds,
  warningInformation,
} from "@/db/schema";
import { determineWarningStatus } from "@/lib/utils";

export async function GET() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [latestData] = await db
      .select()
      .from(hydrologyData)
      .orderBy(desc(hydrologyData.timestamp))
      .limit(1);

    const [latestPrediction] = await db
      .select()
      .from(predictions)
      .orderBy(desc(predictions.createdAt))
      .limit(1);

    const [activeThreshold] = await db
      .select()
      .from(warningThresholds)
      .where(eq(warningThresholds.isActive, true))
      .limit(1);

    const [publishedWarning] = await db
      .select()
      .from(warningInformation)
      .where(eq(warningInformation.isPublished, true))
      .orderBy(desc(warningInformation.publishedAt))
      .limit(1);

    const chartData = await db
      .select({
        timestamp: hydrologyData.timestamp,
        tma: hydrologyData.tma,
        rainfallMm: hydrologyData.rainfallMm,
        discharge: hydrologyData.calculatedDischargeM3s,
      })
      .from(hydrologyData)
      .where(gte(hydrologyData.timestamp, sevenDaysAgo))
      .orderBy(hydrologyData.timestamp);

    const predictionChartData = await db
      .select({
        timestamp: predictions.predictionTimestamp,
        predictedTma: predictions.predictedTma,
      })
      .from(predictions)
      .where(gte(predictions.predictionTimestamp, sevenDaysAgo))
      .orderBy(predictions.predictionTimestamp);

    const thresholds = activeThreshold
      ? { safeMax: activeThreshold.safeMax, alertMax: activeThreshold.alertMax, dangerMin: activeThreshold.dangerMin }
      : { safeMax: 2.0, alertMax: 3.0, dangerMin: 3.0 };

    const latestTma = latestData?.tma ?? 0;
    const currentStatus = determineWarningStatus(latestTma, thresholds);
    const predictedStatus = latestPrediction
      ? determineWarningStatus(latestPrediction.predictedTma, thresholds)
      : null;

    return NextResponse.json({
      latestTma,
      latestRainfall: latestData?.rainfallMm ?? 0,
      latestDischarge: latestData?.calculatedDischargeM3s ?? 0,
      latestDataTimestamp: latestData?.timestamp ?? null,
      currentStatus,
      prediction: latestPrediction
        ? {
            id: latestPrediction.id,
            predictedTma: latestPrediction.predictedTma,
            predictedDischarge: latestPrediction.calculatedDischargeM3s,
            predictedStatus,
            predictionTimestamp: latestPrediction.predictionTimestamp,
            createdAt: latestPrediction.createdAt,
          }
        : null,
      publishedWarning: publishedWarning
        ? {
            id: publishedWarning.id,
            title: publishedWarning.title,
            content: publishedWarning.content,
            status: publishedWarning.status,
          }
        : null,
      chartData: chartData.map((d) => ({
        timestamp: d.timestamp.toISOString(),
        tma: d.tma,
        rainfall: d.rainfallMm,
        discharge: d.discharge,
      })),
      predictionChartData: predictionChartData.map((d) => ({
        timestamp: d.timestamp.toISOString(),
        predictedTma: d.predictedTma,
      })),
      thresholds,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data dashboard" },
      { status: 500 }
    );
  }
}
