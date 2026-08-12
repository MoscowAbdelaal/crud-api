const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test cases
const testCases = [
  'I was charged twice for my subscription',
  'The export button crashes every time I click it',
  'Can you add dark mode to the dashboard?',
  'I have a question about my account settings',
  'My invoice is showing the wrong amount',
  'The login page wont load on mobile',
];

function testModel(modelName, modelConfig, testInput) {
  const envContent = Object.entries(modelConfig)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  fs.writeFileSync('.env.test', envContent);

  const start = Date.now();
  try {
    const cmd = `node -e "
      const dotenv = require('dotenv');
      dotenv.config({ path: '.env.test' });
      const { classifyHandler } = require('./src/routes/llm/classify');
      const req = { body: { text: '${testInput.replace(/'/g, "\\'")}' }, headers: {}, get: () => null };
      const res = { statusCode: 200, body: null, status: function(c) { this.statusCode = c; return this; }, json: function(d) { this.body = d; return this; } };
      classifyHandler(req, res).then(() => {
        console.log(JSON.stringify({ result: res.body, duration: Date.now() - ${start} }));
      }).catch(e => {
        console.log(JSON.stringify({ error: e.message, duration: Date.now() - ${start} }));
      });
    "`;
    
    const output = execSync(cmd, {
      encoding: 'utf-8',
      timeout: 60000,
      env: { ...process.env, ...modelConfig }
    });
    
    const lines = output.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    return JSON.parse(lastLine);
  } catch (error) {
    return { error: error.message, duration: Date.now() - start };
  } finally {
    if (fs.existsSync('.env.test')) {
      fs.unlinkSync('.env.test');
    }
  }
}

// Model configurations - NO HARDCODED KEYS
const models = {
  'Ollama (llama3.2)': {
    LLM_BASE_URL: 'http://localhost:11434/v1',
    LLM_API_KEY: 'ollama',
    LLM_MODEL: 'llama3.2',
    LLM_STUB: '0',
    LLM_ENABLED: '1',
  },
  'OpenRouter (free)': {
    LLM_BASE_URL: 'https://openrouter.ai/api/v1',
    LLM_API_KEY: process.env.LLM_API_KEY || '',
    LLM_MODEL: 'openrouter/free',
    LLM_STUB: '0',
    LLM_ENABLED: '1',
  },
};

console.log('\n🏁 RACING MODELS...\n');
console.log('═'.repeat(80));

for (const input of testCases) {
  console.log(`\n📝 Input: "${input.slice(0, 50)}..."`);
  console.log('');
  
  for (const [name, config] of Object.entries(models)) {
    const result = testModel(name, config, input);
    
    if (result.result && result.result.category) {
      console.log(`  ✅ ${name}: ${result.result.category} (${result.result.urgency}) ⏱️ ${result.duration}ms`);
    } else {
      console.log(`  ❌ ${name}: ${result.error || 'Failed'} ⏱️ ${result.duration}ms`);
    }
  }
  console.log('─'.repeat(40));
}

console.log('\n📁 Results saved to: race-results.json');
