FROM node:20.11.1-bookworm-slim

WORKDIR /app

COPY . .

# --ignore-scripts since we'll get sg/db.json on the following line.
RUN npm install --omit=dev --ignore-scripts

ADD https://github.com/whatwg/sg/raw/main/db.json sg/db.json

ENV PORT=3000

EXPOSE $PORT

CMD [ "npm", "start" ]
