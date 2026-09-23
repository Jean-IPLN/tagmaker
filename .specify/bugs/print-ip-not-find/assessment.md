# Bug Assessment: L'imprimante configurée (`ZPL_PRINTER_HOST`) est exclue du scan

- **Slug**: `print-ip-not-find`
- **Created**: 2026-09-23
- **Source**: pasted text (aucune URL fournie)
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

> « Pas toute les imprimente apparaissenet dans la liste des imprimante scanné.
> par exemple sur ce reseau je sais que la 192.168.1.63 est accecible en zpl
> port 9100 pourtant elle n'apparait pas dans la liste des ip »

Aucune URL n'a été fournie dans le rapport (`Source: pasted text`). Politique
URL : non applicable — pas de fetch.

## Symptom

L'imprimante `192.168.1.63`, accessible en ZPL (port 9100) sur le réseau,
n'apparaît jamais dans la liste des imprimantes découvertes alors que d'autres
imprimantes du même /24 y figurent. Un scan `nc -z 192.168.1.63 9100` confirme
la disponibilité.

## Reproduction

1. Configurer `.env` avec `ZPL_PRINTER_HOST=192.168.1.63` (c'est le cas par
   défaut du projet : `.env` et `.env.example`).
2. Démarrer l'application, ouvrir le pied de barre latérale puis le sélecteur
   « Imprimante ».
3. Laisser le scan se terminer.
4. Constater que `192.168.1.63` est absente de la liste — même si le port
   9100 y répond.
5. Vérification croisée : un scan réel antérieur (session de validation) a
   retourné `192.168.1.20` et `192.168.1.66`, jamais `192.168.1.63`.
   `[NEEDS CLARIFICATION: adresse IP de la machine serveur — non documentée ; sert à valider que le correctif cible la bonne IP locale.]`

## Suspected Code Paths

- `lib/printer/discovery.ts:72` — `discoverPrinters()` appelle
  `buildScanTargets(subnet, env.ZPL_PRINTER_HOST)` et exclut donc l'adresse de
  l'imprimante **configurée**.
- `lib/printer/discovery.ts:27-36` — `buildScanTargets(subnet, excludeIp?)`
  filtre la cible quand `address !== excludeIp`.
- `lib/printer/discovery.test.ts:104-108,163-175,177-190` — les tests
  verrouillent le comportement erroné sous le nom « exclut l'IP locale du
  serveur » (nommage trompeur : c'est bien `ZPL_PRINTER_HOST` qui est exclu).

## Root Cause Hypothesis

Rapport **valid**. `discoverPrinters` exclut du scan
`env.ZPL_PRINTER_HOST` — or cette variable est le **réglage d'imprimante
défaut** (destination ZPL de l'application), pas l'IP de la machine serveur.
Le contrat (`specs/006-printer-paper-settings/contracts/printer-discovery.md`)
et les noms de tests visent pourtant « hors IP locale du serveur ». La bonne
IP locale (déductible via `os.networkInterfaces()`) est distincte de
`ZPL_PRINTER_HOST` dans le cas courant : le serveur n'est pas l'imprimante.
Résultat : quand l'utilisateur pointe `ZPL_PRINTER_HOST` sur une vraie
imprimante (usage normal du service d'impression), cette imprimante est
silencieusement retirée de la découverte. Aucun contournement par
`ZPL_SCAN_SUBNET` (l'exclusion s'applique aussi). Confiance : haute.

Facteur secondaire noté mais écarté : le timeout de 1 000 ms en sondage
parallèle pourrait rater des imprimantes lentes, mais `192.168.1.63` est
connue stable → ce n'est pas l'explication ici.

## Proposed Remediation

**Preferred** : exclure du scan les **adresses réelles de la machine serveur**,
pas l'imprimante configurée. Récupérer les IP IPv4 non-loopback
(`os.networkInterfaces()`), ne retenir que celles appartenant au préfixe /24
scanné, et les passer à `buildScanTargets`. En cas d'indétermination
(aucune IP locale dans le sous-réseau, environnement conteneurisé),
**ne rien exclure** plutôt que de ré-exclure `ZPL_PRINTER_HOST`. L'imprimante
configurée reste ainsi visible dans la liste, conformément au contrat.

**Alternatives** :
- Supprimer purement et simplement l'exclusion (scruter les 254 adresses).
  Le test le plus simple (KISS) ; le probe ne fait qu'une connexion TCP puis
  détruit le socket sans payload — scanner sa propre IP est bénin (auto-détection
  uniquement si le serveur écoute lui-même sur 9100, improbable). Change le
  contrat « hors IP locale » en « tout le /24 » et les tests 253 → 254.
- Exclure `ZPL_PRINTER_HOST` seulement si l'utilisateur le demande explicitement
  (nouvelle variable) : sur-ingénierie, rejetée (YAGNI).

**Files likely to change**:
- `lib/printer/discovery.ts` (+ import `os`)
- `lib/printer/discovery.test.ts`
- `specs/006-printer-paper-settings/contracts/printer-discovery.md` (préciser
  « IP locale du serveur » vs IP imprimante)

**Tests to add or update**:
- Remplacer « exclut l'IP locale du serveur » : `buildScanTargets` doit
  **inclure** `192.168.1.63` (l'imprimante configurée) et exclure les IP
  retournées par `os.networkInterfaces()` mocké.
- `discoverPrinters` : une imprimante dont l'adresse vaut
  `env.ZPL_PRINTER_HOST` doit être retournée (mock `socketOpening()` sur
  `192.168.1.63`).
- Cas limite mocké : aucun `os.networkInterfaces()` dans le sous-réseau →
  scan des 254 adresses, aucune exception.

## Risks & Considerations

- `os.networkInterfaces()` dépend de l'environnement (bridge Docker, NAT) ;
  le fallback « exclure rien » couvre ces cas sans casser la découverte.
- Pas de changement d'API ni de migration : la forme de la réponse
  `{ printers: [{ address, port }] }` est inchangée ; la durée du scan reste
  ~1 s (une passe parallèle).
- Aucun risque sécurité : l'exclusion n'est qu'un raffinement cosmétique du
  scan (ne pas lister sa propre machine), pas un garde de sécurité.
- Observabilité : la liste des IP exclues devrait être loggable/visible pour
  éviter de re-produire une confusion similaire.

## Open Questions

- [NEEDS CLARIFICATION: adresse IP réelle de la machine serveur sur le réseau (probablement distincte de 192.168.1.63) — à confirmer pour valider l'hypothèse et le correctif.]
- [NEEDS CLARIFICATION: `ZPL_SCAN_SUBNET` est-elle définie dans l'environnement de production ? (ne change pas l'exclusion actuelle, mais éclaire la config aux tests).]

---
**Résolution (réalisée)** : l'exclusion ne vise plus `ZPL_PRINTER_HOST` mais
les IP IPv4 réelles de la machine serveur (`os.networkInterfaces()` filtré sur
le sous-réseau scanné), fallback « exclure rien » en cas d'indétermination.
Tests mis à jour + test de régression « l'imprimante configurée dans
ZPL_PRINTER_HOST est détectée ».