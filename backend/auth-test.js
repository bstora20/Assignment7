// Test different authentication methods for Vanderbilt API
require('dotenv').config({ path: '../.env' })
const axios = require('axios')

async function testAuthentication() {
  console.log('🔐 Testing Vanderbilt API Authentication Methods...\n')
  
  const apiKey = process.env.OPENAI_API_KEY
  const baseUrl = process.env.AMPLIFY_API_URL
  
  console.log(`API Key: ${apiKey ? apiKey.substring(0, 15) + '...' : 'MISSING'}`)
  console.log(`Base URL: ${baseUrl}`)
  console.log('')
  
  const testPayload = {
    model: 'GPT-4o-mini',
    messages: [{ role: 'user', content: 'Hello' }],
    max_tokens: 20
  }
  
  // Method 1: x-api-key header only (no Authorization)
  console.log('🔑 Method 1: Using x-api-key header only...')
  try {
    const response = await axios.post(`${baseUrl}/chat`, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      timeout: 15000
    })
    console.log('✅ Success with x-api-key only:', response.status)
    console.log('Response:', JSON.stringify(response.data, null, 2))
  } catch (error) {
    console.log('❌ x-api-key only failed:', error.response?.status)
    if (error.response?.data) {
      console.log('Error:', JSON.stringify(error.response.data, null, 2))
    }
  }
  
  // Method 2: API key in Authorization header without Bearer prefix
  console.log('\n🔑 Method 2: Direct API key in Authorization header...')
  try {
    const response = await axios.post(`${baseUrl}/chat`, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey
      },
      timeout: 15000
    })
    console.log('✅ Success with direct Authorization:', response.status)
    console.log('Response:', JSON.stringify(response.data, null, 2))
  } catch (error) {
    console.log('❌ Direct Authorization failed:', error.response?.status)
    if (error.response?.data) {
      console.log('Error:', JSON.stringify(error.response.data, null, 2))
    }
  }
  
  // Method 3: API key with custom format
  console.log('\n🔑 Method 3: API key with custom format (key=value)...')
  try {
    const response = await axios.post(`${baseUrl}/chat`, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${apiKey}`
      },
      timeout: 15000
    })
    console.log('✅ Success with key=value format:', response.status)
    console.log('Response:', JSON.stringify(response.data, null, 2))
  } catch (error) {
    console.log('❌ key=value format failed:', error.response?.status)
    if (error.response?.data) {
      console.log('Error:', JSON.stringify(error.response.data, null, 2))
    }
  }
  
  // Method 4: Multiple headers combination
  console.log('\n🔑 Method 4: Combination of headers...')
  try {
    const response = await axios.post(`${baseUrl}/chat`, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'Authorization': `key=${apiKey}`,
        'User-Agent': 'VanderbiltAmplify/1.0'
      },
      timeout: 15000
    })
    console.log('✅ Success with combination headers:', response.status)
    console.log('Response:', JSON.stringify(response.data, null, 2))
  } catch (error) {
    console.log('❌ Combination headers failed:', error.response?.status)
    if (error.response?.data) {
      console.log('Error:', JSON.stringify(error.response.data, null, 2))
    }
  }
  
  // Method 5: Try Amplify-specific format
  console.log('\n🔑 Method 5: Amplify-specific authentication...')
  try {
    const response = await axios.post(`${baseUrl}/chat`, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-amplify-key': apiKey,
        'Authorization': `Amplify ${apiKey}`
      },
      timeout: 15000
    })
    console.log('✅ Success with Amplify format:', response.status)
    console.log('Response:', JSON.stringify(response.data, null, 2))
  } catch (error) {
    console.log('❌ Amplify format failed:', error.response?.status)
    if (error.response?.data) {
      console.log('Error:', JSON.stringify(error.response.data, null, 2))
    }
  }
}

testAuthentication().catch(console.error)