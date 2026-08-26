FROM node:22.18.0-bookworm-slim@sha256:0d130e2ee18e88e1561375276daced6bff032539200173f2daf48c2e33f38ff5

ENV NODE_ENV=production
WORKDIR /app

COPY src/services/footballData ./src/services/footballData
COPY scripts/football-data-production.js ./scripts/football-data-production.js

USER 65532:65532
ENTRYPOINT ["node", "/app/scripts/football-data-production.js"]
