# Modèle de données — Paramétrage imprimante et taille de papier

## Entités

### Taille de papier (`PaperSize`)

Représente un format d'étiquette proposé dans le sélecteur « Papier ».

| Champ | Type | Contraintes |
|-------|------|-------------|
| `id` | `string` | normalisé `"<largeur>x<longueur>"`, ex. `40x25` ; non vide |
| `widthMm` | `number` | entier strictement positif, millimètres |
| `heightMm` | `number` | entier strictement positif, millimètres |
| `surfaceMm2` | `number` | dérivée : `widthMm × heightMm` (> 0), sert au tri |
| `label` | `string` | affichage humain `"40 × 25 mm"` |

- Source de vérité : variable d'environnement `ZPL_PAPER_SIZES` + taille
  courante (`ZPL_LABEL_WIDTH_MM`/`ZPL_LABEL_HEIGHT_MM`) comme repli/défaut.
- Règles : au moins un format toujours présent ; la liste ne contient jamais de
  doublon d'`id` ; tri par `surfaceMm2` croissant (FR-011).
- Validation : un format illisible (`zpl`, `abc`, `-3x0`) est **écarté**
  silencieusement ; si aucun format valide, repli sur le format courant.

### Imprimante (`PrinterDevice`)

Représente un appareil détecté sur le réseau local, option du sélecteur.

| Champ | Type | Contraintes |
|-------|------|-------------|
| `address` | `string` | adresse IPv4 (ex. `192.168.1.63`) |
| `port` | `number` | entier positif, défaut `ZPL_PRINTER_PORT` (9100) |
| `hostname` | `string (optionnel)` | identifiant amical si résolu pendant le scan (bonus non bloquant) |

- Création : par le scan réseau (port TCP ouvert) et par la lecture du cookie.
- Identification : `address` (unique dans une liste).

### Réglages d'impression (`PrintSettings`)

Couple des choix UTILISATEUR, persistés dans le cookie `tagmaker_print_settings`.

| Champ | Type | Contraintes |
|-------|------|-------------|
| `paperId` | `string (optionnel)` | identifiant d'un `PaperSize` de la liste |
| `printerAddress` | `string (optionnel)` | adresse d'une imprimante |

- Ni `paperId` ni `printerAddress` présents → « aucun réglage utilisateur » :
  papier = format par défaut ; imprimante = état non sélectionné (avertissement).
- Validation à la lecture : valeurs hors référence (format inconnu, adresse
  invalide) ignorées individuellement, cookie malformé → réglages vides
  (retour sûr, jamais d'erreur).

## Persistance

| Donnée | Support | Durée | Exemple |
|--------|---------|-------|---------|
| `PrintSettings` | cookie `tagmaker_print_settings` | 30 jours (`Max-Age`), `path=/`, `SameSite=Lax`, non HttpOnly | `{"paperId":"40x25","printerAddress":"192.168.1.63"}` |
| Liste `PaperSize` | `.env` (`ZPL_PAPER_SIZES`) + dérivation de la taille courante | configuration | `40x25,50x25,60x40,100x50` |
| Liste `PrinterDevice` | résultat d'exécution (scan), jamais persistée en dur | session du sélecteur | — |

Aucune de ces données n'est sensible (pas de secret, tokens ou identifiants
personnels) → cookie non HttpOnly acceptable dans cet environnement local.

## Transitions d'état (sélecteur « Imprimante »)

| État | Condition | Visuel | Action à l'ouverture |
|------|-----------|--------|----------------------|
| Sélectionné | `printerAddress` dans le cookie | valeur affichée | **aucun scan** (FR-013) |
| Non sélectionné | aucun cookie | « Imprimante non définie » + avertissement | scan réseau → options (FR-014) |
| Aucun résultat | scan terminé sans appareil | « Aucune imprimante détectée » | réessai possible en rouvrant |

Le sélecteur « Papier » n'a pas d'état vide : il présente toujours au moins le
format par défaut (FR-008, FR-010).