import { NextRequest, NextResponse } from "next/server";
import { desc, gte, lte, and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { hydrologyData } from "@/db/schema";
import { hydrologyDataSchema } from "@/lib/validations";
import { calculateDischarge } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const offset = (page - 1) * limit;

    const conditions = [];
    if (startDate) conditions.push(gte(hydrologyData.timestamp, new Date(startDate)));
    if (endDate) conditions.push(lte(hydrologyData.timestamp, new Date(endDate)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(hydrologyData)
        .where(where)
        .orderBy(desc(hydrologyData.timestamp))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: hydrologyData.id })
        .from(hydrologyData)
        .where(where)
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
    console.error("Error fetching hydrology data:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data hidrologi" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = hydrologyDataSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data tidak valid", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { timestamp, tma, rainfall_mm } = parsed.data;
    const discharge = calculateDischarge(tma);

    const [record] = await db
      .insert(hydrologyData)
      .values({
        timestamp: new Date(timestamp),
        tma,
        rainfallMm: rainfall_mm ?? 0,
        calculatedDischargeM3s: discharge,
      })
      .returning();

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("Error creating hydrology record:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data hidrologi" },
      { status: 500 }
    );
  }
}
