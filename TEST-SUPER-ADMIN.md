# Checklist pre-lancement — taches super-admin avant premiers tenants

Ce que TOI (super-admin, proprietaire tenant systeme "kola") dois faire AVANT
d'accepter le premier client SaaS payant. Coche dans l'ordre — chaque section
bloque la suivante en prod.

## A. Infra & secrets prod

- [ ] Neon : base prod separee de dev/preview, connection pooling active
      (`DATABASE_URL` prod distinct)
- [ ] `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` prod generes (paire RS256 dediee,
      jamais celle de dev) — cle privee stockee uniquement en var d'env
      Vercel, jamais commitee
- [ ] `APP_ENCRYPTION_KEY` prod generee (chiffrement identifiants
      prestataires paiement des tenants) — perte de cette cle = configs
      paiement clients illisibles, donc backup securise (coffre-fort/1Password)
- [ ] `AUTH_SECRET` / `BETTER_AUTH_SECRET` prod generes, distincts de dev
- [ ] `CRON_SECRET` prod genere, renseigne dans Vercel + `vercel.json` crons
      actifs (`avancer-abonnements` 03h, `livrer-webhooks-sortants` /10min)
- [ ] `BETTER_AUTH_URL` / `NEXT_PUBLIC_BETTER_AUTH_URL` pointent domaine prod
      (pas localhost)
- [ ] Domaine custom configure sur Vercel + HTTPS actif
- [ ] `.env` prod ne contient aucun secret de dev/sandbox residuel

## B. Paiement — sortir du sandbox

- [ ] Compte Campay **production** ouvert (pas `demo.campay.net`) — KYC/
      validation marchand Campay termine
- [ ] `CAMPAY_APP_USERNAME` / `CAMPAY_APP_PASSWORD` / `CAMPAY_WEBHOOK_SECRET`
      prod renseignes, `CAMPAY_BASE_URL` pointe l'API prod
- [ ] Config paiement systeme (tenant "kola", pour facturer les tenants
      eux-memes — dogfooding §11) recreee en prod avec identifiants prod, pas
      ceux du seed sandbox
- [ ] Test paiement reel a montant minimal avant ouverture publique (pas
      juste sandbox) — confirmer argent recu sur compte Campay marchand
- [ ] Plafond sandbox (100 FCFA) leve — verifier aucune limite artificielle
      residuelle cote code/config

## C. Seed prod & offre commerciale

- [ ] `pnpm run seed` execute UNE FOIS en prod (tenant systeme "kola" +
      paliers `decouverte`/`standard`/`croissance`/`echelle` + modeles
      relance par defaut)
- [ ] Prix des paliers definitifs valides (business, pas juste valeurs seed)
      avant ouverture — changer le prix apres coup casse la coherence pour
      tenants deja abonnes
- [ ] `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` prod distincts de dev,
      mot de passe fort, pas dans un repo
- [ ] Compte super-admin prod cree, testee connexion `/connexion` en prod

## D. Notifications sortantes (email/WhatsApp/SMS)

- [ ] `RESEND_API_KEY` / `RESEND_FROM` / `RESEND_FROM_EMAIL` prod configures,
      domaine expediteur verifie (SPF/DKIM) — sinon emails invitation/reset
      partent en spam
- [ ] Flux invitation equipe (`/invitation/[token]`) teste avec vraie boite
      mail en prod
- [ ] Flux mot-de-passe-oublie teste avec vraie boite mail en prod
- [ ] Si relances WhatsApp actives : `WHATSAPP_TOKEN` /
      `WHATSAPP_PHONE_NUMBER_ID` prod valides, template WhatsApp approuve
      (Meta Business)
- [ ] Si SMS actif : `SMS_GATEWAY_API_KEY` / `SMS_GATEWAY_URL` prod valides

## E. Securite & conformite avant ouverture publique

- [ ] Verifier regle absolue : aucun secret HS256, JWT bien RS256 en prod
      (`JWT_PRIVATE_KEY` jamais expose cote SDK/app mobile)
- [ ] Isolation multi-tenant re-verifiee en prod (§11 plus bas) — critique
      des que 2e tenant reel arrive
- [ ] Rate limiting / protection basique sur `/inscription`,
      `/connexion`, `POST /api/pay/initiate` (anti-abus, anti brute-force)
