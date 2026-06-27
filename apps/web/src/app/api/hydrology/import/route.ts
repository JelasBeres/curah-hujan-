import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hydrologyData, importBatches } from "@/db/schema";
import { hydrologyDataSchema } from "@/lib/validations";
import { calculateDischarge } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import * as XLSX from "xlsx";
import Papa from "papaparse";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name.toLowerCase();
    let rows: Record<string, unknown>[] = [];

    if (filename.endsWith(".csv")) {
      const text = buffer.toString("utf-8");
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      rows = result.data as Record<string, unknown>[];
    } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
    } else {
      return NextResponse.json(
        { error: "Format file tidak didukung. Gunakan CSV atau XLSX" },
        { status: 400 }
      );
    }

    const importBatchId = uuidv4();
    const validRecords: (typeof hydrologyData.$inferInsert)[] = [];
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const tma = parseFloat(row["tma"] as string) || parseFloat(row["TMA"] as string);
      const timestamp = (row["timestamp"] as string) || (row["Timestamp"] as string) || (row["waktu"] as string);
      const rainfall = parseFloat(row["rainfall_mm"] as string) || parseFloat(row["curah_hujan"] as string) || 0;

      const parsed = hydrologyDataSchema.safeParse({
        timestamp: timestamp ? new Date(timestamp).toISOString() : undefined,
        tma: isNaN(tma) ? undefined : tma,
        rainfall_mm: isNaN(rainfall) ? undefined : rainfall,
      });

      if (!parsed.success) {
        errors.push({
          row: rowNum,
          error: parsed.error.errors.map((e) => e.message).join(", "),
        });
        continue;
      }

      const discharge = calculateDischarge(parsed.data.tma);
      validRecords.push({
        timestamp: new Date(parsed.data.timestamp),
        tma: parsed.data.tma,
        rainfallMm: parsed.data.rainfall_mm ?? 0,
        calculatedDischargeM3s: discharge,
        source: "import",
        importBatchId,
      });
    }

    if (validRecords.length > 0) {
      await db.insert(hydrologyData).values(validRecords).onConflictDoNothing({
        target: hydrologyData.timestamp,
      });
    }

    await db.insert(importBatches).values({
      id: importBatchId,
      filename: file.name,
      totalRows: rows.length,
      validRows: validRecords.length,
      invalidRows: errors.length,
      errorReport: errors,
    });

    return NextResponse.json({
      importBatchId,
      totalRows: rows.length,
      validRows: validRecords.length,
      invalidRows: errors.length,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    console.error("Error importing hydrology data:", error);
    return NextResponse.json(
      { error: "Gagal mengimpor data" },
      { status: 500 }
    );
  }
}
