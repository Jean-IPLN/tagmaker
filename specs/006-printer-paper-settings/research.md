# Recherche — Paramétrage imprimante et taille de papier

## Décisions

### D1 — Découverte des imprimantes : scan serveur du sous-réseau local, port ZPL

**Décision** : une route API serveur `GET /api/printers/discover` sonde le
sous-réseau local (par défaut le `/24` dérivé de `ZPL_PRINTER_HOST`) sur le
port `ZPL_PRINTER_PORT` (9100) avec des connexions TCP à délai court et
parallèles ; elle renvoie la liste des adresses dont le port est ouvert.

**Justification** : un navigateur ne peut pas ouvrir de connexion TCP brute ni
sonder un réseau (sandbox, CORS) ; le scan appartient donc au serveur local.
Résultat alimentant la liste déroulante « Imprimante » à l'ouverture du
sélecteur (FR-014).

**Alternatives écartées** :
- Scan côté navigateur (websocket/WebRTC) → bloqué par le navigateur, fragilité.
- mDNS/bonjour → nouvelle dépendance système, non fiable sur Windows.
- Liste fixe dans la config → écartée par l'utilisateur (choix C : découverte).

### D2 — Paramétrage des formats papier : variable d'environnement lisible par l'humain

**Décision** : nouvelle variable d'environnement serveur `ZPL_PAPER_SIZES`,
liste séparée par des virgules au format humain `largeurxlongueur`
(ex. `40x25, 50x25, 60x40, 100x50`), dimensions en millimètres. Une fonction
pure de `lib/paper-sizes.ts` parse, valide chaque format, calcule la surface
(largeur × longueur) et trie la liste **par surface croissante** (FR-011).

**Justification** : demande explicite de l'utilisateur (« liste dans le .env au
format orienté humain, en millimètres largeurxlongueur, triée par surface à
calculer »).

**Format de l'identifiant** : normalisé `"<largeur>x<longueur>"` (ex. `40x25`),
étiquette d'affichage `"40 × 25 mm"`. En l'absence de la variable, la valeur
par défaut est dérivée de la taille actuelle (`ZPL_LABEL_WIDTH_MM` ×
`ZPL_LABEL_HEIGHT_MM`, soit 40 × 25) → le format actuel reste la valeur par
défaut (FR-010).

### D3 — Mémorisation des réglages : cookie `tagmaker_print_settings`

**Décision** : un cookie navigateur JSON `tagmaker_print_settings` contient
`{ paperId?: string, printerAddress?: string }` (au plus une valeur chacun).
Écrit **seulement** sur choix explicite de l'utilisateur ; `path=/`,
`SameSite=Lax`, `Max-Age` 30 jours, non chiffré (aucun secret).

**Justification** : la persistance locale existante (feature 005) repose déjà
sur les cookies ; la demande utilisateur précise « l'imprimante sélectionnée
est stockée dans les cookies ». La taille de papier est conservée dans le même
cookie pour une restauration conjointe (FR-004, FR-007).

### D4 — Sélection de l'imprimante : aucun choix automatique

**Décision** : aucun « premier de la liste » appliqué automatiquement. Si le
cookie contient une adresse → le sélecteur l'affiche directement **sans
scan** (FR-013). Sinon → sélecteur dans l'état non sélectionné avec
**avertissement** (FR-012) ; l'ouverture du sélecteur déclenche le scan réseau
(FR-014) ; seul un choix explicite est mémorisé.

**Justification** : décision utilisateur explicite (sélection explicite
uniquement, voir glutin `Clarifications`).

### D5 — Transmissions des réglages à l'impression : paramètres de requête

**Décision** : la requête d'impression existante (`POST /api/print/ean13`)
accepte désormais deux champs optionnels : `paper` (identifiant de format) et
`printerAddress`. Fournis → ils surchargent la configuration d'environnement
pour cette impression ; absents → repli sur les valeurs `.env` actuelles
(FR-008 : aucune impression bloquée).

**Justification** : le pipeline d'impression existant (module EAN-13) est
réutilisé tel quel (dépendance de la spec) ; la sélection UTILISATEUR reste la
source de vérité au moment de l'envoi, la config `.env` servant de filet de
sécurité.

### D6 — Lecture SSR des formats, lecture cookie côté client

**Décision** : la liste des formats (parsée + triée côté serveur) est passée en
props depuis `app/layout.tsx` (serveur) jusqu'à la section Paramètres (client) ;
la valeur initiale du sélecteur « Papier » = cookie (papier) sinon format par
défaut. Le sélecteur « Imprimante » lit le cookie **côté client** uniquement
(pas de scan en SSR).

**Justification** : séparation des préoccupations (SOC) : le serveur fournit la
configuration, le client gère l'interactivité, le scan réseau reste une API
serveur à la demande (jamais pendant le rendu).

## Résumé des résolutions NEEDS CLARIFICATION

| Point | Résolution |
|-------|------------|
| Formats papier | `.env` via `ZPL_PAPER_SIZES`, humain `largeurxlongueur` en mm, tri par surface croissante |
| Imprimantes | Découverte réseau automatique (scan serveur TCP port 9100, /24) |
| Comportement sans imprimante définie | État non sélectionné + avertissement, scan à l'ouverture, choix explicite seul mémorisé |