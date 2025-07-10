#!/bin/bash

# Script per testare l'API su Hugging Face Spaces
# Usage: ./test_hf_space.sh <your-space-url>

if [ $# -eq 0 ]; then
    echo "Usage: ./test_hf_space.sh <your-space-url>"
    echo "Example: ./test_hf_space.sh https://your-username-giuridico-pdf-parser.hf.space"
    exit 1
fi

SPACE_URL=$1

echo "🚀 Testando API su Hugging Face Spaces: $SPACE_URL"
echo "=================================================="

# Test Health Check
echo "🔍 Testando Health Check..."
HEALTH_RESPONSE=$(curl -s "$SPACE_URL/health")
if [ $? -eq 0 ]; then
    echo "✅ Health Check OK"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo "❌ Health Check Fallito"
fi

echo ""

# Test Home Endpoint
echo "🔍 Testando Home Endpoint..."
HOME_RESPONSE=$(curl -s "$SPACE_URL/")
if [ $? -eq 0 ]; then
    echo "✅ Home Endpoint OK"
    echo "   Response: $HOME_RESPONSE"
else
    echo "❌ Home Endpoint Fallito"
fi

echo ""
echo "🎯 Test completati!"
echo "📝 Per testare l'OCR, usa:"
echo "   curl -X POST \"$SPACE_URL/ocr-nanonets/\" -F \"file=@test.pdf\"" 