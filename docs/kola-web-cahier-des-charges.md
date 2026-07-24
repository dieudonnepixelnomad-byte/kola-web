# Kola — Cahier des charges technique · `kola-web` (version SaaS complète)

> Porteur : Gwet Bikoun Dieudonné, Douala · Réécriture « produit fini »
> Cette version décrit Kola comme un **SaaS multi-tenant complet**, pas comme le MVP mono-tenant.
> Kola facture ses propres clients **via Kola** : l'auteur est le premier tenant, mais le code ne le sait pas — il est un tenant comme un autre.
> **Stack : Next.js (App Router) full-stack + Prisma + PostgreSQL (Neon) + abstraction multi-prestataire (Campay, MeSomb, PayDunya, Flutterwave) + SDK Flutter séparé (`kola_sdk`).**

---

## 1. Problème, promesse, périmètre

Kola répond à une seule question, de façon fiable, pour n'importe quelle app mobile de n'importe quel éditeur :

> **« Cet utilisateur a-t-il un abonnement actif à cette offre ? »**

Sans jamais détenir l'argent de l'éditeur (non-custodial), sans jamais agir à l'intérieur de l'app mobile côté paiement (conformité Google Play : app en consommation seule, paiement strictement hors app).

Ce qui change par rapport au MVP :

| Axe | MVP | SaaS (ce document) |
|---|---|---|
| Tenants | 1, codé en dur (`seed.ts`) | N, inscription libre en self-service |
| Utilisateurs par tenant | 1 (mot de passe unique) | N, avec rôles (propriétaire / admin / lecture) |
| Prestataire de paiement | Campay uniquement | Campay, MeSomb, PayDunya, Flutterwave — au choix du tenant, plusieurs configs possibles |
| Apps par tenant | 1 | N |
| Offres par app | 1 (schéma en supportait N) | N, gérées en UI |
| Relances | Manuelles (bouton « copier ») | Automatiques (WhatsApp Cloud API, SMS, email) + templates éditables |
| Dashboard | Compteurs bruts | Métriques (MRR, churn, encaissé, taux de conversion des relances), export CSV, historique |
| Facturation de Kola | Hors périmètre | **Dogfooding** : chaque tenant est un abonné de Kola, géré par le moteur Kola |
| API externe | SDK Flutter seul | SDK + **API REST publique** signée (server-to-server) + **webhooks sortants** |

Principe non négociable inchangé : **le SDK et l'app mobile ne contiennent aucun acte d'achat.** Toute la conversion vit hors app (WhatsApp → page de paiement web).

---

## 2. Modèle SaaS et tarification

### 2.1 Entités du modèle

- **Tenant** — le compte d'un éditeur (une entreprise / un développeur). Unité de facturation et d'isolation des données.
- **Utilisateur** — une personne qui se connecte. Appartient à un tenant, porte un rôle.
- **App** — une application mobile publiée par le tenant. Porte les clés API consommées par le SDK.
- **Offre** — un plan payant d'une app (`premium`, `premium_plus`…), avec prix, périodicité, tolérance.
- **ConfigurationPaiement** — un couple (prestataire, identifiants chiffrés) appartenant au tenant. Une offre pointe vers une config (ou hérite de la config par défaut du tenant).

### 2.2 Tarification de Kola (dogfooding, sans commission)

L'ADN commercial reste : **forfait, jamais de pourcentage** (« je ne touche pas ton argent, donc je n'ai rien à prélever dessus »). Kola se facture par **paliers d'abonnés actifs**, pas par chiffre d'affaires du tenant :

| Palier | Abonnés actifs | Prix mensuel |
|---|---|---|
| Découverte | 0 – 50 | **Gratuit** |
| Standard | 51 – 500 | **25 000 FCFA** |
| Croissance | 501 – 2 000 | **60 000 FCFA** |
| Échelle | 2 001+ | **120 000 FCFA** |

> **Décision à confirmer (business, pas technique).** Le palier gratuit sert d'aimant d'acquisition : l'éditeur intègre, teste, encaisse ses premiers abonnés sans rien payer, puis bascule payant quand Kola lui a déjà rapporté. Le comptage se fait sur le pic d'abonnés `ACTIF`/`TOLERANCE` du mois. Aucune règle ne dépend du montant encaissé par le tenant : le forfait est neutre vis-à-vis de son CA.

Mécaniquement, ce forfait **est lui-même un `Abonnement` Kola** (cf. §8, dogfooding).

---

## 3. Architecture globale

### 3.1 Dépôts

| Projet | Contenu | Déploiement |
|---|---|---|
| **`kola-web`** | Dashboard + Auth + API SDK + API publique REST + webhooks entrants/sortants + cron + page de paiement | Vercel |
| **`kola_sdk`** | Package Flutter/Dart (voir cahier dédié) | Repo Git séparé, publié sur pub.dev en V1 |

### 3.2 Schéma de flux

