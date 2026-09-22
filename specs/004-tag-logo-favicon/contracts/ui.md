# Contrats d'interface utilisateur — Logo et favicon « tag »

Ces contrats décrivent le rendu **observable** de l'identité visuelle
(logo + favicon), indépendamment de l'implémentation.

## 1. Contrat du logo (entête de marque)

- **C-1.1** : L'entête de la barre latérale affiche un logo composé d'un
  pictogramme d'étiquette (tag) **suivi du nom « TagMaker »**.
- **C-1.2** : Le pictogramme est purement décoratif pour la lecture d'écran :
  le nom accessible du bouton-logo reste « TagMaker » (aucune annonce
  redondante).
- **C-1.3** : Le logo est un lien ramenant à l'accueil, présent sur toutes
  les vues (accueil, module, URL inconnue).

## 2. Contrat du favicon

- **C-2.1** : L'onglet du navigateur affiche le pictogramme d'étiquette pour
  toutes les vues de l'application ; aucune icône générique par défaut ne
  subsiste (aucun `favicon.ico` ni ressource manquante).
- **C-2.2** : Un seul favicon est déclaré dans le `<head>` de chaque page
  (balise `rel="icon"` unique).
- **C-2.3** : Le symbole du favicon et celui du logo sont **le même
  pictogramme** (le tracé du « tag ») — cohérence visuelle FR-004.

## 3. Vérification (reposant sur les tests et le quickstart)

- Logo : le lien de marque « TagMaker » contient un élément `svg` : test de
  rendu (`components/__tests__/app-sidebar.test.tsx`).
- Favicon : lecture de `app/icon.svg` (SVG 256×256, contient le tracé du tag) ;
  contrôle du `<head>` servi dans le quickstart (`rel="icon"` présent, unique)
  après `npm run build`.