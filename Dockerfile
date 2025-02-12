# Stage 1: Build the Next.js app
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Stage 2: Create the production image (smaller)
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/.next ./next
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev

COPY . .
COPY .next/standalone/server.js .
COPY .next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
