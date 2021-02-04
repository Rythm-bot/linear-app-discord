FROM node:12

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json .

RUN npm ci

COPY src ./src

ENTRYPOINT ["npm", "start"]
