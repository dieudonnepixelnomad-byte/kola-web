# kola_sdk — Cahier des charges (package Flutter)

> Rédigé le 18/07/2026 · Porteur : Gwet Bikoun Dieudonné, Douala
> Complète le cahier des charges technique v2 de Kola (§4.6 y renvoie désormais à ce document).
> Package Flutter/Dart consommé par l'app mobile de l'éditeur (au MVP : l'app de l'auteur lui-même).

---

## 1. Rôle du SDK et limite stricte de son périmètre

Le SDK répond à une seule question : **cet utilisateur a-t-il un accès actif à telle offre ?** Rien de plus.

**Interdiction absolue, à ne jamais lever, même en V3** : le SDK ne doit jamais proposer de fonction qui ouvre une page de paiement, affiche un prix, ou déclenche un achat depuis l'intérieur de l'app. C'est la condition de conformité Google Play (app en consommation seule). Cette contrainte doit être visible dans le code lui-même — aucune méthode publique du package ne doit accepter un montant, un numéro de téléphone, ou une URL de paiement en paramètre.

---

## 2. Architecture interne du package

### 2.1 Structure du repo

```
kola_sdk/
├── lib/
│   ├── kola_sdk.dart                 # point d'entrée public (exports uniquement)
│   └── src/
│       ├── kola.dart                 # façade publique (Kola.init, Kola.isActive)
│       ├── kola_client.dart          # appels HTTP vers l'API kola-web
│       ├── kola_cache.dart           # lecture/écriture shared_preferences
│       ├── kola_token.dart           # décodage + vérification signature JWT
│       ├── kola_exceptions.dart      # exceptions typées du SDK
│       └── models/
│           ├── subscription_status.dart
│           └── kola_config.dart
├── test/
│   ├── kola_client_test.dart
│   ├── kola_cache_test.dart
│   ├── kola_token_test.dart
│   └── kola_offline_scenario_test.dart
├── example/
│   └── lib/main.dart                 # app Flutter minimale de démonstration
├── pubspec.yaml
└── README.md
```

### 2.2 Couches et responsabilités

| Couche | Responsabilité | Ne fait jamais |
|---|---|---|
| `Kola` (façade) | Expose l'API publique, orchestre les 3 couches ci-dessous | N'a pas de logique métier propre |
| `KolaClient` | Appel HTTP à `GET /api/v1/subscriptions/status`, gestion timeout/retry | Ne décide jamais seul si l'accès est actif |
| `KolaCache` | Stocke/lit le dernier token JWT reçu, par couple `(tenant, offre, identifiantExterne)` | Ne fait aucune requête réseau |
| `KolaToken` | Décode le JWT, vérifie signature + expiration | Ne fait aucun accès disque ni réseau |

Cette séparation est volontaire : chaque couche est testable isolément (mock HTTP pour `KolaClient`, `SharedPreferences.setMockInitialValues` pour `KolaCache`, JWT de test signés pour `KolaToken`).

---

## 3. API publique

```dart
class Kola {
  /// À appeler une fois, typiquement dans main() avant runApp().
  static Future<void> init({
    required String cleApiPublique,
    required String baseUrl, // ex: https://kola-web.vercel.app
  });

  /// Retourne true si l'utilisateur a un accès actif (ACTIF ou TOLERANCE) à l'offre donnée.
  /// Ne lève jamais d'exception vers l'appelant : en cas d'erreur réseau ET de cache absent/expiré,
  /// retourne false (fail-closed, cf. §5).
  ///
  /// DÉCISION MVP : `identifiantExterne` doit être le numéro de téléphone de l'utilisateur,
  /// normalisé au format E.164 (ex. "+237671960300") — PAS un UID généré localement. Ce choix
  /// permet à un utilisateur de restaurer son accès après désinstallation/réinstallation en
  /// resaisissant simplement son numéro (cf. §4bis "Restauration d'accès"). La normalisation
  /// (préfixe pays, suppression des espaces) est à la charge de l'app appelante avant l'appel.
  static Future<bool> isActive(
    String offreSlug, {
    required String identifiantExterne,
  });

  /// Optionnel : force un rafraîchissement réseau, ignore le cache.
  /// Utile après un paiement pour éviter d'attendre la prochaine vérification naturelle.
  static Future<bool> refresh(
    String offreSlug, {
    required String identifiantExterne,
  });

  /// Optionnel : expose la date d'échéance en cache, pour affichage informatif
  /// dans l'app ("ton accès expire le ..."). Ne doit jamais être utilisé pour
  /// décider d'un accès — seul isActive() fait foi.
  static Future<DateTime?> dateEcheanceEnCache(
    String offreSlug, {
    required String identifiantExterne,
  });
}
```

