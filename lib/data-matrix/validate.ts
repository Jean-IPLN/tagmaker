import { z } from "zod";

import {
  paperIdField,
  printerAddressField,
  quantityField,
  rotatedField,
} from "@/lib/print-options";

export const DATA_MATRIX_MAX_CONTENT_LENGTH = 200;
export const DATA_MATRIX_MAX_LEGEND_LENGTH = 60;

const contentField = z
  .string({ error: "Le contenu est requis" })
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, "Le contenu est requis")
      .max(
        DATA_MATRIX_MAX_CONTENT_LENGTH,
        `Le contenu ne peut pas dépasser ${DATA_MATRIX_MAX_CONTENT_LENGTH} caractères`
      )
      .regex(
        /^[\x20-\x7E]+$/,
        "Le contenu ne peut contenir que des caractères ASCII imprimables"
      )
  );

const legendField = z
  .string({
    error:
      "La légende ne peut contenir que des caractères ASCII imprimables",
  })
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .max(
        DATA_MATRIX_MAX_LEGEND_LENGTH,
        `La légende ne peut pas dépasser ${DATA_MATRIX_MAX_LEGEND_LENGTH} caractères`
      )
      .regex(
        /^[\x20-\x7E]*$/,
        "La légende ne peut contenir que des caractères ASCII imprimables"
      )
  )
  .optional()
  .default("");

const inlineField = z
  .boolean({ error: "Le mode d'affichage est invalide" })
  .optional();

export const dataMatrixRequestSchema = z
  .object({
    content: contentField,
    legend: legendField,
    quantity: quantityField,
    paperId: paperIdField,
    printerAddress: printerAddressField,
    rotated: rotatedField,
    inline: inlineField,
  })
  .strict();

export type DataMatrixRequest = z.infer<typeof dataMatrixRequestSchema>;
