FROM node:18.20.2-alpine3.19@sha256:4837c2ac8998cf172f5892fb45f229c328e4824c43c8506f8ba9c7996d702430 AS builder

WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm ci --quiet

COPY . .
RUN npm run compile

FROM node:18.20.2-alpine3.19@sha256:4837c2ac8998cf172f5892fb45f229c328e4824c43c8506f8ba9c7996d702430 AS final

RUN ["apk", "--no-cache", "upgrade"]

RUN ["apk", "add", "--no-cache", "tini"]

WORKDIR /app
COPY . .
RUN rm -rf ./test
# Copy in compile assets and deps from build container
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/govuk_modules ./govuk_modules
COPY --from=builder /app/public ./public
RUN npm prune --omit=dev

ENV PORT 9000
EXPOSE 9000

ENTRYPOINT ["tini", "--"]

CMD ["npm", "start"]
