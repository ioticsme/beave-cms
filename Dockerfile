FROM node:lts-alpine3.15

# Create app directory
WORKDIR /app

# Set permision for node
RUN chown node:node -R /app

# switch as normal user
USER node

# Install app dependencies
COPY package*.json ./

# Install dependencies 
RUN npm ci --only=production

# Bundle app source
COPY --chown=node:node . .

# expose port
EXPOSE 8080

# Start app
CMD [ "node", "app.js" ]
