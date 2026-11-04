"use client";

import { toast } from "sonner";

import { readPrintSettings } from "@/lib/print-settings-cookie";

const NO_PRINTER_MESSAGE =
  "Aucune imprimante sélectionnée. Choisissez une imprimante dans les paramètres.";

export async function sendPrintRequest(
  endpoint: string,
  body: Record<string, unknown>,
  labels: number
): Promise<void> {
  const settings = readPrintSettings();
  if (!settings.printerAddress) {
    toast.error(NO_PRINTER_MESSAGE);
    return;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...body,
        ...(settings.paperId ? { paperId: settings.paperId } : {}),
        printerAddress: settings.printerAddress,
        ...(settings.rotated ? { rotated: true } : {}),
      }),
    });

    const data: { error?: { message?: string } } | null = await response
      .json()
      .catch(() => null);

    if (response.ok) {
      toast.success(
        `Impression envoyée (${labels} étiquette${labels > 1 ? "s" : ""})`
      );
      return;
    }

    const message = data?.error?.message ?? "L'impression a échoué.";
    if (response.status === 503) {
      toast.error(`Imprimante injoignable : ${message}`);
    } else {
      toast.error(message);
    }
  } catch {
    toast.error("Erreur réseau : impossible de joindre le serveur.");
  }
}
