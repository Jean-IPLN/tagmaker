# Contrat — Rotation ZPL du contenu

## Principes invariants

- Canvas inchangé : `^PW{widthDots}^LL{heightDots}` du format (le support ne
  bouge pas), `^LH0,0`, structure des builds `build.ts`/`location.ts` intacte.
- Rotation **par élément** (pas de `^FW` global) : seule l'orientation de
  chaque élément change, `N` → `B` (research D1/D2).

| Module | Élément | Normal | Pivoté |
|--------|---------|--------|--------|
| EAN-13 | code-barres `^BEN,...` | `^BEN` | `^BEB` |
| EAN-13 | texte (si présent) | — | — |
| Emplacement | code-barres `^BCN,...` | `^BCN` | `^BCB` |
| Emplacement | texte OCR-B `^AEN,...` | `^AEN` | `^AEB` |

- `B` = rotation 90° antihoraire : le **haut** du contenu se retrouve à
  **gauche** de l'étiquette, le bas à droite (validation par la spec, FR-003).

## Mise en page rotée (axes échangés)

`computeBarcodeLayout` est appelé avec les axes échangés :

| Rôle du calcul | Normal | Pivoté |
|----------------|--------|--------|
| Module width / centrage `x` | axe long du format | axe **court** du format |
| Hauteur barres / empilage `y` | axe court | axe **long** |

Conséquences :
- module width minimal (2 dots) quand l'axe court est juste suffisant ;
- la « hauteur de barres » (axe long) reste bornée par la couverture (0,9) et
  l'espace texte (rapports existants) ; zéro changement de code géométrique.

## Ancrage `^FO` selon l'orientation

Convention ZPL d'origine du champ : `N` = coin supérieur gauche, `R` = coin
supérieur droit, `I` = coin inférieur droit, `B` = coin **inférieur gauche**.
En `B`, chaque élément est posé par son ancre réelle — la conversion des
coordonnées du layout roté vers `^FO` est le seul point de logique nouveau
dans les builders et MUST être couverte par un test unitaire de parse ZPL
(lagéveloppe + coin), puis validée physiquement (quickstart, **[TEST]**).

## Seuil de faisabilité (non-rognage)

La rotation n'est émise que si `min(widthMm, heightMm) ≥ seuil(module, dpi)`
(190 dots EAN-13 / 158 dots Emplacement à 203 dpi) — centralisé dans
`lib/orientation.ts` (DRY, jamais écrit en dur).

## Exigences couvertes

FR-003 (adaptation + sens antihoraire), FR-009 (format carré : axes échangés
identiques → aucune différence visible), FR-010 (contenu contenu sans rognage).