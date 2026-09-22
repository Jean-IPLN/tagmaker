# Quickstart — Logo et favicon « tag »

Guide de validation de l'identité visuelle (logo + favicon). Références :
[contrats ui](./contracts/ui.md), [modèle de données](./data-model.md).

## Prérequis

- `npm install` effectué ; **aucune nouvelle dépendance** (`@phosphor-icons/react`
  déjà présent, v2.1.10).
- Branche `004-tag-logo-favicon`.

## Lancement

```bash
npm run dev
```

## Scénarios de validation

### A. Logo dans la barre latérale

1. Ouvrir `http://localhost:3000`.
2. Vérifier, dans l'entête de la barre latérale, un **logo** composé d'un
   pictogramme d'étiquette (tag) **suivi de « TagMaker »**.
3. Cliquer sur le logo : retour à la racine (`/`).

**Attendu** : le logo est visible sur l'accueil, sur `/ean13` et sur une URL
inconnue (404) ; l'icône n'est pas annoncée en double par le lecteur d'écran.

### B. Favicon d'onglet

1. Ouvrir les vues `/`, `/ean13` et une URL inconnue dans des onglets.
2. Vérifier que chaque onglet affiche le **pictogramme d'étiquette** (et non
   l'icône générique du navigateur).

**Attendu** : un seul favicon déclaré par page ; aucune erreur de ressource
favicon dans la console Réseau ; le symbole de l'onglet est identique à celui
du logo.

### C. Non-régression

1. Naviguer : accueil (squelette visible), **EAN-13** (formulaire, entrée
   active, fil d'Ariane), URL inconnue (404 avec barre latérale).
2. Vérifier l'infobulle de description au survol d'un module (feature 003).

**Attendu** : aucun parcours n'est altéré par l'ajout du logo/favicon.

## Validation automatisée

```bash
npm test                 # suite complète (49 + nouveaux cas logo)
npm run test:coverage    # couverture > 80 %
npm run lint             # 0 erreur / 0 warning
npm run build            # build OK ; `<link rel="icon">` présent et unique dans le head
```