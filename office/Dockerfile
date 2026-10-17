# Agentic Digital Office: 3D office UI + Hermes gateway adapter (one Node process).
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production HOME=/data
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server ./server
COPY public ./public
RUN mkdir -p /data/.hermes && chown -R node:node /data
USER node
EXPOSE 3000
CMD ["node", "server/index.js"]
