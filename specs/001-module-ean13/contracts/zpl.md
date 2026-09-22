# Contrat ZPL — Étiquette EAN-13 (format 40 × 25 mm temporaire)

Génération du flux ZPL envoyé à l'imprimante. Rendu du code-barres :
commande native `^BE` (EAN-13). Référence : [research.md](../research.md).

## Paramètres (depuis `.env`, résolution 203 dpi = 8 dots/mm)

| Variable | Valeur | Conversion |
|----------|--------|------------|
| `ZPL_LABEL_WIDTH_MM` | 40 | `^PW` = 40 × 8 = 320 dots |
| `ZPL_LABEL_HEIGHT_MM` | 25 | `^LL` = 25 × 8 = 200 dots |
| `ZPL_RESOLUTION_DPI` | 203 | facteur de conversion mm → dots |

Ces valeurs sont temporaires : les tailles définitives d'étiquettes seront
définies ultérieurement, ces paramètres n'auront alors qu'à être modifiés
dans `.env` (aucun changement de code attendu).

## Flux généré (structure)

```zpl
^XA
^PW320^LL200            ; largeur d'impression (largeur étiquette)
^LH0,0                  ; origine en haut à gauche
^BY2,3,120              ; module 2 dots, ratio 3, hauteur barres 120 dots (~15 mm)
^FO70,30^BEN,120,Y,N    ; EAN-13, non roté, ligne lisible sous les barres
^FD590123412345^FS     ; 12 chiffres de données (imprimante calcule la clé)
^PQ5                    ; nombre de copies = quantité demandée
^XZ
```

### Justification des valeurs
- `^BEh = 120` dots : hauteur de barres ~15 mm, compatible avec une étiquette
  de 25 mm de longueur (marge haute et basse). À affiner au premier rendu
  réel ; une hauteur pleine retail (25,9 mm) ne tiendrait pas sur 25 mm.
- `^BY2` : symbole ≈ 95 × 2 = 190 dots (~24 mm) < 320 dots de large, laissant
  les zones de silence requises (11 modules gauche, 7 droite) — à vérifier
  lors du scan réel.
- `^FD` : **12 chiffres** uniquement (les 13 premiers sans la clé), car `^BE`
  accepte 12 caractères et calcule la clé de contrôle lui-même. Si l'app est
  l'unique source de validation, on peut aussi envoyer 13 chiffres et le
  printer vérifie — choix retenu : 12, pour la compatibilité stricte de `^BE`.

## Règles
- Toute étiquette : `^XA` … `^XZ`.
- Nombre de copies = quantité demandée via `^PQ<quantity>` (pas de boucle
  application — le printer répète l'étiquette).
- Le flux est construit dans `lib/zpl/build.ts` (fonction pure, testée).

## Cas limites
- `^PQ` accepte une quantité élevée ; la validation métier borne la quantité à
  1000 (règle partagée client/serveur) pour rester sous la limite imprimante
  et éviter les boucles d'impression accidentelles.
- En cas de rotation inhabituelle impossible sur 40×25 (pas de rotation) :
  `^BEN` (N par défaut).