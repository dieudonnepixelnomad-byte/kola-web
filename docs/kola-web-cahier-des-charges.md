# Kola-web — Cahier des charges

> Rédigé le 18/07/2026 · Porteur : Gwet Bikoun Dieudonné, Douala — développeur mobile Flutter (10+ ans)
> Statut : MVP en développement. Premier client = l'auteur lui-même, sur son app Flutter en test fermé sur Google Play.
> Document unique couvrant le produit `kola-web` (dashboard + API + page de paiement). Le SDK Flutter (`kola_sdk`), consommateur externe de ce système, fait l'objet d'un cahier des charges séparé.

---

## 1. Contexte et problème adressé

Un développeur d'application mobile basé au Cameroun (ou dans un pays africain francophone non éligible au compte marchand Google Play) veut vendre un abonnement mensuel dans son app. Deux murs se dressent :

1. **Google refuse le compte marchand** pour la majorité des pays africains francophones (le compte développeur est autorisé, pas l'encaissement).
2. **Le Mobile Money n'a pas de prélèvement automatique** — chaque renouvellement exige une action manuelle du client, ce qui oblige le développeur à construire lui-même toute une infrastructure de facturation récurrente (état des abonnements, relances, tolérance, réconciliation, mode hors ligne).

Kola répond à une question unique et fiable : **« Est-ce que cet utilisateur a payé ? »** — sans jamais toucher l'argent du développeur, et sans jamais intervenir à l'intérieur de l'app (conformité Google : consommation seule, paiement hors app).

---

## 2. Acteurs du système

| Acteur | Rôle |
|---|---|
| **Éditeur (tenant)** | Développeur qui utilise Kola pour gérer les abonnements de sa propre app. Premier éditeur : Dieudonné lui-même. |
| **Abonné final** | Utilisateur de l'app de l'éditeur, qui paie l'abonnement. |
| **Kola (le système)** | Orchestrateur : état des abonnements, relances, ouverture/fermeture d'accès. Ne touche jamais l'argent. |
| **Provider de paiement** | Campay (par défaut), interchangeable avec MeSomb ou autre agrégateur Mobile Money. Encaisse réellement, reverse directement au compte de l'éditeur. |

---

## 3. Découpage des versions

### MVP — usage interne (1 tenant = l'auteur)
Objectif : abonnement fonctionnel et fiable sur une app réelle en test fermé. Pas encore de produit vendable à d'autres. **Ce document détaille intégralement le MVP.**

### V1 — produit vendable, multi-tenant
N'importe quel développeur peut créer un compte, connecter ses propres clés Campay/MeSomb, et gérer ses abonnés en autonomie. *(listé §11, non détaillé ici)*

### V2 — robustesse et différenciation
Le produit tient la charge de plusieurs dizaines de clients, avec plus de finesse. *(listé §11)*

### V3 — extensions
Réponses à des besoins qui n'émergeront qu'avec un vrai marché. *(listé §11)*

---

## 4. Architecture globale (MVP)

### 4.1 Projets (dépôts Git)

| Projet | Contenu | Déploiement |
|---|---|---|
| **`kola-web`** | Dashboard + API (webhooks, cron, endpoint SDK) + page de paiement — un seul projet Next.js (App Router), objet de ce document | Vercel |
| **`kola_sdk`** | Package Flutter/Dart, consommé par l'app mobile de l'éditeur — cahier des charges séparé | Repo Git séparé |

### 4.2 Schéma de flux

```
┌─────────────────┐        isActive()         ┌──────────────────────┐
│   App Flutter     │ ─────────────────────────▶ │  kola-web /api/v1/…  │
│  (kola_sdk)        │ ◀───────────────────────── │  (Next.js API route) │
└─────────────────┘   {actif: bool, token}     └───────────┬──────────┘
                                                             │
                                                             ▼
                                                     ┌───────────────┐
                                                     │  PostgreSQL     │
                                                     │  (Neon, Prisma) │
                                                     └───────┬───────┘
                                                             ▲
                    ┌────────────────────────────────────────┘
                    │ (lecture/écriture)
        ┌───────────┴───────────┐          ┌─────────────────────┐
        │  Cron quotidien         │          │  Webhook Campay        │
        │  /api/cron/…             │          │  /api/webhooks/campay  │
        │  (avance les états)      │          │  (paiement reçu)       │
        └───────────────────────┘          └───────────┬─────────┘
                                                          │
                                                          ▼
                                                  ┌───────────────┐
                                                  │  Campay API      │
                                                  │  (sandbox/prod)  │
                                                  └───────┬───────┘
                                                          ▲
                                                          │ paiement
                                                  ┌───────┴───────┐
                                                  │  Page de paiement │
                                                  │  /pay/[lien]        │
                                                  │  (Next.js, publique) │
                                                  └────────────────┘
                                                          ▲
                                                          │ visite le lien
                                                  ┌───────┴───────┐
                                                  │  Abonné final     │
                                                  └────────────────┘
```

### 4.3 Arborescence du projet `kola-web`

```
kola-web/
├── prisma/
│   └── schema.prisma
├── app/
│   ├── dashboard/                    # UI protégée (Better Auth, mono-tenant MVP)
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # vue d'ensemble (compteurs)
│   │   ├── abonnes/page.tsx          # liste des abonnés
│   │   └── login/page.tsx
│   ├── pay/
│   │   └── [lienPaiement]/page.tsx   # page de paiement publique
│   └── api/
│       ├── v1/
│       │   └── subscriptions/
│       │       └── status/route.ts   # appelé par le SDK Flutter
│       ├── webhooks/
│       │   └── campay/route.ts       # réception paiement
│       ├── cron/
│       │   └── avancer-abonnements/route.ts
│       ├── pay/
│       │   └── initiate/route.ts     # déclenche la demande Campay
│       └── admin/
│           ├── abonnes/route.ts      # lecture pour le dashboard
│           └── auth/[...all]/route.ts  # Better Auth
├── lib/
│   ├── prisma.ts
│   ├── auth.ts                       # config Better Auth
│   ├── campay.ts                     # client API Campay
│   ├── jwt.ts                        # signature RS256 / vérif token SDK
│   └── stateMachine.ts               # logique des transitions d'état
├── vercel.json                       # config du cron
└── .env
```

**Discipline de code** : les pages `app/dashboard/...` ne lisent jamais la base de données directement — elles appellent des routes `app/api/...`, même en mono-projet. C'est ce qui permettra, plus tard, d'extraire l'API vers un backend séparé sans toucher au dashboard.

---

## 5. Schéma de données (Prisma)

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ─────────────────────────────────────────────
// Un seul tenant existera en base au MVP (seed manuel).
// Le modèle existe déjà pour que le passage en V1 (multi-tenant + Better Auth
// "organizations") ne demande aucune migration de schéma.
// ─────────────────────────────────────────────
model Tenant {
  id                String   @id @default(cuid())
  nom               String
  email             String   @unique
  cleApiPublique    String   @unique @default(cuid())
  cleApiPrivee      String   @unique @default(cuid())

  // Config provider de paiement (chiffré au niveau applicatif avant écriture)
  campayAppId       String?
  campayAppSecret   String?  // stocké chiffré (voir §8 Sécurité)

  apps              App[]
  createdAt         DateTime @default(now())
}

model App {
  id          String   @id @default(cuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  nom         String
  plateforme  String   @default("android") // android | ios (V2)

  offres      Offre[]

  createdAt   DateTime @default(now())
}

model Offre {
  id                  String   @id @default(cuid())
  appId               String
  app                 App      @relation(fields: [appId], references: [id])
  nom                 String   // ex: "Premium"
  slug                String   // ex: "premium" — utilisé par le SDK dans isActive('premium')
  prix                Int      // en FCFA, entier (pas de centimes)
  devise              String   @default("XAF")
  periodiciteJours    Int      @default(30)
  toleranceJours      Int      @default(3)

  abonnements         Abonnement[]

  createdAt           DateTime @default(now())

  @@unique([appId, slug])
}

model Abonne {
  id                  String   @id @default(cuid())
  tenantId            String
  identifiantExterne  String   // DÉCISION MVP : numéro de téléphone normalisé (E.164, ex. +237671960300).
                                // Pas un UID généré côté app — le téléphone est stable indépendamment
                                // de toute désinstallation/réinstallation, et sert aussi de canal
                                // de relance WhatsApp. Voir §7 pour le parcours complet.
  telephone           String?
  email               String?

  abonnements         Abonnement[]

  createdAt           DateTime @default(now())

  @@unique([tenantId, identifiantExterne])
}

enum StatutAbonnement {
  ACTIF
  TOLERANCE
  COUPE
  EXPIRE
}

model Abonnement {
  id                String            @id @default(cuid())
  abonneId          String
  abonne            Abonne            @relation(fields: [abonneId], references: [id])
  offreId           String
  offre             Offre             @relation(fields: [offreId], references: [id])

  statut            StatutAbonnement  @default(COUPE)
  dateEcheance      DateTime?
  dateActivation    DateTime?

  lienPaiement      String            @unique @default(cuid()) // utilisé dans /pay/[lienPaiement]
                                                                  // DÉCISION MVP : lien PERMANENT — généré une
                                                                  // fois à la création de l'Abonnement, réutilisé
                                                                  // pour tous les renouvellements futurs. Pas de
                                                                  // régénération à chaque cycle (simplicité ;
                                                                  // aucun risque identifié, cf. §7).

  transactions      Transaction[]
  logsRelance       LogRelance[]

  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  @@index([statut, dateEcheance])
}

enum StatutTransaction {
  EN_ATTENTE
  REUSSIE
  ECHOUEE
}

model Transaction {
  id                        String            @id @default(cuid())
  abonnementId               String
  abonnement                  Abonnement        @relation(fields: [abonnementId], references: [id])

  providerTransactionId       String            @unique // idempotence : clé d'unicité Campay
  provider                    String            @default("campay")
  montant                     Int
  statut                      StatutTransaction @default(EN_ATTENTE)

  recuLe                      DateTime          @default(now())
  traiteLe                    DateTime?

  payloadBrut                 Json?             // trace brute du webhook, utile en debug
}

enum TypeRelance {
  J_MOINS_3
  J_PLUS_7
}

model LogRelance {
  id              String       @id @default(cuid())
  abonnementId    String
  abonnement      Abonnement   @relation(fields: [abonnementId], references: [id])
  type            TypeRelance
  envoyeLe        DateTime     @default(now())
  canal           String       @default("whatsapp_manuel") // MVP : déclenché mais envoyé à la main
}
```

**Notes de conception**

- `Offre.slug` est ce que le SDK Flutter passe à `isActive('premium')` — permet plusieurs offres par app dès le MVP sans migration future.
- `Transaction.providerTransactionId` porte une contrainte `@unique` : c'est la ligne de défense principale contre le double comptage d'un webhook envoyé deux fois.
- `Abonnement.lienPaiement` est un identifiant opaque et unique utilisé dans l'URL publique `/pay/[lienPaiement]` — évite d'exposer les IDs internes ou les numéros de téléphone dans l'URL.
- Le modèle `Tenant` existe dès le MVP mais n'aura qu'**une seule ligne, créée manuellement (`seed.ts`)** — aucune UI d'inscription au MVP.

---

## 6. Fonctionnalités détaillées — MVP

### 6.1 Endpoint SDK : vérification du statut d'abonnement

**Description** : c'est le seul point de contact entre `kola-web` et l'app mobile de l'éditeur. Répond en une requête à la question centrale du produit.

**Route** : `GET /api/v1/subscriptions/status`

**Paramètres (query string)**

| Paramètre | Description |
|---|---|
| `cle` | Clé API publique du tenant (`Tenant.cleApiPublique`) |
| `identifiantExterne` | Numéro de téléphone (E.164) de l'utilisateur final côté app cliente |
| `offre` | Slug de l'offre (ex : `premium`) |

**Réponse (200)**

```json
{
  "actif": true,
  "statut": "ACTIF",
  "dateEcheance": "2026-08-18T00:00:00.000Z",
  "token": "eyJhbGciOi..."   // JWT signé RS256, durée de vie 72h, à mettre en cache local par le SDK
}
```

**Comportement**

1. Résout le `Tenant` via `cle`. Si invalide → 401.
2. Cherche ou crée l'`Abonne` correspondant à `identifiantExterne` pour ce tenant (création automatique au premier appel — pas de flux d'inscription séparé). C'est aussi cette recherche qui permet la **restauration d'accès après réinstallation** (cf. §7) : un utilisateur qui resaisit son numéro retombe sur le même `Abonne`.
3. Cherche l'`Abonnement` actif le plus récent pour cette offre.
4. `actif = true` si `statut` est `ACTIF` ou `TOLERANCE` (l'accès reste ouvert en tolérance, cf. §6.3).
5. Génère un JWT **signé en RS256** (clé privée jamais exposée, cf. §8) — payload minimal : `identifiantExterne`, `offreSlug`, `tenantId`, `actif`, `dateEcheance`, `iat`, `exp = iat + 72h`. C'est ce token que le SDK garde en cache pour répondre localement en cas de coupure réseau, en le vérifiant avec la clé publique embarquée dans le package.

**Cas d'usage couverts** :
- *US-01* — En tant qu'éditeur, je veux appeler une seule fonction pour savoir si mon utilisateur a un accès premium actif, afin de ne rien construire moi-même côté logique d'abonnement.
- *US-02* — En tant qu'utilisateur final hors ligne, je veux garder mon accès premium acquis (jusqu'à 72h), afin de ne pas être pénalisé par une coupure réseau indépendante de ma volonté.

---

### 6.2 Page et endpoint de paiement

**Description** : page web publique, hébergée hors de l'app mobile. L'abonné final y arrive via un lien (WhatsApp), saisit son numéro Mobile Money, valide sur son téléphone.

**Page publique** : `GET /pay/[lienPaiement]` (Next.js Server Component)
- Résout l'`Abonnement` via `lienPaiement` (posséder le lien fait foi — aucun login nécessaire, cf. §7).
- Affiche : nom de l'offre, prix, formulaire (numéro pré-rempli si connu, choix MTN MoMo / Orange Money).
- Bouton "Payer" → appelle `POST /api/pay/initiate`.

**Route** : `POST /api/pay/initiate`

**Payload**
```json
{ "lienPaiement": "clx1a2b3...", "telephone": "+237671960300", "operateur": "mtn" }
```

**Comportement**
1. Résout l'`Abonnement` via `lienPaiement`.
2. Appelle l'API Campay (`lib/campay.ts`) pour initier une demande de paiement (mode sandbox `demo.campay.net` en développement, montants ≤ 100 FCFA).
3. Crée une `Transaction` en statut `EN_ATTENTE` avec le `providerTransactionId` retourné par Campay.
4. Répond au frontend avec un statut "en attente de confirmation sur le téléphone".

**Cas d'usage couverts** :
- *US-04* — En tant qu'abonné final, je veux payer mon abonnement en 2 taps sur mon téléphone, afin de renouveler rapidement sans quitter WhatsApp.
- *US-05* — En tant qu'éditeur, je veux que le lien de paiement soit déjà pré-rempli avec le numéro de mon abonné, afin de réduire la friction de renouvellement.
- *US-06* — En tant qu'éditeur, je veux tester l'intégralité du parcours de paiement avec de l'argent fictif, afin de valider mon intégration avant la mise en production.

---

### 6.3 Webhook Campay et moteur (state machine)

**Description** : c'est le cœur du produit — la réception des paiements en temps réel, et l'avancement quotidien de chaque abonnement dans le temps.

#### 6.3.1 Webhook — réception d'un paiement

**Route** : `POST /api/webhooks/campay`

1. Vérifie la signature/l'authenticité de la requête (mécanisme fourni par Campay).
2. Recherche la `Transaction` via `providerTransactionId` reçu dans le payload.
   - **Si elle n'existe pas déjà en statut `REUSSIE`** → traite normalement (étape 3).
   - **Si elle existe déjà en statut `REUSSIE`** → **ignore silencieusement** (réponse 200 sans effet de bord). Protection anti-double-webhook.
3. Marque la `Transaction` en `REUSSIE`, `traiteLe = now()`.
4. Recalcule la nouvelle `dateEcheance` de l'`Abonnement` :
   - Si `dateEcheance` actuelle est dans le futur (paiement anticipé) → `nouvelle = dateEcheance_actuelle + periodiciteJours`
   - Sinon (paiement en retard ou premier paiement) → `nouvelle = now() + periodiciteJours`
5. Passe `Abonnement.statut = ACTIF`.

#### 6.3.2 Cron quotidien — avancement des états

**Route** : `GET /api/cron/avancer-abonnements` (appelée par Vercel Cron, protégée par `Authorization: Bearer $CRON_SECRET`)

**Configuration `vercel.json`**
```json
{
  "crons": [
    { "path": "/api/cron/avancer-abonnements", "schedule": "0 3 * * *" }
  ]
}
```

**Logique (`lib/stateMachine.ts`)** — pour chaque `Abonnement` dont `statut != EXPIRE` :

| Condition | Action |
|---|---|
| `statut = ACTIF` ET `dateEcheance - now() = 3 jours` | Enregistrer un `LogRelance` type `J_MOINS_3` |
| `statut = ACTIF` ET `now() >= dateEcheance` | Passer en `TOLERANCE` |
| `statut = TOLERANCE` ET `now() >= dateEcheance + toleranceJours` | Passer en `COUPE` |
| `statut = COUPE` ET `now() >= dateEcheance + toleranceJours + 7 jours` ET pas déjà de `LogRelance` type `J_PLUS_7` | Enregistrer un `LogRelance` type `J_PLUS_7` |
| `statut = COUPE` ET `now() >= dateEcheance + toleranceJours + 14 jours` | Passer en `EXPIRE` |

**Réconciliation active** : en complément, le cron interroge l'API Campay pour tout `Transaction` en statut `EN_ATTENTE` depuis plus de 15 minutes, afin de rattraper les cas où le webhook n'est jamais arrivé.

**Cas d'usage couverts** :
- *US-07* — En tant qu'éditeur, je veux que mes abonnés qui paient en retard ne soient pas lésés par un calcul de date erroné, afin de ne pas perdre leur confiance.
- *US-08* — En tant qu'éditeur, je veux qu'un double envoi de webhook ne crédite jamais deux fois mon abonné, afin de ne pas perdre d'argent silencieusement.
- *US-09* — En tant qu'éditeur, je veux que Kola vérifie activement les paiements même si la notification n'arrive pas, afin qu'un abonné qui a payé ne soit jamais coupé par erreur.
- *US-10* — En tant qu'abonné final en tolérance, je veux garder mon accès, afin d'avoir le temps de renouveler sans stress.

---

### 6.4 Relances

**Description** : messages envoyés à l'abonné aux moments clés du cycle de vie.

| Moment | Canal (MVP) | Contenu |
|---|---|---|
| J-3 avant échéance | WhatsApp (envoi manuel au MVP) | "Ton accès expire dans 3 jours. [lien pré-rempli]" |
| J+7 après coupure | WhatsApp (envoi manuel au MVP) | Dernière relance avant expiration définitive |

**MVP** : les relances sont **déclenchées par le cron mais envoyées manuellement par l'éditeur** — chaque ligne "à relancer" dans le dashboard affiche un bouton **"Copier le message"** :
```
Salut ! Ton accès [nom offre] expire dans 3 jours.
Renouvelle ici : https://kola.app/pay/clx1a2b3...
```
**V1** : envoi automatique via API WhatsApp Business ou équivalent.

**Cas d'usage couverts** :
- *US-11* — En tant qu'éditeur (MVP), je veux voir chaque matin la liste des abonnés à relancer avec le message prêt, afin de gagner du temps sans automatisation complète.

---

### 6.5 Dashboard

**Description** : interface web protégée pour l'éditeur.

**Authentification** : **Better Auth** (adaptateur Prisma), email/mot de passe, un seul compte au MVP. Ce choix — plutôt qu'un cookie de session fait maison — n'est pas qu'une question de confort : Better Auth inclut un plugin **"organizations"** conçu pour le pattern SaaS multi-tenant, qui se mappe directement sur le modèle `Tenant`. En V1, le passage au multi-tenant consiste à activer ce plugin, pas à réécrire le système d'authentification.

**Pages**

| Route | Contenu |
|---|---|
| `/dashboard` | Compteurs : actifs · à relancer (J-3) · en tolérance · coupés · expirés |
| `/dashboard/abonnes` | Tableau des abonnés : identifiant, statut, date d'échéance, dernier paiement. Filtrable par statut. |

**Route API associée** : `GET /api/admin/abonnes` (protégée par la session Better Auth), retourne la liste avec statut calculé.

**Cas d'usage couverts** :
- *US-13* — En tant qu'éditeur, je veux voir en un coup d'œil combien d'abonnés actifs je compte, afin de suivre mon revenu récurrent pour la première fois.

---

### 6.6 Parcours utilisateur final (UX mobile ↔ web)

**Principe directeur** : rien qui ressemble à un acte d'achat ne doit exister à l'intérieur de l'app mobile (conformité Google Play). Toute la conversion se passe hors app, sur WhatsApp puis sur la page de paiement web.

**Étape 1 — Inscription dans l'app**
L'app capture le **numéro de téléphone** de l'utilisateur (donnée de profil classique, aucun lien visible avec un paiement à ce stade). Ce numéro devient `Abonne.identifiantExterne`.

**Étape 2 — Écran de paywall**
Quand l'utilisateur atteint une fonctionnalité verrouillée, l'écran reste neutre et informatif :
- Autorisé : cadenas, badge "Premium", description des fonctionnalités débloquées.
- Interdit à tout jamais : prix affiché, bouton "Payer"/"S'abonner", lien cliquable vers la page de paiement Kola.

**Étape 3 — Déclenchement de la relance**
Dès que l'utilisateur touche un mur premium pour la première fois (ou selon le calendrier §6.4), le **serveur** (pas l'app) envoie un message WhatsApp contenant le lien `/pay/[lienPaiement]` — canal entièrement extérieur à l'app.

**Étape 4 — Paiement**
L'utilisateur clique le lien, arrive sur la page de paiement web, paie (cf. §6.2). Le lien étant permanent et unique par `Abonnement`, le serveur retrouve l'`Abonnement` par simple correspondance sur `lienPaiement` — **aucun système de login web n'est nécessaire** : posséder le lien fait foi, exactement comme un lien de réinitialisation de mot de passe par email.

**Étape 5 — Retour dans l'app**
Un seul bouton autorisé dans l'app en lien avec le paiement : **"Vérifier mon accès"**, qui appelle `Kola.refresh()`. Ce n'est pas un acte d'achat, c'est une actualisation de statut.

**Étape 6 — Restauration après désinstallation/réinstallation**
Comme `identifiantExterne` est le numéro de téléphone (stable, indépendant de l'appareil), un utilisateur qui réinstalle ne perd pas son accès : un écran **"Déjà abonné ? Entrez votre numéro"** dans l'app appelle `isActive('premium', identifiantExterne: numéroSaisi)`. Kola retrouve le même `Abonne` et restaure l'accès immédiatement.

> **Décision de sécurité MVP** : aucune vérification du numéro saisi (pas d'OTP/SMS). Quiconque connaît un numéro peut interroger son statut d'abonnement — risque jugé acceptable au MVP (aucun accès ne peut être volé, seulement consulté). À réévaluer en V1.

**Ce que l'utilisateur ne voit jamais dans l'app** : compte à rebours d'abonnement, rappel de facturation, notification "ton abonnement expire" — tout ce qui touche à l'échéance vit exclusivement sur WhatsApp.

---

## 7. Spécifications techniques

| Composant | Choix |
|---|---|
| Frontend + API + page de paiement | Next.js (App Router), un seul projet |
| ORM | Prisma |
| Base de données | PostgreSQL hébergé sur Neon |
| Tâche planifiée | Vercel Cron (quotidien), pas de queue/worker séparé au MVP |
| Provider de paiement (MVP) | Campay — sandbox `demo.campay.net`, puis production |
| Authentification SDK ↔ API | Clé API publique par tenant + JWT **RS256** (clé privée serveur, clé publique embarquée dans le SDK) |
| Authentification dashboard | Better Auth (adaptateur Prisma), email/mot de passe au MVP, plugin "organizations" activé en V1 |
| Hébergement | Vercel (dashboard, API, cron via `vercel.json`) |

---

## 8. Exigences non fonctionnelles

- **Sécurité** : Kola ne stocke jamais de données bancaires — uniquement le numéro de téléphone transmis au provider. `campayAppSecret` chiffré au repos (AES-256-GCM, clé applicative en variable d'environnement Vercel).
- **Signature JWT en RS256, jamais HS256** : une clé symétrique embarquée dans le SDK Flutter serait extractible par rétro-ingénierie et permettrait de forger des accès premium gratuits sur toutes les apps Kola.
- **Idempotence webhook** : garantie par la contrainte `@unique` sur `providerTransactionId`, pas seulement par une vérification applicative.
- **Protection du cron** : rejette toute requête sans le header secret `CRON_SECRET`.
- **Protection du webhook** : vérification de l'origine/signature Campay avant tout traitement.
- **Disponibilité offline (SDK)** : fonctionne en cache jusqu'à 72h sans réseau ; le JWT ne contient aucune donnée sensible puisqu'il est stocké en clair sur l'appareil de l'utilisateur final.
- **Non-custodial** : Kola ne détient jamais les fonds ; l'argent va directement du client final au compte Campay/MeSomb de l'éditeur.
- **Portabilité** : export des données abonnés possible à tout moment (CSV, V1), sans dépendance à Kola pour y accéder.

---

## 9. Plan de test du MVP (scénarios à valider avant mise en production)

1. **Paiement sandbox → activation** : payer via `demo.campay.net` (≤ 100 FCFA), vérifier que le webhook active l'abonnement avec la bonne `dateEcheance`.
2. **Double webhook** : rejouer manuellement le même payload deux fois → un seul `ACTIF` enregistré, pas de doublon de date.
3. **Paiement en avance** : simuler un paiement 3 jours avant `dateEcheance` → `nouvelle_echeance = ancienne + periodiciteJours`.
4. **Paiement en retard** : simuler un paiement après passage en `COUPE` → `nouvelle_echeance = now() + periodiciteJours` (pas de reprise de l'ancienne date).
5. **Cycle complet sans paiement** : vérifier la séquence `ACTIF → TOLERANCE → COUPE → (relance J+7) → EXPIRE`.
6. **SDK hors ligne** : couper le réseau après un premier appel réussi → `isActive()` retourne `true` tant que le JWT n'a pas dépassé 72h.
7. **Cron idempotent** : exécuter la route cron deux fois de suite le même jour → aucun état n'avance deux fois, aucune relance dupliquée.
8. **Restauration après réinstallation** : simuler une désinstallation (vider le cache local), resaisir le numéro de téléphone → l'accès est restauré via `isActive()`.

---

## 10. Hors périmètre (à tout horizon, par principe)

- Kola ne devient jamais une banque, ne détient jamais de fonds.
- Le SDK ne propose jamais d'ouverture de page de paiement ou de bouton d'achat dans l'app (conformité Google Play).
- Pas d'essais gratuits, coupons, ou plans annuels au MVP/V1.
- Pas de support iOS au lancement.
- Pas de vérification par OTP au MVP (cf. §6.6).

---

## 11. Versions suivantes (listées, non détaillées)

### V1 — multi-tenant, produit vendable
- Inscription éditeur (Better Auth + plugin "organizations", plus de compte unique)
- Connexion des propres clés Campay/MeSomb par chaque tenant (chiffrement par tenant)
- Plusieurs offres par app configurables depuis le dashboard (déjà supporté par le schéma, à exposer en UI)
- Automatisation complète des relances (WhatsApp Business API ou équivalent)
- Compteur "encaissé ce mois" sur le dashboard
- Export CSV des abonnés
- Kola facture ses propres clients via Kola (dogfooding)

### V2 — robustesse et différenciation
- Multi-devise / autres pays (Sénégal, Gabon...)
- Templates de relance personnalisables
- Webhooks sortants (Kola notifie l'app cliente en temps réel)
- Rôles multi-utilisateurs sur le dashboard
- API publique documentée (au-delà du SDK Flutter)
- Historique des transactions + reçus
- Métriques de pilotage (taux de conversion des relances, churn)

### V3 — extensions
- Essais gratuits, coupons, plans annuels
- SDK natif Android/iOS
- Marketplace / mise en relation entre développeurs clients
- White-label du dashboard

---

## 12. Critères d'acceptation du MVP

Le MVP est considéré fonctionnel quand :

1. L'app de l'auteur, en test fermé, appelle `Kola.isActive('premium')` et reçoit une réponse correcte.
2. Un paiement test en sandbox Campay déclenche le passage de l'abonnement à `ACTIF` avec la bonne date d'échéance.
3. Un webhook envoyé deux fois ne crédite l'abonnement qu'une seule fois.
4. Un abonnement arrivé à échéance passe automatiquement en tolérance puis en coupure selon le calendrier défini.
5. Le dashboard affiche la liste des abonnés avec leur statut réel, derrière une authentification Better Auth fonctionnelle.
6. Le SDK renvoie un accès valide même sans réseau, pendant la durée de vie du token en cache.
7. Un utilisateur peut restaurer son accès après réinstallation en resaisissant son numéro de téléphone.

---

## 13. Ordre d'implémentation suggéré

1. `npx create-next-app` (`kola-web`) + configuration Prisma + connexion Neon
2. Écrire le schéma Prisma (§5), migrer, écrire le `seed.ts` (un `Tenant`, une `App`, une `Offre`)
3. Créer un compte sandbox Campay, écrire `lib/campay.ts`
4. Route `/api/pay/initiate` + page `/pay/[lienPaiement]` (flux testable en sandbox dès cette étape)
5. Route `/api/webhooks/campay` + tests des scénarios 1 et 2 (§9)
6. `lib/stateMachine.ts` + route `/api/cron/avancer-abonnements` + tests des scénarios 3, 4, 5, 7
7. Route `/api/v1/subscriptions/status` + `lib/jwt.ts` (signature RS256)
8. Package `kola_sdk` (Flutter) — cf. cahier des charges séparé — + test du scénario 6
9. Dashboard (`/dashboard`, `/dashboard/abonnes`) + Better Auth
10. Écran de restauration côté app + test du scénario 8
11. Intégration complète sur l'app en test fermé, cycle de vie réel sur quelques testeurs
