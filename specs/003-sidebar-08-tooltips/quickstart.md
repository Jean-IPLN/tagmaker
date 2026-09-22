# Quickstart — Sidebar-08 et descriptions au survol

Guide de validation du rendu « sidebar-08 encastrée + titres seuls + infobulle
droite ». Références : [contrats ui](./contracts/ui.md), [modèle de données](./data-model.md).

## Prérequis

- `npm install` effectué (aucune nouvelle dépendance pour cette feature).
- Branche `003-sidebar-08-tooltips`.

## Lancement

```bash
npm run dev
```

## Scénarios de validation

### A. Présentation encastrée + liste en titres seuls

1. Ouvrir `http://localhost:3000`.
2. Vérifier que la barre latérale est **encastrée** (panneau délimité, posé
   en retrait dans la page, pas de sidebar flottante/bord dur).
3. Vérifier que l'entête de marque affiche « TagMaker ».
4. Vérifier sous « Modules » que le module **EAN-13** apparaît **par son
   titre seulement** : aucune description visible dans la liste.

**Attendu** : `data-variant="inset"` présent dans le DOM ; texte
« Imprimer des étiquettes à code-barres EAN-13 » absent tant qu'aucune
entrée n'est survolée.

### B. Description au survol (infobulle droite)

1. Passer le pointeur sur l'entrée **EAN-13** dans la liste.
2. Vérifier qu'une infobulle apparaît **à droite** de l'entrée et affiche la
   description du module.
3. Retirer le pointeur : l'infobulle disparaît.
4. Aucune infobulle résiduelle à l'arrêt du pointeur.

### C. Navigation conservée (non-régression)

1. Cliquer sur **EAN-13** : le formulaire s'affiche dans la zone principale,
   l'entrée **EAN-13** reste mise en évidence, le fil d'Ariane affiche
   « EAN-13 ».
2. Accès direct `http://localhost:3000/ean13` : résultat identique.
3. Accueil `http://localhost:3000/` : squelette (SkeletonForm) affiché à la
   racine, sidebar et en-tête présents.
4. URL inconnue `http://localhost:3000/*` : 404 avec sidebar et en-tête
   persistants.

### D. Repli et écran étroit (mécanisme du prébuild)

1. Bouton de repli (`SidebarTrigger`) : la barre se range/déroule (offcanvas).
2. Écran étroit (émulation mobile ou rétrécissement de la fenêtre) : la liste
   reste accessible (panneau mobile de shadcn).

**Limite documentée** : l'interaction tactile réelle (drawer mobile, survol)
nécessite un navigateur ; les tests automatisés couvrent la logique
(desktop jsdom : variante, titre seul, infobulle survol).

## Validation automatisée

```bash
npm test                 # suite complète (baseline 46 + nouveaux cas)
npm run test:coverage    # couverture > 80 %
npm run lint             # 0 erreur / 0 warning
npm run build            # build OK
```