import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("@/lib/printer/send", () => ({
  sendToPrinter: sendMock,
}));

vi.mock("@/lib/env", () => ({
  env: {
    ZPL_PRINTER_HOST: "192.168.1.63",
    ZPL_PRINTER_PORT: 9100,
    ZPL_RESOLUTION_DPI: 203,
    ZPL_PAPER_SIZES: "40x25, 100x50",
    ZPL_SCAN_SUBNET: undefined,
  },
}));

import { POST } from "@/app/api/print/code128/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/print/code128", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/print/code128 — tenue sur le support", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("422 — 10 caractères en 40 × 25 mm dépassent la limite de 9", async () => {
    const response = await POST(
      makeRequest({
        content: "ABCDEFGHIJ",
        quantity: 1,
        paperId: "40x25",
      })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe(
      "Le contenu ne tient pas sur ce format (9 caractères max)."
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — 5 caractères pivotés en 40 × 25 mm dépassent la limite de 4", async () => {
    const response = await POST(
      makeRequest({
        content: "ABCDE",
        quantity: 1,
        paperId: "40x25",
        rotated: true,
      })
    );

    expect(response.status).toBe(422);
    expect((await response.json()).error.message).toBe(
      "Le contenu ne tient pas sur ce format (4 caractères max)."
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("200 — un contenu pile à la limite est imprimé", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({
        content: "ABCDEFGHI",
        quantity: 1,
        paperId: "40x25",
      })
    );

    expect(response.status).toBe(200);
    expect(sendMock).toHaveBeenCalledOnce();
    expect(sendMock.mock.calls[0][0]).toContain("^FDABCDEFGHI^FS");
  });

  it("200 — un contenu long tient sur un grand format", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({
        content: "A".repeat(31),
        quantity: 1,
        paperId: "100x50",
      })
    );

    expect(response.status).toBe(200);
    expect(sendMock).toHaveBeenCalledOnce();
  });
});