**Ce qui n'existe explicitement pas dans l'API publique** : `openPaymentPage()`, `subscribe()`, `getPrice()`, ou toute méthode acceptant un montant. Absence volontaire, cf. §1.

---

## 4. Cas d'usage détaillés

- **US-SDK-01** — En tant qu'éditeur, je veux initialiser le SDK une seule fois au démarrage de l'app, afin de ne pas répéter la configuration à chaque écran.
- **US-SDK-02** — En tant qu'éditeur, je veux appeler `isActive('premium', identifiantExterne: uid)` avant d'afficher un contenu payant, afin de décider en une ligne si je montre le contenu ou le mur premium.
- **US-SDK-03** — En tant qu'utilisateur final venant de payer, je veux que l'app détecte mon nouvel accès sans redémarrer l'application, afin d'accéder immédiatement au contenu débloqué (couvert par `Kola.refresh()`, appelé par l'éditeur au retour de la page de paiement web, ex. via un lien de retour ou un bouton "j'ai payé, vérifier").
- **US-SDK-04** — En tant qu'utilisateur final hors ligne depuis moins de 72h, je veux garder mon accès premium acquis, afin de ne pas être pénalisé par une coupure réseau indépendante de ma volonté.
- **US-SDK-05** — En tant qu'utilisateur final dont le token en cache a dépassé 72h sans renouvellement réseau, je veux que l'accès repasse à `false`, afin d'empêcher un contournement permanent via le mode avion.
- **US-SDK-06** — En tant qu'éditeur, je veux que toute erreur (réseau, clé invalide, offre inconnue) se traduise par `false` et jamais par un crash, afin que mon app reste stable même si Kola est temporairement indisponible.
- **US-SDK-07** — En tant qu'éditeur, je veux voir dans mes logs de debug la raison exacte d'un retour `false` (offline expiré / offre inconnue / clé invalide / etc.), afin de diagnostiquer un problème sans deviner.
- **US-SDK-08** — En tant qu'utilisateur final ayant désinstallé puis réinstallé l'app, je veux pouvoir restaurer mon accès premium en resaisissant simplement mon numéro de téléphone, afin de ne pas perdre un abonnement que j'ai réellement payé.

---

## 4bis. Restauration d'accès après réinstallation

**Contexte** : le cache local (`shared_preferences`) est vidé à la désinstallation, comme tout stockage propre à l'app. Sans mécanisme de restauration, un utilisateur qui réinstalle perdrait l'accès à un abonnement pourtant actif côté serveur.

**Solution retenue** : comme `identifiantExterne` = numéro de téléphone (cf. §3, décision MVP), la restauration ne nécessite **aucune nouvelle méthode SDK** — un simple appel à `isActive()` avec le numéro resaisi suffit à retrouver le même `Abonne` côté serveur et à recevoir un nouveau token JWT valide.

**Ce que l'éditeur doit construire côté app** (hors périmètre du SDK lui-même, mais à documenter dans le README du package) :
- Un écran "Déjà abonné ? Entrez votre numéro", affiché par exemple au premier lancement ou accessible depuis les paramètres.
- Il appelle `Kola.isActive('premium', identifiantExterne: numéroSaisi)` — si `true`, l'app peut afficher une confirmation ("Accès restauré !") et rafraîchir son état local.

**Décision de sécurité MVP** : aucune vérification du numéro (pas d'OTP/SMS) — quiconque connaît un numéro peut interroger son statut, mais ne peut ni modifier ni voler l'abonnement associé, seulement consulter s'il est actif. Risque jugé acceptable au MVP ; à réévaluer en V1 si le produit prend de l'ampleur.

---

## 5. Comportement réseau et cache — logique complète

### 5.1 Séquence d'un appel `isActive()`

```
isActive(offreSlug, identifiantExterne)
  │
  ├─▶ Tente GET /api/v1/subscriptions/status (timeout 5s)
  │     │
  │     ├─ Succès (200) ──▶ Stocke le nouveau token en cache
  │     │                    Retourne `actif` de la réponse serveur
  │     │
  │     ├─ Erreur réseau (timeout, pas de connexion, 5xx)
  │     │     │
  │     │     └─▶ Lit le token en cache pour (tenant, offreSlug, identifiantExterne)
  │     │           │
  │     │           ├─ Aucun token en cache ──▶ retourne false
  │     │           │
  │     │           ├─ Token présent, vérifie signature (clé publique embarquée)
  │     │           │     │
  │     │           │     ├─ Signature invalide (altération) ──▶ retourne false
  │     │           │     │
  │     │           │     └─ Signature valide, vérifie expiresAt
  │     │           │           │
  │     │           │           ├─ expiresAt < now() ──▶ retourne false
  │     │           │           │
  │     │           │           └─ expiresAt >= now() ──▶ retourne true
  │     │
  │     └─ Réponse 401/403 (clé invalide) ──▶ lève KolaConfigException (erreur de config, pas un cas offline normal — l'éditeur doit le corriger, pas l'utilisateur)
```

### 5.2 Pourquoi une vérification de signature côté client est indispensable

Sans vérification cryptographique, le cache local (`shared_preferences`) est un simple fichier lisible et modifiable sur un appareil rooté/jailbreaké. Un utilisateur malveillant pourrait écrire directement `{"actif": true}` dans le cache et obtenir un accès premium permanent sans jamais payer. La vérification de signature empêche cette falsification : le token ne peut être produit que par le serveur Kola, qui seul détient la clé privée.

### 5.3 Choix cryptographique : signature asymétrique (RS256), pas HMAC

**Point de vigilance technique important** : le token ne doit **jamais** être signé avec un algorithme symétrique (HS256) dont la clé secrète serait embarquée dans l'app. Une clé symétrique dans un binaire Flutter est extractible par rétro-ingénierie (l'app est distribuée publiquement) — quiconque l'extrait peut forger n'importe quel token valide et débloquer l'accès premium pour tout le monde, sur toutes les apps utilisant Kola.

**Règle retenue** : le serveur `kola-web` signe les tokens avec une **clé privée RS256**, jamais partagée. Le SDK embarque uniquement la **clé publique** correspondante, codée en dur dans `kola_token.dart`. La clé publique ne permet que la vérification, jamais la génération — même extraite, elle est sans danger.

### 5.4 Format du payload JWT

```json
{
  "identifiantExterne": "uid-firebase-xyz",
  "offreSlug": "premium",
  "tenantId": "clx...",
  "actif": true,
  "dateEcheance": "2026-08-18T00:00:00.000Z",
  "iat": 1752840000,
  "exp": 1753104000
}
```

- `exp` (expiration du token, pas de l'abonnement) = `iat + 72h`, fixé côté serveur.
- Le payload ne contient **aucune donnée sensible** (pas de téléphone, pas d'email) : le token est stocké en clair sur l'appareil de l'utilisateur final, donc tout ce qu'il contient doit pouvoir être lu sans risque.

### 5.5 Stockage local

Clé `shared_preferences` : `kola_token_{tenantId}_{offreSlug}_{identifiantExterne}` → valeur = JWT brut (string).

Isolation par offre et par utilisateur : si l'app propose plusieurs offres (ex. `premium` et `premium_plus`), chaque offre a son propre token en cache, indépendant des autres.

---

## 6. Gestion des erreurs

| Situation | Comportement du SDK | Exception levée ? |
|---|---|---|
| Pas de réseau, cache valide | Retourne `true`/`false` selon le cache (§5.1) | Non |
| Pas de réseau, cache absent ou expiré | Retourne `false` | Non |
| Clé API publique invalide (401) | `false` retourné à `isActive()`, mais `KolaConfigException` disponible via un callback de log optionnel (`Kola.onError`) | Configurable |
| Offre inconnue côté serveur (404 sur le slug) | Retourne `false` | Non, mais loggé si `onError` configuré |
| `init()` jamais appelé avant `isActive()` | `StateError` (erreur de développeur, doit crasher en debug pour être détectée tôt) | Oui, uniquement celle-ci |

**Principe directeur** : toute erreur liée à l'environnement d'exécution de l'utilisateur final (réseau, serveur down) doit être absorbée silencieusement et se traduire par un `false` sans jamais interrompre l'app. Seule une erreur de configuration du développeur (`init()` non appelé) doit remonter bruyamment, pour être corrigée en développement avant la mise en production.

---

## 7. Dépendances du package

| Package | Usage |
|---|---|
| `http` ou `dio` | Appels réseau vers l'API Kola |
| `shared_preferences` | Cache local du token |
| `dart_jsonwebtoken` (ou équivalent) | Décodage et vérification RS256 du JWT |
| `flutter_test` (dev) | Tests unitaires |

Aucune dépendance à un SDK de paiement, à Firebase, ou à un système d'authentification tiers — le SDK reste agnostique de la façon dont l'éditeur identifie ses utilisateurs (`identifiantExterne` est une simple string fournie par l'app appelante).

---

## 8. Plateformes supportées

- **Android uniquement au MVP**, cohérent avec le hors-périmètre iOS du cahier des charges général.
- Le package doit néanmoins être structuré comme un plugin Flutter pur Dart (pas de code natif Kotlin/Swift nécessaire, puisque tout passe par HTTP et stockage local standard) — ce qui signifie qu'**iOS fonctionnera probablement sans modification** le jour où le hors-périmètre sera levé, sans travail de portage spécifique au SDK.

---

## 9. Tests prévus

1. **`kola_client_test.dart`** — mock du serveur HTTP : vérifie que `isActive()` retourne bien la valeur `actif` du serveur en cas de succès réseau.
2. **`kola_cache_test.dart`** — vérifie l'écriture/lecture correcte du token par clé `(tenant, offre, identifiantExterne)`, et l'isolation entre offres différentes.
3. **`kola_token_test.dart`** — vérifie :
   - qu'un token valide et non expiré passe la vérification
   - qu'un token dont la signature a été altérée (byte modifié) est rejeté
   - qu'un token expiré (`exp` dépassé) est rejeté même si la signature est valide
4. **`kola_offline_scenario_test.dart`** — scénario bout en bout : premier appel réussi (token mis en cache) → simulation de coupure réseau → `isActive()` retourne toujours `true` → avance artificiellement le temps de plus de 72h → `isActive()` retourne `false`.

Ces tests correspondent directement au scénario 6 du plan de test global (cahier v2, §6).

---

## 10. Publication et versioning

- **MVP** : le package n'est pas publié sur pub.dev. Il est référencé en dépendance Git directe dans le `pubspec.yaml` de l'app de l'auteur :
  ```yaml
  dependencies:
    kola_sdk:
      git:
        url: https://github.com/.../kola_sdk.git
        ref: main
  ```
- **V1** (quand d'autres éditeurs intègrent Kola) : publication sur pub.dev en package privé, puis public si Kola devient un produit ouvert.
- **Versioning** : SemVer strict dès la première version taguée (`0.1.0`), pour que les éditeurs puissent figer une version dans leur `pubspec.yaml` sans risquer une rupture silencieuse.

---

## 11. Exemple d'intégration (app cliente)

```dart
// main.dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Kola.init(
    cleApiPublique: 'pub_xxx',
    baseUrl: 'https://kola-web.vercel.app',
  );
  runApp(MyApp());
}

// écran de contenu premium
class PremiumScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return FutureBuilder<bool>(
      future: Kola.isActive('premium', identifiantExterne: currentUserId),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return LoadingWidget();
        return snapshot.data!
            ? ContenuPremiumWidget()
            : MurPremiumWidget(); // invite à visiter le lien de paiement, envoyé par WhatsApp/email — jamais un bouton dans l'app
      },
    );
  }
}
```

---

## 12. Critères d'acceptation du SDK (MVP)

Le SDK est considéré fonctionnel quand :

1. `Kola.init()` puis `Kola.isActive('premium', identifiantExterne: x)` retourne la bonne valeur en environnement réseau normal, contre l'API sandbox `kola-web`.
2. Après coupure réseau simulée, `isActive()` continue de retourner `true` tant que le token en cache n'a pas dépassé 72h.
3. Un token altéré manuellement dans le cache (simulateur de falsification) est rejeté, et `isActive()` retourne `false`.
4. Aucun crash de l'app cliente n'est observé quel que soit le scénario réseau testé (timeout, 500, pas de connexion, clé invalide).
5. Aucune méthode publique du package n'accepte de paramètre lié au paiement (revue de code manuelle avant chaque release).

---

## 13. Hors périmètre du SDK (rappel, à tout horizon)

- Aucune UI de paiement, aucun affichage de prix, aucune ouverture de lien de paiement depuis le SDK.
- Aucune gestion d'authentification — `identifiantExterne` est fourni tel quel par l'app appelante, le SDK ne le valide ni ne le génère.
- Aucun stockage de données personnelles au-delà de ce qui est strictement nécessaire au cache d'état (le JWT, cf. §5.4).
