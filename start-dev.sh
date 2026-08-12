#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting Development Environment...${NC}"

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Ollama is not running. Starting Ollama...${NC}"
    ollama serve &
    sleep 3
    echo -e "${GREEN}✅ Ollama started${NC}"
else
    echo -e "${GREEN}✅ Ollama is already running${NC}"
fi

# Check if port 3000 is in use
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use. Killing existing process...${NC}"
    kill -9 $(lsof -t -i:3000) 2>/dev/null
    sleep 1
fi

echo -e "${GREEN}✅ Starting server with auto-restart...${NC}"
echo -e "${YELLOW}📝 Press Ctrl+C to stop both${NC}"
echo ""

# Start both with concurrently
npm run dev:all
