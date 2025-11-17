#!/bin/bash
# Complete reset script - run from project root

echo "🧹 Stopping all containers..."
make stop 2>/dev/null || docker compose down -v 2>/dev/null

echo "🗑️  Removing Docker resources..."
docker compose down -v --rmi local --remove-orphans 2>/dev/null

echo "🧹 Removing generated files..."
rm -rf .next .blitz
rm -rf node_modules/.cache
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client

echo "🗑️  Removing .env.local if it exists..."
rm -f .env.local .env.local.*

echo "🔨 Rebuilding Docker images..."
docker compose build --no-cache

echo "🚀 Starting fresh..."
make dev

echo "✅ Reset complete! Check logs with: make logs"