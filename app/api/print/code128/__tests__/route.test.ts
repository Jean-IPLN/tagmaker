import { beforeEach, describe, expect, it, vi } from "vitest";

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
    ZPL_PAPER_SIZES: "40x25, 50x25, 60x40, 100x50",
    ZPL_SCAN_SUBNET: undefined,
  },
}));

import { POST } from "@/app/api/print/code128/route";

const VALID_BODY = {
  content: "PALETTE-42",
  quantity: 1,
  paperId: "100x50",
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/print/code128", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/print/code128", () => {
  beforeEach(() => {
    sendMock.mockReset();
    releaseGate();
  });

  it("200 — envoie le Code 128 et renvoie { status: sent, labels }", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(makeRequest(VALID_BODY));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "sent", labels: 1 });
    expect(sendMock).toHaveBeenCalledOnce();
    const zpl = sendMock.mock.calls[0][0] as string;
    expect(zpl).toContain("^FDPALETTE-42^FS");
    expect(zpl).toContain("^PQ1");
  });

  it("200 — la quantité est propagée dans ^PQ et labels", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({ ...VALID_BODY, quantity: 7 })
    );

    expect(await response.json()).toEqual({ status: "sent", labels: 7 });
    expect(sendMock.mock.calls[0][0]).toContain("^PQ7");
  });

  it("422 — rejette un contenu vide ou invalide sans envoi", async () => {
    const empty = await POST(makeRequest({ ...VALID_BODY, content: "  " }));
    const accented = await POST(
      makeRequest({ ...VALID_BODY, content: "café" })
    );

    expect(empty.status).toBe(422);
    expect(accented.status).toBe(422);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — rejette un corps non JSON", async () => {
    const request = new Request("http://localhost/api/print/code128", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "pas du json {",
    });

    const response = await POST(request);
    expect(response.status).toBe(422);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("409 — refuse une seconde impression concurrente", async () => {
    sendMock.mockReturnValueOnce(createGate());
    const first = POST(makeRequest(VALID_BODY));
    const second = await POST(makeRequest(VALID_BODY));

    expect(second.status).toBe(409);
    releaseGate();
    await first;
  });

  it("503 — renvoie une erreur explicite si l'envoi échoue", async () => {
    sendMock.mockRejectedValueOnce(new Error("socket"));
    const response = await POST(makeRequest(VALID_BODY));

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe("PRINTER_UNAVAILABLE");
  });
});
