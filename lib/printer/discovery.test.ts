import { EventEmitter } from "node:events";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { createConnectionMock, networkInterfacesMock } = vi.hoisted(() => ({
  createConnectionMock: vi.fn(),
  networkInterfacesMock: vi.fn(),
}));

const { envConfig } = vi.hoisted(() => ({
  envConfig: {
    ZPL_PRINTER_HOST: "192.168.1.63",
    ZPL_PRINTER_PORT: 9100,
    ZPL_RESOLUTION_DPI: 203,
    ZPL_PAPER_SIZES: "40x25, 50x25, 60x40, 100x50",
    ZPL_SCAN_SUBNET: undefined as string | undefined,
  },
}));

vi.mock("node:net", () => ({
  default: { createConnection: createConnectionMock },
  createConnection: createConnectionMock,
}));

vi.mock("node:os", () => ({
  default: { networkInterfaces: networkInterfacesMock },
  networkInterfaces: networkInterfacesMock,
}));

vi.mock("@/lib/env", () => ({ env: envConfig }));

import {
  buildScanTargets,
  deriveScanSubnet,
  discoverPrinters,
  getLocalIpAddresses,
  probePort,
} from "@/lib/printer/discovery";

class FakeSocket extends EventEmitter {
  destroyed = false;
  setWriteTimes = 0;

  destroy() {
    this.destroyed = true;
    this.emit("close");
  }

  removeAllListeners() {
    return this;
  }

  setTimeout() {
    return this;
  }

  write() {
    this.setWriteTimes += 1;
    return true;
  }
}

function socketOpening(): FakeSocket {
  const socket = new FakeSocket();
  process.nextTick(() => socket.emit("connect"));
  return socket;
}

function socketRefusing(): FakeSocket {
  const socket = new FakeSocket();
  process.nextTick(() => socket.emit("error", new Error("ECONNREFUSED")));
  return socket;
}

function localInterfaces(addresses: string[]): Record<string, unknown[]> {
  return {
    eth0: addresses.map((address) => ({
      address,
      netmask: "255.255.255.0",
      family: "IPv4",
      mac: "00:00:00:00:00:00",
      internal: false,
      cidr: `${address}/24`,
      scopeid: undefined,
    })),
  };
}

describe("deriveScanSubnet", () => {
  beforeEach(() => {
    envConfig.ZPL_SCAN_SUBNET = undefined;
  });

  it("dérive le sous-réseau /24 de ZPL_PRINTER_HOST", () => {
    envConfig.ZPL_PRINTER_HOST = "192.168.1.63";
    expect(deriveScanSubnet()).toBe("192.168.1.");
  });

  it("préfère ZPL_SCAN_SUBNET lorsqu'elle est fournie", () => {
    envConfig.ZPL_SCAN_SUBNET = "10.0.0.0";
    expect(deriveScanSubnet()).toBe("10.0.0.");
  });

  it("retourne null pour un hôte sans IP", () => {
    envConfig.ZPL_PRINTER_HOST = "printer.local";
    expect(deriveScanSubnet()).toBeNull();
  });

  it("retourne null si le sous-réseau configuré est invalide", () => {
    envConfig.ZPL_SCAN_SUBNET = "10.0.0.999";
    expect(deriveScanSubnet()).toBeNull();
  });
});

describe("buildScanTargets", () => {
  it("génère 254 adresses /24 sans exclusion", () => {
    const targets = buildScanTargets("192.168.1.");
    expect(targets).toHaveLength(254);
    expect(targets[0]).toBe("192.168.1.1");
    expect(targets[253]).toBe("192.168.1.254");
  });

  it("exclut une liste d'IP fournies", () => {
    const targets = buildScanTargets("192.168.1.", [
      "192.168.1.63",
      "192.168.1.100",
    ]);
    expect(targets).toHaveLength(252);
    expect(targets).not.toContain("192.168.1.63");
    expect(targets).not.toContain("192.168.1.100");
  });
});

