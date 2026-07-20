const http = require('http');

const BASE_URL = 'http://localhost:3000';
let taskId = null;
let testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// Helper function to make HTTP requests
function request(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const json = body ? JSON.parse(body) : null;
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: json,
                        rawBody: body
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body,
                        rawBody: body
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// Test runner
function runTest(name, testFn) {
    console.log(`\n🧪 Testing: ${name}`);
    try {
        testFn();
        console.log(`   ✅ PASSED`);
        testResults.passed++;
        testResults.tests.push({ name, status: 'PASSED' });
    } catch (error) {
        console.log(`   ❌ FAILED: ${error.message}`);
        testResults.failed++;
        testResults.tests.push({ name, status: 'FAILED', error: error.message });
    }
}

// ============================================
// TEST CASES
// ============================================

async function runAllTests() {
    console.log('🚀 Starting API Tests...\n');
    console.log('=' .repeat(50));

    // Test 1: Health Check
    runTest('Health Check', async () => {
        const response = await request('GET', '/health');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        if (response.body.status !== 'ok') throw new Error(`Expected status "ok", got "${response.body.status}"`);
    });

    // Test 2: Get all tasks (should have 3 seeded tasks)
    runTest('GET /tasks - Get all tasks', async () => {
        const response = await request('GET', '/tasks');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        if (!Array.isArray(response.body)) throw new Error('Response should be an array');
        if (response.body.length === 0) throw new Error('Should have at least 3 seeded tasks');
        console.log(`   📊 Found ${response.body.length} tasks`);
    });

    // Test 3: Create a new task
    runTest('POST /tasks - Create a new task', async () => {
        const newTask = { title: 'Test Task from API Test' };
        const response = await request('POST', '/tasks', newTask);
        if (response.statusCode !== 201) throw new Error(`Expected 201, got ${response.statusCode}`);
        if (!response.body.id) throw new Error('Response should have an id');
        if (response.body.title !== newTask.title) throw new Error(`Expected title "${newTask.title}", got "${response.body.title}"`);
        if (response.body.done !== 0) throw new Error(`Expected done: 0, got ${response.body.done}`);
        taskId = response.body.id;
        console.log(`   ✅ Created task with ID: ${taskId}`);
    });

    // Test 4: Get single task
    runTest('GET /tasks/:id - Get single task', async () => {
        if (!taskId) throw new Error('No task ID available from previous test');
        const response = await request('GET', `/tasks/${taskId}`);
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        if (response.body.id !== taskId) throw new Error(`Expected id ${taskId}, got ${response.body.id}`);
        if (response.body.title !== 'Test Task from API Test') throw new Error('Task title does not match');
    });

    // Test 5: Update task
    runTest('PUT /tasks/:id - Update task', async () => {
        if (!taskId) throw new Error('No task ID available from previous test');
        const updateData = { title: 'Updated Test Task', done: true };
        const response = await request('PUT', `/tasks/${taskId}`, updateData);
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        if (response.body.title !== updateData.title) throw new Error(`Expected title "${updateData.title}", got "${response.body.title}"`);
        if (response.body.done !== 1) throw new Error(`Expected done: 1, got ${response.body.done}`);
    });

    // Test 6: Get all tasks again (should include our new task)
    runTest('GET /tasks - Verify task was added', async () => {
        const response = await request('GET', '/tasks');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        const found = response.body.find(t => t.id === taskId);
        if (!found) throw new Error(`Task with ID ${taskId} not found`);
        if (found.title !== 'Updated Test Task') throw new Error(`Expected title "Updated Test Task", got "${found.title}"`);
    });

    // Test 7: Validation - Empty title (should fail)
    runTest('POST /tasks - Validation: Empty title', async () => {
        const response = await request('POST', '/tasks', { title: '' });
        if (response.statusCode !== 400) throw new Error(`Expected 400, got ${response.statusCode}`);
        if (!response.body.error) throw new Error('Should return error message');
    });

    // Test 8: Validation - Missing title (should fail)
    runTest('POST /tasks - Validation: Missing title', async () => {
        const response = await request('POST', '/tasks', {});
        if (response.statusCode !== 400) throw new Error(`Expected 400, got ${response.statusCode}`);
        if (!response.body.error) throw new Error('Should return error message');
    });

    // Test 9: Get non-existent task (should return 404)
    runTest('GET /tasks/:id - Non-existent task', async () => {
        const response = await request('GET', '/tasks/99999');
        if (response.statusCode !== 404) throw new Error(`Expected 404, got ${response.statusCode}`);
        if (!response.body.error) throw new Error('Should return error message');
    });

    // Test 10: Update non-existent task (should return 404)
    runTest('PUT /tasks/:id - Non-existent task', async () => {
        const response = await request('PUT', '/tasks/99999', { title: 'Test' });
        if (response.statusCode !== 404) throw new Error(`Expected 404, got ${response.statusCode}`);
        if (!response.body.error) throw new Error('Should return error message');
    });

    // Test 11: Delete non-existent task (should return 404)
    runTest('DELETE /tasks/:id - Non-existent task', async () => {
        const response = await request('DELETE', '/tasks/99999');
        if (response.statusCode !== 404) throw new Error(`Expected 404, got ${response.statusCode}`);
        if (!response.body.error) throw new Error('Should return error message');
    });

    // ============================================
    // EXTRA FEATURE TESTS
    // ============================================

    // Test 12: Search tasks
    runTest('GET /tasks/search - Search for tasks', async () => {
        const response = await request('GET', '/tasks/search?q=SQLite');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        if (!Array.isArray(response.body)) throw new Error('Response should be an array');
        if (response.body.length === 0) throw new Error('Should find at least one task containing "SQLite"');
    });

    // Test 13: Search with empty query (should fail)
    runTest('GET /tasks/search - Empty search term', async () => {
        const response = await request('GET', '/tasks/search?q=');
        if (response.statusCode !== 400) throw new Error(`Expected 400, got ${response.statusCode}`);
        if (!response.body.error) throw new Error('Should return error message');
    });

    // Test 14: Filter by done status
    runTest('GET /tasks/filter - Filter by done=true', async () => {
        const response = await request('GET', '/tasks/filter?done=true');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        if (!Array.isArray(response.body)) throw new Error('Response should be an array');
        const allDone = response.body.every(t => t.done === 1);
        if (!allDone) throw new Error('All tasks should have done=1');
    });

    // Test 15: Filter by done status (pending)
    runTest('GET /tasks/filter - Filter by done=false', async () => {
        const response = await request('GET', '/tasks/filter?done=false');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        if (!Array.isArray(response.body)) throw new Error('Response should be an array');
        const allPending = response.body.every(t => t.done === 0);
        if (!allPending) throw new Error('All tasks should have done=0');
    });

    // Test 16: Filter with invalid parameter (should fail)
    runTest('GET /tasks/filter - Missing done parameter', async () => {
        const response = await request('GET', '/tasks/filter');
        if (response.statusCode !== 400) throw new Error(`Expected 400, got ${response.statusCode}`);
        if (!response.body.error) throw new Error('Should return error message');
    });

    // Test 17: Get stats
    runTest('GET /stats - Get task statistics', async () => {
        const response = await request('GET', '/stats');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        if (response.body.total === undefined) throw new Error('Missing total field');
        if (response.body.done === undefined) throw new Error('Missing done field');
        if (response.body.pending === undefined) throw new Error('Missing pending field');
        if (response.body.completion_rate === undefined) throw new Error('Missing completion_rate field');
        console.log(`   📊 Stats: Total=${response.body.total}, Done=${response.body.done}, Pending=${response.body.pending}`);
    });

    // Test 18: Sort by title
    runTest('GET /tasks?sort=title - Sort by title', async () => {
        const response = await request('GET', '/tasks?sort=title');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        if (!Array.isArray(response.body)) throw new Error('Response should be an array');
        // Check if sorted (titles should be in alphabetical order)
        const titles = response.body.map(t => t.title);
        const sortedTitles = [...titles].sort();
        if (JSON.stringify(titles) !== JSON.stringify(sortedTitles)) {
            throw new Error('Tasks are not sorted by title');
        }
    });

    // Test 19: Sort by created_at
    runTest('GET /tasks?sort=created_at - Sort by creation date', async () => {
        const response = await request('GET', '/tasks?sort=created_at');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        if (!Array.isArray(response.body)) throw new Error('Response should be an array');
    });

    // Test 20: Invalid sort field (should fail)
    runTest('GET /tasks?sort=invalid - Invalid sort field', async () => {
        const response = await request('GET', '/tasks?sort=invalid');
        if (response.statusCode !== 400) throw new Error(`Expected 400, got ${response.statusCode}`);
        if (!response.body.error) throw new Error('Should return error message');
    });

    // Test 21: Recent tasks
    runTest('GET /tasks/recent - Get recent tasks', async () => {
        const response = await request('GET', '/tasks/recent?limit=3');
        if (response.statusCode !== 200) throw new Error(`Expected 200, got ${response.statusCode}`);
        if (!Array.isArray(response.body)) throw new Error('Response should be an array');
        if (response.body.length > 3) throw new Error(`Expected max 3 tasks, got ${response.body.length}`);
    });

    // Test 22: Delete our test task
    runTest('DELETE /tasks/:id - Delete test task', async () => {
        if (!taskId) throw new Error('No task ID available from previous test');
        const response = await request('DELETE', `/tasks/${taskId}`);
        if (response.statusCode !== 204) throw new Error(`Expected 204, got ${response.statusCode}`);
    });

    // Test 23: Verify task was deleted
    runTest('GET /tasks/:id - Verify task was deleted', async () => {
        if (!taskId) throw new Error('No task ID available from previous test');
        const response = await request('GET', `/tasks/${taskId}`);
        if (response.statusCode !== 404) throw new Error(`Expected 404, got ${response.statusCode}`);
        if (!response.body.error) throw new Error('Should return error message');
    });

    // ============================================
    // FINAL TEST RESULTS
    // ============================================
    console.log('\n' + '=' .repeat(50));
    console.log('\n📊 TEST SUMMARY:');
    console.log(`   ✅ Passed: ${testResults.passed}`);
    console.log(`   ❌ Failed: ${testResults.failed}`);
    console.log(`   📝 Total:  ${testResults.passed + testResults.failed}`);
    console.log('\n📋 Detailed Results:');
    
    testResults.tests.forEach(test => {
        const icon = test.status === 'PASSED' ? '✅' : '❌';
        console.log(`   ${icon} ${test.name}`);
        if (test.status === 'FAILED') {
            console.log(`      Error: ${test.error}`);
        }
    });

    if (testResults.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Your API is working perfectly!');
        process.exit(0);
    } else {
        console.log(`\n⚠️  ${testResults.failed} test(s) failed. Please check the errors above.`);
        process.exit(1);
    }
}

// ============================================
// RUN THE TESTS
// ============================================
console.log('⏳ Waiting for server to be ready...');
setTimeout(() => {
    runAllTests().catch(error => {
        console.error('❌ Test runner error:', error.message);
        process.exit(1);
    });
}, 1000);