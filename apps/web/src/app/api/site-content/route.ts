import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { siteContent } from "@/db/schema";

export async function GET() {
  try {
    const rows = await db.select().from(siteContent);
    const content: Record<string, string> = {};
    for (const row of rows) {
      content[row.key] = row.value;
    }
    return NextResponse.json(content);
  } catch (error) {
    console.error("Error fetching site content:", error);
    return NextResponse.json(
      { error: "Gagal mengambil konten" },
      { status: 500 }
    );
  }
}
