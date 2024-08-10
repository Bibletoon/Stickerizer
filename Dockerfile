FROM node AS deps

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

FROM node AS build

WORKDIR /usr/src/app

COPY --from=deps /usr/src/app .
COPY . .

RUN npm run build

FROM node:slim

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV NODE_ENV production-docker

RUN apt-get update && apt-get install gnupg wget -y && \
  wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
  sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
  apt-get update && \
  apt-get install google-chrome-stable -y --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

USER node
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --production

COPY --from=build /usr/src/app/dist ./dist

CMD [ "node", "dist/index.js" ]