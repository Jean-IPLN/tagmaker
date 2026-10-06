import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock("@/lib/printer/send", () => ({
  sendToPrinter: sendMock,
}));

vi.mock("@/lib/env", () => ({
  env: {
    ZPL_PRINTER_HOST: "192.168.1.63",
    ZPL_PRINTER_PORT: 9100,
    ZPL_RESOLUTION_DPI: 203,
    ZPL_PAPER_SIZES: "20x20, 100x150",
    ZPL_SCAN_SUBNET: undefined,
  },
}));

import { POST } from "@/app/api/print/ean13/route";

const EAN13 = "5901234123457";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/print/ean13", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/print/ean13 — garde d'orientation (US3)", () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ status: "sent" });
  });

  it("200 — imprime pivoté sur un format rotatable, en ^BEB", async () => {
    const response = await POST(
      makeRequest({ ean13: EAN13, quantity: 1, paperId: "100x150", rotated: true })
    );

    expect(response.status).toBe(200);
    const zpl = sendMock.mock.calls[0][0] as string;
    expect(zpl).toMatch(/\^BEB,/);
    expect(zpl).not.toMatch(/\^BEN,/);
  });

  it("200 — rotated: false conserve l'orientation normale (^BEN)", async () => {
    const response = await POST(
      makeRequest({ ean13: EAN13, quantity: 1, paperId: "100x150", rotated: false })
    );

    expect(response.status).toBe(200);
    expect(sendMock.mock.calls[0][0] as string).toMatch(/\^BEN,/);
  });

  it("422 — rejette rotated: true sur un format non rotatable (20x20)", async () => {
    const response = await POST(
      makeRequest({ ean13: EAN13, quantity: 1, paperId: "20x20", rotated: true })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toMatch(/pivotée/i);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — rejette rotated: true sans paperId quand le défaut n'est pas rotatable", async () => {
    const response = await POST(
      makeRequest({ ean13: EAN13, quantity: 1, rotated: true })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — rejette une valeur non booléenne pour rotated", async () => {
    const response = await POST(
      makeRequest({ ean13: EAN13, quantity: 1, rotated: "true" })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("200 — sans rotated ni format, le comportement actuel est inchangé", async () => {
    const response = await POST(makeRequest({ ean13: EAN13, quantity: 1 }));

    expect(response.status).toBe(200);
    expect(sendMock.mock.calls[0][0] as string).toMatch(/\^BEN,/);
  });
});