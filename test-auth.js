// Simple script to test authentication
// Run this in browser console to get the token and test the API

console.log('🔍 Testing authentication...');

// Get token from localStorage
const token = localStorage.getItem('mobilebytes_auth_token');
console.log('Token:', token ? token.substring(0, 50) + '...' : 'No token found');

if (token) {
  // Test the debug endpoint
  fetch('http://localhost:3001/api/scan/debug/auth', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  .then(response => {
    console.log('Response status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('Response data:', data);
  })
  .catch(error => {
    console.error('Error:', error);
  });
}