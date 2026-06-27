import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export const hydrologyFormSchema = z.object({
  timestamp: z.string().min(1, "Waktu harus diisi"),
  tma: z.number({ required_error: "TMA harus diisi", invalid_type_error: "TMA harus angka" }).min(-0.14, "TMA minimal -0.14 m untuk rating curve"),
  rainfall_mm: z.preprocess(
    (v) => (v === undefined || (typeof v === "number" && isNaN(v)) ? undefined : v),
    z.number().min(0, "Curah hujan tidak boleh negatif").optional()
  ),
});

export const hydrologyDataSchema = z.object({
  timestamp: z.string().datetime("Format timestamp tidak valid"),
  tma: z.number().min(-0.14, "TMA minimal -0.14 m untuk rating curve"),
  rainfall_mm: z.number().min(0, "Curah hujan tidak boleh negatif").optional(),
});

export const warningInfoSchema = z.object({
  title: z.string().min(1, "Judul harus diisi"),
  content: z.string().min(1, "Konten harus diisi"),
  status: z.enum(["Aman", "Siaga", "Bahaya"]),
});

export const thresholdSchema = z.object({
  safe_max: z.number().positive("Batas aman harus lebih dari 0"),
  alert_max: z.number().positive("Batas siaga harus lebih dari 0"),
  danger_min: z.number().positive("Batas bahaya harus lebih dari 0"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type HydrologyDataInput = z.infer<typeof hydrologyDataSchema>;
export type WarningInfoInput = z.infer<typeof warningInfoSchema>;
export type ThresholdInput = z.infer<typeof thresholdSchema>;
