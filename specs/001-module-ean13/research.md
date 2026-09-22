# Recherche — Module EAN-13

Résolutions des points ouverts du Technical Context pour l'impression
d'étiquettes EAN-13 sur imprimante ZPL.

## 1. Rendu du code-barres EAN-13 sur imprimante ZPL

**Decision**: Utiliser la commande ZPL `^BE` (EAN-13 Bar Code). Le code-barres
est rendu nativement par l'imprimante ; aucun fichier image, aucune
bibliothèque de génération de code-barres n'est nécessaire côté applicatif.

**Rationale**: `^BEo,h,f,g` encode EAN-13 directement. La saisie en `^FD` est
limitée à 12 caractères : l'imprimante calcule elle-même le 13ᵉ chiffre
(clé mod 10). Comme la validation côté app vérifie l'EAN-13 complet (13
chiffres + checksum), on transmet les 12 chiffres de données à `^BE` et
l'imprimante recalcule la clé — résultat identique, aucune duplication de la
règle métier dans le ZPL. La largeur du symbole est fixe : 95 modules.

**Alternatives considered**: Générer l'image du code-barres côté client (lib
JS) puis l'intégrer en `^GF` — rejeté : image binaire lourde, dépendance
supplémentaire, qualité dépendante du raster ; le ZPL natif est plus simple
et plus fiable (KISS).

## 2. Communication avec l'imprimante

**Decision**: Envoi du flux ZPL brut via socket TCP (protocole nativement
supporté par les imprimantes Zebra) sur le port 9100, depuis un route handler
Next.js côté serveur (Node `net.Socket`).

**Rationale**: Le port 9100 est le protocole standard de facto des imprimantes
ZPL sur réseau ; aucune bibliothèque tiers ni driver OS requis. Le flux est
envoyé depuis le serveur (pas le navigateur) car les navigateurs ne peuvent
pas ouvrir arbitrairement des sockets TCP vers le réseau local.

**Alternatives considered**:
- ZebraNET / SNMP : protocoles réels mais plus complexes, aucun besoin en v1
  (YAGNI).
- Impression via le navigateur local (sockets Web/WebUSB) : pas adapté à une
  imprimante réseau IP, portabilité limitée.

## 3. Format papier (temporaire) et dimensions ZPL

**Decision**: Format 40 mm (largeur) × 25 mm (longueur), paramétré via
`.env`, converti en dots à 203 dpi (8 dots/mm). Valeurs ZPL par défaut :
`^PW320` (40 mm × 8) et `^LL200` (25 mm × 8).

**Rationale**: 203 dpi est la résolution la plus courante des imprimantes
d'étiquettes ; 1 mm = 203/25,4 ≈ 8 dots. Les tailles définitives sont à
définir : on rend la largeur/longueur configurables dès maintenant pour ne
rien casser au changement, sans ajouter de UI de configuration (YAGNI — on
ajustera le `.env`).

**Points d'attention** (à affiner à l'impression réelle) :
- Hauteur de barres `^BEh` : ~15 mm (120 dots) pour tenir dans 25 mm de
  longueur, à ajuster selon le rendu.
- Largeur de module `^BY2` → symbole ≈ 190 dots (~24 mm), zone de silence
  requise (11 modules gauche, 7 droite) : le symbole doit rester centré et
  non collé au bord de l'étiquette de 320 dots.

**Alternatives considered**: Détection de la résolution d'imprimante via
requête réseau — rejeté (YAGNI, complexité inutile pour la v1 locale).

## 4. Thème et composants d'interface (shadcn/ui)

**Decision**: Appliquer le preset fourni par l'utilisateur :
`npx shadcn@latest apply --preset b1FSRMDw0` (ou `init --preset
b1FSRMDw0` au scaffold). Les codes de preset sont opaques : on les transmet
tels quels au CLI, qui gère la résolution (thème, typo, radius, icônes).

**Rationale**: Preset explicitement demandé ; le CLI shadcn (v4+) gère
l'application complète (config, CSS variables, composants). Composants
nécessaires : Card (galerie), Form + Input + Button (formulaire EAN-13),
AlertDialog (modal critique), Sonner/Toast (erreurs imprimante).

**Modal critique**: Utiliser `AlertDialog` (variante de Dialog shadcn) pour
la confirmation de quantité > 2 : comportement modal, emphase critique
variante destructive, actions "Annuler"/"Confirmer" explicites. Répond à
l'exigence "modal gérée par dialog de shadcn".

## 5. Validation EAN-13

**Decision**: Lib unique `lib/ean13/validate.ts` (13 chiffres exactement +
clé de contrôle modulo 10, conformément à la norme EAN/UCC), utilisée côté
client (Zod) ET côté serveur (route d'impression) via un schéma Zod partagé.

**Rationale**: Le serveur ne doit jamais faire confiance au client pour la
validation (sécurité minimale) ; le partage du schéma évite la duplication
(DRY).

## 6. Environnement / configuration

**Decision**: Variables serveur dans `.env` (non versionné) + `.env.example`
(modèle versionné, valeurs fictives) :
- `ZPL_PRINTER_HOST=192.168.1.63`
- `ZPL_PRINTER_PORT=9100`
- `ZPL_LABEL_WIDTH_MM=40`
- `ZPL_LABEL_HEIGHT_MM=25`
- `ZPL_RESOLUTION_DPI=203`

**Rationale**: Conforme à la sécurité minimale de la constitution : aucun
secret/config matérielle en dur dans le code.

## 7. Stack de test

**Decision**: Vitest + React Testing Library (composants/pages) + Supertest
(route handlers API) ; coverage cible > 80 % (constitution).

**Rationale**: Standard Next.js/React ; la logique pure (`lib/`) est testable
sans DOM ; la route API est testée via ses handlers (validation + génération
ZPL + envoi avec mock réseau).