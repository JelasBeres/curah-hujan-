import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { warningInformation } from "@/db/schema";
import { warningInfoSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const data = await db
      .select()
      .from(warningInformation)
      .orderBy(desc(warningInformation.createdAt));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching warnings:", error);
    return NextResponse.json(
      { error: "Gagal mengambil informasi peringatan" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = warningInfoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data tidak valid", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, content, status } = parsed.data;

    const [record] = await db
      .insert(warningInformation)
      .values({
        title,
        content,
        status,
        createdBy: session.user.id,
      })
      .returning();

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("Error creating warning:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan informasi peringatan" },
      { status: 500 }
    );
  }
}
