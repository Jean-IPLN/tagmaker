# Modèle de données — Orientation d'impression du papier

Complète le modèle de la feature 006 (Réglage d'impression, Taille de papier) ;
ne remplace rien. Mêmes conventions : cookie navigateur, aucune source serveur
pour les préférences d'impression.

## Entités

### Réglage d'impression (`PrintSettings`)

Préférences d'impression mémorisées côté navigateur (cookie 30 jours).

| Champ | Type | Contraintes |
|-------|------|-------------|
| `paperId` | `string ?` | inchangé (format de papier) |
| `printerAddress` | `string ?` | inchangé (adresse IPv4) |
| `rotated` | `boolean ?` | **Nouveau** — orientation pivotée (FR-007) ; absent = `false` |

- Chaque champ est indépendant et écrit séparément (merge par champ du cookie).
- Validation (parse) : champ manipulé → `false` (aucun crash d'interface) ;
  booléen strict, aucun effet de bord sur `paperId`/`printerAddress`.
- Contraintes de cycle de vie :
  - format incompatible (côté court < seuil D4) → `rotated` forcé à `false`
    (FR-013/FR-015) et switch non actionnable ;
  - retour à un format compatible → switch réactivé, `rotated` reste `false`.

### Format de papier (`PaperSize`) — inchangé, + règle de compatibilité

| Champ | Type | Contraintes |
|-------|------|-------------|
| `widthMm`, `heightMm`, `surfaceMm2`, `label`, `id` | — | inchangés (feature 006) |

Règle ajoutée (ne change pas l'entité) :
`isRotatable(paperSize, dpi)` = `min(widthMm, heightMm) ≥ moduleSymbolesMax ×
moduleWidthMin × 25,4 / dpi`, avec `moduleSymbolesMax` = 95 (EAN-13, le plus
contraignant des deux modules). Règle utilitaire seule source de vérité, testée.

### Étiquette imprimée (`ZplLabel`)

Générée à la demande ; n'est pas persistée.

| Élément | Normal (`rotated=false`) | Pivoté (`rotated=true`) |
|---------|--------------------------|--------------------------|
| Canvas `^PW`/`^LL` | largeur × longueur du format | **inchangé** (même zone) |
| Axe « longueur symbole » | côté **long** du format | côté **court** du format |
| Axe « empilage » (barres + texte) | côté court | côté long |
| Orientation des éléments (`^BE`/`^BC`/`^A`) | `N` | `B` (antihoraire, « haut » à gauche) |

## Transitions d'état

1. `rotated: false → true` (action sur le switch, format compatible) :
   impression pivotée, réglage mémorisé.
2. `rotated: true → format incompatible sélectionné` : `rotated` réinitialisé
   à `false`, switch `disabled`, impression normale (FR-013/FR-015).
3. `format compatible sélectionné` (à nouveau) : switch réactivé, `rotated`
   reste `false` — aucune bascule automatique.
4. Rechargement de page : `rotated` relu du cookie comme les autres réglages.

## Règles métier (dérivées)

- **Faisabilité rotation** : le switch est actif ⪼ `isRotatable(format, dpi)`.
- **Seuil appliqué** : le plus contraignant des deux modules d'impression
  (EAN-13 : 190 dots ↔ ≈ 23,8 mm @203 dpi ; Emplacement Codabar/Code 128 :
  158 dots ↔ ≈ 19,8 mm @203 dpi). Calcul runtime en mm (research D4).
- **Aucune persistance serveur** : les préférences restent propres au
  navigateur (FR-012).

## Références

- Spec : `spec.md` (FR-002 à FR-015).
- Recherche : `research.md` (D1 à D7).