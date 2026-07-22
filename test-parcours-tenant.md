# Test manuel — parcours client SaaS (tenant, développeur app mobile)

Parcours du **client de Kola** (créateur app mobile, "proprietaire"/"admin" d'un Tenant) — pas parcours de son propre abonné final. Couvre: inscription → onboarding → config app/offre/prestataire → suivi abonnés/paiements → équipe → webhooks sortants.

Env: dev local, base seedée ou vide. Rôles tenant: `proprietaire`, `admin`, autres (voir `exigerRole`).

## Prérequis

- [ ] Serveur dev lancé (`npm run dev`), DB accessible
- [ ] Aucune session active (test depuis navigation privée)

## 1. Inscription `/inscription`

- [ ] Form: nom, nom entreprise/app, email, mot de passe (min 8) → soumission
- [ ] `authClient.signUp.email` crée compte Better Auth
- [ ] `authClient.organization.create` crée le Tenant (slug = `slugify(nomEntreprise)-xxxx`)
- [ ] `organization.setActive` → session liée au bon tenant
- [ ] Redirection `/dashboard` après succès
- [ ] Email déjà utilisé → erreur affichée, pas de tenant orphelin créé
- [ ] Échec création organisation (après user créé) → erreur affichée ("compte créé mais tenant non créé") — vérifier état DB cohérent (pas de tenant à moitié créé)

## 2. Connexion `/connexion` + déconnexion

- [ ] Identifiants valides → accès `/dashboard`
- [ ] Mauvais mot de passe → erreur, pas d'accès
- [ ] Route protégée (`/dashboard/...`) sans session → redirection `/connexion`
- [ ] Déconnexion → session invalidée, retour route protégée refusé

## 3. Mot de passe oublié `/mot-de-passe-oublie` + `/reinitialiser-mot-de-passe`

- [ ] Demande reset avec email existant → email envoyé (ou log en dev)
- [ ] Email inconnu → pas de fuite d'info (comportement identique côté UI)
- [ ] Lien reset valide → nouveau mot de passe accepté, connexion possible ensuite
- [ ] Lien reset expiré/déjà utilisé → rejeté

## 4. Créer une App `POST /api/admin/apps` (page `/dashboard/apps`)

- [ ] Form nom + plateforme (android/ios, défaut android) → `201`
- [ ] Réponse contient `cleApiPublique` **et** `cleApiSecrete` en clair — **une seule fois**
- [ ] Vérifier en base : `cleApiSecreteHash` stocké (jamais le clair), `cleApiSecreteIndice` = 6 derniers caractères
- [ ] Recharger la page app → clé secrète en clair n'est plus récupérable (seulement l'indice)
- [ ] Rôle insuffisant (si multi-membres, rôle "membre") → `403`
- [ ] Sans session → `401`
- [ ] App créée liée au bon `tenantId` (isolation — un autre tenant ne doit pas la voir dans son `GET /api/admin/apps`)

## 5. Créer une Offre `POST /api/admin/offres`

- [ ] `appId` valide + `nom`, `slug` (regex `[a-z0-9-]+`), `prix` (int ≥0), `devise` (def XAF), `periodiciteJours` (def 30), `toleranceJours` (def 3) → `201`
- [ ] `slug` avec majuscule/espace → `400` (regex)
- [ ] `appId` d'un autre tenant → `404` (pas de fuite cross-tenant)
- [ ] `configurationId` fourni mais inexistant/d'un autre tenant → `400`
- [ ] Offre visible ensuite dans `GET /api/admin/apps` (`offres: [...]`)

## 6. Config prestataire paiement `/dashboard/parametres/prestataires`

