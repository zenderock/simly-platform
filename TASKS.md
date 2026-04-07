# White-Label Subscription ($120/mois) — Plan d'implémentation

**Objectif global** : Permettre à des clients (ex: Ayoub) d'avoir leur propre système de gateway SMS sous leur marque, avec leur logo, leur nom d'app, et la capacité de scanner des QR codes via leur propre API — le tout propulsé par l'infrastructure Simly en arrière-plan.

---

## PHASE 1 — Plan & Stripe (Backend)

> **Objectif** : Créer le plan `white_label` dans le système, le connecter à Stripe à $120/mois, et l'activer automatiquement via webhook quand un client souscrit.

---

### [1.1] Ajouter la constante `PlanWhiteLabel` dans `model/plan.go`

**Fichier :** `backend/internal/model/plan.go`

**Objectif :** Définir le plan white-label comme une entité de première classe dans le système. Sans cette constante, aucune autre partie du code ne peut référencer ce plan de manière fiable.

**Ce qu'il faut faire :**
- Ajouter `PlanWhiteLabel = "white_label"` avec les autres constantes (ligne ~31)
- Ajouter une entrée complète dans le tableau `AvailablePlans` :
  ```go
  {
    ID:          "white_label",
    Name:        "White-Label",
    Price:       12000, // $120 en cents
    Description: "Your brand, your system",
    Features: []string{
      "Unlimited SMS",
      "Unlimited devices",
      "Unlimited apps",
      "QR scan via public API",
      "Custom branding (logo + name)",
      "Dedicated mobile app",
    },
    Limits: PlanLimits{
      SMSMonthly:               -1,  // illimité
      SMSBurst:                 200,
      MaxDevices:               -1,  // illimité
      MaxSimsPerDevice:         4,
      MaxApplications:          -1,  // illimité
      MaxContacts:              -1,  // illimité
      MaxCampaigns:             -1,  // illimité
      MaxRecipientsPerCampaign: -1,  // illimité
    },
  }
  ```

**Pourquoi -1 partout :** Le système interprète -1 comme "illimité" dans `feature_limit_manager.go`. Le client white-label paie $120/mois donc il mérite les mêmes limites que l'Enterprise ($99) + les features exclusives.

---

### [1.2] Ajouter le champ `IsWhiteLabel bool` dans `model/organization.go`

**Fichier :** `backend/internal/model/organization.go`

**Objectif :** Avoir un flag explicite sur chaque organisation pour savoir si elle a le droit aux features white-label (QR API, branding, etc.). Cela permet de faire des vérifications claires dans le code sans comparer des strings de plan.

**Ce qu'il faut faire :**
- Ajouter dans le struct `Organization` :
  ```go
  IsWhiteLabel bool `json:"is_white_label" db:"is_white_label"`
  ```
- Mettre à jour le scan dans `organization_store.go` pour inclure ce champ

**Pourquoi un flag séparé et pas juste vérifier `Plan == "white_label"` :** Un flag booléen est plus robuste — si demain on veut offrir le white-label en addon sur un autre plan, il suffit de mettre le flag à true sans changer la logique.

---

### [1.3] Créer la migration SQL `add_white_label_to_organizations`

**Fichier à créer :** `backend/migrations/000XX_add_white_label_to_organizations.up.sql`

**Objectif :** Persister le flag white-label en base de données. Sans cette migration, le champ `IsWhiteLabel` du modèle Go n'a nulle part où se stocker.

**Contenu :**
```sql
-- UP
ALTER TABLE organizations ADD COLUMN is_white_label BOOLEAN NOT NULL DEFAULT FALSE;

-- DOWN (fichier .down.sql)
ALTER TABLE organizations DROP COLUMN is_white_label;
```

**Note :** Le numéro de migration doit suivre le dernier fichier existant dans `backend/migrations/`. Vérifier quel est le dernier numéro avant de créer.

---

### [1.4] Ajouter `StripePriceWhiteLabel` dans `config/config.go`

**Fichier :** `backend/internal/config/config.go`

**Objectif :** Permettre au backend de connaître le Stripe Price ID du plan white-label via variable d'environnement. Sans ça, le webhook Stripe ne peut pas identifier ce plan quand un client paie.

**Ce qu'il faut faire :**
- Ajouter dans le struct `Config` :
  ```go
  StripePriceWhiteLabel string
  ```
- Ajouter le chargement env :
  ```go
  StripePriceWhiteLabel: getEnv("STRIPE_PRICE_WHITE_LABEL", "price_white_label_default"),
  ```
