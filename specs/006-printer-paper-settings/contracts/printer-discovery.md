# Contrat — Découverte des imprimantes (scan réseau)

## Endpoint

`GET /api/printers/discover`

## Requête

- Aucun corps. Paramètre de sous-réseau serveur, jamais client.

## Réponse

- `200`: `{ "printers": PrinterDevice[] }` avec
  `PrinterDevice = { address: string; port: number; hostname?: string | null }`.
- `printers` peut être vide : scan terminé sans appareil (état « Aucune
  imprimante détectée »), jamais d'erreur pour un scan vide.
- `503`: scan impossible (sous-réseau non déterminable) → le client traite
  comme « aucune imprimante détectée » (retour sûr).

## Sémantique du scan (serveur, `lib/printer/discovery.ts`)

- Cible : tout le sous-réseau **/24** dérivé des trois premiers octets de
  `ZPL_PRINTER_HOST` (ou `ZPL_SCAN_SUBNET` si fournie), hors **IP locale
  réelle du serveur** (déterminée via `os.networkInterfaces()`). L'IP
  configurée dans `ZPL_PRINTER_HOST` n'est **pas** exclue du scan.
- Port sondé : `ZPL_PRINTER_PORT` (défaut 9100), protocole TCP.
- Connexions **parallèles** (tout le `/24` en une seule passe, 254 adresses
  moins l'IP locale du serveur), délai d'attente par adresse ≤ 1000 ms ; une
  adresse est « détectée » si le port accepte la connexion (puis fermeture
  immédiate, **aucune donnée** envoyée).
- Pire cas : ~1 s pour le `/24` entier ; budget total borné (≤ ~30 s) en garde-fou.
- Sécurité : scan limité au sous-réseau local configuré (jamais l'internet),
  port unique dédié à l'impression ZPL, aucun payload écrit sur les sockets
  sondées.

## Utilisation (client)

- Déclenché **uniquement** à l'ouverture du sélecteur « Imprimante » quand le
  cookie `tagmaker_print_settings` ne contient pas d'`printerAddress`
  (FR-013 / FR-014).
- Pendant le scan : état « Recherche des imprimantes… », sélecteur non
  sélectionnable ; injecte les résultats dans les options.

## Exigences couvertes

FR-011/FR-014 (scan à l'ouverture), FR-012/FR-015 (état vide / aucune détection),
edge cases « réseau indisponible », « aucune imprimante détectée ».