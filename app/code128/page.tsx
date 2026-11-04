import Link from "next/link";

import { Code128Form } from "@/components/code128-form";

export default function Code128Page() {
  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Étiquette Code 128
          </h1>
          <p className="text-muted-foreground">
            Saisissez un contenu libre (1 à 80 caractères ASCII imprimables) et
            la quantité d&apos;étiquettes à imprimer.
          </p>
        </div>
        <Code128Form />
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
