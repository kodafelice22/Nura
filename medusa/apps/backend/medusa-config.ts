import { loadEnv, defineConfig, MedusaError } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const modules: any[] = []
const plugins: any[] = []
const isProduction = process.env.NODE_ENV === 'production'
const isBootstrap =
  isProduction && process.env.MEDUSA_BOOTSTRAP_MODE === 'true'

const requireCompleteConfig = (name: string, keys: string[]) => {
  const configuredKeys = keys.filter((key) => Boolean(process.env[key]))

  if (configuredKeys.length > 0 && configuredKeys.length < keys.length) {
    const missingKeys = keys.filter((key) => !process.env[key])
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${name} configuration is incomplete. Missing: ${missingKeys.join(', ')}.`
    )
  }
}

if (isProduction) {
  const requiredKeys = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'COOKIE_SECRET',
    'ORDER_ACCESS_SECRET',
    'STORE_CORS',
    'ADMIN_CORS',
    'AUTH_CORS',
    'STOREFRONT_URL',
    'REVALIDATE_SECRET',
    'REFERRAL_REWARD_EUR',
    'REFERRAL_REWARD_XOF',
  ]
  const missingKeys = requiredKeys.filter((key) => !process.env[key])

  if (missingKeys.length > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Production configuration is incomplete. Missing: ${missingKeys.join(', ')}.`
    )
  }
}

requireCompleteConfig('Stripe', ['STRIPE_API_KEY', 'STRIPE_WEBHOOK_SECRET'])
requireCompleteConfig('Jèko', [
  'JEKO_API_KEY',
  'JEKO_API_KEY_ID',
  'JEKO_STORE_ID',
  'JEKO_WEBHOOK_SECRET',
  'JEKO_API_URL',
  'JEKO_AMOUNT_MULTIPLIER',
])

// Payment providers are both optional and independent in development: Stripe (Europe,
// cards) registers once STRIPE_API_KEY is set, Jèko (Côte d'Ivoire, mobile
// money — Wave/Orange Money/MTN/Moov/Djamo) once JEKO_API_KEY is set. Which
// provider serves which region/currency is
// configured per-region in the admin (Settings > Regions), not here.
const paymentProviders: any[] = []

if (process.env.S3_FILE_URL) {
  modules.push({
    resolve: '@medusajs/medusa/file',
    options: {
      providers: [
        {
          resolve: '@medusajs/medusa/file-s3',
          id: 's3',
          options: {
            file_url: process.env.S3_FILE_URL,
            access_key_id: process.env.S3_ACCESS_KEY_ID,
            secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
            region: process.env.S3_REGION,
            bucket: process.env.S3_BUCKET,
            endpoint: process.env.S3_ENDPOINT,
            cache_control: 'public, max-age=31536000, immutable',
            acl: false,
          },
        },
      ],
    },
  })
} else if (isProduction) {
  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    'Production requires persistent S3-compatible file storage.'
  )
}

if (process.env.STRIPE_API_KEY) {
  paymentProviders.push({
    resolve: '@medusajs/medusa/payment-stripe',
    id: 'stripe',
    options: {
      apiKey: process.env.STRIPE_API_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
  })
}

if (process.env.JEKO_API_KEY) {
  paymentProviders.push({
    resolve: './src/modules/jeko-payment',
    id: 'jeko',
    options: {
      api_key: process.env.JEKO_API_KEY,
      api_key_id: process.env.JEKO_API_KEY_ID,
      store_id: process.env.JEKO_STORE_ID,
      webhook_secret: process.env.JEKO_WEBHOOK_SECRET,
      api_url: process.env.JEKO_API_URL,
      amount_multiplier: Number(process.env.JEKO_AMOUNT_MULTIPLIER),
    },
  })
}

if (isProduction && !isBootstrap && paymentProviders.length === 0) {
  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    'Production requires at least one configured payment provider.'
  )
}

if (paymentProviders.length > 0) {
  modules.push({
    resolve: '@medusajs/medusa/payment',
    options: { providers: paymentProviders },
  })
}

if (
  isProduction &&
  (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)
) {
  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    'Production requires RESEND_API_KEY and RESEND_FROM_EMAIL.'
  )
}

// Resend remains optional for local development. Production requires it so
// contact messages and transactional notifications cannot disappear into logs.
if (process.env.RESEND_API_KEY) {
  modules.push({
    resolve: '@medusajs/medusa/notification',
    options: {
      providers: [
        {
          resolve: './src/modules/resend-notification',
          id: 'resend',
          options: {
            channels: ['email'],
            api_key: process.env.RESEND_API_KEY,
            from: process.env.RESEND_FROM_EMAIL,
          },
        },
      ],
    },
  })
}

