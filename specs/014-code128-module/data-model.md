# Phase 1 — Modèle de données : module Code 128

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-30

Aucune entité persistée : le module ne stocke rien. Les « données » sont la
requête, les valeurs dérivées du code-barres et les réglages déjà existants.

## 1. Contenu (value object)

| Champ | Type | Règles |
|-------|------|--------|
| `content` | chaîne | Requis ; espaces de début/fin supprimés (`trim`) ; longueur 1–80 après trim ; caractères ASCII imprimables uniquement (`U+0020`–`U+007E`) ; casse et espaces internes conservés |

Invariants :
- `content.length >= 1` — sinon « Le contenu est requis ».
- `content.length <= 80` — sinon « Le contenu ne peut pas dépasser 80 caractères ».
- `content` ne contient ni accent, ni emoji, ni caractère de contrôle —
  sinon « Le contenu ne peut contenir que des caractères ASCII imprimables ».
- Le contenu doit tenir sur le papier sélectionné (voir §4) — sinon rejet
  serveur explicite.

## 2. Requête d'impression

`POST /api/print/code128`

| Champ | Type | Requis | Règles |
|-------|------|--------|--------|
| `content` | chaîne | oui | §1 |
| `quantity` | entier | oui | 1–1000 ; messages identiques aux modules existants |
| `paperId` | chaîne | non | identifiant de format connu, sinon `422` |
| `printerAddress` | IPv4 | non | adresse de l'imprimante ; sinon imprimante par défaut |
| `rotated` | booléen | non | défaut `false` ; format non pivotable → `422` |

Pas de champ `mode` : une seule impression de contenu à la fois (pas de
plage, pas de séquence).

## 3. Étiquette Code 128 (dérivée, non persistée)

| Valeur | Formule / règle |
|--------|-----------------|
| `symbolModules` | `11 × n + 35` (sous-ensemble B : 11 modules/caractère + 35 de structure) |
| `quietModules` | `20` (10 de chaque côté) |
| `totalModules` | `symbolModules + 20` |
| `moduleWidth` | `clamp(⌊axeCode / totalModules⌋, 2, 8)` |
| `barsWidth` | `symbolModules × moduleWidth` |
| `textHeight` | `0,18 × axeTexte`, borné 25–110, arrondi au multiple de 28 (cellule OCR-B), puis réduit si la largeur disponible l'exige |
| `wCell` | `⌊0,48 × textHeight⌋` (largeur de cellule OCR-B demandée) ; le centrage est délégué à `^FB`, sans estimation d'avance |
| `gap` | `⌊0,15 × textHeight⌋` |
| `barHeight` | hauteur du bloc (90 % de l'axe) − texte − gap, minimum 51 |
| Axes (normal) | code et texte le long de `widthDots` |
| Axes (pivoté) | code et texte le long de `heightDots` |

Contrat ZPL : `^BY<moduleWidth>,3,<barHeight>` +
`^FO…^BCN,<barHeight>,N,N,N` + `^FD<escapedContent>^FS` + champ texte
`^AEN/^AEB,<textHeight>,<wCell>^FB<axe>,1,0,C` (OCR-B, HRI désactivée, centrage imprimante) + `^PQ<quantity>`.

## 4. Limites de longueur par format (dérivées, calculées serveur)

`L = min(80, ⌊(axeCode / 2 − 55) / 11⌋, ⌊(axeTexte − 20) / 15⌋)`

| Format | Normal | Pivoté |
|--------|--------|--------|
| 40 × 25 mm (320 × 200 pts) | 9 | 4 |
| 75 × 25 mm (600 × 200 pts) | 22 | 4 |
| 100 × 50 mm (800 × 400 pts) | 31 | 13 |
| 100 × 150 mm (800 × 1200 pts) | 31 | 49 |

La borne papier est toujours plus stricte que le plafond de 80 : le message
de rejet indique la limite réelle du format (« … caractères max »).

## 5. Résultat d'impression

| Cas | HTTP | Corps |
|-----|------|-------|
| Envoi accepté | 200 | `{ "status": "sent", "labels": <quantity> }` |
| Corps JSON invalide / validation / papier inconnu / rotation impossible / contenu trop long | 422 | `{ "error": { "code": "VALIDATION_ERROR", "message": "…" } }` |
| Impression déjà en cours sur l'endpoint | 409 | `{ "error": { "code": "PRINT_IN_PROGRESS", "message": "Une impression est déjà en cours." } }` |
| Imprimante injoignable / échec d'envoi | 503 | `{ "error": { "code": "PRINTER_UNAVAILABLE", "message": "Imprimante injoignable ou envoi échoué." } }` |

## 6. Module enregistré

| Champ | Valeur |
|-------|--------|
| `id` | `code128` |
| `name` | `Code 128` |
| `description` | `Imprimer des étiquettes Code 128 à contenu libre` |
| `href` | `/code128` |

Consommé par la page d'accueil, la barre latérale, l'en-tête et le suivi des
modules récents ; aucune autre table de correspondance.

## 7. États du formulaire

```text
saisie
  └─ submit invalide ──────────────► erreur (toast), reste en saisie
  └─ submit valide, quantité ≤ 2 ──► envoi ─┬─ 200 ─► succès (toast)
  └─ submit valide, quantité > 2 ──► confirmation
        ├─ annuler ─► saisie
        └─ confirmer ─► envoi ─┬─ 200 ─► succès (toast)
                               └─ 4xx/5xx ─► erreur (toast), reste en saisie
```

Le garde-fou « aucune imprimante sélectionnée » intervient au début de
l'envoi, avant tout appel réseau (comportement des modules existants).
