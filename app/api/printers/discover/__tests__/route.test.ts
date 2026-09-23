import { beforeEach, describe, expect, it, vi } from "vitest";

const { discoveryMocks } = vi.hoisted(() => ({
  discoveryMocks: {
    deriveScanSubnet: vi.fn(() => "192.168.1."),
    discoverPrinters: vi.fn(),
  },
}));

vi.mock("@/lib/printer/discovery", () => ({
  deriveScanSubnet: discoveryMocks.deriveScanSubnet,
  discoverPrinters: discoveryMocks.discoverPrinters,
}));

import { GET } from "@/app/api/printers/discover/route";

describe("GET /api/printers/discover", () => {
  beforeEach(() => {
    discoveryMocks.deriveScanSubnet.mockReturnValue("192.168.1.");
    discoveryMocks.discoverPrinters.mockReset();
  });

  it("200 — retourne la liste des imprimantes détectées", async () => {
    discoveryMocks.discoverPrinters.mockResolvedValue([
      { address: "192.168.1.77", port: 9100, hostname: "etiketto" },
      { address: "192.168.1.99", port: 9100 },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      printers: [
        { address: "192.168.1.77", port: 9100, hostname: "etiketto" },
        { address: "192.168.1.99", port: 9100 },
      ],
    });
  });

  it("200 — retourne une liste vide si aucun appareil n'accepte le port", async () => {
    discoveryMocks.discoverPrinters.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ printers: [] });
  });

  it("503 — signale un scan impossible si le sous-réseau est indéterminable", async () => {
    discoveryMocks.deriveScanSubnet.mockReturnValue(null as unknown as string);

    const response = await GET();

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe("SCAN_UNAVAILABLE");
    expect(discoveryMocks.discoverPrinters).not.toHaveBeenCalled();
  });
});