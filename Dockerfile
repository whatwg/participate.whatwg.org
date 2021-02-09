FROM node:14-buster-slim

WORKDIR /app

COPY . .

RUN npm install --production

EXPOSE 3000

CMD [ "npm", "start" ]
