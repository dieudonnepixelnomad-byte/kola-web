# Test manuel — parcours abonné (paiement + statut)

Couvre parcours utilisateur final (pas dashboard admin) : ouvrir lien paiement → payer → webhook confirme → statut consulté via API v1 (celle que le SDK Flutter appelle).

Env: sandbox Campay (`demo.campay.net`, montants ≤ 100 FCFA). Base seedée (1 Tenant, 1 App, 1 Offre min).

## Prérequis

- [ ] `.env` : `DATABASE_URL`, config Campay sandbox actifs
- [ ] `npx prisma db seed` exécuté (Tenant + App + Offre existent)
- [ ] Serveur dev lancé : `npm run dev`
- [ ] Récup en base : `App.cleApiPublique`, `Offre.slug`, `Abonnement.lienPaiement` (via `psql`/Prisma Studio ou route admin)

## 1. Page de paiement `/pay/[lienPaiement]`

- [ ] `GET /pay/{lienPaiement}` valide → page s'affiche, nom offre + prix + devise + périodicité corrects
- [ ] `GET /pay/inexistant` → `notFound()` (404)
- [ ] Champ téléphone pré-rempli si `Abonne.telephone` déjà connu, vide sinon
- [ ] Choix opérateur `mtn` / `orange` visible

## 2. Initiation paiement `POST /api/pay/initiate`

- [ ] Body valide (`lienPaiement`, `telephone`, `operateur` ∈ {mtn, orange}) → `200 { ok: true, reference, message }`
- [ ] `Transaction` créée en base : `abonnementId` correct, `reference` = UUID, `statut = EN_ATTENTE` (ou `REUSSIE`/`ECHOUEE` selon retour Campay)
- [ ] Body invalide (opérateur absent/faux) → `400`
- [ ] `lienPaiement` inconnu → `404`
- [ ] Erreur prestataire (ex. config Campay désactivée) → `502`
- [ ] Message affiché à l'écran : "En attente de confirmation sur votre téléphone"

## 3. Polling statut `GET /api/pay/status?lienPaiement=...`

- [ ] Avant confirmation : `statutAbonnement` = statut courant, `statutTransaction = EN_ATTENTE`
- [ ] `lienPaiement` invalide/absent → `400`
- [ ] `lienPaiement` inconnu → `404`
- [ ] Page `/pay/[lienPaiement]` poll bien cette route et reflète le changement d'état sans reload

## 4. Webhook Campay `POST /api/webhooks/campay`

Simuler payload Campay (`external_reference` = `reference` de l'étape 2, statut `SUCCESSFUL`).

- [ ] Webhook succès valide → `transaction.statut = REUSSIE`, `abonnement.statut` avance (`COUPE`/`EXPIRE` → `ACTIF`), `dateEcheance` recalculée correctement (voir §6 cahier : paiement en avance vs en retard)
- [ ] **Double webhook** (même `external_reference`, rejoué 2×) → 2ᵉ appel no-op (transaction déjà `REUSSIE`), pas de doublon, pas de recalcul de date supplémentaire
- [ ] Signature invalide → `401 { error: "Signature invalide" }`, aucun état modifié
- [ ] `prestataire` inconnu dans l'URL → `404`
- [ ] `external_reference` absent/non extrait → `200 { ok: true }` (no-op silencieux, pas d'erreur exposée)
- [ ] `reference` inconnue en base → `200 { ok: true }` no-op
- [ ] Payload statut `FAILED` → `transaction.statut = ECHOUEE`, `abonnement.statut` inchangé
- [ ] Après webhook réussi, `/api/pay/status` reflète bien `statutTransaction: REUSSIE` et nouveau `statutAbonnement`

## 5. Statut consommé par le SDK `GET /api/v1/subscriptions/status`

Query: `cle` (App.cleApiPublique), `identifiantExterne` (téléphone E.164), `offre` (slug).

- [ ] 1er appel avec `identifiantExterne` jamais vu → crée `Abonne` (upsert) + `Abonnement` neuf `statut = COUPE`, `actif = false`
- [ ] Après paiement confirmé (§4) → `actif = true`, `statut = ACTIF`, `dateEcheance` non nulle, `token` JWT présent
- [ ] `cle` invalide → `401`
- [ ] `offre` slug inconnu pour cette app → `404`
- [ ] Params manquants → `400`
- [ ] Token retourné signé **RS256** (vérifier avec clé publique du SDK — jamais HS256, règle absolue projet)
- [ ] Contenu JWT : `identifiantExterne`, `offreSlug`, `tenantId`, `actif`, `dateEcheance` cohérents avec la réponse JSON

## 6. Cycle complet sans paiement (cron)

Nécessite d'attendre/simuler passage du temps ou d'avancer `dateEcheance` manuellement en base.

- [ ] `GET /api/cron/avancer-abonnements` (avec header secret cron) fait progresser `ACTIF → TOLERANCE → COUPE → EXPIRE` selon échéances
- [ ] Rejoué 2× sans changement de date → aucun effet de bord dupliqué (pas de double transition)
- [ ] Sans header secret / secret faux → rejeté (401/403)
- [ ] Après passage en `COUPE`/`EXPIRE`, `/api/v1/subscriptions/status` renvoie `actif = false` immédiatement

## 7. Bout en bout (scénario complet)

1. [ ] `GET /api/v1/subscriptions/status` (nouvel abonné) → `actif: false`
2. [ ] Ouvrir `/pay/{lienPaiement}`, soumettre paiement
3. [ ] Webhook Campay succès reçu
4. [ ] `GET /api/v1/subscriptions/status` (même identifiantExterne) → `actif: true`, `dateEcheance` = date attendue (aujourd'hui + `periodiciteJours`)
5. [ ] Avancer date système / forcer échéance passée, lancer cron
6. [ ] `GET /api/v1/subscriptions/status` → séquence `ACTIF → TOLERANCE → COUPE → EXPIRE` respectée, `actif` bascule `false` au bon moment
