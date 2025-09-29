// Minimal Vanderbilt API test
require('dotenv').config({ path: '../.env' })
const axios = require('axios')

async function testMinimalAPI() {
  console.log('🔍 Minimal Vanderbilt API Test...\n')
  
  const apiKey = process.env.OPENAI_API_KEY
  const baseUrl = process.env.AMPLIFY_API_URL
  
  console.log(`API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING'}`)
  console.log(`Base URL: ${baseUrl}`)
  console.log('')
  
  // Test 1: Check if endpoint exists (basic connectivity)
  console.log('🌐 Test 1: Basic endpoint connectivity...')
  try {
    const response = await axios.get(baseUrl, { timeout: 10000 })
    console.log('✅ Base URL accessible:', response.status)
  } catch (error) {
    console.log('ℹ️  Base URL response:', error.response?.status || 'Connection error')
  }
  
  // Test 2: Try different endpoint variations
  const endpoints = [
    '/chat',
    '/v1/chat/completions',
    '/completions',
    '/api/chat'
  ]
  
  for (const endpoint of endpoints) {
    console.log(`\n🔗 Test 2: Trying endpoint: ${baseUrl}${endpoint}`)
    
    const minimalPayload = {
      model: 'GPT-4o-mini',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 10
    }
    
    try {
      const response = await axios.post(`${baseUrl}${endpoint}`, minimalPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'x-api-key': apiKey
        },
        timeout: 15000
      })
      
      console.log(`✅ Success with ${endpoint}:`, response.status)
      console.log('Response data:', JSON.stringify(response.data, null, 2))
      break // Stop on first success
      
    } catch (error) {
      console.log(`❌ Failed ${endpoint}:`, error.response?.status || error.code)
      if (error.response?.data) {
        console.log('Error data:', JSON.stringify(error.response.data, null, 2))
      }
    }
  }
  
  // Test 3: Try with different models
  console.log('\n🤖 Test 3: Trying different model names...')
  const models = ['GPT-4o-mini', 'gpt-4o-mini', 'gpt-4-mini', 'claude-3-sonnet']
  
  for (const model of models) {
    console.log(`\nTesting model: ${model}`)
    
    try {
      const response = await axios.post(`${baseUrl}/chat`, {
        model: model,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 10000
      })
      
      console.log(`✅ Model ${model} works:`, response.status)
      break
      
    } catch (error) {
      console.log(`❌ Model ${model} failed:`, error.response?.status)
    }
  }
}

testMinimalAPI().catch(console.error)