```
┌───────────────┐   isActive()   ┌──────────────────────────┐
│  App Flutter   │ ─────────────▶ │  /api/v1/subscriptions/…  │
│  (kola_sdk)     │ ◀───────────── │  (clé publique de l'App)  │
└───────────────┘  {actif, JWT}   └────────────┬─────────────┘
                                                │
        ┌──────────────────────────────────────┼───────────────────────────┐
        ▼                                        ▼                           ▼
┌───────────────┐            ┌──────────────────────────┐        ┌────────────────────┐
│ Cron quotidien │            │  Webhooks entrants          │        │  Dashboard (Next.js)│
│ /api/cron/…    │            │  /api/webhooks/[prestataire]│        │  Auth multi-user     │
│ (avance états, │            │  (Campay|MeSomb|PayDunya|…) │        │  Métriques, export   │
│  réconcilie,   │            └────────────┬─────────────┘        └─────────┬──────────┘
│  déclenche     │                         │                                │
│  relances)     │                         ▼                                ▼
└───────┬───────┘                 ┌───────────────┐              ┌──────────────────┐
        │                          │  PostgreSQL     │◀────────────│  API publique REST │
        ▼                          │  (Neon, Prisma) │              │  /api/public/v1/…  │
┌───────────────┐                 └───────┬───────┘              └──────────────────┘
│ Canaux relance │                         │
│ WhatsApp/SMS/  │                         ▼
│ email          │                 ┌────────────────────┐   paiement   ┌──────────────┐
└───────────────┘                 │  Abstraction paiement│◀─────────────│ Page /pay/[…] │
                                    │  (adapter par presta) │              │ (publique)     │
                                    └──────────┬──────────┘              └──────┬───────┘
                                               ▼                                 ▲
                                    ┌────────────────────┐                       │
                                    │ Campay / MeSomb /    │                       │
                                    │ PayDunya / Flutterwave│──── prompt USSD ─────┘
                                    └────────────────────┘        (abonné final)
```

### 3.3 Arborescence `kola-web`

```
kola-web/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                        # crée le tenant système "Kola" + son offre plateforme
├── app/
│   ├── (marketing)/                   # landing publique
│   │   └── page.tsx
│   ├── (auth)/
│   │   ├── inscription/page.tsx
│   │   ├── connexion/page.tsx
│   │   ├── mot-de-passe-oublie/page.tsx
│   │   └── invitation/[token]/page.tsx
│   ├── dashboard/                     # protégé (session), scoping tenant systématique
│   │   ├── layout.tsx                 # garde d'auth + résolution du tenant courant
│   │   ├── page.tsx                   # vue d'ensemble : MRR, encaissé, à relancer…
│   │   ├── apps/
│   │   │   ├── page.tsx
│   │   │   └── [appId]/
│   │   │       ├── page.tsx           # offres + clés API + intégration SDK
│   │   │       └── offres/[offreId]/page.tsx
│   │   ├── abonnes/page.tsx           # liste filtrable + recherche + export
│   │   ├── paiements/page.tsx         # historique des transactions
│   │   ├── relances/page.tsx          # templates + journal des envois
│   │   ├── parametres/
│   │   │   ├── prestataires/page.tsx  # configs de paiement (Campay, MeSomb…)
│   │   │   ├── equipe/page.tsx        # membres + rôles + invitations
│   │   │   ├── facturation/page.tsx   # abonnement Kola du tenant (dogfooding)
│   │   │   └── webhooks/page.tsx      # webhooks sortants
│   │   └── ...
│   ├── pay/
│   │   └── [lienPaiement]/page.tsx    # page de paiement publique (Server Component)
│   └── api/
│       ├── v1/
│       │   └── subscriptions/status/route.ts     # consommé par le SDK Flutter
│       ├── public/v1/                            # API REST server-to-server (clé secrète)
│       │   ├── subscribers/route.ts
│       │   ├── subscriptions/route.ts
│       │   └── offers/route.ts
│       ├── webhooks/
│       │   ├── campay/route.ts
│       │   ├── mesomb/route.ts
│       │   ├── paydunya/route.ts
│       │   └── flutterwave/route.ts
│       ├── cron/
│       │   └── avancer-abonnements/route.ts
│       ├── pay/
│       │   ├── initiate/route.ts
│       │   └── status/route.ts                   # polling léger de la page de paiement
│       ├── auth/                                  # inscription, connexion, sessions
│       └── admin/                                 # routes internes du dashboard
├── lib/
│   ├── prisma.ts
│   ├── auth/                          # sessions, hash argon2, garde de rôle
│   ├── tenant.ts                      # résolution + isolation du tenant courant
│   ├── crypto.ts                      # AES-256-GCM pour secrets prestataires
│   ├── jwt.ts                         # signature RS256 des tokens SDK
│   ├── paiement/                      # ABSTRACTION PRESTATAIRE (cœur du SaaS)
│   │   ├── types.ts                   # interface PrestatairePaiement
│   │   ├── factory.ts                 # getPrestataire(config)
│   │   ├── campay.ts
│   │   ├── mesomb.ts
│   │   ├── paydunya.ts
│   │   └── flutterwave.ts
│   ├── relances/                      # WhatsApp Cloud API, SMS, email + templating
│   │   ├── types.ts
│   │   ├── whatsapp.ts
│   │   ├── sms.ts
│   │   ├── email.ts
│   │   └── template.ts
│   ├── stateMachine.ts               # transitions d'état des abonnements
│   ├── metriques.ts                  # MRR, churn, encaissé, conversion relances
│   └── webhooksSortants.ts           # signature HMAC + livraison + retry
├── vercel.json                       # crons
└── .env
```

**Discipline (rappel CLAUDE.md)** : les pages `app/dashboard/**` ne lisent jamais la base directement — elles passent par `app/api/admin/**`. Cela garde la porte ouverte à une extraction ultérieure de l'API vers un backend séparé (Laravel) sans toucher au dashboard.

---

## 4. Schéma de données (Prisma) — SaaS complet

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ─────────────────────────── Comptes & identités ───────────────────────────

