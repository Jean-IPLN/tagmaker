import "server-only";

import { z } from "zod";

const envSchema = z.object({
  ZPL_PRINTER_HOST: z.string().min(1),
  ZPL_PRINTER_PORT: z.coerce.number().int().positive(),
  ZPL_RESOLUTION_DPI: z.coerce.number().int().positive(),
  ZPL_PAPER_SIZES: z.string().min(1),
  ZPL_SCAN_SUBNET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Configuration d'environnement invalide: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`
  );
}

export const env = parsed.data;