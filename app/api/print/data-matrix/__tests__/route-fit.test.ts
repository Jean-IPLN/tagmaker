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
    ZPL_PAPER_SIZES: "40x25, 75x25, 100x50, 100x150",
    ZPL_SCAN_SUBNET: undefined,
  },
}));

import { POST } from "@/app/api/print/data-matrix/route";

const FIT_MESSAGE =
  "Le contenu ou la légende ne tient pas sur ce format. " +
  "Raccourcissez ou changez de format.";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/print/data-matrix", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/print/data-matrix — tenue sur le support", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("422 — contenu 200 + légende 60 en 40 × 25 mm", async () => {
    const response = await POST(
      makeRequest({
        content: "A".repeat(200),
        legend: "L".repeat(60),
        quantity: 1,
        paperId: "40x25",
      })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe(FIT_MESSAGE);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — légende pivotée de 13 caractères en 40 × 25 mm", async () => {
    const response = await POST(
      makeRequest({
        content: "1A2B",
        legend: "L".repeat(13),
        quantity: 1,
        paperId: "40x25",
        rotated: true,
      })
    );

    expect(response.status).toBe(422);
    expect((await response.json()).error.message).toBe(FIT_MESSAGE);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("200 — légende de 20 caractères pile en 40 × 25 mm", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({
        content: "A",
        legend: "L".repeat(20),
        quantity: 1,
        paperId: "40x25",
      })
    );

    expect(response.status).toBe(200);
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("200 — légende de 12 caractères pivotée pile en 40 × 25 mm", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({
        content: "A",
        legend: "L".repeat(12),
        quantity: 1,
        paperId: "40x25",
        rotated: true,
      })
    );

    expect(response.status).toBe(200);
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("200 — légende de 52 caractères en 100 × 150 mm", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({
        content: "A",
        legend: "L".repeat(52),
        quantity: 1,
        paperId: "100x150",
      })
    );

    expect(response.status).toBe(200);
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("200 — légende de 60 caractères pivotée en 100 × 150 mm", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({
        content: "A",
        legend: "L".repeat(60),
        quantity: 1,
        paperId: "100x150",
        rotated: true,
      })
    );

    expect(response.status).toBe(200);
    expect(sendMock).toHaveBeenCalledOnce();
  });
});
