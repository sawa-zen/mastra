# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx mastra build

FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/.mastra ./.mastra
ENV NODE_ENV=production
ENV PORT=4111
EXPOSE 4111
CMD ["node", ".mastra/output/index.mjs"]
