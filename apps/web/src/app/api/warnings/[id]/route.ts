import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { warningInformation } from "@/db/schema";
import { warningInfoSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    if (body.isPublished !== undefined) {
      const [existing] = await db
        .select()
        .from(warningInformation)
        .where(eq(warningInformation.id, id))
        .limit(1);

      if (!existing) {
        return NextResponse.json(
          { error: "Informasi tidak ditemukan" },
          { status: 404 }
        );
      }

      const [updated] = await db
        .update(warningInformation)
        .set({
          isPublished: body.isPublished,
          publishedAt: body.isPublished ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(warningInformation.id, id))
        .returning();

      return NextResponse.json(updated);
    }

    const parsed = warningInfoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data tidak valid", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, content, status } = parsed.data;

    const [updated] = await db
      .update(warningInformation)
      .set({
        title,
        content,
        status,
        updatedAt: new Date(),
      })
      .where(eq(warningInformation.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Informasi tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating warning:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui informasi peringatan" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const { id } = await params;

    const [deleted] = await db
      .delete(warningInformation)
      .where(eq(warningInformation.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Informasi tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Informasi berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting warning:", error);
    return NextResponse.json(
      { error: "Gagal menghapus informasi peringatan" },
      { status: 500 }
    );
  }
}
