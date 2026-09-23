import { env } from "@/lib/env";
import { labelRequestSchema } from "@/lib/ean13/validate";
import {
  DEFAULT_PAPER_SIZE,
  parsePaperSizes,
  sizeById,
} from "@/lib/paper-sizes";
import { sendToPrinter } from "@/lib/printer/send";
import { buildEan13Zpl } from "@/lib/zpl/build";

let currentPrint: Promise<{ status: "sent"; quantity: number }> | null = null;

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

function dotsFromMm(millimeters: number): number {
  return Math.round((millimeters * env.ZPL_RESOLUTION_DPI) / 25.4);
}

function getPaperSizes() {
  return parsePaperSizes(env.ZPL_PAPER_SIZES, DEFAULT_PAPER_SIZE);
}

function resolveDimensions(paperId: string | undefined): {
  widthDots: number;
  heightDots: number;
} {
  const sizes = getPaperSizes();
  const size = paperId ? sizeById(paperId, sizes) : sizes[0];
  if (!size) {
    throw new Error("Aucun format de papier disponible.");
  }
  return {
    widthDots: dotsFromMm(size.widthMm),
    heightDots: dotsFromMm(size.heightMm),
  };
}

async function performPrint(
  ean13: string,
  quantity: number,
  paperId: string | undefined
): Promise<{ status: "sent"; quantity: number }> {
  const { widthDots, heightDots } = resolveDimensions(paperId);
  const zpl = buildEan13Zpl({
    ean13,
    quantity,
    widthDots,
    heightDots,
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

const { ean13, quantity, paperId } = parsed.data;

  if (paperId && !sizeById(paperId, getPaperSizes())) {
    return errorResponse(
      422,
      "VALIDATION_ERROR",
      `Format de papier inconnu : ${paperId}.`
    );
  }

  if (currentPrint) {
    return errorResponse(
      409,
      "PRINT_IN_PROGRESS",
      "Une impression est déjà en cours."
    );
  }

  const print = performPrint(ean13, quantity, paperId);
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