model Tenant {
  id                String   @id @default(cuid())
  nom               String
  slug              String   @unique              // sous-domaine / URL de paiement
  estSysteme        Boolean  @default(false)      // true uniquement pour le tenant "Kola"

  // Dogfooding : statut de l'abonnement du tenant À Kola (dénormalisé, source
  // de vérité = un Abonnement dans le tenant système). Sert à suspendre l'accès.
  statutPlateforme  StatutAbonnement @default(ACTIF)

  utilisateurs      Utilisateur[]
  invitations       Invitation[]
  apps              App[]
  configurations    ConfigurationPaiement[]
  modelesRelance    ModeleRelance[]
  webhooksSortants  WebhookSortant[]
  journalAudit      JournalAudit[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum RoleUtilisateur {
  PROPRIETAIRE   // tout, y compris facturation et suppression du tenant
  ADMIN          // tout sauf facturation/suppression
  LECTURE        // consultation seule (dashboard en read-only)
}

model Utilisateur {
  id             String   @id @default(cuid())
  tenantId       String
  tenant         Tenant   @relation(fields: [tenantId], references: [id])
  email          String   @unique
  motDePasseHash String                              // argon2id
  nom            String
  role           RoleUtilisateur @default(PROPRIETAIRE)
  emailVerifieLe DateTime?

  sessions       Session[]

  createdAt      DateTime @default(now())

  @@index([tenantId])
}

model Session {
  id            String   @id @default(cuid())
  utilisateurId String
  utilisateur   Utilisateur @relation(fields: [utilisateurId], references: [id])
  tokenHash     String   @unique                    // le cookie contient le token en clair, la base son hash
  expiresAt     DateTime
  createdAt     DateTime @default(now())
}

model Invitation {
  id         String   @id @default(cuid())
  tenantId   String
  tenant     Tenant   @relation(fields: [tenantId], references: [id])
  email      String
  role       RoleUtilisateur @default(LECTURE)
  token      String   @unique @default(cuid())
  accepteeLe DateTime?
  expireLe   DateTime
  createdAt  DateTime @default(now())

  @@unique([tenantId, email])
}

// ─────────────────────────── Apps & offres ───────────────────────────

model App {
  id             String   @id @default(cuid())
  tenantId       String
  tenant         Tenant   @relation(fields: [tenantId], references: [id])
  nom            String
  plateforme     String   @default("android")       // android | ios (quand levé)

  // Clé publique : consommée par le SDK Flutter (init). Publiable, non secrète.
  cleApiPublique String   @unique @default(cuid())
  // Clé secrète : server-to-server (API publique REST). Stockée hashée.
  cleApiSecreteHash String @unique
  cleApiSecreteIndice String                         // 6 derniers caractères, pour l'affichage "sk_…a3f9"

  offres         Offre[]

  createdAt      DateTime @default(now())

  @@index([tenantId])
}

model Offre {
  id                 String   @id @default(cuid())
  appId              String
  app                App      @relation(fields: [appId], references: [id])
  nom                String
  slug               String                          // isActive('premium')
  prix               Int                             // FCFA entier, pas de centimes
  devise             String   @default("XAF")
  periodiciteJours   Int      @default(30)
  toleranceJours     Int      @default(3)
  actif              Boolean  @default(true)

  // Prestataire utilisé pour encaisser cette offre. Null → config par défaut du tenant.
  configurationId    String?
  configuration      ConfigurationPaiement? @relation(fields: [configurationId], references: [id])

  abonnements        Abonnement[]

  createdAt          DateTime @default(now())

  @@unique([appId, slug])
}

// ─────────────────────────── Prestataires de paiement ───────────────────────────

enum PrestataireType {
  CAMPAY
  MESOMB
  PAYDUNYA
  FLUTTERWAVE
}

model ConfigurationPaiement {
  id            String          @id @default(cuid())
  tenantId      String
  tenant        Tenant          @relation(fields: [tenantId], references: [id])
  prestataire   PrestataireType
  nom           String                              // libellé libre : "Campay - compte principal"

  // Identifiants chiffrés (AES-256-GCM) — forme variable selon le prestataire :
  //  Campay      : { appId, appSecret }
  //  MeSomb      : { applicationKey, accessKey, secretKey }
  //  PayDunya    : { masterKey, privateKey, token }
  //  Flutterwave : { secretKey, encryptionKey }
  identifiantsChiffres String                       // JSON chiffré, jamais en clair en base
  identifiantsIv       String                       // IV du chiffrement
  identifiantsTag      String                       // tag d'authentification GCM

  actif         Boolean         @default(true)
  parDefaut     Boolean         @default(false)     // au plus une config parDefaut par tenant (garde applicative)
  verifieLe     DateTime?                            // dernière validation réussie (ping sandbox/prod)

  offres        Offre[]

  createdAt     DateTime        @default(now())

  @@index([tenantId])
}

// ─────────────────────────── Abonnés & abonnements ───────────────────────────

model Abonne {
  id                 String   @id @default(cuid())
  tenantId           String
  // DÉCISION conservée : identifiant = téléphone normalisé E.164 (stable, sert de canal de relance).
  identifiantExterne String
  telephone          String?
  email              String?
  nom                String?

  abonnements        Abonnement[]

  createdAt          DateTime @default(now())

  @@unique([tenantId, identifiantExterne])
  @@index([tenantId])
}

enum StatutAbonnement {
  ACTIF
  TOLERANCE
  COUPE
  EXPIRE
}

model Abonnement {
  id             String           @id @default(cuid())
  abonneId       String
  abonne         Abonne           @relation(fields: [abonneId], references: [id])
  offreId        String
  offre          Offre            @relation(fields: [offreId], references: [id])

  statut         StatutAbonnement @default(COUPE)
  dateEcheance   DateTime?
  dateActivation DateTime?

  lienPaiement   String   @unique @default(cuid())   // DÉCISION conservée : lien permanent, réutilisé à chaque cycle

  transactions   Transaction[]
  logsRelance    LogRelance[]

  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  @@index([statut, dateEcheance])
  @@index([abonneId])
}

enum StatutTransaction {
  EN_ATTENTE
  REUSSIE
  ECHOUEE
}

model Transaction {
  id                    String            @id @default(cuid())
  abonnementId          String
  abonnement            Abonnement        @relation(fields: [abonnementId], references: [id])

  // Notre référence interne, envoyée au prestataire et ré-émise dans son webhook.
  // Sert à retrouver la transaction ET le tenant AVANT vérification de signature.
  reference             String            @unique @default(cuid())

  provider              PrestataireType
  providerTransactionId String?           // renseigné quand le prestataire le renvoie
  montant               Int
  statut                StatutTransaction @default(EN_ATTENTE)

  recuLe                DateTime          @default(now())
  traiteLe              DateTime?
  payloadBrut           Json?

  // Idempotence : un providerTransactionId ne peut activer qu'une fois.
  @@unique([provider, providerTransactionId])
  @@index([statut, recuLe])
}

// ─────────────────────────── Relances ───────────────────────────

enum TypeRelance {
  J_MOINS_3
  J_ECHEANCE
  J_PLUS_7
}

enum CanalRelance {
  WHATSAPP
  SMS
  EMAIL
}

model ModeleRelance {
  id        String       @id @default(cuid())
  tenantId  String
  tenant    Tenant       @relation(fields: [tenantId], references: [id])
  type      TypeRelance
  canal     CanalRelance @default(WHATSAPP)
  // Contenu avec variables : {nom} {offre} {prix} {jours} {lien}
  contenu   String
  actif     Boolean      @default(true)

  createdAt DateTime     @default(now())

  @@unique([tenantId, type, canal])
}

model LogRelance {
  id           String       @id @default(cuid())
  abonnementId String
  abonnement   Abonnement   @relation(fields: [abonnementId], references: [id])
  type         TypeRelance
  canal        CanalRelance
  statutEnvoi  String       @default("ENVOYE")     // ENVOYE | ECHEC | IGNORE
  envoyeLe     DateTime     @default(now())
  erreur       String?

  @@index([abonnementId, type])
}

// ─────────────────────────── Webhooks sortants ───────────────────────────

model WebhookSortant {
  id            String   @id @default(cuid())
  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  url           String
  secret        String                              // clé de signature HMAC (chiffrée au repos)
  evenements    String[]                            // ["abonnement.active", "abonnement.coupe", …]
  actif         Boolean  @default(true)

  livraisons    LivraisonWebhook[]
  createdAt     DateTime @default(now())
}

model LivraisonWebhook {
  id               String   @id @default(cuid())
  webhookSortantId String
  webhookSortant   WebhookSortant @relation(fields: [webhookSortantId], references: [id])
  evenement        String
  payload          Json
  statutHttp       Int?
  tentatives       Int      @default(0)
  livreLe          DateTime?
  prochainEssai    DateTime?
  createdAt        DateTime @default(now())

  @@index([prochainEssai])
}

// ─────────────────────────── Audit ───────────────────────────

model JournalAudit {
  id            String   @id @default(cuid())
  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  utilisateurId String?
  action        String                              // "config.cree", "offre.modifiee", "membre.invite"…
  cible         String?                             // id de l'entité concernée
  meta          Json?
  ip            String?
  createdAt     DateTime @default(now())

  @@index([tenantId, createdAt])
}
```

**Décisions de schéma notables**

- **Isolation multi-tenant** : chaque entité racine porte `tenantId`. Toute requête serveur passe par un helper `avecTenant(tenantId)` (cf. §5.3) — aucune requête ne s'exécute sans scope tenant. C'est la défense principale contre la fuite de données entre éditeurs.
- **Idempotence renforcée** : `@@unique([provider, providerTransactionId])` sur `Transaction` (au lieu d'un simple `@unique`), parce qu'en multi-prestataire deux providers différents pourraient théoriquement émettre le même identifiant. La clé d'unicité est donc le couple.
- **`Transaction.reference`** : notre propre identifiant, généré avant l'appel au prestataire. Il voyage jusqu'au webhook et permet de retrouver le tenant **avant** de vérifier la signature (indispensable car la clé de vérification est propre au tenant).
- **Secrets prestataires** : jamais en clair. Trois colonnes (`identifiantsChiffres`, `identifiantsIv`, `identifiantsTag`) pour AES-256-GCM. La clé maîtresse vit dans l'environnement Vercel (ou un KMS en V2), jamais en base.
- **Clé API secrète de l'App** : stockée **hashée** (comme un mot de passe). On ne l'affiche qu'une fois à la création ; ensuite seul l'indice `sk_…a3f9` est montré.

---

## 5. Authentification, rôles, isolation multi-tenant

### 5.1 Inscription et sessions

- **Inscription** (`/inscription`) : email, mot de passe, nom, nom du premier tenant + première app. Crée `Tenant` + `Utilisateur(PROPRIETAIRE)` + `App`. Envoie un email de vérification.
- **Hash** : `argon2id` (paramètres mémoire/itérations raisonnables pour un serveur serverless).
- **Sessions** : cookie `httpOnly`, `Secure`, `SameSite=Lax`. Le cookie porte un token aléatoire ; la base ne stocke que son hash (`Session.tokenHash`) → révocable côté serveur, illisible même en cas de fuite de base.
- **Alternative acceptable** : Auth.js (NextAuth v5) avec adaptateur Prisma. Retenu ici : implémentation maison légère, pour garder les noms de domaine 100 % français et éviter le lock-in. À trancher au début de l'implémentation, pas après.

### 5.2 Rôles

| Rôle | Peut | Ne peut pas |
|---|---|---|
| `PROPRIETAIRE` | Tout : offres, prestataires, équipe, **facturation Kola**, suppression du tenant | — |
| `ADMIN` | Offres, prestataires, abonnés, relances, webhooks | Facturation Kola, suppression du tenant, retrait du propriétaire |
| `LECTURE` | Consulter dashboard, abonnés, métriques, export | Toute écriture |

Gardes : un helper `exigerRole(min)` protège chaque route `/api/admin/**` et chaque server action.

### 5.3 Isolation : la règle d'or

Toute lecture/écriture métier passe par un **contexte tenant résolu depuis la session** :

```typescript
// lib/tenant.ts
export async function contexteTenant() {
  const session = await lireSession();          // 401 si absente
  const utilisateur = await prisma.utilisateur.findUniqueOrThrow({
    where: { id: session.utilisateurId },
    include: { tenant: true },
  });
  return { tenantId: utilisateur.tenantId, role: utilisateur.role };
}
```

**Aucune** requête métier ne s'exécute sans `where: { tenantId }`. Revue de code : toute requête Prisma dans `app/api/admin/**` sans filtre `tenantId` est un bug de sécurité, pas un oubli mineur.

### 5.4 Invitations d'équipe

`/parametres/equipe` : le propriétaire/admin invite un email + rôle → crée une `Invitation` (token, expiration 7 j) → email avec lien `/invitation/[token]`. À l'acceptation, l'invité crée son `Utilisateur` rattaché au **même tenant**.

**Cas d'usage** : US-20 (inscription éditeur), US-21 (invitation membre), US-22 (rôles).

---

## 6. Abstraction des prestataires de paiement (cœur du SaaS)

C'est la différence structurelle avec le MVP. Le reste du système ne connaît **jamais** un prestataire concret : il parle à une interface.

### 6.1 L'interface

```typescript
// lib/paiement/types.ts

export type Operateur = "MTN" | "ORANGE";
export type StatutPaiementProvider = "EN_ATTENTE" | "REUSSIE" | "ECHOUEE";

export interface RequeteWebhook {
  headers: Record<string, string>;
  corps: unknown;        // JSON brut reçu
  corpsBrut: string;     // corps textuel exact (pour vérif de signature HMAC)
}

export interface PrestatairePaiement {
  readonly type: PrestataireType;

  /** Déclenche le prompt de paiement sur le téléphone de l'abonné. */
  initier(params: {
    montant: number;
    devise: string;
    telephone: string;        // E.164
    operateur: Operateur;
    reference: string;        // notre Transaction.reference — voyage jusqu'au webhook
    description?: string;
  }): Promise<{
    providerTransactionId: string;
    statut: StatutPaiementProvider;
  }>;

  /** Réconciliation active : interroge le prestataire sur l'état réel. */
  verifier(providerTransactionId: string): Promise<{
    statut: StatutPaiementProvider;
    montant?: number;
  }>;

  /** Vrai si le webhook est authentique (signature/HMAC/IP selon le prestataire). */
  verifierWebhook(req: RequeteWebhook, config: IdentifiantsDechiffres): Promise<boolean>;

  /** Normalise un payload hétérogène en un événement interne unique. */
  parserWebhook(req: RequeteWebhook): {
    reference: string;                 // permet de retrouver notre Transaction + tenant
    providerTransactionId: string;
    statut: StatutPaiementProvider;
    montant?: number;
  };

  /** Ping léger utilisé à la config pour valider les clés (sandbox ou prod). */
  tester(): Promise<boolean>;
}
```

### 6.2 La factory

```typescript
// lib/paiement/factory.ts
export function getPrestataire(config: ConfigurationPaiement): PrestatairePaiement {
  const ids = dechiffrer(config);   // lib/crypto.ts, AES-256-GCM
  switch (config.prestataire) {
    case "CAMPAY":      return new CampayAdapter(ids);
    case "MESOMB":      return new MesombAdapter(ids);
    case "PAYDUNYA":    return new PayDunyaAdapter(ids);
    case "FLUTTERWAVE": return new FlutterwaveAdapter(ids);
  }
}
```

### 6.3 Résolution de la config pour une offre

`configPourOffre(offre)` → `offre.configuration` si défini, sinon la `ConfigurationPaiement` `parDefaut` du tenant. Erreur explicite (et message dashboard) si aucune config n'est active — un tenant ne peut pas mettre une offre « en vente » sans prestataire branché.

### 6.4 Ce que chaque adaptateur encapsule

| Prestataire | Init | Vérif signature webhook | Particularité |
|---|---|---|---|
| **Campay** | `POST /collect` (sandbox `demo.campay.net`) | Clé partagée / token dans l'entête | Renvoie `reference` si on la passe en `external_reference` |
| **MeSomb** | SDK/HTTP `payment/collect` | Signature HMAC sur le corps | Trois clés (application/access/secret) |
| **PayDunya** | Invoice/collect API | `PAYDUNYA-*` headers + master key | Modèle « facture » à mapper sur notre `Transaction` |
| **Flutterwave** | `charges?type=mobile_money_franco` | `verif-hash` (secret hash configuré) | Support multi-pays natif (utile V2 multi-devise) |

> **Décision** : au moins **Campay + MeSomb** livrés dès la V1 (les deux du marché camerounais). PayDunya et Flutterwave suivent, mais l'interface est figée dès maintenant pour qu'ajouter un prestataire = écrire un fichier dans `lib/paiement/`, zéro impact ailleurs.

### 6.5 Routage des webhooks entrants (multi-prestataire, multi-tenant)

Chaque prestataire a sa route (`/api/webhooks/campay`, `/mesomb`, …). Séquence commune :

1. `parserWebhook(req)` → extrait notre `reference`.
2. Retrouver la `Transaction` par `reference` → en déduire l'`Abonnement`, l'`Offre`, la `ConfigurationPaiement`, donc le **tenant**.
3. Déchiffrer les identifiants du tenant → `verifierWebhook(req, ids)`. **Si faux → 401, aucun effet.**
4. Idempotence : si `Transaction` déjà `REUSSIE` → **200 sans effet** (anti-double-webhook, garanti aussi par la contrainte `@@unique`).
5. Marquer `REUSSIE`, recalculer `dateEcheance` (règle anticipé/retard, §7), passer `Abonnement` en `ACTIF`.
6. Émettre l'événement `abonnement.active` vers les **webhooks sortants** du tenant (§9).

**Cas d'usage** : US-23 (choix prestataire), US-24 (multi-config), US-07/US-08 (calcul date, idempotence, conservés).

---

## 7. Moteur d'abonnement (state machine + cron)

Inchangé dans sa logique par rapport au MVP, généralisé à N tenants.

### 7.1 Recalcul de date (webhook)

- `dateEcheance` future (paiement anticipé) → `nouvelle = dateEcheance + periodiciteJours` (on ne vole pas les jours déjà payés).
- Sinon (retard / premier paiement) → `nouvelle = now() + periodiciteJours` (on ne repart pas d'une date passée).

### 7.2 Cron quotidien `GET /api/cron/avancer-abonnements`

Protégé par `Authorization: Bearer $CRON_SECRET`. `vercel.json` :

```json
{ "crons": [
  { "path": "/api/cron/avancer-abonnements", "schedule": "0 3 * * *" },
  { "path": "/api/cron/livrer-webhooks-sortants", "schedule": "*/10 * * * *" }
]}
```

Transitions (`lib/stateMachine.ts`), pour chaque `Abonnement` de statut `!= EXPIRE`, **tous tenants confondus** :

| Condition | Action |
|---|---|
| `ACTIF` et `dateEcheance - now() ≈ 3 j` | Relance `J_MOINS_3` (envoi auto via canal du template, §8) |
| `ACTIF` et `now() >= dateEcheance` | → `TOLERANCE` (l'accès reste ouvert) |
| `TOLERANCE` et `now() >= dateEcheance + toleranceJours` | → `COUPE` |
| `COUPE` et `now() >= dateEcheance + toleranceJours + 7 j` et pas de `LogRelance J_PLUS_7` | Relance `J_PLUS_7` |
| `COUPE` et `now() >= dateEcheance + toleranceJours + 14 j` | → `EXPIRE` |

**Réconciliation active** : le même cron appelle `verifier()` (via l'adaptateur) sur toute `Transaction` `EN_ATTENTE` depuis > 15 min, pour rattraper les webhooks jamais arrivés (US-09).

**Idempotence du cron** : chaque transition vérifie un pré-état, chaque relance vérifie l'absence de `LogRelance` du même type → rejouer le cron le même jour n'a aucun effet dupliqué (US-10).

---

## 8. Relances automatisées

Le MVP relançait à la main (bouton « copier »). Le SaaS envoie tout seul — c'est là qu'est une grande part de la valeur (« ton CA = la qualité de ta relance »).

### 8.1 Canaux

| Canal | Techno | Statut |
|---|---|---|
| **WhatsApp** | WhatsApp Cloud API (Meta) — templates approuvés | Canal par défaut, le plus ouvert au Cameroun |
| **SMS** | Passerelle locale (ex. via l'agrégateur du prestataire) | Repli si pas de WhatsApp |
| **Email** | Provider transactionnel (Resend/Postmark) | Optionnel |

> **Décision** : WhatsApp par défaut car c'est le canal réellement lu. Meta impose des **templates pré-approuvés** pour les messages initiés par l'entreprise → le contenu éditable par le tenant reste dans les variables autorisées (`{nom} {offre} {prix} {jours} {lien}`), pas en texte totalement libre. À documenter dans l'onboarding.

### 8.2 Templating

`lib/relances/template.ts` remplace les variables. Exemple `J_MOINS_3` :

```
Salut {nom} 👋 Ton accès {offre} expire dans {jours} jours.
{prix} FCFA pour continuer 👉 {lien}
```

Modèles par défaut créés au `seed`/à l'inscription ; éditables dans `/dashboard/relances`.

### 8.3 Fiabilité

- Chaque envoi crée un `LogRelance` (`ENVOYE`/`ECHEC`, avec `erreur`).
- Un échec d'envoi ne bloque **jamais** la transition d'état (la coupe/tolérance se fait indépendamment de la relance).
- Anti-doublon : un `LogRelance` du même `type` empêche un second envoi dans le même cycle.

**Cas d'usage** : US-12 (relances auto), US-25 (templates éditables), US-26 (multi-canal).

---

## 9. API publique REST + webhooks sortants

### 9.1 API REST (server-to-server)

Pour les éditeurs qui veulent piloter Kola depuis **leur** backend (au-delà du SDK Flutter). Authentifiée par la **clé secrète de l'App** (`Authorization: Bearer sk_…`), jamais la clé publique.

| Route | Verbe | Usage |
|---|---|---|
| `/api/public/v1/subscribers` | GET/POST | Lister / créer un abonné |
| `/api/public/v1/subscriptions` | GET | Lister les abonnements + statut |
| `/api/public/v1/subscriptions/status` | GET | Statut d'un abonné pour une offre (équivalent serveur du SDK) |
| `/api/public/v1/offers` | GET | Lister les offres de l'app |

Rate-limit par clé (cf. §11). Toute réponse scoping strict sur l'app/tenant de la clé.

### 9.2 Webhooks sortants

Kola notifie le backend de l'éditeur en temps réel. Événements : `abonnement.active`, `abonnement.tolerance`, `abonnement.coupe`, `abonnement.expire`, `transaction.reussie`.

- Configurés dans `/dashboard/parametres/webhooks` (URL + événements souscrits).
- Signés HMAC-SHA256 (`X-Kola-Signature`) avec un secret propre au webhook → l'éditeur vérifie l'authenticité.
- Livraison via cron `livrer-webhooks-sortants` : retry avec back-off exponentiel (`LivraisonWebhook.prochainEssai`), abandon après N tentatives, journalisées.

**Cas d'usage** : US-27 (API REST), US-28 (webhooks sortants).

---

## 10. Dashboard complet

### 10.1 Vue d'ensemble `/dashboard`

Compteurs et métriques (`lib/metriques.ts`) :

- **Actifs · à relancer (J-3) · en tolérance · coupés · expirés** (par app, ou agrégé)
- **MRR** (revenu mensuel récurrent) = Σ prix des abonnements `ACTIF`/`TOLERANCE`
- **Encaissé ce mois** = Σ montants des `Transaction REUSSIE` du mois courant
- **Churn** = coupés/expirés du mois ÷ actifs début de mois
- **Taux de conversion des relances** = (abonnements repassés `ACTIF` dans les 7 j après un `LogRelance`) ÷ relances envoyées
- Graphe d'évolution des actifs et de l'encaissé sur 12 mois

### 10.2 Autres écrans

| Route | Contenu |
|---|---|
| `/dashboard/apps` + `/apps/[appId]` | Apps, offres, clés API (public/secret), **snippet d'intégration SDK prêt à copier** |
| `/dashboard/abonnes` | Table filtrable (statut, offre, app) + recherche par numéro + **export CSV** |
| `/dashboard/paiements` | Historique des transactions, filtres, statuts |
| `/dashboard/relances` | Templates par type/canal + journal des envois + taux de conversion |
| `/dashboard/parametres/prestataires` | Ajout/test/activation des configs de paiement, choix du prestataire par défaut |
| `/dashboard/parametres/equipe` | Membres, rôles, invitations |
| `/dashboard/parametres/facturation` | **Abonnement du tenant à Kola** (palier, prochaine échéance, lien de paiement) |
| `/dashboard/parametres/webhooks` | Webhooks sortants |

### 10.3 Export CSV

`GET /api/admin/abonnes/export` → CSV (identifiant, statut, offre, échéance, dernier paiement). Scoping tenant. **Garantie « portabilité »** promise sur la page de vente : « tes abonnés sont à toi, exportables en un clic ».

**Cas d'usage** : US-13 (métriques complètes), US-14 (export CSV), US-29 (snippet d'intégration).

---

## 11. Dogfooding : Kola facturé par Kola

C'est la cohérence du produit : **Kola encaisse ses propres clients avec Kola.**

- Le `seed.ts` crée un **tenant système** `Kola` (`estSysteme = true`) avec une App `Plateforme` et des offres = les **paliers** (§2.2).
- À l'inscription, chaque nouvel éditeur (tenant) est enregistré comme **`Abonne` du tenant système**, sur l'offre correspondant à son palier.
- Sa facturation passe par **exactement** la même mécanique : page `/pay/[lienPaiement]`, prestataire (celui de Kola, ex. Campay), webhook, cron, relances.
- **Suspension** : quand l'abonnement d'un éditeur à Kola passe `COUPE`, le champ dénormalisé `Tenant.statutPlateforme` bascule. Effet :
  - Dashboard en lecture seule (bandeau « facture en attente, renouvelle ici »).
  - `GET /api/v1/subscriptions/status` (SDK) continue de répondre pendant la **tolérance** (on ne casse pas la prod de l'éditeur du jour au lendemain — même logique de tolérance que n'importe quel abonné), puis renvoie un statut dégradé documenté au-delà.

> **Garde éthique cohérente avec le discours produit** : on ne coupe jamais brutalement un éditeur en production. La tolérance protège son app comme elle protège les abonnés de ses propres clients.

**Cas d'usage** : US-30 (dogfooding), US-31 (suspension progressive).

---

## 12. Exigences non fonctionnelles

- **Isolation tenant** : filtrage `tenantId` systématique (§5.3). Revue de sécurité dédiée avant chaque release majeure.
- **Chiffrement des secrets** : identifiants prestataires en AES-256-GCM ; clé maîtresse en variable d'environnement Vercel (KMS en V2). Jamais loggés, jamais renvoyés en clair par une API.
- **Idempotence** : webhooks (`@@unique provider+providerTransactionId`), cron (pré-états), livraisons sortantes (retry borné).
- **Disponibilité** : `/api/v1/subscriptions/status` est sur le chemin critique de **toutes** les apps clientes → viser une haute dispo ; le cache JWT 72 h du SDK amortit une panne temporaire (fail-safe côté client).
- **Création paresseuse de l'Abonnement** : `/api/v1/subscriptions/status` ne se contente plus de chercher l'`Abonnement` le plus récent — s'il n'existe pas, il le crée à la volée (`statut: COUPE`), via `lib/abonnement.ts::obtenirOuCreerAbonnement`, partagée avec `/api/admin/lien-paiement` (recherche/génération de lien par numéro, cf. `kola-automatisation-acces-premium-cahier-des-charges.md` §3). Ne modifie jamais un `Abonnement` existant ni ne régénère son `lienPaiement`.
- **Rate limiting** : par clé publique (endpoint SDK) et par clé secrète (API REST) — protège contre l'abus et le scraping de statut.
- **Auth** : argon2id, sessions révocables, cookies durcis, protection CSRF sur le dashboard, verrouillage après N échecs.
- **Observabilité** : logs structurés, métriques d'erreur webhook/relance, alerte si le cron échoue ou si un prestataire renvoie un taux d'échec anormal.
- **Sauvegardes** : PITR Neon ; export CSV comme filet de portabilité côté éditeur.
- **Conformité Google Play** : garantie par l'architecture (paiement 100 % hors app) — vérifiée aussi côté SDK (cf. cahier `kola_sdk`, §1).
- **Confidentialité** : payload JWT sans donnée sensible (stocké en clair sur l'appareil final) ; pas de numéro/téléphone dans les URLs (`lienPaiement` opaque) ; journal d'audit des actions sensibles.

---

## 13. User stories consolidées

**Conservées du MVP** : US-01→US-11 (statut SDK, offline, paiement, webhook, cron, relance manuelle), US-17 (restauration par numéro).

**Nouvelles (SaaS)** :

- **US-20** — En tant qu'éditeur, je m'inscris en self-service et j'obtiens mes clés API sans intervention humaine.
- **US-21 / US-22** — J'invite des coéquipiers avec des rôles (propriétaire/admin/lecture).
- **US-23** — Je choisis mon prestataire de paiement (Campay, MeSomb, PayDunya, Flutterwave) et je colle **mes** clés.
- **US-24** — Je configure plusieurs prestataires et j'en choisis un par offre (ou un par défaut).
- **US-25 / US-26** — J'édite mes messages de relance et je choisis le canal (WhatsApp/SMS/email).
- **US-27 / US-28** — Je pilote Kola depuis mon backend via API REST, et je reçois des webhooks sortants signés.
- **US-29** — Je copie un snippet d'intégration SDK pré-rempli avec mes clés.
- **US-13/14** — Je vois mes métriques (MRR, churn, encaissé, conversion) et j'exporte mes abonnés en CSV.
- **US-30 / US-31** — Je paie mon abonnement Kola via Kola, avec une suspension progressive et tolérante en cas d'impayé.

---

## 14. Plan de test

Reprend les 7 scénarios MVP (paiement sandbox → activation, double webhook, anticipé vs retard, cycle complet, SDK offline 72 h, cron idempotent) **et ajoute** :

8. **Multi-prestataire** : même scénario de paiement validé sur Campay **et** MeSomb sandbox → activation identique, calcul de date identique.
9. **Isolation tenant** : le tenant A ne peut jamais lire un abonné/une transaction du tenant B (test d'accès croisé sur chaque route admin et API publique).
10. **Vérif signature webhook** : un webhook au mauvais secret est rejeté (401, aucun effet) pour chaque prestataire.
11. **Rôles** : un `LECTURE` ne peut écrire nulle part ; un `ADMIN` ne peut pas toucher à la facturation.
12. **Relance auto** : le cron déclenche l'envoi WhatsApp au bon jour, journalise, ne double jamais un envoi.
13. **Webhook sortant** : événement `abonnement.active` livré, signé, rejoué avec back-off en cas d'échec HTTP.
14. **Dogfooding** : impayé d'un tenant → tolérance puis lecture seule, sans casser son endpoint SDK pendant la tolérance.
15. **Chiffrement** : les identifiants prestataires ne sont jamais lisibles en base ni renvoyés en clair par aucune API.
16. **Création paresseuse de l'Abonnement** : `GET /api/v1/subscriptions/status` pour un `identifiantExterne` inconnu crée l'`Abonne` et l'`Abonnement` (`statut: COUPE`, `actif: false`) au premier appel, sans jamais dupliquer si rappelé. `GET /api/admin/lien-paiement` avec le même numéro retourne le même `lienPaiement`.

---

## 15. Ordre d'implémentation suggéré

1. `create-next-app` + Prisma + Neon + schéma complet (§4) + migration.
2. `lib/crypto.ts` (AES-256-GCM) + `lib/jwt.ts` (RS256).
3. Auth maison (inscription, connexion, sessions, hash argon2) + `lib/tenant.ts` (isolation) + rôles.
4. Abstraction paiement `lib/paiement/` : interface + factory + **CampayAdapter** + **MesombAdapter** + `tester()`.
5. Dashboard `parametres/prestataires` (ajouter/tester/activer une config).
6. Page `/pay/[lienPaiement]` + `POST /api/pay/initiate` (via factory).
7. Webhooks entrants `/api/webhooks/[prestataire]` (résolution par `reference`, vérif signature, idempotence).
8. `lib/stateMachine.ts` + cron `avancer-abonnements` + réconciliation active.
9. Relances `lib/relances/` (WhatsApp Cloud API d'abord) + templates + envoi depuis le cron.
10. `GET /api/v1/subscriptions/status` (endpoint SDK) + rate-limit.
11. Dashboard complet : apps/offres/clés + abonnés + paiements + relances + métriques + export CSV.
12. Équipe & invitations.
13. API publique REST + webhooks sortants (+ cron de livraison).
14. **Dogfooding** : `seed.ts` tenant système + inscription qui enrôle chaque tenant comme abonné Kola + suspension.
15. Adaptateurs PayDunya & Flutterwave (l'interface étant figée, c'est du remplissage).
16. Intégration réelle avec `kola_sdk` sur une app en test fermé.

---

## 16. Roadmap au-delà

- **Multi-devise réelle** (XOF, MAD…) et localisation par pays (Flutterwave aide ici).
- **SDK natifs** Android (Kotlin) / iOS (Swift) quand le hors-périmètre iOS sera levé.
- **KMS géré** pour les secrets (au lieu de la clé d'environnement).
- **SSO** pour les gros tenants ; SAML/OIDC.
- **Marketplace / mise en relation** entre développeurs clients.
- **White-label** du dashboard et de la page de paiement.
- **Extraction de l'API** vers un backend séparé (Laravel) — rendue possible par la discipline « dashboard n'accède jamais à la base directement ».

---

## 17. Hors périmètre, à tout horizon

- Kola ne détient **jamais** de fonds (non-custodial : argent → directement au compte prestataire du tenant).
- Le SDK ne propose **jamais** d'ouverture de paiement, de prix, ni de bouton d'achat dans l'app mobile (conformité Google Play).
- Aucune fonctionnalité de « portefeuille Kola », « solde », ou « reversement ».
- Le JWT du SDK ne contient jamais de donnée sensible (stocké en clair sur l'appareil final).
