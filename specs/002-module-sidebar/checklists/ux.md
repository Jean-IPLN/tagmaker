# UX & Navigation Checklist: Navigation modules via sidebar

**Purpose**: Valider la qualité des exigences UI/navigation (spec) avant implémentation — complétude, clarté, cohérence, mesurabilité, couverture des scénarios.
**Created**: 2026-09-18
**Feature**: [spec.md](../spec.md)

**Gate**: Ce checklist sert de **porte d'entrée** pour `/speckit.implement` (comme `quality.md`) : tant qu'un critère n'est pas coché par le relecteur, l'implémentation des aspects concernés est bloquée.

**Note**: Ce checklist custom est généré par la commande `/speckit.checklist` à partir du contexte feature.
**Review Ownership**: Artifact de revue de la qualité des exigences, propriété du relecteur. Cocher `[x]` signifie que le critère de qualité des exigences est satisfait — pas que l'implémentation est terminée.
**Marker Semantics**: `[x]` ⇒ critère relu et satisfait pour la qualité des exigences. L'implémentation ne peut pas modifier les marqueurs.

## Navigation & structure

- [ ] CHK001 Le contenu d'une entrée de module dans la sidebar (nom **et** description) est-il explicitement requêté par FR-002 ? [Clarity, Spec §FR-002]
- [ ] CHK002 La sidebar est-elle définie comme la *seule* source d'affichage des modules, sans référence résiduelle à la galerie ? [Completeness, Spec §FR-008]
- [ ] CHK003 La mise en évidence de l'entrée active (FR-006) est-elle une exigence mesurable (état visuel distinct), pas une simple intention ? [Measurability, Spec §FR-006]
- [ ] CHK004 L'état d'aucune entrée active à la racine (`/`) est-il spécifié explicitement ? [Gap, Spec §FR-006]
- [ ] CHK005 Le critère d'ordre/classement des modules dans la liste de la sidebar est-il défini (ordre du registre, alphabétique, priorité) ? [Gap, Spec §FR-002]
- [ ] CHK006 Les exigences de persistance de la sidebar sont-elles cohérentes sur toutes les vues (racine, module, page introuvable) ? [Consistency, Spec §FR-005]

## États & transitions

- [ ] CHK007 Le SkeletonForm (FR-004) est-il défini sans ambiguïté comme état par défaut et **non** comme indicateur de chargement réseau ? [Clarity, Spec §FR-004 + Assumptions]
- [ ] CHK008 Le comportement « registre vide » (sidebar vide + zone principale en SkeletonForm, aucune erreur) est-il une exigence documentée ? [Coverage, Spec §Edge Cases]
- [ ] CHK009 Le comportement d'une URL de module inconnue (page « introuvable », sidebar toujours visible) est-il une exigence documentée ? [Coverage, Spec §Edge Cases]
- [ ] CHK010 Le retour de l'état module vers l'état racine (SkeletonForm réaffiché) est-il spécifié comme exigence, pas seulement décrit ? [Completeness, Spec §US2]
- [ ] CHK011 Le re-clic sur le module déjà actif (aucun changement, aucune erreur) est-il une exigence explicite ? [Coverage, Spec §Edge Cases]
- [ ] CHK012 La silhouette visuelle du SkeletonForm (représentation reconnaissable d'un formulaire de module) est-elle spécifiée de façon suffisamment détaillée ? [Clarity, Spec §FR-004]

## Responsive & accessibilité

- [ ] CHK013 Les exigences petit écran (sidebar repliée, accès aux modules préservé, FR-007) sont-elles documentées de façon actionnable ? [Completeness, Spec §FR-007]
- [ ] CHK014 Les points de rupture (breakpoints) du passage desktop → panneau/collapse sont-ils définis ? [Gap, Spec §FR-007]
- [ ] CHK015 Une exigence de navigation clavier de la sidebar (items + déclencheur, raccourci `cmd/ctrl+B`) est-elle posée ? [Gap, Spec §US3]
- [ ] CHK016 Des exigences d'accessibilité (ARIA, lecteurs d'écran) sont-elles définies pour le trigger et l'entrée active ? [Gap]
- [ ] CHK017 Une libellé accessible du déclencheur de repli est-elle exigée ? [Gap]
- [ ] CHK018 La gestion du focus après bascule (ouverture/fermeture) de la sidebar est-elle spécifiée ? [Gap]

## Cohérence & contraintes

- [ ] CHK019 La contrainte « uniquement shadcn pour gérer l'interface » est-elle documentée comme exigence (aucune primitive UI hors shadcn) ? [Completeness]
- [ ] CHK020 La cohérence du thème dark par défaut avec les composants sidebar est-elle exigée/stipulée ? [Consistency]
- [ ] CHK021 La non-régression du formulaire `/ean13` et de ses comportements est-elle posée comme exigence (SC-005) ? [Completeness, Spec §SC-005]
- [ ] CHK022 Le périmètre « l'API d'impression n'est pas modifiée » est-il documenté comme contrainte implicite du feature ? [Consistency]
- [ ] CHK023 Les critères de succès (SC-001…SC-005) sont-ils mesurables et sans détail d'implémentation ? [Measurability, Spec §Success Criteria]
- [ ] CHK024 Le retrait de la galerie (composant + vue racine) est-il spécifié comme conséquence de la feature ? [Completeness, Spec §Assumptions]
- [ ] CHK025 Une exigence de performance de navigation (rendu sans requête, changement de vue immédiat) est-elle énoncée, ou volontairement exclue ? [Gap]

## Dependencies & Assumptions

- [ ] CHK026 La dépendance au bloc/au composant shadcn (sidebar-04) est-elle documentée dans les assumptions ? [Dependency, Spec §Assumptions]
- [ ] CHK027 L'assumption « registre = source unique des modules » (FR-008) est-elle sans contradiction avec FR-002 ? [Assumption, Spec §FR-008]
- [ ] CHK028 L'assumption « SkeletonForm ≠ état de chargement » est-elle formulée assez explicitement pour lever toute ambiguïté d'implémentation ? [Clarity, Spec §Assumptions]

## Notes

- Cocher `[x]` uniquement après revue confirmant la qualité des exigences (pas l'implémentation).
- Laisser non coché tant qu'un critère requiert clarification ou correction de la spec.
- `/speckit.implement` lit l'état des cases comme porte et ne modifie pas les marqueurs.
- `checklists/requirements.md` a un cycle de vie séparé géré par `/speckit.specify` et `/speckit.clarify`.
- Ajouter commentaires/constatations inline ; lier aux ressources pertinentes.
- Les items sont numérotés séquentiellement pour référence (CHK001…CHK028).