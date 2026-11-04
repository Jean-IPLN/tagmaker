import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DataMatrixForm } from "@/components/data-matrix-form";
import { PRINT_SETTINGS_COOKIE_NAME } from "@/lib/print-settings-cookie";

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

const PRINTER_ADDRESS = "192.168.1.99";

function setPrinterCookie(): void {
  document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify({ printerAddress: PRINTER_ADDRESS })
  )}; path=/`;
}

function renderForm() {
  render(<DataMatrixForm />);
  return {
    contentInput: screen.getByLabelText("Contenu"),
    legendInput: screen.getByLabelText("Légende"),
    quantityInput: screen.getByLabelText("Quantité"),
    submitButton: screen.getByRole("button", { name: /Imprimer/i }),
  };
}

describe("DataMatrixForm — validation de la saisie", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.values(toastMock).forEach((mock) => mock.mockClear());
    document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=; Max-Age=0; path=/`;
    setPrinterCookie();
  });

  it("refuse un contenu vide sans requête", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const { submitButton } = renderForm();
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith("Le contenu est requis")
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse plus de 200 caractères sans requête", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const { contentInput, submitButton } = renderForm();
    fireEvent.change(contentInput, { target: { value: "A".repeat(201) } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "Le contenu ne peut pas dépasser 200 caractères"
      )
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse les accents et les caractères non ASCII", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const { contentInput, submitButton } = renderForm();
    fireEvent.change(contentInput, { target: { value: "Café" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "Le contenu ne peut contenir que des caractères ASCII imprimables"
      )
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse une légende de plus de 60 caractères", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const { contentInput, legendInput, submitButton } = renderForm();
    fireEvent.change(contentInput, { target: { value: "ABC" } });
    fireEvent.change(legendInput, { target: { value: "L".repeat(61) } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "La légende ne peut pas dépasser 60 caractères"
      )
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse les accents dans la légende", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const { contentInput, legendInput, submitButton } = renderForm();
    fireEvent.change(contentInput, { target: { value: "ABC" } });
    fireEvent.change(legendInput, { target: { value: "Café" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "La légende ne peut contenir que des caractères ASCII imprimables"
      )
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse une quantité nulle ou hors plafond", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const { contentInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(contentInput, { target: { value: "ABC" } });
    fireEvent.change(quantityInput, { target: { value: "0" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "La quantité doit être au moins 1"
      )
    );

    fireEvent.change(quantityInput, { target: { value: "1001" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "La quantité ne peut pas dépasser 1000"
      )
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse une quantité non entière avec un message clair", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const { contentInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(contentInput, { target: { value: "ABC" } });
    fireEvent.change(quantityInput, { target: { value: "1.5" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "La quantité doit être un nombre entier"
      )
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propage le 422 de tenue sans second envoi", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Le contenu ou la légende ne tient pas sur ce format. Raccourcissez ou changez de format.",
          },
        }),
        { status: 422, headers: { "content-type": "application/json" } }
      )
    );

    const { contentInput, legendInput, submitButton } = renderForm();
    fireEvent.change(contentInput, { target: { value: "A".repeat(200) } });
    fireEvent.change(legendInput, { target: { value: "L".repeat(60) } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "Le contenu ou la légende ne tient pas sur ce format. Raccourcissez ou changez de format."
      )
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
