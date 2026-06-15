#!/bin/bash

# Exit on error for setup steps
set -e

# Define colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}          Aurora Health Companion - Dev Launcher     ${NC}"
echo -e "${BLUE}====================================================${NC}"

# Check for .env file
if [ ! -f .env ]; then
  echo -e "${YELLOW}No .env file found. Copying .env.example to .env...${NC}"
  cp .env.example .env
fi

# Load environment variables
echo -e "${GREEN}Loading environment variables from .env...${NC}"
# Filter out comments and export variables
export $(grep -v '^#' .env | xargs)

# Validate database URL
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}Error: DATABASE_URL is not set in .env${NC}"
  exit 1
fi

# Check if PostgreSQL is running
echo -e "${GREEN}Checking database connection...${NC}"
if ! pg_isready -q; then
  echo -e "${YELLOW}PostgreSQL does not seem to be running locally.${NC}"
  echo -e "${YELLOW}Attempting to start postgresql service via brew...${NC}"
  brew services start postgresql@16 || brew services start postgresql || true
  sleep 2
fi

# Run database schema push
echo -e "${GREEN}Pusing database schema with Drizzle...${NC}"
DATABASE_URL=$DATABASE_URL pnpm --filter @workspace/db run push

# Check port usage
API_PORT=${PORT:-8080}
WEB_PORT=${FRONTEND_PORT:-8082}

echo -e "${GREEN}Checking ports ${API_PORT} and ${WEB_PORT}...${NC}"

# Function to check and kill process on a port
check_port() {
  local port=$1
  local name=$2
  local pid=$(lsof -t -i :$port || true)
  if [ ! -z "$pid" ]; then
    echo -e "${YELLOW}Port $port ($name) is already in use by PID $pid.${NC}"
    read -p "Would you like to terminate this process? (y/n): " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
      kill -9 $pid
      echo -e "${GREEN}Terminated PID $pid.${NC}"
    else
      echo -e "${RED}Cannot start service because port $port is occupied. Exiting.${NC}"
      exit 1
    fi
  fi
}

check_port $API_PORT "API Server"
check_port $WEB_PORT "Aurora Frontend"

# Disable immediate exit so processes can run concurrently
set +e

echo -e "${GREEN}Starting API Server (Port $API_PORT) and Frontend (Port $WEB_PORT)...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop both services.${NC}"
echo -e "${BLUE}----------------------------------------------------${NC}"

# Run API server and frontend concurrently
PORT=$API_PORT \
DATABASE_URL=$DATABASE_URL \
OPENAI_API_KEY=$OPENAI_API_KEY \
GEMINI_API_KEY=$GEMINI_API_KEY \
CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY \
CLERK_SECRET_KEY=$CLERK_SECRET_KEY \
BYPASS_CLERK=$BYPASS_CLERK \
pnpm --filter @workspace/api-server run dev &

API_PID=$!

PORT=$WEB_PORT \
BASE_PATH=$BASE_PATH \
VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY \
VITE_BYPASS_CLERK=$VITE_BYPASS_CLERK \
pnpm --filter @workspace/aurora run dev &

WEB_PID=$!

# Trap Ctrl+C (SIGINT) and SIGTERM to kill background jobs
cleanup() {
  echo -e "\n${YELLOW}Shutting down services...${NC}"
  kill $API_PID 2>/dev/null || true
  kill $WEB_PID 2>/dev/null || true
  echo -e "${GREEN}Goodbye!${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script running and wait for background processes
wait
