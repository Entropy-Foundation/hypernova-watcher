# Step 1: Use an official Node.js runtime as the base image
FROM node:18-alpine

# Step 2: Set the working directory inside the container
WORKDIR /usr/src/app

# Step 3: Copy package.json and package-lock.json (if present) into the container
COPY package*.json ./

# Step 4: Install dependencies
RUN npm install

# Step 5: Copy the entire application code into the container
COPY . .

# Step 6: Install TypeScript globally (if not already included)
RUN npm install -g typescript

# Step 7: Build the TypeScript app
RUN tsc

# Step 9: Run the application
CMD ["node", "dist/block-listener.js"]
