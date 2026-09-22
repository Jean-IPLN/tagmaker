import "server-only";

import { z } from "zod";

const envSchema = z.object({
  ZPL_PRINTER_HOST: z.string().min(1),
  ZPL_PRINTER_PORT: z.coerce.number().int().positive(),
  ZPL_LABEL_WIDTH_MM: z.coerce.number().positive(),
  ZPL_LABEL_HEIGHT_MM: z.coerce.number().positive(),
  ZPL_RESOLUTION_DPI: z.coerce.number().int().positive(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Configuration d'environnement invalide: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`
  );
}

export const env = parsed.data;

export const LABEL_WIDTH_DOTS = Math.round(
  (env.ZPL_LABEL_WIDTH_MM * env.ZPL_RESOLUTION_DPI) / 25.4
);

export const LABEL_HEIGHT_DOTS = Math.round(
  (env.ZPL_LABEL_HEIGHT_MM * env.ZPL_RESOLUTION_DPI) / 25.4
);