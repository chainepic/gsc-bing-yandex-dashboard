FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/connectors/package.json packages/connectors/
COPY packages/core/package.json packages/core/
RUN pnpm install --frozen-lockfile=false

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3847
ENV DATA_DIR=/data
RUN pnpm build

RUN mkdir -p /data
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 3847
VOLUME ["/data"]
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["pnpm", "--filter", "@search-triad/web", "start"]
