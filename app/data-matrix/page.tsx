import Link from "next/link";

import { DataMatrixForm } from "@/components/data-matrix-form";

export default function DataMatrixPage() {
  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Étiquette Data Matrix
          </h1>
          <p className="text-muted-foreground">
            Saisissez un contenu libre (1 à 200 caractères ASCII imprimables),
            une légende facultative et la quantité d&apos;étiquettes à
            imprimer. Le code 2D reste carré et centré.
          </p>
        </div>
        <DataMatrixForm />
        <Link
          href="/"
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          ← Retour
        </Link>
      </div>
    </main>
  );
}
