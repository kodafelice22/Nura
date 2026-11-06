# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS build
WORKDIR /app

# node:22-bookworm-slim bundles an older npm (10.x) than what generated
# package-lock.json (see "packageManager" below) — npm 10's `npm ci
# --workspace` has a bug where it misreads the lockfile against the root
# "overrides" field and wrongly demands packages the override replaced.
RUN npm install -g npm@11.17.0

# package-lock.json was generated against all workspaces' package.json
# files (root overrides react/react-dom to 19.0.5 repo-wide, so backend's
# package.json must stay visible here too, or `npm ci` sees an
# inconsistent lockfile and refuses to install).
COPY package.json package-lock.json ./
COPY apps/storefront/package.json apps/storefront/package.json
COPY apps/backend/package.json apps/backend/package.json
RUN npm ci --workspace=@dtc/storefront --include-workspace-root

COPY apps/storefront apps/storefront
WORKDIR /app/apps/storefront

# NEXT_PUBLIC_* values are baked into the client bundle at build time, so
# they must be passed as build args, not just runtime env vars.
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_DEFAULT_REGION=ci
ARG NEXT_PUBLIC_STRIPE_KEY
ARG NEXT_PUBLIC_MEILISEARCH_HOST
ARG NEXT_PUBLIC_MEILISEARCH_API_KEY
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ARG NEXT_PUBLIC_META_PIXEL_ID
ARG NEXT_PUBLIC_TIKTOK_PIXEL_ID
ARG NEXT_PUBLIC_WHATSAPP_ORDER_UPDATES_ENABLED=false
ARG LEGAL_LAST_UPDATED
ARG LEGAL_BUSINESS_NAME
ARG LEGAL_FORM
ARG LEGAL_CAPITAL
ARG LEGAL_REGISTRY_CITY
ARG LEGAL_REGISTRATION_NUMBER
ARG LEGAL_VAT_NUMBER
ARG LEGAL_ADDRESS
ARG LEGAL_PUBLICATION_DIRECTOR
ARG LEGAL_HOST_NAME
ARG LEGAL_HOST_ADDRESS
ARG LEGAL_HOST_PHONE
ARG LEGAL_MEDIATOR_NAME
ARG LEGAL_MEDIATOR_URL
ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL \
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY \
    NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    NEXT_PUBLIC_DEFAULT_REGION=$NEXT_PUBLIC_DEFAULT_REGION \
    NEXT_PUBLIC_STRIPE_KEY=$NEXT_PUBLIC_STRIPE_KEY \
    NEXT_PUBLIC_MEILISEARCH_HOST=$NEXT_PUBLIC_MEILISEARCH_HOST \
    NEXT_PUBLIC_MEILISEARCH_API_KEY=$NEXT_PUBLIC_MEILISEARCH_API_KEY \
    NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID \
    NEXT_PUBLIC_META_PIXEL_ID=$NEXT_PUBLIC_META_PIXEL_ID \
    NEXT_PUBLIC_TIKTOK_PIXEL_ID=$NEXT_PUBLIC_TIKTOK_PIXEL_ID \
    NEXT_PUBLIC_WHATSAPP_ORDER_UPDATES_ENABLED=$NEXT_PUBLIC_WHATSAPP_ORDER_UPDATES_ENABLED \
    LEGAL_LAST_UPDATED=$LEGAL_LAST_UPDATED \
    LEGAL_BUSINESS_NAME=$LEGAL_BUSINESS_NAME \
    LEGAL_FORM=$LEGAL_FORM \
    LEGAL_CAPITAL=$LEGAL_CAPITAL \
    LEGAL_REGISTRY_CITY=$LEGAL_REGISTRY_CITY \
    LEGAL_REGISTRATION_NUMBER=$LEGAL_REGISTRATION_NUMBER \
    LEGAL_VAT_NUMBER=$LEGAL_VAT_NUMBER \
    LEGAL_ADDRESS=$LEGAL_ADDRESS \
    LEGAL_PUBLICATION_DIRECTOR=$LEGAL_PUBLICATION_DIRECTOR \
    LEGAL_HOST_NAME=$LEGAL_HOST_NAME \
    LEGAL_HOST_ADDRESS=$LEGAL_HOST_ADDRESS \
    LEGAL_HOST_PHONE=$LEGAL_HOST_PHONE \
    LEGAL_MEDIATOR_NAME=$LEGAL_MEDIATOR_NAME \
    LEGAL_MEDIATOR_URL=$LEGAL_MEDIATOR_URL

RUN npm run build

FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=8000 HOSTNAME=0.0.0.0

RUN groupadd -r nextjs && useradd -r -g nextjs nextjs
COPY --from=build --chown=nextjs:nextjs /app/apps/storefront/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /app/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=build --chown=nextjs:nextjs /app/apps/storefront/public ./apps/storefront/public

USER nextjs
EXPOSE 8000

CMD ["node", "apps/storefront/server.js"]
