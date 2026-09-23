import {
  deriveScanSubnet,
  discoverPrinters,
} from "@/lib/printer/discovery";

export async function GET(): Promise<Response> {
  if (!deriveScanSubnet()) {
    return Response.json(
      {
        error: {
          code: "SCAN_UNAVAILABLE",
          message:
            "Sous-réseau indéterminable : configurez une adresse IP d'imprimante.",
        },
      },
      { status: 503 }
    );
  }

  const printers = await discoverPrinters();
  return Response.json({ printers });
}