# EAN-13 — Contrat de validation

Algorithme de validation partagé client/serveur (une seule implémentation,
DRY). Source du contrat : [spec.md](../spec.md) FR-004, FR-008.

## Format

- Chaîne de **13 chiffres exactement** : `/^\d{13}$/`.
- **Clé de contrôle** (checksum modulo 10, norme EAN/UCC) :

1. Numéroter les 12 premiers chiffres de gauche (index 1..12, index 1 =
   le plus à gauche).
2. Poids : 1 pour les index impairs, 3 pour les index pairs.
3. Somme = Σ (chiffre × poids).
4. Clé attendue = `(10 − (somme mod 10)) mod 10`.
5. Le 13ᵉ chiffre doit être égal à cette clé.

## Exemple

- Saisie : `5901234123457` → valide (clé `7`).
- Saisie : `5901234123456` → invalide (clé attendue `7`, donnée `6`).

## Résultat

- 13 chiffres avec clé valide => `true` (accepté).
- Tout autre saisie (longueur, non-numérique, clé erronée, vide) => `false`
  (rejeté avec message explicite, aucune impression).

## Implémentation de référence

```ts
export function isEan13Valid(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  const digits = [...code].map(Number);
  const sum = digits
    .slice(0, 12)
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3), 0);
  const expectedCheckDigit = (10 - (sum % 10)) % 10;
  return digits[12] === expectedCheckDigit;
}
```

Notes : index pair (1-based) => poids 3 ; en base 0, poids 3 pour les index
impairs de tableau (i = 1, 3, …). `index % 2 === 0 ? 1 : 3` correspond bien
à : index tableau pair (0, 2, 4…) => position 1-based impaire => poids 1.