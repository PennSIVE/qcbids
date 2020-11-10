FROM node:14

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install && git clone https://github.com/rii-mango/Papaya.git

# Bundle app source
COPY . .

ENV PORT=3000
CMD [ "node", "app.js" ]
