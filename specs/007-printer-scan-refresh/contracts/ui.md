# UI Contract: Découverte d'imprimantes : spinner et actualisation

**Feature**: [spec.md](../spec.md) | **Date**: 2026-09-23

Contrat du pied de barre latérale (`SidebarFooter` → `SettingsFooter`) — les
contrats serveur (découverte, impression, cookie) sont inchangés, cf.
feature 006.

## Sélecteur « Papier » (inchangé, réaffirmé)

- Formats listés depuis **`ZPL_PAPER_SIZES`** du fichier `.env`, formats
  « largeur×hauteur » séparés par des virgules (ex. `40x25, 50x25, 100x50`),
  idem `;`. (FR-001, FR-002)
- Formats invalides ignorés silencieusement ; liste vide → format par défaut.
  (FR-003)
- Aucune liste déroulante n'étant affectée par cette feature.

## Menu déroulant « Imprimante » (modifié)

### Contenu de la liste

| État | Rendus | Notes |
|------|--------|-------|
| `scanning` | Liste vide (le statut de recherche est affiché dans le pied de menu, voir ci-dessous) | (FR-004, FR-005) |
| `done`, 0 imprimante | Ligne inactive « Aucune imprimante détectée » | (FR-009) |
| `done`, ≥ 1 imprimante | Lignes `PrinterDevice` (adresse IP), la sélection courante marquée | (FR-009) |

### Pied de menu : slot de statut du scan (deux facettes d'un seul emplacement)

Le fuseau du bas de popup (sous `SelectList`, séparé par une bordure) donne
soit le statut de recherche, soit l'action d'actualisation — jamais les deux
à la fois :

| État | Facette rendue | Notes |
|------|----------------|-------|
| `idle` / `done` | Bouton **« Actualiser »** (libellé + icône flèche circulaire, hover `bg-accent`) | (FR-006) |
| `scanning` | « **Recherche des imprimantes…** » précédé d'un **spinner animé** (icône en rotation, `animate-spin`) | (FR-004, FR-005, FR-008) |

- Le bouton est **visible dès qu'aucune recherche n'est en cours** (`idle`,
  `done` — y compris après un échec réseau), **absent** pendant `scanning` :
  le spinner occupe le même emplacement — **jamais deux scans simultanés**.
- Action : relance un **scan complet** d'imprimantes (mêmes cibles /24,
  même budget temps) ; la facette « recherche » réapparaît pendant le scan.
  (FR-007)

### A11y / navigation

- Le spinner est `aria-hidden="true"` — le texte « Recherche des
  imprimantes… » est le porteur sémantique.
- Le bouton « Actualiser » est un vrai `<button>` accessible (focus,
  libellé) ; son activation ne suppose pas la navigation clavier des items.
- La valeur sélectionnée (`printerAddress`) n'est jamais effacée par une
  relance de scan.

## Contrat du composant (inchangé)

```ts
interface SettingsFooterProps {
  paperSizes: PaperSize[];   // formats du .env (via layout, feature 006)
  defaultPaperId: string;    // format courant par défaut
}
```

Props et signatures identiques — aucune migration nécessaire.