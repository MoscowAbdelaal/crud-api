const OpenAI = require('openai');
const dotenv = require('dotenv');

dotenv.config();

console.log('🔍 Debug Info:');
console.log('  Base URL:', process.env.LLM_BASE_URL);
console.log('  Model:', process.env.LLM_MODEL);
console.log('  API Key:', process.env.LLM_API_KEY ? '✅ Set' : '❌ Missing');
console.log('');

const client = new OpenAI({
    baseURL: process.env.LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY,
});

async function test() {
    try {
        console.log('📤 Sending request...');
        const res = await client.chat.completions.create({
            model: process.env.LLM_MODEL,
            messages: [{ role: 'user', content: 'Reply with exactly the word: ready' }],
            max_tokens: 10,
        });
        console.log('✅ Model response:', res.choices[0].message.content);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

test();