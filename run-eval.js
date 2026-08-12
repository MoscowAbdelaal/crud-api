const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const casesPath = path.join(__dirname, 'evals', 'cases.json');
const cases = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));

process.env.LLM_STUB = '0';

const { classifyHandler } = require('./src/routes/llm/classify');

function createMockReq(body) {
    return {
        body,
        headers: {},
        get: (header) => null,
    };
}

function createMockRes() {
    const res = {
        statusCode: 200,
        body: null,
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            this.body = data;
            return this;
        },
    };
    return res;
}

async function runEval() {
    console.log('\n📊 Running Evaluation...\n');
    console.log(`📝 Prompt Version: ${process.env.LLM_PROMPT_VERSION || 'classify-v1.md'}`);
    console.log(`🤖 Model: ${process.env.LLM_MODEL || 'llama3.2'}`);
    console.log(`📅 Date: ${new Date().toISOString()}\n`);

    let passed = 0;
    let failed = 0;
    const results = [];

    for (let i = 0; i < cases.length; i++) {
        const test = cases[i];
        console.log(`📝 Test ${i + 1}/${cases.length}: "${test.input.slice(0, 50)}..."`);

        const req = createMockReq({ text: test.input });
        const res = createMockRes();

        try {
            await classifyHandler(req, res);

            const actual = res.body;
            const expected = test.expected;

            if (!actual || typeof actual !== 'object') {
                console.log(`  ❌ FAILED: No valid response`);
                failed++;
                results.push({
                    input: test.input,
                    expected,
                    actual: { error: 'No valid response' },
                    passed: false,
                });
                console.log('');
                continue;
            }

            const categoryMatch = actual.category === expected.category;
            const urgencyMatch = actual.urgency === expected.urgency;
            const confidenceValid = typeof actual.confidence === 'number' &&
                                   actual.confidence >= 0 &&
                                   actual.confidence <= 1;

            const allPassed = categoryMatch && urgencyMatch && confidenceValid;

            if (allPassed) {
                console.log(`  ✅ PASSED (category: ${actual.category}, urgency: ${actual.urgency})`);
                passed++;
            } else {
                console.log(`  ❌ FAILED`);
                if (!categoryMatch) console.log(`     Expected category: ${expected.category}, Got: ${actual.category}`);
                if (!urgencyMatch) console.log(`     Expected urgency: ${expected.urgency}, Got: ${actual.urgency}`);
                if (!confidenceValid) console.log(`     Invalid confidence: ${actual.confidence}`);
                failed++;
            }

            results.push({
                input: test.input,
                expected,
                actual,
                passed: allPassed,
            });

        } catch (error) {
            console.log(`  ❌ ERROR: ${error.message}`);
            failed++;
            results.push({
                input: test.input,
                expected: test.expected,
                actual: { error: error.message },
                passed: false,
            });
        }

        console.log('');
    }

    const total = passed + failed;
    const score = Math.round((passed / total) * 100);

    console.log('═'.repeat(50));
    console.log(`📊 EVAL RESULTS:`);
    console.log(`   Passed: ${passed}/${total} (${score}%)`);
    console.log(`   Failed: ${failed}/${total}`);
    console.log(`   Date: ${new Date().toISOString()}`);
    console.log(`   Prompt Version: ${process.env.LLM_PROMPT_VERSION || 'classify-v1.md'}`);
    console.log(`   Model: ${process.env.LLM_MODEL || 'llama3.2'}`);
    console.log('═'.repeat(50));

    const resultsPath = path.join(__dirname, 'evals', 'results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        prompt_version: process.env.LLM_PROMPT_VERSION || 'classify-v1.md',
        model: process.env.LLM_MODEL || 'llama3.2',
        total,
        passed,
        failed,
        score: `${score}%`,
        results,
    }, null, 2));

    console.log(`\n📁 Results saved to: ${resultsPath}`);
}

runEval().catch(console.error);
