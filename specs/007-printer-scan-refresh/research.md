# Research: Découverte d'imprimantes : spinner et actualisation

**Feature**: [spec.md](./spec.md) | **Date**: 2026-09-23

## R1 — Liste de formats papier dans `.env` (« largeur×longueur »)

**Unknown**: « trouver un moyen de faire une liste dans .env » — comment
déclarer plusieurs formats papier dans un fichier `.env` ?

**Decision**: réutiliser la capacité **déjà livrée en feature 006** :
la variable `ZPL_PAPER_SIZES` est une chaîne de formats `largeur×hauteur`
séparés par des virgules (ou points-virgules), ex. :

```env
ZPL_PAPER_SIZES=40x25, 50x25, 100x50
```

`lib/paper-sizes.ts::parsePaperSizes` découpe sur `[,;]`, valide chaque token
(`/^\s*(\d+)\s*[xX]\s*(\d+)\s*$/`, largeur/hauteur > 0), dédoublonne, trie par
surface et **ignore les formats invalides** sans casser les valides. Si la
liste est vide ou absente, le format par défaut (`ZPL_LABEL_WIDTH_MM` ×
`ZPL_LABEL_HEIGHT_MM`) est utilisé.

**Rationale**: la fonctionnalité demandée existe déjà et est testée (feature
006, US1) ; la réimplémenter violerait YAGNI et DRY. L'action de cette
feature est de **vérifier** et de **documenter** (`.env.example` + README
déjà à jour : `ZPL_PAPER_SIZES`). Les FR-001 à FR-003 de la spec sont
satisfaits par l'existant.

**Alternatives considered**:
- Délimiteur non standard dotenv (ex. `PAPER_SIZES=40x25;50x25`) avec parseur
  custom → **rejetée** : exige du code et du test pour un gain nul (le
  parseur actuel accepte déjà `,` et `;`).
- Valeur JSON dans `.env` (`["40x25","50x25"]`) → **rejetée** : lisible mais
  fragile dans un fichier env, sur-ingénierie.
- Dépendance dotenv-expand/dotenv-list → **rejetée** : nouvelle dépendance
  inutile (KISS).

## R2 — « Spinner de shadcn » pendant la recherche d'imprimantes

**Unknown**: comment afficher un spinner conforme à l'usage shadcn, dans un
projet qui n'utilise pas lucide-react ni le mapping shadcn primitif ?

**Decision**: la convention shadcn pour un spinner est « une icône en rotation
avec `animate-spin` ». Le projet utilise `@phosphor-icons/react` : on utilise
l'icône **`CircleNotch`** avec la classe **`animate-spin`** (utilitaire core de
Tailwind v4, déjà disponible ; `tw-animate-css` présent en dépendance).
Placée à gauche de la ligne « Recherche des imprimantes… » du menu déroulant,
avec `aria-hidden="true"` (le texte porteur est déjà accessible).

**Rationale**: zéro nouvelle dépendance, cohérence visuelle avec le
`CaretUpDown`, `Warning`, `Check` déjà utilisés ; visual conforme au look
shadcn (spinner circulaire animé) exigé par l'utilisateur.

**Alternatives considered**:
- `npx shadcn add` + lucide + composant Loader circular → **rejetée** :
  tire une dépendance (`lucide-react`) pour un symbole équivalent dispo en
  phosphor (KISS/YAGNI).
- Spinner maison (div + border + animate-spin) → **rejetée** : plus verbeuse
  que l'icône existante.
- Émoji 🕒 → **rejetée** : incohérent avec le système d'icônes.

## R3 — Bouton « Actualiser » dans le menu déroulant du sélecteur

**Unknown**: où placer le bouton et comment le rendre sans perturber la
navigation clavier du composant base-ui `Select` ?

**Decision**: le bouton « Actualiser » est une **ligne de pied dans le popup** :
un second élément enfant de `SelectPopup`, sous `SelectList` (le popup étant un
`div` conteneur, `SelectList` un `ul`). Ligne discrète : icône
`ArrowClockwise` phosphor + libellé « Actualiser », style hover `bg-accent`.
Elle est rendue **uniquement si `printerScan !== "scanning"`** (états `idle`
et `done`) et appelle `startScan()` au clic.

Comportement verrouillé :
- jamais de scan concurrent : pendant `scanning`, la ligne n'existe pas (le
  spinner est affiché à sa place dans la liste) ;
- le clic reste dans le popup → base-ui ne ferme pas le select
  (fermeture = pointerdown *hors* popup ou Échap) → on voit le spinner
  se relancer dans le même menu ;
- pas d'ajout dans `SelectList` (le `ul`) pour ne pas interférer avec la
  navigation clavier (↑/↓, entrée) des `SelectItem`.

**Rationale**: le pied de popup est visuellement distinct de la liste,
n'interagit pas avec le modèle de navigation des items, et coïncide avec les
habitudes UI (action secondaire en bas de menu, ex. « re-scanner »).

**Alternatives considered**:
- `SelectItem` dédié (`value="__refresh__"`, `disabled`) avec gestion dans
  `onValueChange` → **rejetée** : pollue la navigation clavier et le modèle
  valeur.
- Icône cliquable dans le `SelectTrigger` → **rejetée** : l'utilisateur a
  explicitement demandé « dans le dropdown du select ».
- Re-ouvrir/fermer pour forcer le scan → **rejetée** : moins fluide.

## R4 — Auto-scan à l'ouverture vs bouton « Actualiser »

**Unknown**: faut-il conserver le déclenchement automatique du scan à la
première ouverture du sélecteur ?

**Decision**: oui, conservé **tel quel** (`handlePrinterOpenChange` : scan
seulement si état `idle` et aucun `printerAddress` défini). Le bouton
« Actualiser » est le moyen **explicite** de relancer — y compris quand une
imprimante est déjà sélectionnée (cas que l'auto-scan n'exécute pas).

**Rationale**: ne pas changer le comportement 006 déjà validé (pas de
régression) ; le bouton couvre le besoin manquant (re-scanner volontairement).
`startScan()` devient la seule source d'un scan, DRY entre `onOpenChange` et
le bouton.

## Consolidation

Toutes les inconnues sont résolues. Aucune `NEEDS CLARIFICATION` restante.
Changements prévus uniquement dans `components/settings-footer.tsx`
(+ introduction d'un `startScan()` et d'un indicateur de scan), tests
`settings-footer.test.tsx`, et documentation (contracts/ui.md, quickstart.md).