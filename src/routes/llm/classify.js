const { InputSchema, OutputSchema, stubResponse, validateInput } = require('./schema');
const { getPrompt, getPromptVersion } = require('./prompt-loader');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

// ============================================
// LLM CLIENT WITH TIMEOUT
// ============================================
const client = new OpenAI({
    baseURL: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
    apiKey: process.env.LLM_API_KEY || 'ollama',
    timeout: 30000, // 30 seconds (Stage 4)
});

// ============================================
// QUARANTINE LOG
// ============================================
const LOG_DIR = path.join(__dirname, '../../../logs');
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

function quarantine(input, rawOutput, error, promptVersion) {
    const entry = {
        timestamp: new Date().toISOString(),
        input,
        raw_output: rawOutput,
        error: error.message || error,
        prompt_version: promptVersion,
    };
    fs.appendFileSync(
        path.join(LOG_DIR, 'quarantine.jsonl'),
        JSON.stringify(entry) + '\n'
    );
    console.log('🚨 Quarantined:', entry);
}

// ============================================
// COST LOGGING (Stage 4)
// ============================================
function logCost(promptVersion, model, inputTokens, outputTokens, duration, repairCount) {
    const entry = {
        timestamp: new Date().toISOString(),
        prompt_version: promptVersion,
        model: model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        duration_ms: duration,
        repair_count: repairCount || 0,
    };
    console.log('💰 COST:', JSON.stringify(entry));
    // Append to cost log file
    const costLogPath = path.join(LOG_DIR, 'cost.jsonl');
    fs.appendFileSync(costLogPath, JSON.stringify(entry) + '\n');
}

// ============================================
// RETRY WITH EXPONENTIAL BACKOFF (Stage 4)
// ============================================
async function callWithRetry(model, messages, maxRetries = 3) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await client.chat.completions.create({
                model: model,
                messages: messages,
                temperature: 0.2,
                max_tokens: 300,
            });
        } catch (error) {
            lastError = error;
            
            // Don't retry on these errors (Stage 4)
            if (error.status === 400 || error.status === 401 || error.status === 403) {
                console.log(`❌ Not retrying ${error.status}: ${error.message}`);
                throw error;
            }
            
            // Retry on timeouts, 429, 5xx
            if (error.status === 429 || (error.status >= 500 && error.status < 600) || error.code === 'ETIMEDOUT') {
                if (attempt < maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 200, 10000);
                    console.log(`⏳ Retry ${attempt}/${maxRetries} after ${Math.round(delay)}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
            }
            
            throw error;
        }
    }
    
    throw lastError;
}

// ============================================
// PARSE AND VALIDATE MODEL OUTPUT
// ============================================
function parseAndValidate(raw, input, promptVersion) {
    let jsonStr = raw;
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (!match) {
        throw new Error('No JSON object found in response');
    }
    jsonStr = match[0];
    let parsed;
    try {
        parsed = JSON.parse(jsonStr);
    } catch (error) {
        throw new Error(`Invalid JSON: ${error.message}`);
    }
    const result = OutputSchema.safeParse(parsed);
    if (!result.success) {
        const errors = result.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
        }));
        throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
    }
    return result.data;
}

// ============================================
// REPAIR RETRY
// ============================================
async function repairRetry(input, rawOutput, error, promptVersion) {
    console.log('🔧 Attempting repair retry...');
    const repairPrompt = `
You previously returned a response that was rejected.

Your response was:
${rawOutput}

The error was:
${error.message}

Please return ONLY a valid JSON object matching this schema:
{
  "category": "billing|bug|feature|other",
  "urgency": "low|normal|high",
  "confidence": 0.0-1.0,
  "reason": "one short sentence"
}

Return ONLY the JSON object, nothing else.`;

    try {
        const response = await callWithRetry(
            process.env.LLM_MODEL || 'llama3.2',
            [
                { role: 'system', content: getPrompt('classify-v1.md') },
                { role: 'user', content: input },
                { role: 'assistant', content: rawOutput },
                { role: 'user', content: repairPrompt }
            ]
        );
        const repaired = response.choices[0].message.content;
        return parseAndValidate(repaired, input, promptVersion);
    } catch (error) {
        throw new Error(`Repair failed: ${error.message}`);
    }
}

// ============================================
// CLASSIFY ENDPOINT HANDLER
// ============================================
async function classifyHandler(req, res) {
    const startTime = Date.now();
    let repairCount = 0;
    
    try {
        const validation = validateInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Invalid input',
                details: validation.errors
            });
        }
        
        const { text } = validation.data;

        if (process.env.LLM_STUB === '1') {
            return res.status(200).json(stubResponse);
        }

        if (process.env.LLM_ENABLED === 'false') {
            return res.status(503).json({
                error: 'LLM service is currently disabled',
                fallback: true,
            });
        }

        const prompt = getPrompt('classify-v1.md');
        const promptVersion = getPromptVersion();
        const model = process.env.LLM_MODEL || 'llama3.2';

        console.log(`📝 Using prompt: ${promptVersion}`);

        // Call with retry (Stage 4)
        const response = await callWithRetry(model, [
            { role: 'system', content: prompt },
            { role: 'user', content: text }
        ]);

        const duration = Date.now() - startTime;
        const rawContent = response.choices[0].message.content;
        const tokens = response.usage || { prompt_tokens: 0, completion_tokens: 0 };

        // Cost logging (Stage 4)
        logCost(promptVersion, model, tokens.prompt_tokens, tokens.completion_tokens, duration, repairCount);

        let validated;
        try {
            validated = parseAndValidate(rawContent, text, promptVersion);
        } catch (parseError) {
            console.log(`⚠️ Parse/validation failed: ${parseError.message}`);
            try {
                validated = await repairRetry(text, rawContent, parseError, promptVersion);
                repairCount = 1;
                console.log('✅ Repair retry succeeded');
            } catch (repairError) {
                quarantine(text, rawContent, repairError, promptVersion);
                return res.status(422).json({
                    error: 'Model output validation failed after repair',
                    details: repairError.message,
                });
            }
        }

        return res.status(200).json(validated);

    } catch (error) {
        console.error('❌ Classify error:', error.message);
        return res.status(500).json({ 
            error: 'Internal server error',
        });
    }
}

module.exports = { classifyHandler };