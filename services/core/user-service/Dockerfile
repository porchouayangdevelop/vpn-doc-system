# Stage 1: Build & Dependencies
FROM node:22-slim AS build

# Set the working directory
WORKDIR /usr/src/app

RUN npm i -g pnpm@latest

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install ALL dependencies (including devDeps for build/typescript)
RUN pnpm install

# Copy the rest of your source code
COPY . .

# If you use TypeScript, build it here. Otherwise, you can skip this.
# RUN pnpm run build

# Prune development dependencies to keep the final image light
RUN pnpm prune --development

# RUN pnpm build


# Stage 2: Production Runtime
FROM node:22-slim

# Set environment to production
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy only the necessary files from the build stage
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package*.json ./
# COPY --from=build /usr/src/app/dist ./dist 
# ^ Change 'dist' to '.' if you aren't using a build step/TypeScript

# Use a non-root user for security (provided by the node image)
USER node

# Fastify usually listens on 3000 by default
EXPOSE 3001

# Use 'node' directly or 'tini' for proper signal handling (SIGTERM)
CMD ["node", "dist/server.js"]