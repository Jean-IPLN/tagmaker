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
  LABEL_WIDTH_DOTS: 320,
  LABEL_HEIGHT_DOTS: 200,
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
});