- [ ] `POST /api/admin/prestataires` avec `prestataire` (CAMPAY/MESOMB/PAYDUNYA/FLUTTERWAVE), `nom`, `identifiants` (objet clé/valeur, ex. clés API Campay sandbox), `parDefaut` → `201`, retourne `secret`/`id` **une seule fois**
- [ ] Vérifier en base : `identifiantsChiffres` chiffré (`encrypt`), jamais en clair
- [ ] `parDefaut: true` → toute autre config du tenant repasse `parDefaut: false` (un seul défaut à la fois)
- [ ] `GET /api/admin/prestataires` liste sans exposer les identifiants déchiffrés
- [ ] Rattacher cette config à une Offre (`configurationId` à l'étape 5) → paiements de cette offre utilisent ce prestataire

## 7. Générer/récupérer le lien de paiement d'un Abonné

- [ ] Depuis app/offre créée, obtenir un `Abonnement` avec `lienPaiement` (généré une fois, permanent — pas de régénération)
- [ ] Lien fonctionnel : ouvre bien `/pay/{lienPaiement}` (parcours abonné final — testé séparément, voir `test-parcours-abonne.md`)

## 8. Dashboard — vue d'ensemble `/dashboard`

- [ ] Compteurs (`/api/admin/compteurs`) reflètent nombre abonnés actifs/tolérance/coupés/expirés à jour

## 9. Liste des abonnés `/dashboard/abonnes`

- [ ] `GET /api/admin/abonnes` liste seulement les abonnés du tenant courant
- [ ] Bouton copier (`CopyButton`) copie bien `identifiantExterne`/lien attendu
- [ ] Export (`/api/admin/export`) génère fichier cohérent avec la liste affichée
- [ ] Filtrage par statut (ACTIF/TOLERANCE/COUPE/EXPIRE) si présent dans l'UI, cohérent avec données

## 10. Paiements `/dashboard/paiements`

- [ ] `GET /api/admin/paiements` liste transactions du tenant, statuts corrects (`REUSSIE`/`ECHOUEE`/`EN_ATTENTE`)
- [ ] Isolation: transactions d'un autre tenant absentes

## 11. Relances `/dashboard/relances`

- [ ] `GET/POST /api/admin/relances` — modèles de message (`/api/admin/relances/modeles`) CRUD cohérent
- [ ] Relances liées aux abonnements en `TOLERANCE`/`COUPE` (selon logique métier)

## 12. Webhooks sortants `/dashboard/parametres/webhooks`

- [ ] `POST /api/admin/webhooks` : `url` (valide), `evenements` (sous-ensemble de `abonnement.active/tolerance/coupe/expire`, `transaction.reussie`), min 1 événement → `201`, `secret` retourné **une seule fois** en clair
- [ ] `url` invalide → `400`
- [ ] `evenements` vide ou valeur hors enum → `400`
- [ ] `GET /api/admin/webhooks` liste sans exposer le secret déchiffré
- [ ] Déclencher un événement réel (ex. paiement réussi côté abonné) → webhook livré via cron `livrer-webhooks-sortants`, payload signé avec le bon secret
- [ ] Suppression (`DELETE /api/admin/webhooks/[id]`) → plus livré ensuite

## 13. Équipe `/dashboard/parametres/equipe` — invitation multi-membres

- [ ] Propriétaire invite un email → `Invitation` créée (`status: pending`, `expiresAt` futur)
- [ ] Lien `/invitation/[token]` :
  - [ ] Token invalide/expiré/déjà accepté → message "invitation invalide"
  - [ ] Non connecté → propose connexion/inscription avec `redirect` vers l'invitation
  - [ ] Connecté avec **mauvais** email → message explicite, pas d'acceptation possible
  - [ ] Connecté avec le bon email → `AccepterInvitation` accepte, membre rejoint le tenant avec le rôle assigné
- [ ] Après acceptation, nouveau membre a accès `/dashboard` scoré sur le même tenant, permissions cohérentes avec son rôle (`exigerRole`)
- [ ] Rôle non-`proprietaire`/`admin` ne peut pas créer d'App/Offre (`403` sur §4/§5)

## 14. Facturation `/dashboard/parametres/facturation`

- [ ] `GET/POST /api/admin/facturation` reflète état facturation du tenant (plan, usage, etc. selon implémentation actuelle)

## 15. Isolation multi-tenant (transverse, à rejouer sur plusieurs endpoints)

- [ ] Créer 2 tenants (2 inscriptions distinctes)
- [ ] Tenant A ne peut lister/modifier/supprimer aucune ressource (App, Offre, Abonné, Config paiement, Webhook) appartenant à Tenant B, même en devinant un ID
- [ ] `contexteTenant()` rejette toute requête sans session/organisation active (`401`)

## 16. Bout en bout (scénario complet)

1. [ ] Inscription nouveau compte + tenant
2. [ ] Créer App → récupérer `cleApiPublique`/`cleApiSecrete`
3. [ ] Configurer prestataire Campay sandbox
4. [ ] Créer Offre liée à cette config
5. [ ] Récupérer `lienPaiement` d'un abonnement test
6. [ ] Inviter un 2ᵉ membre, qu'il accepte et voie les mêmes données
7. [ ] Configurer un webhook sortant sur `transaction.reussie`
8. [ ] Simuler paiement réussi côté abonné (cf. `test-parcours-abonne.md`) → vérifier apparition dans Abonnés/Paiements dashboard + webhook sortant livré
