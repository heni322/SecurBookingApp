# Configuration & environments — Provalk client app

The app uses a single, typed, validated configuration module. There is **one**
place to import config from, and **one** place each value is defined.

## Importing config

```ts
import { config, isProd } from '@config';

axios.create({ baseURL: config.api.baseUrl, timeout: config.api.timeoutMs });
if (config.features.debugLogging) console.log('…');
```

Never read `process.env` or hardcode URLs/keys in screens or services. If a new
value varies by environment, add it to `AppConfig` (`src/config/types.ts`) and to
each profile in `src/config/environments.ts`.

## The three environments

| Env           | API base                                   | Stripe key | Logging | Crash reporting |
|---------------|--------------------------------------------|------------|---------|-----------------|
| `development` | `http://<DEV_HOST>:3000/api/v1`            | `pk_test_` | on      | off             |
| `staging`     | `https://api-staging.securbooking.com/...` | `pk_test_` | on      | on              |
| `production`  | `https://api.securbooking.com/api/v1`      | `pk_live_` | off     | on              |

Profiles live in `src/config/environments.ts`. Shared values (cache windows,
maps endpoints, page size, geofence radius) are defined once in `shared`.

## How the active environment is chosen

`src/config/env.ts` resolves the environment in this order:

1. **Injected global `__APP_ENV__`** — if defined and valid, it wins. Wire this
   from CI / a build script to target staging from a release build.
2. **`__DEV__`** → `development`.
3. Otherwise → `RELEASE_ENV_OVERRIDE` (default `production`).

To ship a **staging** build without an injected global, set
`RELEASE_ENV_OVERRIDE = 'staging'` in `env.ts` for that build, or define
`__APP_ENV__` via your bundler.

## Validation

On startup `env.ts` validates the active profile:

- `api.baseUrl` must be a valid URL; in production it must be `https://`.
- Production Stripe key must start with `pk_live_` and must not be a placeholder.
- Non-production must **not** use a `pk_live_` key.

In **development** an invalid config throws immediately (fail fast). In
staging/production it logs a loud error but still boots.

## Before shipping — replace these placeholders

In `src/config/environments.ts`:

- `development.stripe.publishableKey` → your real Stripe **test** key.
- `staging.stripe.publishableKey` → your real Stripe **test** key.
- `production.stripe.publishableKey` → your real Stripe **live** key.
- `staging.api.baseUrl` → your real staging API host.
- `DEV_HOST` → your machine's LAN IP / `localhost` / `10.0.2.2`.
- `sentryDsn` (per env) once Sentry is added.
- `production.stripe.merchantIdentifier` if you enable Apple Pay.

## Dev host (development only)

`DEV_HOST` in `environments.ts` controls the dev API host. It must also be
whitelisted (cleartext) in
`android/app/src/main/res/xml/network_security_config.xml` (debug scope only).

## Legacy shim

`src/constants/config.ts` re-exports the old constant names
(`API_BASE_URL`, `STALE_TIME`, …) from `@config` for backward compatibility.
Prefer `import { config } from '@config'` in new code; the shim may be removed
once all call sites migrate.
