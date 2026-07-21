# `kola_sdk` — Cahier des charges (package Flutter, version produit fini)

> Porteur : Gwet Bikoun Dieudonné, Douala · Réécriture « produit fini »
> Complète le cahier `kola-web` (SaaS complet). Package Flutter/Dart consommé par l'app mobile de n'importe quel éditeur Kola.
> **Publié sur pub.dev, SemVer strict, Android d'abord (iOS-ready).**

---

## 1. Rôle du SDK et invariant absolu

Le SDK répond à **une seule question** : *cet utilisateur a-t-il un accès actif à telle offre ?* Rien de plus.

**Interdiction absolue, jamais levée, même en V3 :** le SDK ne doit jamais proposer de méthode qui ouvre une page de paiement, affiche un prix, ou déclenche un achat depuis l'app. C'est la condition de conformité Google Play (app en consommation seule). La contrainte est **visible dans le code lui-même** : aucune méthode publique n'accepte un montant, un numéro de téléphone destiné à payer, une URL de paiement, ni un opérateur.

> **Conséquence heureuse du design SaaS** : le choix du prestataire (Campay, MeSomb, PayDunya, Flutterwave) et la logique de facturation vivent **entièrement côté serveur**. Le SDK est donc **agnostique du prestataire** — il ne change pas d'une ligne selon que l'éditeur encaisse via Campay ou MeSomb. C'est ce qui permet à un même binaire de package de servir tous les tenants Kola sans configuration liée au paiement.

Ce que le multi-tenant change pour le SDK : **rien de fondamental**. La clé publique passée à `init()` identifie l'app (donc le tenant) côté serveur ; le SDK n'a aucune notion de tenant à gérer localement. Toute l'intelligence multi-tenant est portée par `kola-web`.

---

## 2. Architecture interne

### 2.1 Structure du repo

```
kola_sdk/
├── lib/
│   ├── kola_sdk.dart                 # point d'entrée public (exports uniquement)
│   └── src/
│       ├── kola.dart                 # façade publique
│       ├── kola_client.dart          # HTTP vers kola-web (timeout, retry, back-off)
│       ├── kola_cache.dart           # lecture/écriture shared_preferences
│       ├── kola_token.dart           # décodage + vérif RS256 du JWT
│       ├── kola_config.dart          # config runtime (baseUrl, clé, timeouts, logger)
│       ├── kola_exceptions.dart      # exceptions typées
│       ├── kola_logger.dart          # hook de log optionnel (onError / onEvent)
│       └── models/
│           ├── subscription_status.dart
│           └── kola_raison_refus.dart  # enum : pourquoi isActive() a renvoyé false
├── test/
│   ├── kola_client_test.dart
│   ├── kola_cache_test.dart
│   ├── kola_token_test.dart
│   ├── kola_retry_test.dart
│   └── kola_offline_scenario_test.dart
├── example/
│   └── lib/main.dart                 # app de démonstration
├── CHANGELOG.md
├── LICENSE
├── pubspec.yaml
└── README.md
```

### 2.2 Couches et responsabilités

| Couche | Responsabilité | Ne fait jamais |
|---|---|---|
| `Kola` (façade) | Expose l'API publique, orchestre les couches | Aucune logique métier propre |
| `KolaClient` | Appel HTTP à `GET /api/v1/subscriptions/status`, timeout, **retry + back-off** | Ne décide jamais seul si l'accès est actif |
| `KolaCache` | Stocke/lit le JWT par `(tenant, offre, identifiant)` | Aucune requête réseau |
| `KolaToken` | Décode le JWT, vérifie signature RS256 + expiration | Aucun accès disque ni réseau |
| `KolaLogger` | Émet des événements de diagnostic vers un hook fourni par l'éditeur | Rien qui interrompe l'app |

Chaque couche est testable isolément (mock HTTP, `SharedPreferences.setMockInitialValues`, JWT de test signés).

---

## 3. API publique

