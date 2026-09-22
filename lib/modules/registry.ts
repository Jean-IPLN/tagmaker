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