# AI vs Me Comparison

## My Prompt
Build a Node.js Express endpoint that classifies support messages using an LLM.

Requirements:
- POST /classify endpoint
- Input: { "text": "string, 1-2000 characters" }
- Output: { "category": "billing|bug|feature|other", "urgency": "low|normal|high", "confidence": 0.0-1.0, "reason": "string" }
- Use OpenRouter with openrouter/free (or Ollama)
- Validate input with Zod
- Validate output with Zod schema
- Use prompt from a versioned file
- Parse JSON from model response
- One repair retry on failure
- Quarantine on final failure
- 30 second timeout
- Retry on timeouts, 429, 5xx (not on 4xx)
- Cost logging with token counts
- Kill switch (LLM_ENABLED=false)
- Stub mode (LLM_STUB=1)
- Cache repeated requests
- Streaming support (?stream=true)

## File Size Comparison

| File | My Code | AI Code |
|------|---------|---------|
| classify.js | 335 lines | 457 lines |
| schema.js | 71 lines | 39 lines |
| cache.js | 73 lines | 71 lines |

## Features Comparison

| Feature | My Code | AI Code |
|---------|---------|---------|
| Input Validation | ✅ | ✅ |
| Output Schema | ✅ | ✅ |
| Cache | ✅ | ✅ |
| Streaming | ✅ | ✅ |
| Repair Retry | ✅ | ❌ |
| Quarantine | ✅ | ❌ |
| Cost Logging | ✅ | ❌ |
| Kill Switch | ✅ | ❌ |
| Stub Mode | ✅ | ❌ |
| Error Handling | ✅ Comprehensive | ⚠️ Minimal |

## What the AI Did Better

1. **ES Modules**: Used modern `import/export` syntax
2. **Cleaner Schema**: More concise Zod schema definitions
3. **Cache TTL**: Exposed TTL as environment variable

## What the AI Got Wrong

1. **Missing Repair Retry**: No mechanism to fix malformed JSON responses
2. **Missing Cost Logging**: No token usage tracking
3. **Missing Quarantine**: Failed responses not logged properly
4. **Missing Kill Switch**: No `LLM_ENABLED=false` support
5. **Missing Stub Mode**: No `LLM_STUB=1` for testing
6. **Raw Fetch**: Uses `fetch()` directly instead of the OpenAI SDK
7. **No Validation Helper**: Missing `validateInput` function

## What My Prompt Forgot to Specify

1. **Module System**: I didn't specify CommonJS vs ES Modules
2. **Logging Format**: I didn't specify how to format cost logs
3. **Error Response Format**: I didn't specify the exact error response shape

## Conclusion

The AI generated a working solution but missed several critical production features:
- Repair retry (essential for reliability)
- Cost logging (essential for monitoring)
- Quarantine (essential for debugging)
- Kill switch (essential for production safety)

The AI also used raw `fetch()` instead of the OpenAI SDK, which adds unnecessary complexity. My hand-built solution is more robust and production-ready.

**Key Takeaway**: An AI can generate a working prototype, but the production details (error handling, monitoring, safety switches) need to be specified explicitly in the prompt.
