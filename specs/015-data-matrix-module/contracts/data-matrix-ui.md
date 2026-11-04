# Contrat — Interface du module Data Matrix

**Feature**: 015-data-matrix-module | **Page** : `/data-matrix`

## Découverte du module

- Entrée `lib/modules/registry.ts` : `id: "data-matrix"`,
  `name: "Data Matrix"`, `href: "/data-matrix"`.
- Apparaît automatiquement sur la page d'accueil, dans la barre latérale,
  dans l'en-tête et dans les modules récents après visite.

## Page

- Titre : « Étiquette Data Matrix ».
- Description : contenu libre + légende facultative, 2D carré.
- Formulaire unique.

## Formulaire

| Élément | Détail |
|---------|--------|
| Champ « Contenu » | `Input` texte, obligatoire, `maxLength=200`, `autoComplete="off"`, aide « 1 à 200 caractères ASCII imprimables » |
| Champ « Légende » | `Input` texte, facultatif, `maxLength=60`, `autoComplete="off"`, aide « 0 à 60 caractères, imprimée sous le code » |
| Champ « Quantité » | `Input` numérique, 1–1000, défaut « 1 » |
| Bouton | « Imprimer » / « Impression en cours… » (désactivé pendant l'envoi) |

Le formulaire porte `noValidate` (même raison que les autres modules : éviter
la validation native du navigateur sur le champ numérique).

## Comportements

1. **Validation client** : même schéma que le serveur ; premier message
   d'erreur en toast, aucun appel réseau.
2. **Garde-fou imprimante** : si aucun `printerAddress` dans le cookie
   `tagmaker_print_settings`, toast
   « Aucune imprimante sélectionnée. Choisissez une imprimante dans les
   paramètres. » et aucun envoi.
3. **Confirmation** : si `quantity > 2`, dialogue générique
   « Imprimer N étiquettes ? » (Annuler / Confirmer) ; la confirmation
   revalide la saisie courante ; l'annulation ne modifie pas la saisie.
4. **Payload** : `{ content, legend?, quantity, paperId?, printerAddress?, rotated? }`
   construit depuis le cookie, comme les modules existants.
5. **Succès** : toast « Impression envoyée (N étiquette(s)) ».
6. **Erreurs** : message serveur en toast ; 503 préfixé
   « Imprimante injoignable : » ; erreur réseau
   « Erreur réseau : impossible de joindre le serveur. ».
7. **Réglages partagés** : papier, orientation et imprimante proviennent du
   panneau de réglages existant ; le module n'ajoute aucun réglage.

## Accessibilité

- `Label htmlFor` associé à chaque champ.
- Dialogue : titres/descriptions lus par les technologies d'assistance
  (`AlertDialog` existant).
- Bouton désactivé pendant l'envoi, libellé explicite.
