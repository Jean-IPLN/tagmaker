import { LABEL_HEIGHT_DOTS, LABEL_WIDTH_DOTS } from "@/lib/env";
import { labelRequestSchema } from "@/lib/ean13/validate";
import { sendToPrinter } from "@/lib/printer/send";
import { buildEan13Zpl } from "@/lib/zpl/build";

let currentPrint: Promise<{ status: "sent"; quantity: number }> | null = null;

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

async function performPrint(
  ean13: string,
  quantity: number
): Promise<{ status: "sent"; quantity: number }> {
  const zpl = buildEan13Zpl({
    ean13,
    quantity,
    widthDots: LABEL_WIDTH_DOTS,
    heightDots: LABEL_HEIGHT_DOTS,
  });
  await sendToPrinter(zpl);
  return { status: "sent", quantity };
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      422,
      "VALIDATION_ERROR",
      "Le corps de la requête doit être un JSON valide."
    );
  }

  const parsed = labelRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Saisie invalide.";
    return errorResponse(422, "VALIDATION_ERROR", message);
  }

  if (currentPrint) {
    return errorResponse(
      409,
      "PRINT_IN_PROGRESS",
      "Une impression est déjà en cours, veuillez patienter."
    );
  }

  const { ean13, quantity } = parsed.data;
  const print = performPrint(ean13, quantity);
  currentPrint = print;

  try {
    const result = await print;
    return Response.json(result);
  } catch {
    return errorResponse(
      503,
      "PRINTER_UNAVAILABLE",
      "Imprimante injoignable ou envoi échoué."
    );
  } finally {
    currentPrint = null;
  }
}