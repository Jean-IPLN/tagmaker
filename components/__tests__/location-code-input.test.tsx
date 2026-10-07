import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  LOCATION_CODE_PLACEHOLDERS,
  LocationCodeInput,
} from "@/components/location-code-input";

const PREFIX = "Code emplacement";
const EMPTY_INITIAL_CODE = "1   ";

function segments() {
  return {
    first: screen.getByRole("combobox", { name: `${PREFIX} — 1er caractère` }),
    second: screen.getByRole("textbox", {
      name: `${PREFIX} — 2e caractère`,
    }),
    third: screen.getByRole("textbox", { name: `${PREFIX} — 3e caractère` }),
    fourth: screen.getByRole("textbox", { name: `${PREFIX} — 4e caractère` }),
  };
}

async function pickZone(char: string) {
  const first = segments().first;
  fireEvent.click(first);

  const list = await waitFor(() => {
    const el = document.getElementById(
      first.getAttribute("aria-controls") ?? ""
    );
    if (!el) throw new Error("liste d'options introuvable");
    return el;
  });

  const option = within(list).getByRole("option", { name: char });
  fireEvent.pointerDown(option);
  fireEvent.click(option);
}

function ControlledInput({
  initialValue = EMPTY_INITIAL_CODE,
  placeholders,
  fixedIndexes,
}: {
  initialValue?: string;
  placeholders?: readonly [string, string, string, string];
  fixedIndexes?: readonly number[];
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <LocationCodeInput
      labelPrefix={PREFIX}
      value={value}
      onChange={setValue}
      placeholders={placeholders}
      fixedIndexes={fixedIndexes}
    />
  );
}

