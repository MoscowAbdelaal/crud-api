#!/bin/bash

echo "========================================="
echo "🔵 STREAMING MODE (tokens appear one by one)"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop the stream"
echo ""

curl -N -X POST "http://localhost:3000/llm/classify?stream=true" \
  -H "Content-Type: application/json" \
  -d '{"text": "My invoice is showing the wrong amount"}'

echo ""
echo ""
echo "========================================="
echo "🟢 NON-STREAMING MODE (all at once)"
echo "========================================="
echo ""

curl -X POST "http://localhost:3000/llm/classify" \
  -H "Content-Type: application/json" \
  -d '{"text": "My invoice is showing the wrong amount"}'
