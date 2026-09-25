import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LocationForm } from "@/components/location-form";
import { PRINT_SETTINGS_COOKIE_NAME } from "@/lib/print-settings-cookie";
import { MAX_RANGES } from "@/lib/location/code";

const { toastMock } = vi.hoisted(() => ({
  toastMock: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock("sonner", () => ({ toast: toastMock }));

const VALID_BODY = {
  mode: "single",
  locationType: "classic",
  code: "1A5B",
  quantity: 2,
};

function renderForm() {
  render(<LocationForm />);
  return {
    quantityInput: screen.getByLabelText("Quantité"),
    submitButton: screen.getByRole("button", { name: /Imprimer/i }),
    modeSwitch: screen.getByRole("switch", { name: "Mode d'impression" }),
    typeSwitch: screen.getByRole("switch", { name: "Type d'emplacement" }),
  };
}

function segments(prefix: string) {
  return {
    first: screen.getByRole("combobox", {
      name: `${prefix} — 1er caractère`,
    }),
    second: screen.queryByRole("textbox", {
      name: `${prefix} — 2e caractère`,
    }),
    third: screen.queryByRole("textbox", {
      name: `${prefix} — 3e caractère`,
    }),
    fourth: screen.queryByRole("textbox", {
      name: `${prefix} — 4e caractère`,
    }),
  };
}

async function pickFirst(prefix: string, char: string) {
  const first = segments(prefix).first;
  fireEvent.click(first);

  const list = await waitFor(() => {
    const el = document.getElementById(
      first.getAttribute("aria-controls") ?? ""
    );
    if (!el) throw new Error("liste d'options introuvable");
    return el;
  });

  const option = within(list).getByRole("option", {
    name: char,
  });
  fireEvent.pointerDown(option);
  fireEvent.click(option);
}

function typeRest(prefix: string, code: string) {
  const boxes = segments(prefix);
  if (boxes.second) {
    fireEvent.change(boxes.second, { target: { value: code[1] ?? "" } });
  }
  if (boxes.third) {
    fireEvent.change(boxes.third, { target: { value: code[2] ?? "" } });
  }
  if (boxes.fourth) {
    fireEvent.change(boxes.fourth, { target: { value: code[3] ?? "" } });
  }
}

async function fillCode(prefix: string, code: string) {
  await pickFirst(prefix, code[0]);
  typeRest(prefix, code);
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("LocationForm — mode single", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.values(toastMock).forEach((mock) => mock.mockClear());
    document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=; Max-Age=0; path=/`;
  });

  it("affiche l'état par défaut : mode Un seul, type Classique, quantité 1", () => {
    const { quantityInput, modeSwitch, typeSwitch } = renderForm();
    expect((modeSwitch as HTMLButtonElement).getAttribute("data-checked")).toBe(
      null
    );
    expect((typeSwitch as HTMLButtonElement).getAttribute("data-checked")).toBe(
      null
    );
    expect((quantityInput as HTMLInputElement).value).toBe("1");
  });

  it("affiche les deux options autour de chaque commutateur", () => {
    renderForm();
    expect(screen.getByText("Un seul")).toBeInTheDocument();
    expect(screen.getByText("Plage")).toBeInTheDocument();
    expect(screen.getByText("Classique")).toBeInTheDocument();
    expect(screen.getByText("Dynamique")).toBeInTheDocument();
  });

  it("le commutateur type bascule entre Classique et Dynamique (#D)", () => {
    const { typeSwitch } = renderForm();
    expect(
      segments("Code emplacement").second?.getAttribute("placeholder")
    ).toBe("A");
    fireEvent.click(typeSwitch);
    expect(
      (typeSwitch as HTMLButtonElement).getAttribute("data-checked")
    ).toBeDefined();
    expect(segments("Code emplacement").second).toBeNull();
    expect(segments("Code emplacement").third).toBeNull();
    expect(
      segments("Code emplacement").fourth?.getAttribute("placeholder")
    ).toBe("9");
    expect(screen.getByText("#")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("propose uniquement 1 et 2 comme premier caractère", async () => {
    renderForm();
    fireEvent.click(segments("Code emplacement").first);
    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(["1", "2"]);
  });

  it("refuse le code invalide sans aucune requête", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent" }));

    renderForm();
    await fillCode("Code emplacement", "1A05");
    fireEvent.click(screen.getByRole("button", { name: /Imprimer/i }));

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringMatching(/4 caractères/)
      )
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse un code incomplet sans aucune requête", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent" }));

    renderForm();
    await fillCode("Code emplacement", "1A5");
    fireEvent.click(screen.getByRole("button", { name: /Imprimer/i }));

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringMatching(/4 caractères/)
      )
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse un code #D en type Classique en orientant vers le type Dynamique", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent" }));

    renderForm();
    await fillCode("Code emplacement", "1#D7");
    fireEvent.click(screen.getByRole("button", { name: /Imprimer/i }));

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringMatching(/Dynamique/i)
      )
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envoie directement la requête pour une quantité ≤ 2 (sans modal)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent", labels: 2 }));

    const { quantityInput, submitButton } = renderForm();
    await fillCode("Code emplacement", "1A5B");
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/print/location",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(VALID_BODY),
        })
      )
    );
    expect(
      screen.queryByText("Imprimer 2 étiquettes ?")
    ).not.toBeInTheDocument();
  });

  it("affiche la modal critique sans requête pour une quantité > 2", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent" }));

    const { quantityInput, submitButton } = renderForm();
    await fillCode("Code emplacement", VALID_BODY.code);
    fireEvent.change(quantityInput, { target: { value: "5" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(screen.getByText("Imprimer 5 étiquettes ?")).toBeInTheDocument()
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("annuler la modal n'envoie rien et conserve les valeurs", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent" }));

    const { quantityInput, submitButton } = renderForm();
    await fillCode("Code emplacement", VALID_BODY.code);
    fireEvent.change(quantityInput, { target: { value: "5" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(screen.getByText("Imprimer 5 étiquettes ?")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Annuler/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      (segments("Code emplacement").second as HTMLInputElement).value
    ).toBe("A");
    expect((quantityInput as HTMLInputElement).value).toBe("5");
  });

  it("confirmer la modal envoie la requête", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent", labels: 5 }));

    const { quantityInput, submitButton } = renderForm();
    await fillCode("Code emplacement", VALID_BODY.code);
    fireEvent.change(quantityInput, { target: { value: "5" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(screen.getByText("Imprimer 5 étiquettes ?")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Confirmer/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/print/location",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            mode: "single",
            locationType: "classic",
            code: VALID_BODY.code,
            quantity: 5,
          }),
        })
      )
    );
  });

  it("envoie un code #D avec le type Dynamique", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent", labels: 2 }));

    const { typeSwitch, submitButton } = renderForm();
    fireEvent.click(typeSwitch);
    await fillCode("Code emplacement", "1#D7");
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/print/location",
        expect.objectContaining({
          body: JSON.stringify({
            mode: "single",
            locationType: "dynamic",
            code: "1#D7",
            quantity: 1,
          }),
        })
      )
    );
  });

  it("affiche un message clair si l'imprimante est injoignable (503)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse(503, {
          error: {
            code: "PRINTER_UNAVAILABLE",
            message: "Imprimante injoignable ou envoi échoué.",
          },
        })
      );

    const { quantityInput, submitButton } = renderForm();
    await fillCode("Code emplacement", VALID_BODY.code);
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringMatching(/Imprimante injoignable/)
      )
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("signale une erreur réseau si le serveur est injoignable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("Failed to fetch")
    );

    const { quantityInput, submitButton } = renderForm();
    await fillCode("Code emplacement", VALID_BODY.code);
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringMatching(/Erreur réseau/)
      )
    );
  });

  it("confirme une impression réussie par un toast de succès", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(200, { status: "sent", labels: 2 })
    );

    const { quantityInput, submitButton } = renderForm();
    await fillCode("Code emplacement", VALID_BODY.code);
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
  });

  it("envoie le format de papier mémorisé dans le réglage", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent", labels: 2 }));

    document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify({ paperId: "100x50" })
    )}; path=/`;

    const { quantityInput, submitButton } = renderForm();
    await fillCode("Code emplacement", VALID_BODY.code);
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/print/location",
        expect.objectContaining({
          body: JSON.stringify({ ...VALID_BODY, paperId: "100x50" }),
        })
      )
    );
  });

  it("envoie l'adresse d'imprimante mémorisée dans le réglage", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent", labels: 2 }));

    document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify({ printerAddress: "192.168.1.99" })
    )}; path=/`;

    const { quantityInput, submitButton } = renderForm();
    await fillCode("Code emplacement", VALID_BODY.code);
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/print/location",
        expect.objectContaining({
          body: JSON.stringify({ ...VALID_BODY, printerAddress: "192.168.1.99" }),
        })
      )
    );
  });
});

describe("LocationForm — mode range (plages multiples)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.values(toastMock).forEach((mock) => mock.mockClear());
    document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=; Max-Age=0; path=/`;
  });

  function switchToRange() {
    const { modeSwitch } = renderForm();
    fireEvent.click(modeSwitch);
    return screen.getByRole("button", { name: /Imprimer/i });
  }

  function addRange() {
    fireEvent.click(screen.getByRole("button", { name: /Ajouter une plage/i }));
  }

  function separators() {
    return screen.queryAllByRole("separator");
  }

  describe("US1 — ajouter une plage (FR-001, FR-002)", () => {
    it("affiche une seule plage « Plage 1 » avec début/fin, sans quantité", () => {
      switchToRange();
      expect(screen.queryByLabelText("Quantité")).not.toBeInTheDocument();
      expect(screen.getByText("Plage 1")).toBeInTheDocument();
      expect(screen.getByText("Début")).toBeInTheDocument();
      expect(screen.getByText("Fin")).toBeInTheDocument();
      expect(screen.getAllByText(/^Plage \d+$/)).toHaveLength(1);
    });

    it("3 clics sur « + » donnent 4 plages vides et saisissables", () => {
      switchToRange();
      addRange();
      addRange();
      addRange();

      expect(screen.getAllByText(/^Plage \d+$/)).toHaveLength(4);
      expect(screen.getByText("Plage 4")).toBeInTheDocument();
      expect(
        (segments("Plage 4 — début").second as HTMLInputElement).value
      ).toBe("");
      expect(
        segments("Plage 4 — fin").fourth?.getAttribute("placeholder")
      ).toBe("1");
    });

    it("saisir dans une plage laisse les autres plages inchangées", async () => {
      switchToRange();
      addRange();

      await fillCode("Plage 1 — début", "1A10");
      await fillCode("Plage 1 — fin", "1A12");

      expect(
        (segments("Plage 1 — début").second as HTMLInputElement).value
      ).toBe("A");
      expect(
        (segments("Plage 2 — début").second as HTMLInputElement).value
      ).toBe("");
      expect(
        (segments("Plage 2 — début").fourth as HTMLInputElement).value
      ).toBe("");
      expect(
        (segments("Plage 2 — fin").fourth as HTMLInputElement).value
      ).toBe("");
    });

    it("au plafond, le bouton « + » devient inopérant", () => {
      switchToRange();
      for (let index = 1; index < MAX_RANGES; index += 1) {
        addRange();
      }

      expect(screen.getAllByText(/^Plage \d+$/)).toHaveLength(MAX_RANGES);
      const addButton = screen.getByRole("button", {
        name: /Ajouter une plage/i,
      });
      expect(addButton).toBeDisabled();

      addRange();
      expect(screen.getAllByText(/^Plage \d+$/)).toHaveLength(MAX_RANGES);
    });

    it("sépare chaque ligne d'un Separator shadcn", () => {
      switchToRange();
      expect(separators()).toHaveLength(0);
      addRange();
      expect(separators()).toHaveLength(1);
      addRange();
      expect(separators()).toHaveLength(2);
    });
  });

  describe("US1 — synchronisation de zone (début ↔ fin de la même plage)", () => {
    it("choisir 2 dans le début synchronise la fin de la même plage", async () => {
      switchToRange();
      addRange();

      await pickFirst("Plage 2 — début", "2");

      expect(segments("Plage 2 — début").first.textContent).toBe("2");
      expect(segments("Plage 2 — fin").first.textContent).toBe("2");
      expect(segments("Plage 1 — début").first.textContent).toBe("1");
      expect(segments("Plage 1 — fin").first.textContent).toBe("1");
    });

    it("la zone d'une plage n'affecte pas les autres plages", async () => {
      switchToRange();
      addRange();
      await pickFirst("Plage 2 — début", "2");
      await pickFirst("Plage 1 — début", "1");

      expect(segments("Plage 1 — début").first.textContent).toBe("1");
      expect(segments("Plage 1 — fin").first.textContent).toBe("1");
      expect(segments("Plage 2 — début").first.textContent).toBe("2");
      expect(segments("Plage 2 — fin").first.textContent).toBe("2");
    });

    it("préserve les caractères déjà saisis dans la même plage", async () => {
      switchToRange();
      addRange();
      await fillCode("Plage 1 — début", "1A10");

      await pickFirst("Plage 1 — fin", "2");

      expect(segments("Plage 1 — début").first.textContent).toBe("2");
      expect(
        (segments("Plage 1 — début").second as HTMLInputElement).value
      ).toBe("A");
      expect(
        (segments("Plage 1 — début").fourth as HTMLInputElement).value
      ).toBe("0");
      expect(segments("Plage 2 — début").first.textContent).toBe("1");
    });
  });

  describe("US2 — supprimer une plage (FR-003)", () => {
    it("supprime la plage cliquée, conserve les autres bornes", async () => {
      switchToRange();
      addRange();
      await fillCode("Plage 1 — début", "1A10");
      await fillCode("Plage 1 — fin", "1A12");
      await fillCode("Plage 2 — début", "1B10");
      await fillCode("Plage 2 — fin", "1B14");

      fireEvent.click(
        screen.getByRole("button", { name: "Supprimer la plage 1" })
      );

      expect(screen.getAllByText(/^Plage \d+$/)).toHaveLength(1);
      expect(screen.queryByText("Plage 2")).toBeNull();
      expect(
        (segments("Plage 1 — début").second as HTMLInputElement).value
      ).toBe("B");
      expect(
        (segments("Plage 1 — fin").second as HTMLInputElement).value
      ).toBe("B");
      expect(
        (segments("Plage 1 — début").fourth as HTMLInputElement).value
      ).toBe("0");
      expect(separators()).toHaveLength(0);
    });

    it("refuse de supprimer la dernière plage (bouton désactivé)", () => {
      switchToRange();
      const trash = screen.getByRole("button", {
        name: "Supprimer la plage 1",
      });
      expect(trash).toBeDisabled();
      fireEvent.click(trash);
      expect(screen.getAllByText(/^Plage \d+$/)).toHaveLength(1);
    });

    it("conserve le mode Plage et le type après suppression", () => {
      const { modeSwitch, typeSwitch } = renderForm();
      fireEvent.click(modeSwitch);
      fireEvent.click(typeSwitch);
      addRange();

      fireEvent.click(
        screen.getByRole("button", { name: "Supprimer la plage 1" })
      );

      expect(
        (screen.getByRole("switch", { name: "Mode d'impression" }) as HTMLButtonElement)
          .getAttribute("data-checked")
      ).not.toBeNull();
      expect(
        (screen.getByRole("switch", { name: "Type d'emplacement" }) as HTMLButtonElement)
          .getAttribute("data-checked")
      ).not.toBeNull();
      expect(screen.queryByLabelText("Quantité")).not.toBeInTheDocument();
      expect(screen.getAllByText("#")).toHaveLength(2);
      expect(screen.getAllByText("D")).toHaveLength(2);
    });
  });

  describe("US3 — imprimer toutes les plages (FR-004..FR-008)", () => {
    it("confirme le total cumulé puis envoie le tableau ranges", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(200, { status: "sent", labels: 8 }));

      const submitButton = switchToRange();
      await fillCode("Plage 1 — début", "1A10");
      await fillCode("Plage 1 — fin", "1A12");
      addRange();
      await fillCode("Plage 2 — début", "1B10");
      await fillCode("Plage 2 — fin", "1B14");

      fireEvent.click(submitButton);

      await waitFor(() =>
        expect(screen.getByText("Imprimer 8 étiquettes ?")).toBeInTheDocument()
      );
      expect(fetchMock).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: /Confirmer/i }));

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/print/location",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              mode: "range",
              locationType: "classic",
              ranges: [
                { startCode: "1A10", endCode: "1A12" },
                { startCode: "1B10", endCode: "1B14" },
              ],
            }),
          })
        )
      );
      expect(toastMock.success).toHaveBeenCalledWith(
        expect.stringMatching(/8 étiquettes/)
      );
    });

    it("impression directe sans modal si le total cumulé est ≤ 2", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(200, { status: "sent", labels: 2 }));

      const submitButton = switchToRange();
      await fillCode("Plage 1 — début", "1A90");
      await fillCode("Plage 1 — fin", "1A90");
      addRange();
      await fillCode("Plage 2 — début", "1B90");
      await fillCode("Plage 2 — fin", "1B90");

      fireEvent.click(submitButton);

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/print/location",
          expect.objectContaining({
            body: JSON.stringify({
              mode: "range",
              locationType: "classic",
              ranges: [
                { startCode: "1A90", endCode: "1A90" },
                { startCode: "1B90", endCode: "1B90" },
              ],
            }),
          })
        )
      );
      expect(
        screen.queryByText("Imprimer 2 étiquettes ?")
      ).not.toBeInTheDocument();
    });

    it("refuse l'ensemble et désigne la plage 2 fautive (aucune requête)", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(200, { status: "sent" }));

      const submitButton = switchToRange();
      await fillCode("Plage 1 — début", "1A10");
      await fillCode("Plage 1 — fin", "1A12");
      addRange();
      await fillCode("Plage 2 — début", "1A15");
      await fillCode("Plage 2 — fin", "1A10");

      fireEvent.click(submitButton);

      await waitFor(() =>
        expect(toastMock.error).toHaveBeenCalledWith(
          expect.stringMatching(/Plage 2/)
        )
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("envoie une impression dynamique multi-plages avec #D fixés", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(200, { status: "sent", labels: 8 }));

      const { modeSwitch, typeSwitch } = renderForm();
      fireEvent.click(modeSwitch);
      fireEvent.click(typeSwitch);
      const submitButton = screen.getByRole("button", { name: /Imprimer/i });

      await fillCode("Plage 1 — début", "1#D0");
      await fillCode("Plage 1 — fin", "1#D2");
      expect(segments("Plage 1 — début").second).toBeNull();
      expect(segments("Plage 1 — début").third).toBeNull();

      addRange();
      await fillCode("Plage 2 — début", "1#D3");
      await fillCode("Plage 2 — fin", "1#D7");

      fireEvent.click(submitButton);

      await waitFor(() =>
        expect(screen.getByText("Imprimer 8 étiquettes ?")).toBeInTheDocument()
      );
      fireEvent.click(screen.getByRole("button", { name: /Confirmer/i }));

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/print/location",
          expect.objectContaining({
            body: JSON.stringify({
              mode: "range",
              locationType: "dynamic",
              ranges: [
                { startCode: "1#D0", endCode: "1#D2" },
                { startCode: "1#D3", endCode: "1#D7" },
              ],
            }),
          })
        )
      );
    });

    it("envoie le format de papier mémorisé dans le réglage", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(200, { status: "sent", labels: 2 }));

      document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=${encodeURIComponent(
        JSON.stringify({ paperId: "100x50" })
      )}; path=/`;

      const submitButton = switchToRange();
      await fillCode("Plage 1 — début", "1A10");
      await fillCode("Plage 1 — fin", "1A11");
      fireEvent.click(submitButton);

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/print/location",
          expect.objectContaining({
            body: JSON.stringify({
              mode: "range",
              locationType: "classic",
              ranges: [{ startCode: "1A10", endCode: "1A11" }],
              paperId: "100x50",
            }),
          })
        )
      );
    });

    it("envoie l'adresse d'imprimante mémorisée dans le réglage", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(200, { status: "sent", labels: 2 }));

      document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=${encodeURIComponent(
        JSON.stringify({ printerAddress: "192.168.1.99" })
      )}; path=/`;

      const submitButton = switchToRange();
      await fillCode("Plage 1 — début", "1A10");
      await fillCode("Plage 1 — fin", "1A11");
      fireEvent.click(submitButton);

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/print/location",
          expect.objectContaining({
            body: JSON.stringify({
              mode: "range",
              locationType: "classic",
              ranges: [{ startCode: "1A10", endCode: "1A11" }],
              printerAddress: "192.168.1.99",
            }),
          })
        )
      );
    });
  });
});