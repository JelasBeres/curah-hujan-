import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { hydrologyData } from "@/db/schema";
import { hydrologyDataSchema } from "@/lib/validations";
import { calculateDischarge } from "@/lib/utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const [updated] = await db
      .update(hydrologyData)
      .set({
        timestamp: new Date(timestamp),
        tma,
        rainfallMm: rainfall_mm ?? 0,
        calculatedDischargeM3s: discharge,
        updatedAt: new Date(),
      })
      .where(eq(hydrologyData.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Data tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating hydrology record:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data hidrologi" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [deleted] = await db
      .delete(hydrologyData)
      .where(eq(hydrologyData.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Data tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Data berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting hydrology record:", error);
    return NextResponse.json(
      { error: "Gagal menghapus data hidrologi" },
      { status: 500 }
    );
  }
}