- Ajouter la variable dans le fichier `.env` / `.env.example` :
  ```
  STRIPE_PRICE_WHITE_LABEL=price_xxxxxxxxxxxxx
  ```

**Action Stripe requise :** Créer le produit + price à $120/mois dans le dashboard Stripe, puis copier le Price ID ici.

---

### [1.5] Mettre à jour `billing_service.go` pour gérer le plan white-label

**Fichier :** `backend/internal/core/billing_service.go`

**Objectif :** Quand Stripe envoie un webhook `checkout.session.completed` pour un client qui a souscrit au plan white-label, le système doit reconnaître ce Price ID et appliquer les bonnes limites + activer le flag white-label.

**Ce qu'il faut faire :**
1. Ajouter `stripePriceWhiteLabel string` dans le struct `BillingService`
2. Mettre à jour le constructeur pour accepter ce paramètre
3. Dans `HandleWebhook`, dans le switch/if qui mappe priceID → planID (lignes ~116-125) :
   ```go
   case priceID == s.stripePriceWhiteLabel:
       planID = model.PlanWhiteLabel
   ```
4. Passer `stripePriceWhiteLabel` lors de l'instanciation dans `main.go` ou le container DI

---

### [1.6] Mettre à jour `UpdateOrganizationPlan` dans `organization_store.go`

**Fichier :** `backend/internal/store/organization_store.go`

**Objectif :** Quand le plan d'une organisation change, la query SQL doit aussi mettre à jour le flag `is_white_label`. Sans ça, même si le plan est bien mis à jour, le flag restera à `false` et les features white-label seront bloquées.

**Ce qu'il faut faire :**
- Dans la fonction `UpdateOrganizationPlan` (ligne ~160), modifier la query SQL pour inclure :
  ```sql
  is_white_label = $X
  ```
- Ajouter le paramètre booléen à la fonction :
  ```go
  func (s *Store) UpdateOrganizationPlan(ctx context.Context, orgID int, plan string, isWhiteLabel bool, ...) error
  ```
- La valeur : `isWhiteLabel = (plan == model.PlanWhiteLabel)`
- Mettre à jour le scan dans `GetOrganizationByID` pour lire `is_white_label`

---

### [1.7] Exposer le Stripe Price ID white-label dans `ListPlans` (organization_handler.go)

**Fichier :** `backend/internal/api/organization_handler.go`

**Objectif :** Quand le frontend appelle l'API pour afficher les plans disponibles, il reçoit les Stripe Price IDs pour créer la session de paiement. Sans ce cas, le bouton "Subscribe" pour le plan white-label n'aura pas de Price ID et le checkout Stripe échouera.

**Ce qu'il faut faire :**
- Ajouter `stripePriceWhiteLabel` dans le handler struct
- Dans la fonction qui retourne les plans avec prix Stripe, ajouter :
  ```go
  case model.PlanWhiteLabel:
      plan.StripePriceID = &h.stripePriceWhiteLabel
  ```

---

## PHASE 2 — API Publique QR Scan

> **Objectif** : Permettre aux clients white-label de générer des QR codes et de lier des appareils depuis **leur propre système** via l'API publique `/v1/`, sans passer par le dashboard Simly.

---

### [2.1] Exposer les endpoints de device linking sur `/v1/`

**Fichier :** `backend/internal/api/public_router.go`

**Objectif :** Aujourd'hui, `POST /api/devices/link-token` et `GET /api/devices/link-token/{token}` sont uniquement accessibles depuis le dashboard authentifié JWT. Pour qu'Ayoub puisse intégrer le scan QR dans son propre système, ces endpoints doivent être disponibles sur l'API publique avec une API key.

**Ce qu'il faut faire :**
- Ajouter dans le router public (après les routes existantes) :
  ```go
  r.Post("/v1/devices/link-token", deviceHandler.GenerateLinkToken)
  r.Get("/v1/devices/link-token/{token}", deviceHandler.GetLinkTokenStatus)
  ```
