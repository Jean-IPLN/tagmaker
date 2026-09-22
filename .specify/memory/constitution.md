# Constitution de TagMaker

TagMaker est une application web locale. Son code se veut clair, testé,
maintenable et évolutif (upgradable). Une sécurité minimale est requise ;
elle ne doit jamais compromettre la simplicité ni la lisibilité du code.

## Principes fondamentaux

### I. KISS — Simplicité

La solution la plus simple qui répond au besoin actuel est la référence.
Toute abstraction, configuration ou dépendance superflue est refusée.
Justification : un code simple se comprend, se teste et se fait évoluer sans
effort ; la complexité s'ajoute uniquement quand un besoin réel l'exige.

### II. DRY — Pas de duplication

Toute logique réutilisable est extraite dans un module ou une fonction unique
et centralisée. Chaque donnée ou état partagé possède une seule source de
vérité. La duplication réelle (au-delà de deux occurrences) doit être
abstraite ; l'abstraction prématurée est interdite.

### III. YAGNI — Pas d'anticipation

On n'implémente que ce qui est nécessaire au besoin exprimé et validé.
Aucune fonctionnalité spéculative ("au cas où") n'est écrite. Une extension
n'est ajoutée que lorsqu'un besoin concret le justifie, jamais par
anticipation.

### IV. Code clair et maintenable

Chaque module et chaque fonction a une responsabilité unique (SOC / Single
Responsibility). Les noms décrivent le "quoi", pas le "comment". Les
conventions du langage sont respectées (linter et formateur automatiques) ;
aucun warning ni TODO ne subsiste dans le code livré.

### V. Tests obligatoires (NON-NÉGOCIABLE)

Toute fonctionnalité est couverte par des tests (unitaires et d'intégration
selon la pertinence). La couverture cible est supérieure à 80 %. La suite de
tests reste verte avant toute livraison.

### VI. Évolutivité — upgradable

L'architecture doit pouvoir évoluer sans réécriture : couches séparées et
contrats stables. Les changements sont faits par additions non destructives
avec migration, ou gérés par versionning. Toute évolution majeure est
documentée et planifiée.

## Sécurité (exigences minimales)

TagMaker est une application web locale ; la sécurité minimale suivante est
obligatoire car une écoute sur localhost reste exposée aux autres logiciels de
la machine :

- Aucun secret (token, clé) en clair dans le code ni en dur dans le front.
- Validation et échappement systématiques des entrées utilisateur
  (protection XSS et injection).
- Écoute uniquement sur localhost / interface de boucle locale, jamais sur
  toutes les interfaces réseau.
- Stockage local uniquement ; aucun apport réseau non sollicité (pas de
  télémétrie).
- Les règles de sécurité ne doivent pas complexifier l'architecture : elles
  restent proportionnées au contexte local.

## Développement & Qualité

- Tout travail est réalisé sur une branche dédiée (`feature/xxx`,
  `patch/xxx`, `docs/xxx`) ; jamais de code directement sur `main` ou `prod`.
- Aucun commit, push, merge ou PR sans ordre explicite de l'utilisateur.
- Chaque commit est une unité logique avec un message clair
  (conventional commits).
- La revue de code vérifie la sémantique, pas seulement le style.
- La CI doit être verte avant merge : linter, tests, build.
- Les tests sont placés au même niveau que le code source.

## Gouvernance

- Cette constitution prime sur toute autre pratique du projet.
- Amendements : toute modification du code, de la configuration ou des
  workflows doit rester conforme à ces principes ; un amendement à la
  constitution exige une documentation, une validation et, le cas échéant,
  un plan de migration.
- Versionning semantique : MAJOR pour un retrait ou une redéfinition
  incompatible, MINOR pour un principe ou une section ajoutée, PATCH pour une
  clarification. La version et la date de dernier amendement sont mises à
  jour à chaque changement.
- Revue de conformité : chaque demande de revue vérifie le respect des
  principes ; toute complexité non justifiée est refusée.
- Chaque PR et chaque revue doit vérifier la conformité aux principes du
  présent document.

**Version**: 1.0.0 | **Ratifiée le**: 2026-09-18 | **Dernier amendement**: 2026-09-18