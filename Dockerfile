FROM node:16.2.0-buster-slim

WORKDIR /app

COPY . .

RUN npm install --production

ADD https://github.com/whatwg/sg/raw/main/db.json sg/db.json

ENV PORT=3000

EXPOSE $PORT

CMD [ "npm", "start" ]
