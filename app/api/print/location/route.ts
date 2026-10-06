import { env } from "@/lib/env";
import { locationRequestSchema } from "@/lib/location/validate";
import { expandRanges } from "@/lib/location/validate";
import type {
  RangePair,
  RangesLocationRequest,
  SingleLocationRequest,
} from "@/lib/location/validate";
import { isRotatable } from "@/lib/orientation";
import { sizeById } from "@/lib/paper-sizes";
import { sendToPrinter } from "@/lib/printer/send";
import {
  getPaperSizes,
  resolveDimensions,
} from "@/lib/zpl/dimensions";
import { buildLocationZpl } from "@/lib/zpl/location";

let currentPrint: Promise<{ status: "sent"; labels: number }> | null = null;

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

function buildSingleZpl(
  request: SingleLocationRequest,
  widthDots: number,
  heightDots: number,
  rotated: boolean
): string {
  return buildLocationZpl({
    codes: [request.code],
    quantity: request.quantity,
    widthDots,
    heightDots,
    rotated,
  });
}

function buildRangesZpl(
  ranges: readonly RangePair[],
  widthDots: number,
  heightDots: number,
  rotated: boolean
): { zpl: string; labels: number } {
  const codes = expandRanges(ranges);
  return {
    zpl: buildLocationZpl({ codes, widthDots, heightDots, rotated }),
    labels: codes.length,
  };
}

async function performPrint(
  body: SingleLocationRequest | RangesLocationRequest,
  paperId: string | undefined,
  printerAddress: string | undefined,
  rotated: boolean
): Promise<{ status: "sent"; labels: number }> {
  const { widthDots, heightDots } = resolveDimensions(paperId);
  const target = printerAddress
    ? { host: printerAddress, port: env.ZPL_PRINTER_PORT }
    : undefined;

  let zpl: string;
  let labels: number;
  if (body.mode === "range") {
    const range = buildRangesZpl(
      body.ranges,
      widthDots,
      heightDots,
      rotated
    );
    zpl = range.zpl;
    labels = range.labels;
  } else {
    zpl = buildSingleZpl(body, widthDots, heightDots, rotated);
    labels = body.quantity;
  }

  await sendToPrinter(zpl, target);
  return { status: "sent", labels };
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

  const parsed = locationRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Saisie invalide.";
    return errorResponse(422, "VALIDATION_ERROR", message);
  }

  const { paperId, printerAddress, rotated = false } = parsed.data;

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

  const print = performPrint(parsed.data, paperId, printerAddress, rotated);
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