```dart
class Kola {
  /// À appeler une fois, typiquement dans main() avant runApp().
  static Future<void> init(KolaConfig config);

  /// true si l'utilisateur a un accès actif (ACTIF ou TOLERANCE) à l'offre.
  /// Ne lève jamais d'exception vers l'appelant (sauf init() manquant en debug).
  /// En cas d'erreur réseau ET de cache absent/expiré → false (fail-closed, §5).
  ///
  /// `identifiantExterne` = numéro de téléphone E.164 (ex. "+237671960300").
  /// Choix conservé du MVP : permet la restauration après réinstallation (§7).
  static Future<bool> isActive(
    String offreSlug, {
    required String identifiantExterne,
  });

  /// Force un rafraîchissement réseau (ignore le cache). À appeler au retour
  /// d'un paiement pour refléter l'accès sans attendre la vérif naturelle.
  static Future<bool> refresh(
    String offreSlug, {
    required String identifiantExterne,
  });

  /// Statut complet en cache, pour affichage informatif uniquement
  /// ("ton accès expire le ..."). Ne décide jamais d'un accès.
  static Future<SubscriptionStatus?> statutEnCache(
    String offreSlug, {
    required String identifiantExterne,
  });

  /// Flux réactif du statut d'une offre — émet une nouvelle valeur à chaque
  /// isActive()/refresh(). Pratique pour reconstruire l'UI sans re-appeler.
  static Stream<bool> flux(
    String offreSlug, {
    required String identifiantExterne,
  });

  /// Vide le cache local d'un utilisateur (ex. à la déconnexion in-app).
  static Future<void> oublier({required String identifiantExterne});
}
```

Config runtime :

```dart
class KolaConfig {
  final String cleApiPublique;    // clé publique de l'App (pub_...)
  final String baseUrl;           // ex: https://api.kola.app
  final Duration timeout;         // défaut 5s
  final int maxTentatives;        // défaut 2 (retry réseau avec back-off)
  final Duration dureeValiditeOffline; // défaut 72h (borne le cache)
  final void Function(KolaEvenement)? onEvent; // hook de log optionnel

  const KolaConfig({
    required this.cleApiPublique,
    required this.baseUrl,
    this.timeout = const Duration(seconds: 5),
    this.maxTentatives = 2,
    this.dureeValiditeOffline = const Duration(hours: 72),
    this.onEvent,
  });
}
```

**Ce qui n'existe explicitement pas** : `openPaymentPage()`, `subscribe()`, `getPrice()`, `pay()`, ou toute méthode acceptant un montant, une URL de paiement ou un opérateur. Absence volontaire (§1). Une revue de code manuelle le vérifie avant chaque release (critère d'acceptation §12).

---

## 4. Cas d'usage

