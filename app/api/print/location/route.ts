import { env } from "@/lib/env";
import { locationRequestSchema } from "@/lib/location/validate";
import { expandRanges } from "@/lib/location/validate";
import type {
  RangePair,
  RangesLocationRequest,
  SingleLocationRequest,
} from "@/lib/location/validate";
import {
  DEFAULT_PAPER_SIZE,
  parsePaperSizes,
  sizeById,
} from "@/lib/paper-sizes";
import { sendToPrinter } from "@/lib/printer/send";
import { buildLocationZpl } from "@/lib/zpl/location";

let currentPrint: Promise<{ status: "sent"; labels: number }> | null = null;

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

function buildSingleZpl(
  request: SingleLocationRequest,
  widthDots: number,
  heightDots: number
): string {
  return buildLocationZpl({
    codes: [request.code],
    quantity: request.quantity,
    widthDots,
    heightDots,
  });
}

function buildRangesZpl(
  ranges: readonly RangePair[],
  widthDots: number,
  heightDots: number
): { zpl: string; labels: number } {
  const codes = expandRanges(ranges);
  return {
    zpl: buildLocationZpl({ codes, widthDots, heightDots }),
    labels: codes.length,
  };
}

async function performPrint(
  body: SingleLocationRequest | RangesLocationRequest,
  paperId: string | undefined,
  printerAddress: string | undefined
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
      heightDots
    );
    zpl = range.zpl;
    labels = range.labels;
  } else {
    zpl = buildSingleZpl(body, widthDots, heightDots);
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

  const { paperId, printerAddress } = parsed.data;

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

  const print = performPrint(parsed.data, paperId, printerAddress);
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