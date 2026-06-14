# Base node stage
FROM node:24-alpine AS base
RUN npm install -g pnpm

WORKDIR /app

# Copy lockfile and configs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./

# Copy lib workspace sources
COPY lib/ ./lib/

# Copy artifacts workspace sources
COPY artifacts/ ./artifacts/

# Copy scripts sources
COPY scripts/ ./scripts/

# Install dependencies and build libraries
RUN pnpm install --frozen-lockfile

# Typecheck and Build all components
RUN pnpm run build

# --- Production runner for API backend ---
FROM node:24-alpine AS runner-api
RUN npm install -g pnpm
WORKDIR /app
COPY --from=base /app /app
EXPOSE 8080
CMD ["pnpm", "--filter", "@workspace/api-server", "run", "dev"]

# --- Production runner for Frontend ---
FROM node:24-alpine AS runner-web
RUN npm install -g pnpm
WORKDIR /app
COPY --from=base /app /app
EXPOSE 8082
CMD ["pnpm", "--filter", "@workspace/aurora", "run", "dev"]