**Conservés** : US-SDK-01→08 (init unique, `isActive` en une ligne, détection post-paiement via `refresh`, offline < 72 h, expiration > 72 h, aucune exception vers l'app, logs de diagnostic, restauration par numéro).

**Ajouts produit fini** :

- **US-SDK-09** — En tant qu'éditeur, je veux un **flux réactif** (`Kola.flux`) pour reconstruire mon UI premium automatiquement quand le statut change, sans re-câbler `FutureBuilder` partout.
- **US-SDK-10** — En tant qu'éditeur, je veux configurer **timeout et nombre de tentatives** selon la qualité réseau de mes utilisateurs (Garoua ≠ Douala).
- **US-SDK-11** — En tant qu'éditeur, je veux un **hook `onEvent`** qui me remonte, en clair, la raison d'un `false` (offline expiré / offre inconnue / clé invalide / réseau) pour diagnostiquer sans deviner.
- **US-SDK-12** — En tant qu'éditeur, je veux **figer une version** du package (SemVer, pub.dev) et lire un `CHANGELOG` clair avant de monter de version.
- **US-SDK-13** — En tant qu'éditeur, je veux `Kola.oublier()` pour purger le cache d'un utilisateur à sa déconnexion in-app.

---

## 4bis. Restauration d'accès après réinstallation

Inchangé : comme `identifiantExterne` = numéro de téléphone (stable, indépendant de l'appareil), la restauration ne nécessite **aucune méthode SDK supplémentaire** — un `isActive()` avec le numéro resaisi retrouve le même `Abonne` côté serveur et renvoie un JWT valide.

Côté app (hors périmètre SDK, documenté dans le README) : un écran « Déjà abonné ? Entrez votre numéro » qui appelle `Kola.isActive('premium', identifiantExterne: numéroSaisi)`.

> **Sécurité MVP → V1** : au MVP, pas d'OTP (quiconque connaît un numéro peut **consulter** un statut, jamais le voler ni le modifier). En V1, si `kola-web` ajoute un flux OTP, il reste **côté serveur** : le SDK ne gagne aucune méthode de paiement, il transmet simplement l'`identifiantExterne` déjà vérifié par l'app. L'invariant §1 tient.

---

## 5. Comportement réseau et cache

### 5.1 Séquence d'un `isActive()`

```
isActive(offreSlug, identifiantExterne)
  │
  ├─▶ GET /api/v1/subscriptions/status (timeout configurable, retry + back-off)
  │     │
  │     ├─ Succès (200) ──▶ stocke le JWT, émet onEvent(SUCCES_RESEAU), retourne `actif`
  │     │
  │     ├─ Erreur réseau (timeout, offline, 5xx) après tentatives épuisées
  │     │     └─▶ lit le JWT en cache (tenant, offre, identifiant)
  │     │           ├─ absent ──▶ onEvent(OFFLINE_SANS_CACHE) ; false
  │     │           ├─ signature invalide ──▶ onEvent(TOKEN_ALTERE) ; false
  │     │           ├─ expiré (> 72h) ──▶ onEvent(OFFLINE_EXPIRE) ; false
  │     │           └─ valide et non expiré ──▶ onEvent(SERVI_DEPUIS_CACHE) ; true
  │     │
  │     └─ 401/403 (clé invalide) ──▶ onEvent(CLE_INVALIDE) ; false
  │                                     (+ KolaConfigException dispo via onEvent — erreur de l'éditeur, pas de l'utilisateur)
```

### 5.2 Retry et back-off (nouveau)

`KolaClient` réessaie jusqu'à `maxTentatives` sur erreur réseau transitoire (timeout, 5xx), avec back-off (ex. 300 ms, 900 ms). Une erreur 4xx (clé/offre) n'est **jamais** réessayée — c'est un problème de config, pas de réseau. Cela évite de marteler le serveur depuis des milliers d'appareils lors d'un incident.

### 5.3 Pourquoi la vérif de signature côté client est indispensable

Sans vérification cryptographique, `shared_preferences` est un simple fichier modifiable sur appareil rooté : un utilisateur pourrait écrire `{"actif": true}` et obtenir un accès permanent gratuit. La vérif de signature l'empêche : le token ne peut être produit que par le serveur Kola.

### 5.4 RS256, jamais HS256 (règle absolue, cf. CLAUDE.md)

Le token est signé côté serveur par une **clé privée RS256** jamais partagée. Le SDK n'embarque que la **clé publique** (codée en dur dans `kola_token.dart`), qui ne permet que la vérification. Une clé symétrique (HS256) embarquée serait extractible par rétro-ingénierie et permettrait de forger des accès premium pour **toutes** les apps Kola — interdit.

> **Note multi-tenant** : la clé publique embarquée est celle de la **plateforme Kola**, commune à tous les tenants (c'est le serveur Kola qui signe tous les tokens, pour tous les tenants). Il n'y a donc pas de clé par tenant à distribuer — un seul package, une seule clé publique, tous les tenants servis.

### 5.5 Format du payload JWT

```json
{
  "identifiantExterne": "+237671960300",
  "offreSlug": "premium",
  "tenantId": "clx...",
  "actif": true,
  "dateEcheance": "2026-08-18T00:00:00.000Z",
  "iat": 1752840000,
  "exp": 1753104000
}
```

- `exp` = `iat + 72h`, fixé côté serveur (expiration du **token**, pas de l'abonnement).
- Aucune donnée sensible (pas d'email, pas de secret) : le token est stocké en clair sur l'appareil.

### 5.6 Stockage local

Clé `shared_preferences` : `kola_token_{tenantId}_{offreSlug}_{identifiantExterne}` → JWT brut. Isolation par offre et par utilisateur (plusieurs offres = plusieurs tokens indépendants).

---

## 6. Gestion des erreurs

| Situation | Comportement | Exception ? |
|---|---|---|
| Pas de réseau, cache valide | `true`/`false` selon cache | Non |
| Pas de réseau, cache absent/expiré | `false` | Non |
| Clé publique invalide (401) | `false` + `KolaConfigException` via `onEvent` | Configurable |
| Offre inconnue (404 slug) | `false`, loggé si `onEvent` | Non |
| `init()` jamais appelé | `StateError` (bug développeur, doit crasher en debug) | Oui, seule exception qui remonte |

**Principe directeur** : toute erreur liée à l'environnement de l'utilisateur final (réseau, serveur down) est absorbée silencieusement → `false`, sans jamais interrompre l'app. Seule une erreur de configuration du développeur remonte bruyamment, pour être corrigée avant la mise en production.

L'enum `KolaRaisonRefus` (retournée dans `onEvent`) : `OFFLINE_SANS_CACHE`, `OFFLINE_EXPIRE`, `TOKEN_ALTERE`, `CLE_INVALIDE`, `OFFRE_INCONNUE`, `ERREUR_RESEAU`.

---

## 7. Dépendances

| Package | Usage |
|---|---|
| `http` ou `dio` | Appels réseau (retry/back-off) |
| `shared_preferences` | Cache local du token |
| `dart_jsonwebtoken` (ou équivalent) | Décodage + vérif RS256 |
| `flutter_test` (dev) | Tests unitaires |

Aucune dépendance à un SDK de paiement, à Firebase, ou à un système d'auth tiers. Le SDK reste agnostique de la façon dont l'éditeur identifie ses utilisateurs (`identifiantExterne` = simple string E.164 fournie par l'app).

---

## 8. Plateformes

- **Android d'abord**, cohérent avec le hors-périmètre iOS de `kola-web`.
- Plugin Flutter **pur Dart** (aucun code natif Kotlin/Swift) : tout passe par HTTP + stockage local standard → **iOS fonctionnera sans portage** le jour où le hors-périmètre sera levé, sans travail spécifique au SDK.

---

## 9. Tests

1. **`kola_client_test.dart`** — mock HTTP : `isActive()` renvoie bien `actif` du serveur en succès.
2. **`kola_cache_test.dart`** — écriture/lecture par clé `(tenant, offre, identifiant)` + isolation entre offres.
3. **`kola_token_test.dart`** — token valide accepté ; signature altérée rejetée ; token expiré rejeté même si signature valide.
4. **`kola_retry_test.dart`** — retry + back-off sur 5xx/timeout ; **pas** de retry sur 401/404.
5. **`kola_offline_scenario_test.dart`** — bout en bout : succès (cache) → coupure réseau → `true` maintenu → avance du temps > 72 h → `false`.

Correspondent aux scénarios 6 (offline) et complètent le plan de test global de `kola-web`.

---

## 10. Publication et versioning

- **V1** : **publication sur pub.dev** (`kola_sdk`), pour que tout éditeur l'ajoute via `pubspec.yaml`.
  ```yaml
  dependencies:
    kola_sdk: ^1.0.0
  ```
- **SemVer strict** dès `1.0.0` : une rupture d'API → montée de version majeure, jamais de rupture silencieuse. `CHANGELOG.md` tenu à jour.
- **Compatibilité serveur** : le SDK cible `/api/v1/...` ; l'endpoint est versionné → un changement serveur incompatible passe par `/api/v2/...`, jamais par une rupture de `/api/v1`.

---

## 11. Exemple d'intégration

```dart
// main.dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Kola.init(const KolaConfig(
    cleApiPublique: 'pub_xxx',
    baseUrl: 'https://api.kola.app',
    onEvent: _logKola, // remonte les raisons de refus en debug
  ));
  runApp(MyApp());
}

// écran premium — réactif
class PremiumScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return StreamBuilder<bool>(
      stream: Kola.flux('premium', identifiantExterne: telephoneUtilisateur),
      builder: (context, snap) {
        if (!snap.hasData) return const LoadingWidget();
        return snap.data!
            ? const ContenuPremiumWidget()
            : const MurPremiumWidget(); // invite à un lien envoyé par WhatsApp — jamais un bouton "Payer" dans l'app
      },
    );
  }
}
```

Le `MurPremiumWidget` **n'affiche jamais** de prix ni de bouton de paiement : il informe, et l'appel à l'action réel (le lien de paiement) arrive par WhatsApp, hors app (§1).

---

## 12. Critères d'acceptation (produit fini)

Le SDK est prêt à publier quand :

1. `Kola.init()` puis `isActive('premium', identifiantExterne: x)` renvoie la bonne valeur contre l'API `kola-web`, sur au moins deux tenants distincts (même binaire, clés publiques différentes).
2. Après coupure réseau, `isActive()` continue de renvoyer `true` tant que le token en cache n'a pas dépassé la durée offline configurée.
3. Un token altéré dans le cache est rejeté → `false`.
4. Aucun crash quel que soit le scénario réseau (timeout, 500, offline, clé invalide).
5. **Aucune méthode publique n'accepte de paramètre lié au paiement** (revue de code manuelle avant chaque release — critère bloquant).
6. Le retry n'est déclenché que sur erreurs transitoires, jamais sur 4xx.
7. `onEvent` remonte une `KolaRaisonRefus` exploitable pour chaque cas de `false`.
8. Publié sur pub.dev avec `CHANGELOG` et exemple fonctionnel.

---

## 13. Hors périmètre du SDK (rappel, à tout horizon)

- Aucune UI de paiement, aucun prix affiché, aucune ouverture de lien de paiement depuis le SDK.
- Aucune gestion d'authentification — `identifiantExterne` est fourni tel quel par l'app.
- Aucune logique liée au prestataire de paiement (Campay/MeSomb/…) : elle vit à 100 % côté serveur.
- Aucun stockage de données personnelles au-delà du JWT de cache (§5.5).