describe("getLocalIpAddresses", () => {
  it("retourne uniquement les IP IPv4 non-internes du sous-réseau", () => {
    networkInterfacesMock.mockReturnValue({
      eth0: [
        {
          address: "192.168.1.100",
          family: "IPv4",
          internal: false,
        },
        {
          address: "10.0.0.5",
          family: "IPv4",
          internal: false,
        },
      ],
      lo: [
        {
          address: "127.0.0.1",
          family: "IPv4",
          internal: true,
        },
      ],
    });

    expect(getLocalIpAddresses("192.168.1.")).toEqual(["192.168.1.100"]);
  });

  it("retourne une liste vide si aucune IP locale dans le sous-réseau", () => {
    networkInterfacesMock.mockReturnValue({
      eth0: [
        {
          address: "10.0.0.5",
          family: "IPv4",
          internal: false,
        },
      ],
    });

    expect(getLocalIpAddresses("192.168.1.")).toEqual([]);
  });
});

describe("probePort", () => {
  it("détecte une imprimante ouverte puis ferme le socket sans rien écrire", async () => {
    createConnectionMock.mockImplementation(() =>
      socketOpening()
    );

    await expect(probePort("192.168.1.50", 9100)).resolves.toBe(true);
    const socket = createConnectionMock.mock.results[0].value as FakeSocket;
    expect(socket.destroyed).toBe(true);
    expect(socket.setWriteTimes).toBe(0);
  });

  it("retourne false pour un port fermé", async () => {
    createConnectionMock.mockImplementation(() =>
      socketRefusing()
    );

    await expect(probePort("192.168.1.51", 9100)).resolves.toBe(false);
  });

  it("retourne false quand la connexion dépasse le délai", async () => {
    const socket = new FakeSocket();
    createConnectionMock.mockReturnValue(socket);

    const promise = probePort("192.168.1.52", 9100, 2000);
    socket.emit("timeout");
    await expect(promise).resolves.toBe(false);
  });
});

describe("discoverPrinters", () => {
  beforeEach(() => {
    createConnectionMock.mockReset();
    networkInterfacesMock.mockReset();
    envConfig.ZPL_PRINTER_HOST = "192.168.1.63";
    envConfig.ZPL_SCAN_SUBNET = undefined;
    networkInterfacesMock.mockReturnValue(localInterfaces(["192.168.1.100"]));
  });

  it("retourne les imprimantes dont le port accepte la connexion", async () => {
    createConnectionMock.mockImplementation((options: { host: string }) => {
      if (options.host === "192.168.1.99") {
        return socketOpening();
      }
      return socketRefusing();
    });

    const printers = await discoverPrinters();

    expect(printers).toEqual([{ address: "192.168.1.99", port: 9100 }]);
  });

  it("détecte l'imprimante configurée dans ZPL_PRINTER_HOST", async () => {
    envConfig.ZPL_PRINTER_HOST = "192.168.1.63";
    createConnectionMock.mockImplementation((options: { host: string }) => {
      if (options.host === "192.168.1.63") {
        return socketOpening();
      }
      return socketRefusing();
    });

    const printers = await discoverPrinters();

    expect(printers).toContainEqual({
      address: "192.168.1.63",
      port: 9100,
    });
  });

  it("ne sonde jamais l'IP locale du serveur", async () => {
    const opened: string[] = [];
    createConnectionMock.mockImplementation((options: { host: string }) => {
      opened.push(options.host);
      return socketRefusing();
    });

    await discoverPrinters();

    expect(opened).not.toContain("192.168.1.100");
    expect(opened.length).toBe(253);
  });

  it("sonde l'ensemble du /24 en une seule passe (adresse unique, IP locale exclue)", async () => {
    createConnectionMock.mockImplementation(() => socketRefusing());

    const printers = await discoverPrinters();

    expect(printers).toEqual([]);
    const probed = createConnectionMock.mock.calls.map(
      (call) => call[0].host as string
    );
    expect(probed).toHaveLength(253);
    expect(new Set(probed).size).toBe(253);
    expect(probed).not.toContain("192.168.1.100");
    expect(probed).toContain("192.168.1.63");
  });

  it("respecte le budget de temps total", async () => {
    createConnectionMock.mockImplementation(() => {
      const socket = new FakeSocket();
      process.nextTick(() => socket.emit("error", new Error("ECONNREFUSED")));
      return socket;
    });
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(1000)
      .mockReturnValue(1000 + 31_000);

    const printers = await discoverPrinters();

    expect(printers).toEqual([]);
    expect(createConnectionMock.mock.calls.length).toBeLessThan(255);
  });
});