# syntax=docker/dockerfile:1

# node:22-alpine (musl libc) can hang during Medusa's full module bootstrap —
# musl's getaddrinfo has known issues with the concurrent DNS lookups Medusa
# does while loading ~20+ modules, observed as `medusa db:migrate` never
# reaching the database no matter how long the connection timeout is set.
# node:22-bookworm-slim (glibc) does not have this problem.
FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS build
WORKDIR /app

# node:22-bookworm-slim bundles an older npm (10.x) than what generated
# package-lock.json (see "packageManager" below) — npm 10's `npm ci
# --workspace` has a bug where it misreads the lockfile against the root
# "overrides" field and wrongly demands packages the override replaced.
RUN npm install -g npm@11.17.0

# Install the whole workspace so the backend's local deps resolve, then
# build only the backend. package-lock.json was generated against all
# workspaces' package.json files (root overrides react/react-dom to 19.0.5
# repo-wide, so storefront's package.json must stay visible here too, or
# `npm ci` sees an inconsistent lockfile and refuses to install).
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/storefront/package.json apps/storefront/package.json
RUN npm ci --workspace=@dtc/backend --include-workspace-root

COPY apps/backend apps/backend
WORKDIR /app/apps/backend
RUN npm run build

# `medusa build` emits the compiled app in .medusa/server, together with a copy
# of apps/backend/package.json. It only copies a lockfile that sits next to that
# package.json, and the repository's single lockfile is the workspace root's —
# so running `npm install` inside .medusa/server would resolve every transitive
# dependency from scratch at build time (no lockfile, none of the root
# "overrides"), producing an image that differs from what CI audits.

# Production dependencies are therefore installed from the root package-lock.json
# and root overrides, exactly like the build stage above, minus dev dependencies.
FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS prod-deps
WORKDIR /app
RUN npm install -g npm@11.17.0
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/storefront/package.json apps/storefront/package.json
RUN npm ci --omit=dev --workspace=@dtc/backend --include-workspace-root \
 && rm -rf node_modules/@dtc

FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN groupadd -r medusa && useradd -r -m -d /home/medusa -g medusa medusa
COPY --from=build --chown=medusa:medusa /app/apps/backend/.medusa/server /app
COPY --from=prod-deps --chown=medusa:medusa /app/node_modules /app/node_modules

USER medusa
EXPOSE 9000

CMD ["sh", "-c", "npx medusa db:migrate && npx medusa start"]
