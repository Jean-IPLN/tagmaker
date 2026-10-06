# Quickstart — orientation d'impression

Étapes manuelles de validation de la feature, incluant le **test d'impression
physique** (`nc`) à faire sur l'imprimante avant de commencer les tâches.

## Prérequis

- Serveur dev en cours d'exécution (`pnpm dev`), application ouverte dans le
  navigateur.
- Imprimante ZPL joignable sur le LAN (hôte : `ZPL_PRINTER_HOST`, port 9100).
- Tests automatisés : `pnpm vitest run` (seuil de couverture 80 %, nouvelles
  suites incluses) + `scripts/__tests__` si la ligne de commande shell du
  dev/test est touchée (non prévu).

## Test d'impression physique obligatoire (avant les tâches)

Confirme `D1`/`D2` (sens antihoraire + ancres) sur la vraie imprimante.
Remplace `192.168.1.63` par `ZPL_PRINTER_HOST`. Deux étiquettes
« SENS-R » (orientation `^AER`, 90° horaire) et « SENS-B » (orientation
`^AEB`, 90° antihoraire) :

```bash
printf '\033^XA^PW320^LL200^LH0,0^FO20,70^AER,40,30^FDSENS-R^FS^FO20,170^AEB,40,30^FDSENS-B^FS^XZ' \
  | nc -w 10 192.168.1.63 9100
```

> `\033` = ESC réel de début de ZPL ; le `^` est le caractère caret littéral
> (code ZPL). Sans `printf`, équivalent : `printf '\x1b^XA...'`.

Résultat attendu :

| Observation sur l'étiquette imprimée | Interprétation |
|--------------------------------------|----------------|
| **« SENS-B » a le haut du contenu du côté gauche** | **Antihoraire conforme FR-003 → coder avec `B`** |
| « SENS-R » a le haut du contenu du côté droit | Horaire : confirme que `R` est l'autre sens |
| Texte tronqué / illisible    | Reporter l'impression ; vérifier ancres/coordonnées |

→ **Interprétation** : si `SENS-B` (antihoraire) montre bien le haut du
contenu à gauche, on code en `B` ; sinon corriger `D1`/`D2` dans la spec avant
les tâches. Attente du résultat utilisateur avant toute écriture de code.

**Résultat enregistré (2026-10-05, impression réelle via `nc`) :**
`SENS-B` a le haut du contenu du côté gauche → **D1 verrouillé en `B`
(antihoraire)**, ancres `B` validées. Note : le ZPL envoyé via `printf` doit
se terminer par `\n` (le here-doc fonctionne toujours).

## Test d'impression physique pivotée (T025, après implémentation)

ZPL réelle émise par les builders pour un format **`100x150`** (800×1200 dots
@203 dpi), orientation activée. Remplace `192.168.1.63` par `ZPL_PRINTER_HOST`.

EAN-13 pivotée (code donnée transmis sans la clé, `^BEB`) :

```bash
nc -w 10 192.168.1.63 9100 <<'EOF'
^XA^PW800^LL1200^LH0,0^BY5,3,695^FO53,363^BEB,695,Y,N^FD590123412345^FS^PQ1^XZ
EOF
```

Emplacement pivotée (barres gauche, texte OCR-B droite, `^BCB`/`^AEB`) :

```bash
nc -w 10 192.168.1.63 9100 <<'EOF'
^XA^PW800^LL1200^LH0,0^BY8,3,591^FO40,284^BCB,591,N,N,N^FD1A5B^FS^FO648,484^AEB,112,54^FD1A5B^FS^PQ1^XZ
EOF
```

> Le here-doc quote `'EOF'` (aucune interpolation) et ajoute automatiquement le
> `\n` final indispensable à la dernière commande — le `printf` sans `\n` ne
> fonctionne pas (constaté au test D1).

Résultats attendus :

| Observation | Interprétation |
|-------------|----------------|
| Barres verticales, haut du contenu à gauche, tout contenu dans l'étiquette | Rotation `B` conforme, aucune correction |
| Rognage / sortie de zone | Revoir les ancres/positions dans `lib/zpl/rotated-layout.ts` |
| EAN-13 et Emplacement lisibles | OK — sur 100×150 les marges (dont les zones de silence EAN-13) sont largement respectées |

**Résultat enregistré (à compléter après le test T025) :** …

## Validation détaillée (après implémentation)

1. **Non-régression** : imprimer une étiquette EAN-13 et une Emplacement en
   orientation normale → strictement identique à avant (FR-004).
2. **Rotation (format compatible, ex. 40×25)** :
   - activer « Orientation » → `rotated=true` écrit dans le cookie ;
   - imprimer EAN-13 : les barres verticales, le nombre lisible en tournant
     l'étiquette un quart de tour à gauche ; le haut du contenu à gauche ;
     aucun rognage (FR-003, FR-010) ;
   - même test avec l'Emplacement (FR-005/FR-006).
3. **Reload** : recharger la page → le switch reste activé (FR-007/FR-012).
4. **Format incompatible** (temps fort) : basculer sur format 20×30
   (si présent) → le switch passe désactivé, `rotated=false`, impression en
   normal (FR-013) ; revenir sur 40×25 → switch réactivé mais **off**
   (FR-015, pas de bascule auto) ; le réactiver à la main (FR-014).
5. **Affichage** : ARIA/switch visible sur format > 23,8 mm, grisé sinon ;
   message accessible sur format trop étroit.
6. **Carré** (si format carré présent) : switch **désactivé** pour l'EAN-13
   (FR-011), lecture de l'étiquette normale inchangée (FR-009).
7. **Erreurs** : envoyer `rotated` non booléen → `422` ; `rotated: true` sur
   format non rotatable → `422` (jamais d'impression illisible silencieuse).

## Commandes utiles

```bash
nc -w 10 192.168.1.63 9100   # pousser du ZPL brut vers l'imprimante
pnpm vitest run              # tests unitaires (layout roté, seuil, cookie, UI)
curl -i -X POST localhost:3000/api/print/ean13 \
  -H 'content-type: application/json' \
  -d '{"ean13":"4006381333931","quantity":1,"paperId":"40x25","rotated":true}'
```