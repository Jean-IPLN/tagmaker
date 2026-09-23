import { z } from "zod";

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
  quantity: z
    .number({ error: "La quantité doit être un nombre" })
    .int("La quantité doit être un nombre entier")
    .min(1, "La quantité doit être au moins 1")
    .max(1000, "La quantité ne peut pas dépasser 1000"),
  paperId: z
    .string()
    .min(1, "Le format de papier est invalide")
    .optional(),
});