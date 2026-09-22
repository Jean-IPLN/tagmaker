import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SiteHeader } from "@/components/header";
import { SidebarProvider } from "@/components/ui/sidebar";

let mockPathname = "/ean13";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

function renderHeader() {
  return render(
    <SidebarProvider>
      <SiteHeader />
    </SidebarProvider>
  );
}

describe("SiteHeader", () => {
  it("affiche un bouton pour replier ou déplier la barre latérale", () => {
    renderHeader();

    expect(
      screen.getByRole("button", { name: "Toggle Sidebar" })
    ).toBeInTheDocument();
  });

  it("affiche le module courant dans le fil d'Ariane", () => {
    renderHeader();

    expect(screen.getByText("EAN-13")).toBeInTheDocument();
  });

  it("affiche une valeur neutre à la racine", () => {
    mockPathname = "/";
    renderHeader();

    expect(screen.getByText("Accueil")).toBeInTheDocument();
  });
});