# Recherche — Logo et favicon « tag »

## 1. Source de l'icône (contrainte utilisateur explicite)

- **Contrainte** : « utilise les icon de phosphore deja installer vias shadcn ».
- **Vérification** : `@phosphor-icons/react` est **déjà installé** (v2.1.10),
  tiré lors de l'ajout des composants shadcn (base-nova). **Aucune nouvelle
  dépendance** (constitution I / III).
- **Icône retenue** : `Tag` (export nominal `Tag` du paquet), tracé « regular »
  extrait de `node_modules/@phosphor-icons/react/dist/defs/Tag.es.js` (licence
  MIT, compatible avec l'usage local).

## 2. Favicon — approche « fichier image » du App Router (v16)

- **Décision** : placer `app/icon.svg` (convention fichier `icon`), évaluée
  statiquement par Next.js. Doc lue : `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md`.
- **Effet** : Next génère dans `<head>` une balise
  `<link rel="icon" href="/icon?<generated>" type="image/svg+xml" sizes="any" />`
  (attribut `sizes="any"` pour `.svg`), statiquement optimisée (prérendue au
  build et mise en cache). Applicable à toutes les routes, y compris la 404.
- **Suppression** : le `app/favicon.ico` par défaut (create-next-app) est
  retiré pour éviter deux balises `rel="icon"` concurrentes et l'icône
  générique du navigateur (FR-002/SC-002).
- **Contenu du fichier** : SVG 256×256 (viewBox phosphor), fond arrondi sombre
  (`#0c111d` type `sidebar`) et tracé du « tag » en clair — cohérent avec le
  thème sombre de l'application et Contrast d'onglet.

## 3. Logo — entête de marque de la barre latérale

- **Décision** : dans l'entête `SidebarHeader` de `components/app-sidebar.tsx`,
  le bouton-marque « TagMaker » (lien retour accueil) est précédé du composant
  `<Tag />` (taille `size-5`, `aria-hidden` — purement décoratif), poids
  « regular » par défaut, **identique au glyphe du favicon** (FR-004).
- Le lien retour accueil et la persistance sur toutes les vues sont conservés
  (FR-005 / non-régression feature 003).

## 4. Testabilité (jsdom)

- **Logo** : le lien de marque (`role="link"`, nom « TagMaker ») doit contenir
  un élément `svg` (requête DOM sur `querySelector('svg')` dans le lien). La
  taille/classe est secondaire.
- **Favicon** : artefact statique, non du code React — validation par lecture
  du fichier `app/icon.svg` (présence du `<svg`, du tracé du tag, taille
  256) + contrôle build/quickstart (`link rel="icon"` présent dans les pages
  servies).

## 5. Décisions consolidées

| Décision | Justification | Alternatives considérées |
|----------|---------------|--------------------------|
| Icône `Tag` de `@phosphor-icons/react` (déjà installé) | Contrainte utilisateur « phosphor déjà installée » ; zéro dépendance ajoutée | Ajouter `lucide-react` ou embarquer un SVG tiers → dépendance superflue (KISS/YAGNI) |
| Favicon via `app/icon.svg` (convention fichier) | Prise en charge native v16, statique, `<link rel="icon">` auto sur toutes les routes | `app/icon.tsx` + `ImageResponse` (`next/og`) → plus lourd (runtime/caches) pour un PNG fixe ; `public/favicon.ico` manuel → hors conventions |
| Suppression de `app/favicon.ico` | Évite deux `rel="icon"` concurrents ; retire l'icône générique | Le conserver → doublon / icône par défaut encore servie |
| Tracé SVG identique au composant `Tag` (regular) | FR-004 : même symbole logo/favicon | Autre source de glyphe → incohérence visuelle |
| Logo décoratif `aria-hidden` dans le lien de marque | Le nom accessible du lien reste « TagMaker » (pas de doublon lecture) | Texte alternatif sur l'icône → double annonce |