const { z } = require('zod');

// ============================================
// INPUT SCHEMA - What the user sends
// ============================================
const InputSchema = z.object({
    text: z.string()
        .min(1, 'Text is required')
        .max(2000, 'Text must be 2000 characters or less'),
});

// ============================================
// OUTPUT SCHEMA - What the model must return
// ============================================
const OutputSchema = z.object({
    category: z.enum(['billing', 'bug', 'feature', 'other']),
    urgency: z.enum(['low', 'normal', 'high']),
    confidence: z.number().min(0).max(1),
    reason: z.string().min(1).max(200),
});

// ============================================
// STUB RESPONSE - Used when LLM_STUB=1
// ============================================
const stubResponse = {
    category: 'other',
    urgency: 'normal',
    confidence: 0.5,
    reason: 'Stub mode: no model call was made.',
};

// ============================================
// VALIDATE INPUT MANUALLY (fallback)
// ============================================
function validateInput(body) {
    const errors = [];
    
    // Check if body exists
    if (!body || typeof body !== 'object') {
        errors.push({ field: 'body', message: 'Request body is required' });
        return { valid: false, errors };
    }
    
    // Check if text field exists
    if (body.text === undefined || body.text === null) {
        errors.push({ field: 'text', message: 'Text is required' });
        return { valid: false, errors };
    }
    
    // Check if text is a string
    if (typeof body.text !== 'string') {
        errors.push({ field: 'text', message: 'Text must be a string' });
        return { valid: false, errors };
    }
    
    // Check if text is empty
    if (body.text.trim() === '') {
        errors.push({ field: 'text', message: 'Text is required' });
        return { valid: false, errors };
    }
    
    // Check max length
    if (body.text.length > 2000) {
        errors.push({ field: 'text', message: 'Text must be 2000 characters or less' });
        return { valid: false, errors };
    }
    
    return { valid: true, data: { text: body.text.trim() } };
}

module.exports = {
    InputSchema,
    OutputSchema,
    stubResponse,
    validateInput,
};