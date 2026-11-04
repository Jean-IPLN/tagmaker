import { z } from "zod";

export const quantityField = z
  .number({ error: "La quantité doit être un nombre" })
  .int("La quantité doit être un nombre entier")
  .min(1, "La quantité doit être au moins 1")
  .max(1000, "La quantité ne peut pas dépasser 1000");

export const paperIdField = z
  .string()
  .min(1, "Le format de papier est invalide")
  .optional();

export const printerAddressField = z
  .ipv4({ error: "L'adresse IPv4 de l'imprimante est invalide" })
  .optional();

export const rotatedField = z.boolean().optional();
