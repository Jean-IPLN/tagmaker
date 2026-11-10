# Quickstart — Validation du commutateur in-line Data Matrix

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**:
2026-11-06

## Prérequis

- Dépendances installées : `npm install`.
- Imprimante ZPL configurée dans les réglages de l'application pour les
  scénarios d'impression réelle.
- Pour les contrôles sans imprimante : utiliser les tests automatisés.

## 1. Contrôles automatisés

```bash
npx vitest run \
  lib/data-matrix/__tests__/validate.test.ts \
  lib/zpl/__tests__/data-matrix.test.ts \
  lib/zpl/__tests__/data-matrix-fit.test.ts \
  app/api/print/data-matrix/__tests__/route.test.ts \
  app/api/print/data-matrix/__tests__/route-fit.test.ts \
  components/__tests__/data-matrix-form.test.tsx \
  components/__tests__/data-matrix-form-inline.test.tsx

npm run lint
npx tsc --noEmit
npm run test:coverage
```

Attendu : tous les tests Data Matrix passent, aucune erreur de lint ou de type,
couverture > 80 %.

## 2. Non-régression du mode actuel

1. Lancer `npm run dev`, ouvrir `/data-matrix`.
2. Laisser « Affichage in-line » désactivé.
3. Saisir `REF-2026-A17`, légende `Palette 42`, quantité 1, puis imprimer.
4. Vérifier que la légende est sous le code, comme avant la feature.
5. Scanner l'étiquette : le contenu restitué est exactement `REF-2026-A17`.

Attendu : payload sans champ `inline`, ZPL du mode normal inchangé.

## 3. Affichage in-line

1. Activer « Affichage in-line ».
2. Saisir `REF-2026-A17`, légende `Palette 42`, quantité 1, puis imprimer.
3. Vérifier que le code est carré, à gauche, et que la légende est à droite
   sur la même ligne, sans chevauchement ni troncature.
4. Scanner l'étiquette : le contenu restitué est exactement `REF-2026-A17`,
   sans la légende.

Attendu : payload avec `"inline": true`, symbole `^BXN` normal, texte `^AEN`
aligné à gauche dans l'espace restant.

## 4. Légende vide

1. Activer l'in-line et vider la légende.
2. Imprimer avec un contenu valide.

Attendu : étiquette identique au mode actuel, code seul centré, aucun champ
texte.

## 5. Légende trop longue

1. Activer l'in-line, choisir le format `40x25`, contenu `A`, légende de 60
   caractères.
2. Valider l'impression.

Attendu : aucun envoi, message « Le contenu ou la légende ne tient pas sur ce
format. Raccourcissez ou changez de format. ». La saisie reste intacte.

Contrôle API équivalent :

```bash
curl -i -X POST http://localhost:3000/api/print/data-matrix \
  -H 'content-type: application/json' \
  -d '{
    "content": "A",
    "legend": "LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL",
    "quantity": 1,
    "paperId": "40x25",
    "inline": true
  }'
```

Attendu : `422 VALIDATION_ERROR`, aucun envoi à l'imprimante.

## 6. Priorité de l'orientation pivotée

1. Activer l'orientation pivotée dans les réglages partagés.
2. Activer « Affichage in-line » et imprimer.

Attendu : le rendu pivoté actuel est conservé (`^BXB`, légende le long du
code), aucune erreur, `inline` ignoré.

Contrôle API :

```bash
curl -i -X POST http://localhost:3000/api/print/data-matrix \
  -H 'content-type: application/json' \
  -d '{
    "content": "1A2B",
    "legend": "Zone A",
    "quantity": 1,
    "paperId": "40x25",
    "rotated": true,
    "inline": true
  }'
```

Attendu : `200`, ZPL pivoté inchangé, légende à côté du code.

## 7. Accessibilité

1. Au clavier, atteindre le commutateur avec `Tab`.
2. L'activer avec `Espace` ou `Entrée`.
3. Vérifier que le nom annoncé est « Affichage in-line » et que l'état
   activé/désactivé est annoncé par le lecteur d'écran.

Attendu : bascule au clavier, état exposé, aucun piège de focus.

## 8. Contrôle visuel Labelary et scan physique

- Coller le ZPL d'exemple du contrat
  [data-matrix-inline-layout.md](./contracts/data-matrix-inline-layout.md) dans
  Labelary (203 dpi) : le code doit être carré et la légende à droite, sur une
  ligne.
- Imprimer sur l'imprimante cible et scanner avec le lecteur utilisé en
  production : le contenu doit être exact, y compris `^`, `~` et `_`.
- Vérifier les formats `40x25`, `75x25`, `100x50` et `100x150`.

## Résultat attendu

- Mode désactivé : aucune régression visible ni dans le payload ni dans le ZPL.
- Mode activé : légende à droite, une ligne, tenue vérifiée, jamais tronquée.
- Mode pivoté : prioritaire, inchangé.
- Aucune persistance du choix, aucun nouveau réglage partagé.
