# Interface web — Contrat UI : module Emplacement

Composant côté client conforme aux patterns du module EAN-13
(`ean13-form.tsx`, `ean13-confirm-dialog.tsx`, route App Router `/ean13`).
La géométrie utilitaire du Switch shadcn est issue du kit local
(`components/ui/switch.tsx`, Base UI `@base-ui/react` — composant à ajouter au
kit existant s'il est absent).

## Arborescence cible

```text
app/emplacement/page.tsx        # page du module (miroir de app/ean13/page.tsx)
components/location-form.tsx    # formulaire avec switches
components/location-confirm-dialog.tsx   # confirmation volume élevé
components/ui/switch.tsx        # composant Switch (kit shadcn/Base UI)
```

## Structure du formulaire (`LocationForm`)

1. **Sélecteur de format papier** — réutilise le composant existant
   `PaperSizeSelect` (options issues de `ZPL_PAPER_SIZES`, valeurs
   `paperId`/`printerAddress` du cookie `tagmaker_print_settings`).
2. **Switch — Mode d'édition** (libellé : « Un seul » / « Plage ») :
   - position **Un seul (défaut)** : un champ `code` + un champ `quantity` ;
   - position **Plage** : champs `startCode` et `endCode` ; le champ
     `quantity` est **masqué** (le nombre d'étiquettes = taille de la plage,
     affiché sous forme de compteur informatif).
3. **Switch — Type d'emplacement** (libellé : « Classique » / « Dynamique
   `#D` ») :
   - **Classique (défaut)** : validation `^[12][A-Z][1-9A-Z][0-9A-Z]$` ;
   - **Dynamique `#D`** : validation `^[12]#D[0-9A-Z]$`.
   Un code valide au global mais incohérent avec le type affiche un message
   orientant vers l'autre type (FR-006).
4. **Bouton Imprimer** (pleine largeur, états « Impression en cours… »).

## Validation et retours visibles

- La validation client utilise le **même schéma Zod** que le serveur
  (`lib/location/validate.ts` — union discriminée `mode`) : les messages
  d'erreur se basent sur `parsed.error.issues[0].message` (pattern EAN-13).
- Champ `code` saisi en majuscules/lettres+chiffres — `inputMode="text"`,
  `autoComplete="off"`, `maxLength=4` (Code 128 accepte `A-Z 0-9 #`).
- Erreurs affichées via `toast` (`sonner`) :
  - validation → message Zod ;
  - `409` → « impression déjà en cours » ;
  - `503` → « imprimante injoignable : … » ;
  - autre/`catch` → « Erreur réseau : … ».

## Confirmation de volume (pattern AlertDialog)

Joué **côté client** avant l'appel à `/api/print/location` quand le nombre
d'étiquettes demandé dépasse le seuil (quantité &gt; 2 en mode single **ou**
taille de plage &gt; 2) :

- Titre : « Imprimer N étiquettes ? » ;
- Description : rappel volume et finalité ;
- Actions : Annuler / Confirmer (destructive).
Composant dédié `LocationConfirmDialog` (props `open`, `onOpenChange`,
`count`, `onConfirm`) — miroir de `Ean13ConfirmDialog`.

## États et envoi

- `useState` : `mode` (`"single"`), `locationType` (`"classic"`), `code`,
  `quantity` (`"1"`), `startCode`, `endCode`, `isConfirming`, `isSending`.
- Soumission → `fetch("/api/print/location", { method: "POST", … })` avec
  `paperId`/`printerAddress` issus de `readPrintSettings()` (ajoutés
  conditionnellement, comme EAN-13).
- Succès → `toast.success("Impression envoyée (N étiquette(s))")` avec N =
  nombre de **étiquettes physiques** du job (copies ou taille de plage).
- Désactivation du bouton pendant l'envoi (`isSending`).

## Navigation et découverte

- Entrée de module ajoutée au registre (`registerLabelModule` /
  tableau `lib/modules/registry.ts`) : `id: "location"`, `name: "Emplacement"`,
  `href: "/emplacement"`.
- La page d'accueil (`app/page.tsx`) liste les modules via
  `RecentModulesGallery` (cookie récents) — aucune modification nécessaire
  ailleurs : la route `/emplacement` et l'entrée de registre suffisent à la
  découverte de cortège du module.