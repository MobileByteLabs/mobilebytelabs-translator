// Simple rate limiting test script
const axios = require('axios');

const baseURL = 'http://localhost:3001';

async function testRateLimit() {
  console.log('🧪 Testing Rate Limiting...\n');

  // Test health endpoint (should have higher limits)
  console.log('📊 Testing Health Endpoint Rate Limiting:');
  try {
    for (let i = 1; i <= 5; i++) {
      const response = await axios.get(`${baseURL}/health`);
      console.log(`  Request ${i}: Status ${response.status} - Rate limit remaining: ${response.headers['ratelimit-remaining'] || 'N/A'}`);
    }
  } catch (error) {
    if (error.response?.status === 429) {
      console.log(`  ❌ Rate limited at request: Status ${error.response.status}`);
      console.log(`  📱 Response: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n📊 Testing API Endpoint Rate Limiting:');
  try {
    for (let i = 1; i <= 5; i++) {
      const response = await axios.get(`${baseURL}/api/test`);
      console.log(`  Request ${i}: Status ${response.status} - Rate limit remaining: ${response.headers['ratelimit-remaining'] || 'N/A'}`);
    }
  } catch (error) {
    if (error.response?.status === 429) {
      console.log(`  ❌ Rate limited at request: Status ${error.response.status}`);
      console.log(`  📱 Response: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  // Test rapid requests to trigger rate limiting
  console.log('\n🚀 Testing Rapid Requests (should trigger rate limiting):');
  try {
    const promises = Array.from({ length: 10 }, (_, i) =>
      axios.get(`${baseURL}/api/test`).catch(err => ({
        request: i + 1,
        status: err.response?.status,
        error: err.response?.data
      }))
    );

    const results = await Promise.all(promises);

    results.forEach((result, index) => {
      if (result.status) {
        console.log(`  Request ${index + 1}: Status ${result.status}`);
        if (result.status === 429) {
          console.log(`    📱 Rate limited: ${JSON.stringify(result.error, null, 4)}`);
        }
      } else if (result.data) {
        console.log(`  Request ${index + 1}: Success - Rate limit remaining: ${result.headers?.['ratelimit-remaining'] || 'N/A'}`);
      }
    });
  } catch (error) {
    console.log(`  ❌ Error in rapid requests: ${error.message}`);
  }

  console.log('\n✅ Rate limiting test completed!');
  console.log('\n📋 Expected behavior:');
  console.log('  - Health endpoint: Up to 60 requests per minute');
  console.log('  - API endpoints: Up to 100 requests per 15 minutes');
  console.log('  - Rate limited requests should return 429 status');
  console.log('  - Response should include retry-after information');
}

// Check if server is running first
axios.get(`${baseURL}/health`)
  .then(() => {
    console.log('✅ Server is running, starting rate limit tests...\n');
    testRateLimit();
  })
  .catch(() => {
    console.log('❌ Server is not running. Please start the server first:');
    console.log('   cd backend && npm run dev');
    console.log('   Then run: node test-rate-limit.js');
  });