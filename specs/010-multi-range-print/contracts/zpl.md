# Contrat ZPL — Étiquette Emplacement (Feature 010)

**Aucun changement** par rapport au contrat de la feature 009 :
[vous référez à `specs/009-module-emplacement/contracts/zpl.md`](../../009-module-emplacement/contracts/zpl.md).

Le build ZPL consomme déjà un **tableau de codes** (`buildLocationZpl({ codes,
widthDots, heightDots })`) et génère **un bloc `^XA…^XZ` par code**, dans
l'ordre du tableau. Le multi-plages ne modifie que l'amont : le serveur
concatène les expansions de toutes les plages (`LocationCodes`) en un seul
tableau et y appelle le build existant.

- Sortie identique, pour un même ensemble de codes, quelle que soit la découpe
  en plages (invariant vérifié par test).
- Une seule connexion à l'imprimante, **un seul flux** pour toutes les plages.
- Mode **Un seul** : inchangé (`codes: [code]`, `quantity` → `^PQ`).

Paramètres de calcul (constantes Code 128, 203 dpi) : inchangés —
`data-model.md` de la feature 009 est la référence unique.