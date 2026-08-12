const { InputSchema, OutputSchema, stubResponse, validateInput } = require('./schema');

// ============================================
// CLASSIFY ENDPOINT HANDLER
// ============================================
async function classifyHandler(req, res) {
    try {
        // 1. Validate input using manual validation first
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

        // 4. Call the model (Stage 2 will implement this)
        return res.status(200).json({
            category: 'other',
            urgency: 'normal',
            confidence: 0.8,
            reason: 'Placeholder: Stage 2 will implement the actual LLM call.',
        });

    } catch (error) {
        console.error('Classify error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { classifyHandler };