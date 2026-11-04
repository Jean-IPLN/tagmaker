export interface LabelModule {
  id: string;
  name: string;
  description: string;
  href: string;
}

const modules: LabelModule[] = [
  {
    id: "ean13",
    name: "EAN-13",
    description: "Imprimer des étiquettes à code-barres EAN-13",
    href: "/ean13",
  },
  {
    id: "location",
    name: "Emplacement",
    description: "Imprimer des étiquettes à code-barres Code 128 (classique ou #D)",
    href: "/emplacement",
  },
  {
    id: "code128",
    name: "Code 128",
    description: "Imprimer des étiquettes Code 128 à contenu libre",
    href: "/code128",
  },
  {
    id: "data-matrix",
    name: "Data Matrix",
    description: "Imprimer des étiquettes Data Matrix à contenu libre et légende",
    href: "/data-matrix",
  },
];

export function getLabelModules(): LabelModule[] {
  return modules.map((module) => ({ ...module }));
}

export function registerLabelModule(module: LabelModule): void {
  if (modules.some((existing) => existing.id === module.id)) {
    throw new Error(`Un module avec l'id '${module.id}' est déjà enregistré`);
  }
  modules.push({ ...module });
}