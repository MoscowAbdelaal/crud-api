const { InputSchema, OutputSchema, stubResponse, validateInput } = require('./schema');
const { getPrompt, getPromptVersion } = require('./prompt-loader');
const OpenAI = require('openai');
const dotenv = require('dotenv');

dotenv.config();

// ============================================
// LLM CLIENT
// ============================================
const client = new OpenAI({
    baseURL: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
    apiKey: process.env.LLM_API_KEY || 'ollama',
});

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
        console.log(`📤 Sending to model: ${process.env.LLM_MODEL || 'llama3.2'}`);

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

        // 6. Log the call
        console.log(`📊 LLM Call: ${duration}ms | Prompt: ${promptVersion} | Tokens: ${tokens.prompt_tokens + tokens.completion_tokens}`);

        // 7. Parse and validate the response (Stage 3 will implement this fully)
        return res.status(200).json({
            category: 'other',
            urgency: 'normal',
            confidence: 0.8,
            reason: 'Stage 3 will parse and validate the model response.',
            _debug: {
                raw: rawContent,
                prompt_version: promptVersion,
                duration_ms: duration,
            }
        });

    } catch (error) {
        console.error('❌ Classify error:', error.message);
        console.error('Stack:', error.stack);
        
        // Return a more detailed error
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message,
        });
    }
}

module.exports = { classifyHandler };