// Enterprise RBAC (Super Admin / Admin / Manager roles). Medusa's own
// `disable: !FeatureFlag.isFeatureEnabled("rbac")` default for this module
// is evaluated inside defineConfig() itself, which runs before the async
// feature-flag loader has read MEDUSA_FF_RBAC from the environment — so the
// module never actually registers even with the env var set. Registering it
// explicitly here (reading process.env directly, no such ordering issue)
// works around that. MEDUSA_FF_RBAC still needs to be set to `true` so the
// admin dashboard shows the Roles screens.
const rbacEnabled = process.env.MEDUSA_FF_RBAC === 'true'

if (rbacEnabled && !process.env.MEDUSA_LICENSE_KEY) {
  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    'MEDUSA_FF_RBAC requires a valid MEDUSA_LICENSE_KEY.'
  )
}

if (rbacEnabled) {
  modules.push({ resolve: '@medusajs/medusa/rbac' })
}

// Newsletter signup (storefront footer form). Always registered — it's a
// simple internal data module (email capture table), not tied to any
// optional third-party provider.
modules.push({ resolve: './src/modules/newsletter' })

// Customer wishlist (save-for-later on the storefront). Always registered —
// a simple internal data module, no third-party provider involved.
modules.push({ resolve: './src/modules/wishlist' })

// Product reviews (storefront + admin moderation). Always registered — a
// simple internal data module, no third-party provider involved.
modules.push({ resolve: './src/modules/review' })

// Editorial content: the Journal and the editable blocks of the storefront
// home page (hero, campaign, curated products). Always registered.
modules.push({ resolve: './src/modules/content' })

// Product search (storefront search bar). Optional: only registered once
// MEILISEARCH_HOST is set, so the backend keeps booting normally without a
// Meilisearch instance running. Self-hosted — see docker-compose.yml.
if (process.env.MEILISEARCH_HOST) {
  plugins.push({
    resolve: '@rokmohar/medusa-plugin-meilisearch',
    options: {},
  })
  modules.push({
    resolve: '@medusajs/medusa/search',
    options: {
      providers: [
        {
          resolve: '@rokmohar/medusa-plugin-meilisearch/providers/meilisearch',
          id: 'meilisearch',
          options: {
            config: {
              host: process.env.MEILISEARCH_HOST,
              apiKey: process.env.MEILISEARCH_API_KEY,
            },
          },
        },
      ],
    },
  })
}

// Redis-backed cache/event-bus/locking/workflow-engine. Medusa only wires
// these automatically when EXECUTION_CONTEXT=medusa-cloud (see defineConfig
// in @medusajs/utils) — a plain REDIS_URL env var is otherwise silently
// ignored outside that managed context, which is why a self-hosted server
// logs "redisUrl not found", "Local Event Bus installed. This is not
// recommended for production" and "Locking module: Using in-memory as
// default" even with Redis running and configured. Registering the same
// four modules explicitly here fixes that for this (self-hosted) setup.
// Falls back to the in-memory defaults when Redis isn't available (e.g. a
// fresh local checkout without `redis-server` running).
if (process.env.REDIS_URL) {
  modules.push(
    {
      resolve: '@medusajs/medusa/event-bus-redis',
      options: { redisUrl: process.env.REDIS_URL, workerOptions: { concurrency: 1 } },
    },
    {
      resolve: '@medusajs/medusa/cache-redis',
      options: { redisUrl: process.env.REDIS_URL },
    },
    {
      // Options are nested under `redis`, and the key inside it is
      // `redisUrl` (its deprecated predecessor `url` still works but logs
      // a warning) — unlike the other three Redis modules, which take
      // `redisUrl` directly at the top level.
      resolve: '@medusajs/medusa/workflow-engine-redis',
      options: { redis: { redisUrl: process.env.REDIS_URL } },
    },
    {
      resolve: '@medusajs/medusa/locking',
      options: {
        providers: [
          {
            id: 'locking-redis',
            resolve: '@medusajs/medusa/locking-redis',
            is_default: true,
            options: { redisUrl: process.env.REDIS_URL },
          },
        ],
      },
    }
  )
}

module.exports = defineConfig({
  admin: {
    vite: () => ({
      plugins: [
        {
          name: 'nura-admin-mobile-text-wrap',
          transformIndexHtml: (html: string) =>
            html.replace(
              '</head>',
              '<style>@media (max-width: 640px) { #medusa main p { overflow-wrap: anywhere; } }</style></head>'
            ),
        },
      ],
    }),
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // Each of Medusa's ~20+ modules opens its own connection pool, and
    // Medusa's default `pool.min: 2` per module means ~40+ Postgres
    // connections get opened eagerly and concurrently at boot. On a
    // constrained/virtualized network (small VPS, or a Colima VM on macOS)
    // that burst can itself time out the whole migration/boot step.
    // `min: 0` makes pools lazy (connections open on demand instead), and
    // `max: 5` keeps memory use sane on a small VPS while still being far
    // above what a single module needs concurrently.
    databaseDriverOptions: {
      pool: { min: 0, max: 5 },
    },
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  modules,
  plugins,
})
