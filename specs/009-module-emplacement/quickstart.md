# Guide de validation — Module Emplacement (Feature 009)

Périmètre : valider que le module imprime des code-barres **Code 128** centrés
et pleine échelle (convention 008), conformes à la nomenclature, avec les
deux modes (single/plage) et les deux types (classique/`#D`) pilotés par des
switches. Correspond aux critères d'acceptation de la spec (US-1…US-4,
FR-001…FR-013, SC-001…SC-006).

## Commandes (gate)

```bash
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
```

Tous doivent être verts, sans warning. 169 « ancien » tests conservés + tests
du module.

## Couverture des tests attendus

| Zone | Fichier | Ce qui doit être vérifié |
|------|---------|--------------------------|
| Nomenclature | `lib/location/__tests__/validate.test.ts` | regex combinée (accepte/refuse), regex par type, positions |
| Type × code | `lib/location/__tests__/validate.test.ts` | code `#D` valide mais refusé en mode Classique et réciproque (FR-006) |
| Plage | `lib/location/__tests__/validate.test.ts` | même zone, bornes ordonnées par axe, taille ≤ 1000, expansion (boîte `espace→position→sous-position`), exemples `1A10→1A1B` (12), `1A10→1A21` (4), `1B10→1D45` (72) |
| ZPL | `lib/zpl/__tests__/location.test.ts` | structure `^BC…^FD`, `^PQ` single, bloc par code en range, invariants par format (silence, centrage, 90 %) |
| Non-régression EAN-13 | `lib/zpl/__tests__/build.test.ts` | sortie de `buildEan13Zpl` strictement identique après extraction `layout.ts` |
| API | `app/api/print/location/__tests__/route.test.ts` | 200 `{status,labels}`, 422 (code/type/plage/quantité), 409, 503 |
| Composant | `components/__tests__/location-form.test.tsx` | switches (mode/type), champs présents/masqués, confirm dialog, toast |

Couverture globale > 80 % (constitution V), mesurée par
`npx vitest run --coverage`.

## Scénarios de validation applicative (manuels)

1. **Module visible** : `/emplacement` accessible depuis le registre
   (`RecentModulesGallery`), page miroir EAN-13.
2. **Basculer le Switch mode** → « Plage » : la quantité disparaît, les deux
   bornes s'affichent ; revenir → « Un seul » : quantité réapparaît.
3. **Basculer le Switch type** → « Dynamique `#D` » : un code `1A5B` est
   refusé (incohérent), `1#D7` accepté ; inverse en mode Classique.
4. **Impression single** (papier 40×25) : 1 étiquette, symbole centré, ligne
   lisible `1A5B` sous les barres, scan OK (lier au test scan real — voir §
   contrôle physique).
5. **Impression plage** `1A10` → `1A1B` (12 étiquettes > 2) : confirmation
   demandée, puis un job unique ; codes distincts scannables.
6. **Plage invalide** `1A19` → `1A21` : refus (sous-position `9` > `1`) avec
   message clair en toast.
7. **Plage > 1000** : refus 422.
8. **Sans imprimante** : toast « Imprimante injoignable » (503), pas de crash.

## Contrôle physique (imprimante réelle)

Réservé au post-deploy (aucune imprimante dans la CI) :

- Code 128 scanné (scanner USB) restitue exactement les 4 caractères ;
- Hauteur de barres et zones de silence conformes (dominante visuelle :
  symbole centré, 90 % de la hauteur) ;
- Plage : rangée de 12 étiquettes distinctes dans l'ordre attendu.

## Non-régression transversale

- Pipeline papier/imprimante/envoi (006/007) : inchangé et réutilisé ;
  cookie de réglages intact.
- EAN-13 : sortie ZPL identique (extraction `layout.ts` sous contrôle des 35
  tests existants).
- Suite complète vertes au moment du merge sur `feature/009-module-emplacement`
  (créée avant implémentation, commits unitaires sans push sans ordre).