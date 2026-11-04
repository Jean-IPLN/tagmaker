# Contrat — Interface du module Code 128

**Feature**: 014-code128-module | **Page** : `/code128`

## Découverte du module

- Entrée `lib/modules/registry.ts` : `id: "code128"`, `name: "Code 128"`,
  `href: "/code128"`.
- Apparaît automatiquement sur la page d'accueil, dans la barre latérale,
  dans l'en-tête de la page et dans les modules récents après visite.

## Page

- Titre : « Code 128 ».
- Description : impression d'étiquettes avec un contenu libre.
- Formulaire unique, sans sélecteur de mode.

## Formulaire

| Élément | Détail |
|---------|--------|
| Champ « Contenu » | `Input` texte, obligatoire, `maxLength=80`, `autoComplete="off"`, aide « 1 à 80 caractères ASCII imprimables » |
| Champ « Quantité » | `Input` numérique, 1–1000, défaut « 1 » |
| Bouton | « Imprimer » / « Impression en cours… » (désactivé pendant l'envoi) |

## Comportements

1. **Validation client** : même schéma que le serveur ; premier message
   d'erreur affiché en toast, aucun appel réseau.
2. **Garde-fou imprimante** : si aucun `printerAddress` dans le cookie
   `tagmaker_print_settings`, toast
   « Aucune imprimante sélectionnée. Choisissez une imprimante dans les
   paramètres. » et aucun envoi.
3. **Confirmation** : si `quantity > 2`, ouverture du dialogue générique
   « Imprimer N étiquettes ? » (Annuler / Confirmer). La confirmation
   réutilise la saisie courante revalidée ; l'annulation ne modifie pas la
   saisie.
4. **Payload** : `{ content, quantity, paperId?, printerAddress?, rotated? }`
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
