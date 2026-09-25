import { beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_RANGES } from "@/lib/location/code";

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

import { POST } from "@/app/api/print/location/route";

const SINGLE_BODY = {
  mode: "single",
  locationType: "classic",
  code: "1A5B",
  quantity: 5,
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/print/location", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/print/location — mode single", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("200 — renvoie { status: sent, labels } après envoi réussi (labels = quantity)", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(makeRequest(SINGLE_BODY));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "sent", labels: 5 });
    expect(sendMock).toHaveBeenCalledOnce();
    const zpl = sendMock.mock.calls[0][0] as string;
    expect(zpl).toContain("^FD1A5B^FS");
    expect(zpl).toContain("^PQ5");
  });

  it("422 — rejette un code #D en mode Classique", async () => {
    const response = await POST(
      makeRequest({ ...SINGLE_BODY, code: "1#D5" })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toMatch(/Dynamique/i);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — rejette un code hors nomenclature (0 en 2e position)", async () => {
    const response = await POST(
      makeRequest({ ...SINGLE_BODY, code: "1A05" })
    );

    expect(response.status).toBe(422);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — rejette une quantité hors 1..1000", async () => {
    const zero = await POST(makeRequest({ ...SINGLE_BODY, quantity: 0 }));
    const overflow = await POST(
      makeRequest({ ...SINGLE_BODY, quantity: 1001 })
    );

    expect(zero.status).toBe(422);
    expect(overflow.status).toBe(422);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — rejette un corps non JSON", async () => {
    const request = new Request("http://localhost/api/print/location", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "pas du json {",
    });

    const response = await POST(request);
    expect(response.status).toBe(422);
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/print/location — mode range (plages multiples)", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("200 — labels = somme des plages, un bloc par code, sans ^PQ", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({
        mode: "range",
        locationType: "classic",
        ranges: [
          { startCode: "1A10", endCode: "1A12" },
          { startCode: "1B10", endCode: "1B14" },
        ],
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "sent", labels: 8 });
    expect(sendMock).toHaveBeenCalledOnce();
    const zpl = sendMock.mock.calls[0][0] as string;
    for (const code of [
      "1A10",
      "1A11",
      "1A12",
      "1B10",
      "1B11",
      "1B12",
      "1B13",
      "1B14",
    ]) {
      expect(zpl).toContain(`^FD${code}^FS`);
    }
    expect(zpl.split("^XA").length - 1).toBe(8);
    expect(zpl).not.toContain("^PQ");
  });

  it("200 — préserve l'ordre d'affichage des plages (1re plage d'abord)", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({
        mode: "range",
        locationType: "classic",
        ranges: [
          { startCode: "1A90", endCode: "1A90" },
          { startCode: "1B90", endCode: "1B91" },
        ],
      })
    );

    expect(response.status).toBe(200);
    const zpl = sendMock.mock.calls[0][0] as string;
    expect(zpl.indexOf("^FD1A90")).toBeLessThan(zpl.indexOf("^FD1B90"));
  });

  it("200 — accepte un ensemble de plages dynamiques valides", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({
        mode: "range",
        locationType: "dynamic",
        ranges: [
          { startCode: "1#D0", endCode: "1#D2" },
          { startCode: "1#D3", endCode: "1#D7" },
        ],
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "sent", labels: 8 });
  });

  it("200 — imprime des plages de zones différentes (lots indépendants)", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({
        mode: "range",
        locationType: "classic",
        ranges: [
          { startCode: "1A10", endCode: "1A12" },
          { startCode: "2B10", endCode: "2B14" },
        ],
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "sent", labels: 8 });
    const zpl = sendMock.mock.calls[0][0] as string;
    expect(zpl).toContain("^FD1A10^FS");
    expect(zpl).toContain("^FD1A12^FS");
    expect(zpl).toContain("^FD2B10^FS");
    expect(zpl).toContain("^FD2B14^FS");
  });

  it(`422 — rejette plus de ${MAX_RANGES} plages`, async () => {
    const ranges = Array.from({ length: MAX_RANGES + 1 }, (_, index) => ({
      startCode: `1A${index}0`,
      endCode: `1A${index}1`,
    }));
    const response = await POST(
      makeRequest({ mode: "range", locationType: "classic", ranges })
    );

    expect(response.status).toBe(422);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — rejette un ensemble sans plage (ranges vide)", async () => {
    const response = await POST(
      makeRequest({ mode: "range", locationType: "classic", ranges: [] })
    );

    expect(response.status).toBe(422);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — rejette une plage inversée en désignant la plage", async () => {
    const response = await POST(
      makeRequest({
        mode: "range",
        locationType: "classic",
        ranges: [{ startCode: "1A15", endCode: "1A10" }],
      })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.message).toMatch(/fin|après/i);
    expect(body.error.message).toMatch(/Plage 1/);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("200 — accepte une plage traversant les espaces (1A10 → 1B10)", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({
        mode: "range",
        locationType: "classic",
        ranges: [{ startCode: "1A10", endCode: "1B10" }],
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "sent", labels: 2 });
    const zpl = sendMock.mock.calls[0][0] as string;
    expect(zpl).toContain("^FD1A10^FS");
    expect(zpl).toContain("^FD1B10^FS");
  });

  it("422 — rejette une plage traversant les zones (1A10 → 2A10)", async () => {
    const response = await POST(
      makeRequest({
        mode: "range",
        locationType: "classic",
        ranges: [{ startCode: "1A10", endCode: "2A10" }],
      })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.message).toMatch(/zone/i);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — rejette une somme de plages dépassant 1000 étiquettes", async () => {
    const response = await POST(
      makeRequest({
        mode: "range",
        locationType: "classic",
        ranges: [
          { startCode: "1A10", endCode: "1Z90" },
          { startCode: "1A10", endCode: "1ZZ0" },
        ],
      })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.message).toMatch(/1000/i);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — rejette une plage entre types différents", async () => {
    const response = await POST(
      makeRequest({
        mode: "range",
        locationType: "classic",
        ranges: [{ startCode: "1A10", endCode: "1#D5" }],
      })
    );

    expect(response.status).toBe(422);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("422 — désigne la plage fautive dans un ensemble multi-plages (Plage 2)", async () => {
    const response = await POST(
      makeRequest({
        mode: "range",
        locationType: "classic",
        ranges: [
          { startCode: "1A10", endCode: "1A12" },
          { startCode: "1A99", endCode: "1A90" },
        ],
      })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.message).toMatch(/Plage 2/);
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/print/location — matrice de refus (SC-002)", () => {
  const INVALID_CODES = [
    ["", "code vide"],
    ["X1", "trop court"],
    ["1A5BC", "trop long"],
    ["0A12", "1er caractère hors 1/2 (0)"],
    ["3B25", "1er caractère hors 1/2 (3)"],
    ["1a5b", "minuscules"],
    ["1É25", "accent"],
    ["1 A5", "espace"],
    ["1@45", "symbole hors #"],
    ["1A05", "0 interdit en 2e position du groupe lettre"],
  ];

  it.each(INVALID_CODES)(
    "422 — rejette %s (%s) sans toucher à l'imprimante",
    async (_code, label) => {
      expect(label).toBeTruthy();
      sendMock.mockReset();
      const response = await POST(
        makeRequest({ ...SINGLE_BODY, code: _code })
      );

      expect(response.status).toBe(422);
      expect(sendMock).not.toHaveBeenCalled();
    }
  );

  it.each(["0A12", "3B25"])(
    "422 — rejette la variante en mode range (%s)",
    async (code) => {
      sendMock.mockReset();
      const response = await POST(
        makeRequest({
          mode: "range",
          locationType: "classic",
          ranges: [{ startCode: code, endCode: "1A12" }],
        })
      );

      expect(response.status).toBe(422);
      expect(sendMock).not.toHaveBeenCalled();
    }
  );
});

describe("POST /api/print/location — garde & env", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("409 — bloque un second ordre pendant une impression en cours", async () => {
    sendMock.mockReturnValueOnce(createGate());

    const first = POST(makeRequest(SINGLE_BODY));
    await vi.waitFor(() => expect(sendMock).toHaveBeenCalledOnce());

    const second = await POST(makeRequest(SINGLE_BODY));
    expect(second.status).toBe(409);
    const body = await second.json();
    expect(body.error.code).toBe("PRINT_IN_PROGRESS");

    releaseGate();
    const firstResponse = await first;
    expect(firstResponse.status).toBe(200);
  });

  it("503 — signale une imprimante injoignable", async () => {
    sendMock.mockRejectedValueOnce(
      new Error("ECONNREFUSED: imprimante injoignable")
    );

    const response = await POST(makeRequest(SINGLE_BODY));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe("PRINTER_UNAVAILABLE");
  });

  it("200 — applique les dimensions du format de papier demandé (paperId)", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({ ...SINGLE_BODY, quantity: 2, paperId: "100x50" })
    );

    expect(response.status).toBe(200);
    const zpl = sendMock.mock.calls[0][0] as string;
    expect(zpl).toContain(`^PW${Math.round((100 * 203) / 25.4)}`);
    expect(zpl).toContain(`^LL${Math.round((50 * 203) / 25.4)}`);
  });

  it("422 — rejette un paperId inconnu du serveur", async () => {
    const response = await POST(
      makeRequest({ ...SINGLE_BODY, quantity: 1, paperId: "999x999" })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("200 — sans paperId, utilise le format par défaut (plus petite surface)", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({ ...SINGLE_BODY, quantity: 1 })
    );

    expect(response.status).toBe(200);
    const zpl = sendMock.mock.calls[0][0] as string;
    expect(zpl).toContain(`^PW${Math.round((40 * 203) / 25.4)}`);
    expect(zpl).toContain(`^LL${Math.round((25 * 203) / 25.4)}`);
  });

  it("200 — envoie vers l'adresse d'imprimante demandée (printerAddress)", async () => {
    sendMock.mockResolvedValueOnce({ status: "sent" });
    const response = await POST(
      makeRequest({
        ...SINGLE_BODY,
        quantity: 1,
        printerAddress: "192.168.1.99",
      })
    );

    expect(response.status).toBe(200);
    expect(sendMock).toHaveBeenCalledWith(expect.any(String), {
      host: "192.168.1.99",
      port: 9100,
    });
  });

  it("422 — rejette une printerAddress mal formée", async () => {
    const response = await POST(
      makeRequest({
        ...SINGLE_BODY,
        quantity: 1,
        printerAddress: "imprimante.salle",
      })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(sendMock).not.toHaveBeenCalled();
  });
});