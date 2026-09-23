# Bug Fix: L'imprimante configurée (`ZPL_PRINTER_HOST`) n'apparaît pas dans la découverte

- **Slug**: `print-ip-not-find`
- **Fixed**: 2026-09-23
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`discoverPrinters` excluait abusivement `env.ZPL_PRINTER_HOST` du scan — or
cette variable est l'imprimante de destination par défaut, pas l'IP de la
machine serveur. L'exclusion ne porte plus que sur les **IP IPv4 réelles du
serveur** (via `os.networkInterfaces()`), avec repli « exclure rien » en cas
d'indétermination : l'imprimante configurée redevient visible dans la liste des
imprimantes scannées.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `lib/printer/discovery.ts` | modified | `buildScanTargets` accepte une **liste** d'IP à exclure ; nouveau `getLocalIpAddresses(subnet)` (IPv4, non-interne, préfixe du /24 scanné, dédoublonnée) ; `discoverPrinters` passe `getLocalIpAddresses(subnet)` au lieu de `env.ZPL_PRINTER_HOST`. |
| `lib/printer/discovery.test.ts` | modified + added tests | Mock `node:os` (`networkInterfacesMock`) ; helper `localInterfaces()` ; test de non-régression de l'imprimante configurée ; tests `getLocalIpAddresses`. |
| `specs/006-printer-paper-settings/contracts/printer-discovery.md` | modified | Précise que `ZPL_PRINTER_HOST` n'est pas exclue du scan ; 254 adresses moins l'IP locale. |
| `.specify/bugs/print-ip-not-find/assessment.md` | (non modifié, ordre explicite) | Note de résolution ajoutée uniquement dans le rapport — l'`assessment.md` reste la source de vérité (aucune édition). |

## Diff Highlights

```ts
// lib/printer/discovery.ts — exclusion ciblée sur l'IP réelle du serveur
export function getLocalIpAddresses(subnet: string): string[] {
  const addresses = new Set<string>();
  for (const entries of Object.values(os.networkInterfaces())) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family === "IPv4" && !entry.internal && entry.address.startsWith(subnet)) {
        addresses.add(entry.address);
      }
    }
  }
  return Array.from(addresses);
}

// discoverPrinters()
const targets = buildScanTargets(subnet, getLocalIpAddresses(subnet));
// (au lieu de buildScanTargets(subnet, env.ZPL_PRINTER_HOST))
```

## Tests Added or Updated

- `lib/printer/discovery.test.ts::buildScanTargets` — signature convertie en liste d'IP (`["192.168.1.63", "192.168.1.100"]` → 252 cibles).
- `lib/printer/discovery.test.ts::discoverPrinters — détecte l'imprimante configurée dans ZPL_PRINTER_HOST` — pinne le bug : une imprimante dont l'adresse vaut `env.ZPL_PRINTER_HOST` doit être retournée.
- `lib/printer/discovery.test.ts::ne sonde jamais l'IP locale du serveur` — exclut `192.168.1.100` (IP serveur mockée), 253 sondes.
- `lib/printer/discovery.test.ts::getLocalIpAddresses` (2 tests) — filtre IPv4/non-interne/préfixe ; liste vide si aucune IP locale dans le /24.

## Local Verification

- `npx vitest run lib/printer/discovery.test.ts` → 16 passed.
- `npx vitest run` (suite complète) → 140 passed (22 files).
- `npm run lint` → 0 warning.
- `npx tsc --noEmit` → 0 erreur.
- `npm run build` → Compiled successfully.
- Vérification manuelle : audit du code (`grep -n "ZPL_PRINTER_HOST" lib/printer/discovery.ts` → plus aucune référence d'exclusion).

## Deviations from Assessment

- Aucune sur le correctif (remediation « preferred » suivie à la lettre).
- Périmètre légèrement étendu, documenté : ajout de tests unitaires dédiés à
  `getLocalIpAddresses` (cas liste vide / filtrage), non explicitement listés
  dans l'`assessment.md` mais requis pour couvrir le tri dans
  `os.networkInterfaces()`.

## Follow-ups

- Validation live sur le réseau réel : relancer la découverte et confirmer que
  `192.168.1.63` apparaît bien à côté de `.20` / `.66`.
- Optionnel : journaliser/observer la liste des IP locales exclues pour lever
  toute ambiguïté de configuration.
- Suite : `/speckit.bug.test slug=print-ip-not-find`.