- `POST /v1/devices/link` est déjà public (utilisé par l'app mobile) — ne pas toucher

**Flow résultant pour le client white-label :**
```
Son système → POST /v1/devices/link-token (API key) → reçoit token
Son système → affiche QR code avec le token
Son app mobile → scanne QR → POST /v1/devices/link (public)
Son système → poll GET /v1/devices/link-token/{token} → confirme liaison
```

---

### [2.2] Ajouter le guard `is_white_label` dans `device_handler.go`

**Fichier :** `backend/internal/api/device_handler.go`

**Objectif :** Ces nouveaux endpoints `/v1/` doivent être réservés aux clients white-label uniquement. Un client sur le plan Professional ou Enterprise ne doit pas pouvoir les utiliser (c'est une feature exclusive à $120/mois).

**Ce qu'il faut faire :**
- Au début de `GenerateLinkToken` et `GetLinkTokenStatus`, après récupération de l'orgID :
  ```go
  org, err := h.orgService.GetOrganizationByID(ctx, orgID)
  if err != nil || !org.IsWhiteLabel {
      http.Error(w, `{"error": "white-label plan required"}`, http.StatusForbidden)
      return
  }
  ```

**Note :** Utiliser `http.StatusForbidden` (403) et non 401 — le client est bien authentifié, il n'a juste pas le bon plan.

---

## PHASE 3 — App Mobile White-Label (Flutter)

> **Objectif** : Permettre à chaque client white-label d'avoir une app mobile à son nom et avec son logo, sans avoir à builder un APK séparé pour chaque client. L'app lira sa configuration de branding depuis l'API au premier lancement.

---

### [3.1] Ajouter les champs branding dans `model/organization.go`

**Fichier :** `backend/internal/model/organization.go`

**Objectif :** Stocker la configuration visuelle de chaque client white-label (nom de leur app, logo, couleur principale) directement sur l'organisation. C'est la source de vérité pour le branding.

**Ce qu'il faut faire :**
- Ajouter dans le struct `Organization` :
  ```go
  BrandingName    *string `json:"branding_name" db:"branding_name"`
  BrandingLogoURL *string `json:"branding_logo_url" db:"branding_logo_url"`
  BrandingColor   *string `json:"branding_color" db:"branding_color"`
  ```
- Types pointeurs (`*string`) car ces champs sont optionnels — seuls les clients white-label les remplissent

---

### [3.2] Créer la migration SQL `add_branding_to_organizations`

**Fichier à créer :** `backend/migrations/000XX_add_branding_to_organizations.up.sql`

**Objectif :** Persister les champs branding en base de données.

**Contenu :**
```sql
-- UP
ALTER TABLE organizations
  ADD COLUMN branding_name VARCHAR(100),
  ADD COLUMN branding_logo_url TEXT,
  ADD COLUMN branding_color VARCHAR(7);  -- format hex #RRGGBB

-- DOWN
ALTER TABLE organizations
  DROP COLUMN branding_name,
  DROP COLUMN branding_logo_url,
  DROP COLUMN branding_color;
```

---

### [3.3] Créer l'endpoint `GET /v1/branding`

**Fichier :** Créer `backend/internal/api/branding_handler.go` + ajouter la route dans `public_router.go`

**Objectif :** Fournir à l'app mobile les informations de branding dès le démarrage. L'app appelle cet endpoint (authentifié par API key encodée dans l'APK ou dans le QR initial) et reçoit le nom, logo et couleur à afficher.

**Response body :**
```json
{
  "app_name": "Ayoub Gateway",
  "logo_url": "https://r2.simly.io/logos/ayoub-logo.png",
  "primary_color": "#1A73E8"
}
```

**Ce qu'il faut faire :**
1. Créer `BrandingHandler` avec `GetBranding(w, r)` :
   - Récupère l'orgID depuis le middleware API key
   - Vérifie `org.IsWhiteLabel`
   - Retourne les champs branding (avec valeurs par défaut Simly si non renseignés)
2. Ajouter dans `public_router.go` :
   ```go
   r.Get("/v1/branding", brandingHandler.GetBranding)
   ```
3. Ajouter un endpoint `PUT /api/organization/branding` (dashboard privé) pour que le client puisse configurer son branding via le dashboard Simly

---

### [3.4] Flutter : appel `GET /v1/branding` au démarrage + branding dynamique

**Fichier :** `mobile/lib/app/modules/auth/controllers/auth_controller.dart`  
**Fichier :** `mobile/lib/app/data/providers/api_provider.dart`

**Objectif :** L'app Flutter doit lire sa configuration de branding depuis l'API au premier lancement, avant d'afficher quoi que ce soit à l'utilisateur. Ainsi un seul APK peut servir tous les clients white-label.

**Ce qu'il faut faire :**
1. Dans `api_provider.dart`, ajouter :
   ```dart
   Future<Map<String, dynamic>> getBranding() async {
     final response = await _dio.get('/v1/branding');
     return response.data;
   }
   ```
2. Créer un `BrandingService` (GetX service) qui :
   - Appelle `getBranding()` au démarrage
   - Stocke `appName`, `logoUrl`, `primaryColor` en mémoire
   - Fournit des valeurs par défaut (branding Simly) si l'appel échoue
3. Dans les vues Flutter, remplacer les textes et couleurs hardcodés par les valeurs du `BrandingService`
4. Stocker l'API key du client dans `SharedPreferences` ou la passer via deep link / QR initial

---

### [3.5] Flutter : renommer l'app en nom neutre "Gateway"

**Fichiers :**
- `mobile/android/app/src/main/AndroidManifest.xml` — ligne 19
- `mobile/pubspec.yaml` — ligne 132

**Objectif :** L'APK de base ne doit pas afficher "SIMLY Gateway" sur l'écran du téléphone du client white-label. Le nom visible dans le launcher Android doit être neutre jusqu'à ce que le branding dynamique soit chargé, ou être remplacé par le nom du client.

**Ce qu'il faut faire :**
- `AndroidManifest.xml` : changer `android:label="SIMLY Gateway"` → `android:label="Gateway"`
- `pubspec.yaml` : changer `name: "SIMLY Gateway"` → `name: "Gateway"`
- Optionnel (avancé) : utiliser `flutter_launcher_name` pour changer le label dynamiquement au runtime

---

## PHASE 4 — Frontend Pricing

> **Objectif** : Afficher le plan White-Label sur la page publique `/pricing` pour que les prospects puissent voir l'offre et cliquer sur "Subscribe".

---

### [4.1] Ajouter le plan White-Label sur la page pricing

**Fichier :** `frontend/app/pricing/page.tsx`

**Objectif :** Le plan white-label doit être visible et achetable depuis la page publique. Sans ça, les clients ne peuvent pas souscrire en self-service — tu dois les ajouter manuellement.

**Ce qu'il faut faire :**
- Ajouter un 4ème plan dans le tableau des plans (après Enterprise) :
  ```tsx
  {
    name: "White-Label",
    price: 120,
    category: "White-Label",
    initials: "W",
    description: "Your brand, your system",
    features: [
      "Everything in Enterprise",
      "Custom logo & app name",
      "QR scan via your own API",
      "Custom mobile app",
      "Dedicated support",
    ],
  }
  ```
- Lier le bouton "Subscribe" au Stripe Price ID white-label via `POST /api/billing/checkout`
- Ajouter un badge distinctif (ex: "Custom") pour le différencier visuellement des autres plans

---

## Récapitulatif

| Phase | Tâches | Durée estimée | Résultat |
|-------|--------|--------------|---------|
| 1 — Plan & Stripe | 1.1 → 1.7 | ~4h | Client peut payer et s'abonner |
| 2 — API QR Scan | 2.1 → 2.2 | ~2h | Client peut scanner dans son système |
| 3 — Mobile Flutter | 3.1 → 3.5 | ~1 jour | App à son nom et logo |
| 4 — Frontend Pricing | 4.1 | ~1h | Visible et achetable en self-service |

**Total estimé : ~2 jours de développement**

---

## Statut des tâches

- [ ] **[1.1]** Constante PlanWhiteLabel + AvailablePlans dans plan.go
- [ ] **[1.2]** Champ IsWhiteLabel dans organization.go
- [ ] **[1.3]** Migration SQL add_white_label_to_organizations
- [ ] **[1.4]** StripePriceWhiteLabel dans config.go + .env
- [ ] **[1.5]** billing_service.go : HandleWebhook + constructeur
- [ ] **[1.6]** organization_store.go : UpdateOrganizationPlan + scan
- [ ] **[1.7]** organization_handler.go : ListPlans avec price ID white-label
- [ ] **[2.1]** public_router.go : POST + GET /v1/devices/link-token
- [ ] **[2.2]** device_handler.go : guard is_white_label
- [ ] **[3.1]** Champs branding dans organization.go
- [ ] **[3.2]** Migration SQL add_branding_to_organizations
- [ ] **[3.3]** Endpoint GET /v1/branding + PUT /api/organization/branding
- [ ] **[3.4]** Flutter : BrandingService + appel API au démarrage
- [ ] **[3.5]** Flutter : renommer app en "Gateway" (AndroidManifest + pubspec)
- [ ] **[4.1]** Page pricing : ajouter plan White-Label ($120)
