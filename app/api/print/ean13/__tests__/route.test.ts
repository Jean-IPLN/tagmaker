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
  },
}));

import { POST } from "@/app/api/print/ean13/route";

const VALID_BODY = { ean13: "5901234123457", quantity: 5 };

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/print/ean13", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/print/ean13", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("200 — renvoie { status: sent, quantity } après envoi réussi", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(makeRequest(VALID_BODY));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "sent", quantity: 5 });
    expect(sendMock).toHaveBeenCalledOnce();
    expect(sendMock.mock.calls[0][0]).toContain("^PQ5");
  });

  it("422 — rejette un EAN-13 à la mauvaise clé", async () => {
    const response = await POST(
      makeRequest({ ean13: "5901234123456", quantity: 1 })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — rejette une quantité supérieure à 1000", async () => {
    const response = await POST(
      makeRequest({ ean13: "5901234123457", quantity: 1001 })
    );

    expect(response.status).toBe(422);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — rejette une quantité nulle", async () => {
    const response = await POST(
      makeRequest({ ean13: "5901234123457", quantity: 0 })
    );

    expect(response.status).toBe(422);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — rejette un corps non JSON", async () => {
    const request = new Request("http://localhost/api/print/ean13", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "pas du json {",
    });

    const response = await POST(request);
    expect(response.status).toBe(422);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("409 — bloque un second ordre pendant une impression en cours", async () => {
    sendMock.mockReturnValueOnce(createGate());

    const first = POST(makeRequest(VALID_BODY));
    await vi.waitFor(() => expect(sendMock).toHaveBeenCalledOnce());

    const second = await POST(makeRequest(VALID_BODY));
    expect(second.status).toBe(409);
    const body = await second.json();
    expect(body.error.code).toBe("PRINT_IN_PROGRESS");

    releaseGate();
    const firstResponse = await first;
    expect(firstResponse.status).toBe(200);
  });

  it("503 — signale une imprimante injoignable", async () => {
    sendMock.mockRejectedValueOnce(new Error("ECONNREFUSED: imprimante injoignable"));

    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe("PRINTER_UNAVAILABLE");
  });

  it("200 — applique les dimensions du format de papier demandé (paperId)", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({ ean13: "5901234123457", quantity: 2, paperId: "100x50" })
    );

    expect(response.status).toBe(200);
    const zpl = sendMock.mock.calls[0][0] as string;
    expect(zpl).toContain(`^PW${Math.round((100 * 203) / 25.4)}`);
    expect(zpl).toContain(`^LL${Math.round((50 * 203) / 25.4)}`);
  });

  it("422 — rejette un paperId inconnu du serveur", async () => {
    const response = await POST(
      makeRequest({ ean13: "5901234123457", quantity: 1, paperId: "999x999" })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("200 — sans paperId, utilise le format par défaut (plus petite surface)", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({ ean13: "5901234123457", quantity: 1 })
    );

    expect(response.status).toBe(200);
    const zpl = sendMock.mock.calls[0][0] as string;
    expect(zpl).toContain(`^PW${Math.round((40 * 203) / 25.4)}`);
    expect(zpl).toContain(`^LL${Math.round((25 * 203) / 25.4)}`);
  });
});