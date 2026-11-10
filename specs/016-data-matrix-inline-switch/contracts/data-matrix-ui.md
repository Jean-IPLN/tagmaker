# Contrat — Interface du commutateur in-line

**Feature**: 016-data-matrix-inline-switch | **Page** : `/data-matrix` |
**Base** : [015 data-matrix-ui.md](../../015-data-matrix-module/contracts/data-matrix-ui.md)

## Formulaire

Le formulaire conserve les champs existants (Contenu, Légende, Quantité,
bouton Imprimer) et ajoute un commutateur après le champ Légende.

| Élément | Détail |
|---------|--------|
| Libellé | « Affichage in-line » |
| Contrôle | `Switch` existant (`components/ui/switch.tsx`) |
| État initial | désactivé |
| Aide | « Légende à droite du code, sur la même ligne (orientation normale). » |
| Accessibilité | rôle `switch`, nom accessible « Affichage in-line », utilisable au clavier |
| Persistance | aucune ; l'état est propre au formulaire |

Le commutateur reste activable lorsque l'orientation pivotée est active, mais
le rendu pivoté reste prioritaire et le choix n'a alors aucun effet visible.
L'aide peut le préciser sans ajouter de désactivation conditionnelle.

## Comportement

1. À l'ouverture, `isInline = false` ; le rendu et le payload sont identiques
   à la version actuelle.
2. Un clic ou la touche d'activation bascule l'état sans vider les champs.
3. Si `isInline` est vrai, le payload d'impression contient `inline: true`.
   S'il est faux, le champ `inline` est omis pour préserver le payload existant.
4. La validation client, le garde-fou imprimante, la confirmation au-delà de
   2 étiquettes et la gestion des erreurs restent inchangés.
5. La confirmation d'une quantité > 2 relit l'état courant du commutateur et
   l'inclut dans le payload confirmé.
6. Un refus de tenue (`422`) conserve la saisie et l'état du commutateur.

## Payload

Désactivé :

```json
{
  "content": "REF-2026-A17",
  "legend": "Palette 42",
  "quantity": 1,
  "printerAddress": "192.168.1.50"
}
```

Activé :

```json
{
  "content": "REF-2026-A17",
  "legend": "Palette 42",
  "quantity": 1,
  "printerAddress": "192.168.1.50",
  "inline": true
}
```

Les réglages `paperId` et `rotated` continuent de provenir du cookie existant
via `sendPrintRequest` ; le formulaire n'ajoute aucun réglage partagé.

## Non-régression

- Le libellé d'aide « imprimée sous le code » du champ Légende doit rester
  cohérent avec le mode par défaut ; l'aide du commutateur décrit l'option.
- Les tests existants du formulaire restent valides lorsque le commutateur est
  désactivé.
- Le commutateur est atteignable au clavier et son état est exposé par
  l'attribut `data-checked` du composant Base UI existant.
