FROM node:20-alpine AS build

WORKDIR /app

COPY BE/package*.json ./
RUN npm ci

COPY BE/prisma ./prisma
COPY BE/tsconfig.json ./tsconfig.json
COPY BE/src ./src
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY BE/package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist

EXPOSE 5000
CMD ["npm", "start"]
