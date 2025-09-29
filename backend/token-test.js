// Test token-based authentication for Vanderbilt API
require('dotenv').config({ path: '../.env' })
const axios = require('axios')

async function testTokenAuth() {
  console.log('🎫 Testing Token-Based Authentication...\n')
  
  const apiKey = process.env.OPENAI_API_KEY
  const baseUrl = process.env.AMPLIFY_API_URL
  
  console.log(`API Key: ${apiKey ? apiKey.substring(0, 15) + '...' : 'MISSING'}`)
  console.log(`Base URL: ${baseUrl}`)
  console.log('')
  
  // Test 1: Check if there's an auth/token endpoint
  console.log('🔍 Test 1: Looking for authentication endpoints...')
  
  const authEndpoints = [
    '/auth',
    '/token', 
    '/oauth/token',
    '/api/auth',
    '/v1/auth',
    '/login',
    '/authenticate'
  ]
  
  for (const endpoint of authEndpoints) {
    try {
      console.log(`Trying: ${baseUrl}${endpoint}`)
      const response = await axios.post(`${baseUrl}${endpoint}`, {
        api_key: apiKey,
        key: apiKey
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        timeout: 10000
      })
      
      console.log(`✅ Found auth endpoint ${endpoint}:`, response.status)
      console.log('Response:', JSON.stringify(response.data, null, 2))
      
    } catch (error) {
      if (error.response?.status !== 404) {
        console.log(`ℹ️  ${endpoint}: ${error.response?.status} - ${error.response?.statusText}`)
        if (error.response?.data && Object.keys(error.response.data).length > 0) {
          console.log('  Data:', JSON.stringify(error.response.data, null, 2))
        }
      }
    }
  }
  
  // Test 2: Try GET request to see API info
  console.log('\n📋 Test 2: Checking API information...')
  
  const infoEndpoints = [
    '/',
    '/info',
    '/status', 
    '/health',
    '/api',
    '/v1'
  ]
  
  for (const endpoint of infoEndpoints) {
    try {
      const response = await axios.get(`${baseUrl}${endpoint}`, {
        headers: {
          'x-api-key': apiKey,
          'User-Agent': 'VanderbiltAmplify/1.0'
        },
        timeout: 10000
      })
      
      console.log(`✅ Info from ${endpoint}:`, response.status)
      console.log('Data:', JSON.stringify(response.data, null, 2))
      
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`🔐 ${endpoint}: Requires authentication`)
      } else if (error.response?.status === 403) {
        console.log(`🚫 ${endpoint}: Access forbidden`)
      } else if (error.response?.status !== 404) {
        console.log(`ℹ️  ${endpoint}: ${error.response?.status}`)
      }
    }
  }
  
  // Test 3: Try different Bearer token formats
  console.log('\n🎫 Test 3: Testing Bearer token variations...')
  
  const testPayload = {
    model: 'GPT-4o-mini',
    messages: [{ role: 'user', content: 'test' }],
    max_tokens: 5
  }
  
  const bearerFormats = [
    `Bearer ${apiKey}`,
    `Token ${apiKey}`,
    `ApiKey ${apiKey}`,
    `Amplify ${apiKey}`,
    apiKey
  ]
  
  for (const format of bearerFormats) {
    try {
      const response = await axios.post(`${baseUrl}/chat`, testPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': format
        },
        timeout: 10000
      })
      
      console.log(`✅ Success with "${format.split(' ')[0]}":`, response.status)
      console.log('Response:', JSON.stringify(response.data, null, 2))
      break
      
    } catch (error) {
      console.log(`❌ "${format.split(' ')[0]}" failed:`, error.response?.status)
    }
  }
}

testTokenAuth().catch(console.error)