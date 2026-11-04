import { z } from "zod";

import {
  paperIdField,
  printerAddressField,
  quantityField,
  rotatedField,
} from "@/lib/print-options";

export function isEan13Valid(code: string): boolean {
  if (!/^\d{13}$/.test(code)) {
    return false;
  }
  const digits = [...code].map(Number);
  const sum = digits
    .slice(0, 12)
    .reduce(
      (total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3),
      0
    );
  const expectedCheckDigit = (10 - (sum % 10)) % 10;
  return digits[12] === expectedCheckDigit;
}

export const labelRequestSchema = z.object({
  ean13: z
    .string({ error: "Le code EAN-13 est requis" })
    .regex(
      /^\d{13}$/,
      "Le code EAN-13 doit contenir exactement 13 chiffres"
    )
    .refine(isEan13Valid, "La clé de contrôle du code EAN-13 est invalide"),
  quantity: quantityField,
  paperId: paperIdField,
  printerAddress: printerAddressField,
  rotated: rotatedField,
});