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
    ZPL_PAPER_SIZES: "10x10, 40x25, 75x25, 100x50, 100x150",
    ZPL_SCAN_SUBNET: undefined,
  },
}));

import { POST } from "@/app/api/print/data-matrix/route";

const VALID_BODY = {
  content: "REF-2026-A17",
  legend: "Palette 42",
  quantity: 1,
  paperId: "40x25",
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/print/data-matrix", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/print/data-matrix", () => {
  beforeEach(() => {
    sendMock.mockReset();
    releaseGate();
  });

  it("200 — envoie le Data Matrix et la légende", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(makeRequest(VALID_BODY));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "sent", labels: 1 });
    expect(sendMock).toHaveBeenCalledOnce();
    const zpl = sendMock.mock.calls[0][0] as string;
    expect(zpl).toContain("^BXN,6,200,16,16,6,_,1");
    expect(zpl).toContain("^FDREF-2026-A17^FS");
    expect(zpl).toContain("^FDPalette 42^FS");
    expect(zpl).toContain("^PQ1");
  });

  it("200 — propage la quantité dans ^PQ et labels", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({ ...VALID_BODY, quantity: 7 })
    );

    expect(await response.json()).toEqual({ status: "sent", labels: 7 });
    expect(sendMock.mock.calls[0][0]).toContain("^PQ7");
  });

  it("200 — omet le champ texte quand la légende est absente", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({
        content: "12345678",
        quantity: 1,
        paperId: "40x25",
      })
    );

    expect(response.status).toBe(200);
    const zpl = sendMock.mock.calls[0][0] as string;
    expect(zpl).not.toContain("^AEN");
    expect(zpl).not.toContain("^FB");
  });

  it("200 — place la légende à droite en in-line", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({ ...VALID_BODY, inline: true })
    );

    expect(response.status).toBe(200);
    const zpl = sendMock.mock.calls[0][0] as string;
    expect(zpl).toContain("^FO19,36^BXN,8,200,16,16,6,_,1");
    expect(zpl).toContain(
      "^FO151,86^AEN,28,13^FB161,1,0,L^FDPalette 42^FS"
    );
    expect(zpl).not.toContain("^AEB");
  });

  it("200 — l'orientation pivotée reste prioritaire sur l'in-line", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({ ...VALID_BODY, rotated: true, inline: true })
    );

    expect(response.status).toBe(200);
    const zpl = sendMock.mock.calls[0][0] as string;
    expect(zpl).toContain("^BXB");
    expect(zpl).toContain("^AEB");
    expect(zpl).not.toContain("^BXN");
  });

  it("422 — refuse une valeur inline non booléenne", async () => {
    const response = await POST(
      makeRequest({ ...VALID_BODY, inline: "true" })
    );

    expect(response.status).toBe(422);
    expect((await response.json()).error.message).toBe(
      "Le mode d'affichage est invalide"
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("200 — imprime en orientation pivotée", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({
        content: "1A2B",
        legend: "Zone A",
        quantity: 1,
        paperId: "40x25",
        rotated: true,
      })
    );

    expect(response.status).toBe(200);
    expect(sendMock.mock.calls[0][0]).toContain("^BXB");
  });

  it("422 — rejette un contenu, une légende ou une quantité invalides", async () => {
    const empty = await POST(makeRequest({ ...VALID_BODY, content: "  " }));
    const accented = await POST(
      makeRequest({ ...VALID_BODY, content: "café" })
    );
    const longLegend = await POST(
      makeRequest({ ...VALID_BODY, legend: "L".repeat(61) })
    );
    const zero = await POST(makeRequest({ ...VALID_BODY, quantity: 0 }));

    expect(empty.status).toBe(422);
    expect(accented.status).toBe(422);
    expect(longLegend.status).toBe(422);
    expect(zero.status).toBe(422);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — refuse un champ inconnu", async () => {
    const response = await POST(
      makeRequest({ ...VALID_BODY, mode: "range" })
    );

    expect(response.status).toBe(422);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — rejette un corps non JSON", async () => {
    const request = new Request("http://localhost/api/print/data-matrix", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "pas du json {",
    });

    const response = await POST(request);
    expect(response.status).toBe(422);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — refuse un format inconnu", async () => {
    const response = await POST(
      makeRequest({ ...VALID_BODY, paperId: "99x99" })
    );

    expect(response.status).toBe(422);
    expect((await response.json()).error.message).toBe(
      "Format de papier inconnu : 99x99."
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — refuse la rotation sur un format non pivotable", async () => {
    const response = await POST(
      makeRequest({
        content: "A",
        quantity: 1,
        paperId: "10x10",
        rotated: true,
      })
    );

    expect(response.status).toBe(422);
    expect((await response.json()).error.message).toBe(
      "Format inutilisable en orientation pivotée."
    );
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
