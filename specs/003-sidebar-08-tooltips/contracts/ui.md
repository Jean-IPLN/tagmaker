# Contrats d'interface utilisateur — Sidebar-08 et descriptions au survol

Ces contrats décrivent le rendu **observable** de la présentation, issus du
bloc prébuild sidebar-08 (structures implémentées avec les primitives
`base-nova` du projet).

## 1. Contrat de la coquille (app shell)

- **C-1.1** : La page est enveloppée par `SidebarProvider` → `AppSidebar`
  (présentation encastrée « inset ») → `SidebarInset`.
- **C-1.2** : L'en-tête (`header`) occupe la hauteur fixe `h-16`, sans
  bordure inférieure ; il contient, dans cet ordre : le bouton de repli
  (`SidebarTrigger`), un séparateur vertical, puis le fil d'Ariane du module
  courant.
- **C-1.3** : La zone de contenu (`slot`) est un conteneur fluide
  `flex flex-1 flex-col gap-4 p-4 pt-0` à l'intérieur de `SidebarInset`.
- **C-1.4** : Le panneau latéral est encastré (gouttière `p-2` du variant
  `inset`) ; son entête de marque affiche le nom de l'application.

## 2. Contrat de la liste des modules

- **C-2.1** : Chaque module est une entrée de lien dont le **libellé est le
  titre seul** (`module.name`). La description n'est jamais rendue dans la
  liste.
- **C-2.2** : L'entrée du module dont l'URL correspond à l'URL courante porte
  l'état actif (`data-active`).
- **C-2.3** : Le survol (ou le focus clavier) d'une entrée ouvre une
  infobulle positionnée **à droite** contenant la description du module ;
  le retrait du pointeur (ou la perte du focus) la ferme.
- **C-2.4** : Inégalité d'ouverture — jamais plus d'une infobulle visible à
  la fois.

## 3. Contrat du fil d'Ariane (inchangé, non-régression)

- **C-3.1** : Sur une vue module, le fil d'Ariane affiche le nom du module
  courant ; à la racine, une valeur neutre (« Accueil »).

## 4. Vérification (reposant sur les tests)

- La variante encastrée est vérifiable par l'attribut de rendu
  `data-variant="inset"` du panneau.
- L'absence de description en liste est vérifiable par l'absence du texte
  `description` du registre dans le document rendu.
- L'infobulle droite est vérifiable par l'apparition du texte `description`
  après simulation d'un survol du trigger, puis sa disparition après retrait.