# Use an official Node.js runtime as the base image
FROM node:14

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm --no-cache install

# Copy the rest of the application code to the container
COPY . .

# Build the React app for production
RUN npm run build

# Expose the port for your Node.js server
EXPOSE 3000

# Start your Node.js server
CMD ["node", "src/server.js"]