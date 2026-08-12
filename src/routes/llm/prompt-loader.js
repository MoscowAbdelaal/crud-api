const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = path.join(__dirname, 'prompts');
const PROMPT_VERSION = 'classify-v1.md';

function getPrompt(filename = PROMPT_VERSION) {
    const filePath = path.join(PROMPTS_DIR, filename);
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        console.error(`❌ Failed to load prompt: ${filename}`, error.message);
        // Return a fallback prompt
        return `You are a support ticket classifier. Classify the following message into one of: billing, bug, feature, other. 
        Return ONLY a JSON object with fields: category, urgency (low/normal/high), confidence (0-1), reason.`;
    }
}

function getPromptVersion() {
    return PROMPT_VERSION;
}

module.exports = { getPrompt, getPromptVersion };
