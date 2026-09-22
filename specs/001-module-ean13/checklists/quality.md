# Quality Checklist: Module EAN-13 — Impression d'étiquettes

**Purpose**: Revue de la qualité des exigences (complétude, clarté, cohérence,
mesurabilité, couverture) pour les domaines UX/interface, impression &
fiabilité, validation des données et sécurité locale — avant implémentation.
**Created**: 2026-09-18
**Feature**: [spec.md](../spec.md)

**Note**: Cette checklist personnalisée est générée par la commande
`/speckit.checklist` à partir du contexte et des exigences de la feature.
**Review Ownership**: Artefact de revue de la qualité des exigences, propriété
du reviewer. Cocher `[x]` uniquement lorsque le reviewer juge satisfait le
critère de qualité des exigences.
**Marker Semantics**: `[x]` signifie que le critère a été revu et satisfait
pour la qualité des exigences. Cela ne signifie pas que l'implémentation est
terminée.

## Exigence — Complétude

- [ ] CHK001 Les exigences de la galerie couvrent-elles la liste des modules, leur affichage et le flux de sélection ? [Completeness, Spec §US1]
- [ ] CHK002 Les états de la galerie sont-ils spécifiés (affichage initial, aucun module disponible) ? [Gap, Spec §US1]
- [ ] CHK003 Le champ quantité est-il entièrement spécifié (valeur par défaut, incrément, borne max) ? [Gap, Spec §FR-005]
- [ ] CHK004 Les exigences de reprise après échec / réessai de l'impression sont-elles définies ? [Gap, Spec §FR-009]
- [ ] CHK005 Les exigences d'accessibilité (clavier, focus, aria) sont-elles spécifiées pour formulaire et modal ? [Completeness, Gap]
- [ ] CHK006 Le comportement de la modal critique est-il défini au-delà du seuil (> 2) : intitulés, actions, sortie (Échap), focus initial ? [Completeness, Spec §FR-007]

## Exigence — Clarté

- [ ] CHK007 Le terme « modal critique » est-il défini sans ambiguïté (type de dialogue, actions Annuler/Confirmer) ? [Clarity, Spec §FR-007]
- [ ] CHK008 La règle d'acceptation d'un EAN-13 est-elle précisée (13 chiffres + clé mod 10) sans zone d'interprétation ? [Clarity, Spec §FR-004]
- [ ] CHK009 La borne maximale de quantité est-elle chiffrée explicitement plutôt qu'« un maximum raisonnable » ? [Clarity, Spec §FR-005]
- [ ] CHK010 Le périmètre « imprimante ZPL » est-il précisé (imprimante réseau, protocole, adresse configurable) ? [Ambiguity, Spec §FR-006]
- [ ] CHK011 Le rendu du code-barres (définition du label, hauteur, dimension du support 40×25 mm) est-il décrit de façon opérante ? [Clarity, Spec §Assumptions]

## Exigence — Cohérence

- [ ] CHK012 Les règles de validation EAN-13 (FR-004 / FR-008) sont-elles cohérentes entre elles et avec les Edge Cases ? [Consistency, Spec §FR-004]
- [ ] CHK013 La règle de modal (quantité > 2) reste-t-elle cohérente dans toutes les stories et tous les cas limites (qty = 2 : pas de modal) ? [Consistency, Spec §US2]
- [ ] CHK014 Les critères de succès sont-ils alignés avec les exigences fonctionnelles correspondantes (SC ↔ FR) ? [Consistency, Spec §SC]
- [ ] CHK015 La borne de quantité est-elle cohérente entre spec, data-model et contrats API/ZPL ? [Consistency, Gap]
- [ ] CHK016 Le comportement en cas d'échec d'impression est-il décrit de la même façon dans FR-009 et le scénario E du quickstart ? [Consistency, Spec §FR-009]

## Exigence — Critères d'acceptation mesurables

