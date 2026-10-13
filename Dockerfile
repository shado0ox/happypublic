# 1. مرحلة البناء (Build Stage)
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_APP_STORE_URL=""
ARG VITE_PLAY_STORE_URL=""
ENV VITE_APP_STORE_URL=$VITE_APP_STORE_URL
ENV VITE_PLAY_STORE_URL=$VITE_PLAY_STORE_URL
RUN npm run build

# 2. مرحلة التشغيل النهائية (Production Stage)
FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY copy-logo.js ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
