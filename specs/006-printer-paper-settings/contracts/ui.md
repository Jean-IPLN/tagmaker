# Contrat — Section Paramètres (interface)

## Emplacement

Pied de la barre latérale (`SidebarFooter`), visible sur toutes les vues —
squelette : un **séparateur** (`Separator`) au-dessus d'un regroupement
« Paramètres » avec deux listes déroulantes : **Papier** puis **Imprimante**
(FR-001, SC-004). Pas de cadre autour de la section.

## Composants (client)

### `SettingsFooter`

Props (fournies par le serveur depuis `lib/paper-sizes.ts`) :

- `paperSizes: PaperSize[]` — formats triés par surface croissante ;
- `defaultPaperId: string` — identifiant du format courant (repli).

### Sélecteur « Papier »

- Options : chaque `PaperSize` (label `"40 × 25 mm"`), tri fourni.
- Valeur initiale : `paperId` du cookie s'il est dans la liste, sinon
  `defaultPaperId` (FR-010).
- Petit format annoté « par défaut » (le format courant).
- Toute sélection → écrit `paperId` dans le cookie + mise à jour de
  l'impression suivante (FR-003, FR-004).

### Sélecteur « Imprimante »

- Lancé avec la valeur du cookie :
  - `printerAddress` présente → **sélectionnée directement, aucun scan** (FR-013) ;
  - sinon → état **non sélectionné** : le déclencheur passe en **couleur warn**
    (bordure + texte ambre) avec une icône d'avertissement et le message
    « Non défini » comme libellé (FR-012).
- À l'ouverture (état non sélectionné) : appelle `GET /api/printers/discover`,
  affiche « Recherche des imprimantes… » puis injecte les résultats en options
  (FR-014). Résultat vide → option désactivée « Aucune imprimante détectée »
  (FR-015), le déclencheur reste en warn.
- Toute sélection → écrit `printerAddress` dans le cookie (FR-006, FR-007) et
  le déclencheur repasse à l'état normal.

## États d'avertissement

- Imprimante non définie : **le sélecteur lui-même** passe en warn
  (bordure `amber-500`, texte `amber-500`, icône d'avertissement, libellé
  « Non défini ») — pas de texte d'avertissement séparé.
- Aucune imprimante détectée : même état warn, option « Aucune imprimante
  détectée » dans la liste déroulante.

## Rendu initial (SSR)

- La liste des formats et le `defaultPaperId` sont calculés côté serveur et
  présents dans le HTML initial (pas de flash).
- L'état de l'imprimante dépend d'un cookie **client** : le pied de page démarre
  en état « lecture du réglage » sans scan ; rien n'est scanné pendant le SSR.

## Exigences couvertes

FR-001 à FR-015 (section, sélecteurs, états, avertissements, persistance) ;
scénarios des stories 1 et 2.