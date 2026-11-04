import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { sendMock, createGate, releaseGate } = vi.hoisted(() => {
  let release: (() => void) | undefined;
  const createGate = () =>
    new Promise<void>((resolve) => {
      release = resolve;
    });
  return {
    sendMock: vi.fn(),
    createGate,
    releaseGate: () => release?.(),
  };
});

vi.mock("@/lib/printer/send", () => ({
  sendToPrinter: sendMock,
}));

vi.mock("@/lib/env", () => ({
  env: {
    ZPL_PRINTER_HOST: "192.168.1.63",
    ZPL_PRINTER_PORT: 9100,
    ZPL_RESOLUTION_DPI: 203,
    ZPL_PAPER_SIZES: "10x10, 40x25, 100x50",
    ZPL_SCAN_SUBNET: undefined,
  },
}));

import { createPrintPostHandler } from "@/lib/print/route-handler";

const schema = z.object({
  value: z.string().min(1, "La valeur est requise"),
  paperId: z.string().min(1).optional(),
  printerAddress: z.ipv4().optional(),
  rotated: z.boolean().optional(),
});

function makeHandler() {
  return createPrintPostHandler({
    schema,
    build: (data, { widthDots, heightDots, rotated }) => ({
      zpl: `^XA^FD${data.value}^FS^PW${widthDots}^LL${heightDots}^XZ`,
      body: { status: "sent", rotated },
    }),
    validate: (data, { widthDots }) =>
      data.value.length > widthDots
        ? { code: "VALIDATION_ERROR", message: "Trop long." }
        : null,
  });
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/print/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("createPrintPostHandler", () => {
  beforeEach(() => {
    sendMock.mockReset();
    releaseGate();
  });

  it("200 — envoie le ZPL et renvoie le corps du builder", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const POST = makeHandler();

    const response = await POST(makeRequest({ value: "ABC" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "sent", rotated: false });
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("422 — JSON invalide, validation du schéma, papier inconnu et hook", async () => {
    const POST = makeHandler();

    const invalidJson = await POST(
      new Request("http://localhost/api/print/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "pas du json {",
      })
    );
    const invalidSchema = await POST(makeRequest({ value: "" }));
    const unknownPaper = await POST(
      makeRequest({ value: "ABC", paperId: "z99" })
    );
    const hook = await POST(makeRequest({ value: "x".repeat(500) }));

    expect(invalidJson.status).toBe(422);
    expect(invalidSchema.status).toBe(422);
    expect(unknownPaper.status).toBe(422);
    expect(hook.status).toBe(422);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — orientation pivotée refusée sur un format trop petit", async () => {
    const POST = makeHandler();

    const response = await POST(
      makeRequest({ value: "ABC", paperId: "10x10", rotated: true })
    );

    expect(response.status).toBe(422);
    expect((await response.json()).error.message).toMatch(/pivotée/);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("409 — refuse une seconde impression concurrente", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    sendMock.mockReturnValueOnce(createGate());
    const POST = makeHandler();

    const first = POST(makeRequest({ value: "ABC" }));
    const second = await POST(makeRequest({ value: "ABC" }));

    expect(second.status).toBe(409);
    releaseGate();
    await first;
  });

  it("503 — renvoie une erreur explicite si l'envoi échoue", async () => {
    sendMock.mockRejectedValueOnce(new Error("socket"));
    const POST = makeHandler();

    const response = await POST(makeRequest({ value: "ABC" }));

    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("PRINTER_UNAVAILABLE");
  });
});