- [ ] CHK017 Le SC-001 (100 % d'EAN-13 valides imprimés) est-il objectivement vérifiable sans hypothèse d'implémentation ? [Measurability, Spec §SC-001]
- [ ] CHK018 L'exigence de message d'erreur « clair » (FR-008) est-elle mesurable ou reste-t-elle subjective ? [Measurability, Spec §FR-008]
- [ ] CHK019 Le SC-003 (100 % des quantités > 2 affichent la modal) est-il vérifiable de façon non-ambiguë ? [Acceptance Criteria, Spec §SC-003]
- [ ] CHK020 Le SC-004 (< 30 s pour générer une demande) est-il rattaché à une exigence de performance traçable ? [Measurability, Spec §SC-004]

## Exigence — Couverture des scénarios

- [ ] CHK021 Les flux exceptionnels (EAN invalide, quantité invalide) sont-ils couverts par des exigences explicites ? [Coverage, Spec §Edge Cases]
- [ ] CHK022 Les flux de récupération après indisponibilité de l'imprimante sont-ils couverts (message, réessai, fin de panne) ? [Gap, Exception/Recovery]
- [ ] CHK023 Le chevauchement de demandes d'impression (FR-010) est-il traité en exigence et en scénario ? [Coverage, Spec §FR-010]
- [ ] CHK024 Les quantités limites (1, 2, juste au-dessus de 2, borne max) sont-elles couvertes par des scénarios ? [Coverage, Edge Case]
- [ ] CHK025 Le cas « quantité exactement 2 » est-il explicitement spécifié comme n'affichant pas de modal ? [Coverage, Spec §US2]

## Exigence — Non-fonctionnel (sécurité, performance, accessibilité)

- [ ] CHK026 Les exigences de sécurité minimale sont-elles documentées (aucun secret en dur, validation côté serveur, écoute localhost uniquement) ? [Completeness, Spec §Assumptions]
- [ ] CHK027 Les attentes de performance de l'impression (temps de réponse local) sont-elles spécifiées ? [Gap, NFR]
- [ ] CHK028 Les exigences d'accessibilité de la modal critique (navigation clavier, focus, annulation par Échap) sont-elles définies ? [Gap, Accessibility]

## Exigence — Dépendances & hypothèses

- [ ] CHK029 La dépendance à l'imprimante ZPL (adresse, port 9100, disponibilité) est-elle documentée comme dépendance externe ? [Dependency, Spec §Assumptions]
- [ ] CHK030 L'hypothèse de format temporaire 40×25 mm est-elle explicite et datée (à redéfinir) ? [Assumption, Spec §Assumptions]
- [ ] CHK031 L'hypothèse de déploiement local mono-utilisateur (pas d'authentification) est-elle énoncée ? [Assumption, Spec §Assumptions]

## Exigence — Ambiguïtés & conflits à lever

- [ ] CHK032 Le périmètre v1 de la galerie « à compléter » est-il borné explicitement (un seul module) ? [Ambiguity, Spec §FR-001]
- [ ] CHK033 Le format des messages d'erreur (intitulés, tonalité) est-il spécifié ou laissé à la discrétion du reviewer ? [Gap, Spec §FR-008]
- [ ] CHK034 La relation entre la modal critique côté client et la validation serveur est-elle décrite sans conflit d'autorité ? [Conflict, Spec §FR-007]

## Notes

- Cocher `[x]` uniquement après revue confirmant le critère de qualité des exigences
- Laisser non coché tant que le critère nécessite clarification, correction ou évaluation
- `/speckit.implement` lit l'état des cases comme porte de validation et ne doit pas modifier les marqueurs
- `checklists/requirements.md` a un cycle de vie intégré séparé, géré par `/speckit.specify` et `/speckit.clarify`
- Ajouter les constats ou commentaires en ligne
- Références principales : FR-001..FR-010, SC-001..SC-005, Edge Cases, Assumptions de spec.md
- Profondeur : Standard — revue de qualité ; Audience : auteur avant implémentation