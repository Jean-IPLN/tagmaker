import { env } from "@/lib/env";
import { labelRequestSchema } from "@/lib/ean13/validate";
import { isRotatable } from "@/lib/orientation";
import { sizeById } from "@/lib/paper-sizes";
import { sendToPrinter } from "@/lib/printer/send";
import {
  getPaperSizes,
  resolveDimensions,
} from "@/lib/zpl/dimensions";
import { buildEan13Zpl } from "@/lib/zpl/build";

let currentPrint: Promise<{ status: "sent"; quantity: number }> | null = null;

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

async function performPrint(
  ean13: string,
  quantity: number,
  paperId: string | undefined,
  printerAddress: string | undefined,
  rotated: boolean
): Promise<{ status: "sent"; quantity: number }> {
  const { widthDots, heightDots } = resolveDimensions(paperId);
  const zpl = buildEan13Zpl({
    ean13,
    quantity,
    widthDots,
    heightDots,
    rotated,
  });
  const target = printerAddress
    ? { host: printerAddress, port: env.ZPL_PRINTER_PORT }
    : undefined;
  await sendToPrinter(zpl, target);
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

const { ean13, quantity, paperId, printerAddress, rotated = false } =
  parsed.data;

  if (paperId && !sizeById(paperId, getPaperSizes())) {
    return errorResponse(
      422,
      "VALIDATION_ERROR",
      `Format de papier inconnu : ${paperId}.`
    );
  }

  if (rotated) {
    const sizes = getPaperSizes();
    const size = paperId ? sizeById(paperId, sizes) : sizes[0];
    if (!size || !isRotatable(size, env.ZPL_RESOLUTION_DPI)) {
      return errorResponse(
        422,
        "VALIDATION_ERROR",
        "Format inutilisable en orientation pivotée."
      );
    }
  }

  if (currentPrint) {
    return errorResponse(
      409,
      "PRINT_IN_PROGRESS",
      "Une impression est déjà en cours."
    );
  }

  const print = performPrint(
    ean13,
    quantity,
    paperId,
    printerAddress,
    rotated
  );
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