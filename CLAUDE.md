# CLAUDE.md — Projet Kola

Ce fichier donne le contexte du projet à Claude Code. Il doit être lu avant toute tâche de développement sur ce repo.

## Qu'est-ce que Kola

Kola répond à une seule question, de façon fiable : **« cet utilisateur a-t-il un abonnement actif ? »**

Kola gère l'abonnement récurrent (Mobile Money) pour des apps mobiles africaines qui ne peuvent pas utiliser Google Play Billing (Cameroun et pays similaires non éligibles au compte marchand Google). Kola ne détient jamais l'argent de l'éditeur, ne touche jamais l'intérieur de l'app mobile côté paiement — tout se passe hors app (conformité Google Play, app en "consommation seule").

**Statut actuel** : MVP en développement. Un seul tenant (l'auteur du projet, Dieudonné), sur son app Flutter en test fermé.

## Documents de référence (source de vérité)

- `docs/kola-web-cahier-des-charges.md` — architecture, schéma Prisma, API, dashboard, moteur/cron
- `docs/kola-sdk-cahier-des-charges.md` — package Flutter, comportement offline, sécurité JWT

**Toujours consulter ces documents avant d'implémenter une fonctionnalité.** Si une tâche demandée contredit ces documents, le signaler avant de coder plutôt que de trancher silencieusement.

## Règles absolues — jamais négociables, même si explicitement demandé

1. **Aucune UI de paiement dans l'app mobile.** Le SDK `kola_sdk` ne doit jamais avoir de méthode publique qui accepte un montant, une URL de paiement, ou qui ouvre un flux d'achat. Aucun écran de l'app Flutter ne doit afficher un prix ou un bouton "Payer"/"S'abonner". C'est une exigence de conformité Google Play, pas une préférence de design.
2. **Kola ne détient jamais de fonds.** L'argent va directement du client final au compte Campay/MeSomb de l'éditeur. Aucune fonctionnalité de type "solde Kola", "portefeuille interne", ou "reversement" ne doit être ajoutée.
3. **JWT signé en RS256, jamais en HS256.** Le serveur signe avec une clé privée jamais exposée ; le SDK Flutter n'embarque que la clé publique. Une clé symétrique dans le binaire de l'app serait extractible et permettrait de forger des accès premium gratuits.
4. **Idempotence des webhooks garantie par une contrainte unique en base** (`Transaction.providerTransactionId`), pas seulement par une vérification applicative.
5. **La route `/api/cron/...` et les webhooks doivent être protégés** (header secret pour le cron, vérification de signature/origine pour le webhook Campay).

## Décisions déjà tranchées (ne pas re-débattre sans raison nouvelle)

- **`identifiantExterne` = numéro de téléphone normalisé (E.164)**, pas un UID généré côté app. Choix fait pour permettre la restauration d'accès après désinstallation/réinstallation par simple resaisie du numéro.
- **`Abonnement.lienPaiement` est permanent**, généré une fois, réutilisé à chaque renouvellement. Pas de régénération par cycle.
- **Pas d'OTP/vérification du numéro au MVP** — quiconque connaît un numéro peut consulter (pas modifier) le statut d'abonnement associé. Risque accepté au MVP, à réévaluer en V1.
- **Un seul tenant au MVP**, créé manuellement via `seed.ts`. Le modèle `Tenant` existe déjà dans le schéma pour éviter une migration future, mais aucune UI d'inscription/auth multi-tenant n'est à construire maintenant.
- **Auth du dashboard MVP** : Better Auth (adaptateur Prisma), email/mot de passe, un seul compte. Le plugin "organizations" (déjà inclus dans Better Auth) sera activé en V1 pour le multi-tenant — pas de changement de librairie à prévoir. Ne pas revenir à un système de cookie signé fait maison.
- **Provider de paiement MVP** : Campay (sandbox `demo.campay.net`, montants de test plafonnés à 100 FCFA).

## Stack technique

- **`kola-web`** : Next.js (App Router), full-stack — dashboard, API, page de paiement dans le même projet.
- **ORM** : Prisma
- **Base de données** : PostgreSQL hébergé sur Neon
- **Authentification dashboard** : Better Auth (pas Auth.js/NextAuth, pas de cookie fait maison) — voir décisions ci-dessus
- **Hébergement** : Vercel (y compris le cron via `vercel.json`)
- **`kola_sdk`** : package Flutter/Dart, repo Git séparé, référencé en dépendance Git dans `pubspec.yaml` (pas encore publié sur pub.dev au MVP)

## Discipline de code à respecter

- **Séparer dashboard et logique métier** : les pages `app/dashboard/...` ne doivent jamais lire la base de données directement. Elles appellent des routes `app/api/...`, même en mono-projet. C'est ce qui permettra, plus tard, d'extraire l'API vers un backend séparé (ex. Laravel) sans toucher au dashboard.
- **Noms de domaine en français**, cohérents avec le schéma Prisma déjà écrit (`Abonnement`, `Abonne`, `Offre`, `Tenant`, statuts `ACTIF`/`TOLERANCE`/`COUPE`/`EXPIRE`). Ne pas mélanger avec des noms anglais (`Subscription`, `Customer`...) dans le même projet.
- **Toute erreur réseau ou serveur, côté SDK Flutter, doit être absorbée silencieusement et retourner `false`.** Seule l'absence d'appel à `Kola.init()` avant `isActive()` doit lever une exception (`StateError`), et uniquement en debug.

## Ordre d'implémentation du MVP (voir cahier `kola-web` §7 pour le détail)

1. Setup Next.js + Prisma + Neon
2. Schéma Prisma + migration + `seed.ts` (un Tenant, une App, une Offre)
3. Compte sandbox Campay + `lib/campay.ts`
4. Page de paiement `/pay/[lienPaiement]` + `POST /api/pay/initiate`
5. `POST /api/webhooks/campay` (avec idempotence)
6. `lib/stateMachine.ts` + `GET /api/cron/avancer-abonnements`
7. `GET /api/v1/subscriptions/status` (endpoint consommé par le SDK)
8. Package `kola_sdk` (Flutter)
9. Dashboard (`/dashboard`, `/dashboard/abonnes`) + auth par mot de passe
10. Intégration complète sur l'app réelle en test fermé

**Ne pas anticiper les features listées V1/V2/V3** (multi-tenant, relances automatisées, multi-devise, etc.) sauf demande explicite — elles sont volontairement hors du périmètre MVP.

## Plan de test à garder en tête pendant le développement

Chaque fonctionnalité livrée doit pouvoir être vérifiée contre les scénarios du cahier `kola-web` §6, notamment :
- Paiement sandbox → activation avec la bonne date d'échéance
- Double webhook → pas de doublon
- Paiement en avance vs en retard → calcul de date correct dans les deux cas
- Cycle complet sans paiement → séquence `ACTIF → TOLERANCE → COUPE → EXPIRE`
- SDK hors ligne → cache JWT valide jusqu'à 72h, puis `false`
- Cron rejoué deux fois → aucun effet de bord dupliqué