describe("LocationCodeInput — représentation paddée (contrat)", () => {
  it("affiche la zone « 1 » engagée et les positions 2-4 vides (placeholder visible)", () => {
    render(<ControlledInput />);
    const { first, second, third, fourth } = segments();

    expect(first).not.toHaveAttribute("data-placeholder");
    expect(first.textContent).toBe("1");
    expect((second as HTMLInputElement).value).toBe("");
    expect((third as HTMLInputElement).value).toBe("");
    expect((fourth as HTMLInputElement).value).toBe("");
    expect(second).toHaveAttribute("placeholder", "A");
  });

  it("émet une chaîne paddée de longueur 4 à chaque édition", () => {
    const handleChange = vi.fn();
    function Harness() {
      const [value, setValue] = useState(EMPTY_INITIAL_CODE);
      return (
        <LocationCodeInput
          labelPrefix={PREFIX}
          value={value}
          onChange={(next) => {
            handleChange(next);
            setValue(next);
          }}
        />
      );
    }
    render(<Harness />);

    fireEvent.change(segments().second, { target: { value: "B" } });
    expect(handleChange).toHaveBeenCalledWith("1B  ");
    expect(handleChange.mock.calls[0][0]).toHaveLength(4);

    fireEvent.change(segments().second, { target: { value: "" } });
    expect(handleChange).toHaveBeenLastCalledWith(EMPTY_INITIAL_CODE);
    expect(handleChange.mock.calls[1][0]).toHaveLength(4);
  });

  it("normalise une valeur entrante plus courte que 4 positions", () => {
    render(<ControlledInput initialValue="1A" />);
    const { first, second, third, fourth } = segments();

    expect(first.textContent).toBe("1");
    expect((second as HTMLInputElement).value).toBe("A");
    expect((third as HTMLInputElement).value).toBe("");
    expect((fourth as HTMLInputElement).value).toBe("");
  });

  it("normalise une valeur entrante plus longue que 4 positions", () => {
    render(<ControlledInput initialValue="1A5B6" />);
    const { fourth } = segments();

    expect((fourth as HTMLInputElement).value).toBe("B");
  });

  it("tape en 2e position sans jamais modifier la zone (FR-005)", () => {
    render(<ControlledInput />);
    const { first, second, third, fourth } = segments();

    fireEvent.change(second, { target: { value: "5" } });
    fireEvent.change(third, { target: { value: "B" } });
    fireEvent.change(fourth, { target: { value: "2" } });

    expect(first.textContent).toBe("1");
    expect(first).not.toHaveAttribute("data-placeholder");
    expect((second as HTMLInputElement).value).toBe("5");
    expect((third as HTMLInputElement).value).toBe("B");
    expect((fourth as HTMLInputElement).value).toBe("2");
  });

  it("Backspace sur position vide recule le focus sans déplacer les autres", () => {
    render(<ControlledInput />);
    const { first, second, third, fourth } = segments();

    fireEvent.change(second, { target: { value: "5" } });
    (third as HTMLElement).focus();
    fireEvent.keyDown(third, { key: "Backspace" });

    expect(document.activeElement).toBe(second);
    expect((second as HTMLInputElement).value).toBe("5");
    expect((fourth as HTMLInputElement).value).toBe("");

    fireEvent.change(second, { target: { value: "" } });
    (second as HTMLElement).focus();
    fireEvent.keyDown(second, { key: "Backspace" });

    expect(document.activeElement).toBe(first);
    expect(first.textContent).toBe("1");
  });

  it("colle « 5B2 » sur la 2e position : chaque caractère rejoint sa position", () => {
    render(<ControlledInput />);
    const { first, second, third, fourth } = segments();

    fireEvent.paste(second, {
      clipboardData: { getData: () => "5B2" },
    });

    expect((second as HTMLInputElement).value).toBe("5");
    expect((third as HTMLInputElement).value).toBe("B");
    expect((fourth as HTMLInputElement).value).toBe("2");
    expect(first.textContent).toBe("1");
  });

  it("assainit le presse-papier : caractères hors charset et minuscules traités", () => {
    render(<ControlledInput />);
    const { second, third, fourth } = segments();

    fireEvent.paste(second, {
      clipboardData: { getData: () => "5!b2" },
    });

    expect((second as HTMLInputElement).value).toBe("5");
    expect((third as HTMLInputElement).value).toBe("B");
    expect((fourth as HTMLInputElement).value).toBe("2");
  });

  it("conserve la navigation clavier ←/→ entre positions", () => {
    render(<ControlledInput />);
    const { second, third, fourth } = segments();

    (second as HTMLElement).focus();
    fireEvent.keyDown(second, { key: "ArrowRight" });
    expect(document.activeElement).toBe(third);

    fireEvent.keyDown(third, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(second);

    fireEvent.keyDown(second, { key: "ArrowRight" });
    fireEvent.keyDown(third, { key: "ArrowRight" });
    expect(document.activeElement).toBe(fourth);
  });
});

describe("LocationCodeInput — type Dynamique (positions fixes)", () => {
  function renderDynamic() {
    render(
      <ControlledInput
        placeholders={LOCATION_CODE_PLACEHOLDERS.dynamic}
        fixedIndexes={[1, 2]}
      />
    );
  }

  it("verrouille # et D aux positions 2-3 et n'édite que la 4e position", () => {
    renderDynamic();
    const first = screen.getByRole("combobox", {
      name: `${PREFIX} — 1er caractère`,
    });
    const fourth = screen.getByRole("textbox", {
      name: `${PREFIX} — 4e caractère`,
    });

    expect(
      screen.queryByRole("textbox", { name: `${PREFIX} — 2e caractère` })
    ).toBeNull();
    expect(
      screen.queryByRole("textbox", { name: `${PREFIX} — 3e caractère` })
    ).toBeNull();
    expect(
      screen.getByLabelText(`${PREFIX} — 2e caractère (fixe)`)
    ).toBeInTheDocument();
    expect(screen.getByText("#")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();

    fireEvent.change(fourth, { target: { value: "9" } });

    expect(screen.getByText("#")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
    expect((fourth as HTMLInputElement).value).toBe("9");
    expect(first.textContent).toBe("1");
    expect(first).not.toHaveAttribute("data-placeholder");
  });

  it("colle en conservant les positions fixes", () => {
    renderDynamic();
    const first = screen.getByRole("combobox", {
      name: `${PREFIX} — 1er caractère`,
    });
    const fourth = screen.getByRole("textbox", {
      name: `${PREFIX} — 4e caractère`,
    });

    fireEvent.paste(fourth, {
      clipboardData: { getData: () => "9Z" },
    });

    expect((fourth as HTMLInputElement).value).toBe("9");
    expect(screen.getByText("#")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
    expect(first.textContent).toBe("1");
  });
});

describe("LocationCodeInput — sélecteur de zone", () => {
  it("propose uniquement les options 1 et 2", async () => {
    render(<ControlledInput />);
    fireEvent.click(segments().first);

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(["1", "2"]);
  });

  it("changer la zone n'affecte que la position 1", async () => {
    render(<ControlledInput />);
    const { first, second, third, fourth } = segments();

    fireEvent.change(second, { target: { value: "5" } });
    fireEvent.change(third, { target: { value: "B" } });
    fireEvent.change(fourth, { target: { value: "2" } });

    await pickZone("2");

    expect(first.textContent).toBe("2");
    expect((second as HTMLInputElement).value).toBe("5");
    expect((third as HTMLInputElement).value).toBe("B");
    expect((fourth as HTMLInputElement).value).toBe("2");
  });
});
