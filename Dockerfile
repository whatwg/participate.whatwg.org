FROM node:14-buster-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --production

COPY layouts layouts
COPY lib lib
COPY views views
COPY sg/db.json sg/

# TODO
COPY config.json config.json
COPY private-config.sample.json private-config.json

EXPOSE 3000

CMD [ "npm", "start" ]
