#!/bin/bash

echo "========================================="
echo "📊 AI vs Me - Code Comparison"
echo "========================================="
echo ""

echo "📁 Files to compare:"
echo "  src/routes/llm/classify.js  vs  ai-version/classify.js"
echo "  src/routes/llm/schema.js    vs  ai-version/schema.js"
echo "  src/routes/llm/cache.js     vs  ai-version/cache.js"
echo ""

echo "========================================="
echo "📋 SUMMARY OF DIFFERENCES"
echo "========================================="
echo ""

# Count lines in each file
echo "📊 File sizes:"
echo "  classify.js:     $(wc -l < src/routes/llm/classify.js) lines (yours) vs $(wc -l < ai-version/classify.js 2>/dev/null || echo '0') lines (AI)"
echo "  schema.js:       $(wc -l < src/routes/llm/schema.js) lines (yours) vs $(wc -l < ai-version/schema.js 2>/dev/null || echo '0') lines (AI)"
echo "  cache.js:        $(wc -l < src/routes/llm/cache.js) lines (yours) vs $(wc -l < ai-version/cache.js 2>/dev/null || echo '0') lines (AI)"
echo ""

# Count functions
echo "🔧 Key features comparison:"
echo ""

check_feature() {
    file=$1
    feature=$2
    if grep -q "$feature" "$file" 2>/dev/null; then
        echo "  ✅ $feature: Found"
    else
        echo "  ❌ $feature: Not found"
    fi
}

echo "📋 classify.js features:"
check_feature "src/routes/llm/classify.js" "cache"
check_feature "src/routes/llm/classify.js" "stream"
check_feature "src/routes/llm/classify.js" "repairRetry"
check_feature "src/routes/llm/classify.js" "quarantine"
check_feature "src/routes/llm/classify.js" "logCost"
echo ""

echo "📋 AI version features:"
check_feature "ai-version/classify.js" "cache"
check_feature "ai-version/classify.js" "stream"
check_feature "ai-version/classify.js" "repairRetry"
check_feature "ai-version/classify.js" "quarantine"
check_feature "ai-version/classify.js" "logCost"
echo ""

echo "========================================="
echo "🔍 Do you want to see detailed differences?"
echo "  Option 1: VS Code diff (recommended)"
echo "  Option 2: Terminal diff"
echo "  Option 3: Skip"
echo "========================================="
