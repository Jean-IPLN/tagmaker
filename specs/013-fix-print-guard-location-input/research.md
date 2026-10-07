# Research — 013-fix-print-guard-location-input

**Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

Aucun `NEEDS CLARIFICATION` dans le Technical Context. Les décisions
ci-dessous résolvent les deux points de conception ouverts (où poser le
garde-fou, comment représenter le code à 4 positions) plus deux points de
détail vérifiés sur le code existant.

## R1 — Point d'application du garde-fou « aucune imprimante »

**Decision**: garde-fou **client uniquement**, dans `submitPrint` des deux
formulaires (`components/ean13-form.tsx`, `components/location-form.tsx`),
immédiatement après la lecture des réglages et avant tout envoi. Une chaîne
identique : `if (!settings.printerAddress) { toast.error(MESSAGE); return; }`.
Les routes API restent inchangées.

**Rationale**:
- `submitPrint` est le point de convergence des deux chemins d'envoi de
  chaque module : direct (quantité ≤ 2) et post-confirmation (quantité > 2),
  ce qui couvre les scénarios d'acceptation 1 à 4 d'un seul trait.
- Le toast est intrinsèquement une exigence d'interface ; le blocage au
  moment du clic satisfait les user stories.
- La source de vérité est le cookie `tagmaker_print_settings` (déjà lu par
  les formulaires et par le pied de page) : un seul état, pas de divergence.

**Alternatives considered**:
- *Garde côté serveur (rejet)*: les routes ont un contrat testé
  « 200 — sans printerAddress, utilise le défaut de l'environnement »
  (`app/api/print/ean13/__tests__/route.test.ts:190`) : le fallback
  environnement est un comportement existant voulu pour les appelants
  programmatiques. Le rendre conditionnel casserait ce contrat (régression
  SC-004) sans valeur pour l'utilisateur. **Bornage**: FR-001/SC-002
  s'entendent pour les flux de l'application (interface) ; le contrat API
  est inchangé.
- *Blocage avant l'ouverture de la boîte de confirmation (rejet)*: le
  scénario 4 de la spec attend le blocage **à la confirmation**.
- *Module helper partagé (rejet)*: exactement 2 occurrences — seuil « au-delà
  de deux » de la constitution II ; un helper couplé à `sonner` déplacerait
  du code UI dans `lib/` pour rien (KISS).

## R2 — Représentation du code emplacement à 4 positions

**Decision**: l'état des champs code est une **chaîne fixée à 4 positions**
séparées par un espace (`" "` = position vide), avec la zone **amorcée à « 1 »**
à l'initialisation (`"1   "`). La compaction (retrait des espaces) n'a lieu
qu'**à une seule frontière** : `locationCodeField` dans
`lib/location/validate.ts` (transform Zod), qui alimente déjà `code`,
`startCode` et `endCode`. Le corps d'appel API utilise `parsed.data`
(déjà compacté) plutôt qu'une reconstruction depuis l'état.

**Rationale**:
- Le bug actuel vient de `next.join("")` sur un tableau à positions vides :
  `["", "A", "", ""]` → `"A"` → se re-déduit en `chars[0] = "A"` (décalage).
  Tant que la valeur transmise est compactée, toute position vide antérieure
  décale la chaîne : la représentation doit préserver les 4 positions.
- L'espace est hors charset des codes (`LOCATION_REGEX` n'admet ni espace) :
  `compact = code.replace(/ /g, "")` est sans effet sur un code déjà complet
  et ne peut jamais fabriquer un code valide à 4 caractères à partir d'un
  code incomplet (longueur après compaction = nombre de positions remplies).
- Le point de compaction est unique (un seul champ Zod utilisé par les trois
  entrées), conformément à la constitution II ; les helpers `pad`/`compact`
  vivent dans `lib/location/code.ts` (utilisés par le formulaire, le
  composant et le schéma : 3 usages → abstraction obligatoire).
- `parsed.data` remplace `buildSingleBody()`/`buildRangeBody()` au moment de
  l'envoi : ces fonctions restent les entrées de `safeParse`, l'état paddé ne
  franchit jamais la frontière validation/API.

