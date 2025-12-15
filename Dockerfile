FROM node:22

RUN apt update && apt upgrade -y

WORKDIR /app

COPY ./app/package*.json ./

RUN npm install