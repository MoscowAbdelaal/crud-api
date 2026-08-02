FROM node:18-alpine

# Install build tools for native modules (if needed)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "server-pg.js"]