import { z } from "zod";

import {
  paperIdField,
  printerAddressField,
  quantityField,
  rotatedField,
} from "@/lib/print-options";

export const CODE128_MAX_LENGTH = 80;

const contentField = z
  .string({ error: "Le contenu est requis" })
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, "Le contenu est requis")
      .max(
        CODE128_MAX_LENGTH,
        `Le contenu ne peut pas dépasser ${CODE128_MAX_LENGTH} caractères`
      )
      .regex(
        /^[\x20-\x7E]+$/,
        "Le contenu ne peut contenir que des caractères ASCII imprimables"
      )
  );

export const code128RequestSchema = z
  .object({
    content: contentField,
    quantity: quantityField,
    paperId: paperIdField,
    printerAddress: printerAddressField,
    rotated: rotatedField,
  })
  .strict();

export type Code128Request = z.infer<typeof code128RequestSchema>;
