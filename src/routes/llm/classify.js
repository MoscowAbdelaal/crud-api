const { InputSchema, OutputSchema, stubResponse, validateInput } = require('./schema');
const { getPrompt, getPromptVersion } = require('./prompt-loader');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

// ============================================
// LLM CLIENT
// ============================================
const client = new OpenAI({
    baseURL: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
    apiKey: process.env.LLM_API_KEY || 'ollama',
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
// PARSE AND VALIDATE MODEL OUTPUT
// ============================================
function parseAndValidate(raw, input, promptVersion) {
    // 1. Try to extract JSON from the response
    let jsonStr = raw;
    
    // Remove markdown code fences
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Find the first JSON object
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (!match) {
        throw new Error('No JSON object found in response');
    }
    
    jsonStr = match[0];
    
    // 2. Parse JSON
    let parsed;
    try {
        parsed = JSON.parse(jsonStr);
    } catch (error) {
        throw new Error(`Invalid JSON: ${error.message}`);
    }
    
    // 3. Validate against schema
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
        const response = await client.chat.completions.create({
            model: process.env.LLM_MODEL || 'llama3.2',
            messages: [
                { role: 'system', content: getPrompt('classify-v1.md') },
                { role: 'user', content: input },
                { role: 'assistant', content: rawOutput },
                { role: 'user', content: repairPrompt }
            ],
            temperature: 0.2,
            max_tokens: 300,
        });

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
    
    try {
        // 1. Validate input
        const validation = validateInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Invalid input',
                details: validation.errors
            });
        }
        
        const { text } = validation.data;

        // 2. Check stub mode
        if (process.env.LLM_STUB === '1') {
            return res.status(200).json(stubResponse);
        }

        // 3. Check kill switch
        if (process.env.LLM_ENABLED === 'false') {
            return res.status(503).json({
                error: 'LLM service is currently disabled',
                fallback: true,
            });
        }

        // 4. Load the prompt
        const prompt = getPrompt('classify-v1.md');
        const promptVersion = getPromptVersion();

        console.log(`📝 Using prompt: ${promptVersion}`);

        // 5. Call the model
        const response = await client.chat.completions.create({
            model: process.env.LLM_MODEL || 'llama3.2',
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: text }
            ],
            temperature: 0.2,
            max_tokens: 300,
        });

        const duration = Date.now() - startTime;
        const rawContent = response.choices[0].message.content;
        const tokens = response.usage || { prompt_tokens: 0, completion_tokens: 0 };

        console.log(`📊 LLM Call: ${duration}ms | Tokens: ${tokens.prompt_tokens + tokens.completion_tokens}`);

        // 6. Parse and validate
        let validated;
        try {
            validated = parseAndValidate(rawContent, text, promptVersion);
        } catch (parseError) {
            console.log(`⚠️ Parse/validation failed: ${parseError.message}`);
            
            // 7. Repair retry (ONCE)
            try {
                validated = await repairRetry(text, rawContent, parseError, promptVersion);
                console.log('✅ Repair retry succeeded');
            } catch (repairError) {
                // 8. Quarantine and return 422
                quarantine(text, rawContent, repairError, promptVersion);
                return res.status(422).json({
                    error: 'Model output validation failed after repair',
                    details: repairError.message,
                });
            }
        }

        // 9. Return clean JSON (no raw model text)
        return res.status(200).json(validated);

    } catch (error) {
        console.error('❌ Classify error:', error.message);
        return res.status(500).json({ 
            error: 'Internal server error',
        });
    }
}

module.exports = { classifyHandler };