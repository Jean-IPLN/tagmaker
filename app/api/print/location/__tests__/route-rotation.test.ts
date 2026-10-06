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

import { POST } from "@/app/api/print/location/route";

const SINGLE = {
  mode: "single",
  locationType: "classic",
  code: "1A5B",
  quantity: 1,
};

const RANGE = {
  mode: "range",
  locationType: "classic",
  ranges: [{ startCode: "1A10", endCode: "1A12" }],
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/print/location", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/print/location — garde d'orientation (US3)", () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ status: "sent" });
  });

  it("200 — imprime pivoté sur un format rotatable (single, ^BCB)", async () => {
    const response = await POST(
      makeRequest({
        ...SINGLE,
        paperId: "100x150",
        rotated: true,
      })
    );

    expect(response.status).toBe(200);
    const zpl = sendMock.mock.calls[0][0] as string;
    expect(zpl).toMatch(/\^BCB,/);
    expect(zpl).not.toMatch(/\^BCN,/);
  });

  it("200 — imprime pivoté sur un format rotatable (range)", async () => {
    const response = await POST(
      makeRequest({
        ...RANGE,
        paperId: "100x150",
        rotated: true,
      })
    );

    expect(response.status).toBe(200);
    const zpl = sendMock.mock.calls[0][0] as string;
    expect(zpl).toMatch(/\^BCB,/);
  });

  it("422 — rejette rotated: true sur un format non rotatable (20x20)", async () => {
    const response = await POST(
      makeRequest({
        ...SINGLE,
        paperId: "20x20",
        rotated: true,
      })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toMatch(/pivotée/i);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — rejette rotated: true sans paperId quand le défaut n'est pas rotatable", async () => {
    const response = await POST(
      makeRequest({ ...SINGLE, rotated: true })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — rejette une valeur non booléenne pour rotated (single et range)", async () => {
    const singleResponse = await POST(
      makeRequest({ ...SINGLE, rotated: 1 })
    );
    expect(singleResponse.status).toBe(422);

    const rangeResponse = await POST(
      makeRequest({ ...RANGE, rotated: "yes" })
    );
    expect(rangeResponse.status).toBe(422);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("200 — sans rotated ni format, le comportement actuel est inchangé", async () => {
    const response = await POST(makeRequest(SINGLE));

    expect(response.status).toBe(200);
    expect(sendMock.mock.calls[0][0] as string).toMatch(/\^BCN,/);
  });
});