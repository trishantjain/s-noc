
FROM node:22-bookworm-slim

# Install Tailscale in the container.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL https://tailscale.com/install.sh | sh \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN chmod +x /app/start.sh

ENV NODE_ENV=production

CMD ["/app/start.sh"]
