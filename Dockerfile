FROM node:14-buster-slim

WORKDIR /app

COPY . .

RUN npm install --production

# TODO
COPY private-config.sample.json private-config.json

EXPOSE 3000

CMD [ "npm", "start" ]