**Alternatives considered**:
- *Tuple de 4 caractères dans l'état (rejet)*: même invariant, mais ripple
  de types sur état, props, schéma, `resyncZone` et tests — diff plus grand
  pour un bénéfice identique.
- *État positionnel interne au composant (rejet)*: les valeurs venues de
  l'extérieur (synchro de zone, changement de type) ne pourraient plus se
  ré-ambiguïser depuis une chaîne compactée → désynchronisation garantie.
- *Statu quo — chaîne compactée à chaque frappe (c'est le bug)*.

**Invariants**:
- État `length === 4` toujours (normalisation défensive côté composant si la
  valeur entrante diffère).
- Affichage : position `" "` → champ vide (placeholder visible) ; sélecteur
  de zone : `value = chars[0].trim() || null`.
- `updateChar` émet toujours une chaîne paddée (re-pad systématique).
- Aucune valeur paddée ne franchit la frontière validation (FR-007).

## R3 — Synchro de zone en mode plage

**Decision**: `withZoneSync`/`resyncZone` restent **inchangés**.

**Rationale**: vérifié sur le code — avec des chaînes paddées,
`resyncZone` devient positionnel (`zone + code.slice(1)` conserve les
positions, longueur 4 toujours tenue) et l'amorçage commun « 1 » rend la
synchronisation **idempotente** sur les éditions qui ne touchent pas la
zone : elle ne modifie visiblement que quand la zone change réellement
(FR-008 conservée). La branche `code.length === 0` de `resyncZone` devient
inatteignable depuis l'état mais reste valide pour une chaîne vide — la
laisser (défensive, sans commentaire mort).

**Alternatives considered**: détecter explicitement le changement de zone —
complexité supplémentaire sans effet observable (YAGNI).

## R4 — Collage multi-caractères

**Decision**: gestionnaire `onPaste` sur les trois champs de caractères du
composant `LocationCodeInput` : le texte collé est assaini caractère par
caractère (`CHAR_PATTERN`), réparti à partir de la position cible vers les
positions suivantes éditables, en conservant les positions fixes (type
dynamique `#`/`D`). L'état reste paddé : aucune sortie possible de la
fenêtre de 4 positions.

**Rationale**: la spec (Edge Cases) exige que « chaque caractère rejoint sa
position correcte sans décalage résiduel » ; le comportement navigateur par
défaut sur un champ `maxLength={1}` tronque à un seul caractère (les 3
autres sont perdus) — non conforme.

**Alternatives considered**: laisser la troncature native (rejetée : cas
limite non conforme à la spec) ; distribution depuis le sélecteur de zone
(non applicable — le sélecteur est un `Select`, le collage vise les champs).

## R5 — Formulation du toast

**Decision**: message identique littéral dans les deux formulaires :
`Aucune imprimante sélectionnée. Choisissez une imprimante dans les
paramètres.` Canal : `sonner` (`toast.error`), déjà le canal des deux
formulaires.

**Alternatives considered**: constante partagée — 2 occurrences seulement
(constitution II), un littéral reste grepable dans les tests (KISS).

## R6 — Stratégie de tests (contrainte constitution V, non négociable)

- **Formulaires** (`components/__tests__/ean13-form.test.tsx`,
  `location-form.test.tsx`) : clic sans imprimante → toast + `fetch` non
  appelé, sur les chemins direct **et** confirmation, simple **et** plage ;
  avec imprimante → envoi inchangé (non-régression).
- **Composant** (nouveau `components/__tests__/location-code-input.test.tsx`)
  : position de frappe (tape en position 2 → zone intacte), défaut « 1 »,
  effacement d'une position sans décalage, collage distribué, positions
  fixes dynamique, sélecteur de zone 1/2.
- **Schéma** (`lib/location/__tests__/validate.test.ts`) : entrée paddée
  compactée avant regex ; code complet inchangé ; message d'erreur conservé
  (tests existants sur `/4 caractères/`).
- **Formule plage** : zone par défaut commune aux bornes, synchro après
  changement de zone (tests existants, extensions).
- Suite existante (362 tests) verte, `npm run lint` sans warning,
  `npx tsc --noEmit` silencieux, couverture > 80 %.

**Écosystème**: npm (`package-lock.json`) — commandes `npm test`,
`npm run lint`, `npm run test:coverage`, `npx tsc --noEmit`.
