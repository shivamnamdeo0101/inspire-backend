FROM node:16
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install -g nodemon
RUN npm install
COPY . .
EXPOSE 5000
CMD [ "nodemon", "index.js" ]