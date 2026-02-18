# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY db ./db

# Install dependencies
# Use --legacy-peer-deps to handle React 19 vs React 18 peer dependency conflicts
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy production dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy built application and Prisma files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/.blitz ./.blitz
COPY --from=builder /app/public ./public
COPY --from=builder /app/db ./db
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/tsconfig.json ./

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 3000

ENV NODE_ENV production
ENV PORT 3000

CMD ["npm", "start"]
