# Contract — Champ de saisie du code emplacement (4 positions)

**Feature**: 013-fix-print-guard-location-input | **Spec**: [spec.md](../spec.md)

Contrat du composant d'interface `LocationCodeInput`
(`components/location-code-input.tsx`) et de la représentation qu'il échange
avec le formulaire parent.

## Propriétés (interface)

| Propriété | Type | Règle |
|-----------|------|-------|
| `labelPrefix` | chaîne | préfixe des libellés/`aria-label` des 4 segments |
| `value` | chaîne **longueur 4** | représentation paddée ; espace `" "` = position vide |
| `onChange` | `(value: string) => void` | émet **toujours** une chaîne paddée de longueur 4 |
| `placeholders` | 4 caractères | indices affichés par position (défaut classique `1 A 5 1`) |
| `fixedIndexes` | positions fixes | dynamique : `[1, 2]` (`#`, `D` verrouillés) |

## Invariants

1. `value.length === 4` à tout moment (normalisation défensive à l'entrée).
2. Position 1 = zone, valeur par défaut **« 1 »** engagée par le formulaire
   (`"1   "` à l'initialisation) — FR-004.
3. Affichage : position `" "` → champ vide (placeholder visible) ;
   sélecteur de zone : `value = chars[0].trim() || null`, options `1` et `2`.
4. Écrire dans une position ne modifie **que** cette position — jamais un
   décalage vers la position 1 ni ailleurs — FR-005.
5. Aucune valeur paddée ne franchit la frontière de validation : la
   compaction est opérée par `locationCodeField`
   (`lib/location/validate.ts`) — FR-007.

## Événements

| Événement | Comportement |
|-----------|--------------|
| Saisie clavier dans une position éditable | caractère assaini (`^[0-9A-Z#]$`, mise en majuscules), écrit à la position cible, focus avance vers la prochaine position éditable |
| `Backspace` sur position vide | focus recule vers la position éditable précédente ; aucun décalage des autres positions |
| Flèches `←`/`→` | navigation inter-positions (comportement conservé) |
| Collage (`onPaste`) | texte assaini caractère par caractère, réparti depuis la position cible vers les positions suivantes **éditables** ; positions fixes (dynamique) conservées ; borné aux 4 positions — aucun décalage résiduel |
| Sélecteur de zone (position 1) | `1` ou `2` ; positions 2-4 inchangées |
| Position fixe (dynamique) | non éditable, affiche `#`/`D` imposés |

## Frontière avec le domaine

- Le formulaire parent détient l'état paddé (source de vérité d'affichage).
- À la soumission, `safeParse` compate (`locationCodeField`) : le corps
  d'appel API et les compteurs (quantité, expansion de plage) n'utilisent
  que la version compactée (`parsed.data`).
- En mode plage, la synchro de zone sœur (début ↔ fin) reste assurée par le
  formulaire (FR-008), pas par le composant (SOC).

## Critères d'acceptation liés

- Scénarios d'acceptation 1 à 5 de la spec (US2).
- SC-003 : code final = séquence tapée, zone par défaut « 1 » (modifiable
  en « 2 »), en classique comme en dynamique.

## Tests de contrat

- `components/__tests__/location-code-input.test.tsx` (nouveau) : défaut
  zone, position de frappe, effacement sans décalage, collage distribué,
  positions fixes dynamique, sélecteur 1/2.
- `components/__tests__/location-form.test.tsx` : intégration (saisie →
  corps compact attendu, plages, zone sœur).
- `lib/location/__tests__/validate.test.ts` : compaction en frontière,
  messages d'erreur conservés.
