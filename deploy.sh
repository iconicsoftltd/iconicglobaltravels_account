#!/bin/bash
# deploy.sh — run this on VPS to deploy latest code
# Usage: bash deploy.sh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo ">>> Pulling latest code..."
git pull origin main

echo ">>> Removing unused build cache before building..."
docker builder prune -af

# Build one service at a time so both production images do not compete for
# the VPS's limited disk space during layer extraction.
echo ">>> Building backend production image..."
docker compose -f docker-compose.prod.yml build backend
docker builder prune -af

echo ">>> Building frontend production image..."
docker compose -f docker-compose.prod.yml build frontend
docker builder prune -af

echo ">>> Starting production containers..."
docker compose -f docker-compose.prod.yml up -d --no-build

echo ">>> Removing unused images..."
docker image prune -f

echo ">>> Done. Containers running:"
docker compose -f docker-compose.prod.yml ps
