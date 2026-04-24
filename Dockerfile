# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.17.0

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /usr/src/app

# Install only production dependencies
COPY package.json package-lock.json . 
RUN npm install --omit=dev

# Install dev dependencies and build the app in a separate stage
FROM base AS build
RUN npm install
COPY . .

# Copy config.json into the build stage
COPY config.json . 
RUN npm run build

# Final stage for running the production version
FROM base AS final
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy over the built application, views, and necessary files
COPY --from=build /usr/src/app/build ./build
COPY --from=build /usr/src/app/views ./views
COPY package.json . 
COPY config.json . 
RUN npm install --omit=dev

# Expose the port and start the application
EXPOSE 3005
CMD ["node", "build/app.js"]
