import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { warningThresholds } from "@/db/schema";
import { thresholdSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const [active] = await db
      .select()
      .from(warningThresholds)
      .where(eq(warningThresholds.isActive, true))
      .limit(1);

    if (!active) {
      return NextResponse.json(
        { error: "Threshold tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(active);
  } catch (error) {
    console.error("Error fetching thresholds:", error);
    return NextResponse.json(
      { error: "Gagal mengambil threshold" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = thresholdSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data tidak valid", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { safe_max, alert_max, danger_min } = parsed.data;

    if (safe_max >= alert_max) {
      return NextResponse.json(
        { error: "Batas aman harus kurang dari batas siaga" },
        { status: 400 }
      );
    }

    if (alert_max >= danger_min) {
      return NextResponse.json(
        { error: "Batas siaga harus kurang dari batas bahaya" },
        { status: 400 }
      );
    }

    const [active] = await db
      .select()
      .from(warningThresholds)
      .where(eq(warningThresholds.isActive, true))
      .limit(1);

    if (!active) {
      const [created] = await db
        .insert(warningThresholds)
        .values({
          safeMax: safe_max,
          alertMax: alert_max,
          dangerMin: danger_min,
          isActive: true,
        })
        .returning();

      return NextResponse.json(created);
    }

    const [updated] = await db
      .update(warningThresholds)
      .set({
        safeMax: safe_max,
        alertMax: alert_max,
        dangerMin: danger_min,
        updatedAt: new Date(),
      })
      .where(eq(warningThresholds.id, active.id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating thresholds:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui threshold" },
      { status: 500 }
    );
  }
}
