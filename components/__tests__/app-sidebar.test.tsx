import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getLabelModules } from "@/lib/modules/registry";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

function renderSidebar() {
  return render(
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>
  );
}

describe("AppSidebar", () => {
  it("affiche un lien vers chaque module enregistré", () => {
    renderSidebar();

    for (const labelModule of getLabelModules()) {
      const link = screen.getByRole("link", {
        name: new RegExp(labelModule.name),
      });
      expect(link).toHaveAttribute("href", labelModule.href);
    }
  });

  it("rend la sidebar encastrée (variant inset)", () => {
    renderSidebar();

    const panel = document.querySelector('[data-slot="sidebar"]');
    expect(panel).toHaveAttribute("data-variant", "inset");
  });

  it("affiche le nom de chaque module et masque sa description dans la liste", () => {
    renderSidebar();

    for (const labelModule of getLabelModules()) {
      expect(screen.getByText(labelModule.name)).toBeInTheDocument();
      expect(
        screen.queryByText(labelModule.description)
      ).not.toBeInTheDocument();
    }
  });

  it("affiche le pictogramme de logo dans le lien de marque", () => {
    mockPathname = "/";
    renderSidebar();

    const brandLink = screen.getByRole("link", { name: /TagMaker/ });
    expect(brandLink.querySelector("svg")).not.toBeNull();
  });

  describe("état actif", () => {
    it("met en évidence l'entrée du module affiché", () => {
      mockPathname = "/ean13";
      renderSidebar();

      const activeLink = screen.getByRole("link", {
        name: /EAN-13/,
      });
      expect(activeLink).toHaveAttribute("data-active");

      const brandLink = screen.getByRole("link", {
        name: /TagMaker/,
      });
      expect(brandLink).not.toHaveAttribute("data-active");
    });

    it("ne met aucune entrée en évidence à la racine", () => {
      mockPathname = "/";
      renderSidebar();

      for (const labelModule of getLabelModules()) {
        const link = screen.getByRole("link", {
          name: new RegExp(labelModule.name),
        });
        expect(link).not.toHaveAttribute("data-active");
      }
    });
  });

  describe("infobulle de description au survol", () => {
    it("charge la description dans une infobulle au survol puis la masque au retrait", () => {
      mockPathname = "/";
      renderSidebar();

      const description = getLabelModules()[0].description;
      expect(screen.queryByText(description)).not.toBeInTheDocument();

      const link = screen.getByRole("link", { name: /EAN-13/ });
      fireEvent.mouseEnter(link);

      const tooltipContent = screen.getByText(description).closest(
        '[data-slot="tooltip-content"]'
      );
      expect(tooltipContent).toHaveAttribute("data-open");
      expect(screen.getByText(description)).toBeInTheDocument();

      fireEvent.mouseLeave(link);
      const afterLeave = screen.queryByText(description);
      if (afterLeave) {
        expect(afterLeave.closest('[data-slot="tooltip-content"]')).toHaveAttribute("data-closed");
      }
    });

    it("n'affiche qu'une seule description de module à la fois", () => {
      mockPathname = "/";
      renderSidebar();
      const modules = getLabelModules();

      const link = screen.getByRole("link", { name: /EAN-13/ });
      fireEvent.mouseEnter(link);

      const visibleDescriptions = modules.filter((module) =>
        screen
          .queryAllByText(module.description)
          .some((occurrence) => {
            const tooltip = occurrence.closest(
              '[data-slot="tooltip-content"]'
            );
            return tooltip !== null && tooltip.getAttribute("data-open") !== null;
          })
      );

      expect(visibleDescriptions.length).toBe(1);
    });
  });
});