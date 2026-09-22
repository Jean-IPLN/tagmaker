# Contrat — Adaptateur cookie de l'historique

Adaptateur navigateur du stockage (« cookies » — directive utilisateur).
Seul point de contact avec l'API cookie de la page.

## Constante

- `RECENT_COOKIE_NAME = "tagmaker_recent_modules"`

## Attributs du cookie

`path=/` · `SameSite=Lax` · `Max-Age=30 jours` · **non `HttpOnly`** ·
aucune donnée sensible.

## API (client)

- `readRecentCookie(): RecentModuleEntry[]`
  - Lit `document.cookie`, extrait la valeur du cookie, la décode et appelle
    `parseEntries` (voir `contracts/recent-modules.md`).
  - **Retour sûr** : cookie absent / JSON invalide → `[]`, jamais d'exception.
- `writeRecentCookie(entries: RecentModuleEntry[]): void`
  - Sérialise et écrit le cookie avec **`Max-Age=30 jours`** (rafraîchi à
    chaque écriture), encodage des caractères spéciaux.
  - **Échec silencieux** : une erreur d'écriture ne doit pas remonter.

## Utilisation

- **Écriture** : côté client uniquement, dans le composant de suivi.
- **Lecture** : 
  - côté serveur (SSR) à l'accueil via l'API `cookies()` de l'application
    (même nom de cookie, mêmes règles de parse, retour sûr) ;
  - côté client si besoin, via `readRecentCookie`.