- [ ] Page CGU / politique de confidentialite / mentions legales publiees
      (obligatoire des lors qu'on facture des clients reels)
- [ ] Politique de sauvegarde Neon confirmee (point-in-time recovery actif)
- [ ] Monitoring erreurs (Vercel logs / Sentry ou equivalent) branche sur
      routes critiques (`/api/webhooks/*`, `/api/cron/*`, `/api/v1/*`)
- [ ] Alerte si cron `avancer-abonnements` ou `livrer-webhooks-sortants`
      echoue silencieusement (pas de visibilite = abonnements bloques sans
      qu'on le sache)

## F. Support & onboarding premier client

- [ ] Canal de support defini (email/WhatsApp) communique aux futurs tenants
- [ ] Doc/guide onboarding tenant redige (referencer
      `docs/test-parcours-tenant.md` comme base) : comment creer App, Offre,
      config prestataire, recuperer `cleApiPublique`
- [ ] `kola_sdk` (package Flutter) publie/accessible en dependance Git avec
      version stable taggee — pas de branche instable pointee par les clients
- [ ] Process manuel defini pour repondre a un tenant qui perd sa
      `cleApiSecrete` (regeneration, pas de recuperation possible vu qu'elle
      n'est jamais stockee en clair)

## G. Validation finale bout-en-bout en prod (donnees jetables)

- [ ] Rejouer le parcours complet `docs/test-parcours-tenant.md` §16 en prod
      avec un tenant de test, PUIS le supprimer/desactiver avant vraie
      ouverture
- [ ] Rejouer `docs/test-parcours-abonne.md` §7 en prod avec montant reel
      minimal
- [ ] Confirmer que les donnees de test prod sont nettoyees (aucun
      Abonne/Abonnement/Tenant de test ne doit trainer au moment d'annoncer
      le lancement)

---

## Plan de test — dashboard super-admin (tenant "kola")

Objectif : valider que le proprietaire du tenant systeme "kola" (toi, apres
seed) peut piloter la plateforme de bout en bout via le dashboard, sans
qu'aucun client SaaS (Abonne/Abonnement/autre tenant) n'existe encore.

Prerequis :
- DB wipee (garde User admin + Organization/Tenant "kola")
- `pnpm run seed` execute (offres/paliers + modeles relance + config Campay si
  `CAMPAY_APP_USERNAME`/`CAMPAY_APP_PASSWORD` presents)
- `pnpm dev` lance, `http://localhost:3000`

## 1. Authentification(OK)

- [ ] `/connexion` avec `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` → redirige
      vers `/dashboard`
- [ ] Mauvais mot de passe → erreur, pas de session creee
- [ ] Session persistante apres refresh (cookie Better Auth)
- [ ] `/mot-de-passe-oublie` → flux reset fonctionne (email envoye si SMTP
      configure, sinon verifier le comportement degradee)

## 2. Dashboard overview (`/dashboard`)(OK)

- [ ] Page charge sans erreur, aucun abonne/abonnement (etat "vide" propre,
      pas de crash sur listes vides)
- [ ] Sidebar affiche bien toutes les sections (Apps, Abonnes, Paiements,
      Relances, Parametres)

## 3. Apps (`/dashboard/apps`)

- [ ] App "Plateforme" (creee par le seed) visible dans la liste
- [ ] Ouvrir `/dashboard/apps/[appId]` → detail app, `cleApiPublique` affichee
- [ ] Creer une nouvelle app de test → apparait dans la liste
      (`POST /api/admin/apps`)
- [ ] Modifier une app existante (`PATCH/PUT /api/admin/apps/[appId]`)
- [ ] Verifier qu'aucune app "Kola Test App" residuelle du seed precedent ne
      traine (nettoyee par le wipe)

## 4. Offres (`/api/admin/offres`, pas encore de page dediee ? verifier UI)

- [ ] Les 4 paliers seedes visibles : `decouverte` (0), `standard` (25000),
      `croissance` (60000), `echelle` (120000) — bonne devise `XAF`,
      `periodiciteJours` 30, `toleranceJours` 7
- [ ] Creer une offre custom sur l'app "Plateforme" ou une app de test
      (`POST /api/admin/offres`)
- [ ] Modifier / desactiver une offre (`PUT/PATCH /api/admin/offres/[offreId]`,
      champ `actif`)
- [ ] Contrainte unique `[appId, slug]` respectee (deux offres meme slug sur
      meme app → erreur propre)

## 5. Abonnes (`/dashboard/abonnes`)

- [ ] Liste vide au depart (aucun client SaaS) — verifier etat vide sans
      erreur
- [ ] Creer un abonne de test manuellement si l'UI le permet, ou via
      `POST /api/admin/abonnes`
- [ ] Bouton copie (`CopyButton.tsx`) copie bien le lien de paiement /
      identifiant externe
- [ ] Export (`GET /api/admin/export`) genere un fichier coherent (CSV/JSON ?
      verifier format)

## 6. Paiements (`/dashboard/paiements`)

- [ ] Page charge, liste vide au depart
- [ ] Flux complet sandbox Campay (cf. cahier des charges §6) :
  - creer un abonne + abonnement de test
  - initier paiement (`POST /api/pay/initiate`) → page `/pay/[lienPaiement]`
  - payer en sandbox (montant plafonne 100 FCFA, `demo.campay.net`)
  - webhook (`POST /api/webhooks/[prestataire]`) → statut passe a `REUSSIE`,
    `Abonnement.statut` → `ACTIF`, `dateEcheance` correcte
  - rejouer le meme webhook (meme `providerTransactionId`) → pas de doublon
    (`Transaction.providerTransactionId` unique)
- [ ] `GET /api/pay/status` reflete bien l'etat courant

## 7. Relances (`/dashboard/relances`)

- [ ] Modeles par defaut (`MODELES_DEFAUT`) visibles : `J_MOINS_3`,
      `J_ECHEANCE`, `J_PLUS_7`, canal `WHATSAPP`
- [ ] Modifier le contenu d'un modele (`PATCH /api/admin/relances/modeles`)
      → variables `{nom} {offre} {prix} {jours} {lien}` toujours rendues
- [ ] Historique des envois (`LogRelance`) visible si des relances ont ete
      declenchees par le cron

## 8. Parametres

### 8.1 Prestataires (`/dashboard/parametres/prestataires`)

- [ ] Config Campay seedee visible (si `.env` avait les identifiants), avec
      `parDefaut: true`
- [ ] Ajouter une config supplementaire (`POST /api/admin/prestataires`)
- [ ] Un seul `parDefaut` par tenant respecte (garde applicative)
- [ ] Modifier / supprimer (`PATCH/DELETE /api/admin/prestataires/[id]`)
- [ ] Identifiants jamais affiches en clair (verifier que
      `identifiantsChiffres` reste chiffre, seul un "verifieLe" ou statut est
      montre)

### 8.2 Webhooks sortants (`/dashboard/parametres/webhooks`)

- [ ] Creer un webhook sortant de test (URL + evenements)
      (`POST /api/admin/webhooks`)
- [ ] Declenchement reel (ex: `abonnement.active`) → `LivraisonWebhook` cree,
      signature HMAC-SHA256 verifiable
- [ ] Retry en cas d'echec (`prochainEssai` peuple, cron
      `livrer-webhooks-sortants` retraite)

### 8.3 Equipe (`/dashboard/parametres/equipe`)

- [ ] Toi seul liste comme membre, role `proprietaire`
- [ ] Inviter un second membre (`/invitation/[token]`) → verifier flux complet
      (email, acceptation, role assigne)
- [ ] Retirer un membre, changer un role (`admin`/`lecture`) → permissions
      appliquees (`lib/permissions.ts`)

### 8.4 Facturation (`/dashboard/parametres/facturation`)

- [ ] `statutPlateforme` du tenant "kola" affiche correctement (ACTIF par
      defaut, pas d'abonnement dogfooding tant qu'aucun client n'existe —
      verifier que la page ne plante pas sans abonnement dogfooding)
- [ ] `GET /api/admin/facturation` renvoie une reponse coherente meme sans
      abonnement dogfooding actif

## 9. Cron (a tester manuellement en dev, header `Authorization: Bearer <CRON_SECRET>`)

- [ ] `GET /api/cron/avancer-abonnements` → transition `ACTIF → TOLERANCE →
      COUPE → EXPIRE` correcte sur un abonnement de test avec date d'echeance
      passee
- [ ] Rejoue deux fois de suite → aucun effet de bord duplique (idempotent)
- [ ] `GET /api/cron/livrer-webhooks-sortants` → livre les webhooks en attente
- [ ] Sans header/secret correct → 401/403, pas d'execution

## 10. API publique consommee par le SDK

- [ ] `GET /api/v1/subscriptions/status` (ou `/api/public/v1/subscriptions/status`)
      avec `identifiantExterne` connu → JWT RS256 valide retourne
- [ ] Avec `identifiantExterne` inconnu → reponse coherente (pas d'exception,
      statut "inactif" ou 404 propre)
- [ ] JWT verifie avec `JWT_PUBLIC_KEY` cote client de test (pas HS256)
- [ ] `app/api/public/v1/offers` et `/subscribers` → verifier scoping par
      `cleApiPublique`/`cleApiSecreteHash` de l'app (pas de fuite cross-tenant)

## 11. Isolation multi-tenant (meme en mono-tenant MVP)

- [ ] Toute requete admin echoue si le `tenantId` ne correspond pas a
      l'organization active du membre (garde `lib/tenant.ts`)
- [ ] Aucune route dashboard/API ne lit la DB sans passer par
      `app/api/...` (verification rapide des pages `dashboard/(protected)`)

## Notes

- Aucun `Abonne`/`Abonnement` ne doit exister au depart : toute donnee de
  test creee pendant ce plan doit etre volontairement ajoutee puis, si besoin,
  reseedee/wipee ensuite pour revenir a l'etat "0 client".
- Se referer a `docs/kola-web-cahier-des-charges.md` §6 pour le detail des
  scenarios de paiement/cron deja definis comme reference.
