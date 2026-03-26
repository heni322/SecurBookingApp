# 🛡 SecurBookingApp

Application mobile React Native pour la plateforme **SecurBook** — sécurité privée on-demand côté **CLIENT**.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | React Native 0.84 (New Architecture) |
| Langage | TypeScript 5.8 strict |
| Navigation | React Navigation 7 (Stack + Bottom Tabs) |
| État global | Zustand 5 |
| HTTP | Axios 1.x + intercepteur JWT auto-refresh |
| Backend | NestJS (`securbook-api`) via REST |

---

## Prérequis

- Node.js ≥ 22.11.0
- JDK 17 (Android)
- Xcode 15+ (iOS)
- Android Studio + émulateur API 33+

---

## Installation

```bash
# 1. Cloner le dépôt
git clone <repo-url> SecurBookingApp
cd SecurBookingApp

# 2. Installer les dépendances
npm install

# 3. Variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# 4. iOS — installer les pods
cd ios && bundle exec pod install && cd ..

# 5. Lancer le backend (dans un autre terminal)
cd ../securbook-api && npm run start:dev

# 6. Démarrer l'app
npm run android   # ou
npm run ios
```

---

## Structure du projet

```
src/
├── api/               # Couche HTTP — client Axios + endpoints par module
│   ├── client.ts      # Instance Axios + intercepteurs JWT
│   └── endpoints/     # auth · users · missions · bookings · quotes
│                      # payments · conversations · notifications
│                      # ratings · serviceTypes · upload
├── components/
│   ├── ui/            # Atomes : Button, Input, Badge, Card, Avatar…
│   └── domain/        # Molécules : MissionCard, BookingCard, AgentCard…
├── constants/         # config.ts · enums.ts
├── hooks/             # useApi · useAuth · useMissions · useBookings…
├── models/            # index.ts — tous les types et interfaces
├── navigation/        # RootNavigator · AuthNavigator · MainNavigator
│                      # MissionStackNavigator
├── screens/
│   ├── auth/          # LoginScreen · RegisterScreen
│   └── client/        # HomeScreen · MissionsScreen · ServicePickerScreen
│                      # MissionCreateScreen · MissionDetailScreen
│                      # QuoteDetailScreen · PaymentScreen
│                      # BookingDetailScreen · ConversationScreen
│                      # NotificationsScreen · ProfileScreen
│                      # MissionSuccessScreen
├── services/          # tokenStorage · navigationRef
├── store/             # authStore · notificationsStore (Zustand)
├── theme/             # colors · typography · spacing
└── utils/             # formatters · statusHelpers · typeGuards
```

---

## Flux utilisateur principal

```
Login / Register
      ↓
Home (Dashboard)
      ↓
ServicePicker → MissionCreate (3 étapes)
      ↓
QuoteDetail → Accepter devis
      ↓
PaymentScreen (Stripe)
      ↓
MissionSuccess
      ↓
MissionDetail → BookingDetail → Évaluer l'agent
             ↘ Conversation (messagerie)
```

---

## Authentification

- **JWT** : `accessToken` (15 min) + `refreshToken` (30 jours)
- Refresh automatique via intercepteur Axios (file d'attente des requêtes en parallèle)
- **2FA** TOTP optionnel (Google Authenticator / Authy)

> ⚠️ En production, remplacer `tokenStorage` (mémoire) par `react-native-keychain`.

---

## Paiement Stripe

1. Le client accepte le devis → `POST /quotes/:id/accept`
2. Création du PaymentIntent → `POST /payments/intent` → reçoit `clientSecret`
3. Confirmation via `@stripe/stripe-react-native` → `confirmPayment(clientSecret)`

> Le `PaymentScreen` actuel est un placeholder. Installer `@stripe/stripe-react-native` pour la production.

---

## Commandes utiles

```bash
npm run start          # Metro bundler
npm run android        # Build + lancer sur émulateur Android
npm run ios            # Build + lancer sur simulateur iOS
npm run lint           # ESLint
npm run test           # Jest
```

---

## Variables d'environnement clés

| Variable | Description |
|---|---|
| `API_BASE_URL_ANDROID` | URL API pour émulateur Android |
| `API_BASE_URL_IOS` | URL API pour simulateur iOS |
| `STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe (pk_test_...) |

---

## Dépendances à installer en production

```bash
# Paiement Stripe
npm install @stripe/stripe-react-native

# Stockage sécurisé des tokens
npm install react-native-keychain

# Notifications push
npm install @notifee/react-native
# ou
npm install react-native-push-notification
```
