FROM node:14-buster-slim

WORKDIR /app

COPY . .

RUN npm install --production

ADD https://github.com/whatwg/sg/raw/main/db.json sg/db.json

EXPOSE 3000

CMD [ "npm", "start" ]
